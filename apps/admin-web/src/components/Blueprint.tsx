/**
 * The four "+" registration marks every blueprint-framed object wears.
 * The design system pairs the `.blueprint` class with four corner children;
 * never drop them from a framed element.
 */
export function Corners() {
  return (
    <>
      <i className="corner tl" aria-hidden="true" />
      <i className="corner tr" aria-hidden="true" />
      <i className="corner bl" aria-hidden="true" />
      <i className="corner br" aria-hidden="true" />
    </>
  );
}
