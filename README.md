# NestJS Production API - Best Practices (Docker & Cloudinary)

Esta é uma API RESTful completa em **NestJS** desenvolvida com TypeScript e seguindo as melhores práticas de mercado:

- 📖 **Swagger OpenAPI**: Documentação interativa em `/api/docs` com suporte a autenticação Bearer JWT e upload multipart/form-data.
- 🔐 **Autenticação & Autorização**: JWT (`@nestjs/jwt`, `passport-jwt`), hashing seguro de senhas (`bcrypt`), controle de acesso por perfis (RBAC) com `@Roles()` e `RolesGuard`.
- ☁️ **Upload para Cloudinary**: Envio de arquivos em tempo real utilizando a API da nuvem do Cloudinary via streams (`cloudinary` + `streamifier`).
- ⚡ **Filas Assíncronas**: Integração com BullMQ (`@nestjs/bullmq`) e Redis para tarefas em background.
- 🐳 **Docker & Docker Compose**: Conteinerização completa da aplicação NestJS e do container Redis.
- 🧪 **Testes E2E 100% Mockados**: Suíte de testes automatizados com Jest e Supertest isolada de requisições externas ou serviços em nuvem.

---

## 🛠️ Tecnologias Utilizadas

- **Framework**: NestJS v11
- **Linguagem**: TypeScript
- **Autenticação**: Passport JWT + Bcrypt
- **Cloud Storage**: Cloudinary SDK
- **Filas**: BullMQ + Redis
- **Containerização**: Docker + Docker Compose
- **Testes**: Jest + Supertest

---

## 🐳 Executando com Docker Compose (Recomendado)

Suba toda a infraestrutura (API NestJS + Container Redis) com um único comando:

```bash
docker-compose up --build
```

Acesse no seu navegador:
- **API Endpoints**: `http://localhost:3000/api/v1`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

---

## ⚙️ Configuração Local Sem Docker

### 1. Instalar as Dependências

```bash
npm install
```

### 2. Configurar as Variáveis de Ambiente (`.env`)

```env
PORT=3000
JWT_SECRET=super-secret-jwt-key-antigravity-nest-api
JWT_EXPIRATION=1d

# Redis Configuration (BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_FOLDER=nest_uploads
```

### 3. Iniciar o Servidor em Modo de Desenvolvimento

```bash
npm run start:dev
```

---

## 🧪 Executando os Testes End-to-End (E2E) Mockados

Todos os testes E2E rodam de forma 100% isolada (sem necessidade de enviar arquivos para o Cloudinary real ou conectar ao Redis).

```bash
npm run test:e2e
```

---

## 🔑 Credenciais Padrão para Teste Rápido

- **Administrador**:
  - **E-mail**: `admin@example.com`
  - **Senha**: `Password123!`
- **Usuário Comum**:
  - **E-mail**: `user@example.com`
  - **Senha**: `Password123!`
