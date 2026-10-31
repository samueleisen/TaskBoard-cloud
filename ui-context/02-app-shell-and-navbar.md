# 02. App Shell & Navigation Bar Specification

> **Component architecture, visual anatomy, interactive elements, and state behavior of the top navigation bar (`Navbar.tsx`).**

---

## 1. Visual Topology & Component Wireframe

The top navigation bar acts as the persistent application anchor across all views. It is pinned to the viewport top with `position: sticky` and uses a frosted glass effect (`backdrop-filter: blur(12px)`) so content underneath subtly blurs as the user scrolls.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [NAVBAR: Sticky Top, Height: ~56px, Padding: 0.75rem 2rem, Border-Bottom: 1px subtle]                 │
│                                                                                                        │
│  [LEFT CLUSTER]                                               [RIGHT CLUSTER]                          │
│  ┌──┐                                                          ┌───────────────────────┐ ┌───────────┐ ┌──┐│
│  │☑ │ TaskBoard.cloud   [ Core Engineering ▾ ]  [👥 Members]   │ ● Local (Cloud Ready) │ │+ New Task │ │SE││
│  └──┘                                                          └───────────────────────┘ └───────────┘ └──┘│
│   (1)       (2)                   (3)                (4)                  (5)                 (6)   (7)│
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Element-by-Element Anatomical Breakdown

### (1) Brand Icon Mark
- **Dimensions**: 30px × 30px square.
- **Styling**: Solid obsidian primary `background: var(--primary)` (`#18181b`).
- **Border Radius**: 8px (`--radius-sm`).
- **Icon**: White `CheckSquare` SVG icon (16px) from `lucide-react`.
- **Shadow**: Subtle tactile shadow `var(--shadow-xs)`.

### (2) Brand Text Mark
- **Typography**: `Plus Jakarta Sans`, 700 weight, 1.15rem size, `-0.02em` letter spacing.
- **Text Rendering**: `TaskBoard` in deep graphite (`--text-main`, `#18181b`), immediately followed by `.cloud` in subtle muted gray (`--text-muted`).

### (3) Team Workspace Selector
- **Container**: Minimalist select box with warm border `1px solid var(--border-subtle)` and surface background (`#ffffff`).
- **Behavior**: Clicking displays a native styled dropdown listing all accessible teams:
  - *Core Engineering* (Slug: `core-engineering`)
  - *DevOps & FinOps* (Slug: `devops-infra`)
- **Action**: Selecting a different team immediately updates the board title, active columns, and loads that team's Kanban tasks.

### (4) Members Management Trigger
- **Visual**: Minimalist button with `Users` icon (14px) and label `"Members"`.
- **Hover**: Subtle warm stone hover `background: var(--bg-surface-subtle)`.
- **Action**: Opens the **Workspace & Team Modal (`TeamModal.tsx`)** to inspect member roles or invite new colleagues.

### (5) Dynamic SRE Cloud Status Pill
- **Visual Design**: Rounded capsule badge with monospace font (`JetBrains Mono`, 0.75rem).
- **Interactive State**: Clicking toggles the **SRE & FinOps Status Drawer (`CloudStatusDrawer.tsx`)**.
- **Dual State Variations**:
  ```
  STATE A: LOCAL MEMORY MODE (Pre-Cloud Connection)
  ┌──────────────────────────────────────────────────────────┐
  │  (●)  Local (Cloud Ready)                                │
  │   ▲   └─ Text: #15803d (Forest Sage Green)               │
  │   └── Dot: Pulsing green dot (animation: pulseGlow 2s)  │
  │       Background: rgba(22, 163, 74, 0.08)                │
  │       Border: rgba(22, 163, 74, 0.25)                    │
  └──────────────────────────────────────────────────────────┘
  
  STATE B: POSTGRESQL CONNECTED (GCP Cloud SQL / Local PG)
  ┌──────────────────────────────────────────────────────────┐
  │  (●)  PostgreSQL Active                                  │
  │   ▲   └─ Text: #4338ca (Calm Indigo)                     │
  │   └── Dot: Pulsing indigo dot                            │
  │       Background: rgba(79, 70, 229, 0.08)                │
  │       Border: rgba(79, 70, 229, 0.25)                    │
  └──────────────────────────────────────────────────────────┘
  ```

### (6) Global "+ New Task" CTA Button
- **Styling**: Refined solid obsidian button `background: var(--primary)` (`#18181b`), hover `background: var(--primary-hover)` (`#27272a`).
- **Icon**: White `Plus` icon (16px).
- **Hover Micro-interaction**: Translates 1px upward (`transform: translateY(-1px)`) with crisp tactile shadow `var(--shadow-sm)`.
- **Action**: Opens the **Task Creation Modal (`TaskModal.tsx`)** with the first column pre-selected.

### (7) User Profile Avatar
- **Dimensions**: 26px × 26px circle (`border-radius: 50%`).
- **Rendering**:
  - If `avatarUrl` exists: Renders optimized circular profile image.
  - If no image: Clean warm stone circle displaying the user's 2-letter uppercase initials (e.g. `SE` for *Samuele Eisen*).
- **Tooltip**: Hover displays the user's full name and email.

---

## 3. Responsive Adaptations

| Screen Width | Navbar Display Adaptation |
| :--- | :--- |
| **Desktop (> 1024px)** | Full navigation bar visible with all labels and full team dropdown. |
| **Tablet (768px – 1024px)** | Padding reduces from `2rem` to `1rem`; team dropdown collapses to icon and current name. |
| **Mobile (< 768px)** | "Members" button hides text label (icon only); brand text reduces to 1.1rem; Cloud Status pill hides "(Cloud Ready)" suffix, showing "● Local". |
