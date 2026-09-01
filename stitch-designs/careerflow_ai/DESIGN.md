---
name: CareerFlow AI
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#191c1e'
  on-tertiary-container: '#818486'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1280px
  gutter: 24px
---

## Brand & Style
The design system is built on a foundation of **Minimalism** and **Modern Corporate** aesthetics, specifically tailored for the high-stakes environment of career advancement. The brand personality is "The Intelligent Partner"—authoritative yet accessible, sophisticated yet functional. 

The visual narrative avoids stereotypical "AI" glow effects in favor of precision, clarity, and high-trust interactions. Every element serves a purpose, utilizing generous whitespace to reduce cognitive load for job seekers. The emotional goal is to move the user from a state of career anxiety to a state of controlled progress ("flow").

## Colors
The palette is rooted in **Deep Navy (#0F172A)** to establish immediate professional authority. The core interface relies on a "Slate & Snow" background strategy: pure white surfaces for active content areas layered over a **Very Light Slate (#F8FAFC)** foundation to create subtle structural depth.

The **AI Indigo (#6366F1)** is used as a purposeful accent. It should be reserved exclusively for "Intelligent" features—AI suggestions, automated tailoring, and insights—signaling to the user where the system is working on their behalf. Status colors are desaturated slightly to maintain the premium feel while remaining highly legible.

## Typography
The typography utilizes **Inter** exclusively to lean into its systematic, utilitarian heritage. To maintain a premium feel, display and large headlines use tight letter-spacing (`-0.02em`) and heavy weights. 

The hierarchy is strictly enforced: 
- **Display/Headlines:** Used for dashboard summaries and page titles.
- **Body:** Standardized at 16px for optimal readability of long-form job descriptions and resumes.
- **Labels:** Small labels use uppercase with increased tracking to differentiate "metadata" from "content."

## Layout & Spacing
This design system employs a **Fixed Grid** model for the main content area (1280px max-width) to ensure text-heavy resume data remains legible and focused. 

- **Desktop (1200px+):** 12-column grid, 24px gutters, 40px margins.
- **Tablet (768px - 1199px):** 8-column grid, 16px gutters, 24px margins.
- **Mobile (<767px):** 4-column grid, 16px gutters, 16px margins.

Spacing follows a linear 8pt scale. Use `lg` (40px) for section vertical spacing to maintain the "premium" airy feel, and `sm` (16px) for internal card padding.

## Elevation & Depth
Depth is created through **Tonal Layers** rather than heavy shadows. 

1. **Level 0 (Background):** Slate-50 (#F8FAFC) - The canvas.
2. **Level 1 (Cards/Surface):** Pure White (#FFFFFF) - Used for all primary content modules.
3. **Level 2 (Active/Floating):** Use a very soft, highly diffused shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) for elements that require focus, such as dropdowns, modals, or active drag-and-drop resume blocks.

Avoid dark borders; use 1px solid #E2E8F0 (Slate-200) for structural definition between white surfaces.

## Shapes
The shape language is **Rounded**, striking a balance between the "softness" of a human-centric platform and the "precision" of an AI tool. 

- **Standard Cards/Inputs:** 0.5rem (8px) radius.
- **Buttons/Large Modules:** 1rem (16px) radius for a more approachable, modern feel.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components
- **Buttons:** 
  - *Primary:* Deep Navy background, white text. High-contrast.
  - *AI-Action:* Indigo background with a subtle 10% opacity white inner-glow.
  - *Ghost:* Transparent with Slate-200 border for secondary navigation.
- **Cards:** White background, 8px radius, 1px Slate-200 border. No shadow by default; "hover" state introduces the Level 2 soft shadow.
- **Input Fields:** 8px radius, Slate-50 background. On focus, the border transitions to Primary Navy (or Indigo if it's an AI-assisted field).
- **Status Indicators:** Small dots or pill-shaped chips using the Success/Warning/Error palette. Labels inside chips should use `label-sm` typography.
- **Progress Steppers:** Vertical, thin 2px lines in Slate-200, with active steps highlighted in Indigo to represent the "Flow" of the application process.
- **AI Insight Badge:** A small, 4px-radius tag with an Indigo-50 background and Indigo-600 text, used to mark AI-generated suggestions within a list.