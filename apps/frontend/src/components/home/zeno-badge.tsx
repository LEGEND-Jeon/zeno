"use client";
import { useId } from "react";

const P1 =
  "M1.91647 0C12.9785 0 29.118 0 34.9753 0C35.6704 0 35.9586 0.890046 35.3907 1.29692L1.62826 25.4469C0.585636 26.0402 -0.507849 24.7518 0.255048 23.8278C5.37493 17.6144 11.5374 7.28143 1.45873 2.04287C0.441534 1.51731 0.780599 0 1.91647 0Z";
const P2 =
  "M33.7797 33.9996C22.7177 33.9996 6.57822 33.9996 0.720863 33.9996C0.0257793 33.9996 -0.262426 33.1095 0.305508 32.7026L34.0679 8.5527C35.1106 7.95934 36.2041 9.24779 35.4412 10.1717C30.3213 16.3851 24.1588 26.7181 34.2375 31.9567C35.2547 32.4822 34.9156 33.9996 33.7797 33.9996Z";

const Z_W = 35.6963;
const Z_H = 33.9996;

type ZenoBadgeProps = {
  /** Diameter in px — 30 for sidebar, 40 for chat avatar */
  size: number;
  className?: string;
};

export default function ZenoBadge({ size, className = "" }: ZenoBadgeProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const r = size / 2;
  const zScale = (size * 0.55) / Z_W;
  const tx = (size - Z_W * zScale) / 2;
  const ty = (size - Z_H * zScale) / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${uid}bg`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0A0F0D" />
          <stop offset="65%" stopColor="#101C16" />
          <stop offset="100%" stopColor="#1C3D2C" />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r} fill={`url(#${uid}bg)`} />
      <g transform={`translate(${tx}, ${ty}) scale(${zScale})`}>
        <path d={P1} fill="#29DEA9" />
        <path d={P2} fill="#29DEA9" />
      </g>
    </svg>
  );
}
