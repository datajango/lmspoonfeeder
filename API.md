# Spoon Feeder API Reference

> **Base URL**: `http://localhost:3001/api`  
> **Version**: 1.0 (MVP)  
> **Last Updated**: December 2024

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Models](#models)
  - [Settings](#settings)
  - [Profiles](#profiles)
  - [Chat](#chat)
  - [Tasks](#tasks)
  - [Results](#results)
  - [ComfyUI](#comfyui)
  - [Database](#database)
- [WebSocket Events](#websocket-events)

---

## Overview

The Spoon Feeder API provides a unified interface for orchestrating AI content generation across multiple providers including Ollama, OpenAI, Gemini, Claude, and ComfyUI.

### Base Configuration

```bash
# Development
API_URL=http://localhost:3001/api

# Environment Variables
PORT=3001
DB_HOST=localhost
DB_PORT=5432
REDIS_HOST=localhost
REDIS_PORT=6379
OLLAMA_URL=http://localhost:11434
COMFYUI_URL=http://localhost:8188
```

---

## Authentication

> **Note**: The MVP does not include authentication. All endpoints are publicly accessible. Authentication will be added in a future release.

### Planned Authentication (Future)

```http
Authorization: Bearer <jwt_token>
```

---

## Response Format

All API responses follow a consistent JSON structure.

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Success Response (Array)

```json
{
  "success": true,
  "data": [ ... ]
}
```

### Success Response (Paginated)

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Success Response (Message Only)

```json
{
  "success": true,
  "message": "Operation completed successfully"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |
| 503 | Service Unavailable | External service unavailable |

### Error Types

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid input or parameters |
| `NOT_FOUND` | 404 | Resource does not exist |
| `PROVIDER_CONNECTION_ERROR` | 503 | Cannot connect to external service |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Example Error Responses

**Bad Request**
```json
{
  "success": false,
  "error": "apiKey is required",
  "statusCode": 400
}
```

**Not Found**
```json
{
  "success": false,
  "error": "Profile abc123 not found",
  "statusCode": 404
}
```

**Provider Connection Error**
```json
{
  "success": false,
  "error": "Cannot connect to ComfyUI. Is it running?",
  "statusCode": 503
}
```

---

## Endpoints

---

## Health

### Check System Health

Verify the API server is running and check external service connectivity.

```http
GET /health
```

**Response**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-12-14T10:30:00.000Z",
    "services": {
      "database": "connected",
      "redis": "connected",
      "ollama": "connected",
      "comfyui": "connected"
    }
  }
}
```

---

## Models

Manage Ollama models for local LLM inference.

### List All Models

Get all available models across configured profiles.

```http
GET /models
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "name": "llama3:latest",
      "size": "4.7 GB",
      "loaded": false,
      "capabilities": ["chat", "text"],
      "description": "Local Ollama (ollama)",
      "parameters": "llama3:latest"
    },
    {
      "name": "gpt-4o-mini",
      "size": "",
      "loaded": false,
      "capabilities": ["chat", "text", "vision"],
      "description": "OpenAI Production (openai)",
      "parameters": "gpt-4o-mini"
    }
  ]
}
```

---

### Get Model Info

Get detailed information about a specific Ollama model.

```http
GET /models/:name
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Model name (URL encoded) |

**Example Request**
```http
GET /models/llama3:latest
```

**Response**
```json
{
  "success": true,
  "data": {
    "name": "llama3:latest",
    "size": "4.7 GB",
    "loaded": false,
    "capabilities": ["chat", "text"],
    "description": "Meta's Llama 3 8B model",
    "parameters": "temperature=0.7, top_p=0.9",
    "template": "{{ .System }}\n\n{{ .Prompt }}"
  }
}
```

---

### Load Model

Load an Ollama model into memory.

```http
POST /models/:name/load
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Model name to load |

**Response**
```json
{
  "success": true,
  "message": "Model llama3:latest loaded successfully"
}
```

---

### Unload Model

Unload an Ollama model from memory.

```http
POST /models/:name/unload
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | string | Model name to unload |

**Response**
```json
{
  "success": true,
  "message": "Model llama3:latest unloaded successfully"
}
```

---

### Get Model Status

Check if a specific model is currently loaded.

```http
GET /models/:name/status
```

**Response**
```json
{
  "success": true,
  "data": {
    "name": "llama3:latest",
    "loaded": true,
    "lastUsed": "2024-12-14T10:25:00.000Z"
  }
}
```

---

## Settings

Manage provider settings (legacy endpoint for direct API key storage).

### List All Provider Settings

```http
GET /settings
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "provider": "openai",
      "apiKey": "sk-...7890",
      "endpointUrl": null,
      "defaultModel": "gpt-4o",
      "lastTested": "2024-12-14T09:00:00.000Z",
      "status": "connected",
      "errorMessage": null,
      "createdAt": "2024-12-01T00:00:00.000Z",
      "updatedAt": "2024-12-14T09:00:00.000Z"
    }
  ]
}
```

> **Note**: API keys are masked in responses, showing only the last 4 characters.

---

### Get Provider Settings

```http
GET /settings/:provider
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | string | Provider name: `openai`, `gemini`, or `claude` |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "provider": "openai",
    "apiKey": "sk-...7890",
    "endpointUrl": null,
    "defaultModel": "gpt-4o",
    "lastTested": "2024-12-14T09:00:00.000Z",
    "status": "connected",
    "errorMessage": null
  }
}
```

---

### Update Provider Settings

```http
PUT /settings/:provider
```

**Path Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | string | Provider name: `openai`, `gemini`, or `claude` |

**Request Body**
```json
{
  "apiKey": "sk-...",
  "endpointUrl": "https://api.openai.com/v1",
  "defaultModel": "gpt-4o"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiKey` | string | Yes | Provider API key |
| `endpointUrl` | string | No | Custom endpoint URL |
| `defaultModel` | string | No | Default model to use |

**Response**
```json
{
  "success": true,
  "message": "Settings for openai updated"
}
```

---

### Test Provider Connection

```http
POST /settings/:provider/test
```

**Response (Success)**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "latency": 234,
    "model": "gpt-4o"
  }
}
```

**Response (Failure)**
```json
{
  "success": true,
  "data": {
    "connected": false,
    "error": "Invalid API key"
  }
}
```

---

### Delete Provider Settings

```http
DELETE /settings/:provider
```

**Response**
```json
{
  "success": true,
  "message": "Settings for openai deleted"
}
```

---

## Profiles

Profiles represent configured connections to AI providers. Each profile stores connection details, API keys, and default options.

### List All Profiles

```http
GET /profiles
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `provider` | string | Filter by provider (optional) |

**Example Request**
```http
GET /profiles?provider=comfyui
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Local ComfyUI",
      "description": "Local Stable Diffusion setup",
      "type": "image",
      "provider": "comfyui",
      "api_key": null,
      "url": "http://localhost:8188",
      "options": { "default_steps": 20 },
      "prompt_template": null,
      "input_modalities": ["text"],
      "output_modalities": ["image"],
      "created_at": "2024-12-01T00:00:00.000Z",
      "updated_at": "2024-12-10T00:00:00.000Z"
    }
  ]
}
```

---

### Create Profile

```http
POST /profiles
```

**Request Body**
```json
{
  "name": "OpenAI Production",
  "description": "Production OpenAI account",
  "type": "text",
  "provider": "openai",
  "apiKey": "sk-...",
  "url": null,
  "options": {
    "temperature": 0.7,
    "max_tokens": 4096
  },
  "promptTemplate": "You are a helpful assistant.",
  "inputModalities": ["text"],
  "outputModalities": ["text"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name |
| `description` | string | No | Profile description |
| `type` | string | Yes | `text`, `image`, `video`, or `audio` |
| `provider` | string | Yes | `ollama`, `openai`, `gemini`, `claude`, or `comfyui` |
| `apiKey` | string | No | Provider API key (encrypted at rest) |
| `url` | string | No | Custom endpoint URL |
| `options` | object | No | Provider-specific options |
| `promptTemplate` | string | No | Default system prompt |
| `inputModalities` | array | No | Input types: `["text"]`, `["text", "image"]` |
| `outputModalities` | array | No | Output types: `["text"]`, `["image"]` |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "OpenAI Production",
    "provider": "openai",
    "...": "..."
  }
}
```

---

### Get Profile

```http
GET /profiles/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "OpenAI Production",
    "description": "Production OpenAI account",
    "type": "text",
    "provider": "openai",
    "api_key": "sk-...7890",
    "url": null,
    "options": { "temperature": 0.7 },
    "prompt_template": "You are a helpful assistant.",
    "input_modalities": ["text"],
    "output_modalities": ["text"],
    "created_at": "2024-12-01T00:00:00.000Z",
    "updated_at": "2024-12-10T00:00:00.000Z"
  }
}
```

---

### Update Profile

```http
PUT /profiles/:id
```

**Request Body** (partial updates allowed)
```json
{
  "name": "OpenAI Production v2",
  "options": {
    "temperature": 0.8
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "OpenAI Production v2",
    "...": "..."
  }
}
```

---

### Delete Profile

```http
DELETE /profiles/:id
```

**Response**
```json
{
  "success": true,
  "message": "Profile deleted"
}
```

---

### List Profile Models

Get models associated with a profile.

```http
GET /profiles/:id/models
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "profile_id": "profile-uuid",
      "model_id": "gpt-4o",
      "name": "GPT-4 Omni",
      "created_at": "2024-12-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "profile_id": "profile-uuid",
      "model_id": "gpt-4o-mini",
      "name": "GPT-4 Omni Mini",
      "created_at": "2024-12-01T00:00:00.000Z"
    }
  ]
}
```

---

### Add Model to Profile

```http
POST /profiles/:id/models
```

**Request Body**
```json
{
  "modelId": "gpt-4-turbo",
  "name": "GPT-4 Turbo"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "profile_id": "profile-uuid",
    "model_id": "gpt-4-turbo",
    "name": "GPT-4 Turbo"
  }
}
```

---

### Delete Model from Profile

```http
DELETE /profiles/:id/models/:modelId
```

**Response**
```json
{
  "success": true,
  "message": "Model removed from profile"
}
```

---

### Sync Models

Automatically discover and sync available models from a provider.

```http
POST /profiles/:id/models/sync
```

**Response**
```json
{
  "success": true,
  "data": {
    "added": 3,
    "removed": 1,
    "models": ["llama3:latest", "mistral:latest", "codellama:latest"]
  }
}
```

---

### Test Profile Connection

Test connectivity without saving.

```http
POST /profiles/test-connection
```

**Request Body**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "url": null
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "latency": 189,
    "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"]
  }
}
```

