'use client';

import React from 'react';

/**
 * Login page background SVG (ellipses). Use currentColor so parent can set
 * color to primary (e.g. className="text-primary-200" or style with var(--primary)).
 */
export function LoginBackground1({ className }: { className?: string }) {
  return (
    <svg
      width="1920"
      height="862"
      viewBox="0 0 1920 862"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <g opacity="0.22" filter="url(#filter0_f_bg1)">
        <ellipse
          cx="205.149"
          cy="367.763"
          rx="205.149"
          ry="367.763"
          transform="matrix(-0.0841689 0.996451 -0.994379 -0.105877 2308.93 685.254)"
          fill="currentColor"
        />
      </g>
      <g opacity="0.28" filter="url(#filter1_f_bg1)">
        <ellipse
          cx="275.528"
          cy="493.93"
          rx="275.528"
          ry="493.93"
          transform="matrix(-0.0841689 0.996451 -0.994379 -0.105877 639.688 -128.408)"
          fill="currentColor"
        />
      </g>
      <g opacity="0.28" filter="url(#filter2_f_bg1)">
        <ellipse
          cx="275.528"
          cy="493.93"
          rx="275.528"
          ry="493.93"
          transform="matrix(-0.0841689 0.996451 -0.994379 -0.105877 991.688 513.582)"
          fill="currentColor"
        />
      </g>
      <defs>
        <filter
          id="filter0_f_bg1"
          x="1359.85"
          y="442.604"
          width="1132.22"
          height="816.268"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur_4980_50530" />
        </filter>
        <filter
          id="filter1_f_bg1"
          x="-866.366"
          y="-685.691"
          width="1983.42"
          height="1559.08"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="250" result="effect1_foregroundBlur_4980_50530" />
        </filter>
        <filter
          id="filter2_f_bg1"
          x="-514.366"
          y="-43.7012"
          width="1983.42"
          height="1559.08"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="250" result="effect1_foregroundBlur_4980_50530" />
        </filter>
      </defs>
    </svg>
  );
}
