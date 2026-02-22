# Design Brief: Kursverwaltung

## 1. App Analysis

### What This App Does
Kursverwaltung is a course management system for educational institutions or training centers. It manages instructors (Dozenten), rooms (Räume), courses (Kurse), participants (Teilnehmer), and course registrations (Anmeldungen). The system tracks which participants are enrolled in which courses, their payment status, and ensures proper resource allocation of rooms and instructors.

### Who Uses This
Course administrators and training coordinators who need to manage multiple courses, track enrollments, monitor payment status, and ensure courses have proper instructor and room assignments. They work in educational settings, corporate training departments, or continuing education institutions.

### The ONE Thing Users Care About Most
**Active Courses Overview** - Users need to immediately see how many courses are currently running, upcoming courses, and especially which registrations are still unpaid. Payment tracking is critical for financial operations.

### Primary Actions (IMPORTANT!)
1. **Neue Anmeldung** → Primary Action Button (most frequent action: registering participants to courses)
2. Neuen Kurs anlegen (creating new courses)
3. Neuen Teilnehmer anlegen (adding new participants)

---

## 2. What Makes This Design Distinctive

### Visual Identity
The design uses a warm, professional cream background with a deep indigo accent that conveys trust and academic seriousness. The combination creates a welcoming yet authoritative feel appropriate for educational institutions. Subtle card shadows and generous spacing give the dashboard a premium, organized appearance that reflects the structured nature of course management.

### Layout Strategy
- The hero element is a large "Aktive Kurse" (Active Courses) count with a progress ring showing capacity utilization
- Asymmetric layout on desktop: wide left column (70%) for courses and chart, narrow right column (30%) for quick stats and recent registrations
- Mobile uses full-width cards with the hero prominently at top, followed by KPI chips in a horizontal scroll, then course list
- Visual interest created through size variation (hero 3x larger than secondary KPIs) and the distinctive progress ring

### Unique Element
The hero section features a circular progress indicator showing overall course capacity utilization (enrolled participants vs. total available spots across all active courses). The ring uses a gradient from indigo to teal, with the percentage number displayed prominently in the center. This immediately tells administrators if they have room for more enrollments.

---

## 3. Theme & Colors

### Font
- **Family:** Plus Jakarta Sans
- **URL:** `https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap`
- **Why this font:** Professional yet friendly, with distinctive character that works well for data-heavy interfaces. The geometric forms provide excellent readability for numbers and stats.

### Color Palette
All colors as complete hsl() functions:

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Page background | `hsl(45 30% 97%)` | `--background` |
| Main text | `hsl(230 25% 18%)` | `--foreground` |
| Card background | `hsl(0 0% 100%)` | `--card` |
| Card text | `hsl(230 25% 18%)` | `--card-foreground` |
| Borders | `hsl(45 20% 88%)` | `--border` |
| Primary action | `hsl(235 65% 48%)` | `--primary` |
| Text on primary | `hsl(0 0% 100%)` | `--primary-foreground` |
| Accent highlight | `hsl(173 65% 40%)` | `--accent` |
| Muted background | `hsl(45 20% 93%)` | `--muted` |
| Muted text | `hsl(230 10% 45%)` | `--muted-foreground` |
| Success/positive | `hsl(160 60% 40%)` | (component use) |
| Error/negative | `hsl(0 70% 55%)` | `--destructive` |

### Why These Colors
The warm cream background (`hsl(45 30% 97%)`) creates a welcoming, less clinical feel than pure white - appropriate for educational settings. The deep indigo primary (`hsl(235 65% 48%)`) conveys professionalism and trust while standing out clearly for primary actions. The teal accent (`hsl(173 65% 40%)`) provides a complementary highlight for secondary emphasis and positive indicators.

### Background Treatment
Subtle warm cream background with very light texture created through a barely visible noise pattern (via CSS). Cards are pure white to provide clear visual separation and draw attention to content areas.

---

## 4. Mobile Layout (Phone)

### Layout Approach
Mobile prioritizes the hero capacity indicator at the top, followed by horizontally scrollable KPI chips for quick glances at key stats. The course list below uses compact cards optimized for vertical scrolling and thumb interaction.

### What Users See (Top to Bottom)

**Header:**
Simple header with app title "Kursverwaltung" on the left, primary action button "Neue Anmeldung" as a compact button with plus icon on the right.

**Hero Section (The FIRST thing users see):**
Takes approximately 45% of initial viewport height. Large circular progress ring (180px diameter) showing overall capacity utilization percentage in the center. Below the ring: "Auslastung" label and the actual numbers (e.g., "127 von 200 Plätzen"). Background of hero section is a subtle gradient from cream to very light indigo tint.

