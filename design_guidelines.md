# Trust Network Application - Design Guidelines

## Design Approach

**Selected Approach:** Hybrid - Design System (Material Design 3) + Web3 Reference (Gitcoin Passport, ENS, Rainbow Wallet)

**Justification:** This application requires crystal-clear data presentation for complex trust metrics while maintaining the modern, trustworthy aesthetic expected in Web3 applications. Material Design 3 provides excellent patterns for data visualization and progressive disclosure, while Web3 references ensure the interface feels native to blockchain users.

**Key Design Principles:**
1. **Transparency Through Clarity** - Complex trust metrics must be immediately understandable
2. **Privacy-First Visual Language** - Obfuscation should feel intentional, not hidden
3. **Data Hierarchy** - Scores, paths, and technical details have clear visual priority
4. **Trustworthy Restraint** - Minimal decoration, maximum information density
5. **Nature as Metaphor** - Trust flows like water; networks grow like roots

---

## Nature-Derived Color Philosophy

**Core Insight:** The max-flow algorithm mirrors nature's fundamental patterns—rivers finding paths, roots seeking nutrients, mycelium distributing resources. Our color system reflects this organic truth.

### Score Range Colors (Semantic)

| Score Range | Name | CSS Variable | HSL | Nature Metaphor |
|-------------|------|--------------|-----|-----------------|
| 80-100 | Canopy | `--score-canopy` | 142 76% 36% | Thriving canopy, peak photosynthesis |
| 60-79 | Growth | `--score-growth` | 120 40% 45% | Moss green, healthy expansion |
| 40-59 | Transition | `--score-transition` | 45 85% 50% | Golden amber, developing potential |
| 20-39 | Dormant | `--score-dormant` | 25 35% 45% | Warm earth, resting but alive |
| 0-19 | Seedling | `--score-seedling` | 30 15% 55% | Muted stone, beginning growth |

### Dilution Zone Colors

| Zone | CSS Variable | HSL | Meaning |
|------|--------------|-----|---------|
| Quality (1-10) | `--dilution-quality` | 142 70% 40% | Healthy, sustainable vouching |
| Warning (11-15) | `--dilution-warning` | 45 90% 55% | Approaching over-extension |
| Penalty (16-25) | `--dilution-penalty` | 25 60% 50% | Over-extraction, stressed |
| Cap (25+) | `--dilution-cap` | 0 0% 50% | Exhausted capacity |

### Primary Color

The primary brand color is **Forest Green** (`142 70% 32%` light / `142 70% 40%` dark), chosen because:
- Green symbolizes growth, health, and thriving ecosystems
- It distinguishes MaxFlow from blue-dominant Web3 projects
- It reinforces the nature/organic narrative of trust networks

### Usage Guidelines

- **Graph nodes**: Use score range colors based on absolute LocalHealth (0-100)
- **UI actions**: Use primary green for buttons, links, focus states
- **Warnings**: Use amber/gold tones (transition palette)
- **Errors**: Keep destructive red for actual errors only
- **Charts**: Use nature palette (greens, amber, earth tones)

---

## Typography

**Font Families:**
- Primary: Inter (via Google Fonts) - Headers, UI elements, metrics
- Secondary: JetBrains Mono (via Google Fonts) - Addresses, technical data, attestations

**Type Scale:**
- Headline (Score Display): text-5xl, font-bold (Inter)
- Section Headers: text-2xl, font-semibold (Inter)
- Card Titles: text-lg, font-semibold (Inter)
- Body Text: text-base, font-normal (Inter)
- Labels/Captions: text-sm, font-medium (Inter)
- Technical Data: text-sm, font-mono (JetBrains Mono)
- Micro Labels: text-xs, font-medium (Inter)

