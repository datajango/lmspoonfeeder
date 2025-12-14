# 🥄 Spoon Feeder

> **AI Content Orchestration Platform**  
> A unified interface for managing multiple AI providers and workflows

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Overview

Spoon Feeder is an MVP platform that serves as a unified interface for multiple AI providers. It routes text, image, video, and audio generation tasks to appropriate services while maintaining comprehensive audit trails and reproducibility.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            SPOON FEEDER                                      │
│                                                                              │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│   │   Ollama    │    │   OpenAI    │    │   Gemini    │    │   Claude    │ │
│   │   (Local)   │    │   (Cloud)   │    │   (Cloud)   │    │   (Cloud)   │ │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│          │                  │                  │                  │         │
│          └──────────────────┴──────────────────┴──────────────────┘         │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     Unified API & Task Queue                         │   │
│   │            (Express + Bull + PostgreSQL + Redis)                     │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│          ┌─────────────────────────┼─────────────────────────┐              │
│          ▼                         ▼                         ▼              │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐        │
│   │    Chat     │          │   ComfyUI   │          │    Tasks    │        │
│   │ Completions │          │   Images    │          │   & Queue   │        │
│   └─────────────┘          └─────────────┘          └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### Multi-Provider AI Integration
- **Ollama** - Local LLM inference with model management
- **OpenAI** - GPT-4, GPT-3.5-turbo, DALL-E
- **Google Gemini** - Gemini Pro models
- **Anthropic Claude** - Claude 3 family
- **ComfyUI** - Stable Diffusion image generation

### Core Capabilities
| Feature | Description |
|---------|-------------|
| 💬 **Conversations** | Chat interface with message history and multi-turn support |
| 🎨 **Image Generation** | ComfyUI integration with full parameter control |
| 📋 **Task Queue** | Async task processing with Bull + Redis |
| 👤 **Profiles** | Multi-instance provider configurations |
| 🔄 **Reproducibility** | Complete workflow snapshots for exact reproduction |
| 📊 **History** | Full audit trail with filtering and export |
| 🔒 **Security** | AES-256-GCM encrypted API key storage |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd spoon-feeder

# Install backend dependencies
cd backend
npm install
cp .env.example .env

# Start infrastructure (PostgreSQL + Redis)
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Start backend server
npm run dev
```

```bash
# In a new terminal - Install and start frontend
cd frontend
npm install
npm run dev
```

### Access the Application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## 📁 Project Structure

```
spoon-feeder/
├── backend/                    # Node.js/Express API
│   ├── src/
│   │   ├── config/            # Environment configuration
│   │   ├── controllers/       # Route handlers
│   │   ├── db/                # Database & migrations
│   │   ├── middleware/        # Express middleware
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Utilities
│   ├── docker-compose.yml     # Infrastructure
│   └── package.json
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── api/               # API clients
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   ├── types/             # TypeScript types
│   │   └── App.tsx            # Root component
│   └── package.json
│
└── docs/                       # Documentation
    ├── README.md              # This file
    ├── ARCHITECTURE.md        # System design
    ├── API.md                 # API reference
    ├── DATABASE.md            # Schema docs
    ├── DEVELOPMENT.md         # Dev guide
    ├── FRONTEND.md            # Frontend architecture
    └── COMFYUI-INTEGRATION.md # ComfyUI deep-dive