**Section 2: KPI Chips (Horizontal Scroll)**
A horizontally scrollable row of compact stat chips (not full cards). Each chip shows:
- Icon + Number (large, 24px)
- Label below (small, 12px muted)
Chips shown: Aktive Kurse | Teilnehmer | Unbezahlt | Dozenten
Height: ~80px total for this section.

**Section 3: Kurse Liste**
Vertical list of course cards. Each card shows:
- Course title (bold)
- Dozent name (muted, smaller)
- Date range badge (e.g., "15.01 - 28.02")
- Enrollment indicator: "12/20 Plätze" with small progress bar
- Chevron right indicating tap for details

**Section 4: Letzte Anmeldungen**
Collapsible section (accordion) showing 5 most recent registrations. Each item:
- Participant name
- Course name (truncated)
- Payment badge (Bezahlt/Offen)

**Bottom Navigation / Action:**
Fixed bottom bar with FAB (Floating Action Button) "+" for quick registration. The FAB is positioned bottom-right with the primary indigo color.

### Mobile-Specific Adaptations
- KPIs condensed into horizontal scroll chips instead of grid cards
- Course cards simplified to essential info only
- Chart section hidden on mobile (appears in Kurse detail view instead)
- Navigation via bottom FAB instead of header button for thumb accessibility

### Touch Targets
All interactive elements minimum 44px height. Course cards have full-width tap area. FAB is 56px diameter.

### Interactive Elements (if applicable)
- Tap course card → opens course detail sheet (bottom drawer)
- Tap KPI chip → filters/navigates to relevant list
- Long-press on registration → shows edit/delete options

---

## 5. Desktop Layout

### Overall Structure
Two-column asymmetric layout:
- Left column (70%): Hero stats row + Courses table + Enrollment trend chart
- Right column (30%): Quick actions card + Recent registrations list + Room availability
The eye goes: Hero capacity ring → Active courses count → Recent registrations → Course table

### Section Layout

**Top Area (Header):**
Full-width header with:
- Left: "Kursverwaltung" title (24px, semibold)
- Right: Primary button "Neue Anmeldung" + secondary buttons "Neuer Kurs" and "Neuer Teilnehmer"

**Left Column - Main Content (70%):**

*Hero Stats Row:*
Three cards in a row, center card is largest (hero):
1. Small card: "Aktive Kurse" count (number + trend indicator)
2. HERO card (1.5x height): Capacity ring showing utilization percentage
3. Small card: "Teilnehmer Gesamt" count

*Courses Section:*
Full-width card containing:
- Section header "Kurse" with filter dropdown (Alle/Aktiv/Kommend/Vergangen)
- Table with columns: Kurstitel | Dozent | Zeitraum | Anmeldungen | Status
- Pagination at bottom
- Row hover shows edit/delete icons

*Enrollment Trend Chart:*
Line chart showing registrations over time (last 30 days). Simple, clean with primary color line.

**Right Column - Sidebar (30%):**

*Quick Stats Card:*
Vertical stack of stat items:
- Offene Zahlungen: count with warning color if > 0
- Freie Plätze: total available spots
- Kurse diese Woche: courses starting this week

*Recent Registrations Card:*
List of 8 most recent registrations with:
- Participant name
- Course (truncated)
- Date
- Payment status badge
"Alle anzeigen" link at bottom

*Dozenten Overview Card:*
Compact list showing instructors with their assigned course count

### What Appears on Hover
- Table rows: background highlight + edit/delete action icons appear
- Cards: subtle shadow increase
- Stat cards: slight scale transform (1.02)
- Registration items: full course name in tooltip

### Clickable/Interactive Areas (if applicable)
- Course table rows → open course detail dialog
- Recent registration items → open registration edit dialog
- Dozent items → open instructor detail/edit dialog
- All KPI cards → navigate to filtered views

---

## 6. Components

### Hero KPI
The MOST important metric that users see first.

- **Title:** Auslastung (Capacity)
- **Data source:** Kurse (for max_teilnehmer) + Anmeldungen (for enrolled count)
- **Calculation:** Sum of all anmeldungen for active courses / Sum of max_teilnehmer for active courses × 100
- **Display:** Large circular progress ring (200px desktop, 180px mobile) with percentage in center (48px bold). Ring gradient from primary (indigo) to accent (teal).
- **Context shown:** Below ring: "X von Y Plätzen belegt" text
- **Why this is the hero:** Capacity utilization is the core operational metric - it tells if courses are filling up (good for revenue) or have availability (need marketing). It's actionable and time-sensitive.

