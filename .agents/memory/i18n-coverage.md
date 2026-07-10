---
name: i18n translation coverage for pages
description: How to fully translate a page in this EHR, including easily-missed spots like toast messages.
---

When asked to translate a page's remaining hardcoded strings to Arabic, hardcoded English text hides in more places than the visible JSX: placeholders, `title=` tooltip attrs, Select item labels used in multiple dialogs (e.g. a "create" form and an "edit" form often duplicate the same option list), and especially `toast({ title, description })` calls inside mutation `onSuccess`/`onError` handlers.

**Why:** toast messages are easy to skip because they're not visible without triggering the action (delete, reset password, etc.), and duplicate Select option lists (add vs. edit dialogs) are easy to only fix once.

**How to apply:** after adding `t("...")` calls in the visible form/table markup, grep the file for quoted capitalized English strings (`grep -n '"[A-Z][a-zA-Z ]*"' file.tsx`) to catch stragglers, and explicitly check every `toast(...)` call and every duplicated `<SelectItem>` list in the file.
