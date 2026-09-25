# Tag fixa (não `node:22-alpine`): build reprodutível e o Dependabot abre PR
# quando sair versão nova da imagem base, em vez de ela mudar por baixo.
FROM node:22.23.3-alpine3.24 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig*.json nest-cli.json prisma.config.ts ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

FROM node:22.23.3-alpine3.24 AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Só dependências de produção: sem jest/eslint/ts-jest na imagem final,
# menos superfície de ataque e menos CVEs pro Trivy.
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/generated ./generated
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node prisma.config.ts ./

# Processo sem root: uma RCE na API não vira root no container.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/health" > /dev/null || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
