const fs = require('fs');
const path = require('path');

const pastaResultados = './resultados_baixados';
const arquivoCentral = './banco_central.json';
const arquivoProgresso = './progresso_obras.json';

let bancoCentral = {};

if (fs.existsSync(arquivoCentral)) {
    console.log("📚 Lendo o Banco Central existente...");
    const dadosAntigos = JSON.parse(fs.readFileSync(arquivoCentral, 'utf-8'));
    dadosAntigos.forEach(obra => {
        bancoCentral[obra.obra_id] = obra;
        // Converte array de capítulos em objeto para facilitar a fusão
        const capsObj = {};
        obra.capitulos.forEach(c => capsObj[c.numero] = c);
        bancoCentral[obra.obra_id].capitulos = capsObj;
    });
}

if (!fs.existsSync(pastaResultados)) {
    console.log("❌ Pasta 'resultados_baixados' não encontrada.");
    process.exit(1);
}

const arquivos = fs.readdirSync(pastaResultados).filter(f => f.endsWith('.json'));
let novosCapitulosAdicionados = 0;

arquivos.forEach(arq => {
    const conteudo = fs.readFileSync(path.join(pastaResultados, arq), 'utf-8');
    if (!conteudo.trim()) return;
    const dadosJob = JSON.parse(conteudo);

    dadosJob.forEach(obra => {
        if (!bancoCentral[obra.obra_id]) {
            bancoCentral[obra.obra_id] = { titulo: obra.titulo, obra_id: obra.obra_id, capitulos: {} };
        }

        obra.capitulos.forEach(cap => {
            if (!bancoCentral[obra.obra_id].capitulos[cap.numero]) {
                bancoCentral[obra.obra_id].capitulos[cap.numero] = cap;
                novosCapitulosAdicionados++;
            }
        });
    });
});

const bancoFinal = Object.values(bancoCentral).map(obra => ({
    ...obra,
    capitulos: Object.values(obra.capitulos).sort((a, b) => parseFloat(a.numero) - parseFloat(b.numero))
}));

fs.writeFileSync(arquivoCentral, JSON.stringify(bancoFinal, null, 2), 'utf-8');

const mapaProgresso = {};
bancoFinal.forEach(obra => {
    mapaProgresso[obra.obra_id] = obra.capitulos.map(c => c.numero);
});

fs.writeFileSync(arquivoProgresso, JSON.stringify(mapaProgresso), 'utf-8');

console.log(`✅ Conciliação Concluída!`);
console.log(`📈 ${novosCapitulosAdicionados} novos capítulos foram soldados no Banco Central.`);
