"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  Mesh,
  InstancedMesh,
  PointsMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from "three";

interface FloatingCardInput {
  id: string;
  title: string;
  imageUrl: string;
  backImageUrl: string;
  phaseOffset: number;
}

interface FloatingCardSceneProps {
  cards: FloatingCardInput[];
  scrollProgressRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{
    x: number;
    y: number;
  }>;
}

interface ThemePalette {
  accent: string;
  accent2: string;
  foreground: string;
}

interface ThemeMotionProfile {
  motionIntensity: number;
  weight: number;
  edgeVelocity: number;
  particleCount: number;
  particleSize: number;
  particleSpread: number;
  particleSpeed: number;
  densityBias: number;
  densityCeiling: number;
}

interface ThemeColorGrade {
  trailPrimary: string;
  trailSecondary: string;
  edgeTint: string;
  trailOpacityLow: number;
  trailOpacityHigh: number;
}

interface ThemeVisualConfig {
  palette: ThemePalette;
  profile: ThemeMotionProfile;
  grade: ThemeColorGrade;
}

interface DnaVisualConfig {
  backboneCount: number;
  pairCount: number;
  flowCount: number;
  rootX: number;
  rootY: number;
  rootZ: number;
  rootScale: number;
}

interface DnaActivitySignal {
  pulse: number;
  burst: number;
  burstPhase: number;
  activity: number;
  colorPhase: number;
  flowDirection: number;
  visibility: number;
}

interface ScenePerformanceProfile {
  scale: number;
  dpr: [number, number];
  antialias: boolean;
  enableBloom: boolean;
}

interface CardMeshProps {
  card: FloatingCardInput;
  index: number;
  scrollProgressRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{
    x: number;
    y: number;
  }>;
  profile: ThemeMotionProfile;
  performanceScale: number;
}

const THEME_MOTION_PROFILES: Record<string, ThemeMotionProfile> = {
  ocean: { motionIntensity: 1.16, weight: 0.9, edgeVelocity: 0.58, particleCount: 42, particleSize: 0.042, particleSpread: 1.06, particleSpeed: 1.18, densityBias: 0.36, densityCeiling: 1 },
  sunset: { motionIntensity: 1.08, weight: 0.92, edgeVelocity: 0.5, particleCount: 38, particleSize: 0.04, particleSpread: 1, particleSpeed: 1.1, densityBias: 0.32, densityCeiling: 0.95 },
  forest: { motionIntensity: 1.02, weight: 0.95, edgeVelocity: 0.46, particleCount: 34, particleSize: 0.039, particleSpread: 0.96, particleSpeed: 1.02, densityBias: 0.28, densityCeiling: 0.9 },
  dawn: { motionIntensity: 0.88, weight: 1.02, edgeVelocity: 0.34, particleCount: 28, particleSize: 0.033, particleSpread: 0.84, particleSpeed: 0.86, densityBias: 0.18, densityCeiling: 0.76 },
  pearl: { motionIntensity: 0.9, weight: 1, edgeVelocity: 0.36, particleCount: 30, particleSize: 0.034, particleSpread: 0.88, particleSpeed: 0.9, densityBias: 0.2, densityCeiling: 0.8 },
  mint: { motionIntensity: 0.92, weight: 0.98, edgeVelocity: 0.38, particleCount: 31, particleSize: 0.035, particleSpread: 0.9, particleSpeed: 0.92, densityBias: 0.22, densityCeiling: 0.82 },
  eclipse: { motionIntensity: 1.04, weight: 0.96, edgeVelocity: 0.5, particleCount: 36, particleSize: 0.038, particleSpread: 0.98, particleSpeed: 1.08, densityBias: 0.3, densityCeiling: 0.9 },
  mono: { motionIntensity: 0.9, weight: 1.02, edgeVelocity: 0.34, particleCount: 30, particleSize: 0.034, particleSpread: 0.88, particleSpeed: 0.88, densityBias: 0.2, densityCeiling: 0.78 },
  latte: { motionIntensity: 0.86, weight: 1.06, edgeVelocity: 0.3, particleCount: 26, particleSize: 0.032, particleSpread: 0.82, particleSpeed: 0.8, densityBias: 0.16, densityCeiling: 0.72 },
  mocha: { motionIntensity: 1, weight: 1, edgeVelocity: 0.42, particleCount: 32, particleSize: 0.036, particleSpread: 0.92, particleSpeed: 0.95, densityBias: 0.24, densityCeiling: 0.84 },
  sidewalk: { motionIntensity: 0.92, weight: 1.02, edgeVelocity: 0.36, particleCount: 28, particleSize: 0.034, particleSpread: 0.86, particleSpeed: 0.86, densityBias: 0.2, densityCeiling: 0.78 },
  leather: { motionIntensity: 0.74, weight: 1.18, edgeVelocity: 0.22, particleCount: 20, particleSize: 0.03, particleSpread: 0.7, particleSpeed: 0.66, densityBias: 0.12, densityCeiling: 0.62 },
};

const THEME_COLOR_GRADES: Record<string, ThemeColorGrade> = {
  ocean: { trailPrimary: "#5bd9ff", trailSecondary: "#8effd6", edgeTint: "#7cb8ff", trailOpacityLow: 0.14, trailOpacityHigh: 0.5 },
  sunset: { trailPrimary: "#ff8ba9", trailSecondary: "#ffd083", edgeTint: "#ffb59d", trailOpacityLow: 0.14, trailOpacityHigh: 0.48 },
  forest: { trailPrimary: "#74ebb8", trailSecondary: "#9be7ff", edgeTint: "#93ffcf", trailOpacityLow: 0.12, trailOpacityHigh: 0.44 },
  dawn: { trailPrimary: "#ff9b85", trailSecondary: "#ffc18b", edgeTint: "#ffbfd8", trailOpacityLow: 0.1, trailOpacityHigh: 0.32 },
  pearl: { trailPrimary: "#8ec5eb", trailSecondary: "#bee5fb", edgeTint: "#a7d9f7", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  mint: { trailPrimary: "#7ac69d", trailSecondary: "#b6d990", edgeTint: "#9dd1be", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  eclipse: { trailPrimary: "#8a95ff", trailSecondary: "#6be6c4", edgeTint: "#9cc7ff", trailOpacityLow: 0.12, trailOpacityHigh: 0.42 },
  mono: { trailPrimary: "#b8cee9", trailSecondary: "#d9e5f7", edgeTint: "#9fb9da", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  latte: { trailPrimary: "#d9aa8a", trailSecondary: "#c7b5e8", edgeTint: "#e0be9e", trailOpacityLow: 0.1, trailOpacityHigh: 0.32 },
  mocha: { trailPrimary: "#9ec1ff", trailSecondary: "#b5f0ae", edgeTint: "#c6b2f8", trailOpacityLow: 0.11, trailOpacityHigh: 0.38 },
  sidewalk: { trailPrimary: "#f0d274", trailSecondary: "#d4e7ed", edgeTint: "#f8e3a3", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  leather: { trailPrimary: "#d3a27a", trailSecondary: "#f0c39b", edgeTint: "#c98f66", trailOpacityLow: 0.08, trailOpacityHigh: 0.28 },
};

const DNA_VISUAL_CONFIG: DnaVisualConfig = {
  backboneCount: 62,
  pairCount: 20,
  flowCount: 42,
  rootX: 1.18,
  rootY: -0.06,
  rootZ: -1.5,
  rootScale: 0.56,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 127.1 + seed * seed * 0.193) * 43758.5453123;
  return value - Math.floor(value);
}

const BIO_CYAN = new Color("#46e8ff");
const BIO_PURPLE = new Color("#9d62ff");
const BIO_BLUE = new Color("#3c80ff");

function sampleBioGradient(target: Color, phase: number) {
  const wrapped = ((phase % 3) + 3) % 3;

  if (wrapped < 1) {
    return target.copy(BIO_CYAN).lerp(BIO_PURPLE, wrapped);
  }

  if (wrapped < 2) {
    return target.copy(BIO_PURPLE).lerp(BIO_BLUE, wrapped - 1);
  }

  return target.copy(BIO_BLUE).lerp(BIO_CYAN, wrapped - 2);
}

function readPerformanceProfile(): ScenePerformanceProfile {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      scale: 1,
      dpr: [1, 1.35],
      antialias: true,
      enableBloom: true,
    };
  }

  const connection = (navigator as Navigator & {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  }).connection;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scale = 1;

  if (reducedMotion) {
    scale *= 0.82;
  }
  if (connection?.saveData) {
    scale *= 0.78;
  }
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") {
    scale *= 0.84;
  }
  if (memory <= 4) {
    scale *= 0.82;
  }
  if (cores <= 4) {
    scale *= 0.84;
  }

  const normalizedScale = clamp(scale, 0.56, 1);
  const lowPower = normalizedScale < 0.8;

  return {
    scale: normalizedScale,
    dpr: lowPower ? [0.75, 1.1] : [1, 1.35],
    antialias: !lowPower,
    enableBloom: normalizedScale > 0.7,
  };
}

function createRoundedRectShape(width: number, height: number, radius: number) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const corner = Math.min(radius, halfWidth * 0.45, halfHeight * 0.45);

  const shape = new Shape();
  shape.moveTo(-halfWidth + corner, halfHeight);
  shape.lineTo(halfWidth - corner, halfHeight);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth, halfHeight - corner);
  shape.lineTo(halfWidth, -halfHeight + corner);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth - corner, -halfHeight);
  shape.lineTo(-halfWidth + corner, -halfHeight);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth, -halfHeight + corner);
  shape.lineTo(-halfWidth, halfHeight - corner);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth + corner, halfHeight);
  shape.closePath();

  return shape;
}

function getPath(index: number, progress: number) {
  const t = clamp(progress, 0, 1);
  // Viewport bounds: locked to +/- 4.5 to keep cards on screen for 100% of scroll
  const startY = 4.5;
  const endY = -4.5;

  switch (index % 4) {
    case 0: // Left Frame Curve (Narrower to clear right menu)
      return {
        x: -1.8 + Math.sin(t * Math.PI * 1.5) * 0.4,
        y: MathUtils.lerp(startY, endY, t),
        z: -0.8,
      };
    case 1: // Right Frame Curve (Narrower to clear right menu)
      return {
        x: 1.4 - Math.cos(t * Math.PI * 1.5) * 0.4,
        y: MathUtils.lerp(startY + 0.2, endY + 0.2, t),
        z: -1.0,
      };
    case 2: // Central Orbit A (Narrower)
      return {
        x: MathUtils.lerp(-0.6, 0.8, t) + Math.cos(t * Math.PI * 2) * 0.8,
        y: MathUtils.lerp(startY - 0.8, endY, t),
        z: -0.4,
      };
    case 3: // Central Orbit B (Narrower)
      return {
        x: MathUtils.lerp(0.6, -0.8, t) + Math.sin(t * Math.PI * 2) * 0.8,
        y: MathUtils.lerp(startY - 0.4, endY + 0.4, t),
        z: -0.5,
      };
    default:
      return { x: 0, y: 0, z: 0 };
  }
}

function createRoundedRectGeometry(width: number, height: number, radius: number) {
  return new ShapeGeometry(createRoundedRectShape(width, height, radius));
}

function normalizeGeometryUv(geometry: ShapeGeometry) {
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  const position = geometry.getAttribute("position") as BufferAttribute;

  if (!bounds || !position) {
    return geometry;
  }

  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;

  if (width <= 0 || height <= 0) {
    return geometry;
  }

  const uv = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);

    uv[index * 2] = (x - bounds.min.x) / width;
    uv[index * 2 + 1] = (y - bounds.min.y) / height;
  }

  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  return geometry;
}

