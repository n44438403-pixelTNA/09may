import React from 'react';

export interface TopBarEffect {
  id: string;
  name: string;
  category: string;
  description: string;
  defaultColor: string;
  baseSpeed: number;
}

export const TOP_BAR_EFFECTS: TopBarEffect[] = [
  // ── SHIMMER (10) ──────────────────────────────────────────────
  { id: 'shimmer-forward',    name: 'Shimmer →',          category: 'Shimmer',  description: 'Diagonal shimmer left to right',          defaultColor: '#ffffff', baseSpeed: 2.5 },
  { id: 'shimmer-reverse',    name: 'Shimmer ←',          category: 'Shimmer',  description: 'Diagonal shimmer right to left',          defaultColor: '#ffffff', baseSpeed: 3.5 },
  { id: 'shimmer-vertical',   name: 'Shimmer ↕',          category: 'Shimmer',  description: 'Vertical shimmer top to bottom',          defaultColor: '#ffffff', baseSpeed: 3.0 },
  { id: 'shimmer-rainbow',    name: 'Rainbow Shimmer',    category: 'Shimmer',  description: 'Slow rainbow sweep across bar',           defaultColor: '#f472b6', baseSpeed: 4.0 },
  { id: 'shimmer-diagonal',   name: 'Shimmer Diagonal',   category: 'Shimmer',  description: 'Sharp 135° diagonal shimmer',             defaultColor: '#a5f3fc', baseSpeed: 2.8 },
  { id: 'shimmer-double',     name: 'Double Shimmer',     category: 'Shimmer',  description: 'Two shimmer bands at once',               defaultColor: '#c4b5fd', baseSpeed: 3.0 },
  { id: 'shimmer-gold',       name: 'Gold Shimmer',       category: 'Shimmer',  description: 'Rich golden shimmer',                     defaultColor: '#fbbf24', baseSpeed: 2.5 },
  { id: 'shimmer-silver',     name: 'Silver Shimmer',     category: 'Shimmer',  description: 'Cool silver/white shimmer',               defaultColor: '#e2e8f0', baseSpeed: 3.0 },
  { id: 'shimmer-pulse-wave', name: 'Pulse Wave',         category: 'Shimmer',  description: 'Shimmer that pulses in and out',          defaultColor: '#818cf8', baseSpeed: 3.5 },
  { id: 'shimmer-wide',       name: 'Wide Shimmer',       category: 'Shimmer',  description: 'Broad, wide shimmer band',                defaultColor: '#ffffff', baseSpeed: 4.0 },

  // ── SPARKLE (8) ───────────────────────────────────────────────
  { id: 'sparkle-top',        name: 'Sparkle Top',        category: 'Sparkle',  description: 'Twinkling dots on top row',               defaultColor: '#fcd34d', baseSpeed: 1.7 },
  { id: 'sparkle-bottom',     name: 'Sparkle Bottom',     category: 'Sparkle',  description: 'Twinkling dots on bottom row',            defaultColor: '#fcd34d', baseSpeed: 1.9 },
  { id: 'sparkle-full',       name: 'Sparkle Full',       category: 'Sparkle',  description: '8 scattered twinkling dots',              defaultColor: '#fcd34d', baseSpeed: 1.6 },
  { id: 'confetti-dots',      name: 'Confetti Dots',      category: 'Sparkle',  description: 'Tiny colorful blinking dots',             defaultColor: '#f472b6', baseSpeed: 1.5 },
  { id: 'sparkle-dense',      name: 'Dense Sparkle',      category: 'Sparkle',  description: '14 dense twinkling particles',            defaultColor: '#a5f3fc', baseSpeed: 1.4 },
  { id: 'sparkle-large',      name: 'Large Sparkle',      category: 'Sparkle',  description: 'Big glowing sparkle orbs',                defaultColor: '#fde68a', baseSpeed: 2.0 },
  { id: 'sparkle-rain',       name: 'Sparkle Rain',       category: 'Sparkle',  description: 'Particles falling from top',              defaultColor: '#bfdbfe', baseSpeed: 2.0 },
  { id: 'sparkle-shooting',   name: 'Shooting Stars',     category: 'Sparkle',  description: 'Shooting stars sweeping across',          defaultColor: '#fef9c3', baseSpeed: 3.0 },

  // ── GLOW (10) ─────────────────────────────────────────────────
  { id: 'glow-bottom',        name: 'Glow Bottom',        category: 'Glow',     description: 'Pulsing glow at bottom edge',             defaultColor: '#60a5fa', baseSpeed: 2.0 },
  { id: 'glow-top',           name: 'Glow Top',           category: 'Glow',     description: 'Pulsing glow at top edge',                defaultColor: '#60a5fa', baseSpeed: 2.5 },
  { id: 'glow-both',          name: 'Glow Both Edges',    category: 'Glow',     description: 'Glow on top and bottom edges',            defaultColor: '#a78bfa', baseSpeed: 2.0 },
  { id: 'neon-border',        name: 'Neon Border',        category: 'Glow',     description: 'Full neon rectangle border',              defaultColor: '#f472b6', baseSpeed: 2.0 },
  { id: 'glow-sides',         name: 'Glow Sides',         category: 'Glow',     description: 'Pulsing glow from left & right edges',    defaultColor: '#34d399', baseSpeed: 2.5 },
  { id: 'glow-corners',       name: 'Glow Corners',       category: 'Glow',     description: 'Radial glow from all 4 corners',          defaultColor: '#f59e0b', baseSpeed: 2.0 },
  { id: 'glow-sweep',         name: 'Glow Sweep',         category: 'Glow',     description: 'Sweeping bright glow across bar',         defaultColor: '#fb7185', baseSpeed: 3.0 },
  { id: 'glow-full',          name: 'Full Bar Glow',      category: 'Glow',     description: 'Ambient glow over the whole bar',         defaultColor: '#7c3aed', baseSpeed: 3.0 },
  { id: 'glow-underline',     name: 'Animated Underline', category: 'Glow',     description: 'Animated glowing bottom line',            defaultColor: '#22d3ee', baseSpeed: 1.5 },
  { id: 'glow-heartbeat',     name: 'Heartbeat Glow',     category: 'Glow',     description: 'Double-pulse heartbeat pattern',          defaultColor: '#f43f5e', baseSpeed: 1.5 },

  // ── PULSE (8) ─────────────────────────────────────────────────
  { id: 'pulse-center',       name: 'Pulse Center',       category: 'Pulse',    description: 'Radial glow pulse from center',           defaultColor: '#7c3aed', baseSpeed: 2.0 },
  { id: 'pulse-left',         name: 'Pulse Left',         category: 'Pulse',    description: 'Radial glow from left side',              defaultColor: '#2563eb', baseSpeed: 2.3 },
  { id: 'pulse-right',        name: 'Pulse Right',        category: 'Pulse',    description: 'Radial glow from right side',             defaultColor: '#059669', baseSpeed: 2.3 },
  { id: 'pulse-full',         name: 'Full Pulse',         category: 'Pulse',    description: 'Entire bar breathes in and out',          defaultColor: '#6366f1', baseSpeed: 2.5 },
  { id: 'pulse-slow',         name: 'Slow Breathe',       category: 'Pulse',    description: 'Very slow meditative breathe',            defaultColor: '#a78bfa', baseSpeed: 4.0 },
  { id: 'pulse-fast',         name: 'Rapid Pulse',        category: 'Pulse',    description: 'Fast triple-beat pulse',                  defaultColor: '#ef4444', baseSpeed: 0.8 },
  { id: 'pulse-corners',      name: 'Corner Pulse',       category: 'Pulse',    description: 'Corner radials pulsing',                  defaultColor: '#f59e0b', baseSpeed: 2.0 },
  { id: 'pulse-edges',        name: 'Edge Breathe',       category: 'Pulse',    description: 'All edges breathe simultaneously',        defaultColor: '#10b981', baseSpeed: 3.0 },

  // ── BORDER RUNNER (8) — NEW ────────────────────────────────────
  { id: 'border-runner-cw',     name: '⬡ Runner Clockwise',     category: 'Border Runner', description: 'Streak runs around all 4 edges clockwise',   defaultColor: '#a78bfa', baseSpeed: 2.5 },
  { id: 'border-runner-ccw',    name: '⬡ Runner Counter-CW',    category: 'Border Runner', description: 'Streak runs counter-clockwise around edges', defaultColor: '#60a5fa', baseSpeed: 2.5 },
  { id: 'border-runner-top',    name: 'Runner Top',              category: 'Border Runner', description: 'Streak runs along top edge only',            defaultColor: '#fbbf24', baseSpeed: 2.0 },
  { id: 'border-runner-bottom', name: 'Runner Bottom',           category: 'Border Runner', description: 'Streak runs along bottom edge only',         defaultColor: '#34d399', baseSpeed: 2.0 },
  { id: 'border-runner-double', name: 'Runner Double',           category: 'Border Runner', description: 'Top + bottom streaks run simultaneously',    defaultColor: '#f472b6', baseSpeed: 2.0 },
  { id: 'border-runner-rainbow',name: 'Runner Rainbow',          category: 'Border Runner', description: 'Color-cycling rainbow streak around border', defaultColor: '#f472b6', baseSpeed: 3.0 },
  { id: 'border-runner-thick',  name: 'Runner Thick',            category: 'Border Runner', description: 'Wide glowing runner around edges',           defaultColor: '#7c3aed', baseSpeed: 3.0 },
  { id: 'border-runner-flash',  name: 'Runner Flash',            category: 'Border Runner', description: 'Fast flashing border runner',                defaultColor: '#ffffff', baseSpeed: 1.2 },

  // ── WAVE / FLOW (8) ───────────────────────────────────────────
  { id: 'wave-flow-right',    name: 'Wave →',             category: 'Wave',     description: 'Smooth wave flowing rightward',           defaultColor: '#67e8f9', baseSpeed: 3.0 },
  { id: 'wave-flow-left',     name: 'Wave ←',             category: 'Wave',     description: 'Smooth wave flowing leftward',            defaultColor: '#67e8f9', baseSpeed: 3.0 },
  { id: 'wave-plasma',        name: 'Plasma Wave',        category: 'Wave',     description: 'Plasma-like multi-color wave',            defaultColor: '#c084fc', baseSpeed: 4.0 },
  { id: 'wave-electric',      name: 'Electric Arc',       category: 'Wave',     description: 'Electric crackling arc',                  defaultColor: '#38bdf8', baseSpeed: 1.0 },
  { id: 'wave-tide',          name: 'Tide',               category: 'Wave',     description: 'Ocean tide in/out',                       defaultColor: '#0ea5e9', baseSpeed: 5.0 },
  { id: 'wave-smoke',         name: 'Smoke',              category: 'Wave',     description: 'Drifting smoke effect',                   defaultColor: '#94a3b8', baseSpeed: 6.0 },
  { id: 'wave-scan',          name: 'Scan Beam',          category: 'Wave',     description: 'Vertical scan beam sweeps across',        defaultColor: '#00ff88', baseSpeed: 2.5 },
  { id: 'wave-ripple',        name: 'Ripple',             category: 'Wave',     description: 'Ripple expanding from center',            defaultColor: '#7dd3fc', baseSpeed: 2.0 },

  // ── FIRE / ICE / NATURE (8) ───────────────────────────────────
  { id: 'fire-glow',          name: 'Fire Bottom',        category: 'Nature',   description: 'Orange fire at the bottom',               defaultColor: '#f97316', baseSpeed: 1.5 },
  { id: 'fire-top',           name: 'Fire Top',           category: 'Nature',   description: 'Flames reaching up from top',             defaultColor: '#ef4444', baseSpeed: 1.5 },
  { id: 'ice-shimmer',        name: 'Ice Shimmer',        category: 'Nature',   description: 'Cool icy shimmer',                        defaultColor: '#7dd3fc', baseSpeed: 3.0 },
  { id: 'frost-edges',        name: 'Frost Edges',        category: 'Nature',   description: 'Frost crystallizing at sides',            defaultColor: '#bae6fd', baseSpeed: 3.5 },
  { id: 'electric-glow',      name: 'Electric Glow',      category: 'Nature',   description: 'High-voltage electric blue crackle',      defaultColor: '#38bdf8', baseSpeed: 1.2 },
  { id: 'plasma-pink',        name: 'Plasma',             category: 'Nature',   description: 'Hot pink plasma energy',                  defaultColor: '#ec4899', baseSpeed: 2.0 },
  { id: 'lava-flow',          name: 'Lava Flow',          category: 'Nature',   description: 'Orange lava flowing at bottom',           defaultColor: '#ea580c', baseSpeed: 4.0 },
  { id: 'toxic-green',        name: 'Toxic Glow',         category: 'Nature',   description: 'Toxic neon green glow',                   defaultColor: '#4ade80', baseSpeed: 2.0 },

  // ── NEON / CYBER (8) ──────────────────────────────────────────
  { id: 'neon-flicker',       name: 'Neon Flicker',       category: 'Neon',     description: 'Broken neon sign flickering',             defaultColor: '#f0abfc', baseSpeed: 2.5 },
  { id: 'neon-blue',          name: 'Neon Blue',          category: 'Neon',     description: 'Electric blue neon strip',                defaultColor: '#38bdf8', baseSpeed: 2.0 },
  { id: 'neon-green',         name: 'Neon Green',         category: 'Neon',     description: 'Matrix-style neon green',                 defaultColor: '#00ff88', baseSpeed: 2.0 },
  { id: 'neon-red',           name: 'Neon Red',           category: 'Neon',     description: 'Danger red neon',                         defaultColor: '#ff4040', baseSpeed: 2.0 },
  { id: 'neon-pink',          name: 'Neon Pink',          category: 'Neon',     description: 'Hot pink neon glow',                      defaultColor: '#ff2d78', baseSpeed: 2.0 },
  { id: 'cyber-scan',         name: 'Cyber Scan',         category: 'Neon',     description: 'Cyberpunk horizontal scan lines',         defaultColor: '#00ff88', baseSpeed: 1.5 },
  { id: 'hologram',           name: 'Hologram',           category: 'Neon',     description: 'Holographic shimmer + flicker',           defaultColor: '#67e8f9', baseSpeed: 2.0 },
  { id: 'cyber-grid',         name: 'Cyber Grid',         category: 'Neon',     description: 'Tron-style cyberpunk grid lines',         defaultColor: '#22d3ee', baseSpeed: 2.0 },

  // ── STARS / PARTICLES (8) ─────────────────────────────────────
  { id: 'stars-full',         name: 'Stars Full',         category: 'Stars',    description: 'Many twinkling stars scattered',          defaultColor: '#fef3c7', baseSpeed: 2.0 },
  { id: 'stars-sparse',       name: 'Stars Sparse',       category: 'Stars',    description: 'Few large glowing stars',                 defaultColor: '#fef9c3', baseSpeed: 2.5 },
  { id: 'snow-fall',          name: 'Snowfall',           category: 'Stars',    description: 'Falling snowflake particles',             defaultColor: '#e0f2fe', baseSpeed: 2.5 },
  { id: 'bubbles-rise',       name: 'Bubbles',            category: 'Stars',    description: 'Rising translucent bubbles',              defaultColor: '#7dd3fc', baseSpeed: 2.0 },
  { id: 'fireflies',          name: 'Fireflies',          category: 'Stars',    description: 'Drifting firefly glow particles',         defaultColor: '#fde68a', baseSpeed: 3.0 },
  { id: 'magic-dust',         name: 'Magic Dust',         category: 'Stars',    description: 'Colorful magical dust sparkles',          defaultColor: '#c4b5fd', baseSpeed: 2.0 },
  { id: 'shooting-star',      name: 'Shooting Star',      category: 'Stars',    description: 'Single shooting star arcing across',      defaultColor: '#fef9c3', baseSpeed: 4.0 },
  { id: 'meteor-shower',      name: 'Meteor Shower',      category: 'Stars',    description: 'Multiple meteors flying across',          defaultColor: '#fde68a', baseSpeed: 3.0 },

  // ── SPECIAL (8) ───────────────────────────────────────────────
  { id: 'aurora',             name: 'Aurora',             category: 'Special',  description: 'Shifting northern-lights aura',           defaultColor: '#6ee7b7', baseSpeed: 5.0 },
  { id: 'vignette-glow',      name: 'Vignette Glow',      category: 'Special',  description: 'Soft glow from both sides',               defaultColor: '#fde68a', baseSpeed: 3.0 },
  { id: 'scanlines',          name: 'Scanlines',          category: 'Special',  description: 'Subtle retro scanline texture',           defaultColor: '#94a3b8', baseSpeed: 1.0 },
  { id: 'glitch',             name: 'Glitch',             category: 'Special',  description: 'Sporadic glitch distortion',              defaultColor: '#f472b6', baseSpeed: 3.0 },
  { id: 'prism-bands',        name: 'Prism',              category: 'Special',  description: 'Rotating prismatic color bands',          defaultColor: '#f472b6', baseSpeed: 4.0 },
  { id: 'tv-static',          name: 'TV Static',          category: 'Special',  description: 'Old TV static noise texture',             defaultColor: '#94a3b8', baseSpeed: 1.0 },
  { id: 'retro-wave',         name: 'Retro Wave',         category: 'Special',  description: 'Synthwave gradient bands',                defaultColor: '#c084fc', baseSpeed: 4.0 },
  { id: 'matrix-green',       name: 'Matrix',             category: 'Special',  description: 'Matrix-style green drips',                defaultColor: '#00ff88', baseSpeed: 1.5 },
];

