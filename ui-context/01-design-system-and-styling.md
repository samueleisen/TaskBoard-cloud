# 01. Design System & Styling Specification

> **Color tokens, light mode humane palette, warm stone surfaces, typography hierarchy, micro-animations, and visual tokens from `client/src/index.css`.**

---

## 1. Design System Philosophy

The TaskBoard Cloud user interface is built on a **calm, humane, and minimalist modern light aesthetic**. The visual design eliminates harsh high-contrast dark modes and generic developer palettes in favor of:
- **Warm & Organic Canvas**: Grounded on warm alabaster (`#fbfaf8`), crisp white surfaces (`#ffffff`), and subtle stone dividers (`#eae7e1`) that create a serene, uncluttered workspace.
- **Ambient Serenity**: Dual subtle radial gradients softly illuminate the top canvas perimeter without visual distraction.
- **Thoughtful Color Hierarchy**: Vibrant neon fills are replaced by calm, muted pill tints (urgent rose `#fef2f2`, amber `#fffbeb`, slate `#f1f5f9`, sky `#0284c7`, and sage `#16a34a`).
- **Tactile Micro-Interactions**: Gentle elevation lifts with soft multi-layer drop shadows (`--shadow-card-hover`), breathing sage SRE status pills, and organic modal slide-ups.

---

## 2. Design Tokens & CSS Custom Properties

