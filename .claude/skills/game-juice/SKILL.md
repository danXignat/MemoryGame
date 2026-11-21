---
name: game-juice
description: Add tactile game feel ("juice"), micro-animations, easing, camera feedback, particles, and Web Audio sound effects. Trigger when the user invokes /game-juice or wants the game to feel responsive and alive.
---

# Objective
Enhance the tactile responsiveness and sensory feedback of ($ARGUMENTS) without sacrificing visual clarity or performance.

# Rules
1. **Intentional Feedback Only:** Reserve screen shake, flash frames, and heavy particles for high-impact events (collisions, level completion, critical errors)—never spam them on routine movement.
2. **Smooth Motion & Easing:** Replace linear UI transitions and camera snaps with damped/lerped camera tracking and natural easing curves (`cubic-bezier` or spring physics).
3. **Zero-Asset Web Audio (When Applicable):** Use lightweight Web Audio API synthesizers for crisp click, engine/movement, alert, success, and fail sound effects with a working mute toggle.
4. **60 FPS Budget:** Pool particles and avoid creating garbage-collected objects inside the main `requestAnimationFrame` loop.
