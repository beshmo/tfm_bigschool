---
name: "Proofread"
description: Send the given text to a subagent that reviews and corrects it (grammar, spelling, phrasing), explains the fixes in an educational way, then hand back only the corrected text
category: Writing
tags: [writing, grammar, education]
---

Take the text passed after `/proofread` and have a subagent review it for grammar, spelling, word choice, and phrasing issues, teach the user why each fix was needed, and return the corrected version.

**Input**: The text to review/fix follows the command invocation. If no text was passed, ask the user for the phrase or passage they want corrected before doing anything else.

**Steps**

1. Spawn an `Agent` with `subagent_type: english-tutor` (run in foreground since the result is needed immediately) with a self-contained prompt that includes:
   - The exact input text, quoted verbatim (do not paraphrase or "clean it up" before handing it over — the subagent needs the original errors intact).
   - A reminder of what's expected back: every grammar/spelling/phrasing issue explained educationally, optional style/readability/fluency suggestions clearly marked as such, and a final `Corrected:` section with just the fixed text so it can be extracted cleanly.

   The `english-tutor` agent is read-only (Read/Grep/Glob only, no Write/Edit/Bash) and runs on Sonnet — it only analyzes the text handed to it in the prompt, it does not need repo access.

2. Once the subagent returns, extract the corrected phrase from its report.

3. Reply to the user with:
   - The corrected text (prominently, e.g. in a blockquote or code span).
   - A short educational summary of what was fixed and why, drawn from the subagent's explanations — concise, not a wall of text.

**Guardrails**
- Do not silently rewrite the user's text yourself — the correction and explanation must come from the subagent, not be fabricated inline.
- Keep the returned explanation genuinely educational (the *why*, not just the *what*) but brief — a few bullet points, not an essay.
- If the input text has no errors, say so plainly and return it unchanged rather than inventing issues.
