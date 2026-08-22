import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useCityLayout } from "../lib/city";
import { useCity } from "../store/useCity";
import { Building, District, NightMaterials } from "./Buildings";
import { Ground, Roads, Underground, Decor, Links } from "./Infrastructure";
import { Traffic } from "./Traffic";
import { People } from "./People";
import { River } from "./Water";
import { Atmosphere } from "./Atmosphere";
import { Precipitation } from "./Precipitation";
import { Lightning } from "./Lightning";
import { Wet } from "./Wet";
import { CameraRig } from "./CameraRig";
import { Connections } from "./Connections";
import { HDRI_DAY, HDRI_NIGHT, preloadAll } from "./assets";

/** swaps HDRI by time of day — venice_sunset (day) ↔ dikhololo_night */
function SkyEnvironment() {
  const time = useCity((s) => s.time);
  const day = time > 6.2 && time < 18.6;
  const files = day ? [HDRI_DAY] : [HDRI_NIGHT];
  return <Environment key={files[0]} files={files} background={false} environmentIntensity={day ? 0.55 : 0.25} />;
}

/** kick off GLB preloading once the module loads */
function usePreload() {
  useEffect(() => { preloadAll(); }, []);
}

export function CityScene() {
  usePreload();
  const L = useCityLayout();
  const cityEdges = useCity((s) => s.city.edges);
  return (
    <Canvas shadows camera={{ position: [0, 70, 90], fov: 45 }} onPointerMissed={() => useCity.getState().select(null)}>
      <color attach="background" args={["#070b18"]} />
      <fogExp2 attach="fog" args={["#070b18", 0.002]} />
      {/* city renders immediately; ONLY the HDR is suspended */}
      <Suspense fallback={null}><SkyEnvironment /></Suspense>
      <Ground />
      <River />
      <Roads L={L} />
      <Underground L={L} />
      <Decor L={L} />
      <Links L={L} />
      {L.districts.map((d) => <District key={d.id} d={d} />)}
      {L.buildings.map((b) => <Building key={b.id} b={b} />)}
      <Connections layout={L} edges={cityEdges} />
      <Traffic L={L} />
      <People L={L} />
      <Precipitation />
      <Lightning target={[L.byId.get("be-payctrl")?.pos[0] ?? 44, L.byId.get("be-payctrl")?.pos[2] ?? -23]} />
      <Wet L={L} />
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
