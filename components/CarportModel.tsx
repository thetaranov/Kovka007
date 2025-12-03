import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CarportConfig, RoofType, PillarSize, RoofMaterial, CalculationResult } from '../types';
import { SPECS } from '../constants';

interface CarportModelProps {
  config: CarportConfig;
  calculation?: CalculationResult | null;
}

// ВОЗВРАЩЕНА ОРИГИНАЛЬНАЯ, ПРАВИЛЬНО РАБОТАЮЩАЯ ВЕРСИЯ BoxBeam
const BoxBeam: React.FC<{ 
  start: THREE.Vector3; 
  end: THREE.Vector3; 
  thickness: number; 
  depth?: number;
  color: string; 
  transparent?: boolean;
  opacity?: number;
  metalness?: number;
  roughness?: number;
}> = React.memo(({ start, end, thickness, depth, color, transparent = false, opacity = 1.0, metalness = 0.2, roughness = 0.7 }) => {
  const d = depth || thickness;
  const length = start.distanceTo(end);
  const position = useMemo(() => start.clone().lerp(end, 0.5), [start, end]);
  const quaternion = useMemo(() => {
      const direction = end.clone().sub(start).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      if (Math.abs(direction.dot(up)) > 0.999) { // Adjusted for robustness
          return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
      }
      return new THREE.Quaternion().setFromUnitVectors(up, direction);
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <boxGeometry args={[thickness, length, d]} />
      <meshStandardMaterial 
        color={color} 
        roughness={roughness} 
        metalness={metalness} 
        transparent={transparent} 
        opacity={opacity} 
        side={transparent ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
});

// --- TRUSS COMPONENTS (ДЛЯ ВИЗУАЛИЗАЦИИ) ---

const GableTruss: React.FC<{ width: number; angle: number; color: string }> = ({ width, angle, color }) => {
  const rad = (angle * Math.PI) / 180;
  const rise = (width / 2) * Math.tan(rad);
  const t = SPECS.trussThickness;
  const halfW = width / 2;
  const peak = new THREE.Vector3(0, rise, 0);

  const segments = Math.max(2, Math.ceil(halfW / 0.9)); 
  const segW = halfW / segments;

  return (
    <group>
      <BoxBeam start={new THREE.Vector3(-halfW, 0, 0)} end={new THREE.Vector3(halfW, 0, 0)} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(-halfW, 0, 0)} end={peak} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(halfW, 0, 0)} end={peak} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(0, 0, 0)} end={peak} thickness={t} color={color} />

      {Array.from({ length: segments }).map((_, i) => {
         const xBase = -halfW + i * segW;
         const xNext = -halfW + (i + 1) * segW;
         const yTopNext = (xNext + halfW) * Math.tan(rad);
         return (
            <React.Fragment key={`l-${i}`}>
               <BoxBeam start={new THREE.Vector3(xNext, 0, 0)} end={new THREE.Vector3(xNext, yTopNext, 0)} thickness={t*0.6} color={color} />
               <BoxBeam start={new THREE.Vector3(xBase, 0, 0)} end={new THREE.Vector3(xNext, yTopNext, 0)} thickness={t*0.6} color={color} />
            </React.Fragment>
         );
      })}
      {Array.from({ length: segments }).map((_, i) => {
         const xBase = halfW - i * segW;
         const xNext = halfW - (i + 1) * segW;
         const yTopNext = (halfW - xNext) * Math.tan(rad);
         return (
            <React.Fragment key={`r-${i}`}>
               <BoxBeam start={new THREE.Vector3(xNext, 0, 0)} end={new THREE.Vector3(xNext, yTopNext, 0)} thickness={t*0.6} color={color} />
               <BoxBeam start={new THREE.Vector3(xBase, 0, 0)} end={new THREE.Vector3(xNext, yTopNext, 0)} thickness={t*0.6} color={color} />
            </React.Fragment>
         );
      })}
    </group>
  );
};

