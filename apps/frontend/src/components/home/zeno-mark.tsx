"use client";
import { useId } from "react";

// Exact paths extracted from Figma (viewBox 0 0 35.6963 33.9996)
const P1 =
  "M1.91647 0C12.9785 0 29.118 0 34.9753 0C35.6704 0 35.9586 0.890046 35.3907 1.29692L1.62826 25.4469C0.585636 26.0402 -0.507849 24.7518 0.255048 23.8278C5.37493 17.6144 11.5374 7.28143 1.45873 2.04287C0.441534 1.51731 0.780599 0 1.91647 0Z";
const P2 =
  "M33.7797 33.9996C22.7177 33.9996 6.57822 33.9996 0.720863 33.9996C0.0257793 33.9996 -0.262426 33.1095 0.305508 32.7026L34.0679 8.5527C35.1106 7.95934 36.2041 9.24779 35.4412 10.1717C30.3213 16.3851 24.1588 26.7181 34.2375 31.9567C35.2547 32.4822 34.9156 33.9996 33.7797 33.9996Z";

// Pre-computed mask URL for shimmer variant (computed once at module load)
const SHIMMER_MASK_URL = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg viewBox="0 0 35.6963 33.9996" xmlns="http://www.w3.org/2000/svg"><path d="${P1}" fill="black"/><path d="${P2}" fill="black"/></svg>`
)}")`;

type ZenoMarkProps = {
  className?: string;
  /** When true, renders an animated shimmer gradient for loading states */
  shimmer?: boolean;
};

const ZenoMark = ({ className = "", shimmer = false }: ZenoMarkProps) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  if (shimmer) {
    return (
      <div
        aria-hidden="true"
        className={className}
        style={{
          maskImage: SHIMMER_MASK_URL,
          maskSize: "100% 100%",
          maskRepeat: "no-repeat",
          WebkitMaskImage: SHIMMER_MASK_URL,
          WebkitMaskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          background:
            "linear-gradient(90deg, #29DEA9 0%, #ffffff 50%, #29DEA9 100%)",
          backgroundSize: "200% auto",
          animation: "logoShimmer 2s linear infinite",
        }}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 35.6963 33.9996"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`${uid}a`}
          x1="0.000748865"
          y1="12.7997"
          x2="35.6959"
          y2="12.7997"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#00EABD" />
          <stop offset="1" stopColor="#004A3C" />
        </linearGradient>
        <linearGradient
          id={`${uid}b`}
          x1="0.000349354"
          y1="21.1998"
          x2="35.6955"
          y2="21.1998"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#004A3C" />
          <stop offset="1" stopColor="#00EABD" />
        </linearGradient>
      </defs>
      <path d={P1} fill={`url(#${uid}a)`} />
      <path d={P2} fill={`url(#${uid}b)`} />
    </svg>
  );
};

export default ZenoMark;
