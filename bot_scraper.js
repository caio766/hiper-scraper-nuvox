const fs = require('fs');
const fetch = require('node-fetch');
const { HttpsProxyAgent } = require('https-proxy-agent');

const NUMERO_JOB = parseInt(process.argv[2]) || 1;
const TOKEN_AUTH = process.env.TOKEN_AUTH;
const tempoInicio = Date.now();
const LIMITE_TEMPO_MS = 18 * 60 * 1000;

// 1. CARREGAMENTO DE PROXIES MANTIDO
let proxiesDoJob = [];
try {
    const listaProxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').map(p => p.trim()).filter(p => p);
    if (listaProxies.length > 0) {
        const tamanhoLote = Math.ceil(listaProxies.length / 20);
        proxiesDoJob = listaProxies.slice((NUMERO_JOB - 1) * tamanhoLote, NUMERO_JOB * tamanhoLote);
    }
} catch (e) {}

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
    console.log(`🎯 [Job ${NUMERO_JOB}] MODO SNIPER | DELAY: 20ms | PROXIES: ${proxiesDoJob.length}`);

    if (!TOKEN_AUTH) return console.log("❌ ERRO FATAL: Token Mestre não recebido!");

    const headersBase = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN_AUTH}`
    };

    // 🔥 MUDANÇA SNIPER: CARREGANDO APENAS OS IDS REBELDES E DIVIDINDO POR 20
    let idsParaProcessar = [];
    try {
        const todosPendentes = JSON.parse(fs.readFileSync('ids_pendentes.json', 'utf-8'));
        const totalMaquinas = 20;
        const tamanhoLoteSniper = Math.ceil(todosPendentes.length / totalMaquinas);
        const inicioSniper = (NUMERO_JOB - 1) * tamanhoLoteSniper;
        idsParaProcessar = todosPendentes.slice(inicioSniper, inicioSniper + tamanhoLoteSniper);
        console.log(`🔍 Atirador ${NUMERO_JOB} recebeu ${idsParaProcessar.length} alvos exatos.`);
    } catch (e) {
        console.log("❌ ERRO: Arquivo ids_pendentes.json não encontrado!");
        return;
    }

    const resultadoFinal = [];
    let tempoEsgotado = false;

    // LOOP DE EXTRAÇÃO OTIMIZADO (Sem verificar progresso anterior, ataque direto)
    for (const idObra of idsParaProcessar) {
        if (tempoEsgotado || Date.now() - tempoInicio > LIMITE_TEMPO_MS) break;
        try {
            const respDetalhes = await fetch(`https://back.mediocrescan.com/obras/${idObra}`, getFetchOptions(headersBase));
            if (!respDetalhes.ok) continue;

            const obra = await respDetalhes.json();
            const capitulos = obra.capitulos || [];
            const dadosObra = { obra_id: obra.obr_id, titulo: obra.obr_nome, capitulos: [] };

            for (const cap of capitulos) {
                if (Date.now() - tempoInicio > LIMITE_TEMPO_MS) { tempoEsgotado = true; break; }

                const respBackend = await fetch(`https://back.mediocrescan.com/capitulos/${cap.cap_id}`, getFetchOptions(headersBase));
                if (!respBackend.ok) {
                    if (respBackend.status === 401) { tempoEsgotado = true; break; }
                    continue;
                }

                const jsonBackend = await respBackend.json();
                const capUuid = jsonBackend.cap_uuid;
                if (!capUuid) continue;

                const respCdn = await fetch(`https://cdn.mediocrescan.com/obras/${idObra}/capitulos/${cap.cap_num}/${capUuid}.json`, getFetchOptions(headersBase));
                if (respCdn.ok) {
                    const imagens = await respCdn.json();
                    dadosObra.capitulos.push({
                        numero: cap.cap_num,
                        paginas: imagens.map(img => `https://cdn.mediocrescan.com/${img.url}`)
                    });
                }
                // 🔥 DELAY DE 20ms MANTIDO
                await new Promise(r => setTimeout(r, 20));
            }
            if (dadosObra.capitulos.length > 0) {
                resultadoFinal.push(dadosObra);
                console.log(`✅ Obra Rebelde [${idObra}] abatida e salva!`);
            }
            if (tempoEsgotado) break;

        } catch (erro) {
            console.log(`⚠️ Falha no alvo [${idObra}]`);
        }
    }

    if (!fs.existsSync('resultados')) fs.mkdirSync('resultados');
    fs.writeFileSync(`resultados/resultado_job_${NUMERO_JOB}.json`, JSON.stringify(resultadoFinal, null, 2), 'utf-8');
    console.log(`🎉 [Job ${NUMERO_JOB}] Missão Sniper concluída!`);
}
iniciarScraper();
