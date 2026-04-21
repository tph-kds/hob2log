"use client";

import Image from "next/image";
import { type PointerEvent, useEffect, useRef, useState } from "react";

interface DiamondCardProps {
  title: string;
  subtitle: string;
  imageUrl: string;
}

export function DiamondCard({ title, subtitle, imageUrl }: DiamondCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [pointerState, setPointerState] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    let isTicking = false;

    function handleScroll() {
      const node = cardRef.current;

      if (!node) {
        return;
      }

      if (isTicking) {
        return;
      }

      isTicking = true;

      window.requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const viewport = window.innerHeight;
        const cardCenter = rect.top + rect.height / 2;
        const progress = (viewport / 2 - cardCenter) / (viewport / 2);
        setScrollProgress(Math.max(-1, Math.min(1, progress)));
        isTicking = false;
      });
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const node = cardRef.current;

    if (!node) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    setPointerState({ x, y, active: true });
  }

  function handlePointerLeave() {
    setPointerState({ x: 0, y: 0, active: false });
  }

  const scrollTiltX = scrollProgress * 8;
  const scrollRotateZ = scrollProgress * 3;
  const scrollLift = -Math.abs(scrollProgress) * 8;

  const pointerTiltX = pointerState.active ? pointerState.y * -12 : 0;
  const pointerTiltY = pointerState.active ? pointerState.x * 14 : 0;
  const activeScale = pointerState.active ? 1.05 : 1;

  const rotateX = scrollTiltX + pointerTiltX;
  const rotateY = pointerTiltY;
  const rotateZ = scrollRotateZ;

  const shinePositionX = `${50 + pointerState.x * 45}%`;
  const shinePositionY = `${50 + pointerState.y * 45}%`;

  return (
    <div className="diamond-glow perspective-near">
      <div
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="diamond-card-motion relative mx-auto w-74 cursor-default select-none transition-transform duration-300 ease-out will-change-transform sm:w-[20rem]"
        style={{
          transform: `translateY(${scrollLift}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${activeScale})`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="diamond-platinum-shell" aria-hidden="true" />

        <div className="diamond-image-mask relative aspect-square overflow-hidden border border-white/20">
          <Image
            src={imageUrl}
            alt={title}
            fill
            sizes="(max-width: 768px) 300px, 340px"
            className="object-cover"
            priority
          />

          <div
            className="diamond-shine-layer"
            style={{
              backgroundImage: `radial-gradient(circle at ${shinePositionX} ${shinePositionY}, rgba(255,255,255,0.65), rgba(130,218,255,0.22) 24%, rgba(151,108,255,0.18) 48%, transparent 72%)`,
            }}
          />

          <div className="diamond-color-film" />
        </div>

        <div className="diamond-caption-panel mt-4 rounded-2xl border border-white/20 p-3 text-center backdrop-blur-md">
          <h3 className="text-sm font-semibold tracking-[0.08em] text-white">{title}</h3>
          <p className="mt-1 text-xs text-sky-100/90">{subtitle}</p>
        </div>

        <div className="diamond-edge-reflection" aria-hidden="true" />
      </div>
    </div>
  );
}