import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Grid } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useCityLayout } from "../lib/city";
import { useCity } from "../store/useCity";
import { Building, District } from "./Buildings";
import { Ground, River, Roads, Underground, Decor } from "./Infrastructure";
import { Traffic } from "./Traffic";
import { Connections } from "./Connections";
import { CameraRig } from "./CameraRig";

export function CityScene() {
  const L = useCityLayout();
  const cityEdges = useCity((s) => s.city.edges);
  return (
    <Canvas
      shadows
      camera={{ position: [90, 110, 160], fov: 45 }}
      onPointerMissed={() => useCity.getState().select(null)}
    >
      <color attach="background" args={["#070b18"]} />
      <fog attach="fog" args={["#070b18", 120, 260]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[60, 90, 30]}
        intensity={1.1}
        color="#bcd2ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
      />
      <pointLight position={[0, 30, -8]} color="#22d3ee" intensity={200} />

      {/* moon */}
      <mesh position={[-150, 95, -190]}>
        <sphereGeometry args={[16, 24, 24]} />
        <meshBasicMaterial color="#dbe7ff" toneMapped={false} fog={false} />
      </mesh>

      <Stars radius={200} depth={40} count={2500} factor={4} fade />
      <Grid
        position={[0, 0.02, 0]}
        args={[400, 400]}
        cellSize={4}
        cellThickness={0.5}
        cellColor="#101d31"
        sectionSize={20}
        sectionThickness={1}
        sectionColor="#164e63"
        fadeDistance={260}
        fadeStrength={1.2}
        infiniteGrid
      />

      <Ground />
      <River />
      <Roads L={L} />
      <Underground L={L} />
      <Decor L={L} />
      {L.districts.map((d) => (
        <District key={d.id} d={d} />
      ))}
      {L.buildings.map((b) => (
        <Building key={b.id} b={b} />
      ))}
      <Connections layout={L} edges={cityEdges} />
      <Traffic L={L} />
      <CameraRig />
      <OrbitControls makeDefault enableDamping maxPolarAngle={Math.PI / 2.15} minDistance={8} maxDistance={180} />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.55} luminanceThreshold={0.28} luminanceSmoothing={0.25} />
        <Vignette offset={0.22} darkness={0.62} />
      </EffectComposer>
    </Canvas>
  );
}