### Secondary KPIs
**Aktive Kurse**
- Source: Kurse
- Calculation: Count where startdatum <= today AND enddatum >= today
- Format: number
- Display: Card with icon, large number (36px), small label

**Teilnehmer Gesamt**
- Source: Teilnehmer
- Calculation: Total count
- Format: number
- Display: Card with icon, large number, small label

**Offene Zahlungen**
- Source: Anmeldungen
- Calculation: Count where bezahlt = false
- Format: number (with warning styling if > 0)
- Display: Card with warning icon when > 0, red accent

**Dozenten**
- Source: Dozenten
- Calculation: Total count
- Format: number
- Display: Small stat chip/card

### Chart
- **Type:** Area chart (subtle fill shows trend weight)
- **Title:** Anmeldungen der letzten 30 Tage
- **What question it answers:** Is enrollment momentum increasing or decreasing? Helps plan marketing.
- **Data source:** Anmeldungen
- **X-axis:** Date (anmeldedatum), grouped by day
- **Y-axis:** Count of registrations
- **Mobile simplification:** Hidden on mobile main view, available in dedicated stats tab

### Lists/Tables

**Kurse Tabelle (Desktop)**
- Purpose: Full overview of all courses with management actions
- Source: Kurse + Dozenten (joined) + Anmeldungen (counted)
- Fields shown: Kurstitel, Dozent (vorname + nachname), Startdatum - Enddatum, Anmeldungen/Max, Status badge
- Desktop style: Full table with sortable columns
- Sort: By startdatum descending (newest first)
- Limit: 10 per page with pagination

**Kurse Liste (Mobile)**
- Purpose: Quick course overview
- Source: Kurse
- Fields shown: Titel, Dozent, Zeitraum badge, enrollment mini-bar
- Mobile style: Stacked cards
- Sort: By startdatum descending
- Limit: Show all, virtualized scroll

**Letzte Anmeldungen**
- Purpose: Monitor recent activity, catch unpaid registrations
- Source: Anmeldungen + Teilnehmer (joined) + Kurse (joined)
- Fields shown: Teilnehmer name, Kurs title (truncated), Anmeldedatum, Bezahlt badge
- Mobile style: Simple list items in accordion
- Desktop style: Card with list items
- Sort: By anmeldedatum descending
- Limit: 5 on mobile, 8 on desktop

### Primary Action Button (REQUIRED!)

- **Label:** Neue Anmeldung
- **Action:** add_record
- **Target app:** Anmeldungen (or Kursanmeldung for external form)
- **What data:** Form with Kurs (select from Kurse), Teilnehmer (select from existing OR create new inline), Anmeldedatum (default today), Bezahlt (checkbox, default false)
- **Mobile position:** bottom_fixed (FAB style, bottom-right)
- **Desktop position:** header (primary button)
- **Why this action:** Course registration is the most frequent action. Every participant interaction eventually leads to an Anmeldung. Making this one tap away increases efficiency.

### CRUD Operations Per App (REQUIRED!)

**Dozenten CRUD Operations**

- **Create:**
  - Trigger: "Neuer Dozent" button in Dozenten section header
  - Form fields: Vorname (text, required), Nachname (text, required), E-Mail (email), Telefon (tel), Fachgebiet (text)
  - Form style: Dialog/Modal
  - Required fields: Vorname, Nachname
  - Default values: None

- **Read:**
  - List view: Cards on mobile, table rows on desktop showing Name, Fachgebiet, E-Mail
  - Detail view: Click → Dialog showing all fields + list of assigned courses
  - Fields shown in list: Full name (Vorname + Nachname), Fachgebiet
  - Fields shown in detail: All fields + Zugewiesene Kurse count
  - Sort: By Nachname alphabetically
  - Filter/Search: Search by name

- **Update:**
  - Trigger: Edit icon (pencil) on hover/tap, or from detail view
  - Edit style: Same dialog as Create, pre-filled
  - Editable fields: All fields

- **Delete:**
  - Trigger: Delete icon (trash) on hover/tap, or from detail view
  - Confirmation: AlertDialog "Dozent löschen?"
  - Confirmation text: "Möchtest du {Vorname} {Nachname} wirklich löschen? Zugewiesene Kurse werden nicht gelöscht."

**Räume CRUD Operations**

- **Create:**
  - Trigger: "Neuer Raum" button in Räume section
  - Form fields: Raumname (text, required), Gebäude (text), Kapazität (number)
  - Form style: Dialog/Modal
  - Required fields: Raumname
  - Default values: None

