import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Html,
  useProgress,
  Grid,
  PerspectiveCamera,
  OrthographicCamera,
  GizmoHelper,
  GizmoViewport,
  Line,
} from "@react-three/drei";
import { CarportConfig, GateConfig, GateType, InstallationType } from "../types";
import { SPECS } from "../constants";
import { CarportModel } from "./CarportModel";
import { GateModel } from "./GateModel";
import { RefreshCw, Loader2, Ruler, Camera } from "lucide-react";

interface SceneProps {
  config: CarportConfig;
  gateConfig?: GateConfig;
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

export const Scene: React.FC<SceneProps> = ({ config, gateConfig }) => {
  const [resetKey, setResetKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<any>(null);
  const [cameraMode, setCameraMode] = useState<"perspective" | "orthographic">("perspective");
  const [cameraTarget, setCameraTarget] = useState<"perspective" | "orthographic">("perspective");
  const [measureMode, setMeasureMode] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<THREE.Vector3[]>([]);
  const [orthoPlane, setOrthoPlane] = useState<"top" | "front" | "side">("top");
  const [orthoSign, setOrthoSign] = useState(1);
  const [isOrthoStrict, setIsOrthoStrict] = useState(false);
  const transitionRef = useRef({
    active: false,
    t: 0,
    from: "perspective" as "perspective" | "orthographic",
    to: "perspective" as "perspective" | "orthographic",
    initialized: false,
    startFov: 45,
    targetFov: 45,
    startZoom: 60,
    targetZoom: 60,
  });
  const modeRef = useRef<"perspective" | "orthographic">("perspective");
  const perspectiveRef = useRef<THREE.PerspectiveCamera>(null);
  const orthographicRef = useRef<THREE.OrthographicCamera>(null);

  const isOrtho = cameraMode === "orthographic";
  const isOrthoTarget = cameraTarget === "orthographic";

  const hasGate = gateConfig && gateConfig.type !== GateType.None;
  const gateExtension = hasGate ? (gateConfig?.distanceFromCarport ?? 2.0) : 0;
  const foundationMargin = 0.4;
  const foundationWidth = Math.max(config.width, hasGate ? gateConfig!.width : 0) + foundationMargin;
  const foundationLength = config.length + gateExtension + foundationMargin;
  const foundationCenterZ = -gateExtension / 2;
  const gridWidth = Math.max(40, foundationWidth + 6);
  const gridLength = Math.max(40, foundationLength + 6);
  const gridHeight = Math.max(10, config.height + 6);
  const gridPlaneOrigin = useMemo<THREE.Vector3>(() => {
    if (!isOrthoStrict) return new THREE.Vector3(0, 0, 0);
    if (orthoPlane === "top") return new THREE.Vector3(0, orthoSign * (config.height / 2 + 1), 0);
    if (orthoPlane === "front") return new THREE.Vector3(0, config.height / 2, orthoSign * (foundationLength / 2 + 1));
    return new THREE.Vector3(orthoSign * (foundationWidth / 2 + 1), config.height / 2, 0);
  }, [orthoPlane, orthoSign, isOrthoStrict, config.height, foundationLength, foundationWidth]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMeasureMode(false);
    setMeasurePoints([]);
    setOrthoPlane("top");
    setOrthoSign(1);
    setIsOrthoStrict(false);
    setCameraTarget("perspective");
    setCameraMode("perspective");
    modeRef.current = "perspective";
    transitionRef.current = {
      active: false,
      t: 0,
      from: "perspective",
      to: "perspective",
      initialized: false,
      startFov: 45,
      targetFov: 45,
      startZoom: 60,
      targetZoom: 60,
    };
    setResetKey((prev) => prev + 1);
  };

  const handleCameraToggle = () => {
    const next = cameraTarget === "orthographic" ? "perspective" : "orthographic";
    setCameraTarget(next);
    setCameraMode(next);
    modeRef.current = next;
    transitionRef.current = {
      active: false,
      t: 0,
      from: next,
      to: next,
      initialized: false,
      startFov: transitionRef.current.startFov,
      targetFov: transitionRef.current.targetFov,
      startZoom: transitionRef.current.startZoom,
      targetZoom: transitionRef.current.targetZoom,
    };
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preventTouch = (e: TouchEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.('[data-allow-touch]')) return;
      if (!target?.closest?.('canvas')) return;
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
      style={{ touchAction: "auto" }}
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

      {/* Control stack (mobile + desktop) */}
      <div className="absolute right-4 top-32 lg:top-28 z-20 flex flex-col items-center gap-2 pointer-events-auto" data-allow-touch>
        <button
          onClick={handleReset}
          className="p-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600 active:scale-95 transition-all pointer-events-auto"
        >
          <RefreshCw size={18} />
        </button>
        <button
          onClick={() => {
            setMeasureMode((v) => !v);
            setMeasurePoints([]);
          }}
          className={`p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg transition-colors pointer-events-auto ${
            measureMode ? "text-indigo-700 border-indigo-300" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Ruler size={18} />
        </button>
        <button
          onClick={handleCameraToggle}
          className="p-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors pointer-events-auto"
        >
          <Camera size={18} className={isOrthoTarget ? "text-indigo-700" : "text-slate-700"} />
        </button>
      </div>

      <Canvas
        key={resetKey}
        shadows={false}
        dpr={[1, 1.5]}
        gl={{ powerPreference: "high-performance", antialias: true }} // Включил сглаживание для четкости
        className="z-10 relative"
        style={{
          touchAction: "none",
          width: "100%",
          height: "100%",
          outline: "none",
        }}
      >
        <Suspense fallback={<Loader />}>
          <PerspectiveCamera ref={perspectiveRef} makeDefault={!isOrtho} position={[10, 8, 12]} fov={45} />
          <OrthographicCamera ref={orthographicRef} makeDefault={isOrtho} position={[10, 8, 12]} zoom={60} near={0.1} far={200} />
          {/* Освещение без динамических теней (убирает мерцание) */}
          <ambientLight intensity={0.8} />
          <directionalLight
            position={[10, 20, 10]}
            intensity={1.2}
          />
          <directionalLight
            position={[-5, 10, -5]}
            intensity={0.4}
          />

          {/* Легкая подсветка снизу, чтобы не было черных теней */}
          <hemisphereLight intensity={0.3} groundColor="#f8fafc" />

          {/* Контрастная сетка */}
          {isOrtho ? (
            <OrthoGrid
              plane={orthoPlane}
              sign={orthoSign}
              strict={isOrthoStrict}
              width={gridWidth}
              length={gridLength}
              height={config.height}
              gridHeight={gridHeight}
              foundationWidth={foundationWidth}
              foundationLength={foundationLength}
            />
          ) : (
            <Grid
              position={[0, 0.01, 0]}
              args={[gridWidth, gridLength]}
              cellSize={1}
              cellThickness={1}
              cellColor="#94a3b8"
              sectionSize={5}
              sectionThickness={1.5}
              sectionColor="#475569"
              fadeDistance={50}
              fadeStrength={2}
              infiniteGrid={true}
              opacity={0.35}
              transparent
            />
          )}

          <Foundation
            config={config}
            foundationWidth={foundationWidth}
            foundationLength={foundationLength}
            foundationCenterZ={foundationCenterZ}
          />

          <CarportModel config={config} />
          
          {/* Ворота - позиционируются перед выездом навеса */}
          {gateConfig && gateConfig.type !== GateType.None && (
            <GateModel 
              config={gateConfig} 
              position={[0, 0, 0]} 
              carportLength={config.length}
            />
          )}
          
          {null}

          {/* Запеченные контактные тени - не мерцают */}
          {null}

          <OrbitControls
            makeDefault
            minPolarAngle={isOrtho ? 0 : 0}
            maxPolarAngle={isOrtho ? Math.PI : Math.PI}
            minDistance={isOrtho ? 0.1 : 3}
            maxDistance={isOrtho ? 1000 : 50}
            target={[0, config.height / 2, 0]}
            enablePan={true}
            enableZoom={true}
            enableDamping={false}
            dampingFactor={0}
            enableRotate={true}
            rotateSpeed={1}
            mouseButtons={{ LEFT: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY }}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
            ref={controlsRef}
          />
          <GizmoHelper alignment="top-right" margin={[70, 70]}>
            <GizmoViewport
              axisColors={["#ef4444", "#3b82f6", "#22c55e"]}
              labels={["X", "Z", "Y"]}
              labelColor="#0f172a"
              hideNegativeAxes={false}
              className="scale-[0.55] lg:scale-100"
            />
          </GizmoHelper>
          <MeasurementTool
            enabled={measureMode}
            points={measurePoints}
            setPoints={setMeasurePoints}
            plane={isOrthoStrict ? orthoPlane : "top"}
            planeOrigin={gridPlaneOrigin}
            gridStep={0.1}
            gridWidth={gridWidth}
            gridLength={gridLength}
            gridHeight={gridHeight}
          />
          <CameraTransition
            cameraMode={cameraMode}
            setCameraMode={(mode) => {
              modeRef.current = mode;
              setCameraMode(mode);
            }}
            transitionRef={transitionRef}
            perspectiveRef={perspectiveRef}
            orthographicRef={orthographicRef}
            controlsRef={controlsRef}
          />
          <OrthoPlaneTracker
            enabled={isOrtho}
            setPlane={setOrthoPlane}
            setSign={setOrthoSign}
            setStrict={setIsOrthoStrict}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

const MeasurementTool: React.FC<{
  enabled: boolean;
  points: THREE.Vector3[];
  setPoints: React.Dispatch<React.SetStateAction<THREE.Vector3[]>>;
  plane: "top" | "front" | "side";
  planeOrigin: THREE.Vector3;
  gridStep: number;
  gridWidth: number;
  gridLength: number;
  gridHeight: number;
}> = ({ enabled, points, setPoints, plane, planeOrigin, gridStep, gridWidth, gridLength, gridHeight }) => {

  const handlePointClick = useCallback(
    (index: number) => (e: any) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      setPoints((prev) => prev.filter((_, idx) => idx !== index));
    },
    [setPoints]
  );

  const snapPoint = useCallback(
    (p: THREE.Vector3) => {
      const snap = (v: number) => Math.round(v / gridStep) * gridStep;
      if (plane === "top") return new THREE.Vector3(snap(p.x), planeOrigin.y, snap(p.z));
      if (plane === "side") return new THREE.Vector3(planeOrigin.x, snap(p.y), snap(p.z));
      return new THREE.Vector3(snap(p.x), snap(p.y), planeOrigin.z);
    },
    [gridStep, plane, planeOrigin]
  );

  const hasLine = points.length >= 2;
  const totalDistance = points.reduce((acc, p, idx) => {
    if (idx === 0) return 0;
    return acc + p.distanceTo(points[idx - 1]);
  }, 0);
  const lastMidpoint = useMemo(() => {
    if (points.length < 2) return null;
    const a = points[points.length - 2];
    const b = points[points.length - 1];
    return new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  }, [points]);
  const planeRotation =
    plane === "top" ? [-Math.PI / 2, 0, 0] : plane === "side" ? [0, Math.PI / 2, 0] : [0, 0, 0];
  const planePosition: [number, number, number] = [planeOrigin.x, planeOrigin.y, planeOrigin.z];
  const planeSize =
    plane === "top"
      ? [gridWidth, gridLength]
      : plane === "front"
        ? [gridWidth, gridHeight]
        : [gridLength, gridHeight];

  if (!enabled) return null;

  return (
    <>
      <mesh
        position={planePosition}
        rotation={planeRotation as [number, number, number]}
        onPointerDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          if (!enabled) return;
          const snapped = snapPoint(e.point.clone());
          setPoints((prev) => {
            if (prev.length >= 3) return [snapped];
            return [...prev, snapped];
          });
        }}
      >
        <planeGeometry args={planeSize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {points.map((p, idx) => (
        <mesh
          key={`measure-point-${idx}`}
          position={[p.x, p.y, p.z]}
          onPointerDown={handlePointClick(idx)}
          renderOrder={1000}
        >
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial color={idx === 0 ? "#22c55e" : idx === 1 ? "#0ea5e9" : "#f59e0b"} depthTest={false} depthWrite={false} />
        </mesh>
      ))}

      {hasLine && (
        <>
          <Line points={points} color="#0ea5e9" lineWidth={2} depthTest={false} depthWrite={false} renderOrder={999} />
          {lastMidpoint && (
            <Html position={[lastMidpoint.x, lastMidpoint.y + 0.2, lastMidpoint.z]}>
              <div className="px-2 py-1 text-xs font-semibold bg-white/80 border border-slate-200 rounded shadow-sm">
                {(totalDistance * 100).toFixed(1)} см
              </div>
            </Html>
          )}
        </>
      )}
    </>
  );
};

const CameraTransition: React.FC<{
  cameraMode: "perspective" | "orthographic";
  setCameraMode: (mode: "perspective" | "orthographic") => void;
  transitionRef: React.MutableRefObject<{
    active: boolean;
    t: number;
    from: "perspective" | "orthographic";
    to: "perspective" | "orthographic";
    initialized: boolean;
    startFov: number;
    targetFov: number;
    startZoom: number;
    targetZoom: number;
  }>;
  perspectiveRef: React.RefObject<THREE.PerspectiveCamera>;
  orthographicRef: React.RefObject<THREE.OrthographicCamera>;
  controlsRef: React.RefObject<any>;
}> = ({ cameraMode, setCameraMode, transitionRef, perspectiveRef, orthographicRef, controlsRef }) => {
  const { size } = useThree();
  useFrame((_, delta) => {
    const perspective = perspectiveRef.current;
    const orthographic = orthographicRef.current;
    if (!perspective || !orthographic) return;

    orthographic.left = -size.width / 2;
    orthographic.right = size.width / 2;
    orthographic.top = size.height / 2;
    orthographic.bottom = -size.height / 2;

    const target = controlsRef.current?.target ?? new THREE.Vector3(0, 0, 0);
    const distance = perspective.position.distanceTo(target) || 0.0001;

    if (cameraMode === "perspective") {
      const fovRad = THREE.MathUtils.degToRad(perspective.fov);
      const height = 2 * distance * Math.tan(fovRad / 2);
      const zoom = Math.max(0.0001, size.height / height);

      orthographic.position.copy(perspective.position);
      orthographic.quaternion.copy(perspective.quaternion);
      orthographic.zoom = zoom;
    } else {
      const height = size.height / Math.max(0.0001, orthographic.zoom);
      const fov = THREE.MathUtils.radToDeg(2 * Math.atan(height / (2 * distance)));

      perspective.position.copy(orthographic.position);
      perspective.quaternion.copy(orthographic.quaternion);
      perspective.fov = fov;
    }

    perspective.updateProjectionMatrix();
    orthographic.updateProjectionMatrix();
    controlsRef.current?.update();
  });

  return null;
};

const Foundation: React.FC<{
  config: CarportConfig;
  foundationWidth: number;
  foundationLength: number;
  foundationCenterZ: number;
}> = ({ config, foundationWidth, foundationLength, foundationCenterZ }) => {
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (!materialRef.current) return;
    const below = camera.position.y < -0.05;
    materialRef.current.transparent = true;
    materialRef.current.opacity = below ? 0.35 : 1;
    materialRef.current.needsUpdate = true;
  });

  const numRows = Math.ceil(config.length / SPECS.postSpacing);
  const rowSpacing = config.length / numRows;
  const xPositions = [-config.width / 2, config.width / 2];
  const anchorPositions: [number, number, number][] = [];
  for (let r = 0; r <= numRows; r++) {
    const z = -config.length / 2 + r * rowSpacing;
    xPositions.forEach((x) => anchorPositions.push([x, 0.02, z]));
  }

  const foundationDepth = (config.hasFoundation || config.installationType === InstallationType.FoundationPour)
    ? (config.foundationThickness ?? 0.3)
    : 0.15;

  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, -foundationDepth / 2, foundationCenterZ]}>
        <boxGeometry args={[foundationWidth, foundationDepth, foundationLength]} />
        <meshStandardMaterial ref={materialRef} color="#cbd5e1" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Закладные под каждым столбом */}
      {anchorPositions.map((pos, idx) => (
        <mesh key={`anchor-${idx}`} position={[pos[0], pos[1], pos[2]]}>
          <boxGeometry args={[0.18, 0.02, 0.18]} />
          <meshStandardMaterial color="#64748b" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
};

const OrthoPlaneTracker: React.FC<{ 
  enabled: boolean;
  setPlane: React.Dispatch<React.SetStateAction<"top" | "front" | "side">>;
  setSign: React.Dispatch<React.SetStateAction<number>>;
  setStrict: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({
  enabled,
  setPlane,
  setSign,
  setStrict,
}) => {
  const { camera } = useThree();
  const last = useRef<"top" | "front" | "side">("top");
  const lastSign = useRef<number>(1);

  useFrame(() => {
    if (!enabled) {
      setStrict(false);
      return;
    }
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const ax = Math.abs(dir.x);
    const ay = Math.abs(dir.y);
    const az = Math.abs(dir.z);

    let next: "top" | "front" | "side" = "top";
    if (ay >= ax && ay >= az) next = "top";
    else if (az >= ax && az >= ay) next = "front";
    else next = "side";

    let sign = 1;
    if (next === "front") sign = dir.z >= 0 ? 1 : -1;
    if (next === "side") sign = dir.x >= 0 ? 1 : -1;
    if (next === "top") sign = dir.y >= 0 ? 1 : -1;

    const strict =
      (next === "top" && ay >= 0.98) ||
      (next === "front" && az >= 0.98) ||
      (next === "side" && ax >= 0.98);

    if (next !== last.current) {
      last.current = next;
      setPlane(next);
    }
    if (sign !== lastSign.current) {
      lastSign.current = sign;
      setSign(sign);
    }
    setStrict(strict);
  });

  return null;
};

const OrthoGrid: React.FC<{
  plane: "top" | "front" | "side";
  sign: number;
  strict: boolean;
  width: number;
  length: number;
  height: number;
  gridHeight: number;
  foundationWidth: number;
  foundationLength: number;
}> = ({ plane, sign, strict, width, length, height, gridHeight, foundationWidth, foundationLength }) => {
  if (!strict) return null;

  if (plane === "top") {
    return (
      <Grid
        position={[0, sign * (height / 2 + 1), 0]}
        args={[width, length]}
        cellSize={1}
        cellThickness={1}
        cellColor="#94a3b8"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#475569"
        fadeDistance={1000}
        fadeStrength={1}
        infiniteGrid={true}
        opacity={0.45}
        transparent
        side={THREE.DoubleSide}
        renderOrder={-1}
      />
    );
  }

  if (plane === "front") {
    return (
      <Grid
        position={[0, height / 2, sign * (foundationLength / 2 + 1)]}
        rotation={[Math.PI / 2, 0, 0]}
        args={[width, gridHeight]}
        cellSize={1}
        cellThickness={1}
        cellColor="#94a3b8"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#475569"
        fadeDistance={1000}
        fadeStrength={1}
        infiniteGrid={true}
        opacity={0.45}
        transparent
        side={THREE.DoubleSide}
        renderOrder={-1}
      />
    );
  }

  return (
    <Grid
      position={[sign * (foundationWidth / 2 + 1), height / 2, 0]}
      rotation={[0, 0, Math.PI / 2]}
      args={[length, gridHeight]}
      cellSize={1}
      cellThickness={1}
      cellColor="#94a3b8"
      sectionSize={5}
      sectionThickness={1.5}
      sectionColor="#475569"
      fadeDistance={1000}
      fadeStrength={1}
      infiniteGrid={true}
      opacity={0.45}
      transparent
      side={THREE.DoubleSide}
      renderOrder={-1}
    />
  );
};
