const fs = require('fs');

async function hiperScraperDeIds() {
    const formatos = [1, 3, 4, 5, 8, 9, 13]; // Sem o formato 10
    const limite = 75; 
    const todasAsObras = []; 

    const headersBase = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json, text/plain, */*",
        "Content-Type": "application/json"
    };

    console.log("🔄 Autenticando com a conta VIP...");
    const respostaLogin = await fetch("https://back.mediocrescan.com/auth/login", {
        method: "POST",
        headers: headersBase,
        body: JSON.stringify({ email: "caiooriginal66@gmail.com", senha: "caioriginal66" })
    });

    if (!respostaLogin.ok) return console.error("❌ Erro no login!");
    const tokenAuth = (await respostaLogin.json()).token;
    headersBase["Authorization"] = `Bearer ${tokenAuth}`;
    
    console.log(`✅ Autenticado! Sugando IDs de ${formatos.length} categorias...`);

    const extrairLista = (d) => Array.isArray(d) ? d : (d && d.data) || (d && d.obras) || (d && d.items) || null;

    async function rasparCategoria(formatoId) {
        let paginaAtual = 1, temMais = true;
        while (temMais) {
            const u1 = `https://back.mediocrescan.com/obras/buscar?limite=${limite}&pagina=${paginaAtual}&formato=${formatoId}`;
            const u2 = `https://back.mediocrescan.com/obras/buscar?limite=${limite}&pagina=${paginaAtual + 1}&formato=${formatoId}`;
            
            const [r1, r2] = await Promise.all([fetch(u1, { headers: headersBase }), fetch(u2, { headers: headersBase })]);
            if (!r1.ok || !r2.ok) break;

            const a1 = extrairLista(await r1.json()) || [];
            const a2 = extrairLista(await r2.json()) || [];
            
            const mapF = i => ({ id: i.id, nome: i.nome, slug: i.slug, formato: i.formato?.nome || "Desconhecido" });
            const obs = [...a1.map(mapF), ...a2.map(mapF)];
            
            todasAsObras.push(...obs);
            console.log(`[Formato ${formatoId}] Páginas ${paginaAtual} e ${paginaAtual+1} OK (+${obs.length} IDs)`);
            
            if (a1.length === 0 || a2.length === 0) temMais = false;
            else { paginaAtual += 2; await new Promise(r => setTimeout(r, 200)); }
        }
    }

    await Promise.all(formatos.map(rasparCategoria));
    
    const obrasUnicas = Array.from(new Map(todasAsObras.map(item => [item.id, item])).values());
    
    const arquivoFinal = { obras: obrasUnicas };
    fs.writeFileSync('todos_ids_obras.json', JSON.stringify(arquivoFinal, null, 2), 'utf-8');
    
    console.log(`\n🎉 NOVA COLETA FINALIZADA! Total: ${obrasUnicas.length} obras exclusivas.`);
}
hiperScraperDeIds();