**Hierarchy Rules:**
- Trust level always displayed larger than score number
- Wallet addresses/DIDs in monospace, 25% opacity reduction for visual subordination
- Epoch timestamps in caption size, right-aligned
- Min-cut size and path counts get equal weight to primary score

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: gap-2, p-2 (within cards, between related elements)
- Standard spacing: gap-4, p-4, m-4 (card padding, list items)
- Section spacing: gap-6, py-6 (between card sections)
- Component spacing: gap-8, p-8 (between major components)
- Page sections: py-12 to py-16 (vertical rhythm)

**Grid System:**
- Main container: max-w-7xl mx-auto px-4
- Dashboard grid: grid-cols-1 lg:grid-cols-3 gap-6
- Two-column layouts: grid-cols-1 md:grid-cols-2 gap-6
- List items: Single column with consistent internal grid

**Responsive Breakpoints:**
- Mobile: Stack all cards vertically
- Tablet (md:): Two-column for endorsements, single for complex visualizations
- Desktop (lg:): Three-column dashboard, side-by-side detail views

---

## Component Library

### Navigation
**Top Navigation Bar:**
- Full-width, sticky positioning (sticky top-0)
- Height: h-16
- Inner container: max-w-7xl mx-auto flex justify-between items-center px-4
- Logo/Brand: text-xl font-bold
- Nav links: Horizontal tabs with active state indicator (2px bottom border)
- Wallet connection: Compact button with truncated address (0x1234...5678)
- Mobile: Hamburger menu, slide-out drawer

### Dashboard Cards

**Score Card (Hero):**
- Large card: p-8, rounded-2xl
- Visual hierarchy:
  - Level badge at top: inline-flex items-center gap-2, px-4 py-2, rounded-full, text-sm font-semibold
  - Score number: text-5xl font-bold, tracking-tight
  - Min-cut indicator: text-lg, flex items-center gap-2
  - Epoch timestamp: text-xs, absolute top-4 right-4
- Export attestation button: Prominent, full-width at bottom, gap-2 from content

**Why This Score Card:**
- Expandable accordion sections
- Path visualization: Vertical flow diagram using flexbox
  - Each hop: rounded-lg, p-3, flex items-center justify-between
  - Arrows between hops: Custom SVG or → character, text-2xl
  - Anonymous nodes: "Seed → • • • → You" pattern
  - Mutual-reveal links: text-sm underline, inline beside obfuscated hops
- Bottleneck list: Compact list with gap-2, each item p-3, rounded-lg
- Contribution breakdown: Horizontal progress bar visualization, h-3 rounded-full

**Improve Card:**
- List layout: space-y-4
- Each suggestion: p-4, rounded-lg, flex items-start gap-4
  - Icon area: w-10 h-10 flex-shrink-0, rounded-full, flex items-center justify-center
  - Text: flex-1, text-sm
  - Action button: ml-auto, whitespace-nowrap

### Tables & Lists

**Endorsements Table:**
- Responsive table: Hidden on mobile, show cards instead
- Desktop: w-full, border-collapse
  - Headers: text-xs font-semibold uppercase tracking-wide, py-3 px-4
  - Rows: py-4 px-4, border-b
  - Actions: flex gap-2, icon buttons
- Mobile cards: Stack vertically, gap-4, each p-4 rounded-lg

**Identity Section:**
- Primary wallet: Large display, p-6, rounded-xl
  - Address: font-mono text-lg, break-all
  - Copy button: Inline, icon-only
- Linked wallets: Grid of smaller cards, grid-cols-1 md:grid-cols-2 gap-4
- Optional handles: Form-like layout, space-y-4
  - Each field: Label above, input below, helper text underneath
  - Visibility toggles: Segmented control (Public/Followers/Private)

### Verification Screen

**Attestation Verifier:**
- Two-column layout: md:grid-cols-2 gap-8
- Left: Textarea for pasting attestation, h-64, font-mono text-sm, p-4, rounded-lg
- Right: Results panel (empty state then populated)
  - Status badge at top: Large, rounded-full, px-6 py-3
  - Details: Definition list (dl/dt/dd), gap-3, text-sm
  - Technical data: JSON code block, p-4, rounded-lg, overflow-x-auto