```

---

## 🛠️ Technology Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| Express | Web framework |
| TypeScript | Type safety |
| PostgreSQL 16 | Database |
| Knex.js | Query builder & migrations |
| Bull | Task queue |
| Redis | Queue backend |
| Socket.io | Real-time updates |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| TypeScript | Type safety |
| Vite 7 | Build tool |
| Tailwind CSS 4 | Styling |
| React Query 5 | Server state |
| React Router 7 | Routing |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Orchestration |
| Ollama | Local LLM runtime |
| ComfyUI | Image generation |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | System design, data flows, component diagrams |
| [**API.md**](docs/API.md) | Complete REST API reference with examples |
| [**DATABASE.md**](docs/DATABASE.md) | Schema documentation, ER diagrams, queries |
| [**DEVELOPMENT.md**](docs/DEVELOPMENT.md) | Setup guide, debugging, troubleshooting |
| [**FRONTEND.md**](docs/FRONTEND.md) | React architecture, components, patterns |
| [**COMFYUI-INTEGRATION.md**](docs/COMFYUI-INTEGRATION.md) | ComfyUI workflow JSON, parameters, API |

---

## 🔌 API Overview

### Base URL
```
http://localhost:3001/api
```

### Key Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Health** | `GET /health` | System status |
| **Models** | `GET/POST /models/*` | Ollama model management |
| **Profiles** | `CRUD /profiles` | Provider configurations |
| **Chat** | `POST /chat/completions` | Multi-provider chat |
| **Tasks** | `CRUD /tasks` | Async task queue |
| **ComfyUI** | `/comfyui/*` | Sessions, workflows, generations |

### Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

See [API.md](docs/API.md) for complete endpoint documentation.

---

## 💾 Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | Provider configurations |
| `profile_models` | Associated models |
| `tasks` | Async generation tasks |
| `results` | Task outputs |
| `conversations` | Chat sessions |
| `messages` | Chat messages |
| `comfyui_workflows` | Workflow templates |
| `comfyui_sessions` | Generation sessions |
| `comfyui_generations` | Individual generations |

See [DATABASE.md](docs/DATABASE.md) for complete schema documentation.

---

## 🎨 ComfyUI Integration

Spoon Feeder provides a streamlined interface for ComfyUI:

- **Dynamic Workflows** - Load and modify any ComfyUI workflow
- **Parameter Extraction** - Automatically detect editable parameters
- **Session Management** - Group generations like chat conversations
- **Full Reproducibility** - Store complete workflow snapshots
- **Image Proxy** - Serve images through the backend API

### Supported Parameters

| Parameter | Default | Range |
|-----------|---------|-------|
| Width | 1024 | 256-2048 |
| Height | 1024 | 256-2048 |
| Steps | 20 | 1-150 |
| CFG Scale | 7 | 1-30 |
| Seed | -1 (random) | 0-2³¹ |
| Sampler | euler | 20+ options |
| Scheduler | normal | 7 options |

See [COMFYUI-INTEGRATION.md](docs/COMFYUI-INTEGRATION.md) for workflow JSON structure and advanced usage.

---

## 🧪 Development

### Running in Development Mode

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Infrastructure (if not running)
cd backend
docker-compose up -d postgres redis
```

### Database Commands

```bash
# Run migrations
npm run migrate

# Rollback
npm run migrate:rollback

# Create new migration
npm run migrate:make <name>

# Connect to database
docker exec -it spoonfeeder-db psql -U postgres -d spoonfeeder
```

### Useful Scripts

| Backend | Frontend |
|---------|----------|
| `npm run dev` | `npm run dev` |
| `npm run build` | `npm run build` |
| `npm start` | `npm run preview` |
| `npm run migrate` | `npm run lint` |

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for complete development guide.

---

## 🐛 Debugging

### VS Code Configuration

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
      "console": "integratedTerminal"
    }
  ]
}
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Port 3001 in use | `lsof -i :3001` then `kill -9 <PID>` |
| Database connection failed | `docker-compose restart postgres` |
| ComfyUI not connecting | Verify ComfyUI running on port 8188 |
| Migrations failing | `npm run migrate:rollback` then retry |

---

## 📊 Architecture Highlights

### Dual Storage Pattern

ComfyUI generations store data twice for different purposes:

| Storage | Purpose |
|---------|---------|
| `workflow_json_snapshot` | Exact reproduction |
| `parameters` (JSONB) | Flexible querying |
| Denormalized columns | Fast filtering |

### Task Queue Flow

```
Request → Validate → Queue (Bull) → Process → Store Result → Notify
                         ↓
                    Redis Backend
```

### Real-Time Updates

```
Backend (Socket.io) → WebSocket → Frontend
     ↓
Events: task:progress, generation:completed, etc.
```

---

## 🔐 Security

### API Key Storage
- Encrypted at rest with AES-256-GCM
- Keys masked in API responses (last 4 chars only)
- Stored in `profiles` table

### Planned Features
- JWT authentication
- Role-based access control (RBAC)
- Rate limiting
- Audit logging

---

## 📝 Environment Variables

### Backend (`.env`)

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

# Security
ENCRYPTION_KEY=<32-byte-hex-key>
```

Generate encryption key:
```bash
openssl rand -hex 32
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
```

---

## 📋 Roadmap

### Phase 1: MVP ✅
- [x] Multi-provider chat
- [x] ComfyUI integration
- [x] Task queue system
- [x] Profile management
- [x] Database schema

### Phase 2: Enhancement
- [ ] WebSocket progress updates
- [ ] Batch generation
- [ ] LoRA support
- [ ] ControlNet integration

### Phase 3: Production
- [ ] Authentication (JWT)
- [ ] Rate limiting
- [ ] Docker production builds
- [ ] Monitoring & logging

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Ollama](https://ollama.ai/) - Local LLM runtime
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - Stable Diffusion UI
- [OpenAI](https://openai.com/) - GPT models
- [Anthropic](https://anthropic.com/) - Claude models
- [Google](https://deepmind.google/) - Gemini models

---

<div align="center">

**[Documentation](docs/) · [Report Bug](issues) · [Request Feature](issues)**

Made with ❤️ by the Spoon Feeder Team

</div>
