import fs from 'fs';
import { renameSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';

console.log("🔍 Analisando novos dados baixados...");

let banco = [];
try { 
    banco = JSON.parse(readFileSync('banco_central.json', 'utf-8')); 
} catch(e) { 
    console.log("❌ Erro fatal: Banco Central ilegível."); 
    process.exit(1); 
}

let progresso = {};
try { 
    progresso = JSON.parse(readFileSync('progresso_obras.json', 'utf-8')); 
} catch(e) { progresso = {}; }

const pastaResultados = 'resultados_baixados';
const arquivos = existsSync(pastaResultados) ? readdirSync(pastaResultados).filter(f => f.endsWith('.json')) : [];
let novosCaps = 0;

arquivos.forEach(arq => {
    try {
        const conteudo = readFileSync(`${pastaResultados}/${arq}`, 'utf-8');
        if (!conteudo.trim()) return;
        const extraido = JSON.parse(conteudo);
        
        extraido.forEach(obraNova => {
            let obraBanco = banco.find(o => o.obra_id == obraNova.obra_id);
            if (!obraBanco) {
                obraBanco = { obra_id: obraNova.obra_id, titulo: obraNova.titulo, capitulos: [] };
                banco.push(obraBanco);
            }
            if (!progresso[obraNova.obra_id]) progresso[obraNova.obra_id] = [];

            obraNova.capitulos.forEach(capNovo => {
                if (!obraBanco.capitulos.some(c => c.numero == capNovo.numero)) {
                    obraBanco.capitulos.push(capNovo);
                    progresso[obraNova.obra_id].push(capNovo.numero);
                    novosCaps++;
                }
            });
        });
    } catch(e) { console.log(`⚠️ Pulando arquivo corrompido: ${arq}`); }
});

// ESCREVE USANDO TÉCNICA ATÔMICA (TMP -> ORIGINAL)
try {
    writeFileSync('banco_central.json.tmp', JSON.stringify(banco, null, 2));
    writeFileSync('progresso_obras.json.tmp', JSON.stringify(progresso, null, 2));
    renameSync('banco_central.json.tmp', 'banco_central.json');
    renameSync('progresso_obras.json.tmp', 'progresso_obras.json');
    console.log(`✅ Sucesso! ${novosCaps} capítulos soldados.`);
} catch (err) {
    console.error("🚨 Falha ao salvar!", err.message);
    process.exit(1);
}
