# CLO-CLO Backend — image légère, aucune dépendance npm à installer
FROM node:22-alpine

WORKDIR /app

# Pas de package.json externe à installer (zéro dépendance), on copie
# directement le code source.
COPY . .

# Le fichier SQLite doit survivre aux redéploiements : montez ce
# dossier comme volume persistant sur votre plateforme d'hébergement
# (Render "Disk", Railway "Volume", etc.)
VOLUME ["/app/data"]

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]
