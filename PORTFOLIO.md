# NestAPI - Portfólio

API RESTful construída com NestJS, PostgreSQL, Redis e Docker.

## Funcionalidades Implementadas

### Autenticação e Autorização
- **JWT Auth**: Login/Register com access token (1 dia)
- **Refresh Token**: Renovação automática de sessão (7 dias)
- **RBAC**: Controle de acesso por roles (ADMIN/USER)
- **Logout**: Revogação de refresh token

### Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/v1/auth/register` | Cadastro de usuário | Não |
| POST | `/api/v1/auth/login` | Login | Não |
| POST | `/api/v1/auth/refresh` | Renovar tokens | Não |
| POST | `/api/v1/auth/logout` | Revogar sessão | Sim |
| GET | `/api/v1/users/me` | Perfil do usuário | Sim |
| GET | `/api/v1/users` | Listar usuários (ADMIN) | Sim |
| GET | `/api/v1/users/paginated` | Usuários paginados | Sim |
| POST | `/api/v1/files/upload` | Upload para Cloudinary | Sim |
| POST | `/api/v1/jobs` | Enfileirar job | Sim |
| GET | `/api/v1/health` | Health check | Não |

### Segurança
- **Helmet**: Headers HTTP seguros
- **Throttler**: Rate limiting (5 req/min no login)
- **CORS**: Configurado por variável de ambiente
- **Synchronize**: Desabilitado em produção (usa migrations)
- **Validação**: DTOs com class-validator
- **Senhas**: Hash com bcrypt (10 rounds)

### Infraestrutura
- **Docker**: PostgreSQL 16 + Redis 7 + API
- **TypeORM**: Migrations para controle de schema
- **BullMQ**: Processamento assíncrono de jobs
- **Cloudinary**: Upload de arquivos na nuvem
- **Swagger**: Documentação automática da API

## Arquitetura

```
src/
├── common/
│   └── enums/
│       ├── role.enum.ts
│       └── job-status.enum.ts
├── config/
│   └── env.validation.ts
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── strategies/
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   └── auth.service.ts
│   ├── users/
│   ├── files/
│   ├── jobs/
│   └── health/
├── migrations/
├── data-source.ts
└── main.ts
```

## Variáveis de Ambiente

```env
# JWT
JWT_SECRET=super-secret-jwt-key-antigravity-nest-api
JWT_EXPIRATION=1d
JWT_REFRESH_SECRET=super-secret-refresh-key-antigravity-nest-api
JWT_REFRESH_EXPIRATION_DAYS=7

# PostgreSQL
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=nest_api

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Comandos

```bash
# Desenvolvimento (local)
npm run dev              # Iniciar com hot reload
npm run build            # Compilar
npm run start:prod       # Produção

# Docker Desenvolvimento (hot reload)
npm run docker:dev       # Subir com hot reload
npm run docker:dev:down  # Parar ambiente dev

# Docker Produção
npm run docker:prod      # Subir em produção
npm run docker:prod:down # Parar ambiente prod

# Testes
npm run test:e2e         # Testes E2E (14 testes, 100% mocked)

# Migrations
npm run migration:generate -- src/migrations/NomeDaMigration
npm run migration:run
npm run migration:revert
```

## Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: NestJS 11
- **Banco**: PostgreSQL 16 (Docker)
- **Cache/Filas**: Redis 7 + BullMQ
- **Upload**: Cloudinary
- **Testes**: Jest + Supertest
- **Docs**: Swagger/OpenAPI

## Testes E2E

```
Test Suites: 4 passed, 4 total
Tests:       14 passed, 14 total
```

- Auth: Register, Login, validação de campos
- Users: Perfil, RBAC (ADMIN/USER)
- Files: Upload com Cloudinary mockado
- Jobs: Enfileiramento com fila mockada
