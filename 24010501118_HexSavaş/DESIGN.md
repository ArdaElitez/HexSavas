---
name: Obsidian Hex
colors:
  surface: '#131314'
  surface-dim: '#131314'
  surface-bright: '#3a393a'
  surface-container-lowest: '#0e0e0f'
  surface-container-low: '#1c1b1c'
  surface-container: '#201f20'
  surface-container-high: '#2a2a2b'
  surface-container-highest: '#353436'
  on-surface: '#e5e2e3'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e5e2e3'
  inverse-on-surface: '#313031'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#ffb3b2'
  on-secondary: '#680012'
  secondary-container: '#ff525c'
  on-secondary-container: '#5b000f'
  tertiary: '#fff6e4'
  on-tertiary: '#3a3000'
  tertiary-container: '#ffd81d'
  on-tertiary-container: '#715e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b2'
  on-secondary-fixed: '#410008'
  on-secondary-fixed-variant: '#92001e'
  tertiary-fixed: '#ffe16d'
  tertiary-fixed-dim: '#e9c400'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#131314'
  on-background: '#e5e2e3'
  surface-variant: '#353436'
typography:
  phase-indicator:
    fontFamily: Space Grotesk
    fontSize: 42px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: 0.1em
  unit-name:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  stat-value:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 16px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  currency-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
spacing:
  unit: 4px
  container-padding: 16px
  gutter: 12px
  shop-item-gap: 8px
  safe-area-inset: 24px
---

## Brand & Style
The design system is engineered for a high-stakes, competitive mobile auto-battler. It evokes a sense of strategic depth, digital precision, and high-energy combat. The aesthetic is a fusion of **Glassmorphism** and **Futuristic Geometric** styles, utilizing semi-transparent layers to maintain a sense of field awareness even when menus are open. The emotional response is one of "tactical immersion"—players should feel like they are operating a high-tech battle commander’s console. Sharp angles and hexagonal motifs ground the interface in the game's core logic.

## Colors
The palette is rooted in a "Deep Obsidian" base to ensure maximum contrast for gameplay elements. 
- **Primary (Neon Blue):** Reserved for player-controlled units, allied health bars, and active ability indicators.
- **Secondary (Glowing Crimson):** Specifically used for enemy units, threats, and "In-Combat" phase warnings.
- **Tertiary (Rich Gold):** Dedicated exclusively to the economy, including the shop bar, gold total, and premium rewards.
- **Neutrals:** Obsidian (#0A0A0B) serves as the base layer, while Charcoal (#1A1C1E) is used for elevated containers and shop backgrounds.

## Typography
This design system utilizes **Space Grotesk** for all high-impact UI elements to reinforce the futuristic, technical theme. Its geometric construction mimics the hex-grid logic. For dense information like unit stats and ability descriptions, **Inter** is employed for its superior legibility at small scales on mobile screens. All headings should be set in uppercase with slight tracking (letter spacing) to enhance the "display" feel.

## Layout & Spacing
The layout follows a **fluid grid** model optimized for landscape mobile orientation. The interface is anchored by safe-area margins of 24px to prevent interference with hardware notches or rounded corners. The shop bar is pinned to the bottom 30% of the screen, utilizing a horizontal scroll or fixed 5-slot flex container. Phase indicators are centered at the top to maintain a symmetrical tactical balance. Spacing follows a 4px base scale to ensure geometric alignment with the hex-grid field.

## Elevation & Depth
Depth is achieved through **Glassmorphism** and **Inner Glows** rather than traditional shadows. 
- **Tier 1 (Surface):** The Obsidian background.
- **Tier 2 (Panels):** Charcoal surfaces with 60% opacity and a 16px backdrop blur. 
- **Tier 3 (Active Elements):** Unit cards and shop items feature a 1px solid border in the respective category color (Blue/Gold) with a matching 4px outer neon glow (bloom effect).
- **Overlays:** Full-screen modals use a darker 80% tint to pull focus to the center.

## Shapes
This design system employs a **Sharp (0)** roundedness strategy. To mirror the hexagonal grid of the battlefield, all UI components feature 90-degree corners or 45-degree "clipped" corners (chamfers). This aggressive, geometric shape language differentiates the game from softer, casual titles. Decorative "tech-lines" and hex-pattern watermarks should be used sparingly in the background of cards and containers.

## Components
- **Unit Cards:** Use vertical rectangular containers with clipped top-right corners. The bottom 20% contains stat icons (Sword/Shield) using Inter.
- **Shop Bar:** A full-width translucent charcoal bar with gold trim. Shop slots use "Empty State" dashed borders when a unit is purchased.
- **Phase Indicators:** Large, centered Space Grotesk text with a secondary glow. Use "BATTLE" (Crimson) and "PREPARATION" (Blue) to signify game states.
- **Gold Display:** A persistent top-right component. A gold-rimmed hexagonal icon paired with high-weight Space Grotesk text.
- **Buttons:** All buttons are sharp-edged. Primary actions (Roll/Level Up) feature a full color fill; secondary actions use an "Outline" style with a subtle inner glow.
- **Hex-Grid Highlights:** When a unit is selected, the underlying grid cell should emit a Primary Blue pulse with 40% opacity.