import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const VERT = `varying vec2 vUv; uniform float uTime;
void main(){ vUv=uv; vec3 p=position; p.z+=sin(uv.y*40.0+uTime*2.0)*0.03;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }`;

const FRAG = `varying vec2 vUv; uniform float uTime;
void main(){
 float w1=sin(vUv.y*60.0+uTime*2.2)+sin(vUv.x*24.0-uTime*1.6);
 float w2=sin((vUv.x+vUv.y)*40.0-uTime*3.0);
 float w=(w1+w2)*0.25+0.5;
 vec3 deep=vec3(0.01,0.10,0.20);
 vec3 hi=vec3(0.10,0.45,0.60);
 vec3 col=mix(deep,hi,pow(w,2.0)*0.5);
 col+=pow(w,4.0)*0.3;
 float a=0.95*smoothstep(0.0,0.06,vUv.x)*smoothstep(1.0,0.94,vUv.x);
 gl_FragColor=vec4(col,a); }`;

/**
 * The river. Writes depth so the bridge deck ALWAYS occludes it correctly
 * (the old depthWrite=false let the water smear over the deck from low angles,
 * which read as "river going under the bridge wrong").
 */
export function River() {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  useFrame(({ clock }) => (mat.current.uniforms.uTime.value = clock.elapsedTime));
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.16, -22]}>
      <planeGeometry args={[10, 110, 1, 64]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite
        uniforms={{ uTime: { value: 0 } }}
        vertexShader={VERT}
        fragmentShader={FRAG}
      />
    </mesh>
  );
}