- **Read:**
  - List view: Compact cards showing Raumname, Gebäude, Kapazität badge
  - Detail view: Click → Dialog with all fields + current course assignments
  - Fields shown in list: Raumname, Gebäude, Kapazität
  - Fields shown in detail: All fields + Belegte Termine
  - Sort: By Gebäude, then Raumname
  - Filter/Search: Filter by Gebäude

- **Update:**
  - Trigger: Edit icon on card/row
  - Edit style: Same dialog as Create, pre-filled
  - Editable fields: All fields

- **Delete:**
  - Trigger: Delete icon on card/row
  - Confirmation: AlertDialog "Raum löschen?"
  - Confirmation text: "Möchtest du den Raum '{Raumname}' wirklich löschen?"

**Kurse CRUD Operations**

- **Create:**
  - Trigger: "Neuer Kurs" button in header (desktop) or via menu (mobile)
  - Form fields: Kurstitel (text, required), Beschreibung (textarea), Startdatum (date, required), Enddatum (date, required), Max. Teilnehmer (number, required), Preis (number), Dozent (select from Dozenten), Raum (select from Räume)
  - Form style: Dialog/Modal (larger, 600px width)
  - Required fields: Kurstitel, Startdatum, Enddatum, Max. Teilnehmer
  - Default values: Startdatum = today, Max. Teilnehmer = 20

- **Read:**
  - List view: Table on desktop, cards on mobile
  - Detail view: Click row/card → Dialog with full details + enrollment list
  - Fields shown in list: Titel, Dozent, Zeitraum, Anmeldungen/Max, Status
  - Fields shown in detail: All fields + Teilnehmerliste (enrolled participants)
  - Sort: By Startdatum descending
  - Filter/Search: Filter by Status (Aktiv/Kommend/Vergangen), Search by title

- **Update:**
  - Trigger: Edit icon in table row (desktop) or in detail view (mobile)
  - Edit style: Same dialog as Create, pre-filled
  - Editable fields: All fields

- **Delete:**
  - Trigger: Delete icon in table row or detail view
  - Confirmation: AlertDialog "Kurs löschen?"
  - Confirmation text: "Möchtest du den Kurs '{Kurstitel}' wirklich löschen? Alle Anmeldungen werden ebenfalls gelöscht."

**Teilnehmer CRUD Operations**

- **Create:**
  - Trigger: "Neuer Teilnehmer" button in Teilnehmer section or inline during Anmeldung
  - Form fields: Vorname (text, required), Nachname (text, required), E-Mail (email, required), Telefon (tel), Geburtsdatum (date)
  - Form style: Dialog/Modal
  - Required fields: Vorname, Nachname, E-Mail
  - Default values: None

- **Read:**
  - List view: Table with Name, E-Mail, Telefon, Kurse (count)
  - Detail view: Click → Dialog with all fields + enrolled courses list
  - Fields shown in list: Full name, E-Mail, Anzahl Kurse
  - Fields shown in detail: All fields + Kursbuchungen with payment status
  - Sort: By Nachname alphabetically
  - Filter/Search: Search by name or email

- **Update:**
  - Trigger: Edit icon on row/card
  - Edit style: Same dialog as Create, pre-filled
  - Editable fields: All fields

- **Delete:**
  - Trigger: Delete icon on row/card
  - Confirmation: AlertDialog "Teilnehmer löschen?"
  - Confirmation text: "Möchtest du {Vorname} {Nachname} wirklich löschen? Alle Anmeldungen werden ebenfalls gelöscht."

**Anmeldungen CRUD Operations**

- **Create:**
  - Trigger: Primary action button "Neue Anmeldung" (FAB on mobile, header button on desktop)
  - Form fields: Kurs (select from Kurse, required), Teilnehmer (select from Teilnehmer, required), Anmeldedatum (date), Bezahlt (checkbox)
  - Form style: Dialog/Modal
  - Required fields: Kurs, Teilnehmer
  - Default values: Anmeldedatum = today, Bezahlt = false

- **Read:**
  - List view: Recent registrations list showing Teilnehmer, Kurs, Datum, Bezahlt status
  - Detail view: Click → Dialog with full info
  - Fields shown in list: Teilnehmer name, Kurs title, Anmeldedatum, Bezahlt badge
  - Fields shown in detail: All fields with links to Teilnehmer and Kurs details
  - Sort: By Anmeldedatum descending
  - Filter/Search: Filter by Bezahlt status, filter by Kurs

- **Update:**
  - Trigger: Click on registration item, edit icon in detail view
  - Edit style: Same dialog as Create, pre-filled. Most common edit: toggling Bezahlt status
  - Editable fields: All fields (Kurs change should be rare but possible)

