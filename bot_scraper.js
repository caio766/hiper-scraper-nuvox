const fs = require('fs');
const fetch = require('node-fetch'); 
const { HttpsProxyAgent } = require('https-proxy-agent');

const NUMERO_JOB = process.argv[2] || 1; 
const TOKEN_AUTH = process.env.TOKEN_AUTH; 
const tempoInicio = Date.now();
const LIMITE_TEMPO_MS = 18 * 60 * 1000; 

let proxiesDoJob = [];
try {
    const listaProxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').map(p => p.trim()).filter(p => p);
    if (listaProxies.length > 0) {
        const tamanhoLote = Math.ceil(listaProxies.length / 20);
        proxiesDoJob = listaProxies.slice((NUMERO_JOB - 1) * tamanhoLote, NUMERO_JOB * tamanhoLote);
    }
} catch (e) {}

let progressoAnterior = {};
try { progressoAnterior = JSON.parse(fs.readFileSync('progresso_obras.json', 'utf-8')); } catch(e) { }

let indiceProxy = 0;
function getFetchOptions(headersBase, method = "GET") {
    const config = { method, headers: headersBase };
    if (proxiesDoJob.length === 0) return config;
    const proxyAtual = proxiesDoJob[indiceProxy % proxiesDoJob.length];
    indiceProxy++;
    const partes = proxyAtual.split(':');
    if (partes.length === 4) {
        config.agent = new HttpsProxyAgent(`http://${partes[2]}:${partes[3]}@${partes[0]}:${partes[1]}`);
    } else if (partes.length === 2) {
        config.agent = new HttpsProxyAgent(`http://${partes[0]}:${partes[1]}`);
    }
    return config;
}

async function iniciarScraper() {
    console.log(`🤖 [Job ${NUMERO_JOB}] Iniciado. Evasão Ativa | 🚀 VELOCIDADE 1.5x (133ms)`);
    
    if (!TOKEN_AUTH) return console.log("❌ ERRO FATAL: Token Mestre não recebido!");

    const headersBase = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN_AUTH}`
    };

    let idsParaProcessar = JSON.parse(fs.readFileSync(`dados/chunk_${NUMERO_JOB}.json`, 'utf-8'));
    const resultadoFinal = [];
    let tempoEsgotado = false; 

    for (const idObra of idsParaProcessar) {
        if (tempoEsgotado || Date.now() - tempoInicio > LIMITE_TEMPO_MS) break;

        console.log(`👉 Processando Obra ID: ${idObra}`);
        try {
            const respDetalhes = await fetch(`https://back.mediocrescan.com/obras/${idObra}`, getFetchOptions(headersBase));
            if (!respDetalhes.ok) continue;
            
            const obra = await respDetalhes.json();
            const capitulos = obra.capitulos || [];
            
            const dadosObra = { obra_id: obra.obr_id, titulo: obra.obr_nome, capitulos: [] };

            for (const cap of capitulos) {
                if (Date.now() - tempoInicio > LIMITE_TEMPO_MS) { tempoEsgotado = true; break; }

                if (progressoAnterior[idObra] && progressoAnterior[idObra].includes(cap.cap_num)) {
                    console.log(`   ⏭️ Cap ${cap.cap_num} já extraído. Pulando...`);
                    continue;
                }

                const respBackend = await fetch(`https://back.mediocrescan.com/capitulos/${cap.cap_id}`, getFetchOptions(headersBase));
                
                if (!respBackend.ok) { 
                    const erroTexto = await respBackend.text();
                    console.log(`❌ Erro cap ${cap.cap_num} (HTTP ${respBackend.status}) -> Detalhe: ${erroTexto}`);
                    if (respBackend.status === 401) {
                        console.log("💀 TOKEN MESTRE MORREU! Evacuando os dados salvos...");
                        tempoEsgotado = true; break; 
                    }
                    continue; 
                }
                
                const capUuid = (await respBackend.json()).cap_uuid;
                if (!capUuid) continue;
                
                const respCdn = await fetch(`https://cdn.mediocrescan.com/obras/${idObra}/capitulos/${cap.cap_num}/${capUuid}.json`, getFetchOptions(headersBase));
                if (respCdn.ok) {
                    const imagens = await respCdn.json();
                    dadosObra.capitulos.push({ numero: cap.cap_num, paginas: imagens.map(img => `https://cdn.mediocrescan.com/${img.url}`) });
                    console.log(`   ✅ Cap ${cap.cap_num} extraído!`);
                }
                // 🔥 VELOCIDADE 1.5x APLICADA AQUI
                await new Promise(r => setTimeout(r, 133)); 
            }
            if (dadosObra.capitulos.length > 0) resultadoFinal.push(dadosObra);
            if (tempoEsgotado) break; 

        } catch (erro) { console.log(`❌ Erro na obra ${idObra}: ${erro.message}`); }
    }
    
    fs.writeFileSync(`resultados/resultado_job_${NUMERO_JOB}.json`, JSON.stringify(resultadoFinal, null, 2), 'utf-8');
    console.log(`🎉 [Job ${NUMERO_JOB}] Checkpoint salvo perfeitamente!`);
}
iniciarScraper();
