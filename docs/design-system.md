# Admin Design System (Industry)

The admin frontend uses the **Industry** design system: a steel-blue wireframe
look built from tokens and a few component classes.

- **Token sheet:** [`design-tokens.css`](design-tokens.css) — every `--color-*`
  (base roles plus `neutral`, `accent` and `accent-2` ramps, steps 100–900),
  `--font-*` (Barlow Condensed headings at weight 600, Barlow body, loaded from
  Google Fonts), `--space-*` (1, 2, 3, 4, 6, 8 → 3.4–27.2px), `--radius-*` and
  `--shadow-*` value, plus the `.blueprint` frame. It is a verbatim extract of
  `apps/admin-web/src/styles.css`, which stays the source of truth;
  `apps/admin-web/src/design-tokens.test.ts` fails when the two drift.
- **Component and layout sheet:** [`design-components.css`](design-components.css)
  — everything after the `.blueprint` frame, in two layers that build on the
  tokens: the system's component classes (`.btn`, `.btn-primary|secondary|ghost|icon|block`,
  `.field`, `.input`, `.radio`, `.tag-*`, `.nav*`, `.table`, `.dialog*`, and the
  square-cornered blueprint overrides), then the OKVNS Admin layout (`.site-header`,
  `.wrap`, `.page-head`, `.crumb`, `section.block`, `.panel`, `.toolbar`,
  `.table-wrap`, `.pagination`, `.empty-state`, `.skeleton-*`, `.error-banner`,
  `.file-drop`, `.site-footer`, `.toast*`). It is also a verbatim extract of
  `styles.css`, guarded by the same test. Load order: tokens first, then components.
  `styles.css` is reproduced as its own header comment, then `design-tokens.css`,
  then `design-components.css` (their header comments removed).
- **Rule:** take every color, font, spacing, radius and shadow from a variable;
  never hard-code a value a token carries.

## Reproducing the blueprint look

Panels, figures and the primary button are _blueprint objects_: square
corners (`border-radius: 0`), a 1px `--color-divider` hairline border, no
surface fill, and four `+` registration marks that sit 6px outside each corner.

```tsx
<div className="panel blueprint">
  <Corners /> {/* renders <i class="corner tl|tr|bl|br" /> — see components/Blueprint.tsx */}
  …content…
</div>
```

`.blueprint` needs `position: relative`; the corner children are 11×11px
crosses drawn with `::before`/`::after` in 55% `--color-text`. Never drop the
marks from a framed element, and never round or surface-fill a panel. Framed
panels are `.panel blueprint`; the primary and secondary submit buttons are
`.btn … blueprint`. There is no `.card` rule: the frame comes entirely from
`.blueprint`. Icons are Lucide at stroke-width 1.5 (`components/Icon.tsx`).
The stylesheet imports Barlow and Barlow Condensed from Google Fonts, so the
intended typography needs network access (the `system-ui` fallback applies
offline).
