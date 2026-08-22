import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { LAYOUT } from "../lib/city";
import { useCity } from "../store/useCity";
import { Building, District, NightMaterials } from "./Buildings";
import { Ground, Roads, Underground, Decor, Links } from "./Infrastructure";
import { Traffic } from "./Traffic.tsx";
import { People } from "./People";
import { River } from "./Water";
import { Atmosphere } from "./Atmosphere";
import { Precipitation } from "./Precipitation";
import { Lightning } from "./Lightning";
import { Wet } from "./Wet";
import { CameraRig } from "./CameraRig";
import { HDRI_DAY, HDRI_NIGHT, preloadAll } from "./assets";

/** swaps HDRI by time of day — venice_sunset (day) ↔ dikhololo_night */
function SkyEnvironment() {
  const time = useCity((s) => s.time);
  const day = time > 6.2 && time < 18.6;
  const files = day ? [HDRI_DAY] : [HDRI_NIGHT];
  return <Environment key={files[0]} files={files} background={false} environmentIntensity={day ? 0.55 : 0.25} />;
}

export function usePreload() {
  useEffect(() => { preloadAll(); }, []);
}

export function CityScene() {
  usePreload();
  return (
    <Canvas shadows camera={{ position: [0, 70, 90], fov: 45 }} onPointerMissed={() => useCity.getState().select(null)}>
      <color attach="background" args={["#070b18"]} />
      <fogExp2 attach="fog" args={["#070b18", 0.002]} />
      {/* city renders immediately; ONLY the HDR is suspended */}
      <Suspense fallback={null}><SkyEnvironment /></Suspense>
      <Ground />
      <River />
      <Roads L={LAYOUT} />
      <Underground L={LAYOUT} />
      <Decor L={LAYOUT} />
      <Links L={LAYOUT} />
      {LAYOUT.districts.map((d) => <District key={d.id} d={d} />)}
      {LAYOUT.buildings.map((b) => <Building key={b.id} b={b} />)}
      <Traffic L={LAYOUT} />
      <People L={LAYOUT} />
      <Precipitation />
      <Lightning target={[LAYOUT.byId.get("be-payctrl")!.pos[0], LAYOUT.byId.get("be-payctrl")!.pos[2]]} />
      <Wet L={LAYOUT} />
      <Atmosphere />
      <NightMaterials />
      <CameraRig />
      <EffectComposer>
        <Bloom intensity={0.55} luminanceThreshold={1.0} mipmapBlur />
        <Vignette darkness={0.55} />
      </EffectComposer>
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.15} minDistance={8} maxDistance={180} />
    </Canvas>
  );
}
