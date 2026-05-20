const fs = require('fs');
function dividirCarga() {
    console.log("🔄 Lendo o arquivo original...");
    const baseOriginal = JSON.parse(fs.readFileSync('todos_ids_obras.json', 'utf-8'));
    const todosIds = baseOriginal.obras.map(obra => obra.id);
    const totalObras = todosIds.length;
    console.log(`✅ ${totalObras} IDs extraídos com sucesso!`);
    const NUM_JOBS = 20;
    const tamanhoLote = Math.ceil(totalObras / NUM_JOBS);
    console.log(`🔪 Dividindo em ${NUM_JOBS} lotes de aproximadamente ${tamanhoLote} IDs cada...`);
    for (let i = 0; i < NUM_JOBS; i++) {
        const inicio = i * tamanhoLote;
        const fim = inicio + tamanhoLote;
        const loteIds = todosIds.slice(inicio, fim);
        fs.writeFileSync(`dados/chunk_${i + 1}.json`, JSON.stringify(loteIds), 'utf-8');
    }
    console.log("🎉 Divisão concluída! Arquivos salvos na pasta 'dados/'.");
}
dividirCarga();
