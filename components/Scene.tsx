import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  useProgress,
  Grid,
} from "@react-three/drei";
import { CarportConfig } from "../types";
import { CarportModel } from "./CarportModel";
import { RefreshCw, Loader2 } from "lucide-react";

interface SceneProps {
  config: CarportConfig;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-3 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <span className="text-xs font-bold text-slate-600 tabular-nums">
          {progress.toFixed(0)}%
        </span>
      </div>
    </Html>
  );
}

export const Scene: React.FC<SceneProps> = ({ config }) => {
  const [resetKey, setResetKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResetKey((prev) => prev + 1);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preventTouch = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    container.addEventListener("touchmove", preventTouch, { passive: false });
    container.addEventListener("touchstart", preventTouch, { passive: false });
    return () => {
      container.removeEventListener("touchmove", preventTouch);
      container.removeEventListener("touchstart", preventTouch);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-slate-200 relative shadow-inner overflow-hidden"
      style={{ touchAction: "none" }}
    >
      {/* Фон */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='Inter, sans-serif' font-weight='900' font-size='14' fill='%231e293b' text-anchor='middle' transform='rotate(-45 50 50)'%3Ekovka007%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
        }}
      />

      <button
        onClick={handleReset}
        className="absolute top-20 right-4 lg:top-4 lg:right-4 z-20 p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all"
      >
        <RefreshCw size={20} />
      </button>

      <Canvas
        key={resetKey}
        shadows
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: true }} // Включил сглаживание для четкости
        camera={{ position: [10, 8, 12], fov: 45 }} // Чуть уменьшил FOV для "плотности" картинки
        className="z-10 relative"
        style={{
          touchAction: "none",
          width: "100%",
          height: "100%",
          outline: "none",
        }}
      >
        <Suspense fallback={<Loader />}>
          {/* Освещение без тумана */}
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]} // Вернул качество теней для четкости
            shadow-bias={-0.0005}
          >
            <orthographicCamera
              attach="shadow-camera"
              args={[-20, 20, 20, -20]}
            />
          </directionalLight>

          {/* Легкая подсветка снизу, чтобы не было черных теней */}
          <hemisphereLight intensity={0.3} groundColor="#f8fafc" />

          {/* Контрастная сетка */}
          <Grid
            position={[0, 0.01, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={1} // Жирнее
            cellColor="#94a3b8" // Более темный серый
            sectionSize={5}
            sectionThickness={1.5}
            sectionColor="#475569" // Темно-серый для секций
            fadeDistance={50} // Дальше видимость
            fadeStrength={2} // Меньше затухания
            infiniteGrid={true}
          />

          <CarportModel config={config} />

          <ContactShadows
            resolution={1024}
            scale={60}
            blur={2.5}
            opacity={0.6} // Чуть темнее тень
            far={10}
            color="#000000"
          />

          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={3}
            maxDistance={50}
            target={[0, config.height / 2, 0]}
            enablePan={false}
            enableZoom={true}
            enableDamping={true}
            dampingFactor={0.05}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
