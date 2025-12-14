# Phase 1: Projects Foundation - Implementation Files

> Copy these files into your lmspoonfeeder project to implement Phase 1

---

## File 1: Database Migration

**Path**: `backend/src/db/migrations/015_projects.ts`

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // ============================================
    // CREATE PROJECTS TABLE
    // ============================================
    await knex.schema.createTable('projects', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('name', 255).notNullable();
        table.text('description');
        table.text('context_summary'); // Aggregated context for injection into chats
        table.jsonb('settings').defaultTo('{}'); // Project-specific settings
        table.jsonb('placeholder_config').defaultTo(JSON.stringify({
            // Default placeholder syntax configuration
            image: '{{IMAGE: %s}}',
            chart: '{{CHART: %s}}',
            diagram: '{{DIAGRAM: %s}}',
            table: '{{TABLE: %s}}',
        }));
        table.string('status', 20).defaultTo('active'); // active, archived
        table.timestamps(true, true);

        // Indexes
        table.index('status');
        table.index('created_at');
        table.index('updated_at');
    });

    // ============================================
    // ADD project_id TO CONVERSATIONS
    // ============================================
    await knex.schema.alterTable('conversations', (table) => {
        table.uuid('project_id')
            .references('id')
            .inTable('projects')
            .onDelete('SET NULL');
        table.index('project_id');
    });

    // ============================================
    // ADD project_id TO COMFYUI_SESSIONS
    // ============================================
    await knex.schema.alterTable('comfyui_sessions', (table) => {
        table.uuid('project_id')
            .references('id')
            .inTable('projects')
            .onDelete('SET NULL');
        table.index('project_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    // Remove foreign keys first
    await knex.schema.alterTable('comfyui_sessions', (table) => {
        table.dropIndex('project_id');
        table.dropColumn('project_id');
    });

    await knex.schema.alterTable('conversations', (table) => {
        table.dropIndex('project_id');
        table.dropColumn('project_id');
    });

    // Drop projects table
    await knex.schema.dropTableIfExists('projects');
}
```

---

## File 2: Projects Controller

**Path**: `backend/src/controllers/projects.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { NotFoundError, BadRequestError } from '../middleware/error.middleware';

// ============================================
// LIST PROJECTS
// ============================================
export async function listProjects(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const { status = 'active', search } = req.query;

        let query = db('projects')
            .select(
                'projects.*',
                db.raw(`(SELECT COUNT(*) FROM conversations WHERE project_id = projects.id) as conversation_count`),
                db.raw(`(SELECT COUNT(*) FROM comfyui_sessions WHERE project_id = projects.id) as session_count`)
            )
            .orderBy('updated_at', 'desc');

        // Filter by status
        if (status && status !== 'all') {
            query = query.where('status', status);
        }

        // Search by name/description
        if (search) {
            query = query.where(function () {
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

// ============================================
// GET SINGLE PROJECT
// ============================================
export async function getProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const project = await db('projects').where('id', id).first();

        if (!project) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        // Get related counts
        const [conversationCount] = await db('conversations')
            .where('project_id', id)
            .count('* as count');
        const [sessionCount] = await db('comfyui_sessions')
            .where('project_id', id)
            .count('* as count');

        // Get recent conversations
        const recentConversations = await db('conversations')
            .where('project_id', id)
            .orderBy('updated_at', 'desc')
            .limit(5)
            .select('id', 'title', 'provider', 'model', 'updated_at');

        // Get recent sessions
        const recentSessions = await db('comfyui_sessions')
            .where('project_id', id)
            .orderBy('updated_at', 'desc')
            .limit(5)
            .select('id', 'title', 'generation_count', 'updated_at');

        res.json({
            success: true,
            data: {
                ...project,
                stats: {
                    conversations: parseInt(conversationCount.count as string),
                    sessions: parseInt(sessionCount.count as string),
                },
                recentConversations,
                recentSessions,
            },
        });
    } catch (error) {
        next(error);
    }
}

// ============================================
// CREATE PROJECT
// ============================================
export async function createProject(req: Request, res: Response, next: NextFunction) {
    try {
        const db = getDb();
        const { name, description, settings } = req.body;

        if (!name || !name.trim()) {
            throw new BadRequestError('Project name is required');
        }

        const [project] = await db('projects')
            .insert({
                name: name.trim(),
                description: description?.trim() || null,
                settings: settings ? JSON.stringify(settings) : '{}',
            })
            .returning('*');

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
}

// ============================================
// UPDATE PROJECT
// ============================================
export async function updateProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();
        const { name, description, settings, context_summary, status } = req.body;

        // Check exists
        const existing = await db('projects').where('id', id).first();
        if (!existing) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        // Build update object
        const updates: Record<string, any> = {
            updated_at: new Date(),
        };

        if (name !== undefined) {
            if (!name.trim()) {
                throw new BadRequestError('Project name cannot be empty');
            }
            updates.name = name.trim();
        }
        if (description !== undefined) updates.description = description?.trim() || null;
        if (settings !== undefined) updates.settings = JSON.stringify(settings);
        if (context_summary !== undefined) updates.context_summary = context_summary;
        if (status !== undefined) {
            if (!['active', 'archived'].includes(status)) {
                throw new BadRequestError('Status must be "active" or "archived"');
            }
            updates.status = status;
        }

        const [project] = await db('projects')
            .where('id', id)
            .update(updates)
            .returning('*');

        res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
}

// ============================================
// DELETE PROJECT
// ============================================
export async function deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const existing = await db('projects').where('id', id).first();
        if (!existing) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        // Note: ON DELETE SET NULL will handle conversations and sessions
        await db('projects').where('id', id).delete();

        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        next(error);
    }
}

// ============================================
// ARCHIVE PROJECT
// ============================================
export async function archiveProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const [project] = await db('projects')
            .where('id', id)
            .update({
                status: 'archived',
                updated_at: new Date(),
            })
            .returning('*');

        if (!project) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
}

// ============================================
// UNARCHIVE PROJECT
// ============================================
export async function unarchiveProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        const [project] = await db('projects')
            .where('id', id)
            .update({
                status: 'active',
                updated_at: new Date(),
            })
            .returning('*');

        if (!project) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        res.json({ success: true, data: project });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET PROJECT CONVERSATIONS
// ============================================
export async function getProjectConversations(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        // Verify project exists
        const project = await db('projects').where('id', id).first();
        if (!project) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        const conversations = await db('conversations')
            .where('project_id', id)
            .orderBy('updated_at', 'desc');

        res.json({ success: true, data: conversations });
    } catch (error) {
        next(error);
    }
}

