const fs = require('fs');
const fetch = require('node-fetch'); 
const { HttpsProxyAgent } = require('https-proxy-agent');

const MODO_TESTE = false;
const NUMERO_JOB = process.argv[2] || 1; 
const TOKEN_AUTH = process.env.TOKEN_AUTH; 

const tempoInicio = Date.now();
// 🔥 NOVO LIMITE: 18 minutos de margem de segurança para o token de 20 min
const LIMITE_TEMPO_MS = 18 * 60 * 1000; 

// 🌐 FATIAMENTO DE PROXIES (100 IPs divididos por 20 Jobs)
let proxiesDoJob = [];
try {
    const listaProxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').map(p => p.trim()).filter(p => p);
    if (listaProxies.length > 0) {
        const tamanhoLote = Math.ceil(listaProxies.length / 20);
        proxiesDoJob = listaProxies.slice((NUMERO_JOB - 1) * tamanhoLote, NUMERO_JOB * tamanhoLote);
        console.log(`🌐 [Job ${NUMERO_JOB}] Armado com ${proxiesDoJob.length} IPs exclusivos.`);
    }
} catch (e) {
    console.log("⚠️ Arquivo proxies.txt não encontrado! Rodando com o IP original da máquina...");
}

// 🌐 MOTOR DE RODÍZIO DE IPs (ROUND-ROBIN)
let indiceProxy = 0;
function getFetchOptions(headersBase) {
    const config = { headers: headersBase };
    if (proxiesDoJob.length === 0) return config;

    const proxyAtual = proxiesDoJob[indiceProxy % proxiesDoJob.length];
    indiceProxy++;

    const partes = proxyAtual.split(':');
    if (partes.length === 4) {
        const [ip, port, user, pass] = partes;
        config.agent = new HttpsProxyAgent(`http://${user}:${pass}@${ip}:${port}`);
    } else if (partes.length === 2) {
        config.agent = new HttpsProxyAgent(`http://${partes[0]}:${partes[1]}`);
    }
    return config;
}

async function iniciarScraper() {
    console.log(`🤖 [Job ${NUMERO_JOB}] Iniciado! Operando em Velocidade 5x (200ms)`);
    
    if (!TOKEN_AUTH) {
        console.log("❌ ERRO FATAL: Token mestre não recebido!");
        return;
    }

    let idsParaProcessar = JSON.parse(fs.readFileSync(`dados/chunk_${NUMERO_JOB}.json`, 'utf-8'));
    
    const headersBase = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://mediocrescan.com",
        "Referer": "https://mediocrescan.com/",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN_AUTH}`
    };

    const resultadoFinal = [];
    let tempoEsgotado = false; 

    for (const idObra of idsParaProcessar) {
        if (tempoEsgotado || Date.now() - tempoInicio > LIMITE_TEMPO_MS) {
            console.log("⏱️ ALERTA: Relógio apitou (18 min). Acionando Checkpoint!");
            break; 
        }

        console.log(`👉 Processando Obra ID: ${idObra}`);
        try {
            const respDetalhes = await fetch(`https://back.mediocrescan.com/obras/${idObra}`, getFetchOptions(headersBase));
            if (!respDetalhes.ok) { console.log(`❌ Erro detalhes. HTTP ${respDetalhes.status}`); continue; }
            
            const obra = await respDetalhes.json();
            const capitulos = obra.capitulos || [];
            
            const dadosObra = {
                obra_id: obra.obr_id,
                titulo: obra.obr_nome,
                sinopse: obra.obr_descricao || null,
                capa_url: obra.obr_imagem ? `https://back.mediocrescan.com/media/obras/${obra.obr_id}/capa?f=${obra.obr_imagem}&q=40&fit=cover&w=600` : null,
                tipo: obra.formato ? obra.formato.formt_nome : "Desconhecido",
                tags: obra.tags ? obra.tags.map(tag => tag.tag_nome) : [],
                capitulos: []
            };

            for (const cap of capitulos) {
                // Trava de segurança interna para não estourar os 20 min no meio de mangás grandes
                if (Date.now() - tempoInicio > LIMITE_TEMPO_MS) {
                    console.log(`⏱️ ALERTA CRÍTICO: 18 minutos atingidos! Cortando a extração na metade para salvar...`);
                    tempoEsgotado = true;
                    break; 
                }

                const respBackend = await fetch(`https://back.mediocrescan.com/capitulos/${cap.cap_id}`, getFetchOptions(headersBase));
                if (!respBackend.ok) { console.log(`❌ Erro cap ${cap.cap_num} (HTTP ${respBackend.status})`); continue; }
                
                const capUuid = (await respBackend.json()).cap_uuid;
                if (!capUuid) continue;
                
                const respCdn = await fetch(`https://cdn.mediocrescan.com/obras/${idObra}/capitulos/${cap.cap_num}/${capUuid}.json`, getFetchOptions(headersBase));
                if (respCdn.ok) {
                    const imagens = await respCdn.json();
                    dadosObra.capitulos.push({ 
                        numero: cap.cap_num, 
                        paginas: imagens.map(img => `https://cdn.mediocrescan.com/${img.url}`) 
                    });
                    console.log(`   ✅ Cap ${cap.cap_num} extraído!`);
                }
                
                // 🚀 VELOCIDADE 5x: Delay de apenas 200ms graças às proxies
                await new Promise(r => setTimeout(r, 200)); 
            }
            
            resultadoFinal.push(dadosObra);
            if (tempoEsgotado) break; 

        } catch (erro) { console.log(`❌ Erro na obra ${idObra}: ${erro.message}`); }
    }
    
    fs.writeFileSync(`resultados/resultado_job_${NUMERO_JOB}.json`, JSON.stringify(resultadoFinal, null, 2), 'utf-8');
    console.log(`🎉 [Job ${NUMERO_JOB}] Checkpoint salvo com sucesso aos ${Math.round((Date.now() - tempoInicio)/60000)} minutos!`);
}
iniciarScraper();
