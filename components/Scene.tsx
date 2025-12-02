import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useProgress } from '@react-three/drei';
import { CarportConfig } from '../types';
import { CarportModel } from './CarportModel';
import { RefreshCw, Loader2 } from 'lucide-react';

interface SceneProps {
  config: CarportConfig;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-3 bg-white/90 backdrop-blur rounded-xl shadow-lg border border-slate-100">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
        <span className="text-xs font-bold text-slate-600 tabular-nums">{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

export const Scene: React.FC<SceneProps> = ({ config }) => {
  // Key to force-remount the Canvas on error/reset
  const [resetKey, setResetKey] = useState(0);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setResetKey(prev => prev + 1);
  };

  return (
    <div 
      className="w-full h-full bg-slate-200 relative shadow-inner overflow-hidden"
      style={{ touchAction: 'none' }}
    >
      {/* Static CSS Watermark Background - Darker Kovka007 */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.10]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='50%25' y='50%25' font-family='Inter, sans-serif' font-weight='900' font-size='14' fill='%231e293b' text-anchor='middle' transform='rotate(-45 50 50)'%3Ekovka007%3C/text%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center'
        }}
      />

      {/* Reset 3D Scene Button */}
      <button
        onClick={handleReset}
        className="absolute top-20 right-4 lg:top-4 lg:right-4 z-20 p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all"
        title="Перезагрузить 3D сцену"
      >
        <RefreshCw size={20} />
      </button>

      <Canvas 
        key={resetKey}
        shadows 
        camera={{ position: [8, 6, 10], fov: 40 }} 
        className="z-10 relative"
        // 2. ВАЖНО: Запрещаем действия браузера на самом Canvas. 
        // Это заставит телефон передавать свайпы в OrbitControls, а не скроллить страницу.
        style={{ touchAction: 'none', width: '100%', height: '100%' }}
      >
        <Suspense fallback={<Loader />}>
          <Environment preset="city" />
          
          <ambientLight intensity={0.8} />
          <directionalLight 
            position={[5, 12, 5]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize={[2048, 2048]} 
            shadow-bias={-0.0005}
          >
            <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
          </directionalLight>

          <CarportModel config={config} />
          
          <ContactShadows resolution={1024} scale={40} blur={2} opacity={0.5} far={10} color="#000000" />
          
          <OrbitControls 
            makeDefault 
            minPolarAngle={0} 
            maxPolarAngle={Math.PI / 2 - 0.05} 
            minDistance={5}
            maxDistance={30}
            target={[0, config.height/2, 0]}
            enablePan={false} 
          />
        </Suspense>
      </Canvas>
    </div>
  );
};
