import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCity, followTarget } from "../store/useCity";

/**
 * Camera brain — three competing drivers, resolved each frame:
 *  1. mission courier (followTarget.active) → cinematic chase/orbit cam
 *  2. focus target (building click)         → framing fly-to
 *  3. intro fly-in on first load
 * Mission wins over everything; a user grab of the scene cancels intro only.
 */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as any;
  const focus = useCity((s) => s.focus);
  const following = useCity((s) => s.following);
  const desired = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const targetV = useMemo(() => new THREE.Vector3(), []);

  // no auto fly-in — the camera stays exactly where the user leaves it until
  // a dispatched mission (RUN button) takes over with the cinematic cam
  useEffect(() => {
    const cancelIntro = () => {
      const st = useCity.getState();
      if (!st.following && !st.focus) desired.set(0, 0, 0);
    };
    window.addEventListener("pointerdown", cancelIntro, { once: true });
    return () => window.removeEventListener("pointerdown", cancelIntro);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (focus) {
      targetV.set(focus.x, 1, focus.z);
      desired.set(focus.x + 12, 14, focus.z + 12);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus]);

  useFrame(({ camera }, dt) => {
    if (!controls) return;
    const k = 1 - Math.pow(0.002, Math.min(dt, 0.05));

    // ── driver 1: the mission courier owns the camera ──
    if (followTarget.active) {
      const { x, z, tx, tz, dwell } = followTarget;
      if (dwell) {
        // orbit AROUND the gateway: slow arc, low-ish tilt so the floating
        // card + building facade both read. Radius 16, height 10.
        desired.set(x + tx * 16, 10, z + tz * 16);
      } else {
        // chase cam: behind-left of the travel direction (tx,tz = tangent),
        // offset back along −tangent and slightly left, looking ahead.
        desired.set(x - tx * 13 - tz * 4, 8.5, z - tz * 13 + tx * 4);
      }
      targetV.set(dwell ? x : x + tx * 6, dwell ? 2.5 : 1.2, dwell ? z : z + tz * 6);
      camera.position.lerp(desired, k * 0.9);
      controls.target.lerp(targetV, k);
      controls.update();
      return;
    }

    // ── driver 2/3: focus framing & intro ──
    if (desired.lengthSq() === 0) return;
    camera.position.lerp(desired, k * 0.7);
    controls.target.lerp(targetV, k);
    controls.update();
    if (!following && camera.position.distanceTo(desired) < 0.4) desired.set(0, 0, 0);
  });
  return null;
}
