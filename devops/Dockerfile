# ==========================================
# Estágio 1: Build do Frontend React / Vite
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências aproveitando cache de camadas
COPY package*.json ./
RUN npm ci || npm install

# Copia código-fonte
COPY . .

# Variáveis de ambiente de build para o Vite
ARG VITE_API_URL=http://localhost:3333
ARG VITE_WS_URL=ws://localhost:3333/ws
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

# Executa build de produção com TypeScript e minificação
RUN npm run build

# ==========================================
# Estágio 2: Nginx Otimizado para Servir SPA
# ==========================================
FROM nginx:1.27-alpine-slim AS runner

# Remove configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia configuração customizada para roteamento SPA e Gzip
COPY devops/nginx.conf /etc/nginx/conf.d/default.conf

# Copia arquivos compilados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
