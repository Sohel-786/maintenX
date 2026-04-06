'use client';

import React from 'react';

/**
 * Login page main background SVG (line pattern). Uses CSS mask so the SVG
 * stroke pattern displays in the primary color - manipulates color via
 * backgroundColor (e.g. var(--primary-300)).
 * Full viewport: top, left, right, bottom: 0.
 */
export function LoginMainBackground({
  className,
  color = 'var(--primary-300)',
}: {
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: color,
        WebkitMaskImage: "url('/assets/loginpage_background/mainbackground.svg')",
        maskImage: "url('/assets/loginpage_background/mainbackground.svg')",
        WebkitMaskSize: 'cover',
        maskSize: 'cover',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        opacity: 0.35,
      }}
      aria-hidden
    />
  );
}
