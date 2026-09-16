# Vidéos — à lire avant d'en ajouter/réencoder

Ces clips sont scrollés/scrubés (`.scroll-vid`, `.vid-pin`, `.loop-vid`) via
`project/pop/pop-script.js`, qui pilote `currentTime` en continu pendant le
scroll. Un clip encodé avec l'intervalle d'images-clés par défaut de x264
(250 images) n'a souvent **qu'une seule image-clé pour toute sa durée** sur
un clip court (~6s) — chaque scrub doit alors redécoder depuis le début,
ce qui cause un gros lag au scroll (vécu concrètement sur la vidéo
"gelée", corrigé le 2026-09-16).

**Toujours réencoder avec une image-clé courte**, quel que soit l'outil :

```bash
ffmpeg -i source.mp4 \
  -c:v libx264 -crf 22 -preset slow \
  -g 12 -keyint_min 12 -sc_threshold 0 \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart \
  sortie.mp4
```

`-g 12 -keyint_min 12` = une image-clé toutes les ~0,5s à 24fps. Sans ça,
le scroll redevient saccadé dès qu'un nouveau clip est ajouté.
