import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCity, followTarget } from "../store/useCity";

export function CameraRig() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controls = useThree((s) => s.controls) as any;
  const focus = useCity((s) => s.focus);
  const following = useCity((s) => s.following);
  const desired = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const targetV = useMemo(() => new THREE.Vector3(), []);

  // cinematic fly-in from the spawn point
  useEffect(() => {
    targetV.set(0, 1, -6);
    desired.set(26, 30, 62);
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

  useFrame((state, dt) => {
    if (!controls) return;
    if (following && followTarget.active) {
      targetV.set(followTarget.x, 1, followTarget.z);
      desired.set(followTarget.x - 9, 8, followTarget.z + 9);
    }
    if (desired.lengthSq() === 0) return;
    const k = 1 - Math.pow(0.002, dt);
    state.camera.position.lerp(desired, k * 0.7);
    controls.target.lerp(targetV, k);
    controls.update();
    if (!following && state.camera.position.distanceTo(desired) < 0.4) desired.set(0, 0, 0);
  });
  return null;
}
