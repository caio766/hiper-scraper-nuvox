const fs = require('fs');

console.log("📚 Lendo o Banco Central existente...");
let banco = [];
try { banco = JSON.parse(fs.readFileSync('banco_central.json', 'utf-8')); } catch(e) { console.log("Erro crítico no banco."); process.exit(1); }

let progresso = {};
try { progresso = JSON.parse(fs.readFileSync('progresso_obras.json', 'utf-8')); } catch(e) { progresso = {}; }

const arquivos = fs.existsSync('resultados_baixados') ? fs.readdirSync('resultados_baixados').filter(f => f.endsWith('.json')) : [];
let novosCaps = 0;

arquivos.forEach(arq => {
    try {
        const txt = fs.readFileSync(`resultados_baixados/${arq}`, 'utf-8');
        if (!txt.trim()) return; // Ignora arquivos vazios sem explodir
        const extraido = JSON.parse(txt);
        
        extraido.forEach(obraNova => {
            let obraBanco = banco.find(o => o.obra_id == obraNova.obra_id);
            if (!obraBanco) {
                obraBanco = { obra_id: obraNova.obra_id, titulo: obraNova.titulo, capitulos: [] };
                banco.push(obraBanco);
            }
            
            if (!progresso[obraNova.obra_id]) progresso[obraNova.obra_id] = [];

            obraNova.capitulos.forEach(capNovo => {
                const jaExiste = obraBanco.capitulos.some(c => c.numero == capNovo.numero);
                if (!jaExiste) {
                    obraBanco.capitulos.push(capNovo);
                    progresso[obraNova.obra_id].push(capNovo.numero);
                    novosCaps++;
                }
            });
        });
    } catch(e) {
        console.log(`❌ Pulando arquivo corrompido/vazio do GitHub: ${arq}`);
    }
});

fs.writeFileSync('banco_central.json', JSON.stringify(banco, null, 2), 'utf-8');
fs.writeFileSync('progresso_obras.json', JSON.stringify(progresso, null, 2), 'utf-8');

console.log("✅ Conciliação Concluída!");
console.log(`📈 ${novosCaps} novos capítulos foram soldados no Banco Central.`);
