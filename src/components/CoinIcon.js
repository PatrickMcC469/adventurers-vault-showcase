import React from 'react';
import Svg, { Circle, Path, Polygon, Rect, Line } from 'react-native-svg';

const CONFIGS = {
  platinum: {
    bg:     '#d0d0e8',
    border: '#9090b0',
    inner:  '#8080a0',
  },
  gold: {
    bg:     '#ffd700',
    border: '#c8960a',
    inner:  '#a07000',
  },
  electrum: {
    bg:     '#5fd4e0',
    border: '#2a9aab',
    inner:  '#1a6a78',
  },
  silver: {
    bg:     '#c0c0c0',
    border: '#707070',
    inner:  '#505050',
  },
  copper: {
    bg:     '#c87533',
    border: '#7a4a1e',
    inner:  '#5a2e0a',
  },
};

// ── Inner designs ─────────────────────────────────────────────────────────────

// 8-pointed star / compass rose (platinum + gold)
function StarDesign({ color, size }) {
  const c = size / 2;
  const r1 = size * 0.28; // outer
  const r2 = size * 0.12; // inner
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a1 = (i * Math.PI * 2) / 8 - Math.PI / 2;
    const a2 = a1 + Math.PI / 8;
    pts.push(`${c + r1 * Math.cos(a1)},${c + r1 * Math.sin(a1)}`);
    pts.push(`${c + r2 * Math.cos(a2)},${c + r2 * Math.sin(a2)}`);
  }
  return <Polygon points={pts.join(' ')} fill={color} />;
}

// Shield (silver)
function ShieldDesign({ color, size }) {
  const c = size / 2;
  const w = size * 0.38;
  const t = c - size * 0.22;
  const b = c + size * 0.28;
  const d = `M ${c} ${b} L ${c - w} ${t} L ${c + w} ${t} Z`;
  return (
    <>
      <Path d={d} fill={color} />
      <Line x1={c} y1={t + 2} x2={c} y2={b - 4} stroke={CONFIGS.silver.bg} strokeWidth={1.5} />
    </>
  );
}

// Crown (copper)
function CrownDesign({ color, size }) {
  const c  = size / 2;
  const bL = c - size * 0.28; // base left
  const bR = c + size * 0.28; // base right
  const bY = c + size * 0.18; // base y
  const tY = c - size * 0.20; // top of points
  const mY = c - size * 0.06; // middle dip
  const d  = `M ${bL} ${bY} L ${bL} ${tY} L ${c} ${mY} L ${bR} ${tY} L ${bR} ${bY} Z`;
  return <Path d={d} fill={color} />;
}

// Gem / crystal (electrum)
function GemDesign({ color, size }) {
  const c  = size / 2;
  const w  = size * 0.22;
  const tY = c - size * 0.24;
  const mY = c - size * 0.02;
  const bY = c + size * 0.24;
  const d  = `M ${c} ${tY} L ${c + w} ${mY} L ${c} ${bY} L ${c - w} ${mY} Z`;
  return <Path d={d} fill={color} />;
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CoinIcon({ denomination, size = 44 }) {
  const cfg = CONFIGS[denomination] || CONFIGS.gold;
  const c   = size / 2;
  const r   = size / 2 - 1;

  return (
    <Svg width={size} height={size}>
      {/* Outer border circle */}
      <Circle cx={c} cy={c} r={r} fill={cfg.border} />
      {/* Main face */}
      <Circle cx={c} cy={c} r={r - 3} fill={cfg.bg} />
      {/* Inner ring */}
      <Circle cx={c} cy={c} r={r - 6} fill="none" stroke={cfg.inner} strokeWidth={1} />
      {/* Denomination-specific design */}
      {(denomination === 'platinum' || denomination === 'gold') && (
        <StarDesign color={cfg.inner} size={size} />
      )}
      {denomination === 'silver'   && <ShieldDesign color={cfg.inner} size={size} />}
      {denomination === 'copper'   && <CrownDesign  color={cfg.inner} size={size} />}
      {denomination === 'electrum' && <GemDesign    color={cfg.inner} size={size} />}
    </Svg>
  );
}
