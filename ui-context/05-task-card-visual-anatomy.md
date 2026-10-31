# 05. Task Card Visual Anatomy Specification

> **Component anatomy, priority badge color hierarchy, quick-move chevrons, due date warning logic, and hover micro-interactions (`TaskCard.tsx`).**

---

## 1. Visual Topology & Card Wireframe

The Task Card is the atomic unit of the Kanban Board. It is engineered with high visual contrast, clear status indicators, and one-click quick actions to allow rapid task updates without opening modals.

```
┌──────────────────────────────────────────────────────────────────┐
│ [TASK CARD: Crisp White Surface, Border: 1px subtle, Radius: 10px]│
│                                                                  │
│  [TOP META ROW]                                                  │
│  ┌──────────┐                            ┌───┐ ┌───┐  ┌───┐      │
│  │ URGENT   │                            │ < │ │ > │  │ 🗑 │      │
│  └──────────┘                            └───┘ └───┘  └───┘      │
│   (Priority Pill)                        (Quick-Move & Actions)  │
│                                                                  │
│  [TITLE]                                                         │
│  Configure 3-Tier Budget Alerts ($5, $10, $20)                   │
│                                                                  │
│  [DESCRIPTION SNIPPET - Clamped to 2 lines]                      │
│  Set up GCP billing budget API with email alert channel to...    │
│                                                                  │
│  [BOTTOM META ROW: Separator Hairline]                           │
│  ──────────────────────────────────────────────────────────────  │
│  📅 Due in 24h                                              ┌──┐ │
│  (Muted Crimson Alert: #b91c1c)                             │SE│ │
│                                                             └──┘ │
│                                                           (Avatar)
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Anatomical Element Breakdown

### 2.1. Priority Badge Hierarchy
Every card displays a monospace uppercase badge in the top-left corner styled according to severity using subtle, calm pastel tints:

| Priority | Pill Text | Background Color | Text Color | Border Color | Visual Semantics |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Urgent** | `URGENT` | `#fef2f2` | `#b91c1c` (Crimson) | `#fecaca` | Critical bugs, billing emergencies, immediate blockers. |
| **High** | `HIGH` | `#fffbeb` | `#b45309` (Amber) | `#fde68a` | Core sprint deliverables, SRE guardrails, backups. |
| **Medium** | `MEDIUM` | `#f1f5f9` | `#475569` (Slate) | `#e2e8f0` | Routine feature development, refactoring, docs. |
| **Low** | `LOW` | `#f8fafc` | `#64748b` (Muted Gray) | `#e2e8f0` | Minor enhancements, backlog ideas, non-urgent chores. |

---

### 2.2. Quick-Action Controls (Top-Right)
To maximize developer velocity, cards feature inline controls that eliminate the need to drag-and-drop or open edit dialogs:
- **Chevron Left (`<`)**: Moves the task backward one column (e.g. from *In Progress* back to *To Do*). Automatically hidden/disabled when the task is in the first column (*To Do*).
- **Chevron Right (`>`)**: Advances the task forward one column (e.g. from *In Progress* to *Review*). Automatically hidden/disabled when the task is in the last column (*Done*).
- **Trashcan Icon (`🗑️`)**: Dispatches an instant delete action (`DELETE /api/v1/tasks/:id`).
- **Event Isolation**: Action buttons execute `e.stopPropagation()` so clicking an arrow moves the card without triggering the card's full-screen edit modal.

---

### 2.3. Title & Description Clamping
- **Title**: High-contrast white (`--text-main`), 0.95rem, 600 semi-bold.
- **Description Preview**: Muted grey (`--text-muted`), 0.8rem, line-height 1.45.
- **2-Line Clamping**: Configured with CSS line clamp to prevent excessively long card heights:
  ```css
  .task-description {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  ```

---

### 2.4. Dynamic Due Date Warning Logic
The card evaluates the deadline in real time against the current clock:

```typescript
const dueTime = new Date(task.dueDate).getTime();
const now = Date.now();
const diffHours = Math.round((dueTime - now) / (1000 * 60 * 60));
```

```
┌───────────────────────────────┬──────────────────────┬──────────────────────┐
│ Due Condition                 │ Displayed Text       │ Styling & Alert Mode │
├───────────────────────────────┼──────────────────────┼──────────────────────┤
│ Overdue (diffHours < 0)       │ 📅 Overdue           │ Bold Red (#f87171)   │
│ Due in ≤ 24 Hours             │ 📅 Due in Xh         │ Bold Rose (#fb7185)  │
│ Future Date (> 24 Hours)      │ 📅 Oct 30 / Nov 4    │ Muted Slate (#94a3b8)│
│ Task Status is 'Done'         │ Standard date        │ Neutral (Completed)  │
│ No Due Date Set               │ (Hidden)             │ None                 │
└───────────────────────────────┴──────────────────────┴──────────────────────┘
```

---

### 2.5. Assignee Avatar
Positioned in the bottom-right corner:
- If assigned: Displays circular profile photo (24px) or 2-letter uppercase initials monogram.
- Tooltip on hover: Displays `"Assigned to <Full Name>"`.
- If unassigned: Displays a faint circular placeholder `--` at 40% opacity.

---

## 3. Hover Micro-Interactions

When the user hovers over a task card:
1. **Vertical Lift**: Moves 2px upwards via `transform: translateY(-2px)`.
2. **Surface Illumination**: Background shifts from `rgba(30, 41, 59, 0.7)` to `rgba(51, 65, 85, 0.8)`.
3. **Border Glow**: Hairline border shifts to indigo `rgba(99, 102, 241, 0.3)`.
4. **Shadow Diffusion**: Expands to `0 4px 16px rgba(0, 0, 0, 0.4)`.
5. **Cursor**: Becomes `pointer`. Clicking anywhere on the card opens the full **Task Edit Modal**.
