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
- **Rule:** take every color, font, spacing, radius and shadow from a variable;
  never hard-code a value a token carries.

## Reproducing the blueprint look

Cards, panels, figures and the primary button are _blueprint objects_: square
corners (`border-radius: 0`), a 1px `--color-divider` hairline border, no
surface fill, and four `+` registration marks that sit 6px outside each corner.

```tsx
<div className="card blueprint">
  <Corners /> {/* renders <i class="corner tl|tr|bl|br" /> — see components/Blueprint.tsx */}
  …content…
</div>
```

`.blueprint` needs `position: relative`; the corner children are 11×11px
crosses drawn with `::before`/`::after` in 55% `--color-text`. Never drop the
marks from a framed element, and never round or surface-fill a card. The
component classes (`.btn`, `.input`, `.field`, `.card`, `.table`, `.tag`,
`.dialog`, `.nav`) live in the rest of `styles.css`. Icons are Lucide at
stroke-width 1.5 (`components/Icon.tsx`).