---

## Chat

Send messages to any configured LLM provider.

### Send Chat Message

```http
POST /chat
```

**Request Body**
```json
{
  "provider": "openai",
  "model": "gpt-4o-mini",
  "profileId": "profile-uuid",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | string | Yes | `ollama`, `openai`, `gemini`, or `claude` |
| `model` | string | No | Specific model (uses default if omitted) |
| `profileId` | string | No | Profile ID for API key lookup |
| `messages` | array | Yes | Conversation messages |

**Message Object**
| Field | Type | Description |
|-------|------|-------------|
| `role` | string | `system`, `user`, or `assistant` |
| `content` | string | Message content |

**Response**
```json
{
  "success": true,
  "data": {
    "response": "The capital of France is Paris.",
    "provider": "openai",
    "model": "gpt-4o-mini",
    "usage": {
      "prompt_tokens": 25,
      "completion_tokens": 8,
      "total_tokens": 33
    }
  }
}
```

---

## Tasks

Create and manage asynchronous generation tasks.

### List Tasks

```http
GET /tasks
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `pending`, `running`, `complete`, `failed` |
| `provider` | string | Filter by provider |
| `type` | string | Filter: `text`, `image`, `video`, `audio` |
| `limit` | number | Results per page (default: 20) |
| `offset` | number | Pagination offset |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "name": "Blog Post Generation",
      "type": "text",
      "provider": "openai",
      "prompt": "Write a blog post about AI",
      "options": { "temperature": 0.7 },
      "status": "complete",
      "error": null,
      "created_at": "2024-12-14T10:00:00.000Z",
      "completed_at": "2024-12-14T10:00:05.000Z"
    }
  ]
}
```

---

### Create Task

```http
POST /tasks
```

**Request Body**
```json
{
  "name": "Product Description",
  "type": "text",
  "provider": "claude",
  "prompt": "Write a product description for a smart water bottle",
  "options": {
    "model": "claude-3-haiku-20240307",
    "max_tokens": 500
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Task display name |
| `type` | string | Yes | `text`, `image`, `video`, `audio` |
| `provider` | string | Yes | Target provider |
| `prompt` | string | Yes | Generation prompt |
| `options` | object | No | Provider-specific options |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "name": "Product Description",
    "status": "pending",
    "created_at": "2024-12-14T10:30:00.000Z"
  }
}
```

---

### Get Task

```http
GET /tasks/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "name": "Product Description",
    "type": "text",
    "provider": "claude",
    "prompt": "Write a product description...",
    "options": { "model": "claude-3-haiku-20240307" },
    "status": "complete",
    "error": null,
    "created_at": "2024-12-14T10:30:00.000Z",
    "completed_at": "2024-12-14T10:30:03.000Z"
  }
}
```

---

### Delete Task

Cancel a pending task or delete a completed task.

```http
DELETE /tasks/:id
```

**Response**
```json
{
  "success": true,
  "message": "Task deleted"
}
```

---

### Retry Failed Task

Re-queue a failed task for processing.

```http
POST /tasks/:id/retry
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "status": "pending",
    "retryCount": 1
  }
}
```

---

### Get Task History

```http
GET /tasks/history
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `dateFrom` | ISO date | Filter from date |
| `dateTo` | ISO date | Filter to date |
| `provider` | string | Filter by provider |
| `type` | string | Filter by type |
| `status` | string | Filter by status |
| `search` | string | Search in name/prompt |
| `page` | number | Page number |
| `limit` | number | Results per page |

