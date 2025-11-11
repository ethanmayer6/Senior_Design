import type {Course} from "../types/course";

function stringToColor(str: string): string {
  // Simple string hash → 32-bit integer
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert to HSL for pleasant colors
  const h = Math.abs(hash) % 360; // hue
  const s = 60 + (Math.abs(hash) % 20); // saturation 60–80%
  const l = 45 + (Math.abs(hash) % 10); // lightness 45–55%

  // Convert to HEX for easy use
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return `#${f(0).toString(16).padStart(2, "0")}${f(8)
    .toString(16)
    .padStart(2, "0")}${f(4).toString(16).padStart(2, "0")}`;
}

export function getBadgeColors(course: Course) {
  const [prefix, code] = course.courseIdent.split(" "); // "SE", "4030"
  const firstTwo = code.slice(0, 2); // "40"
  const lastTwo = code.slice(2);     // "30"

  return {
    designColor: stringToColor(prefix),
    medalColor: stringToColor(firstTwo),
    ribbonColor: stringToColor(lastTwo),
  };
}

