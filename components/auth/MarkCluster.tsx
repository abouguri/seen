/**
 * The sign-in page's whole composition: the SEEN mark at roughly fifteen
 * times its normal size, drifting.
 *
 * It is the same three cards at the same angles as
 * components/shell/SeenMark — deliberately, so the thing filling half the
 * page is the logo rather than an abstract shape that happens to sit
 * near one. What changes at this scale is the weight: the mark's flat
 * orange/lilac/violet fills would be three enormous blocks of colour, so
 * each card becomes a translucent panel with a hairline edge. Light mode
 * flips them to opaque tints instead — see the tokens in globals.css for
 * why translucency stops working over paper.
 *
 * No JavaScript. The drift is three CSS animations, the geometry and
 * every colour are classes and tokens, and reduced motion resolves the
 * cards onto the logo's own angles rather than pausing them mid-path.
 * All of that lives in the .auth-cluster / .auth-card block in
 * globals.css, which is also where the breakpoints crop this to a corner
 * mark on narrow viewports.
 */
export function MarkCluster() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-2 overflow-hidden"
    >
      <div className="auth-cluster">
        <div className="auth-card auth-card-back" />
        <div className="auth-card auth-card-mid" />
        <div className="auth-card auth-card-front">
          <div className="auth-card-dot" />
        </div>
      </div>
    </div>
  );
}