**Response**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

---

### Export Task History

```http
GET /tasks/history/export
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | `csv` or `json` |
| `dateFrom` | ISO date | Filter from date |
| `dateTo` | ISO date | Filter to date |

**Response (JSON)**
```json
{
  "success": true,
  "data": {
    "filename": "tasks_export_2024-12-14.json",
    "content": [...]
  }
}
```

**Response (CSV)**
Returns file download with `Content-Type: text/csv`

---

## Results

Access completed task results and generated media.

### List Results

```http
GET /results
```

**Query Parameters**
| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Filter: `text`, `image`, `video`, `audio` |
| `limit` | number | Results per page |
| `offset` | number | Pagination offset |

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "result-uuid",
      "task_id": "task-uuid",
      "type": "text",
      "content": "Generated content here...",
      "metadata": {
        "model": "gpt-4o",
        "tokens": 150,
        "duration_ms": 2340
      },
      "created_at": "2024-12-14T10:30:03.000Z"
    }
  ]
}
```

---

### Get Result

```http
GET /results/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "result-uuid",
    "task_id": "task-uuid",
    "type": "image",
    "content": "/storage/media/image_abc123.png",
    "metadata": {
      "width": 1024,
      "height": 1024,
      "model": "dall-e-3"
    },
    "created_at": "2024-12-14T10:30:03.000Z"
  }
}
```