// ============================================
// GET PROJECT COMFYUI SESSIONS
// ============================================
export async function getProjectSessions(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params;
        const db = getDb();

        // Verify project exists
        const project = await db('projects').where('id', id).first();
        if (!project) {
            throw new NotFoundError(`Project ${id} not found`);
        }

        const sessions = await db('comfyui_sessions')
            .leftJoin('profiles', 'comfyui_sessions.profile_id', 'profiles.id')
            .select(
                'comfyui_sessions.*',
                'profiles.name as profile_name'
            )
            .where('comfyui_sessions.project_id', id)
            .orderBy('comfyui_sessions.updated_at', 'desc');

        res.json({ success: true, data: sessions });
    } catch (error) {
        next(error);
    }
}

// ============================================
// ASSIGN CONVERSATION TO PROJECT
// ============================================
export async function assignConversationToProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params; // project id
        const { conversationId } = req.body;
        const db = getDb();

        if (!conversationId) {
            throw new BadRequestError('conversationId is required');
        }

        // Verify project exists (or allow null to unassign)
        if (id !== 'null') {
            const project = await db('projects').where('id', id).first();
            if (!project) {
                throw new NotFoundError(`Project ${id} not found`);
            }
        }

        const [conversation] = await db('conversations')
            .where('id', conversationId)
            .update({
                project_id: id === 'null' ? null : id,
                updated_at: new Date(),
            })
            .returning('*');

        if (!conversation) {
            throw new NotFoundError(`Conversation ${conversationId} not found`);
        }

        res.json({ success: true, data: conversation });
    } catch (error) {
        next(error);
    }
}

