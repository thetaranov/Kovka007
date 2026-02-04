import { useMemo, memo, FC, ReactNode } from 'react';
import * as THREE from 'three';
import { GateConfig, GateType, GateFilling } from '../types/gates';

interface GateModelProps {
  config: GateConfig;
  position: [number, number, number]; // позиция центра ворот
  rotation?: number; // поворот вокруг Y, радианы
  carportLength: number; // длина навеса для позиционирования
}

interface BoxProfileProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  width: number;
  height: number;
  color: string;
}

// Компонент для профильной трубы
const BoxProfile: FC<BoxProfileProps> = memo(({ start, end, width, height, color }) => {
  const length = start.distanceTo(end);
  const position = useMemo(() => start.clone().lerp(end, 0.5), [start, end]);
  const quaternion = useMemo(() => {
    const direction = end.clone().sub(start).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  }, [start, end]);

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <boxGeometry args={[width, length, height]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.3} />
    </mesh>
  );
});

interface LatticePanelProps {
  width: number;
  height: number;
  color: string;
  barSpacing?: number;
}

// Решетчатое заполнение
const LatticePanel: FC<LatticePanelProps> = ({ width, height, color, barSpacing = 0.1 }) => {
  const bars = useMemo(() => {
    const result: ReactNode[] = [];
    const barWidth = 0.012;
    const barDepth = 0.012;
    
    // Вертикальные прутья
    const vertCount = Math.floor(width / barSpacing);
    for (let i = 0; i <= vertCount; i++) {
      const x = -width / 2 + i * (width / vertCount);
      result.push(
        <mesh key={`v-${i}`} position={[x, height / 2, 0]} castShadow>
          <boxGeometry args={[barWidth, height, barDepth]} />
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
        </mesh>
      );
    }
    
    // Горизонтальные перемычки (3 штуки)
    const horizPositions = [0.15, height / 2, height - 0.15];
    for (let i = 0; i < horizPositions.length; i++) {
      result.push(
        <mesh key={`h-${i}`} position={[0, horizPositions[i], 0]} castShadow>
          <boxGeometry args={[width, barWidth, barDepth]} />
          <meshStandardMaterial color={color} roughness={0.6} metalness={0.4} />
        </mesh>
      );
    }
    
    return result;
  }, [width, height, color, barSpacing]);

  return <group>{bars}</group>;
};

interface PanelProps {
  width: number;
  height: number;
  color: string;
  offsetZ?: number;
}

// Сплошное заполнение (профлист)
const SolidPanel: FC<PanelProps> = ({ width, height, color, offsetZ = -0.03 }) => {
  return (
    <mesh position={[0, height / 2, offsetZ]} castShadow receiveShadow>
      <boxGeometry args={[width - 0.06, height - 0.06, 0.02]} />
      <meshStandardMaterial 
        color={color}
        roughness={0.35} 
        metalness={0.4}
        side={THREE.DoubleSide}
        envMapIntensity={1.2}
      />
    </mesh>
  );
};

