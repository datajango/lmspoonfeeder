# Spoon Feeder Development Roadmap v2

> **Document Version**: 2.0  
> **Created**: December 2024  
> **Focus**: Content Production Pipeline for Technical Authoring

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Target Workflow](#target-workflow)
- [Current State vs Target](#current-state-vs-target)
- [Phase 1: Projects Foundation](#phase-1-projects-foundation)
- [Phase 2: Knowledge Base & Image Analysis](#phase-2-knowledge-base--image-analysis)
- [Phase 3: Chat-to-ComfyUI Bridge](#phase-3-chat-to-comfyui-bridge)
- [Phase 4: Batch Generation](#phase-4-batch-generation)
- [Phase 5: Assembly & Export](#phase-5-assembly--export)
- [Phase 6: Advanced Features](#phase-6-advanced-features)
- [Database Schema Changes](#database-schema-changes)
- [API Additions](#api-additions)
- [Timeline Summary](#timeline-summary)

---

## Executive Summary

### Vision

Transform Spoon Feeder from a multi-provider AI interface into a **content production pipeline** that enables:

1. **Research** - Upload and analyze reference images to build project context
2. **Generate** - Create content with embedded placeholders for assets
3. **Realize** - Automatically generate images, charts, diagrams from placeholders
4. **Assemble** - Combine text and assets into publishable documents

### Core Insight

The key differentiator is that **chat and image generation are not separate tools** - they are stages in a unified content pipeline where one feeds into the other.

### Priority Shift

| Old Priority | New Priority |
|--------------|--------------|
| Real-time WebSocket | Projects Foundation |
| Batch generation | Knowledge Base |
| Scheduling | Chat-to-ComfyUI Bridge |
| LoRA support | Assembly & Export |

---

## Target Workflow

### The Content Production Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     CONTENT PRODUCTION PIPELINE                              │
│                                                                              │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                     PHASE 1: RESEARCH & CONTEXT                        ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          ║  │
│  ║   │   Upload    │      │   Analyze   │      │  Aggregate  │          ║  │
│  ║   │   Images    │ ───► │   with LLM  │ ───► │   Context   │          ║  │
│  ║   │             │      │   (Vision)  │      │             │          ║  │
│  ║   └─────────────┘      └─────────────┘      └─────────────┘          ║  │
│  ║                                                                        ║  │
│  ║   Input: Screenshots, diagrams, references, sketches                  ║  │
│  ║   Output: Searchable knowledge base with extracted information        ║  │
│  ║                                                                        ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                    │                                         │
│                                    ▼                                         │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                     PHASE 2: CONTENT GENERATION                        ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          ║  │
│  ║   │   Project   │      │    Chat     │      │   Output    │          ║  │
│  ║   │   Context   │ ───► │    with     │ ───► │    with     │          ║  │
│  ║   │  (injected) │      │    LLM      │      │ Placeholders│          ║  │
│  ║   └─────────────┘      └─────────────┘      └─────────────┘          ║  │
│  ║                                                                        ║  │
│  ║   Input: User prompts + auto-injected project context                 ║  │
│  ║   Output: Chapter text with {{IMAGE}}, {{CHART}}, {{DIAGRAM}} tags    ║  │
│  ║                                                                        ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                    │                                         │
│                                    ▼                                         │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                     PHASE 3: ASSET REALIZATION                         ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          ║  │
│  ║   │    Parse    │      │   Route &   │      │   Generate  │          ║  │
│  ║   │ Placeholders│ ───► │   Queue     │ ───► │   Assets    │          ║  │
│  ║   │             │      │             │      │             │          ║  │
│  ║   └─────────────┘      └─────────────┘      └─────────────┘          ║  │
│  ║                                                                        ║  │
│  ║   {{IMAGE: prompt}}    ──► ComfyUI      ──► .png/.jpg                ║  │
│  ║   {{CHART: config}}    ──► Chart.js     ──► .svg/.png                ║  │
│  ║   {{DIAGRAM: code}}    ──► Mermaid/D2   ──► .svg                     ║  │
│  ║   {{TABLE: data}}      ──► Markdown     ──► .html                    ║  │
│  ║                                                                        ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                    │                                         │
│                                    ▼                                         │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                     PHASE 4: ASSEMBLY & EXPORT                         ║  │
│  ║                                                                        ║  │
│  ║   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐          ║  │
│  ║   │   Combine   │      │   Replace   │      │   Export    │          ║  │
│  ║   │    Text     │ ───► │ Placeholders│ ───► │   Format    │          ║  │
│  ║   │  + Assets   │      │  with Links │      │             │          ║  │
│  ║   └─────────────┘      └─────────────┘      └─────────────┘          ║  │
│  ║                                                                        ║  │
│  ║   Output formats: Markdown, HTML, PDF, DOCX                           ║  │
│  ║                                                                        ║  │
│  ╚═══════════════════════════════════════════════════════════════════════╝  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Current State vs Target

### Feature Gap Analysis

| Feature | Current State | Target State | Gap |
|---------|---------------|--------------|-----|
| **Projects** | ❌ None | Container for all content | **Critical** |
| **Image Upload** | ❌ None | Upload to project KB | **Critical** |
| **Vision Analysis** | ❌ None | Analyze images with LLM | **Critical** |
| **Knowledge Base** | ❌ None | Aggregated project context | **Critical** |
| **Context Injection** | ❌ None | Auto-inject into chats | **Critical** |
| **Placeholder Parsing** | ❌ None | Extract from chat output | **Critical** |
| **Chat→ComfyUI Bridge** | ❌ None | One-click generation | **Critical** |
| **Asset Linking** | ❌ None | Link back to source | **High** |
| **Document Assembly** | ❌ None | Combine text + assets | **High** |
| **Export** | ❌ None | MD/HTML/PDF/DOCX | **High** |
| Batch Generation | ❌ None | Multiple variations | Medium |
| Real-time WebSocket | 🟡 Partial | Live progress | Medium |
| Scheduling | ❌ None | Automated runs | Low |

### What's Already Working

| Feature | Status | Notes |
|---------|--------|-------|
| Chat interface | ✅ | Multi-provider conversations |
| ComfyUI generation | ✅ | Sessions, workflows, parameters |
| Image proxy | ✅ | Serves generated images |
| Reproducibility | ✅ | Workflow snapshots |
| Profile system | ✅ | Multi-provider configs |
| Database foundation | ✅ | Solid schema, migrations |

---

## Phase 1: Projects Foundation

> **Duration**: 1-2 weeks  
> **Priority**: P0 - Critical  
> **Goal**: Create the container that links everything together

### Overview

A **Project** is the top-level organizational unit that contains:
- Conversations (research, chapters, revisions)
- ComfyUI sessions (asset generation)
- Knowledge base (uploaded images + analysis)
- Generated assets (images, charts, diagrams)
- Documents (assembled outputs)

### 1.1 Data Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT DATA MODEL                                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           PROJECT                                    │    │
│  │   id, name, description, context_summary, settings, created_at      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│         │              │              │              │              │        │
│         ▼              ▼              ▼              ▼              ▼        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Knowledge │  │  Conver-  │  │  ComfyUI  │  │  Assets   │  │Documents │ │
│  │   Items   │  │  sations  │  │  Sessions │  │           │  │          │ │
│  │           │  │           │  │           │  │           │  │          │ │
│  │ - Images  │  │ - Messages│  │ - Gens    │  │ - Images  │  │ - Drafts │ │
│  │ - Analysis│  │ - Context │  │ - Batches │  │ - Charts  │  │ - Exports│ │
│  │ - Tags    │  │           │  │           │  │ - Diagrams│  │          │ │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Database Schema

**Migration**: `XXX_create_projects.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create projects table
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 255).notNullable();
    table.text('description');
    table.text('context_summary'); // Aggregated context for injection
    table.jsonb('settings').defaultTo('{}'); // Project-specific settings
    table.jsonb('placeholder_config').defaultTo('{}'); // Placeholder syntax settings
    table.string('status', 20).defaultTo('active'); // active, archived
    table.timestamps(true, true);
    
    table.index('status');
    table.index('created_at');
  });

  // Add project_id to conversations
  await knex.schema.alterTable('conversations', (table) => {
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.index('project_id');
  });

  // Add project_id to comfyui_sessions
  await knex.schema.alterTable('comfyui_sessions', (table) => {
    table.uuid('project_id').references('id').inTable('projects').onDelete('SET NULL');
    table.index('project_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('comfyui_sessions', (table) => {
    table.dropColumn('project_id');
  });
  
  await knex.schema.alterTable('conversations', (table) => {
    table.dropColumn('project_id');
  });
  
  await knex.schema.dropTableIfExists('projects');
}
```

### 1.3 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create new project |
| GET | `/api/projects/:id` | Get project with stats |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project (cascade) |
| GET | `/api/projects/:id/conversations` | List project conversations |
| GET | `/api/projects/:id/sessions` | List project ComfyUI sessions |
| GET | `/api/projects/:id/assets` | List project assets |
| POST | `/api/projects/:id/archive` | Archive project |

### 1.4 Controller Implementation

**File**: `backend/src/controllers/projects.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';
import { NotFoundError, BadRequestError } from '../utils/errors';

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const { status = 'active', search } = req.query;

    let query = db('projects')
      .select(
        'projects.*',
        db.raw('(SELECT COUNT(*) FROM conversations WHERE project_id = projects.id) as conversation_count'),
        db.raw('(SELECT COUNT(*) FROM comfyui_sessions WHERE project_id = projects.id) as session_count'),
        db.raw('(SELECT COUNT(*) FROM project_knowledge_items WHERE project_id = projects.id) as knowledge_count'),
        db.raw('(SELECT COUNT(*) FROM project_assets WHERE project_id = projects.id) as asset_count')
      )
      .where('status', status)
      .orderBy('updated_at', 'desc');

    if (search) {
      query = query.where(function() {
        this.where('name', 'ilike', `%${search}%`)
            .orWhere('description', 'ilike', `%${search}%`);
      });
    }

    const projects = await query;

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, settings } = req.body;

    if (!name) {
      throw new BadRequestError('Project name is required');
    }

    const [project] = await db('projects').insert({
      name,
      description,
      settings: settings ? JSON.stringify(settings) : '{}',
    }).returning('*');

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const project = await db('projects').where('id', id).first();
    
    if (!project) {
      throw new NotFoundError(`Project ${id} not found`);
    }

    // Get related counts
    const [conversationCount] = await db('conversations').where('project_id', id).count();
    const [sessionCount] = await db('comfyui_sessions').where('project_id', id).count();
    const [knowledgeCount] = await db('project_knowledge_items').where('project_id', id).count();
    const [assetCount] = await db('project_assets').where('project_id', id).count();

    res.json({
      success: true,
      data: {
        ...project,
        stats: {
          conversations: parseInt(conversationCount.count as string),
          sessions: parseInt(sessionCount.count as string),
          knowledgeItems: parseInt(knowledgeCount.count as string),
          assets: parseInt(assetCount.count as string),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { name, description, settings, context_summary } = req.body;

    const updates: any = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (settings !== undefined) updates.settings = JSON.stringify(settings);
    if (context_summary !== undefined) updates.context_summary = context_summary;

    const [project] = await db('projects')
      .where('id', id)
      .update(updates)
      .returning('*');

    if (!project) {
      throw new NotFoundError(`Project ${id} not found`);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Cascade will handle related records
    const deleted = await db('projects').where('id', id).delete();

    if (!deleted) {
      throw new NotFoundError(`Project ${id} not found`);
    }

    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    next(error);
  }
}

export async function archiveProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const [project] = await db('projects')
      .where('id', id)
      .update({ status: 'archived', updated_at: new Date() })
      .returning('*');

    if (!project) {
      throw new NotFoundError(`Project ${id} not found`);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
}
```

### 1.5 Frontend: Project Selection

**File**: `frontend/src/components/layout/ProjectSelector.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Plus, Folder, FolderOpen, Settings } from 'lucide-react';
import { projectsApi } from '../../services/api';

interface Project {
  id: string;
  name: string;
  description?: string;
  conversation_count: number;
  session_count: number;
}

interface ProjectSelectorProps {
  currentProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

export default function ProjectSelector({ currentProjectId, onProjectChange }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const currentProject = projects.find((p: Project) => p.id === currentProjectId);

  return (
    <div className="relative">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-white/10 transition-colors w-full"
      >
        {currentProject ? (
          <FolderOpen className="w-4 h-4 text-indigo-400" />
        ) : (
          <Folder className="w-4 h-4 text-[var(--text-secondary)]" />
        )}
        <span className="flex-1 text-left truncate">
          {currentProject?.name || 'No Project'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-lg shadow-xl border border-white/10 z-50">
          {/* No Project Option */}
          <button
            onClick={() => {
              onProjectChange(null);
              setIsOpen(false);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 ${
              !currentProjectId ? 'bg-indigo-500/20' : ''
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>No Project</span>
          </button>

          <div className="border-t border-white/10" />

          {/* Project List */}
          <div className="max-h-64 overflow-y-auto">
            {projects.map((project: Project) => (
              <button
                key={project.id}
                onClick={() => {
                  onProjectChange(project.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 ${
                  project.id === currentProjectId ? 'bg-indigo-500/20' : ''
                }`}
              >
                <FolderOpen className="w-4 h-4 text-indigo-400" />
                <div className="flex-1 text-left">
                  <div className="truncate">{project.name}</div>
                  <div className="text-xs text-[var(--text-secondary)]">
                    {project.conversation_count} chats · {project.session_count} sessions
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-white/10" />

          {/* Create New */}
          <button
            onClick={() => {
              setShowCreateModal(true);
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-indigo-400"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      )}

      {/* Create Modal would go here */}
    </div>
  );
}
```

### 1.6 Frontend: Project Dashboard

**File**: `frontend/src/pages/ProjectDashboard.tsx`

```typescript
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  MessageSquare, Image, FileText, Database, 
  Upload, Settings, Archive, Trash2 
} from 'lucide-react';
import { projectsApi } from '../services/api';

export default function ProjectDashboard() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!project) {
    return <div className="p-6">Project not found</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          {project.description && (
            <p className="text-[var(--text-secondary)]">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Database className="w-5 h-5 text-purple-400" />}
          label="Knowledge Items"
          value={project.stats.knowledgeItems}
          action={{ label: 'Upload', href: `/projects/${projectId}/knowledge` }}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5 text-blue-400" />}
          label="Conversations"
          value={project.stats.conversations}
          action={{ label: 'New Chat', href: `/projects/${projectId}/chat` }}
        />
        <StatCard
          icon={<Image className="w-5 h-5 text-green-400" />}
          label="ComfyUI Sessions"
          value={project.stats.sessions}
          action={{ label: 'New Session', href: `/projects/${projectId}/comfyui` }}
        />
        <StatCard
          icon={<FileText className="w-5 h-5 text-orange-400" />}
          label="Assets"
          value={project.stats.assets}
          action={{ label: 'View All', href: `/projects/${projectId}/assets` }}
        />
      </div>

      {/* Context Summary */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold mb-4">Project Context</h2>
        {project.context_summary ? (
          <div className="prose prose-invert max-w-none">
            <p className="text-[var(--text-secondary)]">{project.context_summary}</p>
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--text-secondary)]">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No context built yet</p>
            <p className="text-sm">Upload images and documents to build project knowledge</p>
            <button className="btn-primary mt-4">
              <Upload className="w-4 h-4 mr-2" />
              Upload Files
            </button>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Conversations</h3>
          {/* List recent conversations */}
        </div>

        {/* Recent Generations */}
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Generations</h3>
          {/* List recent ComfyUI generations */}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, action }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  action: { label: string; href: string };
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className="text-3xl font-bold mb-3">{value}</div>
      <a href={action.href} className="text-sm text-indigo-400 hover:text-indigo-300">
        {action.label} →
      </a>
    </div>
  );
}
```

### 1.7 Global Project Context

**File**: `frontend/src/context/ProjectContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ProjectContextType {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('currentProjectId');
  });

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('currentProjectId', currentProjectId);
    } else {
      localStorage.removeItem('currentProjectId');
    }
  }, [currentProjectId]);

  return (
    <ProjectContext.Provider value={{ currentProjectId, setCurrentProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
```

### Phase 1 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| Projects migration | New | `backend/src/db/migrations/XXX_create_projects.ts` |
| Projects controller | New | `backend/src/controllers/projects.controller.ts` |
| Projects routes | New | `backend/src/routes/projects.routes.ts` |
| Projects API client | New | `frontend/src/services/projectsApi.ts` |
| ProjectSelector | New | `frontend/src/components/layout/ProjectSelector.tsx` |
| ProjectDashboard | New | `frontend/src/pages/ProjectDashboard.tsx` |
| ProjectContext | New | `frontend/src/context/ProjectContext.tsx` |
| Sidebar updates | Modified | Add project selector |
| Conversations updates | Modified | Filter by project |
| ComfyUI updates | Modified | Filter by project |

### Phase 1 Acceptance Criteria

- [ ] Can create, list, update, delete projects
- [ ] Project selector visible in sidebar/header
- [ ] Conversations can be assigned to projects
- [ ] ComfyUI sessions can be assigned to projects
- [ ] Project dashboard shows stats
- [ ] Filter conversations/sessions by project
- [ ] Current project persists across page reloads

---

## Phase 2: Knowledge Base & Image Analysis

> **Duration**: 2-3 weeks  
> **Priority**: P0 - Critical  
> **Goal**: Upload images, analyze with LLM, build project context

### Overview

The Knowledge Base allows users to:
1. Upload reference images (screenshots, diagrams, sketches)
2. Analyze each image with a vision-capable LLM
3. Store structured analysis (description, extracted text, tags)
4. Aggregate analyses into project context
5. Auto-inject context into chat conversations

### 2.1 Database Schema

**Migration**: `XXX_create_project_knowledge.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Knowledge items (uploaded files + analysis)
  await knex.schema.createTable('project_knowledge_items', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects')
      .onDelete('CASCADE');
    
    // File info
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255).notNullable();
    table.string('mime_type', 100).notNullable();
    table.integer('file_size');
    table.string('file_path', 500).notNullable();
    
    // Analysis
    table.string('analysis_status', 20).defaultTo('pending'); 
    // pending, analyzing, completed, failed
    table.text('analysis_description'); // LLM description of the image
    table.text('analysis_extracted_text'); // OCR/text extraction
    table.jsonb('analysis_metadata').defaultTo('{}'); // Structured data
    table.specificType('analysis_tags', 'text[]'); // Tags for categorization
    table.string('analysis_provider', 50); // Which LLM analyzed it
    table.string('analysis_model', 100); // Which model
    table.text('analysis_error'); // Error if failed
    table.timestamp('analyzed_at');
    
    // User additions
    table.text('user_notes'); // Manual notes
    table.specificType('user_tags', 'text[]'); // Manual tags
    
    table.timestamps(true, true);
    
    table.index('project_id');
    table.index('analysis_status');
    table.index('created_at');
  });

  // Knowledge aggregation history
  await knex.schema.createTable('project_context_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects')
      .onDelete('CASCADE');
    table.text('context_summary').notNullable();
    table.integer('item_count'); // How many items were included
    table.string('generation_provider', 50);
    table.string('generation_model', 100);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index('project_id');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_context_versions');
  await knex.schema.dropTableIfExists('project_knowledge_items');
}
```

### 2.2 Knowledge Service

**File**: `backend/src/services/knowledge.service.ts`

```typescript
import { db } from '../db/knex';
import { openaiService } from './openai.service';
import { claudeService } from './claude.service';
import { geminiService } from './gemini.service';
import path from 'path';
import fs from 'fs/promises';

const UPLOAD_DIR = process.env.KNOWLEDGE_UPLOAD_DIR || './storage/knowledge';

interface AnalysisResult {
  description: string;
  extractedText?: string;
  metadata: Record<string, any>;
  tags: string[];
}

class KnowledgeService {
  
  async uploadFile(projectId: string, file: Express.Multer.File): Promise<any> {
    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(UPLOAD_DIR, projectId, filename);
    
    // Ensure directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    
    // Move file
    await fs.rename(file.path, filePath);
    
    // Create database record
    const [item] = await db('project_knowledge_items').insert({
      project_id: projectId,
      filename,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      file_path: filePath,
      analysis_status: 'pending',
    }).returning('*');
    
    // Queue analysis (async)
    this.analyzeItem(item.id).catch(console.error);
    
    return item;
  }

  async analyzeItem(itemId: string, provider: string = 'openai'): Promise<void> {
    try {
      // Update status
      await db('project_knowledge_items')
        .where('id', itemId)
        .update({ analysis_status: 'analyzing' });
      
      // Get item
      const item = await db('project_knowledge_items').where('id', itemId).first();
      
      if (!item) throw new Error('Item not found');
      
      // Read file as base64
      const fileBuffer = await fs.readFile(item.file_path);
      const base64 = fileBuffer.toString('base64');
      
      // Analyze with vision LLM
      const analysis = await this.analyzeWithVision(base64, item.mime_type, provider);
      
      // Update record
      await db('project_knowledge_items')
        .where('id', itemId)
        .update({
          analysis_status: 'completed',
          analysis_description: analysis.description,
          analysis_extracted_text: analysis.extractedText,
          analysis_metadata: JSON.stringify(analysis.metadata),
          analysis_tags: analysis.tags,
          analysis_provider: provider,
          analyzed_at: new Date(),
        });
      
      // Trigger context regeneration for project
      await this.regenerateProjectContext(item.project_id);
      
    } catch (error: any) {
      await db('project_knowledge_items')
        .where('id', itemId)
        .update({
          analysis_status: 'failed',
          analysis_error: error.message,
        });
      throw error;
    }
  }

  private async analyzeWithVision(
    base64: string, 
    mimeType: string, 
    provider: string
  ): Promise<AnalysisResult> {
    const prompt = `Analyze this image and provide:
1. A detailed description of what you see
2. Any text visible in the image (OCR)
3. Key elements, concepts, or entities identified
4. Suggested tags for categorization

Respond in JSON format:
{
  "description": "...",
  "extractedText": "...",
  "metadata": {
    "elements": [...],
    "concepts": [...],
    "style": "...",
    "colors": [...]
  },
  "tags": [...]
}`;

    let response: string;
    
    switch (provider) {
      case 'openai':
        response = await openaiService.analyzeImage(base64, mimeType, prompt);
        break;
      case 'claude':
        response = await claudeService.analyzeImage(base64, mimeType, prompt);
        break;
      case 'gemini':
        response = await geminiService.analyzeImage(base64, mimeType, prompt);
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
    
    // Parse JSON response
    try {
      const parsed = JSON.parse(response);
      return {
        description: parsed.description || '',
        extractedText: parsed.extractedText,
        metadata: parsed.metadata || {},
        tags: parsed.tags || [],
      };
    } catch {
      // If not valid JSON, treat as plain description
      return {
        description: response,
        metadata: {},
        tags: [],
      };
    }
  }

  async regenerateProjectContext(projectId: string): Promise<string> {
    // Get all analyzed items
    const items = await db('project_knowledge_items')
      .where('project_id', projectId)
      .where('analysis_status', 'completed')
      .orderBy('created_at', 'asc');
    
    if (items.length === 0) {
      await db('projects')
        .where('id', projectId)
        .update({ context_summary: null });
      return '';
    }
    
    // Build context from all items
    const itemSummaries = items.map((item, i) => 
      `[Item ${i + 1}: ${item.original_filename}]
Description: ${item.analysis_description}
${item.analysis_extracted_text ? `Extracted Text: ${item.analysis_extracted_text}` : ''}
Tags: ${(item.analysis_tags || []).join(', ')}
${item.user_notes ? `Notes: ${item.user_notes}` : ''}`
    ).join('\n\n');
    
    // Generate aggregated summary
    const aggregationPrompt = `You are building a knowledge base summary for a content creation project.

Below are analyses of reference materials (images, diagrams, documents) uploaded to this project:

${itemSummaries}

Create a comprehensive summary that:
1. Identifies the main themes and topics across all materials
2. Notes the visual styles and presentation patterns
3. Extracts key terminology and concepts
4. Highlights relationships between different materials
5. Provides guidance for content creation that matches these references

Write the summary in a way that can be used as context for future content generation.`;

    const summary = await openaiService.generate(aggregationPrompt, {
      model: 'gpt-4',
      maxTokens: 2000,
    });
    
    // Save to project
    await db('projects')
      .where('id', projectId)
      .update({ 
        context_summary: summary,
        updated_at: new Date(),
      });
    
    // Save version history
    await db('project_context_versions').insert({
      project_id: projectId,
      context_summary: summary,
      item_count: items.length,
      generation_provider: 'openai',
      generation_model: 'gpt-4',
    });
    
    return summary;
  }

  async getProjectContext(projectId: string): Promise<string | null> {
    const project = await db('projects').where('id', projectId).first();
    return project?.context_summary || null;
  }

  async deleteItem(itemId: string): Promise<void> {
    const item = await db('project_knowledge_items').where('id', itemId).first();
    
    if (item) {
      // Delete file
      try {
        await fs.unlink(item.file_path);
      } catch {
        // File may already be deleted
      }
      
      // Delete record
      await db('project_knowledge_items').where('id', itemId).delete();
      
      // Regenerate context
      await this.regenerateProjectContext(item.project_id);
    }
  }
}

export const knowledgeService = new KnowledgeService();
```

### 2.3 Context Injection in Chat

**Update**: `backend/src/controllers/chat.controller.ts`

```typescript
import { knowledgeService } from '../services/knowledge.service';

export async function createCompletion(req: Request, res: Response, next: NextFunction) {
  try {
    const { messages, model, provider, projectId } = req.body;
    
    let systemPrompt = '';
    
    // Inject project context if available
    if (projectId) {
      const context = await knowledgeService.getProjectContext(projectId);
      
      if (context) {
        systemPrompt = `PROJECT CONTEXT:
The following is aggregated knowledge about this project based on uploaded reference materials:

${context}

---

Use this context to inform your responses. When creating content, maintain consistency with the themes, styles, and terminology identified above.

`;
      }
    }
    
    // Prepend system prompt to messages
    const messagesWithContext = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;
    
    // Continue with existing chat logic...
  } catch (error) {
    next(error);
  }
}
```

### 2.4 Frontend: Knowledge Base UI

**File**: `frontend/src/pages/ProjectKnowledge.tsx`

```typescript
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, Image, FileText, Trash2, RefreshCw, 
  CheckCircle, AlertCircle, Loader2, Eye 
} from 'lucide-react';
import { knowledgeApi } from '../services/api';

export default function ProjectKnowledge() {
  const { projectId } = useParams<{ projectId: string }>();
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['knowledge', projectId],
    queryFn: () => knowledgeApi.list(projectId!),
    enabled: !!projectId,
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => knowledgeApi.upload(projectId!, files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (itemId: string) => knowledgeApi.delete(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
    },
  });

  const reanalyzeMutation = useMutation({
    mutationFn: (itemId: string) => knowledgeApi.reanalyze(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge', projectId] });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <button
          onClick={() => knowledgeApi.regenerateContext(projectId!)}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerate Context
        </button>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-500/10' 
            : 'border-white/20 hover:border-white/40'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-[var(--text-secondary)]" />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <>
            <p className="mb-2">Drag & drop images here, or click to select</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Supports PNG, JPG, GIF, WebP, PDF
            </p>
          </>
        )}
      </div>

      {/* Uploading indicator */}
      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-indigo-400 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          Uploading files...
        </div>
      )}

      {/* Items Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((item: any) => (
          <KnowledgeItemCard
            key={item.id}
            item={item}
            onView={() => setSelectedItem(item.id)}
            onDelete={() => deleteMutation.mutate(item.id)}
            onReanalyze={() => reanalyzeMutation.mutate(item.id)}
          />
        ))}
      </div>

      {items.length === 0 && !isLoading && (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No files uploaded yet</p>
          <p className="text-sm">Upload reference images to build your knowledge base</p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <KnowledgeItemModal
          itemId={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

function KnowledgeItemCard({ item, onView, onDelete, onReanalyze }: {
  item: any;
  onView: () => void;
  onDelete: () => void;
  onReanalyze: () => void;
}) {
  const statusIcon = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />,
    analyzing: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
    completed: <CheckCircle className="w-4 h-4 text-green-400" />,
    failed: <AlertCircle className="w-4 h-4 text-red-400" />,
  }[item.analysis_status];

  return (
    <div className="card group relative overflow-hidden">
      {/* Thumbnail */}
      <div 
        className="aspect-square bg-[var(--bg-darker)] rounded-lg mb-3 overflow-hidden cursor-pointer"
        onClick={onView}
      >
        {item.mime_type.startsWith('image/') ? (
          <img
            src={`/api/knowledge/${item.id}/file`}
            alt={item.original_filename}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-[var(--text-secondary)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex items-center gap-2 mb-1">
        {statusIcon}
        <span className="text-sm truncate flex-1">{item.original_filename}</span>
      </div>

      {/* Tags */}
      {item.analysis_tags && item.analysis_tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {item.analysis_tags.slice(0, 3).map((tag: string, i: number) => (
            <span key={i} className="text-xs px-2 py-0.5 bg-white/10 rounded">
              {tag}
            </span>
          ))}
          {item.analysis_tags.length > 3 && (
            <span className="text-xs px-2 py-0.5 text-[var(--text-secondary)]">
              +{item.analysis_tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions (on hover) */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={onView}
          className="p-1.5 bg-black/50 rounded hover:bg-black/70"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={onReanalyze}
          className="p-1.5 bg-black/50 rounded hover:bg-black/70"
          title="Reanalyze"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-black/50 rounded hover:bg-red-500/70"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

### Phase 2 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| Knowledge migration | New | `backend/src/db/migrations/XXX_create_project_knowledge.ts` |
| Knowledge service | New | `backend/src/services/knowledge.service.ts` |
| Knowledge controller | New | `backend/src/controllers/knowledge.controller.ts` |
| Knowledge routes | New | `backend/src/routes/knowledge.routes.ts` |
| Vision analysis methods | New | Add to provider services |
| ProjectKnowledge page | New | `frontend/src/pages/ProjectKnowledge.tsx` |
| KnowledgeItemModal | New | `frontend/src/components/knowledge/KnowledgeItemModal.tsx` |
| Chat context injection | Modified | `backend/src/controllers/chat.controller.ts` |

### Phase 2 Acceptance Criteria

- [ ] Can upload images to project knowledge base
- [ ] Images automatically analyzed by vision LLM
- [ ] Analysis includes description, extracted text, tags
- [ ] Can view analysis results in UI
- [ ] Can delete items from knowledge base
- [ ] Can manually add notes/tags to items
- [ ] Project context auto-regenerates on changes
- [ ] Context injected into chat conversations
- [ ] Can choose analysis provider

---

## Phase 3: Chat-to-ComfyUI Bridge

> **Duration**: 2 weeks  
> **Priority**: P0 - Critical  
> **Goal**: Parse placeholders from chat, generate assets with one click

### Overview

The bridge connects chat output to asset generation:
1. User generates content in chat with placeholders
2. System parses and extracts placeholders
3. User clicks to generate assets
4. Generated assets link back to source
5. Assets appear inline in chat

### 3.1 Placeholder Syntax

**Supported placeholder types:**

```markdown
{{IMAGE: a cyberpunk cityscape at night, neon lights, rain}}

{{CHART: 
  type: line
  title: Training Loss Over Time
  data: [[0, 1.5], [10, 0.8], [20, 0.4], [30, 0.2]]
  xLabel: Epoch
  yLabel: Loss
}}

{{DIAGRAM:
  type: flowchart
  code: |
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
}}

{{TABLE:
  headers: [Model, Accuracy, Speed]
  rows:
    - [GPT-4, 95%, 2s]
    - [Claude, 93%, 1.5s]
    - [Gemini, 91%, 1s]
}}
```

### 3.2 Database Schema

**Migration**: `XXX_create_placeholders.ts`

```typescript
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Placeholders extracted from messages
  await knex.schema.createTable('message_placeholders', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('message_id').notNullable()
      .references('id').inTable('messages')
      .onDelete('CASCADE');
    table.uuid('project_id')
      .references('id').inTable('projects')
      .onDelete('SET NULL');
    
    // Placeholder info
    table.string('placeholder_type', 50).notNullable(); // IMAGE, CHART, DIAGRAM, TABLE
    table.text('raw_content').notNullable(); // Original placeholder text
    table.jsonb('parsed_content').notNullable(); // Parsed structure
    table.integer('position_start'); // Character position in message
    table.integer('position_end');
    
    // Generation status
    table.string('status', 20).defaultTo('pending');
    // pending, generating, completed, failed, skipped
    
    // Link to generated asset
    table.uuid('asset_id')
      .references('id').inTable('project_assets')
      .onDelete('SET NULL');
    table.uuid('comfyui_generation_id')
      .references('id').inTable('comfyui_generations')
      .onDelete('SET NULL');
    
    table.text('error');
    table.timestamps(true, true);
    
    table.index('message_id');
    table.index('project_id');
    table.index('status');
  });

  // Project assets (generated outputs)
  await knex.schema.createTable('project_assets', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects')
      .onDelete('CASCADE');
    
    // Asset info
    table.string('asset_type', 50).notNullable(); // image, chart, diagram, table, document
    table.string('filename', 255).notNullable();
    table.string('original_filename', 255);
    table.string('mime_type', 100).notNullable();
    table.string('file_path', 500).notNullable();
    table.integer('file_size');
    
    // Source tracking
    table.string('source_type', 50); // placeholder, comfyui, upload, chart_generator
    table.uuid('source_id'); // ID of source record
    table.jsonb('source_metadata').defaultTo('{}');
    
    // Categorization
    table.string('title', 255);
    table.text('description');
    table.specificType('tags', 'text[]');
    
    table.timestamps(true, true);
    
    table.index('project_id');
    table.index('asset_type');
    table.index('created_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('message_placeholders');
  await knex.schema.dropTableIfExists('project_assets');
}
```

### 3.3 Placeholder Parser Service

**File**: `backend/src/services/placeholder-parser.service.ts`

```typescript
interface ParsedPlaceholder {
  type: 'IMAGE' | 'CHART' | 'DIAGRAM' | 'TABLE';
  rawContent: string;
  parsedContent: any;
  startPosition: number;
  endPosition: number;
}

class PlaceholderParserService {
  
  private readonly PLACEHOLDER_REGEX = /\{\{(IMAGE|CHART|DIAGRAM|TABLE):\s*([\s\S]*?)\}\}/g;

  parse(text: string): ParsedPlaceholder[] {
    const placeholders: ParsedPlaceholder[] = [];
    let match;
    
    while ((match = this.PLACEHOLDER_REGEX.exec(text)) !== null) {
      const type = match[1] as ParsedPlaceholder['type'];
      const rawContent = match[2].trim();
      
      placeholders.push({
        type,
        rawContent,
        parsedContent: this.parseContent(type, rawContent),
        startPosition: match.index,
        endPosition: match.index + match[0].length,
      });
    }
    
    return placeholders;
  }

  private parseContent(type: string, content: string): any {
    switch (type) {
      case 'IMAGE':
        return this.parseImageContent(content);
      case 'CHART':
        return this.parseYamlContent(content);
      case 'DIAGRAM':
        return this.parseDiagramContent(content);
      case 'TABLE':
        return this.parseYamlContent(content);
      default:
        return { raw: content };
    }
  }

  private parseImageContent(content: string): any {
    // Simple prompt, possibly with style hints
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    
    if (lines.length === 1) {
      return { prompt: lines[0] };
    }
    
    // Multi-line: first line is prompt, rest are parameters
    const result: any = { prompt: lines[0] };
    
    for (let i = 1; i < lines.length; i++) {
      const [key, ...valueParts] = lines[i].split(':');
      if (key && valueParts.length) {
        result[key.trim().toLowerCase()] = valueParts.join(':').trim();
      }
    }
    
    return result;
  }

  private parseYamlContent(content: string): any {
    try {
      // Simple YAML-like parsing
      const yaml = require('js-yaml');
      return yaml.load(content);
    } catch {
      return { raw: content };
    }
  }

  private parseDiagramContent(content: string): any {
    const lines = content.split('\n');
    let type = 'mermaid';
    let code = content;
    
    // Check for type declaration
    const typeMatch = lines[0].match(/^type:\s*(.+)/i);
    if (typeMatch) {
      type = typeMatch[1].trim().toLowerCase();
      code = lines.slice(1).join('\n');
    }
    
    // Check for code block
    const codeMatch = code.match(/code:\s*\|?\s*([\s\S]+)/i);
    if (codeMatch) {
      code = codeMatch[1].trim();
    }
    
    return { type, code };
  }

  /**
   * Extract placeholders from a message and save to database
   */
  async extractAndSave(messageId: string, projectId: string | null, content: string): Promise<any[]> {
    const placeholders = this.parse(content);
    
    if (placeholders.length === 0) return [];
    
    const records = await db('message_placeholders').insert(
      placeholders.map(p => ({
        message_id: messageId,
        project_id: projectId,
        placeholder_type: p.type,
        raw_content: p.rawContent,
        parsed_content: JSON.stringify(p.parsedContent),
        position_start: p.startPosition,
        position_end: p.endPosition,
        status: 'pending',
      }))
    ).returning('*');
    
    return records;
  }
}

export const placeholderParser = new PlaceholderParserService();
```

### 3.4 Placeholder Generation Service

**File**: `backend/src/services/placeholder-generator.service.ts`

```typescript
import { db } from '../db/knex';
import { comfyuiService } from './comfyui.service';
import { chartService } from './chart.service';
import { diagramService } from './diagram.service';
import { getWebSocketService } from './websocket.service';
import path from 'path';
import fs from 'fs/promises';

const ASSETS_DIR = process.env.ASSETS_DIR || './storage/assets';

class PlaceholderGeneratorService {

  async generatePlaceholder(placeholderId: string): Promise<any> {
    const placeholder = await db('message_placeholders')
      .where('id', placeholderId)
      .first();
    
    if (!placeholder) {
      throw new Error('Placeholder not found');
    }
    
    // Update status
    await db('message_placeholders')
      .where('id', placeholderId)
      .update({ status: 'generating' });
    
    try {
      let asset: any;
      
      const parsedContent = typeof placeholder.parsed_content === 'string'
        ? JSON.parse(placeholder.parsed_content)
        : placeholder.parsed_content;
      
      switch (placeholder.placeholder_type) {
        case 'IMAGE':
          asset = await this.generateImage(placeholder, parsedContent);
          break;
        case 'CHART':
          asset = await this.generateChart(placeholder, parsedContent);
          break;
        case 'DIAGRAM':
          asset = await this.generateDiagram(placeholder, parsedContent);
          break;
        case 'TABLE':
          asset = await this.generateTable(placeholder, parsedContent);
          break;
        default:
          throw new Error(`Unknown placeholder type: ${placeholder.placeholder_type}`);
      }
      
      // Update placeholder with asset link
      await db('message_placeholders')
        .where('id', placeholderId)
        .update({ 
          status: 'completed',
          asset_id: asset.id,
        });
      
      // Emit completion event
      getWebSocketService()?.emit('placeholder:completed', {
        placeholderId,
        assetId: asset.id,
        messageId: placeholder.message_id,
      });
      
      return asset;
      
    } catch (error: any) {
      await db('message_placeholders')
        .where('id', placeholderId)
        .update({ 
          status: 'failed',
          error: error.message,
        });
      
      getWebSocketService()?.emit('placeholder:failed', {
        placeholderId,
        error: error.message,
      });
      
      throw error;
    }
  }

  private async generateImage(placeholder: any, content: any): Promise<any> {
    // Find or create a ComfyUI session for this project
    let session = await db('comfyui_sessions')
      .where('project_id', placeholder.project_id)
      .orderBy('updated_at', 'desc')
      .first();
    
    if (!session) {
      // Create a default session
      [session] = await db('comfyui_sessions').insert({
        project_id: placeholder.project_id,
        name: 'Auto-generated Assets',
      }).returning('*');
    }
    
    // Generate with ComfyUI
    const generation = await comfyuiService.generateWithParams(session.id, {
      prompt: content.prompt,
      negative_prompt: content.negative_prompt || '',
      width: parseInt(content.width) || 1024,
      height: parseInt(content.height) || 1024,
      steps: parseInt(content.steps) || 20,
      cfg_scale: parseFloat(content.cfg_scale) || 7,
      seed: content.seed ? parseInt(content.seed) : -1,
    });
    
    // Wait for generation to complete (or handle async)
    // For now, assume we poll or get notified
    
    // Create asset record
    const [asset] = await db('project_assets').insert({
      project_id: placeholder.project_id,
      asset_type: 'image',
      filename: generation.outputs?.[0]?.filename || 'generated.png',
      mime_type: 'image/png',
      file_path: generation.outputs?.[0]?.filepath || '',
      source_type: 'placeholder',
      source_id: placeholder.id,
      source_metadata: JSON.stringify({ generation_id: generation.id }),
      title: content.prompt.substring(0, 100),
      description: content.prompt,
    }).returning('*');
    
    // Update placeholder with generation ID
    await db('message_placeholders')
      .where('id', placeholder.id)
      .update({ comfyui_generation_id: generation.id });
    
    return asset;
  }

  private async generateChart(placeholder: any, content: any): Promise<any> {
    // Generate chart using Chart.js or similar
    const chartBuffer = await chartService.generate(content);
    
    // Save to file
    const filename = `chart-${Date.now()}.png`;
    const filePath = path.join(ASSETS_DIR, placeholder.project_id, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, chartBuffer);
    
    // Create asset record
    const [asset] = await db('project_assets').insert({
      project_id: placeholder.project_id,
      asset_type: 'chart',
      filename,
      mime_type: 'image/png',
      file_path: filePath,
      file_size: chartBuffer.length,
      source_type: 'placeholder',
      source_id: placeholder.id,
      title: content.title || 'Chart',
    }).returning('*');
    
    return asset;
  }

  private async generateDiagram(placeholder: any, content: any): Promise<any> {
    // Generate diagram using Mermaid or D2
    const diagramBuffer = await diagramService.generate(content.type, content.code);
    
    // Save to file
    const filename = `diagram-${Date.now()}.svg`;
    const filePath = path.join(ASSETS_DIR, placeholder.project_id, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, diagramBuffer);
    
    // Create asset record
    const [asset] = await db('project_assets').insert({
      project_id: placeholder.project_id,
      asset_type: 'diagram',
      filename,
      mime_type: 'image/svg+xml',
      file_path: filePath,
      file_size: diagramBuffer.length,
      source_type: 'placeholder',
      source_id: placeholder.id,
    }).returning('*');
    
    return asset;
  }

  private async generateTable(placeholder: any, content: any): Promise<any> {
    // Generate HTML table
    const html = this.generateTableHtml(content);
    
    // Save to file
    const filename = `table-${Date.now()}.html`;
    const filePath = path.join(ASSETS_DIR, placeholder.project_id, filename);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, html);
    
    // Create asset record
    const [asset] = await db('project_assets').insert({
      project_id: placeholder.project_id,
      asset_type: 'table',
      filename,
      mime_type: 'text/html',
      file_path: filePath,
      file_size: Buffer.byteLength(html),
      source_type: 'placeholder',
      source_id: placeholder.id,
    }).returning('*');
    
    return asset;
  }

  private generateTableHtml(content: any): string {
    const headers = content.headers || [];
    const rows = content.rows || [];
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4a5568; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <table>
    <thead>
      <tr>${headers.map((h: string) => `<th>${h}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${rows.map((row: string[]) => 
        `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`
      ).join('\n')}
    </tbody>
  </table>
</body>
</html>`;
  }

  /**
   * Generate all pending placeholders for a message
   */
  async generateAllForMessage(messageId: string): Promise<any[]> {
    const placeholders = await db('message_placeholders')
      .where('message_id', messageId)
      .where('status', 'pending');
    
    const results = [];
    
    for (const placeholder of placeholders) {
      try {
        const asset = await this.generatePlaceholder(placeholder.id);
        results.push({ success: true, placeholderId: placeholder.id, asset });
      } catch (error: any) {
        results.push({ success: false, placeholderId: placeholder.id, error: error.message });
      }
    }
    
    return results;
  }
}

export const placeholderGenerator = new PlaceholderGeneratorService();
```

### 3.5 Frontend: Placeholder Detection UI

**File**: `frontend/src/components/chat/PlaceholderIndicator.tsx`

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Image, BarChart2, GitBranch, Table2, 
  Play, CheckCircle, AlertCircle, Loader2,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { placeholderApi } from '../../services/api';

interface Placeholder {
  id: string;
  placeholder_type: 'IMAGE' | 'CHART' | 'DIAGRAM' | 'TABLE';
  raw_content: string;
  parsed_content: any;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  asset_id?: string;
  error?: string;
}

interface PlaceholderIndicatorProps {
  placeholders: Placeholder[];
  messageId: string;
}

export default function PlaceholderIndicator({ placeholders, messageId }: PlaceholderIndicatorProps) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: (placeholderId: string) => placeholderApi.generate(placeholderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });

  const generateAllMutation = useMutation({
    mutationFn: () => placeholderApi.generateAll(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    },
  });

  const pendingCount = placeholders.filter(p => p.status === 'pending').length;
  const completedCount = placeholders.filter(p => p.status === 'completed').length;

  const typeIcons = {
    IMAGE: <Image className="w-4 h-4" />,
    CHART: <BarChart2 className="w-4 h-4" />,
    DIAGRAM: <GitBranch className="w-4 h-4" />,
    TABLE: <Table2 className="w-4 h-4" />,
  };

  const statusIcons = {
    pending: <div className="w-2 h-2 rounded-full bg-yellow-400" />,
    generating: <Loader2 className="w-4 h-4 animate-spin text-blue-400" />,
    completed: <CheckCircle className="w-4 h-4 text-green-400" />,
    failed: <AlertCircle className="w-4 h-4 text-red-400" />,
  };

  return (
    <div className="mt-3 border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-3 py-2 bg-white/5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {placeholders.length} Placeholder{placeholders.length !== 1 ? 's' : ''} Detected
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            ({completedCount}/{placeholders.length} generated)
          </span>
        </div>
        
        {pendingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              generateAllMutation.mutate();
            }}
            disabled={generateAllMutation.isPending}
            className="btn-primary text-xs py-1 px-2 flex items-center gap-1"
          >
            {generateAllMutation.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Generate All
          </button>
        )}
      </div>

      {/* Placeholder List */}
      {expanded && (
        <div className="divide-y divide-white/10">
          {placeholders.map((placeholder) => (
            <div key={placeholder.id} className="px-3 py-2 flex items-start gap-3">
              {/* Type Icon */}
              <div className="p-1.5 bg-white/10 rounded">
                {typeIcons[placeholder.placeholder_type]}
              </div>

              {/* Content Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium uppercase text-[var(--text-secondary)]">
                    {placeholder.placeholder_type}
                  </span>
                  {statusIcons[placeholder.status]}
                </div>
                <p className="text-sm text-[var(--text-secondary)] truncate">
                  {placeholder.placeholder_type === 'IMAGE' 
                    ? placeholder.parsed_content?.prompt 
                    : placeholder.raw_content.substring(0, 100)}
                </p>
                {placeholder.error && (
                  <p className="text-xs text-red-400 mt-1">{placeholder.error}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {placeholder.status === 'completed' && placeholder.asset_id && (
                  <a
                    href={`/api/assets/${placeholder.asset_id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    View
                  </a>
                )}
                {placeholder.status === 'pending' && (
                  <button
                    onClick={() => generateMutation.mutate(placeholder.id)}
                    disabled={generateMutation.isPending}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Generate
                  </button>
                )}
                {placeholder.status === 'failed' && (
                  <button
                    onClick={() => generateMutation.mutate(placeholder.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### Phase 3 Deliverables

| Deliverable | Type | Location |
|-------------|------|----------|
| Placeholders migration | New | `backend/src/db/migrations/XXX_create_placeholders.ts` |
| Placeholder parser | New | `backend/src/services/placeholder-parser.service.ts` |
| Placeholder generator | New | `backend/src/services/placeholder-generator.service.ts` |
| Chart service | New | `backend/src/services/chart.service.ts` |
| Diagram service | New | `backend/src/services/diagram.service.ts` |
| Placeholder controller | New | `backend/src/controllers/placeholder.controller.ts` |
| Placeholder routes | New | `backend/src/routes/placeholder.routes.ts` |
| PlaceholderIndicator | New | `frontend/src/components/chat/PlaceholderIndicator.tsx` |
| Message component update | Modified | Show placeholders, inline assets |
| Assets API | New | `backend/src/routes/assets.routes.ts` |

### Phase 3 Acceptance Criteria

- [ ] Placeholders automatically detected in chat messages
- [ ] UI shows detected placeholders with type icons
- [ ] Can generate individual placeholders
- [ ] Can generate all pending placeholders
- [ ] IMAGE placeholders generate via ComfyUI
- [ ] CHART placeholders generate chart images
- [ ] DIAGRAM placeholders generate SVG diagrams
- [ ] TABLE placeholders generate HTML tables
- [ ] Generated assets link back to source message
- [ ] Assets visible in project assets library
- [ ] Failed generations can be retried

---

## Phase 4: Batch Generation

> **Duration**: 1-2 weeks  
> **Priority**: P1  
> **Goal**: Generate multiple variations efficiently

### Overview

Build on the placeholder system to support batch operations:
- Generate multiple seed variations of an image prompt
- Process multiple placeholders in parallel
- Queue and track batch progress

### Key Features

1. **Seed Variations**: Generate N images with different seeds
2. **Prompt Variations**: Queue multiple prompts at once
3. **Batch from Placeholders**: Generate all placeholders in a document
4. **Progress Tracking**: Real-time batch progress via WebSocket

*(Detailed implementation similar to original roadmap Phase 2)*

---

## Phase 5: Assembly & Export

> **Duration**: 1-2 weeks  
> **Priority**: P1  
> **Goal**: Combine text and assets into publishable documents

### Overview

Assemble generated content into final documents:
1. Combine conversation text with generated assets
2. Replace placeholders with actual image/chart references
3. Export to multiple formats

### 5.1 Document Assembly

**Supported Exports**:

| Format | Description | Use Case |
|--------|-------------|----------|
| Markdown | Clean markdown with image links | Further processing |
| HTML | Standalone HTML with embedded images | Web publishing |
| PDF | Formatted PDF document | Print/distribution |
| DOCX | Word document | Client delivery |

### 5.2 Export Service

**File**: `backend/src/services/export.service.ts`

```typescript
class ExportService {
  
  async exportConversation(
    conversationId: string, 
    format: 'markdown' | 'html' | 'pdf' | 'docx',
    options: ExportOptions = {}
  ): Promise<Buffer | string> {
    // Get conversation with messages
    const conversation = await db('conversations')
      .where('id', conversationId)
      .first();
    
    const messages = await db('messages')
      .where('conversation_id', conversationId)
      .orderBy('created_at', 'asc');
    
    // Get placeholders with assets
    const messageIds = messages.map(m => m.id);
    const placeholders = await db('message_placeholders')
      .whereIn('message_id', messageIds)
      .where('status', 'completed');
    
    // Get assets
    const assetIds = placeholders.map(p => p.asset_id).filter(Boolean);
    const assets = await db('project_assets')
      .whereIn('id', assetIds);
    
    // Build asset map
    const assetMap = new Map(assets.map(a => [a.id, a]));
    const placeholderMap = new Map(placeholders.map(p => [p.id, p]));
    
    // Process messages, replacing placeholders with assets
    const processedContent = this.processMessages(messages, placeholderMap, assetMap, options);
    
    // Export to format
    switch (format) {
      case 'markdown':
        return this.exportMarkdown(processedContent, options);
      case 'html':
        return this.exportHtml(processedContent, options);
      case 'pdf':
        return this.exportPdf(processedContent, options);
      case 'docx':
        return this.exportDocx(processedContent, options);
    }
  }

  private processMessages(
    messages: any[], 
    placeholders: Map<string, any>,
    assets: Map<string, any>,
    options: ExportOptions
  ): ProcessedContent {
    // Implementation: walk through messages, find placeholders,
    // replace with asset references or embed assets
  }

  private async exportMarkdown(content: ProcessedContent, options: ExportOptions): Promise<string> {
    // Generate markdown with image references
  }

  private async exportHtml(content: ProcessedContent, options: ExportOptions): Promise<string> {
    // Generate standalone HTML with embedded images (base64)
  }

  private async exportPdf(content: ProcessedContent, options: ExportOptions): Promise<Buffer> {
    // Use puppeteer or similar to generate PDF
  }

  private async exportDocx(content: ProcessedContent, options: ExportOptions): Promise<Buffer> {
    // Use docx library to generate Word document
  }
}
```

### Phase 5 Deliverables

| Deliverable | Type |
|-------------|------|
| Export service | New |
| Export controller/routes | New |
| Export UI (modal with options) | New |
| Document preview | New |
| Format-specific templates | New |

---

## Phase 6: Advanced Features

> **Priority**: P2-P3  
> **Timeline**: Ongoing

### 6.1 Real-Time WebSocket (P2)

- Live generation progress
- Instant status updates
- No polling required

### 6.2 LoRA Support (P2)

- Browse available LoRAs
- Select for image generation
- Save LoRA presets

### 6.3 Scheduling (P3)

- Schedule batch generations
- Nightly processing runs
- Model health checks

### 6.4 Advanced Workflows (P3)

- Image-to-image
- Upscaling
- ControlNet

---

## Database Schema Changes

### New Tables Summary

| Table | Purpose | Phase |
|-------|---------|-------|
| `projects` | Container for all content | 1 |
| `project_knowledge_items` | Uploaded files + analysis | 2 |
| `project_context_versions` | Context history | 2 |
| `message_placeholders` | Extracted placeholders | 3 |
| `project_assets` | Generated assets | 3 |
| `comfyui_batches` | Batch generations | 4 |

### Modified Tables

| Table | Changes | Phase |
|-------|---------|-------|
| `conversations` | Add `project_id` | 1 |
| `comfyui_sessions` | Add `project_id` | 1 |
| `comfyui_generations` | Add `batch_id`, `batch_index` | 4 |

---

## API Additions

### Phase 1: Projects

```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/archive
```

### Phase 2: Knowledge

```
GET    /api/projects/:id/knowledge
POST   /api/projects/:id/knowledge/upload
GET    /api/knowledge/:itemId
DELETE /api/knowledge/:itemId
POST   /api/knowledge/:itemId/reanalyze
POST   /api/projects/:id/knowledge/regenerate-context
```

### Phase 3: Placeholders & Assets

```
GET    /api/messages/:id/placeholders
POST   /api/placeholders/:id/generate
POST   /api/messages/:id/generate-all-placeholders
GET    /api/projects/:id/assets
GET    /api/assets/:id
GET    /api/assets/:id/file
DELETE /api/assets/:id
```

### Phase 5: Export

```
POST   /api/conversations/:id/export
POST   /api/projects/:id/export
GET    /api/exports/:id/download
```

---

## Timeline Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            REVISED TIMELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Week 1-2       Week 3-5        Week 6-7        Week 8-9        Week 10+    │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ┌─────────┐   ┌─────────────┐   ┌───────────┐   ┌─────────┐               │
│  │ Phase 1 │   │   Phase 2   │   │  Phase 3  │   │ Phase 4 │               │
│  │Projects │   │  Knowledge  │   │  Bridge   │   │  Batch  │               │
│  │ 1-2 wks │   │   2-3 wks   │   │  2 wks    │   │ 1-2 wks │               │
│  └─────────┘   └─────────────┘   └───────────┘   └─────────┘               │
│                                                                              │
│                                                    ┌───────────────────────┐ │
│                                                    │      Phase 5-6        │ │
│                                                    │  Export & Advanced    │ │
│                                                    │       Ongoing         │ │
│                                                    └───────────────────────┘ │
│                                                                              │
│  CRITICAL PATH: Phase 1 → Phase 2 → Phase 3                                 │
│  These three phases enable the core content production pipeline             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

Estimated Total: 8-10 weeks for core pipeline (Phases 1-4)
```

---

## Success Metrics

### Phase 1 Complete When:
- Can create projects and organize content within them
- Existing conversations/sessions linkable to projects

### Phase 2 Complete When:
- Can upload images and see LLM analysis
- Project context auto-generates and injects into chats

### Phase 3 Complete When:
- Placeholders detected and displayed in chat
- One-click generation of all asset types
- Assets appear in project library

### Pipeline Complete When:
- Can go from reference images → chat generation → asset realization → export
- Full round-trip in single project context

---

## Appendix: Placeholder Syntax Reference

### IMAGE

```
{{IMAGE: a cyberpunk cityscape at night, neon lights}}

{{IMAGE: 
  prompt: a detailed portrait of a scientist
  negative_prompt: blurry, low quality
  style: photorealistic
  width: 1024
  height: 1024
}}
```

### CHART

```
{{CHART:
  type: line
  title: Model Performance
  xLabel: Epoch
  yLabel: Accuracy
  data:
    - label: GPT-4
      values: [[0, 0.7], [10, 0.85], [20, 0.92]]
    - label: Claude
      values: [[0, 0.65], [10, 0.82], [20, 0.90]]
}}
```

### DIAGRAM

```
{{DIAGRAM:
  type: mermaid
  code: |
    flowchart TD
      A[Input] --> B{Process}
      B -->|Yes| C[Output]
      B -->|No| D[Error]
}}

{{DIAGRAM:
  type: sequence
  code: |
    sequenceDiagram
      User->>API: Request
      API->>DB: Query
      DB-->>API: Results
      API-->>User: Response
}}
```

### TABLE

```
{{TABLE:
  headers: [Feature, Phase 1, Phase 2, Phase 3]
  rows:
    - [Projects, ✓, ✓, ✓]
    - [Knowledge Base, -, ✓, ✓]
    - [Placeholders, -, -, ✓]
}}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 2024 | Initial roadmap (generic personas) |
| 2.0 | Dec 2024 | Revised for content production pipeline |
