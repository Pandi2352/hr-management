import React from 'react';

export interface QuizArenaGlyphProps {
  className?: string;
  weight?: string;
  size?: number | string;
}

/**
 * Custom Quiz Arena Trophy Glyph matching Phosphor and Atrium rail specs:
 * 24x24 grid, 1.5 stroke, round caps/joins, currentColor.
 */
export const QuizArenaGlyph: React.FC<QuizArenaGlyphProps> = ({
  className = 'w-5 h-5',
  weight = 'regular',
  size = 20,
}) => {
  const isFilled = weight === 'duotone' || weight === 'fill';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Cup bowl */}
      <path
        d="M6 4h12v4c0 3.314-2.686 6-6 6s-6-2.686-6-6V4z"
        fill={isFilled ? 'currentColor' : 'none'}
        fillOpacity={isFilled ? 0.2 : 0}
      />
      {/* Left handle */}
      <path d="M6 6H3.5A1.5 1.5 0 0 0 2 7.5v1A3.5 3.5 0 0 0 5.5 12H6" />
      {/* Right handle */}
      <path d="M18 6h2.5A1.5 1.5 0 0 1 22 7.5v1a3.5 3.5 0 0 1-3.5 3.5H18" />
      {/* Stem */}
      <path d="M12 14v4" />
      {/* Base */}
      <path d="M8 18h8v2H8v-2z" fill={isFilled ? 'currentColor' : 'none'} />
    </svg>
  );
};