// Кованые элементы (упрощенно)
const ForgedPanel: FC<PanelProps> = ({ width, height, color }) => {
  const elements = useMemo(() => {
    const result: ReactNode[] = [];
    const barDia = 0.016;
    
    // Основные прутья
    const vertCount = Math.floor(width / 0.15);
    for (let i = 0; i <= vertCount; i++) {
      const x = -width / 2 + i * (width / vertCount);
      result.push(
        <mesh key={`v-${i}`} position={[x, height / 2 - 0.1, 0]} castShadow>
          <cylinderGeometry args={[barDia / 2, barDia / 2, height - 0.2, 8]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.5} />
        </mesh>
      );
    }

    // Более изогнутый орнамент (S-образные завитки)
    const ornamentRows = [height * 0.35, height * 0.6];
    const curveCount = Math.max(2, Math.floor(width / 1.2));
    const span = width / curveCount;
    const amp = Math.min(0.18, height * 0.12);

    ornamentRows.forEach((y, rowIdx) => {
      for (let i = 0; i < curveCount; i++) {
        const x0 = -width / 2 + i * span;
        const x1 = x0 + span;
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(x0, y, 0),
          new THREE.Vector3(x0 + span * 0.25, y + amp, 0),
          new THREE.Vector3(x0 + span * 0.5, y - amp, 0),
          new THREE.Vector3(x0 + span * 0.75, y + amp, 0),
          new THREE.Vector3(x1, y, 0),
        ]);
        result.push(
          <mesh key={`curve-${rowIdx}-${i}`} castShadow>
            <tubeGeometry args={[curve, 48, barDia / 2.2, 8, false]} />
            <meshStandardMaterial color={color} roughness={0.35} metalness={0.6} />
          </mesh>
        );
      }
    });
    
    return result;
  }, [width, height, color]);

  return <group>{elements}</group>;
};

interface GateComponentProps {
  config: GateConfig;
}

