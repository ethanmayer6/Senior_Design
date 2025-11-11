import React from "react";
import type { Course } from "../types/course";
import RibbonSVG1 from "../assets/badge-ribbon-2point.svg?react";
import RibbonSVG2 from "../assets/badge-ribbon-2point-curve.svg?react";
import RibbonSVG3 from "../assets/badge-ribbon-3point.svg?react";
import MedalSVG from "../assets/badge-medal-hexagon-inner.svg?react";
import MedalOuterSVG from "../assets/badge-medal-hexagon.svg?react";
import DesignSVG1 from "../assets/badge-design-1star.svg?react";
import DesignSVG2 from "../assets/badge-design-2star.svg?react";
import DesignSVG3 from "../assets/badge-design-3star.svg?react";
import DesignSVG4 from "../assets/badge-design-4star.svg?react";

// ------------------------
// String → Color Utilities
// ------------------------

function digitToRibbonColor(digit: string): string {
  switch (digit) {
    case "1":
      return "#b07c41ff"; // 
    case "2":
      return "#bdc1c5ff"; // 
    case "3":
      return "#f0cd31ff"; // 
    case "4":
      return "#08a4ddff"; // 
    case "5":
      return "#780adfff"; // 
    default:
      return "#ff0000ff"; // fallback red
  }
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = (Math.abs(hash) % 360);
  const s = 70 + (Math.abs(hash) % 20);
  const l = 70 + (Math.abs(hash) % 10);

  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return (
    "#" +
    f(0).toString(16).padStart(2, "0") +
    f(8).toString(16).padStart(2, "0") +
    f(4).toString(16).padStart(2, "0")
  );
}

const designMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  "1": DesignSVG1,
  "2": DesignSVG2,
  "3": DesignSVG3,
  "4": DesignSVG4,
};

const ribbonMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  "0": RibbonSVG1,
  "1": RibbonSVG2,
  "2": RibbonSVG3,
};


// ------------------------
// Extract badge colors from a Course
// ------------------------
export function getBadgeColors(course: Course) {
  const [prefix = "XX", code = "0000"] = course.courseIdent.split("_");
  const firstDigit = code.slice(0, 1);
  const thirdDigit = code.slice(2, 3);
  const lastThree = code.slice(1,4);
  const index = parseInt(thirdDigit) % 3; // 0, 1, or 2
  const SelectedRibbonSVG = ribbonMap[index] || RibbonSVG1;
  const SelectedDesignSVG = designMap[firstDigit] || DesignSVG1;



  return {
    designColor: stringToColor(lastThree),
    medalColor: stringToColor(prefix),
    medalOuterColor: stringToColor(prefix.split("").reverse().join("")),
    ribbonColor: digitToRibbonColor(firstDigit),
    prefix,
    firstDigit,
    lastThree,
    SelectedRibbonSVG,
    SelectedDesignSVG,
  };
}

// ------------------------
// Badge Component
// ------------------------
type BadgeProps = {
  course: Course;
  strokeColor?: string;
  strokeWidth?: number;
  size?: number | string;
};

export const Badge: React.FC<BadgeProps> = ({
  course,
  strokeColor = "#000000",
  strokeWidth = 2,
  size = 96, // default pixel size
}) => {
  const { designColor, medalColor, ribbonColor, medalOuterColor, SelectedRibbonSVG, SelectedDesignSVG, } = getBadgeColors(course);
  const numericSize = Number(size) || 96;
  return (
        <svg
          viewBox="0 30 128 160"
          width={numericSize}
          height={(numericSize / 128) * 160} // keep the aspect ratio
          className="transition-transform duration-500 hover:scale-120 hover:rotate-3"
        >
          {/* Ribbon (bottom layer) */}
          <g
            transform="translate(0, 30)"
          >
            <SelectedRibbonSVG
              fill={ribbonColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>

            {/* Medal (middle layer) */}
          <g
            transform="translate(0, 30)"
          >
            <MedalOuterSVG
              fill={medalOuterColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>

          {/* Medal (middle layer) */}
          <g
            transform="translate(0, 30)"
          >
            <MedalSVG
              fill={medalColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          </g>

          {/* Design (top center) */}
          <g
            transform="translate(12, 30)"
          >
            <SelectedDesignSVG
              fill={designColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              width="80%"
            />
          </g>
        </svg>     
  );
};
