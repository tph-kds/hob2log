"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";
import { useMemo, useRef } from "react";
import { Color, ShaderMaterial, Vector2 } from "three";
import { liquidDistortionFragmentShader, liquidDistortionVertexShader } from "@/components/hero/liquid-distortion-shader";

interface LiquidDistortionCanvasProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  isActive: boolean;
}

interface DistortionPlaneProps {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  isActive: boolean;
}

function DistortionPlane({ pointerX, pointerY, isActive }: DistortionPlaneProps) {
  const materialRef = useRef<ShaderMaterial | null>(null);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_mouse: { value: new Vector2(0.5, 0.5) },
      u_intensity: { value: 0 },
      u_color_a: { value: new Color("#35d9ff") },
      u_color_b: { value: new Color("#32ffa7") },
    }),
    []
  );

  useFrame((_, delta) => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    const clampedDelta = Math.min(delta, 0.033);
    const targetIntensity = isActive ? 1 : 0;
    const shaderUniforms = material.uniforms as {
      u_time: { value: number };
      u_mouse: { value: Vector2 };
      u_intensity: { value: number };
    };

    shaderUniforms.u_time.value += clampedDelta;
    shaderUniforms.u_mouse.value.lerp(new Vector2(pointerX.get(), pointerY.get()), 0.12);
    shaderUniforms.u_intensity.value += (targetIntensity - shaderUniforms.u_intensity.value) * 0.08;
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={liquidDistortionVertexShader}
        fragmentShader={liquidDistortionFragmentShader}
      />
    </mesh>
  );
}

export function LiquidDistortionCanvas({ pointerX, pointerY, isActive }: LiquidDistortionCanvasProps) {
  return (
    <div className="hero-liquid-layer" aria-hidden="true">
      <Canvas orthographic camera={{ position: [0, 0, 2], zoom: 1 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
        <DistortionPlane pointerX={pointerX} pointerY={pointerY} isActive={isActive} />
      </Canvas>
    </div>
  );
}