// ============================================
// ASSIGN SESSION TO PROJECT
// ============================================
export async function assignSessionToProject(req: Request, res: Response, next: NextFunction) {
    try {
        const { id } = req.params; // project id
        const { sessionId } = req.body;
        const db = getDb();

        if (!sessionId) {
            throw new BadRequestError('sessionId is required');
        }

        // Verify project exists (or allow null to unassign)
        if (id !== 'null') {
            const project = await db('projects').where('id', id).first();
            if (!project) {
                throw new NotFoundError(`Project ${id} not found`);
            }
        }

        const [session] = await db('comfyui_sessions')
            .where('id', sessionId)
            .update({
                project_id: id === 'null' ? null : id,
                updated_at: new Date(),
            })
            .returning('*');

        if (!session) {
            throw new NotFoundError(`Session ${sessionId} not found`);
        }

        res.json({ success: true, data: session });
    } catch (error) {
        next(error);
    }
}
```

---

## File 3: Projects Routes

**Path**: `backend/src/routes/projects.routes.ts`

```typescript
import { Router } from 'express';
import {
    listProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    getProjectConversations,
    getProjectSessions,
    assignConversationToProject,
    assignSessionToProject,
} from '../controllers/projects.controller';

const router = Router();

// Project CRUD
router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

// Archive/Unarchive
router.post('/:id/archive', archiveProject);
router.post('/:id/unarchive', unarchiveProject);

// Project contents
router.get('/:id/conversations', getProjectConversations);
router.get('/:id/sessions', getProjectSessions);

// Assign items to project
router.post('/:id/conversations', assignConversationToProject);
router.post('/:id/sessions', assignSessionToProject);

export default router;
```

---

## File 4: Register Routes in Main App

**Update**: `backend/src/index.ts` or `backend/src/routes/index.ts`

Add this import and route registration:

```typescript
import projectsRoutes from './routes/projects.routes';

// ... existing routes ...

app.use('/api/projects', projectsRoutes);
```

---

## File 5: Update Database Controller

**Update**: `backend/src/controllers/database.controller.ts`

Add 'projects' to the ALLOWED_TABLES array:

```typescript
const ALLOWED_TABLES = [
    'provider_settings', 
    'tasks', 
    'results', 
    'profiles', 
    'conversations', 
    'messages', 
    'profile_models', 
    'comfyui_workflows', 
    'comfyui_generations', 
    'comfyui_sessions',
    'projects',  // <-- ADD THIS
];

// Also update TRUNCATE_ORDER (projects should be last since others reference it)
const TRUNCATE_ORDER = [
    'comfyui_generations', 
    'comfyui_sessions', 
    'comfyui_workflows', 
    'messages', 
    'conversations', 
    'profile_models', 
    'results', 
    'tasks', 
    'profiles', 
    'provider_settings',
    'projects',  // <-- ADD THIS (last, since others have FK to it)
];
```

---

## File 6: Frontend Types

**Path**: `frontend/src/types/project.ts`

```typescript
export interface Project {
    id: string;
    name: string;
    description: string | null;
    context_summary: string | null;
    settings: Record<string, any>;
    placeholder_config: {
        image: string;
        chart: string;
        diagram: string;
        table: string;
    };
    status: 'active' | 'archived';
    created_at: string;
    updated_at: string;
    // Computed fields from API
    conversation_count?: number;
    session_count?: number;
}

export interface ProjectWithDetails extends Project {
    stats: {
        conversations: number;
        sessions: number;
    };
    recentConversations: Array<{
        id: string;
        title: string;
        provider: string;
        model: string;
        updated_at: string;
    }>;
    recentSessions: Array<{
        id: string;
        title: string;
        generation_count: number;
        updated_at: string;
    }>;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    settings?: Record<string, any>;
}

export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    settings?: Record<string, any>;
    context_summary?: string;
    status?: 'active' | 'archived';
}
```

---

## File 7: Frontend API Service

**Path**: `frontend/src/api/projects.ts`

```typescript
import type { 
    Project, 
    ProjectWithDetails, 
    CreateProjectRequest, 
    UpdateProjectRequest 
} from '../types/project';

