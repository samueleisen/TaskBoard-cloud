# TaskBoard Cloud — UI Context & Display Specification

> **Comprehensive documentation of the user interface, visual layout, design system, component hierarchy, interactive states, and screen topologies.**

---

## 📌 Overview

This directory (`ui-context/`) captures the complete visual and display context of the **TaskBoard Cloud** application. It serves as an exhaustive reference for frontend engineers, UI/UX designers, and technical reviewers, detailing every screen, component, modal, drawer, style token, and interaction state.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       TASKBOARD CLOUD FULL-PAGE TOPOLOGY                              │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [NAVBAR]                                                                                               │
│  [■] TaskBoard.cloud   [ Core Engineering ▾ ]  [👥 Members]      [● Local (Cloud Ready)]  [+ New Task]  [SE]│
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [BOARD HEADER & CONTROLS]                                                                              │
│  Cloud Run & SRE Migration                                    [🔍 Search tasks...] [All Priorities ▾]  │
│  Production hardening, budget alerts, and log cost...         [All Members ▾]     [+ Add Task]         │
├────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [KANBAN BOARD GRID]                                                                                    │
│                                                                                                        │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                │
│  │ ● TO DO       [1]│  │ ● IN PROGRESS [1]│  │ ● REVIEW      [1]│  │ ● DONE        [1]│                │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤  ├──────────────────┤                │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │                │
│  │ │ URGENT    > 🗑│ │  │ │ HIGH     < > 🗑│ │  │ │ MEDIUM   < > 🗑│ │  │ │ URGENT    <  🗑│ │                │
│  │ │ Configure    │ │  │ │ Setup 14-Day  │ │  │ │ Verify 1-Cmd   │ │  │ │ Downsize Cloud│ │                │
│  │ │ Budget Alerts│ │  │ │ Log Bucket    │ │  │ │ Rollback       │ │  │ │ SQL from db-  │ │                │
│  │ │ ($5,$10,$20) │ │  │ │ & Exclude /   │ │  │ │ on Cloud Run   │ │  │ │ custom to     │ │                │
│  │ │ 📅 Due in 24h│ │  │ │ health        │ │  │ │ 👤 Alex Cloud  │ │  │ │ db-f1-micro   │ │                │
│  │ │ 👤 Sam Eisen │ │  │ │ 📅 Nov 4      │ │  │ └──────────────┘ │  │ │ 👤 Sam Eisen  │ │                │
│  │ └──────────────┘ │  │ │ 👤 Elena SRE  │ │  │                  │  │ └──────────────┘ │                │
│  │                  │  │ └──────────────┘ │  │                  │  │                  │                │
│  │ + Add Task       │  │ + Add Task       │  │ + Add Task       │  │ + Add Task       │                │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ UI Context Documentation Suite

| Document | Scope & Contents | Source File(s) |
| :--- | :--- | :--- |
| **[01. Design System & Styling](file:///home/sam/Code/TaskBoard-cloud/ui-context/01-design-system-and-styling.md)** | Color palette, light mode humane variables, warm stone surfaces, typography stack (`Plus Jakarta Sans`), shadows, micro-animations, and CSS keyframes. | [`client/src/index.css`](file:///home/sam/Code/TaskBoard-cloud/client/src/index.css) |
| **[02. App Shell & Navigation Bar](file:///home/sam/Code/TaskBoard-cloud/ui-context/02-app-shell-and-navbar.md)** | Visual breakdown of the top navbar: brand logo mark, team switcher, members trigger, pulsing SRE cloud pill, new task CTA, and avatar. | [`client/src/components/Navbar.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/Navbar.tsx) |
| **[03. Board Header & Controls](file:///home/sam/Code/TaskBoard-cloud/ui-context/03-board-header-and-filters.md)** | Sub-header toolbar: board title/description, live search box, priority filter dropdown, assignee filter dropdown, and action buttons. | [`client/src/App.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/App.tsx) |
| **[04. Kanban Board & Columns](file:///home/sam/Code/TaskBoard-cloud/ui-context/04-kanban-board-and-columns.md)** | 4-column responsive grid layout (`To Do`, `In Progress`, `Review`, `Done`), column headers with status dots, dropzones, and column counts. | [`client/src/components/KanbanBoard.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/KanbanBoard.tsx) |
| **[05. Task Card Visual Anatomy](file:///home/sam/Code/TaskBoard-cloud/ui-context/05-task-card-visual-anatomy.md)** | Detailed card anatomy: priority pills, quick-move chevrons (`<` / `>`), quick delete, title/description clamps, due date warning logic, and avatars. | [`client/src/components/TaskCard.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/TaskCard.tsx) |
| **[06. Modals & Dialog Forms](file:///home/sam/Code/TaskBoard-cloud/ui-context/06-modals-and-forms.md)** | Task creation/edit modal and Workspace/Team members management modal with role badges (`Owner`, `Admin`, `Member`, `Viewer`) and invite form. | [`TaskModal.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/TaskModal.tsx), [`TeamModal.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/TeamModal.tsx) |
| **[07. SRE & FinOps Status Drawer](file:///home/sam/Code/TaskBoard-cloud/ui-context/07-sre-and-finops-drawer.md)** | Sliding side drawer displaying compute/DB status, SLA live ping, $6/mo budget gauge with $5/$10/$20 alerts, and cron email reminder simulator. | [`CloudStatusDrawer.tsx`](file:///home/sam/Code/TaskBoard-cloud/client/src/components/CloudStatusDrawer.tsx) |
| **[08. Interaction Flows & State Machine](file:///home/sam/Code/TaskBoard-cloud/ui-context/08-interaction-flows-and-states.md)** | Step-by-step user interaction flows: drag-and-drop moves, filtering, team switching, email reminder trigger, and responsive mobile adaptations. | End-to-end UX |

---

## 🎨 Visual Identity Highlights

1. **Humane & Calmer Canvas**: Warm alabaster canvas (`#fbfaf8`) with crisp white card surfaces (`#ffffff`) and soft stone dividers (`#eae7e1`) providing exceptional readability and zero visual fatigue.
2. **Refined Harmonic Accents**:
   - `Obsidian / Graphite (#18181b)`: Primary brand CTA and crisp typographic contrast.
   - `Sky Blue (#0284c7)`: To Do items & fresh tasks.
   - `Calm Indigo (#4f46e5)`: In Progress column dot.
   - `Warm Amber (#d97706)`: Review column & high-priority pill indicators.
   - `Sage Emerald (#16a34a)`: Done column, healthy SRE cloud probe, and local state pills.
   - `Muted Crimson (#b91c1c)`: Urgent priority pill & critical threshold alerts.
3. **Typography**: Google Fonts pairing — **Plus Jakarta Sans** for clean, humane geometric headings; **Inter** for neutral, legible body copy; **JetBrains Mono** for SRE metrics, SLA latencies, and financial budget figures.
4. **Tactile Micro-Interactions**: Gentle elevation lifts on task cards (`translateY(-2px)`, `--shadow-card-hover`), breathing sage SRE health indicator dots, frosted navbar blur, and smooth editorial drawer slide-ins.
