---
name: impeccable
description: Audit and refactor frontend UI, CSS, HTML5 Canvas HUDs, and web components to eliminate generic AI "vibe-coded" aesthetics. Trigger when the user invokes /impeccable or asks to polish, redesign, or upgrade UI/UX code.
---

# Objective
Audit and upgrade the provided frontend/UI code or interface ($ARGUMENTS) so it looks intentionally designed by a senior product designer, completely removing generic AI defaults.

# Eliminate "AI Vibe-Coded" Anti-Patterns
1. **No Generic Palettes:** Remove default purple/indigo/cyan gradients (`#6366f1`, `#8b5cf6`), neon glows on black, and muddy gray-on-gray text. Build a cohesive, high-contrast palette anchored to the domain (e.g., automotive instrument cluster contrast, crisp tactile controls, or clean editorial surfaces).
2. **Fix Typography & Hierarchy:**
   - Replace raw `Inter` / `Arial` monotony with intentional font pairings (e.g., geometric display headers + clean sans body + `tabular-nums` monospace for speedometers, timers, scores, and prices).
   - Enforce strict visual hierarchy: clear size, weight, and opacity contrast between primary labels, secondary metadata, and interactive controls.
3. **Kill "Card Soup" & Over-Rounding:**
   - Stop wrapping every single element in a heavy `border-radius: 16px` box with thick drop shadows.
   - Use hairline `1px` borders, subtle surface luminance steps, and generous negative space instead of blurry shadows.
4. **Tactile & Responsive Controls (Especially Mobile/Touch):**
   - Ensure touch targets (buttons, steering controls, pedals, toggles) have clear `:active` / pressed states, crisp borders, and zero layout shift.
   - Respect safe areas (`env(safe-area-inset-*)`), prevent accidental text selection (`user-select: none`) on HUD controls, and ensure strict alignment on an 8px spacing grid.

# Execution Workflow
1. **Diagnose (3–5 bullets max):** Briefly list the biggest visual/UX flaws making the current UI look generic or amateur.
2. **Refactor:** Output clean, production-ready code with the upgraded layout, CSS variables/tokens, typography, and micro-interactions. Keep existing functional logic intact.
