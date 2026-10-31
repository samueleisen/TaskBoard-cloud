# 05. Data Model & REST API Specification

> **PostgreSQL DDL schema, memory-optimized indexes, RBAC authorization matrix, and OpenAPI REST API contracts.**

---

## 1. Database Sizing & Connection Budget for `db-f1-micro`

Because Cloud SQL `db-f1-micro` offers only **614 MB of RAM**, database engine settings and application connection pools must be strictly budgeted to prevent PostgreSQL out-of-memory (`OOM`) crashes.

```
                    DATABASE CONNECTION POOL BUDGET
                    
  Cloud SQL db-f1-micro Hard Limit: 30 max connections
  Reserved for SRE / Migrations / Admin: 6 connections
  Allocated for Cloud Run Application: 24 connections
  
  Cloud Run Max Instances: 3 containers
  Formula: 24 total connections ÷ 3 max containers = 8 connections / container
  
  Application Pool Config:
    • pool_min: 1
    • pool_max: 6 (leaves safety buffer)
    • idle_timeout: 10,000 ms
    • connection_timeout: 3,000 ms
```

---

## 2. Complete Relational Database Schema (PostgreSQL 16 DDL)

```sql
-- Enable UUID extension for secure, non-sequential IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- 2. TEAMS / WORKSPACES TABLE
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_owner ON teams(owner_id);

-- 3. TEAM MEMBERSHIPS (RBAC)
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role team_role NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_user ON team_members(user_id);
CREATE INDEX idx_team_members_team ON team_members(team_id);

-- 4. BOARDS TABLE
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_boards_team ON boards(team_id) WHERE is_archived = false;

-- 5. LISTS / COLUMNS TABLE
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    position DOUBLE PRECISION NOT NULL, -- Lexicographical or floating point ordering
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lists_board ON lists(board_id, position);

-- 6. TASKS TABLE
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority task_priority NOT NULL DEFAULT 'medium',
    status task_status NOT NULL DEFAULT 'todo',
    due_date TIMESTAMPTZ,
    position DOUBLE PRECISION NOT NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_board_position ON tasks(board_id, position);
CREATE INDEX idx_tasks_list_position ON tasks(list_id, position);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id) WHERE assignee_id IS NOT NULL;
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE status != 'done';

-- 7. AUDIT & ACTIVITY LOGS
CREATE TABLE task_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL, -- e.g., 'created', 'moved', 'reassigned', 'priority_changed'
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_task ON task_activity_logs(task_id, created_at DESC);

-- 8. EMAIL NOTIFICATION DEDUPLICATION TABLE
CREATE TYPE notification_type AS ENUM ('due_soon_24h', 'overdue', 'assigned');

CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Strict uniqueness prevents duplicate emails for the same task trigger
    CONSTRAINT uq_notification_record UNIQUE (task_id, user_id, notification_type)
);

CREATE INDEX idx_notification_task ON notification_logs(task_id);
```

---

## 3. Email Reminder State Machine & Query Logic

To execute reminders without spamming users, the background worker invokes a **deterministic idempotency query** that checks for tasks due in the next 24 hours without prior delivery records:

```sql
-- Query: Fetch tasks requiring a 24-hour due date reminder
SELECT 
    t.id AS task_id,
    t.title AS task_title,
    t.due_date,
    u.id AS user_id,
    u.email AS user_email,
    u.full_name AS user_name,
    b.name AS board_name,
    tm.name AS team_name
FROM tasks t
JOIN users u ON t.assignee_id = u.id
JOIN boards b ON t.board_id = b.id
JOIN teams tm ON b.team_id = tm.id
LEFT JOIN notification_logs nl 
    ON nl.task_id = t.id 
    AND nl.user_id = u.id 
    AND nl.notification_type = 'due_soon_24h'
WHERE t.status != 'done'
  AND t.due_date IS NOT NULL
  AND t.due_date BETWEEN NOW() AND (NOW() + INTERVAL '24 hours')
  AND nl.id IS NULL -- Guarantees email hasn't been sent yet
LIMIT 50;
```

Upon successful delivery, the worker inserts a record into `notification_logs`. If the task fails to send, no record is inserted, allowing the next 15-minute cron run to retry.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Action / Permission | Owner | Admin | Member | Viewer |
| :--- | :---: | :---: | :---: | :---: |
| Delete Team Workspace | ✅ | ❌ | ❌ | ❌ |
| Manage Team Settings & Billing | ✅ | ✅ | ❌ | ❌ |
| Invite / Remove Team Members | ✅ | ✅ | ❌ | ❌ |
| Create / Archive Boards | ✅ | ✅ | ❌ | ❌ |
| Create / Edit / Move Tasks | ✅ | ✅ | ✅ | ❌ |
| Assign Tasks to Users | ✅ | ✅ | ✅ | ❌ |
| Add Comments & View Activity | ✅ | ✅ | ✅ | ✅ |
| View Boards, Lists, and Cards | ✅ | ✅ | ✅ | ✅ |