### Forms & Inputs

**Endorsement Form:**
- Search input: Prominent, h-12, rounded-lg, px-4, w-full
- Level selector: Radio button group styled as cards
  - Grid: grid-cols-1 sm:grid-cols-3 gap-3
  - Each option: p-4, rounded-lg, cursor-pointer, border-2
  - Active state: thicker border, subtle shift
- Submit button: w-full, h-12, rounded-lg, font-semibold

**All Form Fields:**
- Label: text-sm font-medium, mb-2
- Input: h-11, px-4, rounded-lg, w-full, text-base
- Helper text: text-xs, mt-1.5
- Error state: Border change, error text in red

### Buttons

**Button Hierarchy:**
- Primary: h-11, px-6, rounded-lg, font-semibold, text-sm
- Secondary: h-11, px-6, rounded-lg, border-2, font-semibold, text-sm
- Ghost: h-11, px-4, rounded-lg, font-medium, text-sm
- Icon-only: w-9 h-9, rounded-lg, flex items-center justify-center

**Button Groups:**
- Horizontal: flex gap-2
- Responsive: flex-col sm:flex-row gap-2

### Badges & Status Indicators

**Trust Level Badges:**
- Observer/Apprentice/Journeyer/Master: rounded-full, px-3 py-1, text-xs font-semibold, inline-flex items-center gap-1.5
- With icon: Leading icon, w-4 h-4

**Status Pills:**
- Verification status: rounded-full, px-2.5 py-1, text-xs font-medium
- Epoch status: Similar treatment, inline

---

## Data Visualization

**Flow Path Diagrams:**
- Vertical orientation for mobile, horizontal for desktop
- Node representation: Circles (w-8 h-8 to w-12 h-12), rounded-full
- Edge representation: SVG lines with stroke-2, or simple → arrows
- Spacing between nodes: gap-6 on mobile, gap-8 on desktop
- Labels: text-xs, positioned below nodes

**Progress Indicators:**
- Horizontal bars: h-2 to h-3, rounded-full, overflow-hidden
- Stacked segments for contribution breakdown
- Percentage labels: text-xs, positioned above bars

**Metric Cards:**
- Small stat displays: p-4, rounded-lg
- Number: text-3xl font-bold
- Label: text-xs uppercase tracking-wide, mt-1

---

## Micro-interactions

Use sparingly, only for:
- Button hover: Subtle opacity change (hover:opacity-90)
- Card hover: Subtle lift effect (hover:-translate-y-0.5 transition-transform)
- Tab switching: Sliding underline with transition-all duration-200
- Accordion expand/collapse: height transition with duration-300
- Copy button feedback: Icon swap (copy → check) for 2 seconds

---

## Iconography

**Icon Library:** Heroicons (via CDN)
- Navigation: outline style, w-5 h-5
- Action buttons: outline style, w-5 h-5
- Status indicators: solid style, w-4 h-4
- Large feature icons: outline style, w-8 h-8

**Custom Icons Needed:**
- <!-- CUSTOM ICON: Flow path diagram seed node -->
- <!-- CUSTOM ICON: Min-cut bottleneck indicator -->
- <!-- CUSTOM ICON: Trust level progression arrows -->

---

## Accessibility

- All interactive elements: min-h-11 (44px touch target)
- Form labels: Explicit for attributes linking to inputs
- Color never sole indicator: Always pair with icons or text
- Focus states: 2px offset ring on all focusable elements
- Contrast: All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Screen reader text: Use sr-only class for icon-only buttons
- Keyboard navigation: Tab order follows visual hierarchy

---

## Images

**No hero image.** This is a utility-focused dashboard application where data takes precedence.

**Iconographic Elements:**
- Trust level badges use icon + text combinations
- Flow visualization uses diagrammatic elements, not photos
- Profile avatars: Generated from wallet address (Boring Avatars or similar), rounded-full, w-10 h-10 to w-16 h-16