/**
 * The four "+" registration marks every blueprint-framed object wears.
 *
 * The design system pairs the `.blueprint` class with four corner children and
 * treats dropping them as a violation, so framed elements render `<Corners />`
 * as their first child rather than repeating the markup.
 */
export function Corners() {
  return (
    <>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </>
  );
}
