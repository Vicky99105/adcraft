"use client";

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  customSize?: boolean;
}

export const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className,
  glowColor = 'blue',
  customSize = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    el.style.setProperty("--x", `${x}px`);
    el.style.setProperty("--y", `${y}px`);
  };

  const glowColors = {
    blue: 'rgba(59, 130, 246, 0.4)',
    purple: 'rgba(147, 51, 234, 0.4)',
    green: 'rgba(34, 197, 94, 0.4)',
    red: 'rgba(239, 68, 68, 0.4)',
    orange: 'rgba(249, 115, 22, 0.4)',
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/90 backdrop-blur-sm",
        "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] transition-all duration-300",
        // Spotlight effect
        "before:content-[''] before:absolute before:inset-0 before:rounded-2xl before:opacity-0 before:transition-opacity before:duration-500 before:pointer-events-none",
        "before:bg-[radial-gradient(300px_300px_at_var(--x)_var(--y),var(--glow-color),transparent_70%)] group-hover:before:opacity-100",
        // Border glow
        "after:content-[''] after:absolute after:inset-0 after:rounded-2xl after:opacity-0 after:transition-opacity after:duration-300 after:pointer-events-none",
        "after:bg-[radial-gradient(200px_200px_at_var(--x)_var(--y),rgba(255,255,255,0.1),transparent_60%)] group-hover:after:opacity-100",
        customSize ? "" : "w-full h-auto",
        className
      )}
      style={{
        '--glow-color': glowColors[glowColor],
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};
