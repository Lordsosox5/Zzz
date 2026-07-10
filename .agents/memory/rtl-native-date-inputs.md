---
name: RTL pages + native date/time inputs
description: Why native <input type="date"> segments render mirrored (e.g. "يوم" as "موي") in RTL apps and the correct fix.
---

Native `<input type="date">` (and time/datetime-local/month/week) has an internal shadow-DOM day/month/year control that Chromium/WebKit render specially. Applying CSS `direction: rtl` (or even `direction: ltr`) alone to these inputs is not enough and can cause the browser to double-flip Arabic segment labels character-by-character (e.g. "يوم" → "موي").

**Why:** the shadow-DOM segments respond to the `dir` HTML attribute set on the element, not just the CSS `direction` property — CSS-only overrides misbehave in Chromium for these specific control types.

**How to apply:** always set the `dir="ltr"` HTML attribute directly on date/time-type inputs (do this at the DOM level, e.g. in the shared `Input` component keyed off `type`), regardless of page language. Only use CSS (`text-align`) to adjust the control's visual alignment within an RTL layout — never rely on CSS `direction` for these input types.
