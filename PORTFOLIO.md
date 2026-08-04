# 🚀 NestJS Production API — Portfólio Backend Pleno

## Visão Geral

API RESTful completa, production-ready, construída com NestJS v11 seguindo as melhores práticas de arquitetura, segurança e observabilidade que um **tech lead** espera encontrar em um dev pleno.

---

## 🏗️ Stack Tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| **Framework** | NestJS | v11.0.1 |
| **Linguagem** | TypeScript | v5.7.3 |
| **Banco de Dados** | PostgreSQL | v16 (Alpine) |
| **ORM** | TypeORM | latest |
| **Cache/Filas** | Redis + BullMQ | v7 / v5.41 |
| **Autenticação** | JWT (Passport) | v0.7.0 |
| **Cloud Storage** | Cloudinary | v2.10 |
| **Containerização** | Docker + Docker Compose | Multi-stage build |
| **CI/CD** | GitHub Actions | Workflows |
| **Documentação** | Swagger/OpenAPI | v11.0.3 |
| **Testes** | Jest + Supertest | v29.7 / v7.0 |

---

## 📁 Arquitetura do Projeto

```
src/
├── main.ts                          # Bootstrap com helmet, compression, interceptors globais
├── app.module.ts                    # Root module com TypeORM, Throttler, Config
├── config/
│   └── env.validation.ts            # Validação de env com Joi (fail-fast no boot)
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts    # @CurrentUser() — extrai user do request
│   │   ├── public.decorator.ts          # @Public() — bypass JWT
│   │   └── roles.decorator.ts           # @Roles() — RBAC
│   ├── dto/
│   │   └── pagination.dto.ts            # DTO genérico de paginação
│   ├── enums/
│   │   ├── role.enum.ts                 # USER | ADMIN
│   │   └── job-status.enum.ts           # QUEUED | PROCESSING | COMPLETED | FAILED
│   ├── filters/
│   │   └── http-exception.filter.ts     # Filtro global de erros padronizado
│   ├── guards/
│   │   ├── jwt-auth.guard.ts            # Guard JWT com suporte a @Public()
│   │   └── roles.guard.ts              # Guard de RBAC
│   └── interceptors/
│       ├── response.interceptor.ts      # Envelope { data, message, statusCode, timestamp }
│       └── correlation-id.interceptor.ts # x-request-id + log com correlation
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts       # POST /register, POST /login (throttled 5/min)
    │   ├── auth.service.ts
    │   ├── dto/
    │   │   ├── login.dto.ts
    │   │   └── register.dto.ts
    │   └── strategies/
    │       └── jwt.strategy.ts
    ├── users/
    │   ├── users.module.ts
    │   ├── users.controller.ts      # GET /me, GET / (admin, paginado)
    │   ├── users.service.ts         # Seed automático + CRUD via TypeORM
    │   ├── entities/
    │   │   └── user.entity.ts       # UUID, passwordHash select:false
    │   └── dto/
    │       └── user-response.dto.ts
    ├── files/
    │   ├── files.module.ts
    │   ├── files.controller.ts      # POST /upload com validação MIME + 5MB
    │   ├── files.service.ts         # Upload Cloudinary + metadata no Postgres
    │   ├── cloudinary.provider.ts
    │   ├── entities/
    │   │   └── file.entity.ts       # ManyToOne → User
    │   └── dto/
    │       └── file-upload.dto.ts
    ├── jobs/
    │   ├── jobs.module.ts
    │   ├── jobs.controller.ts       # POST /jobs
    │   ├── jobs.service.ts          # BullMQ + fallback + persistência Postgres
    │   ├── jobs.processor.ts        # Worker com processamento simulado
    │   ├── entities/
    │   │   └── job.entity.ts        # jsonb payload, enum status
    │   └── dto/
    │       └── create-job.dto.ts
    └── health/
        ├── health.module.ts
        └── health.controller.ts     # GET /health com memory check
```

---

## 🔐 Segurança (Production-Ready)

### 1. Rate Limiting (`@nestjs/throttler`)
- **Global:** 100 req/min por IP
- **Login:** 5 tentativas/min (proteção contra brute force)
- **Implementação:** `APP_GUARD` + `@Throttle()` por rota

