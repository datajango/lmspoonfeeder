# Spoon Feeder Development Guide

> **Last Updated**: December 2024  
> **Node.js**: 20+  
> **Package Manager**: npm

## Table of Contents

- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [Debugging](#debugging)
- [Database Operations](#database-operations)
- [Testing](#testing)
- [Code Style & Linting](#code-style--linting)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [IDE Setup](#ide-setup)

---

## Quick Start

```bash
# 1. Clone and install
git clone <repository-url>
cd spoon-feeder

# 2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 3. Start infrastructure
cd ../backend
docker-compose up -d postgres redis

# 4. Configure environment
cp .env.example .env
# Edit .env with your settings

# 5. Run migrations
npm run migrate

# 6. Start development servers
npm run dev                    # Terminal 1: Backend (port 3001)
cd ../frontend && npm run dev  # Terminal 2: Frontend (port 5173)

# 7. Open browser
open http://localhost:5173
```

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | Runtime |
| npm | 10+ | Package management |
| Docker | 24+ | Containers |
| Docker Compose | 2.20+ | Container orchestration |
| Git | 2.40+ | Version control |

### Optional but Recommended

| Software | Purpose |
|----------|---------|
| Ollama | Local LLM inference |
| ComfyUI | Image generation |
| VS Code | IDE with recommended extensions |
| pgAdmin / DBeaver | Database GUI |
| Redis Insight | Redis GUI |

### Verify Installation

```bash
# Check versions
node --version      # Should be v20.x.x or higher
npm --version       # Should be 10.x.x or higher
docker --version    # Should be 24.x.x or higher
docker compose version  # Should be v2.20.x or higher

# Verify Docker is running
docker info
```

---

## Project Structure

```
spoon-feeder/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Environment configuration
│   │   │   └── index.ts
│   │   ├── controllers/       # Route handlers
│   │   │   ├── chat.controller.ts
│   │   │   ├── comfyui.controller.ts
│   │   │   ├── database.controller.ts
│   │   │   ├── models.controller.ts
│   │   │   ├── profiles.controller.ts
│   │   │   ├── settings.controller.ts
│   │   │   └── tasks.controller.ts
│   │   ├── db/
│   │   │   ├── index.ts       # Database connection
│   │   │   ├── knex.ts        # Knex instance
│   │   │   ├── knexfile.ts    # Knex configuration
│   │   │   └── migrations/    # Database migrations
│   │   ├── middleware/        # Express middleware
│   │   │   └── error.middleware.ts
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   │   └── index.ts
│   │   ├── utils/             # Utility functions
│   │   │   └── encryption.ts
│   │   ├── app.ts             # Express app setup
│   │   └── server.ts          # Server entry point
│   ├── storage/               # Generated media files
│   ├── docker-compose.yml     # Infrastructure
│   ├── Dockerfile             # Backend container
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/               # API client functions
│   │   ├── components/        # React components
│   │   │   ├── comfyui/       # ComfyUI-specific
│   │   │   ├── layout/        # Layout components
│   │   │   └── ...
│   │   ├── hooks/             # Custom React hooks
│   │   ├── pages/             # Page components
│   │   ├── services/          # API & WebSocket
│   │   ├── types/             # TypeScript types
│   │   ├── App.tsx            # Root component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── package.json
│   ├── vite.config.ts         # Vite configuration
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── tsconfig.node.json
│
└── docs/                       # Documentation
    ├── ARCHITECTURE.md
    ├── API.md
    ├── DATABASE.md
    └── DEVELOPMENT.md
```

---

## Environment Setup

### Backend Environment Variables

Create `backend/.env` from the example:

```bash
cd backend
cp .env.example .env
```

**Required Variables**

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spoonfeeder
DB_USER=postgres
DB_PASSWORD=postgres

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# External Services
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188

# Encryption key for API keys (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-32-byte-hex-key-here

# Storage
MEDIA_STORAGE_PATH=./storage/media
```

**Generate Encryption Key**

```bash
# Linux/macOS
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Frontend Configuration

The frontend uses Vite's proxy configuration in `frontend/vite.config.ts`:

```typescript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
```

No additional configuration needed for development.

---

## Running the Application

### Start Infrastructure

```bash
cd backend

# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Verify containers are running
docker-compose ps

# Check logs if needed
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Run Database Migrations

```bash
cd backend

# Run all pending migrations
npm run migrate

# Check migration status
npx knex migrate:status --knexfile src/db/knexfile.ts

# Rollback last migration (if needed)
npm run migrate:rollback
```

### Start Backend

```bash
cd backend

# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

**Backend Output**
```
🚀 Server running on port 3001
📦 Database connected
🔄 Redis connected
```

### Start Frontend

```bash
cd frontend

# Development mode with HMR
npm run dev

# Production build
npm run build
npm run preview
```

**Frontend Output**
```
  VITE v7.2.4  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.x:5173/
  ➜  press h + enter to show help
```

### Start External Services (Optional)

**Ollama**
```bash
# macOS/Linux
ollama serve

# Pull a model
ollama pull llama3
```

**ComfyUI**
```bash
# Navigate to ComfyUI directory
cd /path/to/ComfyUI

# Start server
python main.py --listen 0.0.0.0 --port 8188
```

---

## Development Workflow

### Branch Strategy

```
main              # Production-ready code
├── develop       # Integration branch
├── feature/*     # New features
├── bugfix/*      # Bug fixes
└── hotfix/*      # Production hotfixes
```

### Creating a Feature

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance

**Examples**
```bash
git commit -m "feat(comfyui): add batch generation support"
git commit -m "fix(api): handle null workflow_id in generations"
git commit -m "docs: update API documentation"
```

### NPM Scripts

**Backend**

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `ts-node-dev --respawn src/server.ts` | Development with hot reload |
| `build` | `tsc` | Compile TypeScript |
| `start` | `node dist/server.js` | Run production build |
| `migrate` | `knex migrate:latest` | Run migrations |
| `migrate:rollback` | `knex migrate:rollback` | Rollback migration |
| `migrate:make` | `knex migrate:make <name>` | Create migration |

**Frontend**

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Development server |
| `build` | `tsc -b && vite build` | Production build |
| `preview` | `vite preview` | Preview production build |
| `lint` | `eslint .` | Run ESLint |

---

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/backend",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Current File",
      "type": "node",
      "request": "launch",
      "program": "${file}",
      "cwd": "${workspaceFolder}/backend",
      "runtimeArgs": ["-r", "ts-node/register"],
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Attach to Backend",
      "type": "node",
      "request": "attach",
      "port": 9229,
      "restart": true,
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Enable Node.js Inspector

```bash
# Start with inspector
cd backend
node --inspect -r ts-node/register src/server.ts

# Or add to package.json script
"dev:debug": "node --inspect -r ts-node/register src/server.ts"
```

### Debug with Console Logging

```typescript
// Structured logging
console.log('[ComfyUI]', 'Starting generation', { sessionId, prompt });

// JSON output for complex objects
console.log(JSON.stringify(workflow, null, 2));

// Debug specific modules
const debug = require('debug')('app:comfyui');
debug('Processing workflow %s', workflowId);
```

### React DevTools

1. Install browser extension:
   - [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

2. Open DevTools → React tab

### React Query DevTools

Already included in the project. Toggle with keyboard shortcut or floating icon.

```typescript
// In App.tsx or main.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## Database Operations

### Connect to PostgreSQL

```bash
# Via Docker
docker exec -it spoonfeeder-db psql -U postgres -d spoonfeeder

# Via local psql
psql -h localhost -p 5432 -U postgres -d spoonfeeder
```

### Common SQL Commands

```sql
-- List tables
\dt

-- Describe table
\d comfyui_generations

-- Count rows
SELECT COUNT(*) FROM comfyui_generations;

-- Recent generations
SELECT id, prompt_text, status, created_at 
FROM comfyui_generations 
ORDER BY created_at DESC 
LIMIT 10;

-- Find by seed
SELECT * FROM comfyui_generations WHERE seed = 12345678;
```

### Migration Commands

```bash
cd backend

# Create new migration
npm run migrate:make add_new_column

# Run all pending
npm run migrate

# Rollback last batch
npm run migrate:rollback

# Rollback all
npm run migrate:rollback --all

# Check status
npx knex migrate:status --knexfile src/db/knexfile.ts
```

### Reset Database

```bash
# Option 1: Rollback and re-migrate
npm run migrate:rollback --all
npm run migrate

# Option 2: Drop and recreate
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate
```

### Database GUI Tools

**pgAdmin** (Web-based)
```bash
docker run -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@admin.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4
```
Access at http://localhost:5050

**DBeaver** (Desktop)
- Download from https://dbeaver.io/
- Connection: PostgreSQL, localhost:5432, spoonfeeder

---

## Testing

### Backend Testing (Planned)

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npm test -- comfyui.test.ts

# Watch mode
npm run test:watch
```

### Frontend Testing (Planned)

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Manual API Testing

**Using curl**
```bash
# Health check
curl http://localhost:3001/api/health

# List profiles
curl http://localhost:3001/api/profiles

# Create session
curl -X POST http://localhost:3001/api/comfyui/sessions \
  -H "Content-Type: application/json" \
  -d '{"profileId": "uuid", "title": "Test Session"}'

# Generate image
curl -X POST http://localhost:3001/api/comfyui/sessions/{sessionId}/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_text": "A beautiful sunset",
    "parameters": {"steps": 20, "cfg_scale": 7}
  }'
```

**Using VS Code REST Client**

Create `requests.http`:
```http
### Health Check
GET http://localhost:3001/api/health

### List Profiles
GET http://localhost:3001/api/profiles

### Create ComfyUI Session
POST http://localhost:3001/api/comfyui/sessions
Content-Type: application/json

{
  "profileId": "your-profile-uuid",
  "title": "Test Session"
}
```

---

## Code Style & Linting

### ESLint Configuration

**Backend** (`backend/.eslintrc.js` - create if needed)
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

**Frontend** (uses Vite's default ESLint config)

### Run Linting

```bash
# Frontend
cd frontend
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

### TypeScript Configuration

**Strict Mode** - Both frontend and backend use strict TypeScript:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Code Formatting (Recommended)

Add Prettier for consistent formatting:

```bash
# Install
npm install -D prettier

# Create .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}

# Format all files
npx prettier --write "src/**/*.{ts,tsx}"
```

---

## Common Tasks

### Add a New API Endpoint

1. **Create Controller** (`backend/src/controllers/new.controller.ts`)
```typescript
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';

export async function listItems(req: Request, res: Response, next: NextFunction) {
  try {
    const db = getDb();
    const items = await db('items').select('*');
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}
```

2. **Create Route** (`backend/src/routes/new.routes.ts`)
```typescript
import { Router } from 'express';
import { listItems } from '../controllers/new.controller';

const router = Router();
router.get('/', listItems);

export default router;
```

3. **Register Route** (`backend/src/app.ts`)
```typescript
import newRoutes from './routes/new.routes';
app.use('/api/new', newRoutes);
```

### Add a New Database Table

1. **Create Migration**
```bash
cd backend
npm run migrate:make create_items_table
```

2. **Edit Migration** (`backend/src/db/migrations/xxx_create_items_table.ts`)
```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return knex.schema.createTable('items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description');
    table.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('items');
}
```

3. **Run Migration**
```bash
npm run migrate
```

### Add a New React Page

1. **Create Page** (`frontend/src/pages/NewPage.tsx`)
```tsx
import Header from '../components/layout/Header';

export default function NewPage() {
  return (
    <div className="min-h-screen">
      <Header title="New Page" subtitle="Description" />
      <div className="p-8">
        {/* Content */}
      </div>
    </div>
  );
}
```

2. **Add Route** (`frontend/src/App.tsx`)
```tsx
import NewPage from './pages/NewPage';

// In Routes
<Route path="/new" element={<NewPage />} />
```

3. **Add Navigation** (`frontend/src/components/layout/Sidebar.tsx`)
```tsx
const navItems = [
  // ...existing items
  { path: '/new', label: 'New Page', icon: SomeIcon },
];
```

### Add a New API Hook

```tsx
// frontend/src/hooks/useItems.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export function useItems() {
  return useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/items`);
      const data = await res.json();
      return data.data;
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: { name: string }) => {
      const res = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}
```

---

## Troubleshooting

### Backend Won't Start

**Port already in use**
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

**Database connection refused**
```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart container
docker-compose restart postgres
```

**Redis connection refused**
```bash
# Check if Redis is running
docker-compose ps

# Restart container
docker-compose restart redis
```

### Frontend Won't Start

**Port already in use**
```bash
# Vite will auto-increment port, or kill existing process
lsof -i :5173
kill -9 <PID>
```

**Module not found**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### API Requests Failing

**CORS errors**
- Ensure backend is running on port 3001
- Check Vite proxy configuration

**404 errors**
- Verify route exists in backend
- Check API path matches frontend call

**500 errors**
```bash
# Check backend logs
docker-compose logs -f backend

# Or if running locally
# Check terminal output
```

### Database Issues

**Migration failed**
```bash
# Check migration status
npx knex migrate:status --knexfile src/db/knexfile.ts

# Rollback and retry
npm run migrate:rollback
npm run migrate
```

**Data corruption**
```bash
# Full reset
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate
```

### ComfyUI Connection Issues

**Cannot connect to ComfyUI**
1. Verify ComfyUI is running: `http://localhost:8188`
2. Check COMFYUI_URL in `.env`
3. Ensure ComfyUI is listening on correct interface

**Image proxy not working**
```bash
# Test direct access to ComfyUI
curl "http://localhost:8188/view?filename=ComfyUI_00001_.png&type=output"
```

---

## IDE Setup

### VS Code Extensions

**Required**
- ESLint
- TypeScript and JavaScript Language Features (built-in)
- Prettier - Code formatter

**Recommended**
- Tailwind CSS IntelliSense
- ES7+ React/Redux/React-Native snippets
- GitLens
- Docker
- PostgreSQL (by Chris Kolkman)
- REST Client
- Error Lens
- Auto Rename Tag

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Workspace Configuration

Create `spoon-feeder.code-workspace`:

```json
{
  "folders": [
    {
      "name": "Backend",
      "path": "backend"
    },
    {
      "name": "Frontend",
      "path": "frontend"
    },
    {
      "name": "Docs",
      "path": "docs"
    }
  ],
  "settings": {
    "typescript.tsdk": "backend/node_modules/typescript/lib"
  }
}
```

---

## Useful Commands Reference

```bash
# ═══════════════════════════════════════════════════════════════
# DOCKER
# ═══════════════════════════════════════════════════════════════
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose down -v            # Stop and remove volumes
docker-compose logs -f            # Follow all logs
docker-compose logs -f postgres   # Follow specific service
docker-compose ps                 # List running containers
docker-compose restart postgres   # Restart specific service

# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
npm run migrate                   # Run migrations
npm run migrate:rollback          # Rollback last batch
npm run migrate:make <name>       # Create migration
docker exec -it spoonfeeder-db psql -U postgres -d spoonfeeder

# ═══════════════════════════════════════════════════════════════
# BACKEND
# ═══════════════════════════════════════════════════════════════
cd backend
npm run dev                       # Start dev server
npm run build                     # Build for production
npm start                         # Run production build
npm run lint                      # Run linter

# ═══════════════════════════════════════════════════════════════
# FRONTEND
# ═══════════════════════════════════════════════════════════════
cd frontend
npm run dev                       # Start dev server
npm run build                     # Build for production
npm run preview                   # Preview production build
npm run lint                      # Run linter

# ═══════════════════════════════════════════════════════════════
# GIT
# ═══════════════════════════════════════════════════════════════
git checkout -b feature/name      # Create feature branch
git add . && git commit -m "msg"  # Stage and commit
git push origin feature/name      # Push branch
git checkout develop && git pull  # Update develop

# ═══════════════════════════════════════════════════════════════
# MISC
# ═══════════════════════════════════════════════════════════════
openssl rand -hex 32              # Generate encryption key
lsof -i :3001                     # Find process on port
kill -9 <PID>                     # Kill process
```

---

## Next Steps

After getting the development environment running:

1. **Explore the codebase** - Start with `backend/src/server.ts` and `frontend/src/App.tsx`
2. **Review the API documentation** - See `docs/API.md`
3. **Understand the database schema** - See `docs/DATABASE.md`
4. **Check the architecture overview** - See `docs/ARCHITECTURE.md`
5. **Pick up a task** - Check the project board or issues
