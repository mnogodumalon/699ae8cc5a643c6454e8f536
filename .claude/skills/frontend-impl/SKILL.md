---
name: frontend-impl
description: |
  Activate this skill when:
  - Building DashboardOverview.tsx
  - Writing React/TypeScript code
  - Integrating with Living Apps API
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---

# Frontend Implementation Skill

Build a **production-ready, domain-specific dashboard** as the app's primary workspace.

---

## Step 1: Analyze and Decide (MANDATORY — before any code)

Read `.scaffold_context` and `app_metadata.json`. Then write 1-2 sentences describing:

1. **What is the best UI paradigm for the user's core workflow?**
2. **Why is this the most natural way to interact with THIS data?**

Use this table to guide your choice:

| Data Nature | Best UI Paradigm |
|-------------|-----------------|
| Time-based / scheduled entries | Calendar, week planner, timeline |
| Status-based / workflow stages | Kanban board, progress pipeline |
| Quantitative / goal-tracking | Progress rings, gauges, trend charts |
| Hierarchical / categorized | Grouped sections, nested views |
| Sequential / step-by-step | Stepper, checklist, flow view |
| Relational / many linked items | Master-detail, linked cards |

Then implement immediately. No design_brief.md, no task lists, no planning documents.

---

## Step 2: Edit index.css (design tokens)

**Use Edit, NOT Write** — `index.css` is pre-generated with correct import order.

Choose a font and color palette that fits the app's domain, then add your tokens:

```css
@import url('https://fonts.googleapis.com/css2?family=...');  /* URL imports FIRST */
@import "tailwindcss";
@import "tw-animate-css";

/* EXTEND :root — do NOT rewrite */
:root {
  --background: oklch(...);
  --foreground: oklch(...);
  --card: oklch(...);
  --primary: oklch(...);
  /* ... */
  --gradient-primary: linear-gradient(135deg, oklch(...), oklch(...));
  --shadow-elegant: 0 10px 30px -10px oklch(... / 0.3);
}
```

**CSS Import Order MUST stay intact:** `@import url(...)` FIRST, then `@import "tailwindcss"`, then `@import "tw-animate-css"`.

## Step 3: Edit Layout.tsx (title only)

Use Edit to change `APP_TITLE` and `APP_SUBTITLE`. Nothing else.

## Step 4: Build DashboardOverview.tsx

**Mandatory sequence:**
1. **Read** `src/pages/DashboardOverview.tsx` using the Read tool
2. **Write** `src/pages/DashboardOverview.tsx` ONCE with the complete content

**NEVER use Bash (cat/echo/heredoc) for file operations.** If Read or Write fails, retry with the same tool.

## Step 5: Deploy

```bash
npm run build
```

Then call `mcp__deploy_tools__deploy_to_github`

---

## What Is Pre-Generated (DO NOT touch!)

CRUD sub-pages, dialogs, routing, sidebar, and shared components are pre-generated. Changing CSS variables in `index.css` automatically updates their appearance.

**DO NOT touch:** CRUD pages, dialogs, App.tsx, PageShell.tsx, StatCard.tsx, ConfirmDialog.tsx, useDashboardData.ts, enriched.ts, enrich.ts, formatters.ts.

**Already available in DashboardOverview.tsx:**
- `useDashboardData()` — all entities loaded, lookup maps built, loading/error handled
- `enrichX()` — applookup fields resolved to display name strings
- `formatDate()`, `formatCurrency()` — locale-aware formatting
- Loading skeleton and error state with retry

---

## Dashboard = Primary Workspace, NOT Info Page

**The #1 mistake is building the dashboard as a passive info screen** (KPI cards + chart + recent activity). Users want to WORK with their data, not just look at it.

### The Core Interactive Component

Every dashboard needs ONE interactive component — the **reason users open the app**. This component:

- Takes up significant screen space (hero, not sidebar widget)
- Supports create, edit, delete directly (click empty slot → create dialog, click entry → edit)
- Shows data in its most natural form (the paradigm you chose in Step 1)
- Provides immediate visual feedback

The pre-generated CRUD list pages are a fallback. Users should do 90% of their work without leaving the dashboard.

### Anti-Slop Checklist (if ANY true, redesign!)

- Dashboard is a passive info page — only KPI cards and charts
- No domain-specific UI — uses generic list/table for core data
- All KPI cards look identical
- Layout is a boring 2x2 or 3x3 grid
- No clear hero element
- Colors are generic blue/green/red
- Dashboard could be for ANY app
- Font is Inter, Roboto, Open Sans, Lato, Arial, Helvetica, or system-ui

---

## Design Principles (apply inline, no separate document)

### Theme: Light, Minimal, BUT Distinctive

Always light mode. Minimal does NOT mean generic.