// Откатные ворота (по схеме: треугольный противовес слева от рамы)
const SlidingGate: FC<GateComponentProps> = ({ config }) => {
  const { width, height, filling, openDirection, hasWicket } = config;
  const frameColor = config.frameColor ?? '#1a1a1a';
  const panelColor = config.panelColor ?? '#3E2723';
  const frameSize = config.frameSize === '80x40' ? 0.08 : 0.06;
  const frameDepth = 0.04;
  
  // Направление: 1 = влево (противовес слева), -1 = вправо (противовес справа)
  const dir = (openDirection ?? 'left') === 'left' ? 1 : -1;
  
  // Длина противовеса = 1/2 ширины проема
  const counterweightLength = width * 0.5;
  
  // Полная длина рамы ворот (L + 200мм по схеме, упрощенно = width + 0.2)
  const frameWidth = width + 0.2;
  const halfFrame = frameWidth / 2;
  
  // Основная рама ворот (прямоугольник)
  const frame = useMemo(() => {
    const elements: ReactNode[] = [];
    
    // Нижняя балка рамы
    elements.push(
      <BoxProfile
        key="bottom"
        start={new THREE.Vector3(-halfFrame * dir, frameSize / 2, 0)}
        end={new THREE.Vector3(halfFrame * dir, frameSize / 2, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    
    // Верхняя балка рамы
    elements.push(
      <BoxProfile
        key="top"
        start={new THREE.Vector3(-halfFrame * dir, height - frameSize / 2, 0)}
        end={new THREE.Vector3(halfFrame * dir, height - frameSize / 2, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    
    // Левая стойка (со стороны противовеса)
    elements.push(
      <BoxProfile
        key="left"
        start={new THREE.Vector3(-halfFrame * dir + frameSize / 2 * dir, 0, 0)}
        end={new THREE.Vector3(-halfFrame * dir + frameSize / 2 * dir, height, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    
    // Правая стойка (приемная сторона)
    elements.push(
      <BoxProfile
        key="right"
        start={new THREE.Vector3(halfFrame * dir - frameSize / 2 * dir, 0, 0)}
        end={new THREE.Vector3(halfFrame * dir - frameSize / 2 * dir, height, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    
    // Средняя вертикальная перемычка
    elements.push(
      <BoxProfile
        key="mid-vert"
        start={new THREE.Vector3(0, frameSize, 0)}
        end={new THREE.Vector3(0, height - frameSize, 0)}
        width={0.04}
        height={0.02}
        color={frameColor}
      />
    );
    
    // Горизонтальная перемычка посередине высоты
    elements.push(
      <BoxProfile
        key="mid-horiz"
        start={new THREE.Vector3(-halfFrame * dir + frameSize * dir, height / 2, 0)}
        end={new THREE.Vector3(halfFrame * dir - frameSize * dir, height / 2, 0)}
        width={0.04}
        height={0.02}
        color={frameColor}
      />
    );
    
    return elements;
  }, [width, height, frameColor, frameSize, frameDepth, dir, halfFrame]);
  
  // Заполнение
  const fillingPanel = useMemo(() => {
    const panelWidth = frameWidth - frameSize * 2;
    const panelHeight = height - frameSize * 2;
    
    switch (filling) {
      case GateFilling.Solid:
        return <group position={[0, frameSize, 0]}><SolidPanel width={panelWidth} height={panelHeight} color={panelColor} /></group>;
      case GateFilling.Lattice:
        return <group position={[0, frameSize, 0]}><LatticePanel width={panelWidth} height={panelHeight} color={panelColor} /></group>;
      case GateFilling.Forged:
        return <group position={[0, frameSize, 0]}><ForgedPanel width={panelWidth} height={panelHeight} color={panelColor} /></group>;
      default:
        return <group position={[0, frameSize, 0]}><SolidPanel width={panelWidth} height={panelHeight} color={panelColor} /></group>;
    }
  }, [frameWidth, height, panelColor, filling, frameSize]);

  const wicketOverlay = useMemo(() => {
    if (!hasWicket) return null;
    const panelWidth = frameWidth - frameSize * 2;
    const panelHeight = height - frameSize * 2;
    const wicketWidth = Math.min(0.6, panelWidth - 0.1);
    const wicketHeight = Math.min(2.0, panelHeight - 0.1);
    const wicketFrame = 0.03;
    const wicketDepth = 0.02;
    const wicketX = panelWidth / 2 - wicketWidth - 0.1;
    const wicketY = Math.max(0.1, frameSize + 0.05);

    return (
      <group position={[0, frameSize, 0]}>
        {([0.03, -0.03] as const).map((zOffset) => (
          <group key={`wicket-${zOffset}`} position={[wicketX, wicketY, zOffset]}>
            <BoxProfile
              start={new THREE.Vector3(0, wicketFrame / 2, 0)}
              end={new THREE.Vector3(wicketWidth, wicketFrame / 2, 0)}
              width={wicketFrame}
              height={wicketDepth}
              color={frameColor}
            />
            <BoxProfile
              start={new THREE.Vector3(0, wicketHeight - wicketFrame / 2, 0)}
              end={new THREE.Vector3(wicketWidth, wicketHeight - wicketFrame / 2, 0)}
              width={wicketFrame}
              height={wicketDepth}
              color={frameColor}
            />
            <BoxProfile
              start={new THREE.Vector3(wicketFrame / 2, 0, 0)}
              end={new THREE.Vector3(wicketFrame / 2, wicketHeight, 0)}
              width={wicketFrame}
              height={wicketDepth}
              color={frameColor}
            />
            <BoxProfile
              start={new THREE.Vector3(wicketWidth - wicketFrame / 2, 0, 0)}
              end={new THREE.Vector3(wicketWidth - wicketFrame / 2, wicketHeight, 0)}
              width={wicketFrame}
              height={wicketDepth}
              color={frameColor}
            />
          </group>
        ))}
      </group>
    );
  }, [hasWicket, frameWidth, height, frameSize, frameColor]);
  
  // Треугольный противовес (по схеме: нижняя балка + диагональ к верхнему углу рамы)
  const counterweight = useMemo(() => {
    // Позиция противовеса: слева от рамы (или справа если dir=-1)
    const cwStartX = -halfFrame * dir - counterweightLength * dir; // дальний конец противовеса
    const cwEndX = -halfFrame * dir; // соединение с рамой
    
    return (
      <group>
        {/* Нижняя балка противовеса */}
        <BoxProfile
          start={new THREE.Vector3(cwStartX, frameSize / 2, 0)}
          end={new THREE.Vector3(cwEndX, frameSize / 2, 0)}
          width={frameSize}
          height={frameDepth}
          color={frameColor}
        />
        {/* Диагональ: от дальнего нижнего угла к верхнему углу рамы */}
        <BoxProfile
          start={new THREE.Vector3(cwStartX, frameSize, 0)}
          end={new THREE.Vector3(cwEndX, height - frameSize / 2, 0)}
          width={frameSize}
          height={frameDepth}
          color={frameColor}
        />
      </group>
    );
  }, [halfFrame, counterweightLength, height, frameSize, frameDepth, frameColor, dir]);
  
  // Направляющая (рельс) снизу - под всей конструкцией
  const totalLength = frameWidth + counterweightLength;
  const railCenterX = (-counterweightLength / 2) * dir;
  const rail = (
    <mesh position={[railCenterX, 0.02, 0]} castShadow>
      <boxGeometry args={[totalLength + 0.3, 0.04, 0.1]} />
      <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.7} />
    </mesh>
  );
  
  // Столбы (приемный столб на стороне открытия)
  const posts = (
    <group>
      {/* Приемный столб */}
      <mesh position={[halfFrame * dir + 0.1 * dir, height / 2 + 0.1, 0]} castShadow>
        <boxGeometry args={[0.1, height + 0.2, 0.1]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Верхний ловитель */}
      <mesh position={[halfFrame * dir + 0.1 * dir, height - 0.1, 0.06]} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Нижний ловитель */}
      <mesh position={[halfFrame * dir + 0.1 * dir, 0.15, 0.06]} castShadow>
        <boxGeometry args={[0.08, 0.12, 0.04]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
  
  // Роликовые опоры (на противовесной стороне)
  const rollers = (
    <group>
      <mesh position={[(-halfFrame + frameWidth * 0.15) * dir, 0.06, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[(-halfFrame + frameWidth * 0.35) * dir, 0.06, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 16]} />
        <meshStandardMaterial color={frameColor} roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
  
  return (
    <group>
      {frame}
      {fillingPanel}
      {wicketOverlay}
      {counterweight}
      {rail}
      {posts}
      {rollers}
    </group>
  );
};

// Распашные ворота
const SwingGate: React.FC<{
  config: GateConfig;
}> = ({ config }) => {
  const { width, height, filling, hasWicket, openDirection } = config;
  const frameColor = config.frameColor ?? '#1a1a1a';
  const panelColor = config.panelColor ?? '#3E2723';
  const frameSize = config.frameSize === '80x40' ? 0.08 : 0.06;
  const frameDepth = 0.04;
  const halfWidth = width / 2;
  const leafWidth = halfWidth;

  const createWicketFrame = (wicketWidth: number, wicketHeight: number) => {
    const wicketFrame = 0.03;
    const wicketDepth = 0.02;
    return (
      <group>
        <BoxProfile
          start={new THREE.Vector3(0, wicketFrame / 2, 0)}
          end={new THREE.Vector3(wicketWidth, wicketFrame / 2, 0)}
          width={wicketFrame}
          height={wicketDepth}
          color={frameColor}
        />
        <BoxProfile
          start={new THREE.Vector3(0, wicketHeight - wicketFrame / 2, 0)}
          end={new THREE.Vector3(wicketWidth, wicketHeight - wicketFrame / 2, 0)}
          width={wicketFrame}
          height={wicketDepth}
          color={frameColor}
        />
        <BoxProfile
          start={new THREE.Vector3(wicketFrame / 2, 0, 0)}
          end={new THREE.Vector3(wicketFrame / 2, wicketHeight, 0)}
          width={wicketFrame}
          height={wicketDepth}
          color={frameColor}
        />
        <BoxProfile
          start={new THREE.Vector3(wicketWidth - wicketFrame / 2, 0, 0)}
          end={new THREE.Vector3(wicketWidth - wicketFrame / 2, wicketHeight, 0)}
          width={wicketFrame}
          height={wicketDepth}
          color={frameColor}
        />
        <mesh position={[wicketWidth - wicketFrame, wicketHeight / 2, 0.02]}>
          <boxGeometry args={[0.02, 0.08, 0.02]} />
          <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
        </mesh>
      </group>
    );
  };
  
  const createLeaf = (leafW: number, xOffset: number, key: string, mirrored = false) => {
    const elements: React.ReactNode[] = [];
    
    // Рама створки
    elements.push(
      <BoxProfile
        key={`${key}-bottom`}
        start={new THREE.Vector3(0, frameSize / 2, 0)}
        end={new THREE.Vector3(leafW, frameSize / 2, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    elements.push(
      <BoxProfile
        key={`${key}-top`}
        start={new THREE.Vector3(0, height - frameSize / 2, 0)}
        end={new THREE.Vector3(leafW, height - frameSize / 2, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    elements.push(
      <BoxProfile
        key={`${key}-left`}
        start={new THREE.Vector3(frameSize / 2, 0, 0)}
        end={new THREE.Vector3(frameSize / 2, height, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    elements.push(
      <BoxProfile
        key={`${key}-right`}
        start={new THREE.Vector3(leafW - frameSize / 2, 0, 0)}
        end={new THREE.Vector3(leafW - frameSize / 2, height, 0)}
        width={frameSize}
        height={frameDepth}
        color={frameColor}
      />
    );
    
    // Перемычка
    elements.push(
      <BoxProfile
        key={`${key}-mid`}
        start={new THREE.Vector3(0, height / 2, 0)}
        end={new THREE.Vector3(leafW, height / 2, 0)}
        width={0.04}
        height={0.02}
        color={frameColor}
      />
    );
    
    // Заполнение
    const panelW = leafW - frameSize * 2;
    const panelH = height - frameSize * 2;
    
    let fillingComp;
    switch (filling) {
      case GateFilling.Lattice:
        fillingComp = <LatticePanel width={panelW} height={panelH} color={panelColor} />;
        break;
      case GateFilling.Forged:
        fillingComp = <ForgedPanel width={panelW} height={panelH} color={panelColor} />;
        break;
      default:
        fillingComp = <SolidPanel width={panelW} height={panelH} color={panelColor} />;
    }
    
    elements.push(
      <group key={`${key}-fill`} position={[leafW / 2, frameSize, 0]}>
        {fillingComp}
      </group>
    );

    if (hasWicket && key === 'right') {
      const wicketWidth = Math.min(0.6, panelW - 0.1);
      const wicketHeight = Math.min(2.0, panelH - 0.1);
      const wicketX = mirrored
        ? frameSize + 0.05
        : Math.max(frameSize + 0.05, leafW - frameSize - wicketWidth - 0.1);
      const wicketY = Math.max(frameSize + 0.05, 0.1);
      elements.push(
        <group key={`${key}-wicket-front`} position={[wicketX, wicketY, 0.03]}>
          {createWicketFrame(wicketWidth, wicketHeight)}
        </group>
      );
      elements.push(
        <group key={`${key}-wicket-back`} position={[wicketX, wicketY, -0.03]}>
          {createWicketFrame(wicketWidth, wicketHeight)}
        </group>
      );
    }
    
    return <group position={[xOffset, 0, 0]}>{elements}</group>;
  };
  
  // Столбы (без шариков)
  const postHeight = height + 0.15;
  const posts = (
    <group>
      <mesh position={[-halfWidth - 0.08, postHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.12, postHeight, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[halfWidth + 0.08, postHeight / 2, 0]} castShadow>
        <boxGeometry args={[0.12, postHeight, 0.12]} />
        <meshStandardMaterial color={frameColor} roughness={0.6} metalness={0.4} />
      </mesh>
      {/* Заглушки столбов (плоские) */}
      <mesh position={[-halfWidth - 0.08, postHeight + 0.01, 0]} castShadow>
        <boxGeometry args={[0.13, 0.02, 0.13]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[halfWidth + 0.08, postHeight + 0.01, 0]} castShadow>
        <boxGeometry args={[0.13, 0.02, 0.13]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
  
  const openSign = (openDirection ?? 'left') === 'left' ? 1 : -1;
  const openAngle = THREE.MathUtils.degToRad(12) * openSign;

  return (
    <group>
      {posts}
      {/* Левая створка */}
      <group position={[-halfWidth, 0, 0]} rotation={[0, openAngle, 0]}>
        {createLeaf(leafWidth, 0, 'left')}
      </group>
      {/* Правая створка */}
      <group position={[halfWidth, 0, 0]} rotation={[0, -openAngle, 0]} scale={[-1, 1, 1]}>
        {createLeaf(leafWidth, 0, 'right', true)}
      </group>
    </group>
  );
};

// Секционные ворота
const HingedGate: React.FC<{
  config: GateConfig;
}> = ({ config }) => {
  const { width, height } = config;
  const frameColor = config.frameColor ?? '#1a1a1a';
  const panelColor = config.panelColor ?? '#3E2723';
  
  // Секции
  const sectionCount = Math.max(3, Math.ceil(height / 0.5));
  const sectionHeight = height / sectionCount;
  
  const sections = useMemo(() => {
    const result: React.ReactNode[] = [];
    
    for (let i = 0; i < sectionCount; i++) {
      const y = i * sectionHeight + sectionHeight / 2;
      
      // Панель секции
      result.push(
        <mesh key={`section-${i}`} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[width - 0.1, sectionHeight - 0.02, 0.04]} />
          <meshStandardMaterial 
            color={panelColor} 
            roughness={0.6} 
            metalness={0.4}
          />
        </mesh>
      );
      
      // Линия между секциями
      if (i > 0) {
        result.push(
          <mesh key={`line-${i}`} position={[0, i * sectionHeight, 0.025]}>
            <boxGeometry args={[width, 0.01, 0.01]} />
            <meshStandardMaterial color="#333" roughness={0.5} metalness={0.6} />
          </mesh>
        );
      }
    }
    
    return result;
  }, [width, height, sectionCount, sectionHeight, panelColor]);
  
  // Рама (направляющие)
  const frame = (
    <group>
      {/* Вертикальные направляющие */}
      <mesh position={[-width / 2 - 0.04, height / 2, 0.03]} castShadow>
        <boxGeometry args={[0.06, height + 0.1, 0.08]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
      <mesh position={[width / 2 + 0.04, height / 2, 0.03]} castShadow>
        <boxGeometry args={[0.06, height + 0.1, 0.08]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Перемычка сверху */}
      <mesh position={[0, height + 0.03, 0.03]} castShadow>
        <boxGeometry args={[width + 0.2, 0.06, 0.08]} />
        <meshStandardMaterial color={frameColor} roughness={0.5} metalness={0.6} />
      </mesh>
    </group>
  );
  
  return (
    <group>
      {sections}
      {frame}
    </group>
  );
};

// Главный компонент модели ворот
export const GateModel: React.FC<GateModelProps> = ({ 
  config, 
  position, 
  rotation = 0,
  carportLength
}) => {
  if (config.type === GateType.None) {
    return null;
  }
  
  // Расстояние от ворот до края навеса (выезда)
  const distance = config.distanceFromCarport ?? 2.0;
  
  // Позиция ворот - по центру въезда
  const gatePosition: [number, number, number] = [
    position[0],
    position[1],
    -carportLength / 2 - distance, // перед навесом на заданном расстоянии
  ];
  
  return (
    <group position={gatePosition} rotation={[0, rotation, 0]}>
      {config.type === GateType.Sliding && <SlidingGate config={config} />}
      {config.type === GateType.Swing && <SwingGate config={config} />}
      {config.type === GateType.Hinged && <HingedGate config={config} />}
    </group>
  );
};

export default GateModel;
