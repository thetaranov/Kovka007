import React, { Suspense, useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows, Grid, OrthographicCamera } from "@react-three/drei";
import { CarportConfig, CalculationResult, AppMode, EngineeringView } from "../types";
import { CarportModel } from "./CarportModel";
import { Camera, Square, RectangleHorizontal } from "lucide-react";

interface SceneProps {
  config: CarportConfig;
  calculation: CalculationResult | null;
  appMode: AppMode;
}

const EngineeringViewSwitcher: React.FC<{ view: EngineeringView, setView: (v: EngineeringView) => void }> = ({ view, setView }) => (
    <div className="absolute top-24 left-4 z-20 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 p-1 flex flex-col gap-1">
        <button title="Перспектива" onClick={() => setView('perspective')} className={`p-2 rounded transition-colors ${view === 'perspective' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Camera size={18} /></button>
        <button title="Вид спереди" onClick={() => setView('front')} className={`p-2 rounded transition-colors ${view === 'front' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><Square size={18} /></button>
        <button title="Вид сбоку" onClick={() => setView('side')} className={`p-2 rounded transition-colors ${view === 'side' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}><RectangleHorizontal size={18} /></button>
    </div>
);

const EngineeringBackground: React.FC = () => (
    <div className="absolute inset-0 z-0 bg-slate-50" style={{
        backgroundImage: `
            linear-gradient(rgba(100, 116, 139, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px', // Corresponds to 1m grid
    }} />
);

export const Scene: React.FC<SceneProps> = ({ config, calculation, appMode }) => {
  const [view, setView] = useState<EngineeringView>('perspective');

  useEffect(() => {
    if (appMode === 'visualizer') {
      setView('perspective');
    }
  }, [appMode]);

  const camDistance = Math.max(config.width, config.length) + 5;

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ touchAction: "none" }}>
        {appMode === 'calculator' ? <EngineeringBackground/> : <div className="absolute inset-0 bg-slate-200 z-0" />}
        {appMode === 'calculator' && <EngineeringViewSwitcher view={view} setView={setView} />}

        <Canvas shadows dpr={[1, 1.5]} gl={{ preserveDrawingBuffer: true, antialias: true }} className="z-10 relative">
            <Suspense fallback={null}>
                <ambientLight intensity={appMode === 'visualizer' ? 0.7 : 1.5} />
                <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
                {appMode === 'visualizer' && <hemisphereLight intensity={0.3} groundColor="#f8fafc" />}

                {view === 'perspective' ? (
                    <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2 - 0.05} minDistance={3} maxDistance={50} target={[0, config.height / 2, 0]} enablePan={true} enableDamping={true} dampingFactor={0.05} />
                ) : (
                    <OrbitControls makeDefault enableRotate={false} target={[0, config.height / 2, 0]} />
                )}

                {view === 'front' && <OrthographicCamera makeDefault position={[0, config.height / 2, camDistance]} zoom={50} />}
                {view === 'side' && <OrthographicCamera makeDefault position={[camDistance, config.height / 2, 0]} zoom={50} />}

                {appMode === 'visualizer' && (
                    <>
                        <Grid position={[0, 0.01, 0]} args={[40, 40]} cellSize={1} cellThickness={1} cellColor="#94a3b8" sectionSize={5} sectionThickness={1.5} sectionColor="#475569" fadeDistance={50} fadeStrength={2} infiniteGrid={true} />
                        <ContactShadows resolution={1024} scale={60} blur={2.5} opacity={0.6} far={10} color="#000000" />
                        <Environment preset="city" />
                    </>
                )}

                <CarportModel config={config} calculation={calculation} />
            </Suspense>
        </Canvas>
    </div>
  );
};