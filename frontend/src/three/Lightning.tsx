import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { ENV } from "./env";
import { useCity } from "../store/useCity";
import { thunder } from "./audio";

export function Lightning({ target }: { target: [number, number] }) {
  const [bolt, setBolt] = useState<THREE.Vector3[] | null>(null);
  const flash = useRef<THREE.PointLight>(null!), timer = useRef(4);

  const strike = () => {
    const st = useCity.getState();
    const aim = st.failing ? target : [(Math.random() - .5) * 160, (Math.random() - .5) * 160];
    const pts: THREE.Vector3[] = []; let x = aim[0] + (Math.random() - .5) * 8, y = 38, z = aim[1] + (Math.random() - .5) * 8;
    pts.push(new THREE.Vector3(x, y, z));
    while (y > 2) { y -= 4 + Math.random() * 3; x += (Math.random() - .5) * 3; z += (Math.random() - .5) * 3; pts.push(new THREE.Vector3(x, Math.max(y, 1.5), z)); }
    setBolt(pts); flash.current.position.set(aim[0], 12, aim[1]); flash.current.intensity = 900;
    setTimeout(() => setBolt(null), 160);
    setTimeout(thunder, 350 + Math.random() * 900); // sound arrives late, like real life
    if (st.failing) st.notify("⚡ Lightning struck paymentController.js", "be-payctrl");
  };
  const strikeRef = useRef(strike); strikeRef.current = strike;

  useFrame((_, dt) => {
    if (ENV.storm > 0.5) { timer.current -= dt; if (timer.current < 0) { timer.current = 3 + Math.random() * 6; strikeRef.current(); } }
    flash.current.intensity *= Math.exp(-dt * 8);
  });
  return (
    <group>
      <pointLight ref={flash} color="#cfe8ff" intensity={0} distance={140} />
      {bolt && <Line points={bolt} color="#dbeeff" lineWidth={2} transparent opacity={0.95} />}
    </group>
  );
}
