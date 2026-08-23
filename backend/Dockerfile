# CLO-CLO Backend — image légère, base Turso (libSQL) distante
FROM node:22-alpine

WORKDIR /app

# Installe les dépendances (uniquement @libsql/client) avant de copier
# le reste du code, pour profiter du cache Docker entre les builds.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "server.js"]