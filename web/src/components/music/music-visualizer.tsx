"use client";

import { useEffect, useRef } from "react";

interface MusicVisualizerProps {
  analyserNode: AnalyserNode | null;
  active: boolean;
}

export function MusicVisualizer({ analyserNode, active }: MusicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const smoothedRef = useRef<Float32Array | null>(null);
  const sizeRef = useRef({ width: 360, height: 66 });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    const frequencyArray = new Uint8Array(analyserNode?.frequencyBinCount ?? 1024);
    const timeDomainArray = new Uint8Array(analyserNode?.fftSize ?? 2048);
    const pointsCount = 72;
    smoothedRef.current = new Float32Array(pointsCount);

    const resizeCanvas = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor((rect.width || sizeRef.current.width) * dpr));
      const height = Math.max(1, Math.floor((rect.height || sizeRef.current.height) * dpr));
      canvas.width = width;
      canvas.height = height;
      sizeRef.current = {
        width: Math.max(1, Math.floor(rect.width || sizeRef.current.width)),
        height: Math.max(1, Math.floor(rect.height || sizeRef.current.height)),
      };
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(resizeCanvas);
      observer.observe(canvas);
    }
    window.addEventListener("resize", resizeCanvas);

    let frameId = 0;

    const render = () => {
      if (analyserNode) {
        try {
          analyserNode.getByteFrequencyData(frequencyArray);
          analyserNode.getByteTimeDomainData(timeDomainArray);
        } catch {
          // fall back to synthetic waveform when analyser stream is unavailable
        }
      }

      const width = Math.max(1, canvas.clientWidth || sizeRef.current.width);
      const height = Math.max(1, canvas.clientHeight || sizeRef.current.height);
      context.clearRect(0, 0, width, height);

      const panelGlow = context.createLinearGradient(0, 0, width, height);
      panelGlow.addColorStop(0, "rgba(208, 248, 255, 0.16)");
      panelGlow.addColorStop(0.52, "rgba(108, 214, 255, 0.1)");
      panelGlow.addColorStop(1, "rgba(88, 255, 214, 0.08)");
      context.fillStyle = panelGlow;
      context.fillRect(0, 0, width, height);

      const smoothed = smoothedRef.current;

      if (!smoothed) {
        frameId = requestAnimationFrame(render);
        return;
      }

      const baseLine = height * 0.9;
      const activeBoost = active ? 1.12 : 0.48;
      const smoothFactor = active ? 0.26 : 0.14;

      const bassWindow = Math.max(3, Math.floor(frequencyArray.length * 0.06));
      let bassEnergy = 0;
      for (let i = 0; i < bassWindow; i += 1) {
        bassEnergy += frequencyArray[i] / 255;
      }
      bassEnergy = bassWindow > 0 ? bassEnergy / bassWindow : 0;
      const beatPulse = active ? 1 + bassEnergy * 0.55 : 1;
      const points: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < pointsCount; index += 1) {
        const ratio = index / Math.max(1, pointsCount - 1);
        const sampleIndex = Math.floor(ratio * (frequencyArray.length - 1));
        const timeCenter = Math.floor(ratio * (timeDomainArray.length - 1));
        const timeWindow = Math.max(2, Math.floor(timeDomainArray.length / pointsCount / 1.5));

        let timeEnergy = 0;
        let timeSamples = 0;
        for (let pointer = Math.max(0, timeCenter - timeWindow); pointer <= Math.min(timeDomainArray.length - 1, timeCenter + timeWindow); pointer += 1) {
          timeEnergy += Math.abs(timeDomainArray[pointer] - 128) / 128;
          timeSamples += 1;
        }

        const avgTimeEnergy = timeSamples > 0 ? timeEnergy / timeSamples : 0;
        const freqEnergy = frequencyArray[sampleIndex] / 255;
        const edgeCompensation = 0.88 + ratio * 0.42;
        const minMotion = active ? 0.03 : 0.014;
        const synthetic = (Math.sin(performance.now() / 720 + ratio * 8) + 1) * 0.5;
        const ripple = active ? (Math.sin(performance.now() / 170 + ratio * 26) + 1) * 0.5 : 0.2;
        const raw = analyserNode
          ? Math.max(minMotion, (avgTimeEnergy * 1.25 + freqEnergy * 0.62 + ripple * 0.14) * edgeCompensation)
          : synthetic * 0.22 + minMotion;
        const value = raw * activeBoost * beatPulse;
        smoothed[index] = smoothed[index] + (value - smoothed[index]) * smoothFactor;

        const amp = smoothed[index];
        const x = ratio * width;
        const lift = Math.pow(amp, 0.82) * height * (active ? 0.74 : 0.5);
        const floorOscillation = Math.sin((performance.now() / 1000) * 2.3 + ratio * 12) * (active ? 1.5 : 0.85);
        const y = Math.max(height * 0.12, baseLine - lift + floorOscillation);
        points.push({ x, y });
      }

      context.beginPath();
      context.moveTo(0, baseLine);
      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const cx = (current.x + next.x) / 2;
        const cy = (current.y + next.y) / 2;
        context.quadraticCurveTo(current.x, current.y, cx, cy);
      }
      context.lineTo(width, baseLine);
      context.closePath();

      const fillGradient = context.createLinearGradient(0, height * 0.16, 0, baseLine);
      fillGradient.addColorStop(0, "rgba(248, 252, 255, 0.88)");
      fillGradient.addColorStop(0.32, "rgba(132, 228, 255, 0.86)");
      fillGradient.addColorStop(0.7, "rgba(94, 190, 255, 0.52)");
      fillGradient.addColorStop(1, "rgba(106, 255, 227, 0.2)");
      context.fillStyle = fillGradient;
      context.fill();

      context.beginPath();
      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const cx = (current.x + next.x) / 2;
        const cy = (current.y + next.y) / 2;

        if (index === 0) {
          context.moveTo(current.x, current.y);
        }

        context.quadraticCurveTo(current.x, current.y, cx, cy);
      }

      const strokeGradient = context.createLinearGradient(0, 0, width, 0);
      strokeGradient.addColorStop(0, "rgba(224, 249, 255, 0.9)");
      strokeGradient.addColorStop(0.45, "rgba(143, 230, 255, 0.95)");
      strokeGradient.addColorStop(1, "rgba(164, 255, 227, 0.82)");
      context.strokeStyle = strokeGradient;
      context.lineWidth = active ? 2 : 1.7;
      context.shadowColor = "rgba(126, 232, 255, 0.48)";
      context.shadowBlur = active ? 13 : 9;
      context.stroke();

      context.beginPath();
      for (let index = 0; index < points.length - 1; index += 1) {
        const current = points[index];
        const next = points[index + 1];
        const cx = (current.x + next.x) / 2;
        const cy = (current.y + next.y) / 2;

        if (index === 0) {
          context.moveTo(current.x, current.y - 1.6);
        }

        context.quadraticCurveTo(current.x, current.y - 1.6, cx, cy - 1.6);
      }
      context.strokeStyle = "rgba(241, 252, 255, 0.5)";
      context.lineWidth = 1.1;
      context.shadowBlur = 4;
      context.stroke();

      context.shadowBlur = 0;

      context.beginPath();
      context.moveTo(0, baseLine + 1);
      context.lineTo(width, baseLine + 1);
      context.strokeStyle = "rgba(206, 245, 255, 0.34)";
      context.lineWidth = 1;
      context.stroke();

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      smoothedRef.current = null;
    };
  }, [active, analyserNode]);

  return <canvas ref={canvasRef} width={360} height={66} className="music-visualizer" aria-hidden="true" />;
}
