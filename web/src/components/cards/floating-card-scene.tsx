"use client";

import { Line } from "@react-three/drei";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  ClampToEdgeWrapping,
  Color,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PointsMaterial,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  TextureLoader,
} from "three";

interface FloatingCardInput {
  id: string;
  title: string;
  imageUrl: string;
  phaseOffset: number;
}

interface FloatingCardSceneProps {
  cards: FloatingCardInput[];
  scrollProgress: number;
  pointerState: {
    x: number;
    y: number;
  };
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

interface CardMeshProps {
  card: FloatingCardInput;
  index: number;
  scrollProgress: number;
  pointerState: {
    x: number;
    y: number;
  };
  palette: ThemePalette;
  profile: ThemeMotionProfile;
  grade?: ThemeColorGrade;
}

interface TrailParticlesProps {
  count: number;
  phaseOffset: number;
  color: string;
  pointerState: {
    x: number;
    y: number;
  };
  profile: ThemeMotionProfile;
  layerOffset: number;
  scrollProgress: number;
  lowOpacity: number;
  highOpacity: number;
}

const THEME_MOTION_PROFILES: Record<string, ThemeMotionProfile> = {
  ocean: { motionIntensity: 1.16, weight: 0.9, edgeVelocity: 0.58, particleCount: 42, particleSize: 0.042, particleSpread: 1.06, particleSpeed: 1.18, densityBias: 0.36, densityCeiling: 1 },
  sunset: { motionIntensity: 1.08, weight: 0.92, edgeVelocity: 0.5, particleCount: 38, particleSize: 0.04, particleSpread: 1, particleSpeed: 1.1, densityBias: 0.32, densityCeiling: 0.95 },
  forest: { motionIntensity: 1.02, weight: 0.95, edgeVelocity: 0.46, particleCount: 34, particleSize: 0.039, particleSpread: 0.96, particleSpeed: 1.02, densityBias: 0.28, densityCeiling: 0.9 },
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
  mono: { trailPrimary: "#b8cee9", trailSecondary: "#d9e5f7", edgeTint: "#9fb9da", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  latte: { trailPrimary: "#d9aa8a", trailSecondary: "#c7b5e8", edgeTint: "#e0be9e", trailOpacityLow: 0.1, trailOpacityHigh: 0.32 },
  mocha: { trailPrimary: "#9ec1ff", trailSecondary: "#b5f0ae", edgeTint: "#c6b2f8", trailOpacityLow: 0.11, trailOpacityHigh: 0.38 },
  sidewalk: { trailPrimary: "#f0d274", trailSecondary: "#d4e7ed", edgeTint: "#f8e3a3", trailOpacityLow: 0.1, trailOpacityHigh: 0.34 },
  leather: { trailPrimary: "#d3a27a", trailSecondary: "#f0c39b", edgeTint: "#c98f66", trailOpacityLow: 0.08, trailOpacityHigh: 0.28 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
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

  if (index === 0) {
    return {
      x: MathUtils.lerp(2.05, -2.05, t) + Math.sin(t * Math.PI * 4) * 0.56,
      y: MathUtils.lerp(0.95, -1.15, t) + Math.sin(t * Math.PI * 5) * 0.34,
    };
  }

  return {
    x: MathUtils.lerp(-2.05, 2.02, t) + Math.cos(t * Math.PI * 3.4) * 0.58,
    y: MathUtils.lerp(-1.05, 1.02, t) + Math.sin(t * Math.PI * 4.3) * 0.31,
  };
}

function createRoundedRectGeometry(width: number, height: number, radius: number) {
  return new ShapeGeometry(createRoundedRectShape(width, height, radius));
}

function createRoundedRectLinePoints(width: number, height: number, radius: number, segments = 40) {
  return createRoundedRectShape(width, height, radius).getSpacedPoints(segments);
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

function createRoundedRectBorderGeometry(
  outerWidth: number,
  outerHeight: number,
  innerWidth: number,
  innerHeight: number,
  outerRadius: number,
  innerRadius: number
) {
  const outer = createRoundedRectShape(outerWidth, outerHeight, outerRadius);
  const inner = createRoundedRectShape(innerWidth, innerHeight, innerRadius);
  outer.holes.push(inner);
  return new ShapeGeometry(outer);
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

function TrailParticles({ count, phaseOffset, color, pointerState, profile, layerOffset, scrollProgress, lowOpacity, highOpacity }: TrailParticlesProps) {
  const attributeRef = useRef<BufferAttribute>(null);
  const materialRef = useRef<PointsMaterial>(null);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);

  const seeds = useMemo(() => {
    return Array.from({ length: count }, (_, index) => {
      const ratio = index / Math.max(1, count - 1);
      return {
        phase: ratio * Math.PI * 2,
        radius: MathUtils.lerp(0.08, 0.5, ratio) * profile.particleSpread,
        lane: MathUtils.lerp(-0.1, -0.95, ratio) * profile.weight,
        wobble: MathUtils.lerp(0.35, 1.4, ratio),
      };
    });
  }, [count, profile.particleSpread, profile.weight]);

  useFrame((state) => {
    const attribute = attributeRef.current;
    const material = materialRef.current;

    if (!attribute || !material) {
      return;
    }

    const array = attribute.array as Float32Array;

    const elapsed = state.clock.getElapsedTime();

    for (let index = 0; index < count; index += 1) {
      const seed = seeds[index];
      const swirl = elapsed * profile.particleSpeed * seed.wobble + seed.phase + phaseOffset + layerOffset;
      const spread = seed.radius;

      array[index * 3] = Math.cos(swirl) * spread + pointerState.x * 0.07 * profile.motionIntensity;
      array[index * 3 + 1] = Math.sin(swirl * 1.35) * spread * 0.45 - pointerState.y * 0.04 * profile.motionIntensity;
      array[index * 3 + 2] = seed.lane + Math.sin(swirl * 1.85 + phaseOffset) * 0.05;
    }

    const enterCurve = smoothstep(0.02, 0.24, scrollProgress);
    const exitCurve = 1 - smoothstep(0.76, 1, scrollProgress);
    const densityCurve = clamp((enterCurve * exitCurve) + profile.densityBias, 0.08, profile.densityCeiling);
    const pulse = (Math.sin(elapsed * (1.2 + profile.motionIntensity * 0.36) + phaseOffset) + 1) * 0.5;

    material.opacity = MathUtils.lerp(lowOpacity, highOpacity, densityCurve) * MathUtils.lerp(0.82, 1.12, pulse);

    attribute.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute ref={attributeRef} attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={profile.particleSize}
        sizeAttenuation
        transparent
        opacity={highOpacity}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}

function CardMesh({ card, index, scrollProgress, pointerState, palette, profile, grade }: CardMeshProps) {
  const resolvedGrade = grade ?? THEME_COLOR_GRADES.ocean;
  const groupRef = useRef<Group>(null);
  const imageRef = useRef<Mesh>(null);
  const borderRef = useRef<Mesh>(null);
  const glowRef = useRef<Mesh>(null);
  const borderMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const glowMaterialRef = useRef<MeshPhysicalMaterial>(null);
  const cardImageUrl = useMemo(() => normalizeCardImageUrl(card.imageUrl), [card.imageUrl]);

  const [rawTexture] = useLoader(TextureLoader, [cardImageUrl], (loader) => {
    loader.setCrossOrigin("anonymous");
  });
  const cardWidth = 1.516;
  const cardHeight = 2.116;
  const cardAspect = cardWidth / cardHeight;

  const texture = useMemo(() => {
    const nextTexture = rawTexture.clone();
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.wrapS = ClampToEdgeWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.minFilter = LinearMipmapLinearFilter;
    nextTexture.magFilter = LinearFilter;
    nextTexture.anisotropy = 8;

    const imageAspect = getTextureAspect(nextTexture, cardAspect);
    applyCoverUv(nextTexture, imageAspect, cardAspect);

    nextTexture.needsUpdate = true;
    return nextTexture;
  }, [rawTexture, cardAspect]);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const imageGeometry = useMemo(
    () => normalizeGeometryUv(createRoundedRectGeometry(cardWidth, cardHeight, 0.126)),
    [cardHeight, cardWidth]
  );
  const borderGeometry = useMemo(
    () => createRoundedRectBorderGeometry(1.53, 2.13, cardWidth, cardHeight, 0.15, 0.126),
    [cardHeight, cardWidth]
  );
  const glowGeometry = useMemo(
    () => createRoundedRectGeometry(1.545, 2.145, 0.154),
    []
  );

  const accentColor = useMemo(() => new Color("#8ff3ff"), []);
  const accentColorTwo = useMemo(() => new Color("#ff9cde"), []);
  const foregroundColor = useMemo(() => new Color(palette.foreground), [palette.foreground]);
  const edgeColorCache = useMemo(() => new Color(), []);
  const glowColorCache = useMemo(() => new Color(), []);
  const borderColorCache = useMemo(() => new Color(), []);
  const edgeTintColor = useMemo(() => new Color("#b6b1ff"), []);

  const borderPoints = useMemo(() => createRoundedRectLinePoints(1.53, 2.13, 0.15, 56), []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const imageMesh = imageRef.current;
    const borderMesh = borderRef.current;
    const glowMesh = glowRef.current;
    const borderMaterial = borderMaterialRef.current;
    const glowMaterial = glowMaterialRef.current;

    if (!group || !imageMesh || !borderMesh || !glowMesh || !borderMaterial || !glowMaterial) {
      return;
    }

    const travelProgress = smoothstep(0.08, 0.9, scrollProgress);
    const path = getPath(index, travelProgress);
    const elapsed = state.clock.getElapsedTime();
    const phase = elapsed + card.phaseOffset;
    const depthCycle = Math.sin(scrollProgress * Math.PI * 2.4 + card.phaseOffset * 0.8);
    const depthFactor = (depthCycle + 1) * 0.5;

    const baseEnvelope = smoothstep(0.04, 0.2, scrollProgress) * (1 - smoothstep(0.88, 1, scrollProgress));
    const motionEnvelope = Math.max(0.22, baseEnvelope) * profile.motionIntensity;
    const driftX = (Math.sin(phase * 1.05) * 0.16 + pointerState.x * 0.32) * motionEnvelope;
    const driftY = (Math.cos(phase * 1.22) * 0.11 - pointerState.y * 0.23) * motionEnvelope;
    const rotXTarget = (Math.sin(phase * 1.2) * 0.22 + (travelProgress - 0.5) * 0.28) * motionEnvelope;
    const rotYTarget = (Math.cos(phase * 0.9) * 0.26 + pointerState.x * 0.24) * motionEnvelope;
    const rotZTarget = (Math.sin(phase * 1.6) * 0.3 + (travelProgress - 0.5) * 0.5) * motionEnvelope;

    const scaleTarget = MathUtils.lerp(0.72, 1.28 / profile.weight, depthFactor);
    const depthTarget = MathUtils.lerp(-2.3 * profile.weight, 1.25 / profile.weight, depthFactor);

    group.position.x = MathUtils.damp(group.position.x, path.x + driftX, 5, delta);
    group.position.y = MathUtils.damp(group.position.y, path.y + driftY, 5, delta);
    group.position.z = MathUtils.damp(group.position.z, depthTarget, 4.2, delta);
    group.rotation.x = MathUtils.damp(group.rotation.x, rotXTarget, 4.5, delta);
    group.rotation.y = MathUtils.damp(group.rotation.y, rotYTarget, 4.5, delta);
    group.rotation.z = MathUtils.damp(group.rotation.z, rotZTarget, 4.5, delta);
    group.scale.x = MathUtils.damp(group.scale.x, scaleTarget, 5, delta);
    group.scale.y = MathUtils.damp(group.scale.y, scaleTarget, 5, delta);
    group.scale.z = MathUtils.damp(group.scale.z, 1, 5, delta);

    imageMesh.rotation.z = MathUtils.damp(imageMesh.rotation.z, Math.sin(phase * 0.8) * 0.03 * motionEnvelope, 4, delta);
    borderMesh.rotation.z = MathUtils.damp(borderMesh.rotation.z, Math.sin(phase * 0.92) * 0.035 * motionEnvelope, 4, delta);
    const pulse = 0.32 + Math.sin(phase * 2.1) * 0.1 + depthFactor * 0.24;
    const runWave = (Math.sin(phase * (2.2 + profile.motionIntensity * 0.5) + index * 0.8) + 1) * 0.5;
    const secondaryWave = (Math.cos(phase * (1.4 + profile.motionIntensity * 0.35) + card.phaseOffset) + 1) * 0.5;

    edgeColorCache.copy(accentColor).lerp(edgeTintColor, runWave * 0.6).lerp(accentColorTwo, runWave * 0.4);
    glowColorCache.copy(accentColor).lerp(accentColorTwo, secondaryWave);
    borderColorCache.copy(foregroundColor).lerp(edgeColorCache, 0.26);

    borderMaterial.color.copy(borderColorCache);
    borderMaterial.emissive.copy(edgeColorCache);
    borderMaterial.emissiveIntensity = MathUtils.lerp(0.34, 0.68, runWave);

    glowMaterial.color.copy(glowColorCache);
    glowMaterial.opacity = pulse;
  });

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef} geometry={glowGeometry} position={[0, 0, -0.08]}>
        <meshPhysicalMaterial
          ref={glowMaterialRef}
          color="#8ff3ff"
          transparent
          opacity={0.1}
          transmission={0.7}
          roughness={0.22}
          metalness={0.16}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      <mesh ref={borderRef} geometry={borderGeometry} position={[0, 0, 0.012]}>
        <meshPhysicalMaterial
          ref={borderMaterialRef}
          color={palette.foreground}
          emissive="#8ff3ff"
          emissiveIntensity={1.04}
          transmission={0.54}
          roughness={0.12}
          metalness={0.68}
          transparent
          opacity={0.24}
        />
      </mesh>

      <mesh ref={imageRef} geometry={imageGeometry} position={[0, 0, 0.014]}>
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
        />
      </mesh>

      <mesh geometry={imageGeometry} position={[0, 0, 0.017]}>
        <meshPhysicalMaterial
          color="#ff9cde"
          transparent
          opacity={0.08}
          transmission={0.22}
          roughness={0.03}
          metalness={0.32}
          iridescence={1}
          iridescenceIOR={1.2}
        />
      </mesh>

      <Line points={borderPoints} color={palette.foreground} lineWidth={1.02} transparent opacity={0.24} />
      <Line
        points={borderPoints}
        color="#8ff3ff"
        lineWidth={0.74}
        transparent
        opacity={0.42}
      />

      <TrailParticles
        count={profile.particleCount}
        phaseOffset={card.phaseOffset}
        color="#8ff3ff"
        pointerState={pointerState}
        profile={profile}
        layerOffset={index * 0.42}
        scrollProgress={scrollProgress}
        lowOpacity={resolvedGrade.trailOpacityLow}
        highOpacity={resolvedGrade.trailOpacityHigh}
      />
      <TrailParticles
        count={Math.max(10, Math.round(profile.particleCount * 0.56))}
        phaseOffset={card.phaseOffset + 1.2}
        color="#ff9cde"
        pointerState={pointerState}
        profile={profile}
        layerOffset={index * 0.28 + 0.64}
        scrollProgress={scrollProgress}
        lowOpacity={resolvedGrade.trailOpacityLow * 0.9}
        highOpacity={resolvedGrade.trailOpacityHigh * 0.82}
      />
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

export function FloatingCardScene({ cards, scrollProgress, pointerState }: FloatingCardSceneProps) {
  const [themeConfig, setThemeConfig] = useState<ThemeVisualConfig>(readThemeVisualConfig);

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

  return (
    <div className="floating-webgl-layer" aria-hidden="true">
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 0, 7.5], fov: 42 }}
      >
        <ambientLight intensity={0.62} color="#d8ecff" />
        <directionalLight position={[4, 5, 3]} intensity={1.25} color="#a6ddff" />
        <pointLight position={[-4, -3, 4]} intensity={0.7} color="#b08dff" />

        {cards.slice(0, 2).map((card, index) => (
          <CardMesh
            key={card.id}
            card={card}
            index={index}
            scrollProgress={scrollProgress}
            pointerState={pointerState}
            palette={themeConfig.palette}
            profile={themeConfig.profile}
            grade={themeConfig.grade}
          />
        ))}
      </Canvas>
    </div>
  );
}