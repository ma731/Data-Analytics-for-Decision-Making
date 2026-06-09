# Air India War Room — Design System

> Source of record: **ui-ux-pro-max** (style: *Modern Dark / Cinema*; chart lib: *Recharts*).
> Evaluated against bencium-impact-designer / impeccable / frontend-design — those are
> generative build skills, applied as polish at implementation time. ui-ux-pro-max wins
> as the system because it returns a queryable palette + type + chart-type matrix.

## Aesthetic
"Bloomberg terminal meets aviation ops." Dark, layered, authoritative, cinematic.
Deep navy-black canvas, frosted-glass panels, restrained glow, one amber alert accent,
Air India brand red/gold as identity accents. Calm until a number needs to alarm you.

## Palette (dark-mode primary)
| Token | Hex | Use |
|-------|-----|-----|
| `--bg` | `#0A0E1A` | app canvas (never pure black — OLED smear) |
| `--surface` | `#111726` | panels / cards |
| `--surface-2` | `#161D30` | raised panels, table rows |
| `--border` | `#1F2A44` | hairlines, dividers |
| `--text` | `#F1F5F9` | primary text |
| `--text-muted` | `#94A3B8` | secondary / labels |
| `--data-blue` | `#3B82F6` | primary data series |
| `--data-blue-bright` | `#60A5FA` | highlighted data |
| `--accent` | `#FBBF24` | amber — alerts, the "panic tax", CTAs |
| `--positive` | `#10B981` | savings / good |
| `--negative` | `#EF4444` | cost / risk |
| `--brand-red` | `#D31145` | Air India identity accent |
| `--brand-gold` | `#C99A3B` | Air India identity accent |

Frontier gradient: efficient = `--positive` → inefficient = `--negative` (blue-green to red).

## Typography
- **Display / headings:** Space Grotesk (600/700) — confident grotesque, авиа-grade authority
- **Body:** Inter (400/500) — clean, neutral, executive-readable
- **Numbers / data:** JetBrains Mono (500) — **tabular figures** so KPIs and tables don't jitter
- Scale: 12 / 14 / 16 / 20 / 28 / 40 / 64. Line-height 1.5 body, 1.1 display.

## Charts (Recharts)
- **Efficiency Frontier** → Scatter/Bubble. x = fuel kg/seat, y = revenue/seat, bubble = volume,
  color = rev-per-fuel gradient (green→red). Opacity 0.75. Hover tooltip with exact values.
- **Panic Tax** → Line/Area, single series, amber, with reference dots at the bucket boundaries.
- **Stops double-crime** → grouped bar (price vs fuel/seat on dual framing).
- **Business whitespace** → horizontal bar, brand-red for sellers vs muted for non-sellers.
- Gridlines `--border` low-contrast; tabular mono on all axes; every chart has a one-line
  insight caption (screen-reader summary) and a data-table fallback section.

## Motion
150–300ms ease-out entrances; number count-up on KPI mount; staggered panel reveals
(40ms); scale-press 0.97 on interactive cards; respect `prefers-reduced-motion`.

## Layout
12-col grid, max-w 1440, 8px spacing rhythm. Sticky top command bar (brand + live clock +
"AS OF FEB–MAR 2022"). Hero KPI band → Frontier (hero chart) → Panic Tax → Stops →
Business whitespace → Route explorer → Recommendations.
