import React from 'react';
import Svg, { Ellipse, Path, Line, Circle } from 'react-native-svg';

export default function CoinPurse({ width = 280, height = 320 }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 280 320">
      {/* Main bag body */}
      <Ellipse cx="140" cy="210" rx="110" ry="100" fill="#8B5E3C" />
      {/* Shading on bag */}
      <Ellipse cx="110" cy="200" rx="40" ry="60" fill="#7A5230" opacity="0.4" />
      <Ellipse cx="170" cy="220" rx="30" ry="50" fill="#A0723A" opacity="0.3" />

      {/* Bag opening / neck */}
      <Path
        d="M100 130 Q105 110 140 105 Q175 110 180 130 Q175 155 140 158 Q105 155 100 130Z"
        fill="#6B4226"
      />

      {/* Drawstring tie */}
      <Path
        d="M115 118 Q140 108 165 118"
        stroke="#4A2E1A"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />

      {/* Left string loop */}
      <Path
        d="M115 118 Q95 100 105 85 Q115 72 125 85 Q128 100 120 110"
        stroke="#4A2E1A"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Right string loop */}
      <Path
        d="M165 118 Q185 100 175 85 Q165 72 155 85 Q152 100 160 110"
        stroke="#4A2E1A"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
      />

      {/* Stitch lines on bag */}
      <Line x1="140" y1="160" x2="140" y2="300" stroke="#6B4226" strokeWidth="2" opacity="0.5" strokeDasharray="6,6" />
      <Line x1="80" y1="185" x2="65" y2="280" stroke="#6B4226" strokeWidth="2" opacity="0.3" strokeDasharray="6,6" />
      <Line x1="200" y1="185" x2="215" y2="280" stroke="#6B4226" strokeWidth="2" opacity="0.3" strokeDasharray="6,6" />

      {/* Highlight shine */}
      <Ellipse cx="170" cy="175" rx="18" ry="12" fill="#C8956A" opacity="0.4" />

      {/* Bag bottom shadow */}
      <Ellipse cx="140" cy="305" rx="90" ry="12" fill="#3A1F0A" opacity="0.35" />
    </Svg>
  );
}