const TriangularTruss: React.FC<{ width: number; angle: number; color: string }> = ({ width, angle, color }) => {
  const rad = (angle * Math.PI) / 180;
  const rise = width * Math.tan(rad);
  const halfW = width / 2;
  const t = SPECS.trussThickness;
  const segments = Math.max(3, Math.ceil(width / 0.8));
  const segWidth = width / segments;

  return (
    <group>
      <BoxBeam start={new THREE.Vector3(-halfW, 0, 0)} end={new THREE.Vector3(halfW, 0, 0)} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(-halfW, 0, 0)} end={new THREE.Vector3(halfW, rise, 0)} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(halfW, 0, 0)} end={new THREE.Vector3(halfW, rise, 0)} thickness={t} color={color} />
      <BoxBeam start={new THREE.Vector3(-halfW, 0, 0)} end={new THREE.Vector3(-halfW, 0.1, 0)} thickness={t} color={color} />

      {Array.from({ length: segments }).map((_, i) => {
         if (i === segments) return null;
         const xBase = -halfW + i * segWidth;
         const xNext = -halfW + (i + 1) * segWidth;
         const yTopNext = (xNext + halfW) * Math.tan(rad);
         const pBase = new THREE.Vector3(xBase, 0, 0);
         const pBaseNext = new THREE.Vector3(xNext, 0, 0);
         const pTopNext = new THREE.Vector3(xNext, yTopNext, 0);

         return (
            <React.Fragment key={i}>
                {i < segments - 1 && (
                    <BoxBeam start={pBaseNext} end={pTopNext} thickness={t*0.6} color={color} />
                )}
                <BoxBeam start={pBase} end={pTopNext} thickness={t*0.6} color={color} />
            </React.Fragment>
         );
      })}
    </group>
  );
};

const SingleSlopeTruss: React.FC<{ width: number; angle: number; color: string }> = ({ width, angle, color }) => {
  const rad = (angle * Math.PI) / 180;
  const rise = width * Math.tan(rad);
  const halfW = width / 2;
  const t = SPECS.trussThickness;
  const depth = 0.35; 

  const topStart = new THREE.Vector3(-halfW, depth, 0);
  const topEnd = new THREE.Vector3(halfW, rise + depth, 0);
  const botStart = new THREE.Vector3(-halfW, 0, 0);
  const botEnd = new THREE.Vector3(halfW, rise, 0);

  const segments = Math.max(4, Math.ceil(width / 0.9));

  return (
    <group>
      <BoxBeam start={topStart} end={topEnd} thickness={t} color={color} />
      <BoxBeam start={botStart} end={botEnd} thickness={t} color={color} />
      <BoxBeam start={topStart} end={botStart} thickness={t} color={color} />
      <BoxBeam start={topEnd} end={botEnd} thickness={t} color={color} />

      {Array.from({ length: segments - 1 }).map((_, i) => {
         const ratio = (i + 1) / segments;
         const pBot = botStart.clone().lerp(botEnd, ratio);
         const pTop = topStart.clone().lerp(topEnd, ratio);
         const pBotPrev = botStart.clone().lerp(botEnd, i / segments);

         return (
             <React.Fragment key={i}>
                 <BoxBeam start={pTop} end={pBot} thickness={t*0.6} color={color} />
                 <BoxBeam start={pBotPrev} end={pTop} thickness={t*0.6} color={color} />
             </React.Fragment>
         )
      })}
    </group>
  );
};

const SemiArchedTruss: React.FC<{ width: number; angle: number; color: string }> = ({ width, angle, color }) => {
  const t = SPECS.trussThickness;
  const trussDepth = 0.35;
  const rad = (angle * Math.PI) / 180;
  const rise = width * Math.tan(rad);

  const R_bot = (Math.pow(width, 2) + Math.pow(rise, 2)) / (2 * rise);
  const R_top = R_bot + trussDepth; 

  const Cy = rise - R_bot; 
  const Cx = width / 2;
  const startTheta = Math.atan2(0 - Cy, -width/2 - Cx);
  const endTheta = Math.PI / 2;

  const segments = Math.max(8, Math.ceil(width / 0.6));
  const topPoints: THREE.Vector3[] = [];
  const botPoints: THREE.Vector3[] = [];

  for(let i=0; i<=segments; i++) {
     const ratio = i/segments;
     const theta = startTheta - (startTheta - endTheta) * ratio;
     topPoints.push(new THREE.Vector3(Cx + R_top * Math.cos(theta), Cy + R_top * Math.sin(theta), 0));
     botPoints.push(new THREE.Vector3(Cx + R_bot * Math.cos(theta), Cy + R_bot * Math.sin(theta), 0));
  }

  return (
    <group>
      {topPoints.map((p, i) => { if (i === 0) return null; return <BoxBeam key={`top-${i}`} start={topPoints[i-1]} end={p} thickness={t} color={color} />; })}
      {botPoints.map((p, i) => { if (i === 0) return null; return <BoxBeam key={`bot-${i}`} start={botPoints[i-1]} end={p} thickness={t} color={color} />; })}
      {topPoints.map((pTop, i) => {
         if (i >= segments) return null;
         const pBot = botPoints[i];
         const nextTop = topPoints[i+1];
         return (
            <React.Fragment key={`web-${i}`}>
               <BoxBeam start={pTop} end={pBot} thickness={t*0.6} color={color} />
               <BoxBeam start={pBot} end={nextTop} thickness={t*0.6} color={color} />
            </React.Fragment>
         );
      })}
      <BoxBeam start={topPoints[segments]} end={botPoints[segments]} thickness={t*0.6} color={color} />
      <BoxBeam start={topPoints[0]} end={botPoints[0]} thickness={t*0.6} color={color} />
    </group>
  );
};

