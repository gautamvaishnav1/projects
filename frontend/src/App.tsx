import { CityScene } from "./three/CityScene";
import { HUD } from "./ui/HUD";

export default function App() {
  return (
    <div className="relative w-screen h-screen bg-[#070b18] overflow-hidden">
      <CityScene />
      <HUD />
    </div>
  );
}
