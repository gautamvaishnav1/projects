import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERT = `varying vec2 vUv; uniform float uTime;
void main(){ vUv=uv; vec3 p=position; p.z+=sin(uv.y*40.0+uTime*2.0)*0.06;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;
const FRAG = `varying vec2 vUv; uniform float uTime;
void main(){
 float w1=sin(vUv.y*60.0+uTime*2.2)+sin(vUv.x*24.0-uTime*1.6);
 float w2=sin((vUv.x+vUv.y)*40.0-uTime*3.0);
 float w=(w1+w2)*0.25+0.5;
 vec3 col=mix(vec3(0.02,0.16,0.30),vec3(0.05,0.40,0.58),w*0.6);
 float foam=smoothstep(0.9,1.0,w)*0.3+smoothstep(0.06,0.0,vUv.x)*0.25+smoothstep(0.94,1.0,vUv.x)*0.25;
 col+=foam*vec3(0.55,0.8,0.9); col+=pow(w,3.0)*0.18;
 gl_FragColor=vec4(col,0.92); }`;

export function River() {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  useFrame(({ clock }) => (mat.current.uniforms.uTime.value = clock.elapsedTime));
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, -20]}><planeGeometry args={[11.5, 130]} /><meshStandardMaterial color="#050e1a" /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.16, -20]}>
        <planeGeometry args={[10, 130, 8, 80]} />
        <shaderMaterial ref={mat} transparent uniforms={{ uTime: { value: 0 } }} vertexShader={VERT} fragmentShader={FRAG} />
      </mesh>
    </group>
  );
}
