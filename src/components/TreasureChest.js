import React from 'react';
import Svg, { Rect, Path, Line, Circle, Ellipse } from 'react-native-svg';

export default function TreasureChest({ width = 300, height = 300 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 300 300">
      {/* ── Chest base ── */}
      <Rect x="20" y="170" width="260" height="110" rx="8" fill="#7B4A1E" />
      <Line x1="20" y1="205" x2="280" y2="205" stroke="#5C3410" strokeWidth="3" />
      <Line x1="20" y1="240" x2="280" y2="240" stroke="#5C3410" strokeWidth="3" />
      <Rect x="20" y="168" width="260" height="14" rx="4" fill="#B8860B" />
      <Rect x="20" y="268" width="260" height="12" rx="4" fill="#B8860B" />
      <Circle cx="38" cy="175" r="5" fill="#DAA520" />
      <Circle cx="262" cy="175" r="5" fill="#DAA520" />
      <Circle cx="38" cy="275" r="5" fill="#DAA520" />
      <Circle cx="262" cy="275" r="5" fill="#DAA520" />

      {/* ── Open lid ── */}
      <Path d="M20 170 Q20 80 150 60 Q280 80 280 170Z" fill="#8B5A2B" />
      <Path d="M30 155 Q150 130 270 155" stroke="#5C3410" strokeWidth="3" fill="none" />
      <Path d="M40 135 Q150 105 260 135" stroke="#5C3410" strokeWidth="3" fill="none" />
      <Path d="M55 115 Q150 82 245 115" stroke="#5C3410" strokeWidth="3" fill="none" />
      <Path d="M20 170 Q150 145 280 170 L280 158 Q150 133 20 158Z" fill="#B8860B" />
      <Path d="M55 68 Q150 52 245 68 Q245 80 150 65 Q55 80 55 68Z" fill="#B8860B" />

      {/* ── Inside of chest ── */}
      <Rect x="28" y="172" width="244" height="94" rx="4" fill="#3D1F08" />
      <Rect x="28" y="172" width="244" height="20" rx="2" fill="#2A1505" opacity="0.6" />

      {/* ── Front latch ── */}
      <Rect x="130" y="162" width="40" height="22" rx="5" fill="#DAA520" />
      <Rect x="136" y="167" width="28" height="12" rx="3" fill="#B8860B" />
      <Circle cx="150" cy="173" r="4" fill="#FFD700" />

      {/* ── Shadow ── */}
      <Ellipse cx="150" cy="286" rx="120" ry="10" fill="#1a0a00" opacity="0.4" />
    </Svg>
  );
}
