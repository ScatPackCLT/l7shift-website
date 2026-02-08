# ShiftBoard Agent API

The Agent API enables Claude Code agents to participate in the SymbAIotic workflow by claiming tasks, logging work, and completing assignments.

## Overview

This API provides endpoints for:
- **Agent Registration** - Register new Claude Code instances
- **Task Discovery** - Find available tasks suitable for AI work
- **Task Claiming** - Claim a task for work
- **Work Logging** - Log time and progress on tasks
- **Task Completion** - Mark tasks ready for human review
- **Project Context** - Get full context for starting work

## Setup

### 1. Database Migration

Run the SQL migration in Supabase SQL Editor:

```bash
# Location: src/app/api/agent/migrations/001_agent_tables.sql
```

This creates:
- `agents` table
- `time_entries` table
- New columns on `tasks` table (`work_type`, `agent_id`, etc.)
- Views for monitoring

### 2. Environment Variables

Ensure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## API Endpoints

### Register Agent

```http
POST /api/agent/register
```

Register a new Claude Code agent instance.

**Request:**
```json
{
  "name": "claude-code-main",
  "description": "Primary development agent",
  "capabilities": ["frontend", "backend", "testing"],
  "session_id": "optional-session-id",
  "metadata": { "model": "claude-3-opus" }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent registered successfully",
  "data": {
    "agent_id": "550e8400-e29b-41d4-a716-446655440000",
    "agent": { ... }
  }
}
```

---

### Get Available Tasks

```http
GET /api/agent/tasks/available
```

Returns tasks available for agents to claim.

**Query Parameters:**
- `project_id` (optional) - Filter to specific project
- `priority` (optional) - Filter by priority: urgent, high, medium, low
- `limit` (optional) - Number of results (default: 20, max: 50)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": "task-uuid",
      "project_id": "project-uuid",
      "title": "Implement user authentication",
      "description": "Add login/logout functionality...",
      "status": "backlog",
      "priority": "high",
      "work_type": "ai_suitable",
      "shift_hours": 2,
      "requirements": { ... },
      "acceptance_criteria": ["Users can login", "Sessions persist"],
      "project": {
        "id": "project-uuid",
        "name": "Client Portal",
        "client_name": "Acme Corp"
      }
    }
  ]
}
```

---

### Claim Task

```http
POST /api/agent/tasks/{id}/claim
```

Claim a task to start working on it.

**Request:**
```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "optional-session-id",
  "notes": "Starting work on authentication feature"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task claimed successfully",
  "data": {
    "task": { ... },
    "time_entry_id": "entry-uuid",
    "claimed_at": "2026-02-08T12:00:00Z"
  }
}
```

**Error Cases:**
- 404: Task not found
- 409: Task already claimed by another agent
- 400: Task cannot be claimed (shipped/icebox)

---

### Log Work

```http
POST /api/agent/tasks/{id}/log
```

Log work done on a task.

**Request:**
```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "duration_minutes": 30,
  "notes": "Implemented login form and validation",
  "files_modified": [
    "src/components/LoginForm.tsx",
    "src/lib/auth.ts"
  ],
  "commit_hash": "abc123",
  "entry_type": "work"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Work logged successfully",
  "data": {
    "time_entry": { ... },
    "duration_minutes": 30,
    "hours_logged": 0.5
  }
}
```

---

### Get Task Time Entries

```http
GET /api/agent/tasks/{id}/log
```

Get all time entries for a task.

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [ ... ],
    "total_minutes": 120,
    "total_hours": 2
  }
}
```

---

### Complete Task

```http
POST /api/agent/tasks/{id}/complete
```

Mark a task as complete (sends to human review).

**Request:**
```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "notes": "Feature complete. All acceptance criteria met.",
  "files_modified": [
    "src/components/LoginForm.tsx",
    "src/lib/auth.ts",
    "src/app/login/page.tsx"
  ],
  "commit_hash": "def456",
  "pull_request_url": "https://github.com/org/repo/pull/123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed and sent to review",
  "data": {
    "task": { ... },
    "total_time_minutes": 120,
    "total_time_hours": 2,
    "files_modified": [ ... ],
    "completion_metadata": {
      "completed_by_agent": "agent-uuid",
      "claimed_at": "...",
      "completed_at": "..."
    }
  }
}
```

---

### Get Project Context

```http
GET /api/agent/context/{projectId}
```

