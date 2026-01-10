# Spoon Feeder Database Documentation

> **Database**: PostgreSQL 16  
> **ORM/Query Builder**: Knex.js  
> **Version**: 1.0 (MVP)  
> **Last Updated**: December 2024  
> **Total Migrations**: 14

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [Entity Relationship Diagram](#entity-relationship-diagram)
- [Tables](#tables)
  - [provider_settings](#provider_settings)
  - [profiles](#profiles)
  - [profile_models](#profile_models)
  - [tasks](#tasks)
  - [results](#results)
  - [conversations](#conversations)
  - [messages](#messages)
  - [comfyui_workflows](#comfyui_workflows)
  - [comfyui_sessions](#comfyui_sessions)
  - [comfyui_generations](#comfyui_generations)
- [Indexes](#indexes)
- [Foreign Key Relationships](#foreign-key-relationships)
- [Data Types & Conventions](#data-types--conventions)
- [Migration History](#migration-history)
- [Common Queries](#common-queries)
- [Maintenance Operations](#maintenance-operations)

---

## Overview

The Spoon Feeder database is designed to support:

1. **Multi-Provider Configuration** — Store API keys and settings for multiple AI providers
2. **Task Management** — Track asynchronous generation tasks through their lifecycle
3. **Conversation History** — Persist chat conversations with LLMs
4. **ComfyUI Integration** — Manage workflows, sessions, and generations with full reproducibility
5. **Audit Trail** — Complete history of all generations with parameter snapshots

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Reproducibility** | Store complete workflow snapshots per generation |
| **Query Efficiency** | Denormalize frequently-queried parameters |
| **Referential Integrity** | Cascading deletes for parent-child relationships |
| **Security** | Encrypt API keys at rest |
| **Flexibility** | JSONB columns for variable parameters |

---

## Quick Reference

### All Tables

| Table | Purpose | Row Estimate |
|-------|---------|--------------|
| `provider_settings` | Legacy API key storage | ~3 |
| `profiles` | Provider connection configs | ~10 |
| `profile_models` | Models per profile | ~50 |
| `tasks` | Async generation tasks | ~1000+ |
| `results` | Task outputs | ~1000+ |
| `conversations` | LLM chat sessions | ~100+ |
| `messages` | Chat messages | ~5000+ |
| `comfyui_workflows` | Workflow templates | ~20 |
| `comfyui_sessions` | Image generation sessions | ~100+ |
| `comfyui_generations` | Individual generations | ~10000+ |

### Truncation Order

When clearing data, respect foreign key constraints:

```
1. comfyui_generations
2. comfyui_sessions
3. comfyui_workflows
4. messages
5. conversations
6. profile_models
7. results
8. tasks
9. profiles
10. provider_settings
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROVIDER CONFIGURATION                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐          ┌───────────────────────┐
│   provider_settings   │          │       profiles        │
├───────────────────────┤          ├───────────────────────┤
│ id (PK)               │          │ id (PK)               │
│ provider (UQ)         │          │ name                  │
│ api_key (encrypted)   │          │ description           │
│ endpoint_url          │          │ type                  │
│ default_model         │          │ provider              │
│ status                │          │ api_key (encrypted)   │
│ last_tested           │          │ url                   │
│ error_message         │          │ options (JSONB)       │
│ created_at            │          │ prompt_template       │
│ updated_at            │          │ input_modalities      │
└───────────────────────┘          │ output_modalities     │
                                   │ created_at            │
                                   │ updated_at            │
                                   └───────────┬───────────┘
                                               │
                         ┌─────────────────────┼─────────────────────┐
                         │                     │                     │
                         ▼                     ▼                     ▼
          ┌───────────────────────┐ ┌───────────────────┐ ┌───────────────────┐
          │    profile_models     │ │ comfyui_workflows │ │  comfyui_sessions │
          ├───────────────────────┤ ├───────────────────┤ ├───────────────────┤
          │ id (PK)               │ │ id (PK)           │ │ id (PK)           │
          │ profile_id (FK)       │ │ profile_id (FK)   │ │ profile_id (FK)   │
          │ model_id              │ │ name              │ │ title             │
          │ name                  │ │ description       │ │ current_workflow  │
          │ input_modalities      │ │ workflow_json     │ │ last_parameters   │
          │ output_modalities     │ │ default_params    │ │ generation_count  │
          │ created_at            │ │ extracted_params  │ │ completed_count   │
          └───────────────────────┘ │ is_default        │ │ failed_count      │
                                   │ generation_count  │ │ created_at        │
                                   │ created_at        │ │ updated_at        │
                                   │ updated_at        │ └─────────┬─────────┘
                                   └─────────┬─────────┘           │
                                             │                     │
                                             └──────────┬──────────┘
                                                        │
                                                        ▼
                                   ┌─────────────────────────────────────────┐
                                   │          comfyui_generations            │
                                   ├─────────────────────────────────────────┤
                                   │ id (PK)                                 │
                                   │ session_id (FK)                         │
                                   │ workflow_id (FK, nullable)              │
                                   │ prompt_id                               │
                                   │ workflow_json_snapshot                  │
                                   │ prompt_text                             │
                                   │ negative_prompt                         │
                                   │ parameters (JSONB)                      │
                                   │ width, height, steps, cfg_scale, seed   │
                                   │ sampler_name, scheduler, batch_size     │
                                   │ checkpoint_name, loras_used             │
                                   │ status, outputs, error                  │
                                   │ generation_time_seconds                 │
                                   │ batch_index                             │
                                   │ created_at, completed_at                │
                                   └─────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              TASK MANAGEMENT                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐          ┌───────────────────────┐
│        tasks          │          │       results         │
├───────────────────────┤          ├───────────────────────┤
│ id (PK)               │ 1────1   │ id (PK)               │
│ name                  │─────────▶│ task_id (FK, UQ)      │
│ type                  │          │ type                  │
│ provider              │          │ content               │
│ prompt                │          │ metadata (JSONB)      │
│ options (JSONB)       │          │ created_at            │
│ status                │          │ updated_at            │
│ progress              │          └───────────────────────┘
│ error                 │
│ created_at            │
│ updated_at            │
│ completed_at          │
└───────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHAT CONVERSATIONS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐          ┌───────────────────────┐
│    conversations      │          │       messages        │
├───────────────────────┤          ├───────────────────────┤
│ id (PK)               │ 1────N   │ id (PK)               │
│ title                 │─────────▶│ conversation_id (FK)  │
│ provider              │          │ role                  │
│ model                 │          │ content               │
│ created_at            │          │ created_at            │
│ updated_at            │          └───────────────────────┘
└───────────────────────┘
```

---

## Tables

---

### provider_settings

Legacy table for storing provider API keys directly. Consider using `profiles` for new implementations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `provider` | varchar | No | - | Provider name (unique): `openai`, `gemini`, `claude` |
| `api_key` | text | No | - | Encrypted API key |
| `endpoint_url` | varchar | Yes | null | Custom endpoint URL |
| `default_model` | varchar | Yes | null | Preferred model |
| `last_tested` | timestamp | Yes | null | Last connection test |
| `status` | varchar | Yes | `'unknown'` | Connection status |
| `error_message` | text | Yes | null | Last error message |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

**Constraints**
- Primary Key: `id`
- Unique: `provider`

**Notes**
- API keys are AES-256-GCM encrypted at rest
- Status values: `connected`, `disconnected`, `error`, `unknown`

---

### profiles

Provider connection configurations with support for multiple instances of the same provider.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | varchar(255) | No | - | Display name |
| `description` | text | Yes | null | Profile description |
| `type` | varchar(50) | No | - | Content type: `text`, `image`, `video`, `audio` |
| `provider` | varchar(50) | No | - | Provider: `ollama`, `openai`, `gemini`, `claude`, `comfyui` |
| `api_key` | text | Yes | null | Encrypted API key |
| `url` | varchar(500) | Yes | null | Custom endpoint URL |
| `options` | jsonb | Yes | null | Provider-specific options |
| `prompt_template` | text | Yes | null | Default system prompt |
| `input_modalities` | text | Yes | `'["text"]'` | JSON array of input types |
| `output_modalities` | text | Yes | `'["text"]'` | JSON array of output types |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

**Example Options JSONB**
```json
{
  "temperature": 0.7,
  "max_tokens": 4096,
  "top_p": 0.9
}
```

**Example Modalities**
```json
["text", "image"]
```

---

### profile_models

Models associated with each profile. Enables multiple models per provider connection.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `profile_id` | uuid | No | - | Foreign key to profiles |
| `model_id` | varchar(255) | No | - | Model identifier (e.g., `gpt-4o`) |
| `name` | varchar(255) | Yes | null | Display name |
| `input_modalities` | text | Yes | `'["text"]'` | JSON array of input types |
| `output_modalities` | text | Yes | `'["text"]'` | JSON array of output types |
| `created_at` | timestamp | No | `now()` | Record creation time |

**Constraints**
- Primary Key: `id`
- Foreign Key: `profile_id` → `profiles(id)` ON DELETE CASCADE
- Unique: `(profile_id, model_id)`

---

### tasks

Asynchronous generation tasks queued for processing.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | varchar(255) | No | - | Task display name |
| `type` | varchar(50) | No | - | Content type: `text`, `image`, `video`, `audio` |
| `provider` | varchar(50) | No | - | Target provider |
| `prompt` | text | No | - | Generation prompt |
| `options` | jsonb | Yes | null | Provider-specific options |
| `status` | varchar(20) | No | `'pending'` | Task status |
| `progress` | integer | No | `0` | Progress percentage (0-100) |
| `error` | text | Yes | null | Error message if failed |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |
| `completed_at` | timestamp | Yes | null | Completion timestamp |

**Status Values**
| Status | Description |
|--------|-------------|
| `pending` | Queued, waiting to process |
| `running` | Currently processing |
| `complete` | Successfully completed |
| `failed` | Processing failed |

**Indexes**
- `idx_tasks_status` on `status`
- `idx_tasks_type` on `type`
- `idx_tasks_provider` on `provider`
- `idx_tasks_created_at` on `created_at`

---

### results

Outputs from completed tasks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `task_id` | uuid | No | - | Foreign key to tasks (unique) |
| `type` | varchar(50) | No | - | Content type |
| `content` | text | No | - | Generated content or file path |
| `metadata` | jsonb | Yes | null | Additional metadata |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

**Constraints**
- Primary Key: `id`
- Foreign Key: `task_id` → `tasks(id)` ON DELETE CASCADE
- Unique: `task_id`

**Example Metadata JSONB**
```json
{
  "model": "gpt-4o",
  "tokens": 1523,
  "duration_ms": 2340,
  "finish_reason": "stop"
}
```

---

### conversations

LLM chat conversation sessions.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `title` | varchar(255) | No | - | Conversation title |
| `provider` | varchar(50) | No | - | LLM provider |
| `model` | varchar(255) | No | - | Model used |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

---

### messages

Individual messages within conversations.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `conversation_id` | uuid | No | - | Foreign key to conversations |
| `role` | enum | No | - | Message role: `user`, `assistant`, `system` |
| `content` | text | No | - | Message content |
| `created_at` | timestamp | No | `now()` | Record creation time |

**Constraints**
- Primary Key: `id`
- Foreign Key: `conversation_id` → `conversations(id)` ON DELETE CASCADE

**Indexes**
- `idx_messages_conversation_id` on `conversation_id`

---

### comfyui_workflows

ComfyUI workflow templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `profile_id` | uuid | Yes | null | Foreign key to profiles |
| `name` | varchar(255) | No | - | Workflow name |
| `description` | text | Yes | null | Workflow description |
| `workflow_json` | text | No | - | Complete ComfyUI workflow JSON |
| `default_parameters` | jsonb | Yes | `'{}'` | Default parameter values |
| `extracted_parameters` | jsonb | Yes | `'[]'` | Cached parameter definitions |
| `thumbnail_url` | varchar(500) | Yes | null | Preview image URL |
| `is_default` | boolean | No | `false` | Default workflow for profile |
| `generation_count` | integer | No | `0` | Total generations using this workflow |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

**Constraints**
- Primary Key: `id`
- Foreign Key: `profile_id` → `profiles(id)` ON DELETE CASCADE

**Example default_parameters JSONB**
```json
{
  "steps": 25,
  "cfg_scale": 7,
  "sampler_name": "dpmpp_2m",
  "scheduler": "karras"
}
```

**Example extracted_parameters JSONB**
```json
[
  {
    "nodeId": "3",
    "field": "seed",
    "label": "Seed",
    "type": "seed",
    "value": 0,
    "min": 0,
    "max": 2147483647
  },
  {
    "nodeId": "3",
    "field": "steps",
    "label": "Steps",
    "type": "number",
    "value": 20,
    "min": 1,
    "max": 150
  }
]
```

---

### comfyui_sessions

Image generation sessions (analogous to conversations for LLMs).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `profile_id` | uuid | Yes | null | Foreign key to profiles |
| `title` | varchar(255) | No | - | Session title |
| `current_workflow_id` | uuid | Yes | null | Currently selected workflow |
| `last_parameters` | jsonb | Yes | `'{}'` | Last used parameters |
| `generation_count` | integer | No | `0` | Total generations |
| `completed_count` | integer | No | `0` | Successful generations |
| `failed_count` | integer | No | `0` | Failed generations |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `updated_at` | timestamp | No | `now()` | Last update time |

**Constraints**
- Primary Key: `id`
- Foreign Key: `profile_id` → `profiles(id)` ON DELETE CASCADE
- Foreign Key: `current_workflow_id` → `comfyui_workflows(id)` ON DELETE SET NULL

**Example last_parameters JSONB**
```json
{
  "width": 1024,
  "height": 1024,
  "steps": 25,
  "cfg_scale": 7,
  "seed": 12345678,
  "sampler_name": "dpmpp_2m",
  "scheduler": "karras",
  "checkpoint_name": "juggernautXL_v9.safetensors"
}
```

---

### comfyui_generations

Individual image generations with complete parameter history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `session_id` | uuid | Yes | null | Foreign key to sessions |
| `workflow_id` | uuid | Yes | null | Foreign key to workflows |
| `prompt_id` | varchar(255) | Yes | null | ComfyUI's prompt tracking ID |
| `workflow_json_snapshot` | text | Yes | null | Complete workflow at generation time |
| `prompt_text` | text | Yes | null | Positive prompt |
| `negative_prompt` | text | Yes | null | Negative prompt |
| `parameters` | jsonb | Yes | `'{}'` | All parameters as JSON |
| `width` | integer | Yes | null | Image width |
| `height` | integer | Yes | null | Image height |
| `steps` | integer | Yes | null | Sampling steps |
| `cfg_scale` | float | Yes | null | CFG scale value |
| `seed` | bigint | Yes | null | Random seed (resolved) |
| `sampler_name` | varchar(50) | Yes | null | Sampler algorithm |
| `scheduler` | varchar(50) | Yes | null | Noise scheduler |
| `batch_size` | integer | No | `1` | Number of images |
| `checkpoint_name` | varchar(255) | Yes | null | Model checkpoint file |
| `loras_used` | jsonb | Yes | `'[]'` | LoRA configurations |
| `outputs` | text | Yes | null | JSON array of output files |
| `status` | varchar(20) | No | `'pending'` | Generation status |
| `error` | text | Yes | null | Error message if failed |
| `generation_time_seconds` | float | Yes | null | Processing duration |
| `batch_index` | integer | No | `0` | Index within batch |
| `created_at` | timestamp | No | `now()` | Record creation time |
| `completed_at` | timestamp | Yes | null | Completion timestamp |

**Constraints**
- Primary Key: `id`
- Foreign Key: `session_id` → `comfyui_sessions(id)` ON DELETE CASCADE
- Foreign Key: `workflow_id` → `comfyui_workflows(id)` ON DELETE CASCADE

**Indexes**
- `idx_comfyui_generations_seed` on `seed`
- `idx_comfyui_generations_checkpoint` on `checkpoint_name`
- `idx_comfyui_generations_session_created` on `(session_id, created_at)`

**Example outputs (stored as text, parsed as JSON)**
```json
[
  {
    "filename": "ComfyUI_00042_.png",
    "subfolder": "",
    "type": "output"
  }
]
```

**Example loras_used JSONB**
```json
[
  {
    "name": "detail_enhancer_xl.safetensors",
    "strength": 0.8
  }
]
```

### Dual Storage Pattern

The `comfyui_generations` table implements a dual storage pattern:

| Storage Type | Columns | Purpose |
|--------------|---------|---------|
| **Complete Snapshot** | `workflow_json_snapshot`, `parameters` | Exact reproduction of any generation |
| **Denormalized** | `width`, `height`, `steps`, `seed`, etc. | Fast querying and filtering |

This allows both:
1. **Reproduction**: Reload exact workflow from `workflow_json_snapshot`
2. **Analytics**: Query patterns like "all 1024x1024 images" or "average steps used"

---

## Indexes

### Explicit Indexes

| Table | Index Name | Columns | Purpose |
|-------|------------|---------|---------|
| `tasks` | `idx_tasks_status` | `status` | Filter by status |
| `tasks` | `idx_tasks_type` | `type` | Filter by content type |
| `tasks` | `idx_tasks_provider` | `provider` | Filter by provider |
| `tasks` | `idx_tasks_created_at` | `created_at` | Sort by date |
| `messages` | `idx_messages_conversation_id` | `conversation_id` | Lookup messages |
| `comfyui_generations` | `idx_generations_seed` | `seed` | Find by seed |
| `comfyui_generations` | `idx_generations_checkpoint` | `checkpoint_name` | Filter by model |
| `comfyui_generations` | `idx_generations_session_created` | `session_id, created_at` | Session history |

### Implicit Indexes

PostgreSQL automatically creates indexes for:
- All primary keys (`id` columns)
- All unique constraints
- Foreign key references (recommended to add manually for performance)

---

## Foreign Key Relationships

| Parent Table | Child Table | FK Column | On Delete |
|--------------|-------------|-----------|-----------|
| `profiles` | `profile_models` | `profile_id` | CASCADE |
| `profiles` | `comfyui_workflows` | `profile_id` | CASCADE |
| `profiles` | `comfyui_sessions` | `profile_id` | CASCADE |
| `comfyui_workflows` | `comfyui_sessions` | `current_workflow_id` | SET NULL |
| `comfyui_sessions` | `comfyui_generations` | `session_id` | CASCADE |
| `comfyui_workflows` | `comfyui_generations` | `workflow_id` | CASCADE |
| `tasks` | `results` | `task_id` | CASCADE |
| `conversations` | `messages` | `conversation_id` | CASCADE |

---

## Data Types & Conventions

### UUID Generation

All primary keys use PostgreSQL's `gen_random_uuid()`:

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### Timestamps

All tables include timestamp columns:

```sql
created_at TIMESTAMP DEFAULT now()
updated_at TIMESTAMP DEFAULT now()
```

### JSONB vs TEXT for JSON

| Column | Type | Reason |
|--------|------|--------|
| `options` | jsonb | Frequently queried, needs indexing |
| `parameters` | jsonb | Frequently queried, needs indexing |
| `workflow_json` | text | Large, rarely queried directly |
| `workflow_json_snapshot` | text | Large, read-only archive |
| `outputs` | text | Simple array, rarely filtered |

### Encryption

API keys are encrypted using AES-256-GCM:

```typescript
// Encryption format: iv:authTag:encrypted
const encrypted = `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
```

---

## Migration History

| # | Migration | Description | Date |
|---|-----------|-------------|------|
| 001 | `001_provider_settings.ts` | Initial provider settings table | Dec 2024 |
| 002 | `002_tasks.ts` | Tasks table with indexes | Dec 2024 |
| 003 | `003_results.ts` | Results table | Dec 2024 |
| 004 | `004_profiles.ts` | Profiles table | Dec 2024 |
| 005 | `005_conversations.ts` | Conversations & messages tables | Dec 2024 |
| 006 | `006_profiles_api_key.ts` | Add api_key to profiles | Dec 2024 |
| 007 | `007_add_profile_model.ts` | Add model to profiles | Dec 2024 |
| 008 | `008_remove_profile_model.ts` | Remove model from profiles | Dec 2024 |
| 009 | `009_profile_models.ts` | Create profile_models table | Dec 2024 |
| 010 | `010_profile_models_modalities.ts` | Add modalities to profile_models | Dec 2024 |
| 011 | `011_comfyui.ts` | ComfyUI workflows & generations | Dec 2024 |
| 012 | `012_profiles_modalities.ts` | Add modalities to profiles | Dec 2024 |
| 013 | `013_comfyui_sessions.ts` | ComfyUI sessions table | Dec 2024 |
| 014 | `014_comfyui_generation_details.ts` | Enhanced generation parameters | Dec 2024 |

### Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name
```

---

## Common Queries

### Get All Sessions with Generation Counts

```sql
SELECT 
  s.id,
  s.title,
  p.name as profile_name,
  s.generation_count,
  s.completed_count,
  s.failed_count,
  s.updated_at
FROM comfyui_sessions s
LEFT JOIN profiles p ON s.profile_id = p.id
ORDER BY s.updated_at DESC;
```

### Get Generations for a Session

```sql
SELECT 
  id,
  prompt_text,
  width,
  height,
  steps,
  cfg_scale,
  seed,
  sampler_name,
  status,
  outputs,
  created_at
FROM comfyui_generations
WHERE session_id = $1
ORDER BY created_at DESC
LIMIT 50;
```

### Find Generations by Seed

```sql
SELECT 
  g.*,
  s.title as session_title
FROM comfyui_generations g
LEFT JOIN comfyui_sessions s ON g.session_id = s.id
WHERE g.seed = $1
ORDER BY g.created_at DESC;
```

### Get Generation with Full Workflow (for Reproduction)

```sql
SELECT 
  workflow_json_snapshot,
  parameters,
  prompt_text,
  negative_prompt
FROM comfyui_generations
WHERE id = $1;
```

### Task Statistics by Provider

```sql
SELECT 
  provider,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM tasks
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider, status
ORDER BY provider, status;
```

### Recent Conversations with Message Counts

```sql
SELECT 
  c.id,
  c.title,
  c.provider,
  c.model,
  COUNT(m.id) as message_count,
  c.updated_at
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id
ORDER BY c.updated_at DESC
LIMIT 20;
```

---

## Maintenance Operations

### Truncate Single Table

```sql
TRUNCATE TABLE comfyui_generations CASCADE;
```

### Truncate All Tables (Respecting FK Order)

```sql
TRUNCATE TABLE 
  comfyui_generations,
  comfyui_sessions,
  comfyui_workflows,
  messages,
  conversations,
  profile_models,
  results,
  tasks,
  profiles,
  provider_settings
CASCADE;
```

### Export Table to JSON

```sql
COPY (
  SELECT row_to_json(t)
  FROM (SELECT * FROM profiles) t
) TO '/tmp/profiles_export.json';
```

### Vacuum and Analyze

```sql
-- Reclaim space and update statistics
VACUUM ANALYZE comfyui_generations;

-- Full vacuum (locks table, use during maintenance)
VACUUM FULL comfyui_generations;
```

### Check Table Sizes

```sql
SELECT 
  relname as table_name,
  pg_size_pretty(pg_total_relation_size(relid)) as total_size,
  pg_size_pretty(pg_relation_size(relid)) as table_size,
  pg_size_pretty(pg_indexes_size(relid)) as index_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Find Orphaned Records

```sql
-- Generations without sessions
SELECT id, prompt_text, created_at
FROM comfyui_generations
WHERE session_id IS NULL
  AND workflow_id IS NULL;

-- Results without tasks
SELECT r.id
FROM results r
LEFT JOIN tasks t ON r.task_id = t.id
WHERE t.id IS NULL;
```

---

## Connection Configuration

### Knex Configuration

```typescript
// src/db/knexfile.ts
const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'spoonfeeder',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    directory: './migrations',
    extension: 'ts',
  },
};
```

### Docker Connection

```yaml
# docker-compose.yml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
    POSTGRES_DB: spoonfeeder
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

---

## Backup & Recovery

### Create Backup

```bash
# Full database backup
docker exec spoonfeeder-db pg_dump -U postgres spoonfeeder > backup.sql

# Compressed backup
docker exec spoonfeeder-db pg_dump -U postgres -Fc spoonfeeder > backup.dump
```

### Restore Backup

```bash
# From SQL file
docker exec -i spoonfeeder-db psql -U postgres spoonfeeder < backup.sql

# From compressed dump
docker exec -i spoonfeeder-db pg_restore -U postgres -d spoonfeeder < backup.dump
```

### Backup Specific Tables

```bash
docker exec spoonfeeder-db pg_dump -U postgres -t comfyui_generations spoonfeeder > generations_backup.sql
```