### 2. Helmet (Security Headers HTTP)
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000
- Content-Security-Policy
- Referrer-Policy

### 3. Validação de Variáveis de Ambiente (Joi)
- App **não sobe** se faltar `JWT_SECRET`, `CLOUDINARY_API_KEY`, etc.
- Mensagens de erro claras no boot
- Valores default para vars opcionais

### 4. Validação de DTOs (class-validator)
- `whitelist: true` — stripping de propriedades desconhecidas
- `forbidNonWhitelisted: true` — erro 400 para campos extras
- `transform: true` — auto-conversão de tipos

### 5. Senhas com bcrypt
- Hash com cost factor 10
- `passwordHash` com `select: false` no TypeORM (não volta em queries)

---

## 📊 Padrão de Resposta Padronizado

```json
{
  "data": { ... },
  "message": "Success",
  "statusCode": 200,
  "timestamp": "2026-08-03T20:02:02.439Z"
}
```

### Erros:
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Credenciais inválidas",
  "timestamp": "2026-08-03T20:02:02.439Z",
  "path": "/api/v1/auth/login"
}
```

---

## 🗄️ Banco de Dados (PostgreSQL + TypeORM)

### Entidades

#### User
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK, auto-generated |
| name | varchar | NOT NULL |
| email | varchar | UNIQUE, NOT NULL |
| passwordHash | varchar | SELECT: false |
| role | enum (user/admin) | DEFAULT 'user' |
| createdAt | timestamp | auto-generated |

#### File
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| filename | varchar | Cloudinary public_id |
| originalName | varchar | Nome original do arquivo |
| mimetype | varchar | MIME type |
| size | bigint | Tamanho em bytes |
| path | varchar | URL do Cloudinary |
| uploadedById | UUID | FK → User |
| uploadedAt | timestamp | auto-generated |

#### Job
| Campo | Tipo | Constraints |
|---|---|---|
| id | UUID | PK |
| queueName | varchar | 'tasks-queue' |
| type | varchar | Tipo do job |
| status | enum | queued/processing/completed/failed |
| payload | jsonb | Dados do job + requestedBy |
| requestedById | UUID | FK → User |
| createdAt | timestamp | auto-generated |

### Relacionamentos
```
User 1:N Files   (um usuário faz vários uploads)
User 1:N Jobs    (um usuário cria vários jobs)
```

### Seed Automático
- `onModuleInit` cria 2 usuários se a tabela estiver vazia:
  - `admin@example.com` / `Password123!` / role: admin
  - `user@example.com` / `Password123!` / role: user

---

## 🐳 Infraestrutura Docker

### docker-compose.yml
| Serviço | Imagem | Porta | Healthcheck |
|---|---|---|---|
| api | Build multi-stage (node:22-alpine) | 3000 | `wget /health` |
| postgres | postgres:16-alpine | 5433→5432 | `pg_isready` |
| redis | redis:7-alpine | 6379 | `redis-cli ping` |

### Dependências
- API espera PostgreSQL **e** Redis healthy antes de iniciar
- `condition: service_healthy` em ambos

### Dockerfile (Multi-stage)
```
Stage 1 (builder): node:22-alpine → npm ci → npm run build
Stage 2 (runner):  node:22-alpine → npm ci --omit=dev → copia dist/
```

---

## 🔄 CI/CD (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request] → branch main
jobs:
  - Setup Node.js 22
  - npm ci (com cache)
  - npm run build (verifica compilação)
  - npm run test:e2e (14 testes)
```

---

## ✅ Testes E2E (14/14 passando)

| Suite | Testes | O que valida |
|---|---|---|
| **auth.e2e-spec.ts** | 5 | Registro sucesso, email duplicado (409), campos inválidos (400), login sucesso, senha errada (401) |
| **users.e2e-spec.ts** | 4 | Perfil (200), sem token (401), admin lista users (200), user comum proibido (403) |
| **files.e2e-spec.ts** | 3 | Upload sucesso (201), sem token (401), tipo inválido (400) |
| **jobs.e2e-spec.ts** | 2 | Criar job (201), sem token (401) |

### Estratégia de Mock
- **Cloudinary:** Mock do provider retorna URL fake
- **BullQueue:** Mock do `queue.add()` 
- **Banco:** Usa o PostgreSQL real (mesmo banco de dev)

