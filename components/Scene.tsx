import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  Html,
  useProgress,
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

  // --- ВАЖНО: Блокировка скролла при касании 3D-сцены ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventTouch = (e: TouchEvent) => {
      // Если событие можно отменить, отменяем его (это блокирует скролл страницы)
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Добавляем слушатели с { passive: false }, чтобы preventDefault работал
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
      style={{ touchAction: "none" }} // Дублируем запрет жестов через CSS
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.10]"
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
        // Оптимизация производительности
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: false }}
        camera={{ position: [8, 6, 10], fov: 40 }}
        className="z-10 relative"
        style={{
          touchAction: "none",
          width: "100%",
          height: "100%",
          outline: "none",
        }}
      >
        <Suspense fallback={<Loader />}>
          <Environment preset="city" />

          <ambientLight intensity={0.8} />
          <directionalLight
            position={[5, 12, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-bias={-0.0005}
          >
            <orthographicCamera
              attach="shadow-camera"
              args={[-10, 10, 10, -10]}
            />
          </directionalLight>

          <CarportModel config={config} />

          <ContactShadows
            resolution={512}
            scale={40}
            blur={2}
            opacity={0.5}
            far={10}
            color="#000000"
          />

          <OrbitControls
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2 - 0.05}
            minDistance={5}
            maxDistance={30}
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
