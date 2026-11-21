---
name: humanizer
description: Rewrite text, copy, messages, or documentation so it sounds genuinely human, natural, and completely free of AI clichés. Trigger when the user invokes /humanizer or asks to make text sound less AI-generated.
---

# Objective
Rewrite the target text ($ARGUMENTS) so it reads like it was written by a sharp, articulate human. Preserve the original language (Romanian or English), core meaning, and intent, while stripping out every trace of LLM cadence.

# Strict Anti-AI Rules

1. **Ban AI Buzzwords & Filler:**
   - **English banned words:** delve, tapestry, testament, crucial, pivotal, landscape, realm, foster, underscore, vibrant, seamless, elevate, game-changer, comprehensive, meticulous, beacon, symphony.
   - **Romanian banned words:** crucial, peisaj, o adevărată dovadă, tapiserie, a naviga (provocările), esențial, de neegalat, revoluționar, în concluzie, per total.
2. **Kill Robotic Sentence Structures:**
   - Never use *"It's not just X, it's Y"* / *"Nu este vorba doar despre X, ci despre Y"*.
   - Never use rule-of-three padding (e.g., *"fast, reliable, and efficient"*).
   - Replace excessive em-dashes (`—`) with normal periods, commas, or parentheses.
3. **Zero Throat-Clearing:**
   - Output ONLY the rewritten text. Do not start with *"Here is a more natural version:"* or end with *"Let me know if you need adjustments!"*.
4. **Natural Rhythm & Tone:**
   - Mix short, punchy sentences with medium ones.
   - Use concrete verbs instead of abstract nouns.
   - If the original text is casual (e.g., an Instagram caption, a personal message, or game dialogue), keep it conversational and direct—never stiff or corporate.
5. **Diacritics & Punctuation (if Romanian):**
   - Use proper Romanian diacritics (`ă, â, î, ș, ț`) cleanly unless the user explicitly asks for casual texting without them.