---

### Download Result

```http
GET /results/:id/download
```

**Response**
Binary file download with appropriate `Content-Type` header.

---

### Delete Result

```http
DELETE /results/:id
```

**Response**
```json
{
  "success": true,
  "message": "Result deleted"
}
```

---

## ComfyUI

Manage ComfyUI workflows, sessions, and image generations.

### Get Options

Get available samplers, schedulers, checkpoints, and LoRAs from ComfyUI.

```http
GET /comfyui/options
```

**Response**
```json
{
  "success": true,
  "data": {
    "samplers": [
      "euler", "euler_ancestral", "heun", "heunpp2",
      "dpm_2", "dpm_2_ancestral", "lms", "dpm_fast",
      "dpm_adaptive", "dpmpp_2s_ancestral", "dpmpp_sde",
      "dpmpp_sde_gpu", "dpmpp_2m", "dpmpp_2m_sde",
      "dpmpp_2m_sde_gpu", "dpmpp_3m_sde", "dpmpp_3m_sde_gpu",
      "ddpm", "lcm", "ddim", "uni_pc", "uni_pc_bh2"
    ],
    "schedulers": [
      "normal", "karras", "exponential", "sgm_uniform",
      "simple", "ddim_uniform", "beta"
    ],
    "dimensions": [512, 768, 832, 896, 1024, 1152, 1216, 1344, 1536],
    "checkpoints": [
      "sd_xl_base_1.0.safetensors",
      "juggernautXL_v9Rdphoto2Lightning.safetensors"
    ],
    "loras": [
      "detail_enhancer_xl.safetensors",
      "anime_style_xl.safetensors"
    ]
  }
}
```