const ArchedTruss: React.FC<{ width: number; color: string; overhang?: number }> = ({ width, color, overhang = 0 }) => {
  const rise = width * SPECS.trussHeightArch;
  const t = SPECS.trussThickness;
  const trussDepth = 0.35; 

  const R_top = (Math.pow(width/2, 2) + Math.pow(rise, 2)) / (2 * rise);
  const Cy = rise - R_top; 
  const R_bot = R_top - trussDepth; 

  const totalW = width + 2 * overhang;
  const halfAngle = Math.asin((totalW/2) / R_top);

  const startTheta = Math.PI/2 - halfAngle;
  const endTheta = Math.PI/2 + halfAngle;

  const segments = Math.max(12, Math.ceil(totalW / 0.6));
  const topPoints: THREE.Vector3[] = [];
  const botPoints: THREE.Vector3[] = [];

  for(let i=0; i<=segments; i++) {
     const ratio = i/segments;
     const theta = startTheta + (endTheta - startTheta) * ratio;
     topPoints.push(new THREE.Vector3(R_top * Math.cos(theta), Cy + R_top * Math.sin(theta), 0));
     botPoints.push(new THREE.Vector3(R_bot * Math.cos(theta), Cy + R_bot * Math.sin(theta), 0));
  }

  return (
    <group>
      {topPoints.map((p, i) => { if (i === 0) return null; return <BoxBeam key={`top-${i}`} start={topPoints[i-1]} end={p} thickness={t} color={color} />; })}
      {botPoints.map((p, i) => { if (i === 0) return null; return <BoxBeam key={`bot-${i}`} start={botPoints[i-1]} end={p} thickness={t} color={color} />; })}
      {topPoints.map((pTop, i) => {
         if (i >= segments) return null;
         const pBot = botPoints[i];
         const nextTop = topPoints[i+1];
         return (
            <React.Fragment key={`web-${i}`}>
               <BoxBeam start={pTop} end={pBot} thickness={t*0.6} color={color} />
               <BoxBeam start={pBot} end={nextTop} thickness={t*0.6} color={color} />
            </React.Fragment>
         );
      })}
      <BoxBeam start={topPoints[segments]} end={botPoints[segments]} thickness={t*0.6} color={color} />
      <BoxBeam start={topPoints[0]} end={botPoints[0]} thickness={t*0.6} color={color} />
    </group>
  );
};


// --- CALCULATED TRUSS COMPONENT ---
const CalculatedTruss: React.FC<{ 
  geometry: CalculationResult['geometry']; 
  sections: CalculationResult['sections']; 
  color: string 
}> = ({ geometry, sections, color }) => {
  return (
    <group>
      {geometry.elements.map((elem, idx) => {
        const from = geometry.nodes[elem.from];
        const to = geometry.nodes[elem.to];

        const start = new THREE.Vector3(from.x - geometry.span/2, from.y, 0);
        const end = new THREE.Vector3( to.x - geometry.span/2, to.y, 0);

        let thickness = 0.04;
        let depth = 0.04;

        if (elem.type === 'topChord') {
            thickness = sections.topChord.b / 1000;
            depth = sections.topChord.h / 1000;
        } else if (elem.type === 'bottomChord') {
            thickness = sections.bottomChord.b / 1000;
            depth = sections.bottomChord.h / 1000;
        } else if (elem.type === 'web') {
            thickness = sections.web.b / 1000;
            depth = sections.web.h / 1000;
        }

        return (
          <BoxBeam
            key={idx}
            start={start}
            end={end}
            thickness={thickness}
            depth={depth}
            color={color}
          />
        );
      })}
    </group>
  );
};


// --- HELPER COMPONENTS ---
const Purlins = ({ config }: { config: CarportConfig }) => { /* ... ваш код без изменений ... */ };
const RoofSkin = ({ config }: { config: CarportConfig }) => { /* ... ваш код без изменений ... */ };