---

## 📡 Endpoints da API

| Método | Rota | Auth | Rate Limit | Descrição |
|---|---|---|---|---|
| `POST` | `/auth/register` | Não | Global | Cadastro de usuário |
| `POST` | `/auth/login` | Não | **5/min** | Login, retorna JWT |
| `GET` | `/users/me` | JWT | Global | Perfil do usuário logado |
| `GET` | `/users` | JWT + ADMIN | Global | Lista paginada de usuários |
| `POST` | `/files/upload` | JWT | Global | Upload para Cloudinary |
| `POST` | `/jobs` | JWT | Global | Criar job na fila |
| `GET` | `/health` | Não | Global | Health check (memória) |

### Paginação
```
GET /api/v1/users?page=1&limit=10

Response:
{
  "data": {
    "users": [...],
    "meta": {
      "total": 25,
      "page": 1,
      "limit": 10,
      "totalPages": 3
    }
  },
  "message": "Success",
  "statusCode": 200,
  "timestamp": "..."
}
```

---

## 🛡️ Observabilidade

### Correlation ID
- Cada request recebe um `x-request-id` (UUID)
- Se o client enviar um, é reutilizado
- Propagado nos logs: `[abc123] POST /auth/login - 45ms`

### Logging
- Logs estruturados com `Logger` do NestJS
- Request method, URL e duração em ms

---

## 🧠 Conceitos que um Pleno domina (e este projeto demonstra)

| Conceito | Onde está no projeto |
|---|---|
| **SOLID** | Services com responsabilidade única, Inversão de Dependência (repositories injetados) |
| **DRY** | DTOs reutilizáveis, interceptors globais, guards compartilhados |
| **Clean Architecture** | Módulos isolados, entities separadas de DTOs, services não dependem de controllers |
| **Dependency Injection** | Todo módulo usa DI do NestJS (ConfigService, Repository, Queue) |
| **Guards** | JwtAuthGuard + RolesGuard com metadados via decorators |
| **Interceptors** | ResponseInterceptor (padronização), CorrelationIdInterceptor (rastreabilidade) |
| **Filters** | HttpExceptionFilter global com formato padronizado de erros |
| **Pipes** | ValidationPipe global + class-validator nos DTOs |
| **Decorators** | @CurrentUser(), @Public(), @Roles() — custom decorators |
| **TypeORM** | Entities, Relations (ManyToOne), QueryBuilder, select:false |
| **Docker** | Multi-stage build, healthchecks, depends_on com condition |
| **CI/CD** | GitHub Actions com build + test automatizado |
| **Rate Limiting** | ThrottlerGuard global + throttling por rota |
| **Security** | Helmet, compression, bcrypt, JWT, validação de env |
| **Testes** | E2E com mocks, cobertura de todos os endpoints |
| **API Design** | Padronização de respostas, paginação, documentação Swagger |
| **Fila assíncrona** | BullMQ com fallback gracioso para sem Redis |

---

## 🚀 Como Rodar

```bash
# 1. Subir infraestrutura
docker compose up -d

# 2. Verificar health
curl http://localhost:3000/api/v1/health

# 3. Acessar Swagger
http://localhost:3000/api/docs

# 4. Rodar testes
npm run test:e2e

# 5. Dev mode (hot reload)
npm run start:dev
```

---

## 📈 Diferencial vs. Projetos de Tutorial

| Comum em tutoriais | Neste projeto |
|---|---|
| App sobe sem env vars | Joi validation + fail-fast |
| Respostas cruas `{ nome, email }` | Envelope padronizado `{ data, message, statusCode, timestamp }` |
| Sem rate limiting | Throttler global + 5/min no login |
| Sem security headers | Helmet com todas as proteções |
| Sem health check | `GET /health` com memory check |
| Sem paginação | `page`, `limit`, `total`, `meta` |
| Sem CI/CD | GitHub Actions automatizado |
| Sem testes E2E | 14 testes cobrindo todos os endpoints |
| Docker básico | Multi-stage build + healthchecks + condition:service_healthy |
| Banco in-memory | PostgreSQL com TypeORM + UUID + relações |
| Sem correlation ID | x-request-id + log com rastreabilidade |
| Sem compressão | Gzip via compression middleware |
