import { Component, type ReactNode, Suspense } from "react";

/** Catches any throw inside the 3D tree (bad GLB, WebGL loss) so one
 *  broken asset can never blank the whole app — it just skips that piece. */
export class SceneErrorBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(e: unknown) {
    console.error("[city] scene piece failed:", e);
  }
  render() {
    return this.state.err ? null : this.props.children;
  }
}

/** Local suspense sink: anything below that streams (useGLTF etc.) waits
 *  HERE instead of bubbling to the page-level boundary and unmounting the
 *  whole Canvas — that was the "city flashes then disappears" bug. */
export function SceneSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
