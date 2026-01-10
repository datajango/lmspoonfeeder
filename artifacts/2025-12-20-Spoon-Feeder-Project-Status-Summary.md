# 🥄 Spoon Feeder - Project Status Summary

## What is This Project?

**Spoon Feeder** is a multi-provider AI orchestration platform that provides:
- Unified interface for multiple LLM providers (Ollama, OpenAI, Gemini, Claude)
- ComfyUI integration for Stable Diffusion image generation
- Task queue system with Bull + Redis
- Profile management for provider configurations
- Conversation/chat history persistence

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                      http://localhost:5173                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node/Express)                       │
│                     http://localhost:3001                       │
└────────┬───────────────────┬───────────────────┬────────────────┘
         │                   │                   │
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│  PostgreSQL │     │    Redis    │     │ External Services│
│  :5432      │     │   :6379     │     │                 │
│             │     │             │     │ • Ollama :11434 │
│  spoonfeeder│     │  Bull Queue │     │ • ComfyUI :8188 │
└─────────────┘     └─────────────┘     └─────────────────┘
```

---

## 🏥 Quick Health Check Commands

### Check All Services at Once

```bash
echo "=== Spoon Feeder Service Status ===" && \
echo "" && \
echo "Docker containers:" && \
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(spoonfeeder|postgres|redis|NAME)" && \
echo "" && \
echo "Ollama:" && \
(curl -s http://localhost:11434/api/tags > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running") && \
echo "" && \
echo "ComfyUI:" && \
(curl -s http://localhost:8188/system_stats > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running") && \
echo "" && \
echo "Backend API:" && \
(curl -s http://localhost:3001/api/health > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running") && \
echo "" && \
echo "Frontend:" && \
(curl -s http://localhost:5173 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running")
```

### Individual Service Checks

| Service | Check Command |
|---------|---------------|
| **Docker containers** | `docker ps` |
| **PostgreSQL** | `docker exec spoonfeeder-db pg_isready -U postgres` |
| **Redis** | `docker exec spoonfeeder-redis redis-cli ping` |
| **Ollama** | `curl http://localhost:11434/api/tags` |
| **ComfyUI** | `curl http://localhost:8188/system_stats` |
| **Backend API** | `curl http://localhost:3001/api/health` |
| **Frontend** | Open http://localhost:5173 in browser |

---

## 🚀 Starting the Project

### 1. Start Infrastructure (Docker)

```bash
cd backend
docker-compose up -d postgres redis
```

**Expected output:**
```
Creating spoonfeeder-db ... done
Creating spoonfeeder-redis ... done
```

### 2. Start External Services

```bash
# Start Ollama (if not running as a service)
ollama serve

# Start ComfyUI (in its directory)
cd /path/to/ComfyUI
python main.py
```

### 3. Start Backend

```bash
cd backend
npm run dev
```

**Expected output:**
```
Server running on port 3001
Database connected
Redis connected
```

### 4. Start Frontend

```bash
cd frontend
npm run dev
```

**Expected output:**
```
VITE ready in XXXms
➜  Local:   http://localhost:5173/
```

---

## 📍 Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Main UI |
| Backend API | http://localhost:3001/api | REST API |
| Health Check | http://localhost:3001/api/health | System status |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Queue backend |
| Ollama | http://localhost:11434 | Local LLM |
| ComfyUI | http://localhost:8188 | Image generation |

---

## 🗄️ Database Commands

```bash
# Run migrations (first time or after schema changes)
cd backend
npm run migrate

# Rollback migration
npm run migrate:rollback

# Create new migration
npm run migrate:make <migration_name>

# Connect to database directly
docker exec -it spoonfeeder-db psql -U postgres -d spoonfeeder

# Reset database completely
docker-compose down -v
docker-compose up -d postgres redis
npm run migrate
```

---

## 🔧 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3001 in use | `lsof -i :3001` then `kill -9 <PID>` |
| Port 5173 in use | `lsof -i :5173` then `kill -9 <PID>` |
| Database connection failed | `docker-compose restart postgres` |
| Redis connection failed | `docker-compose restart redis` |
| ComfyUI not connecting | Verify ComfyUI is running on port 8188 |
| Ollama not connecting | Run `ollama serve` or check if it's a system service |
| Migrations failing | `npm run migrate:rollback` then `npm run migrate` |

---

## 📁 Project Structure

```
spoon-feeder/
├── backend/
│   ├── src/
│   │   ├── config/           # Environment config
│   │   ├── controllers/      # API controllers
│   │   ├── db/               # Knex + migrations
│   │   ├── middleware/       # Express middleware
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── types/            # TypeScript types
│   ├── docker-compose.yml    # PostgreSQL + Redis
│   ├── package.json
│   └── .env                  # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API client
│   │   └── hooks/            # Custom hooks
│   ├── package.json
│   └── vite.config.ts
│
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    ├── BACKEND.md
    ├── DATABASE.md
    └── FRONTEND.md
```

---

## 🔑 Environment Variables (Backend .env)

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spoonfeeder
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# External Services
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188

# Security (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<your-32-byte-hex-key>
```

---

## 📋 MVP Progress (from docs)

### ✅ Completed
- Multi-provider chat
- ComfyUI integration
- Task queue system
- Profile management
- Database schema

### 🔲 In Progress / TODO
- WebSocket progress updates
- Batch generation
- LoRA support
- ControlNet integration
- Authentication (JWT)
- Rate limiting
- Docker production builds
- Monitoring & logging

---

## 🎯 Quick Resume Checklist

1. [ ] Start Docker containers: `cd backend && docker-compose up -d`
2. [ ] Verify PostgreSQL: `docker exec spoonfeeder-db pg_isready`
3. [ ] Verify Redis: `docker exec spoonfeeder-redis redis-cli ping`
4. [ ] Start Ollama if needed: `ollama serve`
5. [ ] Start ComfyUI if needed
6. [ ] Start backend: `cd backend && npm run dev`
7. [ ] Start frontend: `cd frontend && npm run dev`
8. [ ] Open http://localhost:5173 and verify dashboard shows "Connected"