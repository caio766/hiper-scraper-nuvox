import fs from 'fs';
import path from 'path';

console.log("🧠 Iniciando consolidação com suporte a arquivos gigantes (Stream)...");

try {
    console.log("📥 Lendo banco central atual...");
    let bancoCentral = [];
    if (fs.existsSync('banco_central.json')) {
        const dados = fs.readFileSync('banco_central.json', 'utf-8');
        bancoCentral = JSON.parse(dados);
    }
    
    // Mapeia para fundir os dados sem duplicar
    const mapaObras = new Map();
    bancoCentral.forEach(obra => mapaObras.set(obra.obra_id, obra));

    const pastaResultados = './resultados_baixados';
    if (fs.existsSync(pastaResultados)) {
        const arquivos = fs.readdirSync(pastaResultados).filter(f => f.endsWith('.json'));
        console.log(`📂 Encontrados ${arquivos.length} lotes de resultados da nuvem.`);
        
        arquivos.forEach(arq => {
            const lote = JSON.parse(fs.readFileSync(path.join(pastaResultados, arq), 'utf-8'));
            lote.forEach(novaObra => {
                mapaObras.set(novaObra.obra_id, novaObra);
            });
        });
    }

    console.log("💾 Salvando novo banco central (Modo Stream anti-limite)...");
    const bancoAtualizado = Array.from(mapaObras.values());
    
    // O SEGREDO ESTÁ AQUI: Abrimos um canal de escrita direto no disco
    const stream = fs.createWriteStream('banco_central.json');
    stream.write('[\n');
    
    const total = bancoAtualizado.length;
    for (let i = 0; i < total; i++) {
        // Converte e salva APENAS UMA OBRA por vez, burlando o limite do V8
        stream.write(JSON.stringify(bancoAtualizado[i], null, 2));
        if (i < total - 1) {
            stream.write(',\n');
        }
    }
    
    stream.write('\n]');
    stream.end();

    stream.on('finish', () => {
        console.log(`✅ Banco Central salvo com sucesso! Total de obras: ${total}`);
        // Atualiza o arquivo de progresso para manter o repositório organizado
        fs.writeFileSync('progresso_obras.json', JSON.stringify({ total_capturado: total }, null, 2));
    });

} catch (e) {
    console.error("🚨 Falha ao salvar!", e.message);
    process.exit(1);
}
