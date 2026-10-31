# 03. Board Header & Controls Toolbar Specification

> **Component architecture, search and filtering mechanics, and action controls of the board header toolbar (`App.tsx`).**

---

## 1. Visual Topology & Toolbar Wireframe

The Board Header sits immediately below the navbar. It provides context on the currently selected board (title, sprint goals) and houses the live filtering and query controls.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [BOARD HEADER: Padding: 1.5rem 2rem 1rem 2rem, Display: flex, Justify: space-between, Wrap: wrap]     │
│                                                                                                        │
│  [LEFT: BOARD INFO]                                     [RIGHT: QUERY & FILTER CONTROLS]               │
│  Cloud Run & SRE Migration                              ┌───────────────────┐ ┌────────────────┐       │
│  Production hardening, budget alerts, and log cost...   │🔍 Search tasks... │ │All Priorities ▾│       │
│                                                         └───────────────────┘ └────────────────┘       │
│                                                         ┌────────────────┐ ┌──────────────┐            │
│                                                         │All Members    ▾│ │+ Add Task    │            │
│                                                         └────────────────┘ └──────────────┘            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Element Breakdown & Detailed Specifications

### 2.1. Board Title & Purpose Description
- **Title (`h1`)**:
  - Typography: `Plus Jakarta Sans`, 700 weight, 1.5rem, `-0.02em` tracking, color `--text-main` (`#18181b`).
  - Value: Displays active board name (e.g., *"Cloud Run & SRE Migration"* or *"Main TaskBoard"*).
- **Description Paragraph (`.board-description`)**:
  - Typography: `Inter`, 400 weight, 0.875rem, color `--text-muted` (`#5e5d59`).
  - Margin: `0.25rem` top offset.
  - Value: Explains board goals (e.g., *"Production hardening, budget alerts, and log cost optimization"*).

---

### 2.2. Real-Time Search Box (`.search-box`)
- **Container**: 220px width, rounded white input box (`--bg-surface`), `1px solid var(--border-subtle)` (`#eae7e1`), subtle shadow `var(--shadow-xs)`.
- **Icon**: `Search` SVG icon (15px) in muted stone (`--text-dim`, `#94918a`).
- **Input Field**:
  - Placeholder: `"Search tasks..."`.
  - Type: Text input with transparent background and crisp graphite text (`--text-main`).
- **Filtering Logic**: Evaluated live on every keystroke (`onChange`). A card matches if the query substring exists in either the task title **OR** the task description (case-insensitive):
  ```typescript
  const q = searchQuery.toLowerCase();
  const matchTitle = task.title.toLowerCase().includes(q);
  const matchDesc = task.description?.toLowerCase().includes(q);
  ```

---

### 2.3. Priority Filter Select (`.filter-select`)
- **Visual Design**: Sleek select element styled to match the light theme with crisp border `var(--border-subtle)` and subtle shadow.
- **Options**:
  - `All Priorities` (Default: passes all tasks)
  - `Urgent` (Filters only tasks flagged with urgent pill tint)
  - `High` (Filters only tasks flagged with amber high pill tint)
  - `Medium` (Filters only tasks flagged with calm slate pill tint)
  - `Low` (Filters only tasks flagged with subtle gray pill tint)

---

### 2.4. Assignee Filter Select (`.filter-select`)
- **Visual Design**: Identical styling to priority select.
- **Options**:
  - `All Members` (Default: passes all tasks)
  - Dynamically populated from the workspace user list (e.g., *Samuele Eisen*, *Alex Cloud*, *Elena SRE*).
- **Filtering Logic**: Evaluates `task.assigneeId === selectedUserId`.

---

### 2.5. Secondary "+ Add Task" Action Button
- **Styling**: Primary gradient button (`.btn-primary`).
- **Purpose**: Provides quick access to task creation directly from the toolbar without having to scroll down to a specific column's bottom button.

---

## 3. Filter Combination & Real-Time Recalculation

All three filter criteria (Search Text, Priority, and Assignee) are combined using **logical AND (`&&`)** inside a React `useMemo` hook:

```
  Task Candidate
        │
        ├── Passes Search Query? (title or description contains text)
        │         │ (Yes)
        ├── Passes Priority Filter? (priority === filter || filter === 'all')
        │         │ (Yes)
        └── Passes Assignee Filter? (assigneeId === filter || filter === 'all')
                  │ (Yes)
                  ▼
          [ Task Rendered in Column ]
```

### Dynamic Column Count Badges
When filters are applied, the task count badge on each column header (e.g. `[1]` or `[0]`) immediately recalculates to reflect the number of tasks currently matching the filter, providing immediate visual feedback.
