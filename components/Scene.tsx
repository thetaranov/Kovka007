import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Grid, Environment } from "@react-three/drei";
import { CarportConfig, CalculationResult } from "../types";
import { CarportModel } from "./CarportModel";
import { Loader2 } from "lucide-react";

interface SceneProps {
  config: CarportConfig;
  calculation: CalculationResult | null;
}

export const Scene: React.FC<SceneProps> = ({ config, calculation }) => {
  return (
    <div className="w-full h-full bg-slate-200 relative shadow-inner overflow-hidden" style={{ touchAction: "none" }}>
      <div
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='Inter, sans-serif' font-weight='900' font-size='14' fill='%231e293b' text-anchor='middle' transform='rotate(-45 50 50)'%3Ekovka007%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
        }}
      />

      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: true }}
        camera={{ position: [10, 8, 12], fov: 45 }}
        className="z-10 relative"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0005}
          />
          <hemisphereLight intensity={0.3} groundColor="#f8fafc" />

          <Grid
            position={[0, 0.01, 0]}
            args={[40, 40]}
            cellSize={1}
            cellThickness={1}
            cellColor="#94a3b8"
            sectionSize={5}
            sectionThickness={1.5}
            sectionColor="#475569"
            fadeDistance={50}
            fadeStrength={2}
            infiniteGrid={true}
          />

          <CarportModel config={config} calculation={calculation} />

          <ContactShadows
            resolution={1024}
            scale={60}
            blur={2.5}
            opacity={0.6}
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
            enableDamping={true}
            dampingFactor={0.05}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};