function getTextureAspect(texture: { image?: { width?: number; height?: number } }, fallbackAspect: number) {
  const width = texture.image?.width ?? 0;
  const height = texture.image?.height ?? 0;

  if (width <= 0 || height <= 0) {
    return fallbackAspect;
  }

  return width / height;
}

function applyCoverUv(texture: {
  repeat: { set: (x: number, y: number) => void };
  offset: { set: (x: number, y: number) => void };
}, imageAspect: number, targetAspect: number) {
  if (!Number.isFinite(imageAspect) || imageAspect <= 0 || !Number.isFinite(targetAspect) || targetAspect <= 0) {
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    return;
  }

  if (imageAspect > targetAspect) {
    const repeatX = targetAspect / imageAspect;
    texture.repeat.set(repeatX, 1);
    texture.offset.set((1 - repeatX) * 0.5, 0);
    return;
  }

  const repeatY = imageAspect / targetAspect;
  texture.repeat.set(1, repeatY);
  texture.offset.set(0, (1 - repeatY) * 0.5);
}

function normalizeCardImageUrl(url: string) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname !== "res.cloudinary.com") {
      return url;
    }

    const uploadToken = "/upload/";
    const markerIndex = parsed.pathname.indexOf(uploadToken);

    if (markerIndex === -1) {
      return url;
    }

    const pathBeforeUpload = parsed.pathname.slice(0, markerIndex + uploadToken.length);
    const pathAfterUpload = parsed.pathname.slice(markerIndex + uploadToken.length);
    const [firstSegment = ""] = pathAfterUpload.split("/");

    const alreadyHasTransform = Boolean(firstSegment) && !/^v\d+$/.test(firstSegment);

    if (alreadyHasTransform) {
      return url;
    }

    const cardTransform = "e_trim:12/c_fill,g_auto,ar_5:7,w_1200,h_1680/f_auto,q_auto";
    parsed.pathname = `${pathBeforeUpload}${cardTransform}/${pathAfterUpload}`;
    return parsed.toString();
  } catch {
    return url;
  }
}

function sampleHelixPosition(
  target: Vector3,
  t: number,
  side: 0 | 1,
  elapsed: number,
  radius: number,
  profile: ThemeMotionProfile,
  phaseOffset: number,
  activity = 0,
  attraction = 0
) {
  const wrapped = t - Math.floor(t);
  const organicNoise = Math.sin(elapsed * 0.34 + wrapped * Math.PI * 5.4 + phaseOffset) * 0.04;
  const verticalWave = Math.sin(elapsed * 0.16 + wrapped * Math.PI * 2.6 + phaseOffset) * 0.06 + organicNoise;
  const twistWave = Math.sin(elapsed * 0.27 + wrapped * Math.PI * 4.2 + phaseOffset * 1.7) * (0.12 + activity * 0.04);
  const sideOffset = side === 0 ? 0 : Math.PI;
  const angle = wrapped * Math.PI * 7.1 + elapsed * (0.2 + profile.motionIntensity * 0.08) + twistWave + sideOffset;
  const dynamicRadius = radius + Math.sin(elapsed * 0.35 + wrapped * Math.PI * 3.8 + phaseOffset) * 0.05 + activity * 0.03;
  const y = MathUtils.lerp(-3.15, 3.15, wrapped) + verticalWave;

  target.set(
    Math.cos(angle) * dynamicRadius,
    y,
    Math.sin(angle) * dynamicRadius * 0.86
  );

  if (attraction > 0) {
    const centerFalloff = 1 - Math.min(1, Math.abs(y) / 4.2);
    const pull = attraction * centerFalloff;
    target.x *= 1 - pull * 0.28;
    target.z *= 1 - pull * 0.2;
  }

  return target;
}

