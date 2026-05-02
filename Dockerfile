FROM node:20-alpine

WORKDIR /app

# Instalar dependências necessárias para o Prisma (OpenSSL)
RUN apk add --no-cache openssl

COPY package*.json ./
# Instalar TODAS as dependências (incluindo devDependencies para o build)
RUN npm install

COPY . .

# Gerar o Prisma Client
RUN npx prisma generate

# Build da aplicação NestJS (Isso gera a pasta /app/dist)
RUN npm run build

EXPOSE 3000

# O comando de start vai rodar as migrations antes de subir a API
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]