- **Delete:**
  - Trigger: Delete icon in detail view or swipe action on mobile
  - Confirmation: AlertDialog "Anmeldung löschen?"
  - Confirmation text: "Möchtest du die Anmeldung von {Teilnehmer} für '{Kurs}' wirklich löschen?"

**Kursanmeldung CRUD Operations**
(This is a public registration form, slightly different workflow)

- **Create:**
  - Trigger: Usually external form, but admin can also create
  - Form fields: Kurs (select), Vorname, Nachname, E-Mail, Telefon, Geburtsdatum, Anmeldedatum, Bezahlt
  - Form style: Dialog/Modal
  - Required fields: Kurs, Vorname, Nachname, E-Mail
  - Default values: Anmeldedatum = today, Bezahlt = false

- **Read:**
  - List view: Table showing Teilnehmer (combined name), Kurs, Datum, Bezahlt
  - Detail view: Click → Dialog with all fields
  - Fields shown in list: Name, Kurs, E-Mail, Bezahlt
  - Fields shown in detail: All fields
  - Sort: By Anmeldedatum descending
  - Filter/Search: Filter by Kurs, search by name

- **Update:**
  - Trigger: Edit icon on row
  - Edit style: Same dialog as Create, pre-filled
  - Editable fields: All fields

- **Delete:**
  - Trigger: Delete icon on row
  - Confirmation: AlertDialog "Anmeldung löschen?"
  - Confirmation text: "Möchtest du diese Kursanmeldung wirklich löschen?"

---

## 7. Visual Details

### Border Radius
Rounded (8px) - `--radius: 0.5rem`
Cards, buttons, inputs all use consistent rounded corners. Badges use pill (16px).

### Shadows
Subtle elevation system:
- Cards: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- Cards on hover: `0 4px 12px rgba(0,0,0,0.1)`
- Dialogs: `0 10px 40px rgba(0,0,0,0.15)`

### Spacing
Normal spacing with generous padding:
- Card padding: 24px (desktop), 16px (mobile)
- Section gaps: 24px
- Element gaps within cards: 16px
- Compact list items: 12px vertical

### Animations
- **Page load:** Staggered fade-in for cards (100ms delay between each)
- **Hover effects:** Cards scale to 1.02 with shadow increase (150ms ease)
- **Tap feedback:** Brief scale down to 0.98 (100ms)
- **Dialog:** Fade in + scale from 0.95 (200ms ease-out)
- **Progress ring:** Animated fill on load (800ms ease-out)

---

## 8. CSS Variables (Copy Exactly!)

The implementer MUST copy these values exactly into `src/index.css`:

```css
:root {
  --radius: 0.5rem;
  --background: hsl(45 30% 97%);
  --foreground: hsl(230 25% 18%);
  --card: hsl(0 0% 100%);
  --card-foreground: hsl(230 25% 18%);
  --popover: hsl(0 0% 100%);
  --popover-foreground: hsl(230 25% 18%);
  --primary: hsl(235 65% 48%);
  --primary-foreground: hsl(0 0% 100%);
  --secondary: hsl(45 20% 93%);
  --secondary-foreground: hsl(230 25% 25%);
  --muted: hsl(45 20% 93%);
  --muted-foreground: hsl(230 10% 45%);
  --accent: hsl(173 65% 40%);
  --accent-foreground: hsl(0 0% 100%);
  --destructive: hsl(0 70% 55%);
  --border: hsl(45 20% 88%);
  --input: hsl(45 20% 88%);
  --ring: hsl(235 65% 48%);
  --chart-1: hsl(235 65% 48%);
  --chart-2: hsl(173 65% 40%);
  --chart-3: hsl(45 70% 50%);
  --chart-4: hsl(280 60% 50%);
  --chart-5: hsl(20 80% 55%);
}
```

---

## 9. Implementation Checklist

The implementer should verify:
- [ ] Font loaded from URL above (Plus Jakarta Sans)
- [ ] All CSS variables copied exactly
- [ ] Mobile layout matches Section 4
- [ ] Desktop layout matches Section 5
- [ ] Hero element (capacity ring) is prominent as described
- [ ] Colors create the warm, professional mood described in Section 2
- [ ] CRUD patterns are consistent across all apps
- [ ] Delete confirmations are in place
- [ ] Primary action button (Neue Anmeldung) is prominent and functional
- [ ] All 6 apps have full CRUD implemented
- [ ] Toast notifications for all CRUD operations
- [ ] Loading, empty, and error states implemented
