# ===============================================
# Stage 1: Build & Dependencies
# ===============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copia manifestos de pacotes
COPY package*.json ./

# Instala todas as dependências
RUN npm ci

# Copia código-fonte e compilação do NestJS
COPY . .
RUN npm run build

# ===============================================
# Stage 2: Production Runner
# ===============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copia arquivos necessários do estágio builder
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

# Porta da aplicação
EXPOSE 3000

# Execução do servidor NestJS
CMD ["node", "dist/main.js"]
