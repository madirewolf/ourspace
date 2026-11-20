import { flushSync } from "react-dom";
import { useApp, type Screen } from "./store";

/**
 * Screen changes go through the View Transitions API so nothing ever hard-cuts:
 * a soft cross-fade by default, the orbit launch when leaving for discovery.
 * Falls back to an instant change without support or with reduced motion.
 */
export type TransitionKind = "fade" | "orbit";

let pending = 0;

export function withTransition(update: () => void, kind: TransitionKind = "fade") {
  const apply = () => flushSync(update);
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced || typeof document.startViewTransition !== "function") {
    apply();
    return;
  }
  const root = document.documentElement;
  const token = ++pending;
  // The attribute scopes the transition's CSS; it must be set before the old
  // frame is captured and stay until the animation ends.
  root.dataset.transition = kind;
  const transition = document.startViewTransition(apply);
  void transition.finished.finally(() => {
    if (token === pending) delete root.dataset.transition;
  });
}

export function goTo(screen: Screen, kind: TransitionKind = "fade") {
  withTransition(() => useApp.getState().setScreen(screen), kind);
}

/** Drop-in for `useApp((s) => s.setScreen)` that transitions between screens. */
export function useNavigate() {
  return goTo;
}
