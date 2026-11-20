# CampusHub design system: "The Campus, Reimagined"

Editorial, typography-led, premium. Deep Ink and Campus Green on Warm Paper, set in Plus Jakarta Sans. Source of truth: `src/theme/tokens.ts`. Screens must use tokens and `src/components/ui`, never hard-coded colours.

## Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| background | `#F7F6F0` Warm Paper | `#101713` | page |
| surface | `#FFFFFF` | `#19221C` | cards, inputs |
| surfaceAlt | `#E8EDE5` Muted Sage | `#222D25` | quiet fills |
| border | `#E5E8E1` | `#2C3930` | separation (instead of shadows) |
| text | `#14231D` Deep Ink | `#F2F5EF` | primary text |
| textSecondary | `#69736D` Slate | `#A5B1A6` | secondary text |
| primary | `#C7F36B` Campus Green | same | primary actions, active states |
| onPrimary | `#14231D` | `#14231D` | text on green |
| inverse | `#14231D` | `#0A0F0C` | premium dark feature cards |

Category colours (each identifies a kind of content, never random): Sky `#87C8F8` Tech, Coral `#FF755E` Sports, Lavender `#B8A5F5` Cultural, Yellow `#F3C969` Career, Green Social. Text on category colours is always Deep Ink.

University identity: each university has its own colour (`colors.university`), used only for its logo tile. The brand colour stays Campus Green everywhere.

## Typography: Plus Jakarta Sans
Five static files in `assets/fonts` (copied to `android/app/src/main/assets/fonts`). Never add `fontWeight`; the weight is part of the font family.

| Variant | Size / line | Weight | Use |
|---|---|---|---|
| numeral | 44 / 46 | ExtraBold | event dates |
| display | 40 / 44 | ExtraBold | hero headlines |
| hero | 34 / 38 | ExtraBold | onboarding, step titles |
| title1 | 30 / 36 | Bold | screen titles |
| title2 | 22 / 28 | Bold | section titles |
| title3 | 18 / 24 | Bold | card headings |
| cardTitle | 16 / 22 | SemiBold | list and card titles |
| body / bodyLg | 15 / 16 | Regular | text |
| small, caption | 13 / 12 | Regular/Medium | secondary |
| overline | 11 | Bold, +1.1 tracking, uppercase | labels |

## Layout
- 4-pt spacing scale (4, 8, 12, 16, 24, 32, 48), page gutter 20.
- Radius: 8, 12, 16, 20 (cards), 28 (feature cards), pill (chips only).
- Surfaces are separated by hairline borders; shadows are rare.
- Do not nest cards inside cards. Mix card shapes: editorial (featured), rail, row, tile.

## Components (`src/components/ui`)
Button (primary green, secondary ink, soft, ghost, danger), Card, Chip (selected = ink + green text), Badge, Input, IconButton, Avatar (solid category tiles), ListRow, SegmentedControl, SectionHeader (eyebrow + title + action), ScreenHeader, EmptyState, Skeleton, Logo, GoogleButton, FadeIn, and **PatternArt**: flat geometric artwork (grid, stripes, waves, blocks, dots, rings, circles) used for event posters, album covers and society covers instead of gradients.

## Navigation
Flat bottom bar: Home, Events, Photos, Societies, Profile. Active tab = green pill behind an ink icon plus a bold label.

## Per-screen character
- **Home:** university tile, big headline with green highlight, dark featured event, event rail, quick-access mosaic (differently sized colour tiles), updates feed where official / society / alert items each look different.
- **Events:** category chips with colour dots, date strip, featured card, rows with category art.
- **Societies:** discovery rail of cover cards, 2-column grid with identity-coloured logos.
- **Photos:** edge-to-edge gallery with a staggered grid, no borders.
- **Profile:** typography-led identity, stats set in type, interests, societies, saved events; settings compact at the bottom.

## Motion
Subtle press scale (98%), fade-and-rise for hero sections, tab fade, animated onboarding dots. No bouncing.

## Gotchas
See `docs/ANDROID_SETUP.md` (UI gotchas). New fonts must be added to `android/app/src/main/assets/fonts` and require a native rebuild.
