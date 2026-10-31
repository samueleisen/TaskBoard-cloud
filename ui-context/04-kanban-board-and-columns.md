# 04. Kanban Board & Column Layout Specification

> **Grid system architecture, 4-column topology, HTML5 drag-and-drop mechanics, and responsive layouts (`KanbanBoard.tsx`).**

---

## 1. Visual Topology & 4-Column Grid Wireframe

The Kanban Board is the core functional canvas of TaskBoard Cloud. It renders a 4-column workflow pipeline designed around modern software delivery and SRE sprints:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [KANBAN BOARD GRID: CSS Grid 4 Columns, Gap: 1.25rem, Padding: 0 2rem 2rem 2rem, Min-Height: 480px]    │
│                                                                                                        │
│  COLUMN 1: TO DO         COLUMN 2: IN PROGRESS   COLUMN 3: REVIEW        COLUMN 4: DONE                │
│  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐        │
│  │ ● TO DO         [1]│  │ ● IN PROGRESS   [1]│  │ ● REVIEW        [1]│  │ ● DONE          [1]│        │
│  │ (Cyan Dot)         │  │ (Indigo Dot)       │  │ (Amber Dot)        │  │ (Emerald Dot)      │        │
│  ├────────────────────┤  ├────────────────────┤  ├────────────────────┤  ├────────────────────┤        │
│  │ ┌────────────────┐ │  │ ┌────────────────┐ │  │ ┌────────────────┐ │  │ ┌────────────────┐ │        │
│  │ │ TaskCard #1    │ │  │ │ TaskCard #2    │ │  │ │ TaskCard #3    │ │  │ │ TaskCard #4    │ │        │
│  │ └────────────────┘ │  │ └────────────────┘ │  │ └────────────────┘ │  │ └────────────────┘ │        │
│  │                    │  │                    │  │                    │  │                    │        │
│  │ ┌ - - - - - - - -┐ │  │ ┌ - - - - - - - -┐ │  │ ┌ - - - - - - - -┐ │  │ ┌ - - - - - - - -┐ │        │
│  │ : + Add Task     : │  │ : + Add Task     : │  │ : + Add Task     : │  │ : + Add Task     : │        │
│  │ └ - - - - - - - -┘ │  │ └ - - - - - - - -┘ │  │ └ - - - - - - - -┘ │  │ └ - - - - - - - -┘ │        │
│  └────────────────────┘  └────────────────────┘  └────────────────────┘  └────────────────────┘        │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Column Specifications & Status Dots

Each column container is rendered with warm stone backdrop `background: var(--bg-surface-subtle)` (`#f5f3ef`), rounded corners 14px (`--radius-lg`), and soft border `1px solid var(--border-subtle)` (`#eae7e1`).

| Column | Internal Status Code | Header Dot Indicator | Visual Accent Color | Standard SRE Workflow Stage |
| :--- | :--- | :--- | :--- | :--- |
| **To Do** | `todo` | `●` Sky Dot (`.column-dot.todo`) | `#0284c7` (Sky Blue) | Unstarted tasks, new backlog tickets, pending alerts. |
| **In Progress** | `in_progress` | `●` Indigo Dot (`.column-dot.in_progress`) | `#4f46e5` (Calm Indigo) | Actively developing, configuring, or testing. |
| **Review** | `review` | `●` Amber Dot (`.column-dot.review`) | `#d97706` (Warm Amber) | Code review, PR staging verification, audit verification. |
| **Done** | `done` | `●` Sage Dot (`.column-dot.done`) | `#16a34a` (Sage Emerald) | Verified in staging/prod, completed, closed. |

### Column Header Elements
1. **Title & Dot Cluster**:
   - 8px circular status dot with calm harmonic color.
   - Column name in `Plus Jakarta Sans` font, 600 weight, 0.95rem, color `--text-main` (`#18181b`).
2. **Task Count Badge (`.task-count`)**:
   - Crisp white capsule pill with monospace font (`JetBrains Mono`, 0.75rem), subtle stone border `1px solid var(--border-subtle)`.
   - Dynamic counter: reflects exactly how many tasks match the current search/priority filters.
3. **Bottom Dashed Add Button**:
   - Styled with subtle dashed border `border: 1px dashed var(--border-subtle)`, clean hover background `var(--bg-surface)`.
   - Clicking immediately opens the **Task Creation Modal** with this column pre-selected in the dropdown.

---

## 3. HTML5 Drag-and-Drop Interaction Engine

The board implements native HTML5 drag-and-drop with zero third-party library overhead:

```
  [ User drags TaskCard ]
            │
            ▼ (onDragStart)
  DataTransfer.setData('text/plain', taskId)
            │
            ▼ (Drag over Column 2)
  Column executes e.preventDefault() to permit drop
            │
            ▼ (onDrop)
  Target Column intercepts taskId
            │
            ▼
  Dispatches API call: PATCH /api/v1/tasks/:id/move
  { targetListId: "l-progress", newPosition: 1000, newStatus: "in_progress" }
            │
            ▼
  Board state immediately updates; task animates into new column.
```

### Automatic Status Resolution
When dropped into a column, the list name is dynamically mapped to the correct backend status enumeration:
```typescript
const statusMap: Record<string, Task['status']> = {
  'to do': 'todo',
  'in progress': 'in_progress',
  'review': 'review',
  'done': 'done',
};
```

---

## 4. Responsive Viewport Adaptations

The Kanban grid adjusts dynamically to viewport widths using pure CSS Grid:

```css
.kanban-board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
  padding: 0 2rem 2rem 2rem;
  overflow-x: auto;
  align-items: flex-start;
}

/* Tablet Layout (700px - 1100px) */
@media (max-width: 1100px) {
  .kanban-board {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile Layout (< 700px) */
@media (max-width: 700px) {
  .kanban-board {
    grid-template-columns: 1fr;
    padding: 0 1rem 1.5rem 1rem;
  }
}
```

- **Desktop (>1100px)**: 4 equal columns across the entire viewport.
- **Tablet (700px – 1100px)**: 2x2 grid (To Do & In Progress on top; Review & Done below).
- **Mobile (<700px)**: Single stacked column with vertical scrolling.