Get full project context for starting work.

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "project-uuid",
      "name": "Client Portal",
      "client_name": "Acme Corp",
      "description": "Customer-facing portal...",
      "status": "active"
    },
    "client": { ... },
    "current_sprint": { ... },
    "requirements": [
      { "title": "Authentication", "content": "..." }
    ],
    "tasks": {
      "available": [ ... ],
      "active": [ ... ],
      "review": [ ... ],
      "shipped": [ ... ],
      "backlog": [ ... ]
    },
    "task_summary": {
      "total": 25,
      "available_for_agents": 8,
      "active": 2,
      "in_review": 3,
      "shipped": 10
    },
    "code_context": {
      "files_touched": ["src/...", "..."],
      "likely_directories": ["src/components", "src/lib"]
    }
  }
}
```

---

### Heartbeat

```http
POST /api/agent/heartbeat
```

Send periodic heartbeat while working.

**Request:**
```json
{
  "agent_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active",
  "current_task_id": "task-uuid",
  "session_id": "session-id"
}
```

---

## Using from Claude Code

### Bash Examples

```bash
# Set API base URL
API_BASE="https://l7shift.com/api/agent"

# 1. Register agent
curl -X POST "$API_BASE/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "claude-code-session-123",
    "description": "Development session",
    "capabilities": ["typescript", "react", "nextjs"]
  }'

# Save the agent_id from response
AGENT_ID="550e8400-e29b-41d4-a716-446655440000"

# 2. Get available tasks
curl "$API_BASE/tasks/available?priority=high&limit=5"

# 3. Get project context before starting
curl "$API_BASE/context/PROJECT_ID_HERE"

# 4. Claim a task
curl -X POST "$API_BASE/tasks/TASK_ID_HERE/claim" \
  -H "Content-Type: application/json" \
  -d "{\"agent_id\": \"$AGENT_ID\"}"

# 5. Log work periodically
curl -X POST "$API_BASE/tasks/TASK_ID_HERE/log" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"$AGENT_ID\",
    \"duration_minutes\": 30,
    \"notes\": \"Implemented feature X\",
    \"files_modified\": [\"src/file.ts\"]
  }"

# 6. Complete task
curl -X POST "$API_BASE/tasks/TASK_ID_HERE/complete" \
  -H "Content-Type: application/json" \
  -d "{
    \"agent_id\": \"$AGENT_ID\",
    \"notes\": \"Feature complete\",
    \"files_modified\": [\"src/file.ts\"],
    \"commit_hash\": \"abc123\"
  }"
```

### Recommended Workflow

1. **Start of Session:**
   - Register agent with `/api/agent/register`
   - Get available tasks with `/api/agent/tasks/available`
   - Get project context with `/api/agent/context/{projectId}`

2. **Working on Task:**
   - Claim task with `/api/agent/tasks/{id}/claim`
   - Send heartbeats every 5 minutes with `/api/agent/heartbeat`
   - Log work incrementally with `/api/agent/tasks/{id}/log`

3. **Completing Task:**
   - Complete with `/api/agent/tasks/{id}/complete`
   - Include all files modified and any PR URL
   - Task moves to 'review' status for human verification

4. **Repeat:**
   - Get next available task
   - Continue until session ends

## Task Work Types

Tasks have a `work_type` field:
- `ai_suitable` - Fully appropriate for agent work
- `hybrid` - May need human input at points
- `human_only` - Not suitable for agents

The available tasks endpoint filters for `ai_suitable` tasks and `backlog` tasks.

## Status Flow

```
backlog -> active (claimed) -> review (completed) -> shipped (human approved)
```

Agents can only move tasks to `review`. Humans approve and move to `shipped`.

## Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Description of error",
  "details": { ... }
}
```

Common HTTP status codes:
- 400 - Bad request (validation error)
- 403 - Forbidden (task not owned by agent)
- 404 - Not found
- 409 - Conflict (task already claimed)
- 500 - Server error

## Monitoring

Use these Supabase views for monitoring:
- `active_agents` - Currently active agent sessions
- `available_agent_tasks` - Tasks ready for agents
- `agent_metrics` - Productivity statistics

```sql
SELECT * FROM active_agents;
SELECT * FROM available_agent_tasks LIMIT 10;
SELECT * FROM agent_metrics;
```

---

*ShiftBoard Agent API - Enabling SymbAIotic workflow for L7 Shift*
