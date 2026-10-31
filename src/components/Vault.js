import React from 'react';
import Svg, { Rect, Circle, Line, Ellipse, Path } from 'react-native-svg';

export default function Vault({ width = 300, height = 300 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 300 300">
      {/* ── Vault wall / frame ── */}
      <Rect x="10" y="10" width="280" height="280" rx="12" fill="#2C2C2C" />
      <Rect x="18" y="18" width="264" height="264" rx="10" fill="#3A3A3A" />

      {/* ── Vault door circle ── */}
      <Circle cx="150" cy="148" r="110" fill="#4A4A4A" />
      <Circle cx="150" cy="148" r="104" fill="#525252" />

      {/* Bolt holes around the edge */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 150 + 90 * Math.cos(rad);
        const y = 148 + 90 * Math.sin(rad);
        return <Circle key={i} cx={x} cy={y} r="7" fill="#3A3A3A" />;
      })}

      {/* ── Spoke wheel ── */}
      {[0, 45, 90, 135].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 150 + 60 * Math.cos(rad);
        const y1 = 148 + 60 * Math.sin(rad);
        const x2 = 150 - 60 * Math.cos(rad);
        const y2 = 148 - 60 * Math.sin(rad);
        return (
          <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#2A2A2A" strokeWidth="10" strokeLinecap="round" />
        );
      })}

      {/* Wheel outer ring */}
      <Circle cx="150" cy="148" r="62" fill="none" stroke="#2A2A2A" strokeWidth="10" />

      {/* Wheel inner hub */}
      <Circle cx="150" cy="148" r="18" fill="#3A3A3A" />
      <Circle cx="150" cy="148" r="10" fill="#2A2A2A" />
      <Circle cx="150" cy="148" r="5" fill="#606060" />

      {/* ── Handle bar ── */}
      <Rect x="218" y="138" width="30" height="20" rx="10" fill="#5A5A5A" />
      <Rect x="220" y="141" width="26" height="14" rx="7" fill="#6A6A6A" />

      {/* ── Shine / reflection ── */}
      <Ellipse cx="115" cy="105" rx="25" ry="15" fill="#ffffff" opacity="0.06" />

      {/* ── Combination dial ── */}
      <Circle cx="150" cy="148" r="28" fill="#484848" />
      <Circle cx="150" cy="148" r="24" fill="#505050" />
      {[0,60,120,180,240,300].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = 150 + 18 * Math.cos(rad);
        const y = 148 + 18 * Math.sin(rad);
        return <Circle key={i} cx={x} cy={y} r="2" fill="#888" />;
      })}
      <Circle cx="150" cy="148" r="6" fill="#707070" />

      {/* ── Shadow under vault ── */}
      <Ellipse cx="150" cy="295" rx="120" ry="8" fill="#000" opacity="0.4" />
    </Svg>
  );
}
