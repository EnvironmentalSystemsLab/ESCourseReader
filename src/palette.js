// SVG presentation colors inherit the reader's color scheme. A standalone SVG
// defaults to the light palette; print styles also select light explicitly.
const pair = (light, dark) => `light-dark(${light}, ${dark})`;
export const diagramColors = {
  ink: pair('#26333e', '#edf4fa'),
  green: pair('#007c9a', '#6bd8f0'),
  muted: pair('#607181', '#aabccb'),
  grid: pair('#ccdce7', '#3f5262'),
  fineGrid: pair('#dce7ee', '#344552'),
  axis: pair('#a6bdce', '#6b879b'),
  gold: pair('#2479ad', '#8bcfff'),
  sun: pair('#65c9f2', '#9de8ff'),
  blue: pair('#52748f', '#a7c2d8'),
  red: pair('#b13d4c', '#ff9daa'),
  ground: pair('#eaf2f8', '#293741'),
  shadow: pair('#4583a4', '#7bbbdc'),
  face: pair('#8cb4cc', '#46728d'),
  side: pair('#bdd7e7', '#315367'),
  roof: pair('#e8f4fb', '#6d9fba'),
  buildingEdge: pair('#507d96', '#9bc6dd'),
  interior: pair('#f8fbfd', '#222e37'),
  directSun: pair('#88dcf4', '#8edff5'),
  wall: pair('#9cb5c7', '#66869c'),
  glass: pair('#7ac5e6', '#76c9f0'),
  canopy: pair('#2e647e', '#8acde9'),
  mask: pair('#bfcbd5', '#627787'),
  maskEdge: pair('#8298aa', '#a4b8c7'),
  halo: pair('#ffffff', '#202124'),
  neighbor: pair('#dbe4eb', '#3f5261'),
  overlap: pair('#efcbd0', '#71424d'),
  westWing: pair('#b7dcec', '#436c83'),
  eastWing: pair('#3e7c9d', '#81c9e8'),
  wingLabel: pair('#ffffff', '#17313f'),
  // Solar-geometry chapter: one hue per angle, used in text, equations, and drawings.
  alt: pair('#2479ad', '#8bcfff'),
  azi: pair('#007c9a', '#6bd8f0'),
  third: pair('#6a4fb3', '#c3b2ff'),
  june: pair('#2479ad', '#8bcfff'),
  march: pair('#007c9a', '#6bd8f0'),
  december: pair('#52748f', '#a7c2d8'),
  night: pair('#d6dee5', '#151a1f'),
  earth: pair('#cfe6f3', '#2c4a5c'),
  paper: pair('#ffffff', '#202124'),
  // Climate principle drawings: heat and sun (warm role) vs water, snow and air (cool role).
  heat: pair('#1f6fa3', '#8bcfff'),
  heatFill: pair('#5aa7d8', '#3f8fc2'),
  heatSoft: pair('#d3e8f6', '#2b4d63'),
  waterFill: pair('#a3dde2', '#2a7884'),
};

// Plain light colors for standalone, editable SVG files (Illustrator, Inkscape, Keynote).
export const diagramHex = Object.fromEntries(Object.entries(diagramColors).map(([k, v]) => [k, v.match(/#[0-9a-f]{6}/i)[0]]));
export const colorsFor = standalone => standalone ? diagramHex : diagramColors;

// Turbo polynomial approximation. Copyright 2019 Google LLC, Apache-2.0.
// Colormap: Anton Mikhailov. Approximation: Ruofei Du.
// Adapted from GLSL to JavaScript with clamped sRGB output for this reader.
// License: ../assets/licenses/Apache-2.0.txt
// https://gist.github.com/mikhailov-work/0d177465a8151eb6ede1768d51d476c7
const coefficients = [
  [0.13572138, 4.61539260, -42.66032258, 132.13108234, -152.94239396, 59.28637943],
  [0.09140261, 2.19418839, 4.84296658, -14.18503333, 4.27729857, 2.82956604],
  [0.10667330, 12.64194608, -60.58204836, 110.36276771, -89.90310912, 27.34824973],
];
export function turbo(value) {
  const t = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const channels = coefficients.map(terms => {
    const value = terms.reduceRight((sum, coefficient) => sum * t + coefficient, 0);
    return Math.round(Math.max(0, Math.min(1, value)) * 255);
  });
  return `rgb(${channels.join(', ')})`;
}