All styling tokens are centralized in [`client/src/index.css`](file:///home/sam/Code/TaskBoard-cloud/client/src/index.css) under the `:root` scope:

### 2.1. Backgrounds & Surfaces
| Token | Value | Visual Purpose |
| :--- | :--- | :--- |
| `--bg-app` | `#fbfaf8` | Warm alabaster canvas root background. |
| `--bg-surface` | `#ffffff` | Crisp gallery white surface for header, navbar, modals, and drawers. |
| `--bg-surface-subtle` | `#f5f3ef` | Soft warm stone tone for Kanban column backdrops and secondary boxes. |
| `--bg-surface-elevated` | `#ffffff` | Elevated surface for dropdowns, tooltips, and floating menus. |
| `--bg-card` | `#ffffff` | Crisp white card surface for Kanban task items. |
| `--bg-card-hover` | `#ffffff` | Card surface maintained on hover, paired with subtle border enhancement. |

### 2.2. Borders & Outlines
| Token | Value | Visual Purpose |
| :--- | :--- | :--- |
| `--border-subtle` | `#eae7e1` | Gentle warm stone border providing soft structural separation. |
| `--border-hover` | `#d7d3cb` | Slightly darkened border on hover for responsive feedback. |
| `--border-focus` | `#18181b` | Refined graphite outline applied to focused inputs and buttons. |

### 2.3. Primary Brand & Accent Palette
| Token | Value | Functional Role |
| :--- | :--- | :--- |
| `--primary` | `#18181b` (Obsidian) | Primary CTA buttons, active accents, high-contrast headings. |
| `--primary-hover` | `#27272a` | Deep graphite hover state for buttons. |
| `--primary-glow` | `rgba(24, 24, 27, 0.08)` | Tactile soft shadow diffusion around primary CTA elements. |
| `--accent-sky` | `#0284c7` (Sky Blue) | "To Do" column indicator dot; pending item tags. |
| `--accent-indigo` | `#4f46e5` (Calm Indigo) | "In Progress" column indicator dot. |
| `--accent-amber` | `#d97706` (Warm Amber) | "Review" column dot; High-priority tags. |
| `--accent-emerald` | `#16a34a` (Sage Emerald) | "Done" column dot; SRE healthy probe indicator. |
| `--accent-rose` | `#dc2626` (Muted Crimson) | Urgent warning highlights & critical alerts. |

### 2.4. Priority Pill Tints
| Level | Background Token | Value | Text Token | Value | Border Token | Value |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Urgent** | `--pill-urgent-bg` | `#fef2f2` | `--pill-urgent-text` | `#b91c1c` | `--pill-urgent-border` | `#fecaca` |
| **High** | `--pill-high-bg` | `#fffbeb` | `--pill-high-text` | `#b45309` | `--pill-high-border` | `#fde68a` |
| **Medium** | `--pill-medium-bg` | `#f1f5f9` | `--pill-medium-text` | `#475569` | `--pill-medium-border` | `#e2e8f0` |
| **Low** | `--pill-low-bg` | `#f8fafc` | `--pill-low-text` | `#64748b` | `--pill-low-border` | `#e2e8f0` |

### 2.5. Typography & Text Hierarchy
| Token | Value | Applied Elements |
| :--- | :--- | :--- |
| `--text-main` | `#18181b` | Primary titles, task names, headings (high typographic clarity). |
| `--text-muted` | `#5e5d59` | Subtitles, descriptions, input labels, metadata. |
| `--text-dim` | `#94918a` | Secondary timestamps, placeholders, muted icons. |
| `--font-heading` | `'Plus Jakarta Sans', sans-serif` | App logo, board titles, column headers, modal titles. |
| `--font-body` | `'Inter', sans-serif` | Card text, descriptions, form inputs, button labels. |
| `--font-mono` | `'JetBrains Mono', monospace` | Priority pills, SLA latency numbers, cost gauges. |

### 2.6. Tactile Soft Shadows
| Token | Value | Applied Elements |
| :--- | :--- | :--- |
| `--shadow-xs` | `0 1px 2px rgba(28, 25, 23, 0.03)` | Subtle button depth and input resting state. |
| `--shadow-sm` | `0 1px 3px rgba(28, 25, 23, 0.04), 0 2px 6px rgba(28, 25, 23, 0.02)` | Resting task cards and control pills. |
| `--shadow-md` | `0 4px 12px rgba(28, 25, 23, 0.05), 0 1px 3px rgba(28, 25, 23, 0.03)` | Filter selects, interactive pills, and dropdowns. |
| `--shadow-lg` | `0 20px 40px -10px rgba(28, 25, 23, 0.12)` | Modal dialog boxes and SRE side drawer. |
| `--shadow-card-hover` | `0 8px 24px -2px rgba(28, 25, 23, 0.07)` | Hovered task card elevation. |

---

## 3. Layering & Elevation Architecture

TaskBoard Cloud employs a 3-tier elevation model calibrated for light aesthetics:

```
  ELEVATION TIER 3: OVERLAYS & MODALS (z-index: 100 - 110)
  • Modal dialogs (TaskModal, TeamModal) & CloudStatusDrawer
  • Backdrop: rgba(24, 24, 27, 0.4) with backdrop-filter: blur(8px)
  • Surface: #ffffff with border: 1px solid #eae7e1
  • Shadow: 0 20px 40px -10px rgba(28, 25, 23, 0.12)
       │
       ▼
  ELEVATION TIER 2: CARDS & DROPDOWNS (z-index: 10 - 40)
  • Navbar: sticky top, rgba(255, 255, 255, 0.85) with backdrop-filter: blur(12px)
  • Columns: warm stone #f5f3ef, 1px solid #eae7e1
  • Task Cards: crisp white #ffffff, lifts on hover (translateY(-2px), --shadow-card-hover)
       │
       ▼
  ELEVATION TIER 1: CANVAS BASE (z-index: 0 - 1)
  • Warm alabaster base: #fbfaf8
  • Serene ambient perimeter gradients: subtle warm and cool hints
```

---

## 4. Micro-Animations & CSS Keyframes

### 4.1. The Pulsing SRE Indicator (`@keyframes pulseGlow`)
Used on the sage green dot inside the navbar Cloud Status pill to indicate continuous system health:
```css
@keyframes pulseGlow {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.9);
  }
}
```

### 4.2. Modal Dialog Spring Entrance (`@keyframes slideUp`)
Provides an organic, polished arrival when opening task or team modals:
```css
@keyframes slideUp {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

### 4.3. SRE Drawer Slide-In (`@keyframes slideFromRight`)
Smooth 250ms cubic-bezier transition when toggling the right-side Cloud Inspector:
```css
@keyframes slideFromRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

### 4.4. Interactive Card Lift
```css
.task-card:hover {
  border-color: var(--border-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-card-hover);
}
```
