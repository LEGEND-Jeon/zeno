export type StaticVariant = {
  id: string;
  name: string;
  previewPath: string;
  primaryColor: string;
  bgColor: string;
  title: string;
  styleKeywords: string[];
};

export const STATIC_VARIANTS: StaticVariant[] = [
  {
    id: "1pink",
    name: "Pink",
    previewPath: "/previews/1pink.html",
    primaryColor: "#FF8B6B",
    bgColor: "#FFFAF7",
    title: "오늘하루 · 따뜻한 일정",
    styleKeywords: ["웜톤", "따뜻함"],
  },
  {
    id: "2purple",
    name: "Purple",
    previewPath: "/previews/2purple.html",
    primaryColor: "#A78BFA",
    bgColor: "#F5F3FF",
    title: "달록",
    styleKeywords: ["모던 퍼플", "정돈됨"],
  },
  {
    id: "3green",
    name: "Green",
    previewPath: "/previews/3green.html",
    primaryColor: "#3ECFA0",
    bgColor: "#FAFAF7",
    title: "민트 플래너",
    styleKeywords: ["민트 그린", "상쾌함"],
  },
  {
    id: "4yellow",
    name: "Yellow",
    previewPath: "/previews/4yellow.html",
    primaryColor: "#FFD166",
    bgColor: "#FFFBF0",
    title: "오늘",
    styleKeywords: ["선샤인", "에너지"],
  },
];