export const CarportModel: React.FC<CarportModelProps> = ({ config, calculation }) => {
  const { width, length, height, roofType, frameColor, roofColor, pillarSize, hasSideWalls, roofSlope = 20 } = config;

  const pSize = pillarSize === PillarSize.Size60 ? 0.06 : pillarSize === PillarSize.Size80 ? 0.08 : 0.10;
  const beamH = pSize; 
  const overhang = 0.4;

  const isAsymmetric = roofType === RoofType.SingleSlope || roofType === RoofType.SemiArched;
  const asymmetricRise = isAsymmetric ? width * Math.tan((roofSlope * Math.PI) / 180) : 0;

  const grid = useMemo(() => {
    const spacing = SPECS.postSpacing;
    const numRows = Math.ceil(length / spacing); 
    const rowSpacing = length / numRows;
    const maxUnsupportedWidth = 6.0;
    const numBays = Math.max(1, Math.ceil(width / maxUnsupportedWidth));
    const numCols = numBays + 1;
    const colSpacing = width / numBays; 

    const posts: React.ReactNode[] = [];
    const beams: React.ReactNode[] = [];

    let sa_R = 0, sa_Cy = 0, sa_Cx = 0;
    if (roofType === RoofType.SemiArched) {
        const rise = asymmetricRise;
        sa_R = (Math.pow(width, 2) + Math.pow(rise, 2)) / (2 * rise);
        sa_Cx = width / 2;
        sa_Cy = rise - sa_R;
    }

    let arch_R = 0, arch_Cy = 0;
    if (roofType === RoofType.Arched) {
        const rise = width * SPECS.trussHeightArch;
        const R_top = (Math.pow(width/2, 2) + Math.pow(rise, 2)) / (2 * rise);
        const R_top_calc = R_top;
        arch_R = R_top_calc - 0.35;
        arch_Cy = rise - R_top_calc;
    }

    for (let c = 0; c < numCols; c++) {
        const xOffset = c * colSpacing;
        const x = -width/2 + xOffset;

        let hAtX = height;

        if (roofType === RoofType.SingleSlope) {
            const ratio = xOffset / width;
            hAtX = height + ratio * asymmetricRise;
        } else if (roofType === RoofType.SemiArched) {
            const term = sa_R * sa_R - (x - sa_Cx) * (x - sa_Cx);
            if (term > 0) {
                hAtX = height + (sa_Cy + Math.sqrt(term));
            }
        } else if (roofType === RoofType.Arched) {
            const term = arch_R * arch_R - x * x;
            if (term > 0) {
                hAtX = height + (arch_Cy + Math.sqrt(term));
            }
        }

        for (let r = 0; r <= numRows; r++) {
            const z = -length/2 + r * rowSpacing;
            posts.push(
                <mesh key={`p-${c}-${r}`} position={[x, hAtX/2, z]} castShadow receiveShadow>
                    <boxGeometry args={[pSize, hAtX, pSize]} />
                    <meshStandardMaterial color={frameColor} roughness={0.8} />
                </mesh>
            );
        }
        beams.push(
            <mesh key={`b-${c}`} position={[x, hAtX + beamH/2, 0]} castShadow receiveShadow>
                <boxGeometry args={[pSize, beamH, length]} />
                <meshStandardMaterial color={frameColor} roughness={0.8} />
            </mesh>
        );
    }
    return { posts, beams };
  }, [length, width, height, asymmetricRise, isAsymmetric, frameColor, pSize, beamH, roofType]);

  const trussCount = Math.ceil(length / 1.5) + 1;
  const trussSpacing = length / (trussCount - 1);

  return (
    <group>
      {grid.posts}
      {grid.beams}

      {calculation ? (
        Array.from({length: trussCount}).map((_, i) => {
          const z = -length/2 + i * trussSpacing;
          return (
            <group key={`calculated-truss-${i}`} position={[0, height + beamH, z]}>
              <CalculatedTruss 
                geometry={calculation.geometry}
                sections={calculation.sections}
                color={frameColor}
              />
            </group>
          );
        })
      ) : (
        Array.from({length: trussCount}).map((_, i) => {
          const z = -length/2 + i * trussSpacing;
          return (
            <group key={`truss-${i}`} position={[0, height + beamH, z]}>
               {roofType === RoofType.Gable && <GableTruss width={width} angle={roofSlope} color={frameColor} />}
               {roofType === RoofType.SingleSlope && <SingleSlopeTruss width={width} angle={roofSlope} color={frameColor} />}
               {roofType === RoofType.Triangular && <TriangularTruss width={width} angle={roofSlope} color={frameColor} />}
               {roofType === RoofType.SemiArched && <SemiArchedTruss width={width} angle={roofSlope} color={frameColor} />}
               {roofType === RoofType.Arched && <ArchedTruss width={width} color={frameColor} overhang={overhang} />}
            </group>
          );
        })
      )}

      {!calculation && (
        <>
          <Purlins config={config} />
          <RoofSkin config={config} />
        </>
      )}

      {hasSideWalls && (
        <group>
            <mesh position={[0, height/2, -length/2 + pSize/2]} receiveShadow>
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color={roofColor} opacity={0.5} transparent side={THREE.DoubleSide} />
            </mesh>
             <mesh position={[-width/2 + pSize/2, height/2, 0]} rotation={[0, Math.PI/2, 0]} receiveShadow>
                <planeGeometry args={[length, height]} />
                <meshStandardMaterial color={roofColor} opacity={0.5} transparent side={THREE.DoubleSide} />
            </mesh>
        </group>
      )}
    </group>
  );
};