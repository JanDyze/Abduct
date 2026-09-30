import { ViewTransition } from "react";

// Slides page content left on forward navigation and right on back (see globals.css).
// Links opt in with transitionTypes={["nav-forward"]} or ["nav-back"]; other updates don't animate.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const types = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };
  return (
    <ViewTransition enter={types} exit={types} default="none">
      {children}
    </ViewTransition>
  );
}
