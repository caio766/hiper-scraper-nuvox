const fs = require('fs');
const path = require('path');

const pastaResultados = './resultados_baixados'; 
const arquivoBase = 'todos_ids_obras.json';

// Se a pasta não existir, ele cria para você colocar os arquivos depois
if (!fs.existsSync(pastaResultados)) {
    fs.mkdirSync(pastaResultados);
    console.log(`⚠️ Pasta '${pastaResultados}' criada!`);
    console.log(`Coloque os arquivos JSON da onda anterior dentro dela e rode este script novamente.`);
    process.exit();
}

console.log("🔄 Lendo o que já foi baixado com sucesso na onda anterior...");
let idsProcessados = new Set();
const arquivos = fs.readdirSync(pastaResultados).filter(f => f.endsWith('.json'));

if (arquivos.length === 0) {
    console.log("❌ Nenhum JSON encontrado na pasta 'resultados_baixados'. Coloque os arquivos lá primeiro.");
    process.exit();
}

for (const arq of arquivos) {
    const conteudo = JSON.parse(fs.readFileSync(path.join(pastaResultados, arq), 'utf-8'));
    conteudo.forEach(obra => {
        idsProcessados.add(obra.obra_id);
    });
}

console.log(`✅ ${idsProcessados.size} obras já foram extraídas e estão a salvo.`);

console.log("🔪 Subtraindo as obras concluídas da lista original...");
const baseOriginal = JSON.parse(fs.readFileSync(arquivoBase, 'utf-8'));
const totalOriginal = baseOriginal.obras.length;

baseOriginal.obras = baseOriginal.obras.filter(obra => !idsProcessados.has(obra.id));
const totalRestante = baseOriginal.obras.length;

console.log(`📉 Carga reduzida: Faltavam ${totalOriginal}, agora faltam apenas ${totalRestante} obras!`);

fs.copyFileSync(arquivoBase, 'todos_ids_obras_bkp.json');
fs.writeFileSync(arquivoBase, JSON.stringify(baseOriginal, null, 2), 'utf-8');

console.log(`🎉 Base atualizada com sucesso! (Backup salvo como todos_ids_obras_bkp.json)`);
console.log(`👉 PRÓXIMO PASSO: Rode 'node divisor.js' para fatiar esses ${totalRestante} IDs, dê um commit/push na pasta 'dados', e ative o GitHub Actions novamente!`);