---

### Sessions

Sessions group related image generations, similar to chat conversations.

#### List Sessions

```http
GET /comfyui/sessions
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "profile_id": "profile-uuid",
      "profile_name": "Local ComfyUI",
      "profile_url": "http://localhost:8188",
      "title": "Landscape Concepts",
      "current_workflow_id": "workflow-uuid",
      "last_parameters": { "steps": 25, "cfg_scale": 7 },
      "generation_count": 15,
      "completed_count": 14,
      "failed_count": 1,
      "created_at": "2024-12-14T08:00:00.000Z",
      "updated_at": "2024-12-14T10:30:00.000Z"
    }
  ]
}
```

---

#### Create Session

```http
POST /comfyui/sessions
```

**Request Body**
```json
{
  "profileId": "profile-uuid",
  "title": "Character Designs"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "new-session-uuid",
    "profile_id": "profile-uuid",
    "title": "Character Designs",
    "generation_count": 0,
    "created_at": "2024-12-14T10:35:00.000Z"
  }
}
```

---

#### Get Session

Get session details with recent generations.

```http
GET /comfyui/sessions/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "profile_id": "profile-uuid",
    "profile_name": "Local ComfyUI",
    "profile_url": "http://localhost:8188",
    "title": "Landscape Concepts",
    "current_workflow_id": "workflow-uuid",
    "last_parameters": { "steps": 25 },
    "generation_count": 15,
    "created_at": "2024-12-14T08:00:00.000Z",
    "generations": [
      {
        "id": "gen-uuid",
        "prompt_text": "A serene mountain landscape",
        "negative_prompt": "blurry, low quality",
        "width": 1024,
        "height": 1024,
        "steps": 25,
        "cfg_scale": 7,
        "seed": 12345678,
        "status": "complete",
        "outputs": [
          { "filename": "ComfyUI_00001_.png", "subfolder": "" }
        ],
        "created_at": "2024-12-14T10:30:00.000Z"
      }
    ]
  }
}
```

---

#### Update Session

```http
PUT /comfyui/sessions/:id
```

**Request Body**
```json
{
  "title": "Mountain Landscapes"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "title": "Mountain Landscapes",
    "updated_at": "2024-12-14T10:40:00.000Z"
  }
}
```

---

#### Delete Session