const API_BASE = 'http://localhost:3001/api';

// List all projects
export async function fetchProjects(status: string = 'active'): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects?status=${status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch projects');
    return data.data;
}

// Get single project with details
export async function fetchProject(id: string): Promise<ProjectWithDetails> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch project');
    return data.data;
}

// Create project
export async function createProject(project: CreateProjectRequest): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to create project');
    return data.data;
}

// Update project
export async function updateProject(id: string, updates: UpdateProjectRequest): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update project');
    return data.data;
}

// Delete project
export async function deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete project');
}

// Archive project
export async function archiveProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/archive`, {
        method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to archive project');
    return data.data;
}

// Unarchive project
export async function unarchiveProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}/unarchive`, {
        method: 'POST',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to unarchive project');
    return data.data;
}

// Assign conversation to project
export async function assignConversationToProject(
    projectId: string | null, 
    conversationId: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId || 'null'}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to assign conversation');
}

// Assign session to project
export async function assignSessionToProject(
    projectId: string | null, 
    sessionId: string
): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${projectId || 'null'}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to assign session');
}
```

---

## File 8: Project Context (React)

**Path**: `frontend/src/context/ProjectContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchProjects } from '../api/projects';
import type { Project } from '../types/project';

interface ProjectContextType {
    currentProjectId: string | null;
    currentProject: Project | null;
    projects: Project[];
    isLoading: boolean;
    setCurrentProjectId: (id: string | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = 'spoonfeeder_current_project';

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [currentProjectId, setCurrentProjectIdState] = useState<string | null>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem(STORAGE_KEY);
        }
        return null;
    });

    // Fetch all projects
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => fetchProjects('active'),
    });

    // Find current project from list
    const currentProject = projects.find(p => p.id === currentProjectId) || null;

    // Persist to localStorage
    const setCurrentProjectId = (id: string | null) => {
        setCurrentProjectIdState(id);
        if (id) {
            localStorage.setItem(STORAGE_KEY, id);
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    // Clear invalid project ID if project no longer exists
    useEffect(() => {
        if (currentProjectId && !isLoading && projects.length > 0) {
            const exists = projects.some(p => p.id === currentProjectId);
            if (!exists) {
                setCurrentProjectId(null);
            }
        }
    }, [currentProjectId, projects, isLoading]);

    return (
        <ProjectContext.Provider
            value={{
                currentProjectId,
                currentProject,
                projects,
                isLoading,
                setCurrentProjectId,
            }}
        >
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

---

## File 9: Project Selector Component

**Path**: `frontend/src/components/layout/ProjectSelector.tsx`

```typescript
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    ChevronDown, Plus, Folder, FolderOpen, 
    Archive, Settings, X, Check 
} from 'lucide-react';
import { useProject } from '../../context/ProjectContext';
import { createProject } from '../../api/projects';
import toast from 'react-hot-toast';

export default function ProjectSelector() {
    const { currentProjectId, currentProject, projects, setCurrentProjectId } = useProject();
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectDescription, setNewProjectDescription] = useState('');
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: () => createProject({ 
            name: newProjectName, 
            description: newProjectDescription || undefined 
        }),
        onSuccess: (project) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setCurrentProjectId(project.id);
            setShowCreateModal(false);
            setNewProjectName('');
            setNewProjectDescription('');
            toast.success(`Project "${project.name}" created`);
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handleCreate = () => {
        if (!newProjectName.trim()) {
            toast.error('Project name is required');
            return;
        }
        createMutation.mutate();
    };

    return (
        <div className="relative">
            {/* Selector Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] hover:bg-white/10 transition-colors w-full text-left"
            >
                {currentProject ? (
                    <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                ) : (
                    <Folder className="w-4 h-4 text-[var(--text-secondary)] flex-shrink-0" />
                )}
                <span className="flex-1 truncate text-sm">
                    {currentProject?.name || 'No Project'}
                </span>
                <ChevronDown 
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    
                    {/* Menu */}
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--surface)] rounded-lg shadow-xl border border-white/10 z-50 overflow-hidden">
                        {/* No Project Option */}
                        <button
                            onClick={() => {
                                setCurrentProjectId(null);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm ${
                                !currentProjectId ? 'bg-indigo-500/20 text-indigo-300' : ''
                            }`}
                        >
                            <Folder className="w-4 h-4" />
                            <span>No Project</span>
                            {!currentProjectId && <Check className="w-4 h-4 ml-auto" />}
                        </button>

                        {projects.length > 0 && (
                            <div className="border-t border-white/10" />
                        )}

                        {/* Project List */}
                        <div className="max-h-64 overflow-y-auto">
                            {projects.map((project) => (
                                <button
                                    key={project.id}
                                    onClick={() => {
                                        setCurrentProjectId(project.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-sm ${
                                        project.id === currentProjectId ? 'bg-indigo-500/20 text-indigo-300' : ''
                                    }`}
                                >
                                    <FolderOpen className="w-4 h-4 text-indigo-400" />
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="truncate">{project.name}</div>
                                        <div className="text-xs text-[var(--text-secondary)]">
                                            {project.conversation_count || 0} chats · {project.session_count || 0} sessions
                                        </div>
                                    </div>
                                    {project.id === currentProjectId && (
                                        <Check className="w-4 h-4 flex-shrink-0" />
                                    )}
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
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 text-indigo-400 text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Project</span>
                        </button>
                    </div>
                </>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--surface)] rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">Create Project</h2>
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Name <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newProjectName}
                                    onChange={(e) => setNewProjectName(e.target.value)}
                                    placeholder="My Project"
                                    className="w-full px-3 py-2 bg-[var(--bg-darker)] rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newProjectDescription}
                                    onChange={(e) => setNewProjectDescription(e.target.value)}
                                    placeholder="Optional description..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-[var(--bg-darker)] rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !newProjectName.trim()}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

## File 10: Update App.tsx to Include Provider

**Update**: `frontend/src/App.tsx`

Wrap your app with the ProjectProvider:

```typescript
import { ProjectProvider } from './context/ProjectContext';

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ProjectProvider>
                {/* Your existing app content */}
                <Router>
                    {/* routes */}
                </Router>
            </ProjectProvider>
        </QueryClientProvider>
    );
}
```

---

## File 11: Update Sidebar to Include Project Selector

**Update**: `frontend/src/components/layout/Sidebar.tsx`

Add the ProjectSelector to your sidebar:

```typescript
import ProjectSelector from './ProjectSelector';

export default function Sidebar() {
    return (
        <aside className="...">
            {/* Add near the top of the sidebar */}
            <div className="p-3 border-b border-white/10">
                <ProjectSelector />
            </div>
            
            {/* Rest of sidebar content */}
        </aside>
    );
}
```

---

## Implementation Checklist

### Backend
- [ ] Create `backend/src/db/migrations/015_projects.ts`
- [ ] Create `backend/src/controllers/projects.controller.ts`
- [ ] Create `backend/src/routes/projects.routes.ts`
- [ ] Update `backend/src/index.ts` to register routes
- [ ] Update `backend/src/controllers/database.controller.ts` (ALLOWED_TABLES)
- [ ] Run migration: `npx knex migrate:latest`

### Frontend
- [ ] Create `frontend/src/types/project.ts`
- [ ] Create `frontend/src/api/projects.ts`
- [ ] Create `frontend/src/context/ProjectContext.tsx`
- [ ] Create `frontend/src/components/layout/ProjectSelector.tsx`
- [ ] Update `frontend/src/App.tsx` to wrap with `ProjectProvider`
- [ ] Update `frontend/src/components/layout/Sidebar.tsx` to include selector

### Test
- [ ] Create a project via UI
- [ ] Switch between projects
- [ ] Verify project persists on page reload
- [ ] Create conversation with project selected (verify `project_id` set)
- [ ] Create ComfyUI session with project selected (verify `project_id` set)

---

## Next Steps After Phase 1

Once this is working:

1. **Filter views by project**: Update Conversations and ComfyUI pages to filter by `currentProjectId`
2. **Project Dashboard page**: Create `/projects/:id` route showing project details
3. **Assign existing items**: UI to move existing conversations/sessions into projects

Then proceed to **Phase 2: Knowledge Base**.