function DnaBackboneStrands({
  pointerRef,
  profile,
  palette,
  grade,
  activityRef,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  grade: ThemeColorGrade;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const leftTubeRef = useRef<InstancedMesh>(null);
  const rightTubeRef = useRef<InstancedMesh>(null);
  const leftSheathRef = useRef<InstancedMesh>(null);
  const rightSheathRef = useRef<InstancedMesh>(null);
  const leftNodeRef = useRef<InstancedMesh>(null);
  const rightNodeRef = useRef<InstancedMesh>(null);
  const leftFlowRef = useRef<InstancedMesh>(null);
  const rightFlowRef = useRef<InstancedMesh>(null);
  const helper = useMemo(() => new Object3D(), []);
  const helperB = useMemo(() => new Object3D(), []);
  const sample = useMemo(() => new Vector3(), []);
  const sampleB = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const yAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const accentPrimary = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accentSecondary = useMemo(() => new Color(palette.accent2), [palette.accent2]);
  const gradientColor = useMemo(() => new Color(), []);
  const tubeCount = Math.max(30, Math.round(DNA_VISUAL_CONFIG.backboneCount * performanceScale));
  const nodeCount = Math.max(14, Math.round(28 * performanceScale));
  const flowCount = Math.max(10, Math.round(20 * performanceScale));
  const tubeRadialSegments = performanceScale < 0.75 ? 8 : 10;
  const nodeSegments = performanceScale < 0.75 ? 8 : 12;
  const flowSegments = performanceScale < 0.75 ? 7 : 10;
  const flowSeeds = useMemo(
    () =>
      Array.from({ length: flowCount }, (_, index) => ({
        phase: pseudoRandom(index + 30.4),
        speed: MathUtils.lerp(0.08, 0.24, pseudoRandom(index + 41.2)),
        radial: MathUtils.lerp(-0.05, 0.04, pseudoRandom(index + 50.9)),
      })),
    [flowCount]
  );

  useFrame((state) => {
    const leftTube = leftTubeRef.current;
    const rightTube = rightTubeRef.current;
    const leftSheath = leftSheathRef.current;
    const rightSheath = rightSheathRef.current;
    const leftNode = leftNodeRef.current;
    const rightNode = rightNodeRef.current;
    const leftFlow = leftFlowRef.current;
    const rightFlow = rightFlowRef.current;
    if (!leftTube || !rightTube || !leftSheath || !rightSheath || !leftNode || !rightNode || !leftFlow || !rightFlow) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const signal = activityRef.current;
    const visibility = signal.visibility;
    const activity = signal.activity;
    const burst = signal.burst;
    const attract = 0.2 + signal.pulse * 0.55;

    for (let side = 0; side < 2; side += 1) {
      const tube = side === 0 ? leftTube : rightTube;
      const sheath = side === 0 ? leftSheath : rightSheath;
      const node = side === 0 ? leftNode : rightNode;
      const flow = side === 0 ? leftFlow : rightFlow;

      for (let index = 0; index < tubeCount; index += 1) {
        const t0 = index / Math.max(1, tubeCount - 1);
        const t1 = (index + 1) / Math.max(1, tubeCount - 1);
        const pointA = sampleHelixPosition(sample, t0, side as 0 | 1, elapsed, 1.04, profile, 0.17, activity, attract);
        const pointB = sampleHelixPosition(sampleB, t1, side as 0 | 1, elapsed, 1.04, profile, 0.17, activity, attract);
        const depthWeight = clamp((pointA.z + pointB.z + 2.3) / 4.6, 0, 1);
        const parallaxX = pointer.x * MathUtils.lerp(0.05, 0.2, depthWeight);
        const parallaxY = -pointer.y * MathUtils.lerp(0.03, 0.12, depthWeight);

        helper.position.set((pointA.x + pointB.x) * 0.5 + parallaxX, (pointA.y + pointB.y) * 0.5 + parallaxY, (pointA.z + pointB.z) * 0.5);
        direction.copy(pointB).sub(pointA);
        const segmentLength = Math.max(0.001, direction.length());
        helper.quaternion.setFromUnitVectors(yAxis, direction.normalize());
        const radial = MathUtils.lerp(0.017, 0.029, depthWeight) * (1 + Math.sin(elapsed * 1.3 + index * 0.15 + side) * 0.12);
        helper.scale.set(radial, segmentLength, radial);
        helper.updateMatrix();
        tube.setMatrixAt(index, helper.matrix);

        helper.scale.set(radial * 1.8, segmentLength * 1.02, radial * 1.8);
        helper.updateMatrix();
        sheath.setMatrixAt(index, helper.matrix);
      }

      for (let index = 0; index < nodeCount; index += 1) {
        const nodeT = (index / nodeCount + Math.sin(elapsed * 0.17 + index * 0.9 + side) * 0.008 + 1) % 1;
        const nodePoint = sampleHelixPosition(sample, nodeT, side as 0 | 1, elapsed, 1.06, profile, index * 0.37, activity, attract);
        const nodeDepth = clamp((nodePoint.z + 1.25) / 2.4, 0, 1);
        const parallaxX = pointer.x * MathUtils.lerp(0.04, 0.18, nodeDepth);
        const parallaxY = -pointer.y * MathUtils.lerp(0.02, 0.09, nodeDepth);
        const burstWave = Math.exp(-Math.abs(nodeT - signal.burstPhase) * 18) * burst;
        const nodePulse = (Math.sin(elapsed * 1.8 + index * 0.7 + side * 1.9) + 1) * 0.5;
        const nodeScale = MathUtils.lerp(0.028, 0.055, nodePulse * 0.6 + burstWave * 0.9);

        helper.position.set(nodePoint.x + parallaxX, nodePoint.y + parallaxY, nodePoint.z);
        helper.scale.setScalar(nodeScale);
        helper.quaternion.identity();
        helper.updateMatrix();
        node.setMatrixAt(index, helper.matrix);
      }

      for (let index = 0; index < flowCount; index += 1) {
        const seed = flowSeeds[index];
        const directionBias = signal.flowDirection > 0 ? 1 : -1;
        const travel = elapsed * seed.speed * directionBias + seed.phase;
        const t = ((travel + (burst > 0.15 ? burst * 0.2 : 0)) % 1 + 1) % 1;
        const point = sampleHelixPosition(sample, t, side as 0 | 1, elapsed, 0.9 + seed.radial, profile, seed.phase * Math.PI * 2, activity, attract);
        const depthWeight = clamp((point.z + 1.2) / 2.4, 0, 1);
        const parallaxX = pointer.x * MathUtils.lerp(0.04, 0.15, depthWeight);
        const parallaxY = -pointer.y * MathUtils.lerp(0.02, 0.08, depthWeight);
        const burstWave = Math.exp(-Math.abs(t - signal.burstPhase) * 15) * burst;
        const scale = MathUtils.lerp(0.014, 0.026, 0.4 + burstWave);

        helperB.position.set(point.x + parallaxX, point.y + parallaxY, point.z);
        helperB.scale.setScalar(scale);
        helperB.quaternion.identity();
        helperB.updateMatrix();
        flow.setMatrixAt(index, helperB.matrix);
      }

      tube.instanceMatrix.needsUpdate = true;
      sheath.instanceMatrix.needsUpdate = true;
      node.instanceMatrix.needsUpdate = true;
      flow.instanceMatrix.needsUpdate = true;
    }

    const glow = (0.2 + signal.pulse * 0.4 + signal.burst * 0.55) * visibility;
    const leftTubeMaterial = leftTube.material as MeshStandardMaterial;
    const rightTubeMaterial = rightTube.material as MeshStandardMaterial;
    const leftSheathMaterial = leftSheath.material as MeshStandardMaterial;
    const rightSheathMaterial = rightSheath.material as MeshStandardMaterial;
    const leftNodeMaterial = leftNode.material as MeshStandardMaterial;
    const rightNodeMaterial = rightNode.material as MeshStandardMaterial;
    const leftFlowMaterial = leftFlow.material as MeshStandardMaterial;
    const rightFlowMaterial = rightFlow.material as MeshStandardMaterial;
    sampleBioGradient(gradientColor, signal.colorPhase + elapsed * 0.08);

    leftTubeMaterial.color.copy(accentPrimary).lerp(gradientColor, 0.38);
    rightTubeMaterial.color.copy(accentSecondary).lerp(gradientColor, 0.34);
    leftTubeMaterial.emissive.copy(leftTubeMaterial.color);
    rightTubeMaterial.emissive.copy(rightTubeMaterial.color);
    leftTubeMaterial.opacity = MathUtils.lerp(0.28, 0.44, grade.trailOpacityHigh + signal.activity * 0.2) * visibility;
    rightTubeMaterial.opacity = MathUtils.lerp(0.26, 0.42, grade.trailOpacityHigh + signal.activity * 0.2) * visibility;
    leftTubeMaterial.emissiveIntensity = glow;
    rightTubeMaterial.emissiveIntensity = glow * 0.95;

    leftSheathMaterial.color.copy(gradientColor).lerp(accentPrimary, 0.22);
    rightSheathMaterial.color.copy(gradientColor).lerp(accentSecondary, 0.22);
    leftSheathMaterial.emissive.copy(leftSheathMaterial.color);
    rightSheathMaterial.emissive.copy(rightSheathMaterial.color);
    leftSheathMaterial.opacity = (0.08 + signal.activity * 0.12 + signal.burst * 0.14) * visibility;
    rightSheathMaterial.opacity = (0.08 + signal.activity * 0.12 + signal.burst * 0.14) * visibility;
    leftSheathMaterial.emissiveIntensity = (0.34 + signal.activity * 0.8 + signal.burst * 1.1) * visibility;
    rightSheathMaterial.emissiveIntensity = (0.34 + signal.activity * 0.8 + signal.burst * 1.1) * visibility;

    leftNodeMaterial.color.copy(gradientColor).lerp(accentPrimary, 0.28);
    rightNodeMaterial.color.copy(gradientColor).lerp(accentSecondary, 0.28);
    leftNodeMaterial.emissive.copy(leftNodeMaterial.color);
    rightNodeMaterial.emissive.copy(rightNodeMaterial.color);
    leftNodeMaterial.opacity = 0.84 * visibility;
    rightNodeMaterial.opacity = 0.84 * visibility;
    leftNodeMaterial.emissiveIntensity = (0.5 + signal.pulse * 0.9 + signal.burst * 1.3) * visibility;
    rightNodeMaterial.emissiveIntensity = (0.48 + signal.pulse * 0.88 + signal.burst * 1.28) * visibility;

    leftFlowMaterial.color.copy(accentPrimary).lerp(gradientColor, 0.5);
    rightFlowMaterial.color.copy(accentSecondary).lerp(gradientColor, 0.5);
    leftFlowMaterial.emissive.copy(leftFlowMaterial.color);
    rightFlowMaterial.emissive.copy(rightFlowMaterial.color);
    leftFlowMaterial.opacity = 0.7 * visibility;
    rightFlowMaterial.opacity = 0.7 * visibility;
    leftFlowMaterial.emissiveIntensity = (0.72 + signal.activity * 1.1 + signal.burst * 1.6) * visibility;
    rightFlowMaterial.emissiveIntensity = (0.7 + signal.activity * 1.1 + signal.burst * 1.6) * visibility;
  });

  return (
    <group>
      <instancedMesh ref={leftTubeRef} args={[undefined, undefined, tubeCount]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, tubeRadialSegments, 1, true]} />
        <meshPhysicalMaterial
          color={palette.accent}
          emissive={palette.accent}
          transparent
          opacity={0.36}
          roughness={0.14}
          metalness={0.16}
          transmission={0.28}
          thickness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.12}
          emissiveIntensity={0.34}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={rightTubeRef} args={[undefined, undefined, tubeCount]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, tubeRadialSegments, 1, true]} />
        <meshPhysicalMaterial
          color={palette.accent2}
          emissive={palette.accent2}
          transparent
          opacity={0.34}
          roughness={0.14}
          metalness={0.16}
          transmission={0.28}
          thickness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.12}
          emissiveIntensity={0.33}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={leftSheathRef} args={[undefined, undefined, tubeCount]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          transparent
          opacity={0.14}
          roughness={0.26}
          metalness={0.06}
          emissiveIntensity={0.38}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={rightSheathRef} args={[undefined, undefined, tubeCount]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
        <meshStandardMaterial
          color={palette.accent2}
          emissive={palette.accent2}
          transparent
          opacity={0.14}
          roughness={0.26}
          metalness={0.06}
          emissiveIntensity={0.38}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>
      <instancedMesh ref={leftNodeRef} args={[undefined, undefined, nodeCount]} frustumCulled={false}>
        <sphereGeometry args={[1, nodeSegments, nodeSegments]} />
        <meshPhysicalMaterial color={palette.accent} emissive={palette.accent} transparent opacity={0.84} roughness={0.08} metalness={0.14} transmission={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </instancedMesh>
      <instancedMesh ref={rightNodeRef} args={[undefined, undefined, nodeCount]} frustumCulled={false}>
        <sphereGeometry args={[1, nodeSegments, nodeSegments]} />
        <meshPhysicalMaterial color={palette.accent2} emissive={palette.accent2} transparent opacity={0.84} roughness={0.08} metalness={0.14} transmission={0.3} clearcoat={1} clearcoatRoughness={0.1} />
      </instancedMesh>
      <instancedMesh ref={leftFlowRef} args={[undefined, undefined, flowCount]} frustumCulled={false}>
        <sphereGeometry args={[1, flowSegments, flowSegments]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} transparent opacity={0.7} roughness={0.1} metalness={0.06} depthWrite={false} blending={AdditiveBlending} />
      </instancedMesh>
      <instancedMesh ref={rightFlowRef} args={[undefined, undefined, flowCount]} frustumCulled={false}>
        <sphereGeometry args={[1, flowSegments, flowSegments]} />
        <meshStandardMaterial color={palette.accent2} emissive={palette.accent2} transparent opacity={0.7} roughness={0.1} metalness={0.06} depthWrite={false} blending={AdditiveBlending} />
      </instancedMesh>
    </group>
  );
}

function DnaBasePairs({
  pointerRef,
  profile,
  palette,
  grade,
  activityRef,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  grade: ThemeColorGrade;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const pairCount = Math.max(10, Math.round(DNA_VISUAL_CONFIG.pairCount * performanceScale));
  const capSegments = performanceScale < 0.75 ? 8 : 10;
  const pairRefs = useRef<Array<Group | null>>([]);
  const left = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const xAxis = useMemo(() => new Vector3(1, 0, 0), []);
  const targetQuat = useMemo(() => new Quaternion(), []);
  const pairColorStops = useMemo(() => {
    const c1 = new Color(palette.accent);
    const c2 = new Color(palette.accent2);
    return Array.from({ length: pairCount }, (_, index) => {
      const t = index / Math.max(1, pairCount - 1);
      return c1.clone().lerp(c2, t * 0.9 + 0.05);
    });
  }, [palette.accent, palette.accent2, pairCount]);
  const pairHighlight = useMemo(() => new Color(palette.foreground), [palette.foreground]);

  const pairSeeds = useMemo(() => {
    return Array.from({ length: pairCount }, (_, index) => ({
      phase: index * 0.47 + pseudoRandom(index + 11.3) * 1.4,
      drift: pseudoRandom(index + 21.7) * 0.03 + 0.015,
    }));
  }, [pairCount]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const signal = activityRef.current;
    const sceneVisibility = signal.visibility;

    for (let index = 0; index < pairCount; index += 1) {
      const group = pairRefs.current[index];
      if (!group) {
        continue;
      }

      const seed = pairSeeds[index];
      const t = (index / pairCount + Math.sin(elapsed * seed.drift + seed.phase) * 0.008 + 1) % 1;

      sampleHelixPosition(left, t, 0, elapsed, 1.02, profile, seed.phase, signal.activity, 0.2 + signal.pulse * 0.4);
      sampleHelixPosition(right, t, 1, elapsed, 1.02, profile, seed.phase, signal.activity, 0.2 + signal.pulse * 0.4);

      const depthWeight = clamp(((left.z + right.z) * 0.5 + 1.2) / 2.4, 0, 1);
      const parallaxX = pointer.x * MathUtils.lerp(0.04, 0.17, depthWeight);
      const parallaxY = -pointer.y * MathUtils.lerp(0.025, 0.09, depthWeight);
      const centerFalloff = 1 - Math.min(1, Math.abs((left.y + right.y) * 0.5) / 3.9);
      const spherePull = centerFalloff * (0.07 + signal.pulse * 0.28);

      const targetX = (left.x + right.x) * 0.5 + parallaxX - ((left.x + right.x) * 0.5) * spherePull;
      const targetY = (left.y + right.y) * 0.5 + parallaxY;
      const targetZ = (left.z + right.z) * 0.5 - ((left.z + right.z) * 0.5) * spherePull * 0.6;
      group.position.x = MathUtils.damp(group.position.x, targetX, 8, delta);
      group.position.y = MathUtils.damp(group.position.y, targetY, 8, delta);
      group.position.z = MathUtils.damp(group.position.z, targetZ, 8, delta);

      direction.copy(right).sub(left);
      const length = Math.max(0.14, direction.length());
      targetQuat.setFromUnitVectors(xAxis, direction.normalize());
      group.quaternion.slerp(targetQuat, 1 - Math.exp(-delta * 9));

      const pulse = (Math.sin(elapsed * (1.15 + profile.motionIntensity * 0.28) + seed.phase) + 1) * 0.5;
      const burstWave = Math.exp(-Math.abs(t - signal.burstPhase) * 13) * signal.burst;
      const response = clamp(pulse * 0.7 + burstWave * 1.15 + signal.pulse * 0.45, 0, 1.8);
      const thickness = MathUtils.lerp(0.01, 0.036, response);

      const rod = group.children[0] as Mesh;
      const startCap = group.children[1] as Mesh;
      const endCap = group.children[2] as Mesh;

      rod.scale.set(length, thickness, thickness);
      startCap.position.set(-length * 0.5, 0, 0);
      endCap.position.set(length * 0.5, 0, 0);

      const rodMaterial = rod.material as MeshStandardMaterial;
      const capStartMaterial = startCap.material as MeshStandardMaterial;
      const capEndMaterial = endCap.material as MeshStandardMaterial;
      const emissiveStrength = MathUtils.lerp(0.18, 0.84, response);
      const phaseTint = pairColorStops[index];
      sampleBioGradient(rodMaterial.color, signal.colorPhase + t * 1.4);
      rodMaterial.color.lerp(phaseTint, 0.4);
      rodMaterial.emissive.copy(phaseTint);
      capStartMaterial.color.copy(phaseTint).lerp(pairHighlight, 0.2 + signal.pulse * 0.14);
      capEndMaterial.color.copy(phaseTint).lerp(pairHighlight, 0.2 + signal.pulse * 0.14);
      capStartMaterial.emissive.copy(capStartMaterial.color);
      capEndMaterial.emissive.copy(capEndMaterial.color);
      rodMaterial.emissiveIntensity = emissiveStrength * sceneVisibility;
      capStartMaterial.emissiveIntensity = emissiveStrength * 1.1 * sceneVisibility;
      capEndMaterial.emissiveIntensity = emissiveStrength * 1.1 * sceneVisibility;
      rodMaterial.opacity = MathUtils.lerp(0.34, 0.66, clamp(response * 0.7, 0, 1)) * sceneVisibility;
      capStartMaterial.opacity = 0.8 * sceneVisibility;
      capEndMaterial.opacity = 0.8 * sceneVisibility;

      const dynamicConnection = 0.6 + Math.sin(elapsed * (0.22 + seed.drift) + seed.phase) * 0.2;
      const connectionStrength = clamp(dynamicConnection + signal.activity * 0.2 + burstWave * 0.5, 0.3, 1.2) * sceneVisibility;
      group.scale.y = MathUtils.damp(group.scale.y, connectionStrength, 7.2, delta);
      group.scale.z = MathUtils.damp(group.scale.z, connectionStrength, 7.2, delta);
    }
  });

  return (
    <group>
      {Array.from({ length: pairCount }, (_, index) => (
        <group key={`dna-pair-${index}`} ref={(node) => { pairRefs.current[index] = node; }}>
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color={grade.edgeTint}
              transparent
              opacity={0.46}
              roughness={0.26}
              metalness={0.18}
              emissive={grade.edgeTint}
              emissiveIntensity={0.34}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.04, capSegments, capSegments]} />
            <meshStandardMaterial
              color={palette.accent}
              emissive={palette.accent}
              emissiveIntensity={0.38}
              transparent
              opacity={0.8}
              roughness={0.16}
              metalness={0.12}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.04, capSegments, capSegments]} />
            <meshStandardMaterial
              color={palette.accent2}
              emissive={palette.accent2}
              emissiveIntensity={0.38}
              transparent
              opacity={0.8}
              roughness={0.16}
              metalness={0.12}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DnaFlowParticles({
  pointerRef,
  profile,
  palette,
  grade,
  activityRef,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  grade: ThemeColorGrade;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const baseCount = DNA_VISUAL_CONFIG.flowCount + profile.particleCount;
  const count = Math.max(28, Math.round(baseCount * performanceScale));
  const positionRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const sample = useMemo(() => new Vector3(), []);

  const seeds = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const r1 = pseudoRandom(index + 3.4);
      const r2 = pseudoRandom(index + 8.7);
      const r3 = pseudoRandom(index + 15.1);
      const r4 = pseudoRandom(index + 21.9);
      const r5 = pseudoRandom(index + 29.3);
      const r6 = pseudoRandom(index + 39.8);
      const r7 = pseudoRandom(index + 43.6);
      return {
        phase: r1 * Math.PI * 2,
        speed: r2 > 0.25 ? MathUtils.lerp(0.04, 0.1, r3) : -MathUtils.lerp(0.03, 0.08, r3),
        radiusOffset: MathUtils.lerp(-0.22, 0.18, r4),
        lane: (r5 > 0.5 ? 0 : 1) as 0 | 1,
        jitter: MathUtils.lerp(-0.08, 0.08, pseudoRandom(index + 34.8)),
        orbit: r6 > 0.74,
        orbitRadius: MathUtils.lerp(0.62, 1.44, r7),
        absorbPhase: pseudoRandom(index + 53.7),
      };
    });
  }, [count]);

  useFrame((state) => {
    const attribute = positionRef.current;
    if (!attribute) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const signal = activityRef.current;
    const visibility = signal.visibility;
    const array = attribute.array as Float32Array;

    for (let index = 0; index < count; index += 1) {
      const seed = seeds[index];
      if (seed.orbit) {
        const orbitTurn = elapsed * (0.24 + Math.abs(seed.speed)) + seed.phase;
        const absorbCycle = (elapsed * 0.09 + seed.absorbPhase) % 1;
        const absorbStrength = smoothstep(0.68, 0.93, absorbCycle);
        const radius = MathUtils.lerp(seed.orbitRadius, 0.16, absorbStrength);
        const orbitY = Math.sin(orbitTurn * 1.8 + seed.phase) * 0.44 + seed.jitter * 0.2;
        array[index * 3] = Math.cos(orbitTurn) * radius + pointer.x * 0.04;
        array[index * 3 + 1] = orbitY - pointer.y * 0.04;
        array[index * 3 + 2] = Math.sin(orbitTurn * 1.3 + seed.phase) * radius * 0.8;
        continue;
      }

      const burstBoost = signal.burst > 0.12 ? Math.sign(seed.speed) * signal.burst * 0.45 : 0;
      const direction = signal.flowDirection > 0 ? 1 : -1;
      const t = ((seed.phase + elapsed * (seed.speed * direction + burstBoost)) % 1 + 1) % 1;
      const point = sampleHelixPosition(sample, t, seed.lane, elapsed, 0.72 + seed.radiusOffset, profile, seed.phase, signal.activity, 0.18 + signal.pulse * 0.45);
      const depthWeight = clamp((point.z + 1.15) / 2.3, 0, 1);
      const parallaxX = pointer.x * MathUtils.lerp(0.02, 0.12, depthWeight);
      const parallaxY = -pointer.y * MathUtils.lerp(0.015, 0.06, depthWeight);

      array[index * 3] = point.x + parallaxX + Math.sin(elapsed * 1.8 + seed.phase) * 0.02;
      array[index * 3 + 1] = point.y + parallaxY + seed.jitter;
      array[index * 3 + 2] = point.z + Math.cos(elapsed * 1.4 + seed.phase) * 0.035;
    }

    attribute.needsUpdate = true;

    const material = materialRef.current;
    if (material) {
      const breathe = (Math.sin(elapsed * 0.7) + 1) * 0.5;
      material.opacity = MathUtils.lerp(0.2, 0.48, breathe + signal.activity * 0.25 + signal.burst * 0.35) * MathUtils.lerp(0.9, 1.06, grade.trailOpacityHigh) * visibility;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute ref={positionRef} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={palette.foreground}
        size={MathUtils.lerp(0.058, 0.072, 1 - performanceScale)}
        sizeAttenuation
        depthWrite={false}
        blending={AdditiveBlending}
        transparent
        opacity={0.4}
      />
    </points>
  );
}

function DnaSphereLinks({
  pointerRef,
  profile,
  palette,
  activityRef,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const linkCount = Math.max(5, Math.round(8 * performanceScale));
  const pulseSegments = performanceScale < 0.75 ? 8 : 10;
  const linkRefs = useRef<Array<Group | null>>([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: linkCount }, (_, index) => ({
        side: (index % 2) as 0 | 1,
        t: MathUtils.lerp(0.18, 0.82, pseudoRandom(index + 201.4)),
        offset: pseudoRandom(index + 213.2) * Math.PI * 2,
        speed: MathUtils.lerp(0.4, 0.9, pseudoRandom(index + 221.1)),
      })),
    [linkCount]
  );
  const left = useMemo(() => new Vector3(), []);
  const right = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const yAxis = useMemo(() => new Vector3(0, 1, 0), []);
  const targetQuat = useMemo(() => new Quaternion(), []);
  const bridgeColor = useMemo(() => new Color(), []);
  const accentColor = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accent2Color = useMemo(() => new Color(palette.accent2), [palette.accent2]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const signal = activityRef.current;
    const visibility = signal.visibility;

    for (let index = 0; index < linkCount; index += 1) {
      const group = linkRefs.current[index];
      if (!group) {
        continue;
      }

      const seed = seeds[index];
      const anchorT = (seed.t + Math.sin(elapsed * 0.16 + seed.offset) * 0.012 + 1) % 1;
      sampleHelixPosition(left, anchorT, seed.side, elapsed, 1.02, profile, seed.offset, signal.activity, 0.22 + signal.pulse * 0.46);

      const sphereAngle = elapsed * 0.23 * (seed.side === 0 ? 1 : -1) + seed.offset;
      right.set(
        Math.cos(sphereAngle) * 0.42,
        Math.sin(elapsed * 0.35 + seed.offset) * 0.36,
        Math.sin(sphereAngle) * 0.34
      );

      const depthWeight = clamp((left.z + 1.2) / 2.4, 0, 1);
      const parallaxX = pointer.x * MathUtils.lerp(0.03, 0.11, depthWeight);
      const parallaxY = -pointer.y * MathUtils.lerp(0.02, 0.07, depthWeight);

      direction.copy(left).sub(right);
      const length = Math.max(0.1, direction.length());
      targetQuat.setFromUnitVectors(yAxis, direction.normalize());
      group.position.x = MathUtils.damp(group.position.x, (left.x + right.x) * 0.5 + parallaxX, 7.8, delta);
      group.position.y = MathUtils.damp(group.position.y, (left.y + right.y) * 0.5 + parallaxY, 7.8, delta);
      group.position.z = MathUtils.damp(group.position.z, (left.z + right.z) * 0.5, 7.8, delta);
      group.quaternion.slerp(targetQuat, 1 - Math.exp(-delta * 10));

      const rod = group.children[0] as Mesh;
      const pulse = group.children[1] as Mesh;
      const rodMaterial = rod.material as MeshStandardMaterial;
      const pulseMaterial = pulse.material as MeshStandardMaterial;
      const propagation = Math.exp(-Math.abs(anchorT - signal.burstPhase) * 14) * signal.burst;
      const oscillation = (Math.sin(elapsed * seed.speed + seed.offset) + 1) * 0.5;
      const response = clamp(oscillation * 0.6 + signal.pulse * 0.5 + propagation, 0, 1.8);
      sampleBioGradient(bridgeColor, signal.colorPhase + anchorT * 1.6);

      const rodRadius = MathUtils.lerp(0.006, 0.026, response);
      rod.scale.set(rodRadius, length, rodRadius);
      rodMaterial.color.copy(bridgeColor).lerp(accentColor, 0.32);
      rodMaterial.emissive.copy(rodMaterial.color);
      rodMaterial.opacity = MathUtils.lerp(0.24, 0.68, response) * visibility;
      rodMaterial.emissiveIntensity = MathUtils.lerp(0.2, 1.1, response) * visibility;

      const travel = ((elapsed * 0.2 * (signal.flowDirection > 0 ? 1 : -1) + seed.offset / Math.PI) % 1 + 1) % 1;
      pulse.position.x = MathUtils.lerp(-length * 0.5, length * 0.5, travel);
      pulse.scale.setScalar(MathUtils.lerp(0.02, 0.045, response));
      pulseMaterial.color.copy(bridgeColor).lerp(accent2Color, 0.26);
      pulseMaterial.emissive.copy(pulseMaterial.color);
      pulseMaterial.opacity = 0.9 * visibility;
      pulseMaterial.emissiveIntensity = (0.6 + response * 1.2) * visibility;
    }
  });

  return (
    <group>
      {Array.from({ length: linkCount }, (_, index) => (
        <group key={`dna-link-${index}`} ref={(node) => { linkRefs.current[index] = node; }}>
          <mesh>
            <cylinderGeometry args={[1, 1, 1, 8, 1, true]} />
            <meshStandardMaterial
              color={palette.accent}
              emissive={palette.accent2}
              transparent
              opacity={0.42}
              roughness={0.18}
              metalness={0.06}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[1, pulseSegments, pulseSegments]} />
            <meshStandardMaterial color={palette.accent2} emissive={palette.accent2} emissiveIntensity={0.8} transparent opacity={0.9} roughness={0.1} metalness={0.08} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DnaCoreSphere({
  palette,
  profile,
  activityRef,
  performanceScale,
}: {
  palette: ThemePalette;
  profile: ThemeMotionProfile;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Mesh>(null);
  const shellRef = useRef<Mesh>(null);
  const shellOuterRef = useRef<Mesh>(null);
  const swirlRef = useRef<Mesh>(null);
  const crownRef = useRef<Mesh>(null);
  const auraRef = useRef<Mesh>(null);
  const pulseLightRef = useRef<Object3D>(null);
  const rimLightRef = useRef<Object3D>(null);
  const tmpColor = useMemo(() => new Color(), []);
  const accentColor = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accent2Color = useMemo(() => new Color(palette.accent2), [palette.accent2]);
  const foregroundColor = useMemo(() => new Color(palette.foreground), [palette.foreground]);
  const sphereDetail = performanceScale < 0.75 ? 24 : 34;
  const shellDetail = performanceScale < 0.75 ? 28 : 40;
  const knotTubular = performanceScale < 0.75 ? 80 : 128;

  useFrame((state, delta) => {
    const group = groupRef.current;
    const inner = innerRef.current;
    const shell = shellRef.current;
    const shellOuter = shellOuterRef.current;
    const swirl = swirlRef.current;
    const crown = crownRef.current;
    const aura = auraRef.current;
    const pulseLight = pulseLightRef.current as { intensity?: number } | null;
    const rimLight = rimLightRef.current as { intensity?: number } | null;
    if (!group || !inner || !shell || !shellOuter || !swirl || !crown || !aura) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const signal = activityRef.current;
    const pulse = signal.pulse;
    const burst = signal.burst;
    const activity = signal.activity;
    const visibility = signal.visibility;

    group.rotation.y = MathUtils.damp(group.rotation.y, elapsed * 0.22, 2.4, delta);
    group.rotation.x = MathUtils.damp(group.rotation.x, Math.sin(elapsed * 0.2) * 0.12, 2.2, delta);
    swirl.rotation.y = MathUtils.damp(swirl.rotation.y, -elapsed * (0.65 + profile.motionIntensity * 0.16), 4, delta);
    swirl.rotation.z = MathUtils.damp(swirl.rotation.z, elapsed * 0.24, 3.4, delta);
    crown.rotation.x = MathUtils.damp(crown.rotation.x, Math.sin(elapsed * 0.34) * 0.2, 2.8, delta);
    crown.rotation.y = MathUtils.damp(crown.rotation.y, elapsed * 0.48, 3.1, delta);

    const innerMaterial = inner.material as MeshStandardMaterial;
    const shellMaterial = shell.material as MeshStandardMaterial;
    const shellOuterMaterial = shellOuter.material as MeshStandardMaterial;
    const swirlMaterial = swirl.material as MeshStandardMaterial;
    const crownMaterial = crown.material as MeshStandardMaterial;
    const auraMaterial = aura.material as MeshStandardMaterial;

    sampleBioGradient(tmpColor, signal.colorPhase + elapsed * 0.09);
    innerMaterial.color.copy(tmpColor).lerp(accentColor, 0.3);
    shellMaterial.color.copy(foregroundColor).lerp(tmpColor, 0.35);
    shellOuterMaterial.color.copy(tmpColor).lerp(foregroundColor, 0.42);
    swirlMaterial.color.copy(accent2Color).lerp(tmpColor, 0.45);
    crownMaterial.color.copy(tmpColor).lerp(accentColor, 0.36);
    auraMaterial.color.copy(tmpColor).lerp(accentColor, 0.5);

    innerMaterial.emissive.copy(innerMaterial.color);
    shellMaterial.emissive.copy(shellMaterial.color);
    shellOuterMaterial.emissive.copy(shellOuterMaterial.color);
    swirlMaterial.emissive.copy(swirlMaterial.color);
    crownMaterial.emissive.copy(crownMaterial.color);
    auraMaterial.emissive.copy(auraMaterial.color);

    innerMaterial.emissiveIntensity = (0.9 + pulse * 1.2 + burst * 1.8) * visibility;
    shellMaterial.emissiveIntensity = (0.24 + pulse * 0.5) * visibility;
    shellOuterMaterial.emissiveIntensity = (0.22 + pulse * 0.54 + burst * 0.74) * visibility;
    swirlMaterial.emissiveIntensity = (0.56 + activity * 0.9 + burst * 1.1) * visibility;
    crownMaterial.emissiveIntensity = (0.46 + activity * 0.8 + burst * 1.36) * visibility;
    auraMaterial.emissiveIntensity = (0.26 + pulse * 0.64 + burst * 0.9) * visibility;

    shellMaterial.opacity = 0.4 * visibility;
    shellOuterMaterial.opacity = 0.16 * visibility;
    swirlMaterial.opacity = 0.52 * visibility;
    crownMaterial.opacity = 0.22 * visibility;
    auraMaterial.opacity = 0.2 * visibility;

    inner.scale.x = MathUtils.damp(inner.scale.x, MathUtils.lerp(0.92, 1.14, pulse + burst * 0.35), 4.2, delta);
    inner.scale.y = MathUtils.damp(inner.scale.y, MathUtils.lerp(0.9, 1.16, pulse + burst * 0.35), 4.2, delta);
    inner.scale.z = MathUtils.damp(inner.scale.z, MathUtils.lerp(0.9, 1.12, pulse + burst * 0.35), 4.2, delta);

    shell.scale.x = MathUtils.damp(shell.scale.x, MathUtils.lerp(1.08, 1.18, pulse), 3.6, delta);
    shell.scale.y = MathUtils.damp(shell.scale.y, MathUtils.lerp(1.08, 1.22, pulse), 3.6, delta);
    shell.scale.z = MathUtils.damp(shell.scale.z, MathUtils.lerp(1.08, 1.2, pulse), 3.6, delta);
    shellOuter.scale.x = MathUtils.damp(shellOuter.scale.x, MathUtils.lerp(1.18, 1.36, pulse + burst * 0.3), 3.1, delta);
    shellOuter.scale.y = MathUtils.damp(shellOuter.scale.y, MathUtils.lerp(1.18, 1.38, pulse + burst * 0.3), 3.1, delta);
    shellOuter.scale.z = MathUtils.damp(shellOuter.scale.z, MathUtils.lerp(1.18, 1.34, pulse + burst * 0.3), 3.1, delta);
    aura.scale.setScalar(MathUtils.lerp(1.22, 1.46, pulse + burst * 0.35));
    crown.scale.setScalar(MathUtils.lerp(0.84, 1.05, activity + burst * 0.4));

    if (pulseLight && typeof pulseLight.intensity === "number") {
      pulseLight.intensity = (1.1 + pulse * 2 + burst * 2.6) * visibility;
    }
    if (rimLight && typeof rimLight.intensity === "number") {
      rimLight.intensity = (0.48 + activity * 0.9 + burst * 1.4) * visibility;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.5, sphereDetail, sphereDetail]} />
        <meshStandardMaterial color={palette.accent} emissive={palette.accent} roughness={0.14} metalness={0.24} />
      </mesh>
      <mesh ref={swirlRef}>
        <torusKnotGeometry args={[0.28, 0.08, knotTubular, 16, 2, 3]} />
        <meshStandardMaterial
          color={palette.accent2}
          emissive={palette.accent2}
          emissiveIntensity={0.84}
          transparent
          opacity={0.52}
          roughness={0.16}
          metalness={0.12}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh ref={shellRef}>
        <sphereGeometry args={[0.72, shellDetail, shellDetail]} />
        <meshPhysicalMaterial
          color={palette.foreground}
          emissive={palette.accent}
          transparent
          opacity={0.4}
          roughness={0.05}
          metalness={0.18}
          transmission={0.98}
          ior={1.36}
          thickness={0.72}
          attenuationDistance={0.45}
          attenuationColor={palette.accent}
          iridescence={0.7}
          iridescenceIOR={1.18}
          iridescenceThicknessRange={[120, 420]}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </mesh>
      <mesh ref={shellOuterRef}>
        <sphereGeometry args={[0.78, sphereDetail, sphereDetail]} />
        <meshPhysicalMaterial
          color={palette.foreground}
          emissive={palette.accent2}
          transparent
          opacity={0.16}
          roughness={0.18}
          metalness={0.14}
          transmission={0.9}
          ior={1.25}
          thickness={0.38}
          iridescence={0.92}
          iridescenceIOR={1.24}
          iridescenceThicknessRange={[180, 560]}
          clearcoat={1}
          clearcoatRoughness={0.1}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={auraRef}>
        <sphereGeometry args={[0.94, Math.max(20, sphereDetail - 6), Math.max(20, sphereDetail - 6)]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={0.5}
          transparent
          opacity={0.2}
          roughness={0.5}
          metalness={0.03}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={crownRef}>
        <icosahedronGeometry args={[0.64, 1]} />
        <meshStandardMaterial
          color={palette.accent}
          emissive={palette.accent}
          emissiveIntensity={0.75}
          transparent
          opacity={0.22}
          wireframe
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight ref={pulseLightRef} position={[0, 0, 0]} intensity={2.1} color={palette.accent} distance={6.6} decay={2} />
      <pointLight ref={rimLightRef} position={[0.78, 0.38, 0.64]} intensity={0.62} color={palette.accent2} distance={4.8} decay={2} />
    </group>
  );
}

function DnaCoreOrbitRings({
  palette,
  activityRef,
  performanceScale,
}: {
  palette: ThemePalette;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const groupRef = useRef<Group>(null);
  const ringARef = useRef<Mesh>(null);
  const ringBRef = useRef<Mesh>(null);
  const ringCRef = useRef<Mesh>(null);
  const colorA = useMemo(() => new Color(), []);
  const colorB = useMemo(() => new Color(), []);
  const accentColor = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accent2Color = useMemo(() => new Color(palette.accent2), [palette.accent2]);
  const ringDetailA = performanceScale < 0.75 ? 84 : 132;
  const ringDetailB = performanceScale < 0.75 ? 72 : 112;
  const ringDetailC = performanceScale < 0.75 ? 64 : 96;

  useFrame((state, delta) => {
    const group = groupRef.current;
    const ringA = ringARef.current;
    const ringB = ringBRef.current;
    const ringC = ringCRef.current;
    if (!group || !ringA || !ringB || !ringC) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const signal = activityRef.current;
    const energy = signal.activity;
    const visibility = signal.visibility;

    group.rotation.y = MathUtils.damp(group.rotation.y, elapsed * 0.16, 2.2, delta);
    ringA.rotation.y = MathUtils.damp(ringA.rotation.y, elapsed * 0.38, 3.1, delta);
    ringB.rotation.y = MathUtils.damp(ringB.rotation.y, -elapsed * 0.31, 3.1, delta);
    ringC.rotation.z = MathUtils.damp(ringC.rotation.z, elapsed * 0.44, 3.1, delta);

    const matA = ringA.material as MeshStandardMaterial;
    const matB = ringB.material as MeshStandardMaterial;
    const matC = ringC.material as MeshStandardMaterial;
    sampleBioGradient(colorA, signal.colorPhase + elapsed * 0.08);
    sampleBioGradient(colorB, signal.colorPhase + 1.2 + elapsed * 0.06);

    matA.color.copy(colorA).lerp(accentColor, 0.3);
    matB.color.copy(colorB).lerp(accent2Color, 0.32);
    matC.color.copy(colorA).lerp(colorB, 0.5);
    matA.emissive.copy(matA.color);
    matB.emissive.copy(matB.color);
    matC.emissive.copy(matC.color);

    const wave = 0.5 + Math.sin(elapsed * 2.2 + signal.burstPhase * Math.PI * 2) * 0.5;
    matA.opacity = MathUtils.lerp(0.12, 0.28, wave + energy * 0.35) * visibility;
    matB.opacity = MathUtils.lerp(0.1, 0.24, wave * 0.8 + energy * 0.28) * visibility;
    matC.opacity = MathUtils.lerp(0.08, 0.2, wave * 0.7 + energy * 0.24) * visibility;
    matA.emissiveIntensity = (0.36 + energy * 0.95 + signal.burst * 1.12) * visibility;
    matB.emissiveIntensity = (0.3 + energy * 0.88 + signal.burst * 1.06) * visibility;
    matC.emissiveIntensity = (0.26 + energy * 0.8 + signal.burst * 0.92) * visibility;

    ringA.scale.setScalar(MathUtils.lerp(1, 1.14, signal.pulse + signal.burst * 0.25));
    ringB.scale.setScalar(MathUtils.lerp(0.96, 1.08, signal.pulse + signal.burst * 0.2));
    ringC.scale.setScalar(MathUtils.lerp(0.92, 1.02, signal.pulse + signal.burst * 0.18));
  });

  return (
    <group ref={groupRef}>
      <mesh ref={ringARef} rotation={[Math.PI * 0.5, 0, 0]}>
        <torusGeometry args={[1.04, 0.016, 14, ringDetailA]} />
        <meshStandardMaterial transparent opacity={0.2} roughness={0.22} metalness={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ringBRef} rotation={[Math.PI * 0.5, Math.PI * 0.32, Math.PI * 0.12]}>
        <torusGeometry args={[0.88, 0.013, 14, ringDetailB]} />
        <meshStandardMaterial transparent opacity={0.16} roughness={0.24} metalness={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={ringCRef} rotation={[Math.PI * 0.5, -Math.PI * 0.22, -Math.PI * 0.12]}>
        <torusGeometry args={[0.72, 0.01, 12, ringDetailC]} />
        <meshStandardMaterial transparent opacity={0.12} roughness={0.26} metalness={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function DnaHelixBorderAura({
  palette,
  activityRef,
  performanceScale,
}: {
  palette: ThemePalette;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const rootRef = useRef<Group>(null);
  const borderRef = useRef<Mesh>(null);
  const sweepRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const cA = useMemo(() => new Color(), []);
  const cB = useMemo(() => new Color(), []);
  const accent = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accent2 = useMemo(() => new Color(palette.accent2), [palette.accent2]);
  const borderSegments = performanceScale < 0.75 ? 92 : 150;
  const innerSegments = performanceScale < 0.75 ? 84 : 128;
  const sweepSegments = performanceScale < 0.75 ? 72 : 96;

  useFrame((state, delta) => {
    const root = rootRef.current;
    const border = borderRef.current;
    const sweep = sweepRef.current;
    const inner = innerRef.current;
    if (!root || !border || !sweep || !inner) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const signal = activityRef.current;
    const visibility = signal.visibility;

    root.rotation.z = MathUtils.damp(root.rotation.z, Math.sin(elapsed * 0.18) * 0.09, 2.1, delta);
    border.rotation.y = MathUtils.damp(border.rotation.y, elapsed * 0.16, 2.8, delta);
    sweep.rotation.y = MathUtils.damp(sweep.rotation.y, elapsed * 0.52, 3.6, delta);
    inner.rotation.y = MathUtils.damp(inner.rotation.y, -elapsed * 0.28, 3.2, delta);

    const borderMat = border.material as MeshStandardMaterial;
    const sweepMat = sweep.material as MeshStandardMaterial;
    const innerMat = inner.material as MeshStandardMaterial;

    sampleBioGradient(cA, signal.colorPhase + elapsed * 0.05);
    sampleBioGradient(cB, signal.colorPhase + 1.5 + elapsed * 0.04);

    borderMat.color.copy(cA).lerp(accent, 0.3);
    sweepMat.color.copy(cB).lerp(accent2, 0.35);
    innerMat.color.copy(cA).lerp(cB, 0.5);
    borderMat.emissive.copy(borderMat.color);
    sweepMat.emissive.copy(sweepMat.color);
    innerMat.emissive.copy(innerMat.color);

    const energy = signal.activity + signal.burst * 0.5;
    borderMat.opacity = MathUtils.lerp(0.06, 0.2, signal.pulse + energy * 0.3) * visibility;
    sweepMat.opacity = MathUtils.lerp(0.08, 0.28, signal.pulse + energy * 0.38) * visibility;
    innerMat.opacity = MathUtils.lerp(0.04, 0.16, signal.pulse + energy * 0.25) * visibility;
    borderMat.emissiveIntensity = (0.25 + energy * 0.9) * visibility;
    sweepMat.emissiveIntensity = (0.36 + energy * 1.1) * visibility;
    innerMat.emissiveIntensity = (0.2 + energy * 0.7) * visibility;
  });

  return (
    <group ref={rootRef} rotation={[Math.PI * 0.5, 0, 0]}>
      <mesh ref={borderRef} scale={[1, 1.52, 1]}>
        <torusGeometry args={[2.62, 0.016, 14, borderSegments]} />
        <meshStandardMaterial transparent opacity={0.14} roughness={0.2} metalness={0.08} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={innerRef} scale={[1, 1.36, 1]}>
        <torusGeometry args={[2.44, 0.01, 10, innerSegments]} />
        <meshStandardMaterial transparent opacity={0.1} roughness={0.24} metalness={0.06} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={sweepRef} scale={[1, 1.48, 1]}>
        <torusGeometry args={[2.58, 0.014, 10, sweepSegments, Math.PI * 1.16]} />
        <meshStandardMaterial transparent opacity={0.18} roughness={0.18} metalness={0.08} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

function DnaDustField({
  pointerRef,
  palette,
  activityRef,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  palette: ThemePalette;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const count = Math.max(24, Math.round(54 * performanceScale));
  const attributeRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  const seeds = useMemo(() => {
    return Array.from({ length: count }, (_, index) => ({
      angle: pseudoRandom(index + 90.1) * Math.PI * 2,
      radius: MathUtils.lerp(0.9, 2.2, pseudoRandom(index + 99.7)),
      y: MathUtils.lerp(-3.2, 3.2, pseudoRandom(index + 111.2)),
      drift: MathUtils.lerp(0.02, 0.06, pseudoRandom(index + 121.6)),
      depth: MathUtils.lerp(-1.4, 1.2, pseudoRandom(index + 131.4)),
    }));
  }, [count]);

  useFrame((state) => {
    const attribute = attributeRef.current;
    if (!attribute) {
      return;
    }

    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const signal = activityRef.current;
    const array = attribute.array as Float32Array;

    for (let index = 0; index < count; index += 1) {
      const seed = seeds[index];
      const driftAngle = seed.angle + elapsed * seed.drift;
      const depthWeight = clamp((seed.depth + 1.5) / 2.7, 0, 1);

      array[index * 3] = Math.cos(driftAngle) * seed.radius + pointer.x * MathUtils.lerp(0.02, 0.08, depthWeight);
      array[index * 3 + 1] = seed.y + Math.sin(elapsed * 0.35 + seed.angle) * 0.22;
      array[index * 3 + 2] = seed.depth + Math.cos(driftAngle * 0.7) * 0.14;
    }

    attribute.needsUpdate = true;

    const material = materialRef.current;
    if (material) {
      material.opacity = (0.1 + (Math.sin(elapsed * 0.42) + 1) * 0.06) * signal.visibility;
    }
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute ref={attributeRef} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={palette.accent2}
        size={MathUtils.lerp(0.068, 0.078, 1 - performanceScale)}
        sizeAttenuation
        depthWrite={false}
        transparent
        opacity={0.14}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function DnaShadowGradient({
  profile,
  palette,
  pointerRef,
  activityRef,
  performanceScale,
}: {
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  activityRef: MutableRefObject<DnaActivitySignal>;
  performanceScale: number;
}) {
  const shadowCoreRef = useRef<Mesh>(null)
  const shadowOuterRef = useRef<Mesh>(null)
  const shadowSweepRef = useRef<Mesh>(null)
  const tintA = useMemo(() => new Color(palette.accent), [palette.accent])
  const tintB = useMemo(() => new Color(palette.accent2), [palette.accent2])
  const discSegments = performanceScale < 0.75 ? 32 : 48
  const ringSegments = performanceScale < 0.75 ? 40 : 56

  useFrame((state, delta) => {
    const shadowCore = shadowCoreRef.current
    const shadowOuter = shadowOuterRef.current
    const shadowSweep = shadowSweepRef.current
    if (!shadowCore || !shadowOuter || !shadowSweep) {
      return
    }

    const elapsed = state.clock.getElapsedTime()
    const pointer = pointerRef.current
    const visibility = activityRef.current.visibility
    const breathe = (Math.sin(elapsed * (0.35 + profile.motionIntensity * 0.08)) + 1) * 0.5
    const targetX = pointer.x * 0.22
    const targetY = -3.46 + Math.sin(elapsed * 0.16) * 0.08

    shadowCore.position.x = MathUtils.damp(shadowCore.position.x, targetX, 2.2, delta)
    shadowCore.position.y = MathUtils.damp(shadowCore.position.y, targetY, 2.2, delta)
    shadowOuter.position.x = MathUtils.damp(shadowOuter.position.x, targetX * 0.82, 2, delta)
    shadowOuter.position.y = MathUtils.damp(shadowOuter.position.y, targetY - 0.04, 2, delta)
    shadowSweep.position.x = MathUtils.damp(shadowSweep.position.x, targetX * 1.12, 2.2, delta)
    shadowSweep.position.y = MathUtils.damp(shadowSweep.position.y, targetY + 0.06, 2.2, delta)

    shadowCore.scale.x = MathUtils.damp(shadowCore.scale.x, MathUtils.lerp(2.2, 2.6, breathe), 2.4, delta)
    shadowCore.scale.y = MathUtils.damp(shadowCore.scale.y, MathUtils.lerp(1.32, 1.56, breathe), 2.4, delta)
    shadowOuter.scale.x = MathUtils.damp(shadowOuter.scale.x, MathUtils.lerp(2.8, 3.3, breathe), 2.3, delta)
    shadowOuter.scale.y = MathUtils.damp(shadowOuter.scale.y, MathUtils.lerp(1.7, 2.1, breathe), 2.3, delta)
    shadowSweep.scale.x = MathUtils.damp(shadowSweep.scale.x, MathUtils.lerp(1.4, 1.9, breathe), 2.8, delta)
    shadowSweep.scale.y = MathUtils.damp(shadowSweep.scale.y, MathUtils.lerp(0.75, 1.05, breathe), 2.8, delta)
    shadowSweep.rotation.z = MathUtils.damp(shadowSweep.rotation.z, elapsed * 0.26, 2.8, delta)

    const coreMaterial = shadowCore.material as MeshStandardMaterial
    const outerMaterial = shadowOuter.material as MeshStandardMaterial
    const sweepMaterial = shadowSweep.material as MeshStandardMaterial

    coreMaterial.color.copy(tintA).lerp(tintB, 0.36 + breathe * 0.22)
    outerMaterial.color.copy(tintB).lerp(tintA, 0.28 + breathe * 0.16)
    sweepMaterial.color.copy(tintA).lerp(tintB, 0.5)

    coreMaterial.opacity = MathUtils.lerp(0.08, 0.18, breathe) * visibility
    outerMaterial.opacity = MathUtils.lerp(0.04, 0.1, breathe) * visibility
    sweepMaterial.opacity = MathUtils.lerp(0.06, 0.14, breathe) * visibility
  })

  return (
    <group>
      <mesh ref={shadowOuterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.5, -0.24]}>
        <circleGeometry args={[1.15, discSegments]} />
        <meshStandardMaterial
          transparent
          opacity={0.08}
          roughness={0.92}
          metalness={0}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={shadowCoreRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.46, -0.2]}>
        <circleGeometry args={[1.05, discSegments]} />
        <meshStandardMaterial
          transparent
          opacity={0.14}
          roughness={0.88}
          metalness={0}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={shadowSweepRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.4, -0.16]}>
        <ringGeometry args={[0.52, 0.92, ringSegments, 1, 0, Math.PI * 1.16]} />
        <meshStandardMaterial
          transparent
          opacity={0.1}
          roughness={0.7}
          metalness={0}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

function DnaHelixSystem({
  pointerRef,
  scrollProgressRef,
  profile,
  palette,
  grade,
  performanceScale,
}: {
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  scrollProgressRef: MutableRefObject<number>;
  profile: ThemeMotionProfile;
  palette: ThemePalette;
  grade: ThemeColorGrade;
  performanceScale: number;
}) {
  const rootRef = useRef<Group>(null);
  const backLayerRef = useRef<Group>(null);
  const midLayerRef = useRef<Group>(null);
  const foregroundLayerRef = useRef<Group>(null);
  const glowKeyRef = useRef<Group>(null);
  const activityRef = useRef<DnaActivitySignal>({
    pulse: 0,
    burst: 0,
    burstPhase: 0,
    activity: 0,
    colorPhase: 0,
    flowDirection: 1,
    visibility: 1,
  });
  const nextBurstAtRef = useRef(0);
  const burstEndAtRef = useRef(0);
  const burstStartRef = useRef(0);
  const keyColorA = useMemo(() => new Color(), []);
  const keyColorB = useMemo(() => new Color(), []);
  const accentColor = useMemo(() => new Color(palette.accent), [palette.accent]);
  const accent2Color = useMemo(() => new Color(palette.accent2), [palette.accent2]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const pointer = pointerRef.current;
    const scroll = scrollProgressRef.current;
    const signal = activityRef.current;
    const visibility = 1 - smoothstep(0.2, 0.82, scroll);
    signal.visibility = visibility;

    const idlePulse = (Math.sin(elapsed * 0.9) + 1) * 0.5;
    const secondaryPulse = (Math.sin(elapsed * 0.37 + 1.7) + 1) * 0.5;
    signal.pulse = clamp(idlePulse * 0.55 + secondaryPulse * 0.45, 0, 1);

    if (elapsed >= nextBurstAtRef.current) {
      burstStartRef.current = elapsed;
      burstEndAtRef.current = elapsed + MathUtils.lerp(0.55, 1.2, pseudoRandom(elapsed * 1.71 + 10.4));
      nextBurstAtRef.current = burstEndAtRef.current + MathUtils.lerp(1.5, 3.6, pseudoRandom(elapsed * 2.13 + 31.8));
      signal.burstPhase = pseudoRandom(elapsed * 3.17 + 7.2);
      signal.flowDirection = pseudoRandom(elapsed * 1.22 + 99.3) > 0.56 ? 1 : -1;
    }

    const inBurst = elapsed < burstEndAtRef.current;
    if (inBurst) {
      const burstProgress = clamp((elapsed - burstStartRef.current) / Math.max(0.001, burstEndAtRef.current - burstStartRef.current), 0, 1);
      signal.burst = Math.sin(Math.PI * burstProgress);
      signal.burstPhase = (signal.burstPhase + delta * (0.22 + signal.burst * 0.9) * signal.flowDirection + 1) % 1;
    } else {
      signal.burst = MathUtils.damp(signal.burst, 0, 5.8, delta);
    }

    signal.activity = clamp(signal.pulse * 0.55 + signal.burst * 0.95, 0, 1.8);
    signal.colorPhase = (elapsed * 0.12 + signal.burst * 0.5) % 3;

    if (rootRef.current) {
      const targetX = DNA_VISUAL_CONFIG.rootX + pointer.x * 0.11;
      const targetY = DNA_VISUAL_CONFIG.rootY - pointer.y * 0.07 + Math.sin(elapsed * 0.18) * 0.05;
      rootRef.current.position.x = MathUtils.damp(rootRef.current.position.x, targetX, 3.2, delta);
      rootRef.current.position.y = MathUtils.damp(rootRef.current.position.y, targetY, 3.2, delta);
      rootRef.current.rotation.y = MathUtils.damp(rootRef.current.rotation.y, Math.sin(elapsed * 0.16) * 0.04 + pointer.x * 0.045 + signal.burst * 0.06, 2.6, delta);
      rootRef.current.rotation.x = MathUtils.damp(rootRef.current.rotation.x, pointer.y * 0.026, 2.8, delta);
      const baseScale = DNA_VISUAL_CONFIG.rootScale * MathUtils.lerp(0.72, 1, visibility);
      rootRef.current.scale.setScalar(baseScale);
      rootRef.current.visible = visibility > 0.02;
    }

    if (backLayerRef.current) {
      backLayerRef.current.position.x = MathUtils.damp(backLayerRef.current.position.x, pointer.x * 0.05, 2.4, delta);
      backLayerRef.current.position.y = MathUtils.damp(backLayerRef.current.position.y, -pointer.y * 0.03, 2.4, delta);
      backLayerRef.current.rotation.z = MathUtils.damp(backLayerRef.current.rotation.z, Math.sin(elapsed * 0.17) * 0.018, 2.4, delta);
    }

    if (midLayerRef.current) {
      midLayerRef.current.position.x = MathUtils.damp(midLayerRef.current.position.x, pointer.x * 0.09, 3.1, delta);
      midLayerRef.current.position.y = MathUtils.damp(midLayerRef.current.position.y, -pointer.y * 0.05, 3.1, delta);
      midLayerRef.current.rotation.z = MathUtils.damp(midLayerRef.current.rotation.z, Math.sin(elapsed * 0.24) * 0.024, 2.6, delta);
    }

    if (foregroundLayerRef.current) {
      foregroundLayerRef.current.position.x = MathUtils.damp(foregroundLayerRef.current.position.x, pointer.x * 0.12, 4.2, delta);
      foregroundLayerRef.current.position.y = MathUtils.damp(foregroundLayerRef.current.position.y, -pointer.y * 0.07, 4.2, delta);
      foregroundLayerRef.current.rotation.y = MathUtils.damp(foregroundLayerRef.current.rotation.y, Math.sin(elapsed * 0.28) * 0.03, 2.8, delta);
      foregroundLayerRef.current.rotation.z = MathUtils.damp(foregroundLayerRef.current.rotation.z, Math.cos(elapsed * 0.21) * 0.02, 2.8, delta);
    }

    if (glowKeyRef.current) {
      const breathe = (Math.sin(elapsed * 0.65) + 1) * 0.5;
      glowKeyRef.current.scale.x = MathUtils.damp(glowKeyRef.current.scale.x, MathUtils.lerp(0.9, 1.08, breathe), 2.8, delta);
      glowKeyRef.current.scale.y = MathUtils.damp(glowKeyRef.current.scale.y, MathUtils.lerp(0.88, 1.06, breathe), 2.8, delta);
      glowKeyRef.current.scale.z = MathUtils.damp(glowKeyRef.current.scale.z, 1, 2.8, delta);

      const keyA = glowKeyRef.current.children[0] as { intensity?: number; position?: Vector3; color?: Color };
      const keyB = glowKeyRef.current.children[1] as { intensity?: number; position?: Vector3; color?: Color };
      const keyC = glowKeyRef.current.children[2] as { intensity?: number; position?: Vector3; color?: Color };
      sampleBioGradient(keyColorA, signal.colorPhase + elapsed * 0.07);
      sampleBioGradient(keyColorB, signal.colorPhase + 1.1 + elapsed * 0.05);
      if (typeof keyA?.intensity === "number") {
        keyA.intensity = (0.58 + signal.pulse * 0.7 + signal.burst * 1.1) * visibility;
      }
      if (typeof keyB?.intensity === "number") {
        keyB.intensity = (0.46 + signal.pulse * 0.64 + signal.burst * 1.02) * visibility;
      }
      if (typeof keyC?.intensity === "number") {
        keyC.intensity = (0.34 + signal.pulse * 0.56 + signal.burst * 0.98) * visibility;
      }
      if (keyA?.color) {
        keyA.color.copy(keyColorA).lerp(accentColor, 0.3);
      }
      if (keyB?.color) {
        keyB.color.copy(keyColorB).lerp(accent2Color, 0.3);
      }
      if (keyC?.color) {
        keyC.color.copy(keyColorA).lerp(keyColorB, 0.55);
      }
      if (keyA?.position) {
        keyA.position.x = 0.78 + Math.sin(elapsed * 0.52) * 0.18;
        keyA.position.y = 1.74 + Math.cos(elapsed * 0.38) * 0.14;
      }
      if (keyB?.position) {
        keyB.position.x = -0.86 + Math.cos(elapsed * 0.44) * 0.16;
        keyB.position.y = -1.52 + Math.sin(elapsed * 0.34) * 0.12;
      }
      if (keyC?.position) {
        keyC.position.x = Math.sin(elapsed * 0.27 + 0.8) * 1.16;
        keyC.position.y = Math.cos(elapsed * 0.24 + 1.1) * 0.84;
        keyC.position.z = 1.8 + Math.sin(elapsed * 0.31) * 0.34;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      position={[DNA_VISUAL_CONFIG.rootX, DNA_VISUAL_CONFIG.rootY, DNA_VISUAL_CONFIG.rootZ]}
      scale={[DNA_VISUAL_CONFIG.rootScale, DNA_VISUAL_CONFIG.rootScale, DNA_VISUAL_CONFIG.rootScale]}
    >
      <group ref={backLayerRef}>
        <DnaShadowGradient profile={profile} palette={palette} pointerRef={pointerRef} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaDustField pointerRef={pointerRef} palette={palette} activityRef={activityRef} performanceScale={performanceScale} />
      </group>

      <group ref={midLayerRef}>
        <DnaHelixBorderAura palette={palette} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaCoreSphere palette={palette} profile={profile} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaCoreOrbitRings palette={palette} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaSphereLinks pointerRef={pointerRef} profile={profile} palette={palette} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaBackboneStrands pointerRef={pointerRef} profile={profile} palette={palette} grade={grade} activityRef={activityRef} performanceScale={performanceScale} />
      </group>

      <group ref={foregroundLayerRef}>
        <DnaBasePairs pointerRef={pointerRef} profile={profile} palette={palette} grade={grade} activityRef={activityRef} performanceScale={performanceScale} />
        <DnaFlowParticles pointerRef={pointerRef} profile={profile} palette={palette} grade={grade} activityRef={activityRef} performanceScale={performanceScale} />
      </group>

      <group ref={glowKeyRef}>
        <pointLight position={[0.8, 1.8, 1.2]} intensity={0.58} color={palette.accent} distance={7.2} decay={2} />
        <pointLight position={[-0.9, -1.6, 1.4]} intensity={0.46} color={palette.accent2} distance={6.8} decay={2} />
        <pointLight position={[0, 0.7, 1.9]} intensity={0.38} color={palette.foreground} distance={6.1} decay={2} />
      </group>
    </group>
  );
}

function CardMesh({ card, index, scrollProgressRef, pointerRef, profile, performanceScale }: CardMeshProps) {
  const groupRef = useRef<Group>(null);
  const imageLayerRef = useRef<Group>(null);
  const cardImageUrl = useMemo(() => normalizeCardImageUrl(card.imageUrl), [card.imageUrl]);
  const cardBackImageUrl = useMemo(() => normalizeCardImageUrl(card.backImageUrl), [card.backImageUrl]);

  const rawTexture = useLoader(TextureLoader, cardImageUrl, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const rawBackTexture = useLoader(TextureLoader, cardBackImageUrl, (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const cardWidth = 1.516;
  const cardHeight = 2.116;
  const cardAspect = cardWidth / cardHeight;
  const anisotropy = Math.max(2, Math.round(8 * performanceScale));

  const texture = useMemo(() => {
    const nextTexture = rawTexture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.wrapS = ClampToEdgeWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.minFilter = LinearMipmapLinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.anisotropy = anisotropy;
    const imageAspect = getTextureAspect(nextTexture, cardAspect);
    applyCoverUv(nextTexture, imageAspect, cardAspect);
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [rawTexture, cardAspect, anisotropy]);

  const backTexture = useMemo(() => {
    const nextTexture = rawBackTexture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.wrapS = ClampToEdgeWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.minFilter = LinearMipmapLinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.anisotropy = anisotropy;
    const imageAspect = getTextureAspect(nextTexture, cardAspect);
    applyCoverUv(nextTexture, imageAspect, cardAspect);
    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [rawBackTexture, cardAspect, anisotropy]);

  useEffect(() => {
    return () => {
      texture.dispose();
      backTexture.dispose();
    };
  }, [texture, backTexture]);

  const imageGeometry = useMemo(
    () => normalizeGeometryUv(createRoundedRectGeometry(cardWidth, cardHeight, 0.126)),
    [cardHeight, cardWidth]
  );
  // Must be multiples of PI * 2 so they guarantee facing forward exactly at scroll extremeties (0 and 1)
  const SPIN_PATTERNS = [
    { x: 0, y: -Math.PI * 2, z: 0 },                        // Left spin
    { x: Math.PI * 2, y: 0, z: 0 },                         // Somersault
    { x: 0, y: Math.PI * 4, z: Math.PI * 2 },               // Double Y-spin + Z-roll
    { x: -Math.PI * 2, y: Math.PI * 2, z: 0 },              // Complex tumble
    { x: 0, y: Math.PI * 2, z: Math.PI * 2 },               // Simple tumble
  ] as const;
  const START_POSITIONS = [
    { x: -1.8, y: 4.55, z: 1.5 },  // Narrowed to clear Nav
    { x: 1.7, y: 4.2, z: 1.2 },    // Narrowed to clear Nav
    { x: -1.2, y: 3.5, z: 2.8 },   // Tighter cluster
    { x: 0.5, y: 3.5, z: 2.4 },    // Tighter cluster
  ] as const;

  const END_POSITIONS = [
    { x: -1.6, y: -3.5, z: 2.2 },  // Narrowed to clear Nav
    { x: 1.2, y: -3.5, z: 2.0 },   // Narrowed to clear Nav
    { x: -0.7, y: -3.8, z: 3.5 },  // Tighter cluster
    { x: 0.7, y: -3.8, z: 3.0 },   // Tighter cluster
  ] as const;

  const spinPattern = SPIN_PATTERNS[index % 4];
  const startPos = START_POSITIONS[index % 4];
  const endPos = END_POSITIONS[index % 4];

  useFrame((state, delta) => {
    const group = groupRef.current;
    const imageLayer = imageLayerRef.current;

    if (!group || !imageLayer) {
      return;
    }

    const pointerState = pointerRef.current;
    const scrollProgress = scrollProgressRef.current;

    // Staggered travel progress for continuous presence
    // Slightly reduced stagger for tighter group feel during fast scrolls
    const stagger = (index * 0.08) % 0.2;
    const travelProgress = clamp((scrollProgress - stagger) / (1.0 - stagger), 0, 1);
    
    const path = getPath(index, travelProgress);
    const elapsed = state.clock.getElapsedTime();
    const phase = elapsed + card.phaseOffset;

    // Create varying depths dynamically
    const baseDepth = Math.sin(scrollProgress * Math.PI * 3.4 + card.phaseOffset * 1.2);

    // Explicit scroll-scrubbable rotations from our pattern (locks forward at extremes)
    const scrollRotX = travelProgress * spinPattern.x;
    const scrollRotY = travelProgress * spinPattern.y;
    const scrollRotZ = travelProgress * spinPattern.z;

    // Self-rotation (continuous spinning idly) + responsive sway
    // Presence Envelope: Keep in "moving path mode" until 0.5% and 99.5% extremes
    const baseEnvelope = smoothstep(0.005, 0.05, scrollProgress) * (1 - smoothstep(0.95, 0.995, scrollProgress));
    const motionEnvelope = Math.max(0.18, baseEnvelope) * profile.motionIntensity * MathUtils.lerp(0.78, 1, performanceScale);

    // Fade away the continuous / random spin at the extreme ends so they sit perfectly upright
    const idleRotFactor = smoothstep(0.01, 0.08, scrollProgress) * (1 - smoothstep(0.92, 0.99, scrollProgress));
    const selfRotX = (Math.sin(phase * 1.5) * 1.4 + (travelProgress - 0.5) * 0.28) * motionEnvelope * idleRotFactor;
    const selfRotY = (Math.cos(phase * 1.2) * 1.6 + pointerState.x * 0.4) * motionEnvelope * idleRotFactor;
    const selfRotZ = (Math.sin(phase * 1.8) * 1.2) * motionEnvelope * idleRotFactor;
    const footerBackReveal = smoothstep(0.78, 0.96, scrollProgress) * Math.PI;

    // Final rotations = Scroll Scrub Math + Continuous Idle Spin Matrix
    const finalRotXTarget = scrollRotX + selfRotX;
    const finalRotYTarget = scrollRotY + selfRotY + footerBackReveal;
    const finalRotZTarget = scrollRotZ + selfRotZ;

    const driftX = (Math.sin(phase * 1.05) * 0.18 + pointerState.x * 0.32) * motionEnvelope;
    const driftY = (Math.cos(phase * 1.22) * 0.14 - pointerState.y * 0.23) * motionEnvelope;
    const driftZ = (Math.sin(phase * 0.9) * 0.1) * motionEnvelope;

    // Final XYZ Position = Home (Start/End) -> Path -> Drift
    const homeTarget = scrollProgress < 0.5 ? startPos : endPos;
    const targetX = MathUtils.lerp(homeTarget.x, path.x, baseEnvelope) + driftX;
    const targetY = MathUtils.lerp(homeTarget.y, path.y, baseEnvelope) + driftY;
    const targetZ = MathUtils.lerp(homeTarget.z, path.z, baseEnvelope) + driftZ;

    group.position.x = MathUtils.damp(group.position.x, targetX, 11, delta);
    group.position.y = MathUtils.damp(group.position.y, targetY, 11, delta);
    group.position.z = MathUtils.damp(group.position.z, targetZ, 11, delta);
    group.rotation.x = MathUtils.damp(group.rotation.x, finalRotXTarget, 9.5, delta);
    group.rotation.y = MathUtils.damp(group.rotation.y, finalRotYTarget, 9.5, delta);
    group.rotation.z = MathUtils.damp(group.rotation.z, finalRotZTarget, 9.5, delta);

    // Scale: micro-sized professional background cards (0.32 - 0.58 approx)
    const scaleFactor = (baseDepth + 1) * 0.5;
    const scaleTarget = MathUtils.lerp(0.32, 0.58 / profile.weight, scaleFactor);
    group.scale.x = MathUtils.damp(group.scale.x, scaleTarget, 5, delta);
    group.scale.y = MathUtils.damp(group.scale.y, scaleTarget, 5, delta);
    group.scale.z = MathUtils.damp(group.scale.z, 1, 5, delta);

    imageLayer.rotation.z = MathUtils.damp(imageLayer.rotation.z, Math.sin(phase * 0.8) * 0.03 * motionEnvelope, 4, delta);
  });

  return (
    <group ref={groupRef}>
      <group ref={imageLayerRef}>
        <mesh geometry={imageGeometry} position={[0, 0, 0.014]}>
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={0.84}
            toneMapped={false}
          />
        </mesh>
        <mesh geometry={imageGeometry} position={[0, 0, -0.014]} rotation={[0, Math.PI, 0]}>
          <meshBasicMaterial
            map={backTexture}
            transparent
            opacity={0.82}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

function readThemeVisualConfig(): ThemeVisualConfig {
  if (typeof document === "undefined") {
    return {
      palette: {
        accent: "#4fd1ff",
        accent2: "#90f7ce",
        foreground: "#d7ecff",
      },
      profile: THEME_MOTION_PROFILES.ocean,
      grade: THEME_COLOR_GRADES.ocean,
    };
  }

  const themeId = (document.documentElement.getAttribute("data-theme") ?? "ocean").trim().toLowerCase();
  const rootStyles = getComputedStyle(document.documentElement);

  return {
    palette: {
      accent: rootStyles.getPropertyValue("--accent").trim() || "#4fd1ff",
      accent2: rootStyles.getPropertyValue("--accent-2").trim() || "#90f7ce",
      foreground: rootStyles.getPropertyValue("--foreground").trim() || "#d7ecff",
    },
    profile: THEME_MOTION_PROFILES[themeId] ?? THEME_MOTION_PROFILES.ocean,
    grade: THEME_COLOR_GRADES[themeId] ?? THEME_COLOR_GRADES.ocean,
  };
}

export function FloatingCardScene({ cards, scrollProgressRef, pointerRef }: FloatingCardSceneProps) {
  const [themeConfig, setThemeConfig] = useState<ThemeVisualConfig>(readThemeVisualConfig);
  const [performanceProfile, setPerformanceProfile] = useState<ScenePerformanceProfile>(readPerformanceProfile);
  const [isPageVisible, setIsPageVisible] = useState(() => (typeof document === "undefined" ? true : document.visibilityState === "visible"));
  const showDnaLayer = false;

  useEffect(() => {
    function syncThemeConfig() {
      setThemeConfig(readThemeVisualConfig());
    }

    syncThemeConfig();

    const rootNode = document.documentElement;
    const observer = new MutationObserver(syncThemeConfig);
    observer.observe(rootNode, { attributes: true, attributeFilter: ["data-theme"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    function syncPerformanceProfile() {
      setPerformanceProfile(readPerformanceProfile());
    }

    function onVisibilityChange() {
      setIsPageVisible(document.visibilityState === "visible");
    }

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    syncPerformanceProfile();

    reducedMotionQuery.addEventListener("change", syncPerformanceProfile);
    window.addEventListener("resize", syncPerformanceProfile);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      reducedMotionQuery.removeEventListener("change", syncPerformanceProfile);
      window.removeEventListener("resize", syncPerformanceProfile);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div className="floating-webgl-layer" style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 3,
      opacity: 1
    }} aria-hidden="true">
      <Canvas
        dpr={performanceProfile.dpr}
        frameloop={isPageVisible ? "always" : "never"}
        gl={{ antialias: performanceProfile.antialias, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 13], fov: 50 }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <fog attach="fog" args={["#04101a", 9.5, 22]} />
        <ambientLight intensity={0.38} color="#d5f4ff" />
        <hemisphereLight intensity={0.32} color={themeConfig.palette.accent} groundColor="#031523" />
        <directionalLight position={[4, 5, 6]} intensity={1.04} color="#b7e6ff" />
        <pointLight position={[-3.5, -2.2, 4.8]} intensity={0.4} color={themeConfig.palette.accent2} />
        <pointLight position={[2.4, 1.2, 3.7]} intensity={0.34} color={themeConfig.palette.accent} />

        {showDnaLayer ? (
          <DnaHelixSystem
            pointerRef={pointerRef}
            scrollProgressRef={scrollProgressRef}
            profile={themeConfig.profile}
            palette={themeConfig.palette}
            grade={themeConfig.grade}
            performanceScale={performanceProfile.scale}
          />
        ) : null}

        {performanceProfile.enableBloom ? (
          <EffectComposer multisampling={0}>
            <Bloom
              intensity={MathUtils.lerp(0.82, 1.28, performanceProfile.scale)}
              luminanceThreshold={0.16}
              luminanceSmoothing={0.72}
              mipmapBlur
              radius={MathUtils.lerp(0.72, 0.92, performanceProfile.scale)}
            />
          </EffectComposer>
        ) : null}

        {cards.slice(0, 4).map((card, index) => (
          <CardMesh
            key={card.id}
            card={card}
            index={index}
            scrollProgressRef={scrollProgressRef}
            pointerRef={pointerRef}
            profile={themeConfig.profile}
            performanceScale={performanceProfile.scale}
          />
        ))}
      </Canvas>
    </div>
  );
}