Deletes session and all associated generations.

```http
DELETE /comfyui/sessions/:id
```

**Response**
```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

#### Generate Image

Submit a generation request with full parameter control.

```http
POST /comfyui/sessions/:sessionId/generate
```

**Request Body**
```json
{
  "prompt_text": "A majestic dragon flying over a castle at sunset",
  "negative_prompt": "blurry, low quality, watermark, signature",
  "workflow_id": "workflow-uuid",
  "parameters": {
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "cfg_scale": 7,
    "seed": -1,
    "sampler_name": "dpmpp_2m",
    "scheduler": "karras",
    "batch_size": 1,
    "checkpoint_name": "juggernautXL_v9Rdphoto2Lightning.safetensors"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt_text` | string | Yes | Positive prompt |
| `negative_prompt` | string | No | Negative prompt |
| `workflow_id` | string | No | Workflow to use (uses session's current if omitted) |
| `parameters` | object | No | Generation parameters (merged with defaults) |

**Parameters Object**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `width` | number | 1024 | Image width |
| `height` | number | 1024 | Image height |
| `steps` | number | 20 | Sampling steps |
| `cfg_scale` | number | 7 | Classifier-free guidance scale |
| `seed` | number | -1 | Random seed (-1 = random) |
| `sampler_name` | string | "euler" | Sampler algorithm |
| `scheduler` | string | "normal" | Noise scheduler |
| `batch_size` | number | 1 | Number of images |
| `checkpoint_name` | string | - | Model checkpoint |

**Response**
```json
{
  "success": true,
  "data": {
    "id": "generation-uuid",
    "session_id": "session-uuid",
    "workflow_id": "workflow-uuid",
    "prompt_id": "comfyui-prompt-id",
    "prompt_text": "A majestic dragon...",
    "negative_prompt": "blurry, low quality...",
    "parameters": {
      "width": 1024,
      "height": 1024,
      "steps": 25,
      "cfg_scale": 7,
      "seed": 987654321,
      "sampler_name": "dpmpp_2m",
      "scheduler": "karras"
    },
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "cfg_scale": 7,
    "seed": 987654321,
    "sampler_name": "dpmpp_2m",
    "scheduler": "karras",
    "batch_size": 1,
    "checkpoint_name": "juggernautXL_v9Rdphoto2Lightning.safetensors",
    "loras_used": [],
    "status": "running",
    "outputs": [],
    "created_at": "2024-12-14T10:45:00.000Z"
  }
}
```

> **Note**: The `seed` in the response is the resolved seed. If you passed `-1`, this shows the actual random seed used.

---

### Workflows

Manage ComfyUI workflow templates.

#### List Workflows

```http
GET /comfyui/workflows
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "workflow-uuid",
      "name": "SDXL txt2img",
      "description": "Basic text-to-image with SDXL",
      "profile_id": "profile-uuid",
      "profile_name": "Local ComfyUI",
      "is_default": true,
      "generation_count": 150,
      "default_parameters": {
        "steps": 20,
        "cfg_scale": 7
      },
      "created_at": "2024-12-01T00:00:00.000Z"
    }
  ]
}
```

---

#### Create Workflow

```http
POST /comfyui/workflows
```

**Request Body**
```json
{
  "name": "SDXL with LoRA",
  "description": "SDXL with detail enhancer LoRA",
  "profileId": "profile-uuid",
  "workflowJson": { "...ComfyUI workflow JSON..." },
  "defaultParameters": {
    "steps": 25,
    "cfg_scale": 7
  }
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "new-workflow-uuid",
    "name": "SDXL with LoRA",
    "extracted_parameters": [
      { "nodeId": "3", "field": "seed", "type": "seed", "value": 0 },
      { "nodeId": "3", "field": "steps", "type": "number", "value": 25 }
    ]
  }
}
```

---

#### Get Workflow

```http
GET /comfyui/workflows/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "workflow-uuid",
    "name": "SDXL txt2img",
    "description": "Basic text-to-image",
    "profile_id": "profile-uuid",
    "workflow_json": { "...full workflow..." },
    "default_parameters": { "steps": 20 },
    "extracted_parameters": [...],
    "is_default": true,
    "generation_count": 150
  }
}
```

---

#### Update Workflow

```http
PUT /comfyui/workflows/:id
```

**Request Body**
```json
{
  "name": "SDXL txt2img v2",
  "description": "Updated workflow"
}
```

---

#### Update Workflow Parameters

Set default parameters and mark as default workflow.

```http
PATCH /comfyui/workflows/:id/parameters
```

**Request Body**
```json
{
  "default_parameters": {
    "steps": 30,
    "cfg_scale": 8
  },
  "is_default": true
}
```

---

#### Delete Workflow

```http
DELETE /comfyui/workflows/:id
```

---

#### Execute Workflow

Legacy endpoint for direct workflow execution.

```http
POST /comfyui/workflows/:id/execute
```

**Request Body**
```json
{
  "parameters": {
    "prompt": "A beautiful sunset",
    "seed": 12345
  }
}
```

---

#### List Workflow Generations

```http
GET /comfyui/workflows/:id/generations
```

**Response**
```json
{
  "success": true,
  "data": [
    {
      "id": "gen-uuid",
      "prompt_text": "...",
      "status": "complete",
      "outputs": [...]
    }
  ]
}
```

---

### Generations

#### Get Generation

```http
GET /comfyui/generations/:id
```

**Response**
```json
{
  "success": true,
  "data": {
    "id": "generation-uuid",
    "session_id": "session-uuid",
    "workflow_id": "workflow-uuid",
    "prompt_id": "comfyui-prompt-id",
    "prompt_text": "A dragon...",
    "negative_prompt": "blurry...",
    "parameters": { "...all params..." },
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "cfg_scale": 7,
    "seed": 987654321,
    "sampler_name": "dpmpp_2m",
    "scheduler": "karras",
    "batch_size": 1,
    "checkpoint_name": "model.safetensors",
    "loras_used": [],
    "status": "complete",
    "generation_time_seconds": 12.5,
    "outputs": [
      { "filename": "ComfyUI_00042_.png", "subfolder": "" }
    ],
    "created_at": "2024-12-14T10:45:00.000Z"
  }
}
```

---

#### Get Generation Workflow

Retrieve the exact workflow snapshot used for a generation (for reproduction).

```http
GET /comfyui/generations/:id/workflow
```

**Response**
```json
{
  "success": true,
  "data": {
    "generation_id": "generation-uuid",
    "workflow_json": { "...complete workflow snapshot..." },
    "parameters": { "...all parameters..." },
    "prompt_text": "A dragon...",
    "negative_prompt": "blurry..."
  }
}
```

---

#### Delete Generation

```http
DELETE /comfyui/generations/:id
```

---

### Image Proxy

Proxy images from ComfyUI's output folder.

```http
GET /comfyui/image/:filename
```

**Query Parameters**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `subfolder` | string | "" | Subfolder path |
| `type` | string | "output" | Folder type: `output`, `input`, `temp` |

**Example**
```http
GET /comfyui/image/ComfyUI_00042_.png?subfolder=&type=output
```

**Response**
Binary image data with `Content-Type: image/png`

---

### Submit Prompt (Legacy)

Direct prompt submission without session context.

```http
POST /comfyui/prompt
```

**Request Body**
```json
{
  "sessionId": "session-uuid",
  "prompt": "A beautiful sunset",
  "negativePrompt": "blurry"
}
```

---

## Database

Direct database query endpoints (development only).

### Execute SQL Query

```http
POST /database/query
```

**Request Body**
```json
{
  "query": "SELECT * FROM profiles LIMIT 10"
}
```

**Response**
```json
{
  "success": true,
  "data": {
    "rows": [...],
    "rowCount": 10,
    "fields": ["id", "name", "provider", "..."]
  }
}
```

> **Warning**: This endpoint should be disabled in production.

---

### List Tables

```http
GET /database/tables
```

**Response**
```json
{
  "success": true,
  "data": [
    "profiles",
    "profile_models",
    "provider_settings",
    "tasks",
    "results",
    "comfyui_workflows",
    "comfyui_sessions",
    "comfyui_generations"
  ]
}
```

---

### Get Table Schema

```http
GET /database/tables/:name/schema
```

**Response**
```json
{
  "success": true,
  "data": {
    "table": "profiles",
    "columns": [
      { "name": "id", "type": "uuid", "nullable": false, "default": "gen_random_uuid()" },
      { "name": "name", "type": "varchar(255)", "nullable": false },
      { "name": "provider", "type": "varchar(50)", "nullable": false }
    ]
  }
}
```

---

## WebSocket Events

Real-time communication via Socket.io.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
});
```

