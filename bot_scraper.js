const fs = require('fs');

const MODO_TESTE = true;
const NUMERO_JOB = process.argv[2] || 1; 
// Puxa o token injetado pelo GitHub Actions
const TOKEN_AUTH = process.env.TOKEN_AUTH; 

async function iniciarScraper() {
    console.log(`🤖 [Job ${NUMERO_JOB}] Iniciado!`);
    
    if (!TOKEN_AUTH) {
        console.log("❌ ERRO FATAL: Token mestre não recebido!");
        return;
    }

    let idsParaProcessar = JSON.parse(fs.readFileSync(`dados/chunk_${NUMERO_JOB}.json`, 'utf-8'));
    
    if (MODO_TESTE) {
        console.log(`⚠️ MODO TESTE ATIVADO: Reduzindo para apenas 1 ID.`);
        idsParaProcessar = idsParaProcessar.slice(0, 1);
    }

    const headersBase = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://mediocrescan.com",
        "Referer": "https://mediocrescan.com/",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TOKEN_AUTH}`
    };

    const resultadoFinal = [];

    for (const idObra of idsParaProcessar) {
        console.log(`👉 Processando Obra ID: ${idObra}`);
        try {
            const respDetalhes = await fetch(`https://back.mediocrescan.com/obras/${idObra}`, { headers: headersBase });
            if (!respDetalhes.ok) { console.log(`❌ Erro detalhes. HTTP ${respDetalhes.status}`); continue; }
            
            const obra = await respDetalhes.json();
            const capitulos = obra.capitulos || [];
            
            const dadosObra = { obra_id: obra.obr_id, titulo: obra.obr_nome, capitulos: [] };
            const capitulosAlvo = MODO_TESTE ? capitulos.slice(0, 2) : capitulos;

            for (const cap of capitulosAlvo) {
                const respBackend = await fetch(`https://back.mediocrescan.com/capitulos/${cap.cap_id}`, { headers: headersBase });
                if (!respBackend.ok) { console.log(`❌ Erro cap ${cap.cap_num}`); continue; }
                
                const capUuid = (await respBackend.json()).cap_uuid;
                if (!capUuid) continue;
                
                const respCdn = await fetch(`https://cdn.mediocrescan.com/obras/${idObra}/capitulos/${cap.cap_num}/${capUuid}.json`, { headers: headersBase });
                if (respCdn.ok) {
                    const imagens = await respCdn.json();
                    dadosObra.capitulos.push({ numero: cap.cap_num, paginas: imagens.map(img => `https://cdn.mediocrescan.com/${img.url}`) });
                    console.log(`   ✅ Cap ${cap.cap_num} extraído com sucesso!`);
                }
                await new Promise(r => setTimeout(r, 500)); 
            }
            resultadoFinal.push(dadosObra);
        } catch (erro) { console.log(`❌ Erro: ${erro.message}`); }
    }
    fs.writeFileSync(`resultados/resultado_job_${NUMERO_JOB}.json`, JSON.stringify(resultadoFinal, null, 2), 'utf-8');
}
iniciarScraper();
