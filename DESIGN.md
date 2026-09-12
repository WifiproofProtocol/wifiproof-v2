# WiFiProof Design System

## Direction

**Signal Field** is a warm, mechanical, optimistic visual system. Public pages feel like a physical field of radio waves, coordinates, and human signals converging into a small cryptographic seal. Product pages reuse the same colors and geometry with restrained motion and familiar controls.

Physical scene: an attendee opens WiFiProof on a phone in a bright, crowded conference hall and understands the next action before the room noise can distract them.

## Brand Voice

- Short, specific sentences.
- Prefer “venue network signal” over “Wi-Fi proof.”
- Prefer “private proximity proof” over “verified GPS.”
- Explain limitations in plain language.
- No em dashes, crypto hype, or repeated section introductions.

## Color

Use OKLCH tokens. Never use pure black or pure white.

- Canvas: `oklch(0.965 0.012 88)`
- Paper: `oklch(0.985 0.008 88)`
- Ink: `oklch(0.205 0.025 265)`
- Muted ink: `oklch(0.48 0.025 260)`
- Cobalt: `oklch(0.55 0.24 263)`
- Cobalt dark: `oklch(0.43 0.22 263)`
- Coral: `oklch(0.69 0.19 35)`
- Mint: `oklch(0.88 0.11 158)`
- Line: `oklch(0.86 0.018 85)`
- Success: `oklch(0.60 0.15 155)`
- Warning: `oklch(0.72 0.15 75)`
- Error: `oklch(0.58 0.19 27)`

The landing page uses a committed cobalt/coral palette. Product surfaces use warm neutrals with cobalt reserved for actions, focus, and selected state.

## Typography

- Brand: self-hosted **Familjen Grotesk Variable**, chosen for its warm mechanical shapes.
- Product: native system sans stack for speed and familiarity.
- Display headings use strong weight contrast, tight tracking, and fluid sizes.
- Body copy stays within 68 characters where practical.
- Technical identifiers use the platform monospace stack only when they are actually identifiers.

## Shape and Layout

- Signal mark: independent paths converging into one central proof seal.
- Brand layouts are asymmetric with one dominant visual per fold.
- Product layouts use predictable grids and standard form controls.
- Corners range from 12px for controls to 28px for major brand surfaces.
- Cards are used only for independently actionable or scannable objects.

## Motion

- Brand motion uses transform and opacity only, with ease-out quart timing.
- The hero animation loops slowly through signal collection, convergence, and confirmation.
- Product transitions last 150–220ms and only communicate state.
- `prefers-reduced-motion` receives a complete static composition.

## Components

- Primary action: ink or cobalt fill, high-contrast text, 44px minimum height.
- Secondary action: transparent surface with a full 1px border.
- Focus: 3px cobalt ring with offset.
- Status: icon plus text, never color alone.
- Loading: skeletons for content and inline progress copy for actions.
- Empty states explain the next available action.

## Content Architecture

The public homepage contains only: hero, how it works, products, one privacy statement, FAQ, final action, and footer. Protocol metrics live in the event explorer. The public Verification API is not advertised until it has stable documentation and credentials.
