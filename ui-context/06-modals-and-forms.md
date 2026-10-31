# 06. Modals & Dialog Forms Specification

> **Dialog architecture, form controls, field validations, and user workflows for `TaskModal.tsx` and `TeamModal.tsx`.**

---

## 1. Shared Modal Architecture & Backdrop

All dialog windows in TaskBoard Cloud share a unified overlay and container architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│ [MODAL OVERLAY: Inset: 0, Background: rgba(24, 24, 27, 0.45), Blur: 6px]│
│                                                                        │
│         ┌────────────────────────────────────────────────────┐         │
│         │ [MODAL CONTENT: Background: #ffffff, Radius: 16px] │         │
│         │                                                    │         │
│         │  MODAL HEADER                           [ × CLOSE ]│         │
│         │  ────────────────────────────────────────────────  │         │
│         │  FORM BODY & INPUT FIELDS                          │         │
│         │                                                    │         │
│         │  ────────────────────────────────────────────────  │         │
│         │  MODAL FOOTER: [ Cancel ]     [ Primary Action ]   │         │
│         └────────────────────────────────────────────────────┘         │
└────────────────────────────────────────────────────────────────────────┘
```

- **Backdrop Blur**: `backdrop-filter: blur(6px)` softly blurs the background board content to isolate user focus.
- **Organic Motion**: The overlay fades in via `@keyframes fadeIn (0.15s)`, and the container springs upward via `@keyframes slideUp (0.2s cubic-bezier(0.16, 1, 0.3, 1))`.
- **Dismissal**: Clicking outside the container or pressing the `X` button closes the dialog without side-effects.

---

## 2. Task Modal (`TaskModal.tsx`)

Used for both **creating new tasks** and **editing existing tasks**.

```
┌──────────────────────────────────────────────────────────────────┐
│ Create New Task (or Edit Task)                          [ × ]    │
├──────────────────────────────────────────────────────────────────┤
│ Task Title *                                                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ e.g. Set up Cloud Billing Alert                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Description                                                      │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Add implementation details or acceptance criteria...         │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│ │ Column                      │  │ Priority                    │ │
│ │ [ To Do                   ▾]│  │ [ Medium                  ▾]│ │
│ └─────────────────────────────┘  └─────────────────────────────┘ │
│                                                                  │
│ ┌─────────────────────────────┐  ┌─────────────────────────────┐ │
│ │ Due Date                    │  │ Assignee                    │ │
│ │ [ mm/dd/yyyy              📅]│  │ [ Samuele Eisen          ▾]│ │
│ └─────────────────────────────┘  └─────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                                  [ Cancel ]    [ Create Task ]   │
└──────────────────────────────────────────────────────────────────┘
```

### Form Fields & Validation
1. **Task Title (`*` Required)**:
   - Input: Text input, autofocuses on modal open.
   - Placeholder: `"e.g. Set up Cloud Billing Alert"`.
   - Validation: Submission is blocked if title is empty or contains only whitespace.
2. **Description (Optional)**:
   - Input: Multi-line textarea (3 rows).
   - Placeholder: `"Add implementation details or acceptance criteria..."`.
3. **Column Selector**:
   - Populated from the active board's lists (`To Do`, `In Progress`, `Review`, `Done`). Pre-selects the column where the user clicked "+ Add Task".
4. **Priority Selector**:
   - Dropdown options: `Low`, `Medium`, `High`, `Urgent`. Default: `Medium`.
5. **Due Date Picker**:
   - Native HTML5 date input (`type="date"`). Converted to ISO string format on submission.
6. **Assignee Selector**:
   - Dropdown options: `Unassigned` + all members of the active workspace.
7. **Submit Button**:
   - Shows `"Create Task"` during task creation.
   - Shows `"Save Changes"` when editing an existing task card.

---

## 3. Team & Workspace Modal (`TeamModal.tsx`)

Accessible from the navbar's **"Members"** button. Provides multi-tenant workspace management, member list viewing with role badges, and invitation controls.

```
┌──────────────────────────────────────────────────────────────────┐
│ Workspace: Core Engineering                             [ × ]    │
│ Manage team members, roles, and permissions                      │
├──────────────────────────────────────────────────────────────────┤
│ ACTIVE TEAM MEMBERS (3)                                          │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 👤 Samuele Eisen (sam@taskboard.cloud)      🛡️ OWNER          │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 👤 Alex Cloud (alex@taskboard.cloud)        🛡️ ADMIN          │ │
│ ├──────────────────────────────────────────────────────────────┤ │
│ │ 👤 Elena SRE (elena@taskboard.cloud)        🛡️ MEMBER         │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Invite Member by Email                         Role              │
│ ┌───────────────────────────────────────────┐ ┌──────────────┐   │
│ │ colleague@example.com                     │ │ [ Member   ▾]│   │
│ └───────────────────────────────────────────┘ └──────────────┘   │
│                                                [ 👤+ Invite ]    │
│ ──────────────────────────────────────────────────────────────── │
│ [ + Create New Team Workspace ]                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Anatomical Features
1. **Active Members List**:
   - Displays avatar image or initials monogram.
   - Full name in bold white, email address in muted grey.
   - **Role Badge**: Monospace role title (`Owner`, `Admin`, `Member`, `Viewer`) accompanied by an indigo `Shield` SVG icon.
2. **Invitation Form**:
   - Input field: Email address (`type="email"`).
   - Dropdown: Role selector (`Viewer`, `Member`, `Admin`).
   - Action Button: `[ 👤+ Invite ]` dispatches `POST /api/v1/teams/:id/members`.
3. **Workspace Creation Accordion**:
   - Clicking `[ + Create New Team Workspace ]` smoothly reveals an inline form to input a new workspace name (e.g., *"Mobile App Squad"*).
   - Upon creation, the app auto-provisions a default board with the 4 standard Kanban columns and switches the active workspace view immediately.