### Task Events

#### Subscribe to Task Updates

```javascript
socket.emit('subscribe:task', taskId);
```

#### Task Created

```javascript
socket.on('task:created', (data) => {
  // { task: { id, name, status, ... } }
});
```

#### Task Started

```javascript
socket.on('task:started', (data) => {
  // { taskId, startedAt }
});
```

#### Task Progress

```javascript
socket.on('task:progress', (data) => {
  // { taskId, progress: 0.5, message: 'Processing...' }
});
```

#### Task Completed

```javascript
socket.on('task:completed', (data) => {
  // { taskId, result: { ... } }
});
```

#### Task Failed

```javascript
socket.on('task:failed', (data) => {
  // { taskId, error: 'Error message' }
});
```

---

### Generation Events

#### Subscribe to Session Updates

```javascript
socket.emit('subscribe:session', sessionId);
```

#### Generation Started

```javascript
socket.on('generation:started', (data) => {
  // { generationId, promptId, sessionId }
});
```

#### Generation Progress

```javascript
socket.on('generation:progress', (data) => {
  // { generationId, node: 'KSampler', progress: 0.4 }
});
```

#### Generation Completed

```javascript
socket.on('generation:completed', (data) => {
  // { generationId, outputs: [{ filename, subfolder }] }
});
```