**Color:** Start with warm or cool off-white base (not pure white). Add ONE refined accent color that fits the app's domain — not generic blue (#007bff).

**Typography:** FORBIDDEN: Inter, Roboto, Open Sans, Lato, Arial, Helvetica, system-ui.

| App Character | Recommended Fonts |
|--------------|-------------------|
| Data/Analytics | Space Grotesk, IBM Plex Sans, Geist |
| Fitness/Health | Outfit, Nunito Sans, DM Sans |
| Finance | Source Serif 4, Newsreader, IBM Plex Serif |
| Creative | Syne, Bricolage Grotesque, Cabinet Grotesk |
| Professional | Source Sans 3, Plus Jakarta Sans, Manrope |

Typography hierarchy through extreme weight differences (300 vs 700) and size jumps (24px vs 14px).

**Colors must be oklch() functions:**
```css
--primary: oklch(0.52 0.22 264);   /* ✅ */
--primary: 0.52 0.22 264;          /* ❌ breaks! */
```

### Layout: Visual Interest Required

Every layout needs variation — size, weight, spacing, format, typography. If everything is the same size in identical cards, it's AI slop.

**Mobile:** Vertical flow, thumb-friendly, hero dominates first viewport.
**Desktop:** Use horizontal space, multi-column where appropriate, hover reveals.

---

## Critical Implementation Rules

### Type Imports
```typescript
// ❌ WRONG
import { Workout } from '@/types/app';
// ✅ CORRECT
import type { Workout } from '@/types/app';
```

### extractRecordId Null Check
```typescript
const id = extractRecordId(record.fields.relation);
if (!id) return;
```

### Dates Without Seconds
```typescript
const dateForAPI = formData.date + 'T12:00'; // YYYY-MM-DDTHH:MM only
```

### Select Never Empty Value
```typescript
// ❌ <SelectItem value="">None</SelectItem>
// ✅ <SelectItem value="none">None</SelectItem>
```

---

## Completeness Checklist

### Theme
- [ ] Font loaded via @import url() in index.css (FIRST, before tailwindcss!)
- [ ] Font is NOT from forbidden list
- [ ] All CSS variables are oklch() functions
- [ ] Color palette fits the app's domain

### Core Component
- [ ] Interactive component implements the chosen UI paradigm
- [ ] Users can create, edit, delete directly from the dashboard
- [ ] Component takes significant screen space (hero element)

### Technical
- [ ] `npm run build` passes
- [ ] Empty state handled (loading/error are pre-generated)
- [ ] No hardcoded demo data
- [ ] Responsive: mobile and desktop layouts

---

## Living Apps API Reference

### Date Formats (STRICT!)

| Field Type | Format | Example |
|------------|--------|---------|
| `date/date` | `YYYY-MM-DD` | `2025-11-06` |
| `date/datetimeminute` | `YYYY-MM-DDTHH:MM` | `2025-11-06T12:00` |

NO seconds for `datetimeminute`!

### applookup Fields

Store full URLs: `https://my.living-apps.de/rest/apps/{app_id}/records/{record_id}`

```typescript
import { extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import { APP_IDS } from '@/types/app';

const recordId = extractRecordId(record.fields.category);
if (!recordId) return;

const data = { category: createRecordUrl(APP_IDS.CATEGORIES, selectedId) };
```

### API Response Format

Returns **object**, NOT array. Use `Object.entries()` to extract `record_id`.

---

## Data Access (pre-generated — do NOT rewrite)

All data fetching, lookup maps, and enrichment are pre-generated. In DashboardOverview.tsx:

```typescript
// Already in the skeleton — just use the data:
const { kurse, anmeldungen, dozentenMap, loading, error, fetchAll } = useDashboardData();
const enrichedKurse = enrichKurse(kurse, dozentenMap, raeumeMap);
```

For CRUD after user actions:

```typescript
const handleCreate = async (fields) => {
  await LivingAppsService.createKurseEntry(fields);
  fetchAll();
};

const handleDelete = async (id: string) => {
  await LivingAppsService.deleteKurseEntry(id);
  fetchAll();
};
```

## Chart Pattern (recharts)

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="name" stroke="var(--muted-foreground)" />
    <YAxis stroke="var(--muted-foreground)" />
    <Tooltip contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }} />
    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
  </LineChart>
</ResponsiveContainer>
```

## Available Libraries

- **shadcn/ui** — all components in `src/components/ui/`
- **recharts** — LineChart, BarChart, PieChart, AreaChart
- **lucide-react** — icons
- **date-fns** — date formatting with `de` locale

## Formatting (pre-generated — just import)

```typescript
import { formatDate, formatCurrency } from '@/lib/formatters';

formatDate(record.fields.startdatum);     // "06.11.2025" or "Nov 6, 2025"
formatCurrency(record.fields.preis);      // "199,00 €" or "$199.00"
```