export const EFFECT_CATEGORIES = ['Shimmer', 'Sparkle', 'Glow', 'Pulse', 'Border Runner', 'Wave', 'Nature', 'Neon', 'Stars', 'Special'];

function hexToRgba(hex: string, alpha: number): string {
  try {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  } catch { return `rgba(255,255,255,${alpha})`; }
}

function dur(base: number, speed?: number): string {
  const s = Math.max(0.1, Math.min(8, speed ?? 1));
  return `${(base / s).toFixed(2)}s`;
}

export interface EffectEntry { id: string; enabled: boolean; color: string; speed?: number; }

export function TopBarEffectsLayer({ effects }: { effects?: EffectEntry[] }) {
  if (!effects || effects.length === 0) return null;
  const enabled = effects.filter(e => e.enabled);
  if (enabled.length === 0) return null;

  return (
    <>
      {enabled.map((eff) => {
        const c = eff.color || '#ffffff';
        const ca = (a: number) => hexToRgba(c, a);
        const sp = eff.speed;
        const key = eff.id;

        switch (eff.id) {

          // ── SHIMMER ──────────────────────────────────────────────
          case 'shimmer-forward':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 30%,${ca(0.18)} 50%,transparent 70%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(2.5, sp)} linear infinite` }} />;

          case 'shimmer-reverse':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(75deg,transparent 30%,${ca(0.14)} 50%,transparent 70%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep-reverse ${dur(3.5, sp)} linear infinite` }} />;

          case 'shimmer-vertical':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(180deg,${ca(0.14)} 0%,transparent 35%,transparent 65%,${ca(0.12)} 100%)` }} />;

          case 'shimmer-rainbow':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 20%,${ca(0.15)} 35%,rgba(244,114,182,0.1) 50%,${ca(0.15)} 65%,transparent 80%)`, backgroundSize: '300% 100%', animation: `shimmer-sweep ${dur(4.0, sp)} linear infinite` }} />;

          case 'shimmer-diagonal':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(135deg,transparent 25%,${ca(0.22)} 50%,transparent 75%)`, backgroundSize: '200% 200%', animation: `shimmer-sweep ${dur(2.8, sp)} linear infinite` }} />;

          case 'shimmer-double':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 15%,${ca(0.12)} 25%,transparent 35%,transparent 55%,${ca(0.12)} 65%,transparent 75%)`, backgroundSize: '300% 100%', animation: `shimmer-sweep ${dur(3.0, sp)} linear infinite` }} />;

          case 'shimmer-gold':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 25%,rgba(251,191,36,0.25) 40%,rgba(255,255,255,0.12) 50%,rgba(251,191,36,0.25) 60%,transparent 75%)`, backgroundSize: '250% 100%', animation: `shimmer-sweep ${dur(2.5, sp)} linear infinite` }} />;

          case 'shimmer-silver':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 25%,rgba(226,232,240,0.3) 42%,rgba(255,255,255,0.18) 50%,rgba(226,232,240,0.3) 58%,transparent 75%)`, backgroundSize: '250% 100%', animation: `shimmer-sweep ${dur(3.0, sp)} linear infinite` }} />;

          case 'shimmer-pulse-wave':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 30%,${ca(0.2)} 50%,transparent 70%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(3.5, sp)} ease-in-out infinite` }} />;

          case 'shimmer-wide':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 10%,${ca(0.1)} 30%,${ca(0.18)} 50%,${ca(0.1)} 70%,transparent 90%)`, backgroundSize: '300% 100%', animation: `shimmer-sweep ${dur(4.0, sp)} linear infinite` }} />;

          // ── SPARKLE ───────────────────────────────────────────────
          case 'sparkle-top':
            return (
              <React.Fragment key={key}>
                {[15, 30, 48, 62, 77, 90].map((left, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none z-0" style={{ top: `${6 + (i % 3) * 5}px`, left: `${left}%`, background: c, animation: `sparkle-blink ${dur(1.7 + i * 0.3, sp)} ease-in-out infinite ${(i * 0.3 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'sparkle-bottom':
            return (
              <React.Fragment key={key}>
                {[10, 28, 45, 60, 75, 88].map((left, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none z-0" style={{ bottom: `${4 + (i % 3) * 4}px`, left: `${left}%`, background: c, animation: `sparkle-blink ${dur(1.9 + i * 0.25, sp)} ease-in-out infinite ${(i * 0.4 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'sparkle-full':
            return (
              <React.Fragment key={key}>
                {[8, 20, 35, 50, 62, 74, 83, 93].map((left, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none z-0" style={{ top: i % 2 === 0 ? `${4 + (i % 3) * 5}px` : undefined, bottom: i % 2 !== 0 ? `${3 + (i % 3) * 4}px` : undefined, left: `${left}%`, background: c, animation: `sparkle-blink ${dur(1.6 + i * 0.28, sp)} ease-in-out infinite ${(i * 0.35 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'confetti-dots':
            return (
              <React.Fragment key={key}>
                {[5, 18, 32, 46, 57, 68, 80, 92].map((left, i) => {
                  const colors = [c, '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#a78bfa'];
                  return <div key={i} className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-0" style={{ top: i % 2 === 0 ? `${3 + (i % 4) * 4}px` : undefined, bottom: i % 2 !== 0 ? `${2 + (i % 3) * 5}px` : undefined, left: `${left}%`, background: colors[i % colors.length], animation: `sparkle-blink ${dur(1.5 + i * 0.3, sp)} ease-in-out infinite ${(i * 0.4 / (sp ?? 1)).toFixed(2)}s` }} />;
                })}
              </React.Fragment>
            );

          case 'sparkle-dense':
            return (
              <React.Fragment key={key}>
                {[5, 12, 20, 30, 40, 50, 58, 66, 74, 82, 88, 93, 96, 99].map((left, i) => (
                  <div key={i} className="absolute w-0.5 h-0.5 rounded-full pointer-events-none z-0" style={{ top: `${3 + (i % 5) * 5}px`, left: `${left}%`, background: c, animation: `sparkle-blink ${dur(1.2 + i * 0.2, sp)} ease-in-out infinite ${(i * 0.2 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'sparkle-large':
            return (
              <React.Fragment key={key}>
                {[10, 28, 50, 72, 90].map((left, i) => (
                  <div key={i} className="absolute w-2.5 h-2.5 rounded-full pointer-events-none z-0" style={{ top: i % 2 === 0 ? '4px' : undefined, bottom: i % 2 !== 0 ? '4px' : undefined, left: `${left}%`, background: c, filter: `blur(2px)`, animation: `sparkle-blink ${dur(2.0 + i * 0.5, sp)} ease-in-out infinite ${(i * 0.5 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'sparkle-rain':
            return (
              <React.Fragment key={key}>
                {[8, 20, 35, 50, 65, 80, 92].map((left, i) => (
                  <div key={i} className="absolute w-0.5 h-2 rounded-full pointer-events-none z-0" style={{ top: '-4px', left: `${left}%`, background: `linear-gradient(180deg, transparent, ${c})`, animation: `particle-float ${dur(2.0 + i * 0.3, sp)} ease-in infinite ${(i * 0.4 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'sparkle-shooting':
            return (
              <React.Fragment key={key}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="absolute h-px pointer-events-none z-0" style={{ top: `${4 + i * 8}px`, left: '-15%', width: '25%', background: `linear-gradient(90deg, transparent, ${ca(0.9)}, ${ca(0.5)}, transparent)`, animation: `border-runner-top ${dur(3.0 + i * 0.7, sp)} linear infinite ${(i * 1.2 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          // ── GLOW ──────────────────────────────────────────────────
          case 'glow-bottom':
            return <div key={key} className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.7)},${ca(0.95)},${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />;

          case 'glow-top':
            return <div key={key} className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.6)},${ca(0.9)},${ca(0.6)},transparent)`, animation: `topbar-glow-pulse ${dur(2.5, sp)} ease-in-out infinite` }} />;

          case 'glow-both':
            return (
              <React.Fragment key={key}>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.7)},${ca(0.95)},${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.5)},${ca(0.8)},${ca(0.5)},transparent)`, animation: `topbar-glow-pulse ${dur(2.5, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'neon-border':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ boxShadow: `inset 0 0 0 1px ${ca(0.5)}, inset 0 2px 8px ${ca(0.2)}, inset 0 -2px 8px ${ca(0.2)}`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />;

          case 'glow-sides':
            return (
              <React.Fragment key={key}>
                <div className="absolute top-0 bottom-0 left-0 w-8 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.3)},transparent)`, animation: `topbar-glow-pulse ${dur(2.5, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 bottom-0 right-0 w-8 pointer-events-none z-0" style={{ background: `linear-gradient(270deg,${ca(0.3)},transparent)`, animation: `topbar-glow-pulse ${dur(2.5, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'glow-corners':
            return (
              <React.Fragment key={key}>
                <div className="absolute top-0 left-0 w-16 h-full pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 0% 0%, ${ca(0.3)} 0%, transparent 70%)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 right-0 w-16 h-full pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 100% 0%, ${ca(0.3)} 0%, transparent 70%)`, animation: `topbar-glow-pulse ${dur(2.2, sp)} ease-in-out infinite 0.5s` }} />
                <div className="absolute bottom-0 left-0 w-16 h-full pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 0% 100%, ${ca(0.3)} 0%, transparent 70%)`, animation: `topbar-glow-pulse ${dur(2.4, sp)} ease-in-out infinite 1s` }} />
                <div className="absolute bottom-0 right-0 w-16 h-full pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 100% 100%, ${ca(0.3)} 0%, transparent 70%)`, animation: `topbar-glow-pulse ${dur(2.6, sp)} ease-in-out infinite 1.5s` }} />
              </React.Fragment>
            );

          case 'glow-sweep':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent 20%,${ca(0.3)} 50%,transparent 80%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(3.0, sp)} ease-in-out infinite` }} />;

          case 'glow-full':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.12), animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite` }} />;

          case 'glow-underline':
            return (
              <React.Fragment key={key}>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.9)},${ca(1)},${ca(0.9)},transparent)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(1.5, sp)} linear infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[8px] pointer-events-none z-0" style={{ background: `linear-gradient(to top,${ca(0.2)},transparent)` }} />
              </React.Fragment>
            );

          case 'glow-heartbeat':
            return (
              <React.Fragment key={key}>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.8)},transparent)`, animation: `heartbeat ${dur(1.5, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.6)},transparent)`, animation: `heartbeat ${dur(1.5, sp)} ease-in-out infinite 0.1s` }} />
              </React.Fragment>
            );

          // ── PULSE ─────────────────────────────────────────────────
          case 'pulse-center':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 50% 50%,${ca(0.18)} 0%,transparent 70%)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />;

          case 'pulse-left':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 0% 50%,${ca(0.25)} 0%,transparent 60%)`, animation: `topbar-glow-pulse ${dur(2.3, sp)} ease-in-out infinite` }} />;

          case 'pulse-right':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 100% 50%,${ca(0.25)} 0%,transparent 60%)`, animation: `topbar-glow-pulse ${dur(2.3, sp)} ease-in-out infinite` }} />;

          case 'pulse-full':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.18), animation: `topbar-glow-pulse ${dur(2.5, sp)} ease-in-out infinite` }} />;

          case 'pulse-slow':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 50% 50%,${ca(0.22)} 0%,transparent 80%)`, animation: `topbar-glow-pulse ${dur(4.0, sp)} ease-in-out infinite` }} />;

          case 'pulse-fast':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.2), animation: `topbar-glow-pulse ${dur(0.8, sp)} ease-in-out infinite` }} />;

          case 'pulse-corners':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 0% 0%,${ca(0.25)} 0%,transparent 50%), radial-gradient(ellipse at 100% 0%,${ca(0.25)} 0%,transparent 50%), radial-gradient(ellipse at 0% 100%,${ca(0.25)} 0%,transparent 50%), radial-gradient(ellipse at 100% 100%,${ca(0.25)} 0%,transparent 50%)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'pulse-edges':
            return (
              <React.Fragment key={key}>
                <div className="absolute bottom-0 left-0 right-0 h-[3px] pointer-events-none z-0" style={{ background: ca(0.6), animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 left-0 right-0 h-[3px] pointer-events-none z-0" style={{ background: ca(0.4), animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite 0.5s` }} />
                <div className="absolute top-0 bottom-0 left-0 w-[3px] pointer-events-none z-0" style={{ background: ca(0.3), animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite 1s` }} />
                <div className="absolute top-0 bottom-0 right-0 w-[3px] pointer-events-none z-0" style={{ background: ca(0.3), animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite 1.5s` }} />
              </React.Fragment>
            );

          // ── BORDER RUNNER ─────────────────────────────────────────
          case 'border-runner-cw':
            return (
              <React.Fragment key={key}>
                {/* Top edge: left → right */}
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,${ca(0.6)},${ca(1)},${ca(0.6)},transparent)`, animation: `border-runner-top ${dur(2.5, sp)} linear infinite` }} />
                {/* Bottom edge: right → left (delayed half cycle) */}
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, right: '-28%', width: '28%', height: '2px', background: `linear-gradient(270deg,transparent,${ca(0.6)},${ca(1)},${ca(0.6)},transparent)`, animation: `border-runner-bottom ${dur(2.5, sp)} linear infinite ${(1.25 / (sp ?? 1)).toFixed(2)}s` }} />
                {/* Right edge flash at turnaround */}
                <div className="absolute pointer-events-none z-0" style={{ top: 0, right: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,transparent,${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(0.6, sp)} ease-in-out infinite ${(1.1 / (sp ?? 1)).toFixed(2)}s` }} />
                {/* Left edge flash at turnaround */}
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,transparent,${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(0.6, sp)} ease-in-out infinite ${(2.4 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'border-runner-ccw':
            return (
              <React.Fragment key={key}>
                {/* Top edge: right → left */}
                <div className="absolute pointer-events-none z-0" style={{ top: 0, right: '-28%', width: '28%', height: '2px', background: `linear-gradient(270deg,transparent,${ca(0.6)},${ca(1)},${ca(0.6)},transparent)`, animation: `border-runner-bottom ${dur(2.5, sp)} linear infinite` }} />
                {/* Bottom edge: left → right */}
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,${ca(0.6)},${ca(1)},${ca(0.6)},transparent)`, animation: `border-runner-top ${dur(2.5, sp)} linear infinite ${(1.25 / (sp ?? 1)).toFixed(2)}s` }} />
                <div className="absolute pointer-events-none z-0" style={{ top: 0, right: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,transparent,${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(0.6, sp)} ease-in-out infinite` }} />
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,transparent,${ca(0.7)},transparent)`, animation: `topbar-glow-pulse ${dur(0.6, sp)} ease-in-out infinite ${(1.3 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'border-runner-top':
            return <div key={key} className="absolute pointer-events-none z-0" style={{ top: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,${ca(0.7)},${ca(1)},${ca(0.7)},transparent)`, animation: `border-runner-top ${dur(2.0, sp)} linear infinite` }} />;

          case 'border-runner-bottom':
            return <div key={key} className="absolute pointer-events-none z-0" style={{ bottom: 0, right: '-28%', width: '28%', height: '2px', background: `linear-gradient(270deg,transparent,${ca(0.7)},${ca(1)},${ca(0.7)},transparent)`, animation: `border-runner-bottom ${dur(2.0, sp)} linear infinite` }} />;

          case 'border-runner-double':
            return (
              <React.Fragment key={key}>
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,${ca(0.7)},${ca(1)},${ca(0.7)},transparent)`, animation: `border-runner-top ${dur(2.0, sp)} linear infinite` }} />
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,${ca(0.7)},${ca(1)},${ca(0.7)},transparent)`, animation: `border-runner-top ${dur(2.0, sp)} linear infinite ${(0.5 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'border-runner-rainbow':
            return (
              <React.Fragment key={key}>
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: '-28%', width: '28%', height: '2px', background: `linear-gradient(90deg,transparent,#f472b6,#a78bfa,#60a5fa,#34d399,transparent)`, animation: `border-runner-top ${dur(3.0, sp)} linear infinite` }} />
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, right: '-28%', width: '28%', height: '2px', background: `linear-gradient(270deg,transparent,#fbbf24,#f97316,#ef4444,#a78bfa,transparent)`, animation: `border-runner-bottom ${dur(3.0, sp)} linear infinite ${(1.5 / (sp ?? 1)).toFixed(2)}s` }} />
                <div className="absolute pointer-events-none z-0" style={{ top: 0, right: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,#60a5fa,#34d399)`, animation: `topbar-glow-pulse ${dur(0.5, sp)} ease-in-out infinite ${(1.2 / (sp ?? 1)).toFixed(2)}s` }} />
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: 0, width: '2px', height: '100%', background: `linear-gradient(180deg,#a78bfa,#f472b6)`, animation: `topbar-glow-pulse ${dur(0.5, sp)} ease-in-out infinite ${(2.6 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'border-runner-thick':
            return (
              <React.Fragment key={key}>
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: '-28%', width: '28%', height: '4px', background: `linear-gradient(90deg,transparent,${ca(0.5)},${ca(0.95)},${ca(0.5)},transparent)`, filter: `blur(1px)`, animation: `border-runner-top ${dur(3.0, sp)} linear infinite` }} />
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, right: '-28%', width: '28%', height: '4px', background: `linear-gradient(270deg,transparent,${ca(0.5)},${ca(0.95)},${ca(0.5)},transparent)`, filter: `blur(1px)`, animation: `border-runner-bottom ${dur(3.0, sp)} linear infinite ${(1.5 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'border-runner-flash':
            return (
              <React.Fragment key={key}>
                <div className="absolute pointer-events-none z-0" style={{ top: 0, left: '-20%', width: '20%', height: '1.5px', background: `linear-gradient(90deg,transparent,${ca(1)},transparent)`, animation: `border-runner-top ${dur(1.2, sp)} linear infinite` }} />
                <div className="absolute pointer-events-none z-0" style={{ bottom: 0, right: '-20%', width: '20%', height: '1.5px', background: `linear-gradient(270deg,transparent,${ca(1)},transparent)`, animation: `border-runner-bottom ${dur(1.2, sp)} linear infinite ${(0.6 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          // ── WAVE / FLOW ───────────────────────────────────────────
          case 'wave-flow-right':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent 10%,${ca(0.08)} 30%,${ca(0.2)} 50%,${ca(0.08)} 70%,transparent 90%)`, backgroundSize: '300% 100%', animation: `wave-flow-right ${dur(3.0, sp)} linear infinite` }} />;

          case 'wave-flow-left':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent 10%,${ca(0.08)} 30%,${ca(0.2)} 50%,${ca(0.08)} 70%,transparent 90%)`, backgroundSize: '300% 100%', animation: `wave-flow-left ${dur(3.0, sp)} linear infinite` }} />;

          case 'wave-plasma':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 5%,${ca(0.12)} 20%,rgba(192,132,252,0.1) 40%,${ca(0.15)} 60%,rgba(99,102,241,0.1) 80%,transparent 95%)`, backgroundSize: '400% 100%', animation: `wave-flow-right ${dur(4.0, sp)} ease-in-out infinite` }} />;

          case 'wave-electric':
            return (
              <React.Fragment key={key}>
                <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.9)},transparent)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(1.0, sp)} linear infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.6)},transparent)`, backgroundSize: '200% 100%', animation: `shimmer-sweep-reverse ${dur(1.3, sp)} linear infinite` }} />
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.04), animation: `neon-flicker ${dur(1.2, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'wave-tide':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.2)} 0%,transparent 30%,${ca(0.15)} 60%,transparent 90%,${ca(0.2)} 100%)`, backgroundSize: '300% 100%', animation: `wave-flow-right ${dur(5.0, sp)} ease-in-out infinite` }} />;

          case 'wave-smoke':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.15)} 0%,transparent 20%,${ca(0.1)} 45%,transparent 70%,${ca(0.15)} 100%)`, backgroundSize: '400% 100%', animation: `smoke-drift ${dur(6.0, sp)} ease-in-out infinite` }} />;

          case 'wave-scan':
            return <div key={key} className="absolute top-0 bottom-0 pointer-events-none z-0" style={{ left: 0, width: '3px', background: `linear-gradient(90deg,transparent,${ca(0.8)},transparent)`, animation: `border-runner-top ${dur(2.5, sp)} linear infinite`, transform: 'rotate(90deg)' }} />;

          case 'wave-ripple':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 50% 50%,transparent 20%,${ca(0.1)} 40%,transparent 60%,${ca(0.08)} 80%,transparent 100%)`, backgroundSize: '200% 200%', animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />;

          // ── FIRE / ICE / NATURE ───────────────────────────────────
          case 'fire-glow':
            return <div key={key} className="absolute bottom-0 left-0 right-0 h-[40%] pointer-events-none z-0" style={{ background: `linear-gradient(to top,${ca(0.3)},transparent)`, animation: `topbar-glow-pulse ${dur(1.5, sp)} ease-in-out infinite` }} />;

          case 'fire-top':
            return <div key={key} className="absolute top-0 left-0 right-0 h-[40%] pointer-events-none z-0" style={{ background: `linear-gradient(to bottom,${ca(0.3)},transparent)`, animation: `topbar-glow-pulse ${dur(1.5, sp)} ease-in-out infinite` }} />;

          case 'ice-shimmer':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 25%,${ca(0.16)} 45%,rgba(255,255,255,0.06) 55%,${ca(0.16)} 75%,transparent 90%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(3.0, sp)} linear infinite` }} />;

          case 'frost-edges':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.25)} 0%,transparent 25%,transparent 75%,${ca(0.25)} 100%)`, animation: `topbar-glow-pulse ${dur(3.5, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.5)},transparent 30%,transparent 70%,${ca(0.5)})` }} />
              </React.Fragment>
            );

          case 'electric-glow':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.08), animation: `neon-flicker ${dur(1.2, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.9)},transparent)`, backgroundSize: '150% 100%', animation: `shimmer-sweep ${dur(0.8, sp)} linear infinite` }} />
              </React.Fragment>
            );

          case 'plasma-pink':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `radial-gradient(ellipse at 50% 0%,${ca(0.25)} 0%,transparent 60%), radial-gradient(ellipse at 50% 100%,${ca(0.2)} 0%,transparent 60%)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />;

          case 'lava-flow':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.15)} 0%,rgba(249,115,22,0.12) 20%,${ca(0.2)} 50%,rgba(234,88,12,0.12) 80%,${ca(0.15)} 100%)`, backgroundSize: '300% 100%', animation: `wave-flow-right ${dur(4.0, sp)} ease-in-out infinite` }} />;

          case 'toxic-green':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.07), animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.8)},transparent)`, backgroundSize: '150% 100%', animation: `shimmer-sweep ${dur(1.5, sp)} linear infinite` }} />
              </React.Fragment>
            );

          // ── NEON / CYBER ──────────────────────────────────────────
          case 'neon-flicker':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.1), animation: `neon-flicker ${dur(2.5, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: ca(0.8), animation: `neon-flicker ${dur(2.5, sp)} ease-in-out infinite 0.1s` }} />
              </React.Fragment>
            );

          case 'neon-blue':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ boxShadow: `inset 0 -2px 12px ${ca(0.3)}, inset 0 0 20px ${ca(0.1)}`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.95)},transparent)`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'neon-green':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.06), animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(1)},transparent)`, animation: `topbar-glow-pulse ${dur(1.5, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'neon-red':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.08), animation: `neon-flicker ${dur(3.0, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none z-0" style={{ boxShadow: `inset 0 0 0 1px ${ca(0.4)}`, animation: `neon-flicker ${dur(3.0, sp)} ease-in-out infinite 0.2s` }} />
              </React.Fragment>
            );

          case 'neon-pink':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ boxShadow: `inset 0 0 20px ${ca(0.15)}, inset 0 -3px 10px ${ca(0.25)}`, animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.9)},transparent)`, animation: `topbar-glow-pulse ${dur(1.8, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'cyber-scan':
            return (
              <React.Fragment key={key}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="absolute left-0 right-0 pointer-events-none z-0" style={{ top: `${i * 25}%`, height: '1px', background: ca(0.12), animation: `topbar-glow-pulse ${dur(1.5 + i * 0.3, sp)} ease-in-out infinite ${(i * 0.3 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
                <div className="absolute top-0 bottom-0 left-0 w-[2px] pointer-events-none z-0" style={{ background: `linear-gradient(180deg,transparent,${ca(0.7)},transparent)`, animation: `scan-down ${dur(2.5, sp)} linear infinite` }} />
              </React.Fragment>
            );

          case 'hologram':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 30%,${ca(0.12)} 50%,transparent 70%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(2.0, sp)} linear infinite` }} />
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.05), animation: `neon-flicker ${dur(4.0, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          case 'cyber-grid':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: `linear-gradient(${ca(0.12)} 1px, transparent 1px), linear-gradient(90deg, ${ca(0.12)} 1px, transparent 1px)`, backgroundSize: '20px 100%', animation: `topbar-glow-pulse ${dur(2.0, sp)} ease-in-out infinite` }} />
              </React.Fragment>
            );

          // ── STARS / PARTICLES ─────────────────────────────────────
          case 'stars-full':
            return (
              <React.Fragment key={key}>
                {[4, 11, 19, 27, 36, 44, 52, 61, 69, 77, 85, 93].map((left, i) => (
                  <div key={i} className="absolute rounded-full pointer-events-none z-0" style={{ width: i % 3 === 0 ? '3px' : '2px', height: i % 3 === 0 ? '3px' : '2px', top: `${3 + (i % 4) * 6}px`, left: `${left}%`, background: c, animation: `sparkle-blink ${dur(1.5 + i * 0.25, sp)} ease-in-out infinite ${(i * 0.3 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'stars-sparse':
            return (
              <React.Fragment key={key}>
                {[8, 30, 55, 75, 92].map((left, i) => (
                  <div key={i} className="absolute rounded-full pointer-events-none z-0" style={{ width: '4px', height: '4px', top: `${4 + (i % 3) * 7}px`, left: `${left}%`, background: c, filter: 'blur(1px)', animation: `sparkle-blink ${dur(2.5 + i * 0.5, sp)} ease-in-out infinite ${(i * 0.6 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'snow-fall':
            return (
              <React.Fragment key={key}>
                {[6, 16, 28, 40, 52, 64, 76, 88, 95].map((left, i) => (
                  <div key={i} className="absolute w-1 h-1 rounded-full pointer-events-none z-0" style={{ top: '-4px', left: `${left}%`, background: ca(0.7), animation: `particle-float ${dur(2.5 + i * 0.3, sp)} ease-in infinite ${(i * 0.35 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'bubbles-rise':
            return (
              <React.Fragment key={key}>
                {[10, 25, 42, 58, 74, 88].map((left, i) => (
                  <div key={i} className="absolute rounded-full pointer-events-none z-0" style={{ width: `${4 + i % 3 * 2}px`, height: `${4 + i % 3 * 2}px`, bottom: '-8px', left: `${left}%`, background: 'transparent', border: `1px solid ${ca(0.5)}`, animation: `bubble-rise ${dur(2.0 + i * 0.4, sp)} ease-in infinite ${(i * 0.5 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'fireflies':
            return (
              <React.Fragment key={key}>
                {[12, 28, 45, 62, 80].map((left, i) => (
                  <div key={i} className="absolute w-1.5 h-1.5 rounded-full pointer-events-none z-0" style={{ top: `${5 + i * 5}px`, left: `${left}%`, background: c, filter: 'blur(1px)', animation: `sparkle-blink ${dur(2.0 + i * 0.6, sp)} ease-in-out infinite ${(i * 0.7 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          case 'magic-dust':
            return (
              <React.Fragment key={key}>
                {[5, 18, 30, 45, 58, 70, 82, 93].map((left, i) => {
                  const cols = [c, '#fbbf24', '#f472b6', '#60a5fa', '#34d399', '#a78bfa'];
                  return <div key={i} className="absolute rounded-full pointer-events-none z-0" style={{ width: '3px', height: '3px', top: `${3 + (i % 4) * 6}px`, left: `${left}%`, background: cols[i % cols.length], filter: 'blur(0.5px)', animation: `sparkle-blink ${dur(1.8 + i * 0.3, sp)} ease-in-out infinite ${(i * 0.3 / (sp ?? 1)).toFixed(2)}s` }} />;
                })}
              </React.Fragment>
            );

          case 'shooting-star':
            return (
              <React.Fragment key={key}>
                <div className="absolute h-[1.5px] pointer-events-none z-0" style={{ top: '6px', left: '-15%', width: '15%', background: `linear-gradient(90deg,transparent,${ca(0.9)})`, animation: `meteor-fly ${dur(4.0, sp)} ease-out infinite` }} />
                <div className="absolute h-[1.5px] pointer-events-none z-0" style={{ bottom: '6px', left: '-15%', width: '10%', background: `linear-gradient(90deg,transparent,${ca(0.6)})`, animation: `meteor-fly ${dur(5.5, sp)} ease-out infinite ${(2.0 / (sp ?? 1)).toFixed(2)}s` }} />
              </React.Fragment>
            );

          case 'meteor-shower':
            return (
              <React.Fragment key={key}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="absolute h-px pointer-events-none z-0" style={{ top: `${3 + i * 8}px`, left: '-12%', width: `${10 + i * 3}%`, background: `linear-gradient(90deg,transparent,${ca(0.85)})`, animation: `meteor-fly ${dur(3.0 + i * 0.8, sp)} ease-out infinite ${(i * 0.9 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          // ── SPECIAL ───────────────────────────────────────────────
          case 'aurora':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,transparent 10%,${ca(0.12)} 30%,${hexToRgba('#6ee7b7', 0.08)} 50%,${ca(0.12)} 70%,transparent 90%)`, backgroundSize: '300% 100%', animation: `shimmer-sweep ${dur(5.0, sp)} ease-in-out infinite` }} />;

          case 'vignette-glow':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(90deg,${ca(0.2)} 0%,transparent 30%,transparent 70%,${ca(0.2)} 100%)`, animation: `topbar-glow-pulse ${dur(3.0, sp)} ease-in-out infinite` }} />;

          case 'scanlines':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent 2px,${ca(0.04)} 2px,${ca(0.04)} 4px)` }} />;

          case 'glitch':
            return (
              <React.Fragment key={key}>
                <div className="absolute inset-0 pointer-events-none z-0" style={{ background: ca(0.06), animation: `glitch-eff ${dur(3.0, sp)} ease-in-out infinite` }} />
                <div className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none z-0" style={{ background: `linear-gradient(90deg,transparent,${ca(0.6)},transparent)`, animation: `glitch-eff ${dur(3.0, sp)} ease-in-out infinite 0.05s` }} />
              </React.Fragment>
            );

          case 'prism-bands':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(105deg,rgba(239,68,68,0.08) 0%,rgba(249,115,22,0.08) 15%,rgba(234,179,8,0.08) 30%,rgba(34,197,94,0.08) 45%,rgba(6,182,212,0.08) 60%,rgba(139,92,246,0.08) 75%,rgba(236,72,153,0.08) 90%)`, backgroundSize: '200% 100%', animation: `shimmer-sweep ${dur(4.0, sp)} linear infinite` }} />;

          case 'tv-static':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`, opacity: 0.4, animation: `static-noise ${dur(1.0, sp)} ease-in-out infinite` }} />;

          case 'retro-wave':
            return <div key={key} className="absolute inset-0 pointer-events-none z-0" style={{ background: `linear-gradient(180deg,${ca(0.08)} 0%,transparent 40%,transparent 60%,${hexToRgba('#7c3aed', 0.12)} 100%)`, backgroundSize: '100% 200%', animation: `shimmer-sweep ${dur(4.0, sp)} ease-in-out infinite` }} />;

          case 'matrix-green':
            return (
              <React.Fragment key={key}>
                {[5, 14, 25, 36, 47, 58, 68, 79, 88, 96].map((left, i) => (
                  <div key={i} className="absolute w-px pointer-events-none z-0" style={{ top: '-4px', left: `${left}%`, height: `${8 + i % 3 * 4}px`, background: `linear-gradient(180deg, ${ca(0.9)}, transparent)`, animation: `particle-float ${dur(1.5 + i * 0.2, sp)} ease-in infinite ${(i * 0.25 / (sp ?? 1)).toFixed(2)}s` }} />
                ))}
              </React.Fragment>
            );

          default:
            return null;
        }
      })}
    </>
  );
}