#### Generation Failed

```javascript
socket.on('generation:failed', (data) => {
  // { generationId, error: 'ComfyUI error message' }
});
```

---

### Notification Events

#### General Notification

```javascript
socket.on('notification', (data) => {
  // { type: 'info', message: 'Model loaded successfully' }
});
```

---

## Rate Limits

> **Note**: Rate limiting is not implemented in the MVP.

### Planned Limits (Future)

| Endpoint Category | Limit |
|-------------------|-------|
| General API | 100 req/min |
| Chat Completions | 20 req/min |
| Image Generation | 10 req/min |
| Database Queries | 10 req/min |

---

## Appendix

### Provider Reference

| Provider | Type | Models |
|----------|------|--------|
| `ollama` | Local | llama3, mistral, codellama, etc. |
| `openai` | Cloud | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| `gemini` | Cloud | gemini-pro, gemini-pro-vision |
| `claude` | Cloud | claude-3-opus, claude-3-sonnet, claude-3-haiku |
| `comfyui` | Local | Stable Diffusion, SDXL, etc. |

### Content Types

| Type | Description | Providers |
|------|-------------|-----------|
| `text` | Text generation | ollama, openai, gemini, claude |
| `image` | Image generation | openai (DALL-E), comfyui |
| `video` | Video generation | comfyui |
| `audio` | Audio generation | comfyui |

### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Queued, waiting to process |
| `running` | Currently processing |
| `complete` | Successfully completed |
| `failed` | Processing failed |

---

## Changelog

### Version 1.0 (December 2024)
- Initial MVP release
- Multi-provider chat support
- ComfyUI integration with sessions
- Full parameter control for image generation
- Workflow snapshot storage for reproducibility
