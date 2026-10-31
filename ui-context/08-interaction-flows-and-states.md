# 08. Interaction Flows & State Transitions Specification

> **End-to-end user journeys, event handling, drag-and-drop mechanics, filtering state machines, and edge case behaviors.**

---

## 1. Interaction Flow Overview

TaskBoard Cloud is designed around **optimistic, low-latency UI responsiveness**. All user interactions (moving cards, filtering, switching teams, creating tasks) take effect immediately in the user interface, backed by asynchronous network persistence.

```
                    CORE USER INTERACTION LOOPS
                    
  [ 1. Board Navigation ] ──> Select Team ──> Fetch Board ──> Render 4 Columns
                                                                   │
  [ 2. Task Lifecycle ]   ──> Create Task ──> Drag/Move ──> Edit ──> Complete
                                                                   │
  [ 3. Query & Filter ]   ──> Search Text ──> Priority ──> Assignee (Instant)
                                                                   │
  [ 4. SRE Telemetry ]    ──> Cloud Pill ──> Ping SLA ──> Trigger Reminders
```

---

## 2. Detailed End-to-End User Journeys

### Flow 1: First-Time Local Boot (Zero-Config Onboarding)
1. **Action**: The developer or evaluator runs `npm run dev` and opens `http://localhost:5173`.
2. **System State**:
   - The application detects that no PostgreSQL instance or GCP project is configured.
   - The storage engine automatically mounts the **Local In-Memory Store**.
   - Seeds 3 users (*Samuele Eisen*, *Alex Cloud*, *Elena SRE*) and 2 workspaces (*Core Engineering*, *DevOps & FinOps*).
   - Provisions the primary board: *"Cloud Run & SRE Migration"* with 4 pre-seeded tasks across *To Do*, *In Progress*, *Review*, and *Done*.
3. **Display Result**: The user is immediately greeted by a populated, fully functioning Kanban board with a green pulsing pill: `● Local (Cloud Ready)`. Zero setup or configuration is required.

---

### Flow 2: Creating a Task & Moving Across Columns
1. **Creation Trigger**:
   - The user clicks **+ New Task** in the navbar (or clicks **+ Add Task** at the bottom of the *To Do* column).
2. **Modal Open**:
   - The **Task Creation Modal** appears with a smooth spring animation (`slideUp`).
   - The cursor autofocuses on the **Task Title** field.
   - The Column dropdown pre-selects the column where the user clicked "+ Add Task".
3. **Form Submission**:
   - User inputs title: *"Set up Cloud Armor DDoS rate limiting"*.
   - Selects Priority: `High`.
   - Selects Due Date and Assignee.
   - Clicks **Create Task**.
4. **Immediate UI Update**:
   - The modal closes.
   - The card appears in the *To Do* column.
   - The column task counter increments from `[1]` to `[2]`.
5. **Moving the Task (Two Available Methods)**:
   - **Method A (Drag & Drop)**: The user clicks and drags the card across to *In Progress*. The dropzone captures the task ID, fires `PATCH /api/v1/tasks/:id/move`, and relocates the card.
   - **Method B (One-Click Quick Move)**: The user clicks the right chevron arrow (`>`) on the card header. The task immediately shifts to *In Progress* without drag-and-drop.

---

### Flow 3: Editing and Deleting Tasks
1. **Editing**:
   - Clicking anywhere on a card's body opens the **Task Edit Modal**.
   - All fields (title, description, column, priority, due date, assignee) are pre-populated.
   - Modifying fields and clicking **Save Changes** updates the card instantly.
2. **Deleting**:
   - Clicking the trashcan icon (`🗑️`) on the card header executes an isolated event (`e.stopPropagation()`).
   - Dispatches `DELETE /api/v1/tasks/:id`.
   - The card is removed from the DOM, and the column count badge decrements.

---

### Flow 4: Workspace Switching & Member Invitations
1. **Switching Workspaces**:
   - The user selects the team dropdown in the navbar and switches from *"Core Engineering"* to *"DevOps & FinOps"*.
   - React state re-binds: the board title changes to *"DevOps & FinOps Board"*, columns reload, and team-specific tasks render.
2. **Inviting Members**:
   - Clicking the **Members** button opens the **Team Modal**.
   - The modal displays current members with their role badges (`Owner`, `Admin`, `Member`, `Viewer`).
   - The user enters an email (e.g. `lead@example.com`), selects the role `Admin`, and clicks **Invite**.
   - The member is added to the active list immediately.

---

### Flow 5: Live Filtering & Instant Querying
1. **Search Query**:
   - The user types `"budget"` in the search box.
   - Tasks in *In Progress* and *Review* that do not contain the term `"budget"` fade from view.
   - Only the matching card (*"Configure 3-Tier Budget Alerts"*) in *To Do* remains visible.
2. **Priority Filtering**:
   - Selecting `Urgent` from the priority dropdown hides all Medium, Low, and High tasks.
3. **Assignee Filtering**:
   - Selecting *Elena SRE* filters the entire board to show only tasks assigned to Elena.
4. **Combined Queries**:
   - All filters operate simultaneously. Clearing the search box or resetting dropdowns to `All` restores all cards instantly without reloading the page.

---

### Flow 6: Simulating the SRE Email Reminder Worker
1. **Opening Inspector**:
   - The user clicks the **Cloud Status pill** in the navbar.
   - The **SRE & FinOps Status Drawer** slides in from the right edge.
2. **Testing Health SLA**:
   - Clicks **Ping SLA**: measures live latency (<10ms) and displays uptime.
3. **Simulating the Email Job**:
   - Clicks **Trigger Email Reminder Job** (`POST /api/v1/jobs/send-reminders`).
   - A spinning loader indicates execution.
   - The server queries tasks due in the next 24 hours (such as Task #1: *"Configure 3-Tier Budget Alerts"*, due tomorrow).
   - Generates and dispatches the email notification.
   - Renders the full JSON execution payload in the drawer's output terminal:
     `{"scanned": 1, "dispatched": 1, "recipientEmail": "sam@taskboard.cloud", "status": "simulated"}`.
4. **Verifying Idempotency & Deduplication**:
   - Clicking the trigger button a second time returns `{"scanned": 0, "dispatched": 0}`.
   - This proves the database deduplication table (`notification_logs`) works and prevents duplicate spam emails.

---

## 3. Empty States & Error Resilience

- **Empty Column**: If all tasks are moved out of a column, the column maintains its minimum height (480px) and displays the dashed "+ Add Task" button, remaining a valid dropzone.
- **Empty Filter Search**: If a search query yields no matches, columns display zero cards, and task counters reflect `[0]`.
- **Network Resiliency**: If the backend server is temporarily paused, the frontend displays clear fallback messages without unhandled exceptions or broken layouts.
