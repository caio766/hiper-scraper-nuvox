#!/bin/bash

# Cores para o terminal
CYAN='\033[0;36m'
GREEN='\033[0;32m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${MAGENTA}📱 INICIANDO ORQUESTRADOR MOBILE - NUVOX SCRAPER${NC}"

while true; do
    echo -e "\n${CYAN}📡 Disparando Onda na Nuvem...${NC}"
    gh workflow run scraper.yml
    sleep 30

    RUN_ID=$(gh run list --workflow=scraper.yml --limit 1 --json databaseId --jq ".[0].databaseId")

    echo -e "${MAGENTA}🎯 Missão Engajada! ID: $RUN_ID${NC}"
    
    STATUS="in_progress"
    while [ "$STATUS" != "completed" ]; do
        sleep 180
        STATUS=$(gh run view $RUN_ID --json status --jq ".status")
        echo -e "   ⏱️ Status Nuvem: $STATUS..."
    done

    echo -e "\n${GREEN}✅ Onda concluída! Baixando dados...${NC}"
    rm -rf resultados_baixados
    mkdir resultados_baixados
    gh run download $RUN_ID --dir resultados_baixados

    # Move arquivos das subpastas (ajuste mobile)
    find resultados_baixados -name "*.json" -type f -exec mv -t resultados_baixados {} +

    echo -e "${CYAN}🧠 Consolidando dados (Escrita Atômica)...${NC}"
    node conciliador.js

    # Sincroniza com o GitHub
    git add .
    git commit -m "📱 MOBILE-LOOP: Progresso consolidado via Termux"
    git push

    echo -e "${CYAN}⏳ Pausa de 60s para o próximo ataque...${NC}"
    sleep 60
done

