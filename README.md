# Brain Backend (`brain-backend`)

Edge-native REST API powering the **Personal Second Brain & Execution System**, built on Cloudflare Workers, Hono, and Cloudflare D1.

---

## ⚡ Quick Start

```bash
# Install dependencies
npm install

# Start local edge development server (http://localhost:8787)
npm run dev

# Generate Cloudflare Worker TypeScript types
npm run cf-typegen

# Deploy manually to Cloudflare Workers
npm run deploy

# Reset dev database rows (test data wipe)
npm run db:clean
```

---

## 🌐 Environments & Base URLs

- **Development API:** `https://dev.mohakapoor.in/api_brain`
- **Local Dev Server:** `http://localhost:8787/api_brain`

---

## 📚 Documentation Index

This repository maintains dedicated design and specification documents. Refer to each file for detailed technical specifications:

| Document | Description |
| :--- | :--- |
| **[docs/design.md](docs/design.md)** | **Architecture & System Design:** Edge runtime model, middleware pipeline, single-device session lifecycle, multi-tenant isolation, and CI/CD philosophy. |
| **[docs/api_design.md](docs/api_design.md)** | **API Reference & Contracts:** Full REST endpoint specifications, request/response JSON schemas, Zod validation rules, and error envelopes. |
| **[docs/db_design.md](docs/db_design.md)** | **Database Design & ERD:** Cloudflare D1 SQLite schemas, table definitions (`users`, `sessions`, `tasks`), foreign key cascades, and indexes. |
| **[migrations/](migrations/)** | **Database Migrations:** Versioned D1 SQL migration scripts applied automatically during deployment. |
| **[.github/workflows/deploy.yml](.github/workflows/deploy.yml)** | **CI/CD Pipeline:** Automated path filtering, static TypeScript typechecking (`tsc --noEmit`), remote migrations, and deployment. |

---

## 📂 Project Structure

```text
brain_backend/
├── .github/workflows/deploy.yml   # CI/CD deployment pipeline
├── docs/                          # Architecture, API & DB design documents
│   ├── design.md                  # System architecture & core design
│   ├── api_design.md              # Complete REST API reference
│   └── db_design.md              # Database schemas & ER diagrams
├── migrations/                    # D1 SQLite versioned migrations
│   └── 0001_init.sql
├── src/
│   ├── index.ts                   # Worker entrypoint & route registration
│   ├── middleware/                # Auth guard & request middleware
│   │   └── auth.ts
│   ├── routes/                    # Route handlers (base, auth, tasks)
│   │   ├── auth.ts
│   │   ├── base.ts
│   │   └── tasks.ts
│   └── schemas/                   # Zod request validation schemas
│       ├── auth.ts
│       └── tasks.ts
├── package.json                   # Dependencies & npm scripts
├── tsconfig.json                  # Strict TypeScript configuration
└── wrangler.jsonc                 # Cloudflare Worker & D1 binding configuration
```
