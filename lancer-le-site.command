#!/bin/bash
# Double-cliquez sur ce fichier pour lancer le site Kemeted Saveur

# Aller dans le dossier du script
cd "$(dirname "$0")"

# Trouver un port libre
PORT=8081
while lsof -i:$PORT &>/dev/null; do PORT=$((PORT+1)); done

# Ouvrir le navigateur après 1 seconde
sleep 1 && open "http://localhost:$PORT/project/index.html" &

echo "========================================"
echo "  KEMETED SAVEUR — Site en cours..."
echo "  URL : http://localhost:$PORT/project/"
echo "  Fermez cette fenêtre pour arrêter."
echo "========================================"

# Lancer le serveur (avec support des requêtes Range, nécessaire pour que
# les vidéos scrollées se déclenchent/scrubbent correctement)
python3 serve.py $PORT
