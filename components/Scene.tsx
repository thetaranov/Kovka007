import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { CarportConfig } from '../types';
import { CarportModel } from './CarportModel';

interface SceneProps {
  config: CarportConfig;
}

export const Scene: React.FC<SceneProps> = ({ config }) => {
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

      <Canvas shadows camera={{ position: [8, 6, 10], fov: 40 }} className="z-10 relative">
        <Suspense fallback={null}>
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
          />
        </Suspense>
      </Canvas>
    </div>
  );
};