---

## 5. REST API Specification

### 5.1. Authentication & Profile Endpoints
All protected endpoints require an `Authorization: Bearer <JWT>` header or a signed HTTP-only cookie (`taskboard_session`).

| Method | Endpoint | Description | Auth Required | Request Body | Response Codes |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account | No | `{"email", "password", "fullName"}` | `201 Created`, `400 Bad Request`, `409 Conflict` |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue token | No | `{"email", "password"}` | `200 OK`, `401 Unauthorized` |
| `GET` | `/api/v1/auth/me` | Fetch active user profile | Yes | None | `200 OK`, `401 Unauthorized` |
| `POST` | `/api/v1/auth/logout` | Invalidate active session | Yes | None | `200 OK` |

### 5.2. Team & Workspace Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response Codes |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/teams` | List all teams user belongs to | Yes | None | `200 OK` |
| `POST` | `/api/v1/teams` | Create new team workspace | Yes | `{"name", "slug"}` | `201 Created`, `400 Bad Request` |
| `GET` | `/api/v1/teams/:id` | Get team details & members | Yes | None | `200 OK`, `403 Forbidden`, `404 Not Found` |
| `POST` | `/api/v1/teams/:id/members` | Invite member to team | Yes (Admin+) | `{"email", "role"}` | `201 Created`, `404 User Not Found` |
| `DELETE` | `/api/v1/teams/:id/members/:userId` | Remove member from team | Yes (Admin+) | None | `200 OK`, `403 Forbidden` |

### 5.3. Boards & Columns Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response Codes |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `GET` | `/api/v1/teams/:teamId/boards` | List active boards in team | Yes | None | `200 OK` |
| `POST` | `/api/v1/teams/:teamId/boards` | Create new board | Yes (Admin+) | `{"name", "description"}` | `201 Created` |
| `GET` | `/api/v1/boards/:id` | Get board, lists & tasks | Yes | None | `200 OK`, `404 Not Found` |
| `POST` | `/api/v1/boards/:id/lists` | Add new column/list | Yes (Member+) | `{"name", "position"}` | `201 Created` |

### 5.4. Task Management Endpoints

| Method | Endpoint | Description | Auth Required | Request Body | Response Codes |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `POST` | `/api/v1/tasks` | Create task in list | Yes (Member+) | `{"boardId", "listId", "title", "description", "priority", "dueDate", "assigneeId"}` | `201 Created` |
| `PATCH` | `/api/v1/tasks/:id` | Update task details | Yes (Member+) | `{"title", "description", "priority", "dueDate", "assigneeId", "status"}` | `200 OK`, `404 Not Found` |
| `PATCH` | `/api/v1/tasks/:id/move` | Reorder task / change list | Yes (Member+) | `{"targetListId", "newPosition"}` | `200 OK` |
| `DELETE` | `/api/v1/tasks/:id` | Delete task | Yes (Member+) | None | `204 No Content` |

### 5.5. Background Job & Health Endpoints

| Method | Endpoint | Description | Auth Required | Security Mechanism |
| :--- | :--- | :--- | :---: | :--- |
| `GET` | `/health` | SLA uptime & DB probe | No | Public (Responds `<10ms`) |
| `POST` | `/api/v1/jobs/send-reminders` | Cron trigger for emails | System | Google OIDC Token / Cloud Tasks header |

---

## 6. Example API Payloads

### `POST /api/v1/tasks` Request Payload
```json
{
  "boardId": "c4b1b9e2-2091-4e92-9594-522f7a08b61c",
  "listId": "7f139e8a-7d46-4e56-b09e-ec80d19f4a91",
  "title": "Configure Cloud Billing Alerts ($5, $10, $20)",
  "description": "Ensure Pub/Sub topic and monitoring notification channels are provisioned via Terraform.",
  "priority": "urgent",
  "dueDate": "2026-10-30T17:00:00Z",
  "assigneeId": "18e90c21-c423-4261-9f93-549b068212dc"
}
```

### `GET /api/v1/boards/:id` Response Payload
```json
{
  "id": "c4b1b9e2-2091-4e92-9594-522f7a08b61c",
  "name": "Cloud SRE Sprint",
  "description": "Production hardening and FinOps tuning",
  "lists": [
    {
      "id": "7f139e8a-7d46-4e56-b09e-ec80d19f4a91",
      "name": "To Do",
      "position": 1000.0,
      "tasks": [
        {
          "id": "d0e19876-4321-4fba-9123-112233445566",
          "title": "Configure Cloud Billing Alerts ($5, $10, $20)",
          "priority": "urgent",
          "status": "todo",
          "dueDate": "2026-10-30T17:00:00Z",
          "position": 1000.0,
          "assignee": {
            "id": "18e90c21-c423-4261-9f93-549b068212dc",
            "fullName": "Sam Eisen",
            "email": "sam@example.com"
          }
        }
      ]
    }
  ]
}
```
