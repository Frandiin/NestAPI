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

### Financeiro Pessoal

- **Categorias**: CRUD completo com cores e ícones para categorizar transações
- **Transações**: Receitas e despesas com notas, recorrência e data
- **Orçamentos**: Controle mensal por categoria com limite de gasto
- **Metas financeiras**: Objetivos com valor-alvo, prazo e acompanhamento de progresso
- **Dashboard**: Resumo do mês, comparação entre períodos e histórico
- **Análise com IA (Gemini)**: 5 tipos de análise — resumo mensal, previsão, dicas, detecção de gastos anormais e comparação entre meses
- **Relatórios PDF**: Relatório mensal, anual, extrato de transações e recibo por UUID
- **Jobs assíncronos**: 9 tipos de job via BullMQ — análises e relatórios são enfileirados e processados em background

### Endpoints Financeiros

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/v1/finance/categories` | Criar categoria | Sim |
| GET | `/api/v1/finance/categories` | Listar categorias | Sim |
| POST | `/api/v1/finance/transactions` | Criar transação | Sim |
| GET | `/api/v1/finance/transactions` | Listar transações (filtros) | Sim |
| GET | `/api/v1/finance/transactions/:id` | Buscar transação por ID | Sim |
| PUT | `/api/v1/finance/transactions/:id` | Atualizar transação | Sim |
| DELETE | `/api/v1/finance/transactions/:id` | Remover transação | Sim |
| POST | `/api/v1/finance/budgets` | Criar orçamento | Sim |
| GET | `/api/v1/finance/budgets` | Listar orçamentos do mês | Sim |
| GET | `/api/v1/finance/budgets/status` | Status dos orçamentos | Sim |
| POST | `/api/v1/finance/goals` | Criar meta | Sim |
| GET | `/api/v1/finance/goals` | Listar metas | Sim |
| POST | `/api/v1/finance/goals/:id/amount` | Adicionar valor à meta | Sim |
| GET | `/api/v1/finance/dashboard/:month/:year` | Dashboard do mês | Sim |
| GET | `/api/v1/finance/dashboard/compare` | Comparar períodos | Sim |
| GET | `/api/v1/finance/dashboard/history` | Histórico | Sim |
| POST | `/api/v1/finance/ai/analysis` | Solicitar análise IA | Sim |
| GET | `/api/v1/finance/ai/history` | Histórico de análises | Sim |
| POST | `/api/v1/finance/reports/generate` | Gerar relatório PDF | Sim |
| GET | `/api/v1/finance/reports/history` | Histórico de relatórios | Sim |

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
│       ├── job-status.enum.ts
│       └── finance.enums.ts        (TransactionType, AnalysisType, ReportType, GoalStatus)
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
│   │   └── jobs.processor.ts       (9 tipos de job: 5 IA + 4 relatórios)
│   ├── finance/
│   │   ├── dto/
│   │   ├── entities/
│   │   │   ├── category.entity.ts
│   │   │   ├── transaction.entity.ts
│   │   │   ├── budget.entity.ts
│   │   │   ├── goal.entity.ts
│   │   │   ├── ai-analysis.entity.ts
│   │   │   └── generated-report.entity.ts
│   │   ├── finance.controller.ts
│   │   ├── finance.module.ts
│   │   └── finance.service.ts
│   ├── ai/
│   │   ├── ai.controller.ts
│   │   ├── ai.module.ts
│   │   └── ai.service.ts           (Gemini SDK - @google/genai)
│   ├── reports/
│   │   ├── reports.controller.ts
│   │   ├── reports.module.ts
│   │   └── reports.service.ts      (pdfkit - geração de PDFs)
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

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key
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
npm run test:e2e         # Testes E2E (44 testes, 100% mocked)

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
- **IA**: Gemini SDK (`@google/genai`)
- **PDF**: pdfkit
- **Testes**: Jest + Supertest
- **Docs**: Swagger/OpenAPI

## Testes E2E

```
Test Suites: 7 passed, 7 total
Tests:       44 passed, 44 total
```

- Auth: Register, Login, validação de campos
- Users: Perfil, RBAC (ADMIN/USER)
- Files: Upload com Cloudinary mockado
- Jobs: Enfileiramento com fila mockada
- Finance: CRUD categorias, transações, orçamentos, metas, dashboard
- AI: 5 tipos de análise (resumo, previsão, dicas, detecção, comparação)
- Reports: Geração de 4 tipos de relatório (mensal, anual, extrato, recibo)
