FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer poppler-utils fonts-dejavu \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

CMD ["node", "dist/src/server.js"]
