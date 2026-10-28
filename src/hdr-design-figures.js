// Fine-liner figures for Chapter 06, Section 07: seven design questions an HDR can answer.
// Same ink kit as the rest of the chapter: luminance in the ALT blue, illuminance in the AZI
// cyan, thresholds in red, comparisons in the third (violet) pencil. Values marked
// "illustrative" are drawn to explain a metric; they are not measurements.
import { svgDocument, f } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';

const RAD = Math.PI / 180;
const lines = (k, x, y, arr, o = {}) => arr.map((t, i) => k.text(x, y + i * (o.step ?? 18), t, { size: 12, ...o })).join('');
const ray = (k, a, b, color, name, width = 1.4) => k.line(a, b, { stroke: color, width, arrow: name });

/** Angular (equidistant) fisheye: θ from the view direction maps linearly to the radius. */
function fisheye(k, C, R, rings = [30, 60]) {
  const c = k.c;
  let g = k.circle(C, R, { fill: c.paper, stroke: c.ink, width: PEN.profile });
  for (const t of rings) g += k.circle(C, R * t / 90, { stroke: c.axis, width: PEN.pencil, dash: '3 4' });
  g += k.line({ x: C.x - R, y: C.y }, { x: C.x + R, y: C.y }, { stroke: c.axis, dash: '3 4' }) + k.line({ x: C.x, y: C.y - R }, { x: C.x, y: C.y + R }, { stroke: c.axis, dash: '3 4' });
  return g;
}
/** A point in the fisheye at θ from the center, toward screen angle φ (0 = right, 90 = up). */
const fp = (C, R, theta, phi) => ({ x: C.x + R * theta / 90 * Math.cos(phi * RAD), y: C.y - R * theta / 90 * Math.sin(phi * RAD) });

/** One-point perspective of a box room, with a window on the left wall. */
function roomView(k, x, y, w, h, o = {}) {
  const c = k.c, i = { x: x + w * .3, y: y + h * .28, w: w * .4, h: h * .44 };
  const A = { x, y }, B = { x: x + w, y }, Cc = { x: x + w, y: y + h }, D = { x, y: y + h };
  const a = { x: i.x, y: i.y }, b = { x: i.x + i.w, y: i.y }, cc = { x: i.x + i.w, y: i.y + i.h }, d = { x: i.x, y: i.y + i.h };
  let g = k.rect(x, y, w, h, { stroke: c.ink, width: PEN.outline });
  g += k.polygon([a, b, cc, d], { stroke: c.ink, width: PEN.edge }) + k.line(A, a, { width: PEN.edge }) + k.line(B, b, { width: PEN.edge }) + k.line(Cc, cc, { width: PEN.edge }) + k.line(D, d, { width: PEN.edge });
  const t = s => ({ x: x + (i.x - x) * s, y: y + (i.y - y) * s }), u = s => ({ x: x + (d.x - x) * s, y: y + h + (d.y - y - h) * s });
  const win = [{ ...t(.25), y: t(.25).y + (u(.25).y - t(.25).y) * .25 }, { ...t(.75), y: t(.75).y + (u(.75).y - t(.75).y) * .25 }, { ...u(.75), y: t(.75).y + (u(.75).y - t(.75).y) * .7 }, { ...u(.25), y: t(.25).y + (u(.25).y - t(.25).y) * .7 }];
  g += k.polygon(win, { fill: o.windowFill ?? c.glass, stroke: c.ink, width: PEN.edge });
  if (o.floor) g += k.polygon([D, d, cc, Cc], { fill: o.floor });
  if (o.ceiling) g += k.polygon([A, a, b, B], { fill: o.ceiling });
  return { g, back: { x: i.x + i.w / 2, y: i.y + i.h / 2 }, ceil: { x: x + w / 2, y: y + h * .12 }, floor: { x: x + w / 2, y: y + h * .88 }, win: { x: (win[0].x + win[2].x) / 2, y: (win[0].y + win[2].y) / 2 } };
}

/* 1 · Glare */
export function figUseGlare(standalone = false) {
  const k = kit(standalone, 'ug'), c = k.c, C = { x: 230, y: 250 }, R = 180;
  let fe = k.title(40, 36, 'A · 180° fisheye at the eye, along the gaze') + fisheye(k, C, R);
  // Window on the left of the view, the sun inside it.
  const win = [fp(C, R, 72, 150), fp(C, R, 40, 135), fp(C, R, 40, 205), fp(C, R, 72, 200)];
  fe += k.path(`M${f(win[0].x)},${f(win[0].y)} Q${f(win[0].x + 40)},${f(win[0].y - 22)} ${f(win[1].x)},${f(win[1].y)} L${f(win[2].x)},${f(win[2].y)} Q${f(win[3].x + 40)},${f(win[3].y + 18)} ${f(win[3].x)},${f(win[3].y)} Z`, { fill: c.glass, stroke: c.red, width: 1.8 });
  const sun = fp(C, R, 58, 160);
  fe += k.circle(sun, 9, { fill: c.sun });
  fe += k.line(C, sun, { stroke: c.third, width: 1.2 }) + k.label((C.x + sun.x) / 2 - 4, (C.y + sun.y) / 2 - 12, 'P (position)', { size: 11, fill: c.third, weight: 600 });
  const task = { x: C.x + 30, y: C.y + 70 };
  fe += k.rect(C.x - 110, C.y + 100, 240, 12, { fill: c.paper, stroke: c.ink, width: PEN.edge }) + k.circle(task, 34, { stroke: c.azi, width: 1.4, dash: '4 3' }) + k.label(task.x + 40, task.y + 4, 'task zone', { size: 11, fill: c.azi, weight: 600 });
  fe += k.label(42, 70, 'glare source: Ls, ωs', { size: 12, fill: c.red, weight: 700 }) + k.line({ x: 92, y: 76 }, { x: 116, y: 156 }, { stroke: c.red, width: .8 });
  fe += k.label(C.x + 8, C.y + 16, 'view direction', { size: 11 });
  // B: DGP scale with two design alternatives.
  const x0 = 520, x1 = 940, X = v => x0 + (v - .25) / .3 * (x1 - x0), y = 120;
  let sc = k.title(x0, 36, 'B · DGP for two design moves (illustrative)');
  for (const [a, b, fill, name] of [[.25, .35, c.paper, 'imperceptible'], [.35, .40, c.glass, 'perceptible'], [.40, .45, c.face, 'disturbing'], [.45, .55, c.shadow, 'intolerable']]) {
    sc += k.rect(X(a), y, X(b) - X(a), 26, { fill, stroke: c.ink, width: PEN.hatch }) + k.text((X(a) + X(b)) / 2, y - 8, name, { size: 10.5, anchor: 'middle', fill: c.ink });
  }
  for (const v of [.25, .35, .4, .45, .55]) sc += k.text(X(v), y + 42, v.toFixed(2), { size: 10.5, anchor: 'middle' });
  for (const [v, t, row] of [[.48, 'A · desk facing the window, clear glass', 0], [.33, 'B · desk turned 90°, external blind', 1]]) {
    const yy = y + 66 + row * 40;
    sc += k.polygon([{ x: X(v), y: y + 28 }, { x: X(v) - 6, y: y + 38 }, { x: X(v) + 6, y: y + 38 }], { fill: c.paper, stroke: c.third, width: 1.2 }) + k.line({ x: X(v), y: y + 48 }, { x: X(v), y: yy - 12 }, { stroke: c.third, width: 1, dash: '2 3' });
    sc += k.label(X(v), yy, `${t}: ${v.toFixed(2)}`, { size: 11.5, anchor: v > .4 ? 'end' : 'start', fill: c.third, weight: 600 });
  }
  sc += lines(k, x0, 280, ['Report with DGP: Ev at the lens, and each source’s Ls, ωs and', 'position. Source detection in evalglare: luminance above', '5 × the task-zone mean (-T), or a fixed 2,000 cd/m² (-b 2000).', '', 'UGR is for electric lighting; ~19 is a common office limit.', 'A clipped sun underestimates Ls² ωs, and with it DGP.'], { fill: c.ink });
  return svgDocument(k, { width: 980, height: 450, title: 'Glare: sources in the fisheye view and the DGP scale', body: k.group('fisheye', fe) + k.group('dgp-scale', sc) });
}

/* 2 · Perceived brightness */
export function figUseBrightness(standalone = false) {
  const k = kit(standalone, 'ub'), c = k.c;
  const room = (x0, title, walls, floor, Lband, verdict) => {
    const floorY = 320, ceilY = 90, x1 = x0 + 400, eye = { x: x0 + 110, y: floorY - 120 };
    let g = k.title(x0, 36, title);
    g += k.rect(x0, floorY, 400, 12, { fill: c.shadow }) + k.rect(x0, ceilY - 12, 400, 12, { fill: c.shadow }) + k.rect(x0 - 12, ceilY - 12, 12, 70, { fill: c.shadow }) + k.rect(x0 - 12, 200, 12, 132, { fill: c.shadow }) + k.rect(x0 - 8, 148, 4, 52, { fill: c.glass, stroke: c.ink, width: PEN.edge });
    // Surfaces: wall and floor finishes (hatching = darker finish).
    g += k.rect(x1 - 22, ceilY, 22, floorY - ceilY, { fill: walls, stroke: c.ink, width: PEN.outline }) + k.text(x1 - 30, ceilY + 18, walls === c.paper ? 'light finish, ρ ≈ 0.8' : 'dark finish, ρ ≈ 0.2', { size: 11, anchor: 'end', fill: c.ink }) + k.rect(x0, floorY - 10, 400, 10, { fill: floor, stroke: c.ink, width: PEN.edge });
    // Desk and its horizontal illuminance.
    g += k.rect(x0 + 40, 250, 130, 7, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.line({ x: x0 + 48, y: 257 }, { x: x0 + 48, y: floorY - 10 }, { width: PEN.edge }) + k.line({ x: x0 + 162, y: 257 }, { x: x0 + 162, y: floorY - 10 }, { width: PEN.edge });
    g += k.label(x0 + 60, 242, 'Eh = 500 lx', { size: 11.5, fill: c.azi, weight: 700 });
    // Eye and the 40° band (±20° about horizontal).
    const t = Math.tan(20 * RAD), d = x1 - 22 - eye.x, top = { x: x1 - 22, y: eye.y - d * t }, bot = { x: x1 - 22, y: eye.y + d * t };
    g += k.polygon([eye, top, bot], { fill: c.glass, stroke: c.alt, width: 1.2 }) + k.circle(eye, 6, { fill: c.paper, stroke: c.ink, width: PEN.outline });
    g += k.line({ x: x1 - 22, y: top.y }, { x: x1 - 22, y: bot.y }, { stroke: c.alt, width: 3.5 }) + k.arc(eye.x, eye.y, 60, -20, 20, { stroke: c.alt, width: 1.4 }) + k.label(eye.x + 66, eye.y - 22, '40°', { size: 11, fill: c.alt, weight: 700 });
    g += k.label(x0 + 200, 370, `40° band mean: ${Lband} cd/m²`, { size: 13, anchor: 'middle', fill: c.alt, weight: 700 }) + k.text(x0 + 200, 390, verdict, { size: 12, anchor: 'middle', fill: c.ink });
    return g;
  };
  const a = room(40, 'A · Dark walls, light floor', c.face, c.paper, 18, 'below ~30: reads gloomy');
  const b = room(540, 'B · Light walls, dark floor', c.paper, c.face, 46, 'above ~30: reads adequately lit');
  const note = k.text(40, 428, 'Same window, same desk illuminance. Where the light lands, within the band people look at, decides the impression. Values illustrative.', { size: 12 });
  return svgDocument(k, { width: 980, height: 445, title: 'Perceived brightness: mean luminance in the 40° horizontal band', body: k.group('dark-walls', a) + k.group('light-walls', b) + k.group('note', note) });
}

/* 3 · Contrast and variability */
export function figUseContrast(standalone = false) {
  const k = kit(standalone, 'uc'), c = k.c;
  // A: task, surround and periphery.
  let z = k.title(40, 36, 'A · Luminance ratios');
  z += k.rect(40, 60, 400, 260, { fill: c.glass, stroke: c.ink, width: PEN.outline }) + k.rect(120, 130, 240, 140, { fill: c.paper, stroke: c.ink, width: PEN.edge, dash: '5 4' }) + k.rect(190, 175, 100, 55, { fill: c.paper, stroke: c.alt, width: 2.2 });
  z += k.text(240, 207, 'task', { size: 12, anchor: 'middle', fill: c.alt, weight: 700 }) + k.label(240, 152, 'surround', { size: 12, anchor: 'middle', fill: c.ink }) + k.label(240, 84, 'periphery', { size: 12, anchor: 'middle', fill: c.ink });
  z += lines(k, 40, 350, ['IES ballpark, task : surround : periphery ≈ 1 : 1/3 : 1/10.', 'Beyond it, the eye keeps re-adapting: a bright window', 'in the periphery or a dark wall behind a screen.'], { fill: c.ink });
  // B: log-luminance histograms.
  const hx = 520, hw = 420;
  const hist = (y0, bins, label, sigma, word) => {
    const H = 90, max = Math.max(...bins), w = hw / bins.length;
    let g = k.line({ x: hx, y: y0 + H }, { x: hx + hw, y: y0 + H }, { stroke: c.ink, width: PEN.outline });
    bins.forEach((v, i) => { if (v > .01) g += k.rect(hx + i * w, y0 + H - v / max * H, w, v / max * H, { fill: c.paper, stroke: c.alt, width: 1 }); });
    g += k.text(hx + hw, y0 + 8, label, { size: 12, anchor: 'end', fill: c.ink, weight: 700 }) + k.text(hx + hw, y0 + 24, `σ(log₁₀ L) ≈ ${sigma} · ${word}`, { size: 11.5, anchor: 'end', fill: c.third, weight: 600 });
    return g;
  };
  const n = 32, gauss = (m, s) => i => Math.exp(-(((i + .5) / n * 4 - m) ** 2) / (2 * s * s));
  const calm = Array.from({ length: n }, (_, i) => gauss(1.8, .25)(i)), drama = Array.from({ length: n }, (_, i) => gauss(.9, .3)(i) + .7 * gauss(3.2, .25)(i) + .25 * gauss(2, .5)(i));
  let h = k.title(hx, 36, 'B · Log-luminance histogram of the view');
  h += hist(60, calm, 'calm: diffuse, even', '0.25', 'narrow') + hist(200, drama, 'dramatic: sun patch, deep shade', '0.9', 'wide');
  for (let e = 0; e <= 4; e++) { const x = hx + e / 4 * hw; h += k.line({ x, y: 290 }, { x, y: 296 }, { stroke: c.ink, width: PEN.edge }) + k.text(x, 310, ['1', '10', '100', '1,000', '10,000'][e], { size: 10.5, anchor: 'middle' }); }
  h += k.text(hx + hw / 2, 328, 'L  [cd/m², log scale]', { size: 11, anchor: 'middle', fill: c.alt });
  h += lines(k, hx, 356, ['Spatial contrast (Rockcastle and Andersen) sums luminance', 'differences between neighboring pixels at several image', 'resolutions: high for sharp light and shadow patterns.'], { fill: c.ink });
  return svgDocument(k, { width: 980, height: 420, title: 'Contrast: luminance ratios and the spread of the log-luminance histogram', body: k.group('ratios', z) + k.group('histograms', h) });
}

/* 4 · Change over a day */
export const DAY = Array.from({ length: 11 }, (_, i) => {
  const t = 8 + i;
  return { t, band: 22 + 70 * Math.exp(-(((t - 15.2) / 2.6) ** 2)), dgp: .24 + .27 * Math.exp(-(((t - 16.2) / 1.25) ** 2)) };
});
export function figUseDynamics(standalone = false) {
  const k = kit(standalone, 'ud'), c = k.c, x0 = 110, x1 = 900, X = t => x0 + (t - 8) / 10 * (x1 - x0);
  let g = k.title(40, 36, 'West-facing studio, clear autumn day: one calibrated capture per hour (illustrative)');
  for (const d of DAY) g += k.circle({ x: X(d.t), y: 64 }, 7, { fill: c.paper, stroke: c.ink, width: PEN.edge }) + k.text(X(d.t), 88, `${d.t}:00`, { size: 10.5, anchor: 'middle' });
  // Panel 1: 40° band mean.
  const p1 = { y0: 110, y1: 230, max: 120 }, Y1 = v => p1.y1 - v / p1.max * (p1.y1 - p1.y0);
  g += k.line({ x: x0, y: p1.y1 }, { x: x1, y: p1.y1 }, { width: PEN.outline }) + k.line({ x: x0, y: p1.y0 }, { x: x0, y: p1.y1 }, { width: PEN.outline });
  g += k.line({ x: x0, y: Y1(30) }, { x: x1, y: Y1(30) }, { stroke: c.red, width: 1.2, dash: '5 4' }) + k.label(x0 + 6, Y1(30) - 6, '30 cd/m²', { size: 11, fill: c.red, weight: 600 });
  for (const v of [0, 60, 120]) g += k.text(x0 - 8, Y1(v) + 4, String(v), { size: 10.5, anchor: 'end' });
  g += k.polyline(DAY.map(d => ({ x: X(d.t), y: Y1(d.band) })), { stroke: c.alt, width: 2.2 }) + DAY.map(d => k.circle({ x: X(d.t), y: Y1(d.band) }, 3, { fill: c.alt })).join('');
  g += lines(k, 30, p1.y0 + 10, ['40° band', 'mean L', '[cd/m²]'], { size: 11, fill: c.alt, step: 14 });
  // Panel 2: DGP with hours above 0.40.
  const p2 = { y0: 260, y1: 380, min: .2, max: .55 }, Y2 = v => p2.y1 - (v - p2.min) / (p2.max - p2.min) * (p2.y1 - p2.y0);
  g += k.line({ x: x0, y: p2.y1 }, { x: x1, y: p2.y1 }, { width: PEN.outline }) + k.line({ x: x0, y: p2.y0 }, { x: x0, y: p2.y1 }, { width: PEN.outline });
  const above = DAY.filter(d => d.dgp >= .4);
  for (const d of above) g += k.rect(X(d.t) - 28, p2.y0, 56, p2.y1 - p2.y0, { fill: c.glass });
  g += k.line({ x: x0, y: Y2(.4) }, { x: x1, y: Y2(.4) }, { stroke: c.red, width: 1.2, dash: '5 4' }) + k.label(x0 + 6, Y2(.4) - 6, 'DGP 0.40', { size: 11, fill: c.red, weight: 600 });
  g += k.polyline(DAY.map(d => ({ x: X(d.t), y: Y2(d.dgp) })), { stroke: c.third, width: 2.2 }) + DAY.map(d => k.circle({ x: X(d.t), y: Y2(d.dgp) }, 3, { fill: c.third })).join('');
  g += lines(k, 30, p2.y0 + 10, ['DGP'], { size: 11, fill: c.third });
  for (const v of [.2, .3, .4, .5]) g += k.text(x0 - 8, Y2(v) + 4, v.toFixed(1), { size: 10.5, anchor: 'end' });
  g += k.label(X(above[0].t) - 32, p2.y0 + 16, `${above.length} of ${DAY.length} captures ≥ 0.40`, { size: 11.5, anchor: 'end', fill: c.ink, weight: 700 });
  g += k.text(40, 412, 'Morning: calm and dim. Late afternoon: low sun brightens the band, then crosses into glare. A single midday capture would miss both.', { size: 12 });
  return svgDocument(k, { width: 960, height: 425, title: 'Change over a day: 40° band luminance and DGP from hourly captures', body: k.group('timeline', g) });
}

/* 5 · Reflectance of a material */
export function figUseReflectance(standalone = false) {
  const k = kit(standalone, 'ur'), c = k.c;
  let a = k.title(40, 36, 'A · Reflectance from L and E');
  a += k.rect(420, 60, 14, 300, { fill: c.shadow }) + k.rect(400, 150, 20, 90, { fill: c.paper, stroke: c.ink, width: PEN.outline }) ;
  a += k.text(300, 146, 'matte sample', { size: 11.5, anchor: 'end', fill: c.ink }) + k.line({ x: 304, y: 143 }, { x: 398, y: 158 }, { stroke: c.ink, width: PEN.hatch });
  // Lambertian: the same L in every direction.
  for (let a2 = 110; a2 <= 250; a2 += 35) a += k.line({ x: 398, y: 195 }, { x: 398 + 70 * Math.cos(a2 * RAD), y: 195 - 70 * Math.sin(a2 * RAD) }, { stroke: c.alt, width: 1, arrow: 'alt' });
  a += k.arc(398, 195, 70, 90, 270, { stroke: c.alt, width: 1, dash: '3 3' });
  a += k.label(300, 116, 'diffuse: same L in all directions', { size: 11, fill: c.alt, anchor: 'end' });
  // Lux sensor flat on the wall beside the sample.
  a += k.rect(408, 262, 12, 34, { fill: c.paper, stroke: c.azi, width: 2 }) + k.text(398, 330, 'lux sensor on the wall, facing out: E', { size: 11.5, anchor: 'end', fill: c.azi, weight: 600 });
  for (const y of [240, 270, 300]) a += ray(k, { x: 250, y: y - 40 }, { x: 404, y: y + 2 + (y - 270) * .3 }, c.azi, 'azi', 1);
  // Camera.
  a += k.rect(60, 180, 40, 28, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.rect(100, 186, 10, 16, { fill: c.shadow }) + k.line({ x: 80, y: 208 }, { x: 80, y: 360 }, { width: PEN.edge });
  a += k.line({ x: 330, y: 195 }, { x: 116, y: 194 }, { stroke: c.alt, width: 1.6, arrow: 'alt' }) + k.label(200, 182, 'L from the HDR', { size: 11.5, anchor: 'middle', fill: c.alt, weight: 600 });
  a += k.text(40, 400, 'ρ = π L / E  ·  e.g. π × 40 cd/m² / 250 lx = 0.50', { size: 13, fill: c.ink, weight: 700 });
  // B: gray card in the same light.
  let b = k.title(520, 36, 'B · Reflectance against a gray card in the frame');
  b += k.rect(540, 80, 400, 230, { fill: c.paper, stroke: c.ink, width: PEN.outline });
  b += k.rect(600, 140, 110, 110, { fill: c.face, stroke: c.ink, width: PEN.outline }) + k.rect(770, 140, 110, 110, { fill: c.paper, stroke: c.alt, width: 2.2 });
  b += k.text(655, 270, 'gray card ρ = 0.18', { size: 11.5, anchor: 'middle', fill: c.ink }) + k.text(655, 287, 'L = 14 cd/m²', { size: 11.5, anchor: 'middle', fill: c.alt, weight: 600 });
  b += k.text(825, 270, 'sample', { size: 11.5, anchor: 'middle', fill: c.ink }) + k.text(825, 287, 'L = 49 cd/m²', { size: 11.5, anchor: 'middle', fill: c.alt, weight: 600 });
  b += k.text(520, 340, 'ρx = ρcard · Lx / Lcard = 0.18 × 49 / 14 = 0.63', { size: 13, fill: c.ink, weight: 700 });
  b += lines(k, 520, 366, ['Same plane, same light, both matte, view not grazing.', 'Glossy or textured finishes: not diffuse, so no single ρ.'], { fill: c.ink });
  return svgDocument(k, { width: 980, height: 420, title: 'Reflectance of a matte sample from luminance and illuminance, or against a gray card', body: k.group('lux', a) + k.group('gray-card', b) });
}

/* 6 · Model, real space and simulation */
export const VALIDATION = [['ceiling', .26, .04, 'light leak at the model roof?'], ['back wall', -.05, -.06, ''], ['floor', -.19, .08, 'model material too dark'], ['window', .31, -.12, 'model sky ≠ real sky']];
export function figUseValidation(standalone = false) {
  const k = kit(standalone, 'uv'), c = k.c;
  let v = '';
  [['Real space', {}], ['Scale model, 1:20', { floor: c.face }], ['Radiance rendering', { ceiling: c.glass }]].forEach(([t, o], i) => {
    const x = 40 + i * 310, r = roomView(k, x, 60, 270, 160, o);
    v += k.title(x, 44, t) + r.g;
    if (!i) for (const [p, s] of [[r.ceil, 'C'], [r.back, 'W'], [r.floor, 'F'], [r.win, 'G']]) v += k.circle(p, 10, { fill: c.paper, stroke: c.alt, width: 1.4 }) + k.text(p.x, p.y + 4, s, { size: 10.5, anchor: 'middle', fill: c.alt, weight: 700 });
  });
  v += k.text(40, 244, 'Same view, same camera position. Regions: C ceiling · W back wall · F floor · G window.', { size: 11.5 });
  // Dot plot of log ratios per region.
  const x0 = 220, x1 = 760, X = r => x0 + (r + .4) / .8 * (x1 - x0), y0 = 290;
  let p = k.rect(X(-.1), y0 - 8, X(.1) - X(-.1), VALIDATION.length * 36 + 4, { fill: c.glass });
  for (const r of [-.4, -.2, 0, .2, .4]) p += k.line({ x: X(r), y: y0 - 8 }, { x: X(r), y: y0 + VALIDATION.length * 36 }, { stroke: r ? c.axis : c.ink, width: r ? PEN.pencil : PEN.edge, dash: r ? '3 4' : undefined }) + k.text(X(r), y0 + VALIDATION.length * 36 + 16, (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1), { size: 10.5, anchor: 'middle' });
  VALIDATION.forEach(([name, m, s, why], i) => {
    const y = y0 + 12 + i * 36;
    p += k.text(x0 - 14, y + 4, name, { size: 12, anchor: 'end', fill: c.ink }) + k.rect(X(m) - 5, y - 5, 10, 10, { fill: c.third }) + k.circle({ x: X(s), y }, 5, { fill: c.paper, stroke: c.alt, width: 1.6 });
    if (why) p += k.text(x1 + 16, y + 4, why, { size: 11, fill: c.third });
  });
  p += k.text((x0 + x1) / 2, y0 + VALIDATION.length * 36 + 34, 'log₁₀(L / L real), per region.  ±0.1 ≈ ±26 %', { size: 11.5, anchor: 'middle', fill: c.ink });
  p += k.rect(x0, 492, 10, 10, { fill: c.third }) + k.text(x0 + 16, 501, 'model / real', { size: 11.5, fill: c.ink }) + k.circle({ x: x0 + 135, y: 497 }, 5, { fill: c.paper, stroke: c.alt, width: 1.6 }) + k.text(x0 + 146, 501, 'rendering / real (illustrative)', { size: 11.5, fill: c.ink });
  return svgDocument(k, { width: 980, height: 515, title: 'Validation: per-region log ratios between a scale model, a rendering and the real space', body: k.group('views', v) + k.group('log-ratios', p) });
}

/* 7 · What the eye receives */
export function figUseEye(standalone = false) {
  const k = kit(standalone, 'ue'), c = k.c, C = { x: 230, y: 230 }, R = 170;
  let fe = k.title(40, 36, 'A · Ev from the fisheye image') + fisheye(k, C, R, [15, 30, 45, 60, 75]);
  for (const t of [0, 30, 60, 90]) { const p = fp(C, R, t, -35); fe += k.label(p.x + 4, p.y + 14, t === 90 ? 'cos 90° = 0' : `cos ${t}° = ${Math.cos(t * RAD).toFixed(2)}`, { size: 10.5, fill: c.azi }); }
  const px = fp(C, R, 50, 125);
  fe += k.rect(px.x - 7, px.y - 7, 14, 14, { fill: c.paper, stroke: c.alt, width: 2 }) + k.line(C, px, { stroke: c.third, width: 1.2 });
  fe += k.label(px.x - 12, px.y - 14, 'pixel i: Li, ωi, θi', { size: 11.5, anchor: 'end', fill: c.alt, weight: 600 }) + k.label((C.x + px.x) / 2 + 8, (C.y + px.y) / 2 + 4, 'θi', { size: 11, fill: c.third, weight: 700 });
  fe += k.text(C.x, C.y + R + 30, 'Center pixels count fully; the rim counts nothing.', { size: 11.5, anchor: 'middle' });
  let b = k.title(520, 36, 'B · Read it as');
  b += lines(k, 520, 66, ['Ev = Σ Li · cos θi · ωi  over the whole hemisphere', 'Check it against the lux sensor at the lens (Section 05).', 'A large gap points to clipped sources, a cropped view', 'or the wrong lens projection.'], { fill: c.ink });
  b += k.text(520, 160, 'MELANOPIC ESTIMATE · APPROXIMATION', { size: 11, weight: 700, spacing: 1, fill: c.third });
  b += lines(k, 520, 182, ['m-EDI ≈ Ev × M-DER of an assumed spectrum', 'daylight through glazing: M-DER ≈ 0.9–1.0', 'warm-white LED, ~2700 K: roughly 0.4–0.5', 'An RGB camera does not measure the spectrum. State the', 'assumed source; use a spectrometer for real numbers.'], { fill: c.ink });
  // Bar: Ev and the melanopic estimate against a daytime reference.
  const x0 = 520, X = v => x0 + v / 1000 * 400;
  b += k.rect(x0, 300, X(620) - x0, 18, { fill: c.paper, stroke: c.azi, width: 2 }) + k.text(X(620) + 8, 313, 'Ev = 620 lx', { size: 11.5, fill: c.azi, weight: 600 });
  b += k.rect(x0, 330, X(560) - x0, 18, { fill: c.glass, stroke: c.third, width: 2 }) + k.text(X(560) + 8, 343, 'm-EDI ≈ 560 lx (daylight, M-DER 0.9)', { size: 11.5, fill: c.third, weight: 600 });
  b += k.line({ x: X(250), y: 290 }, { x: X(250), y: 360 }, { stroke: c.red, width: 1.2, dash: '4 3' }) + k.text(X(250), 378, '250 lx m-EDI: daytime recommendation (Brown et al. 2022)', { size: 11, anchor: 'middle', fill: c.red });
  return svgDocument(k, { width: 980, height: 440, title: 'Vertical illuminance at the eye from a fisheye HDR, with a melanopic estimate', body: k.group('fisheye', fe) + k.group('reading', b) });
}

export const DESIGN_FIGURES = [
  ['hdr-use-glare', 'Glare: sources in the 180° view and the DGP scale', figUseGlare],
  ['hdr-use-brightness', 'Perceived brightness: the 40° horizontal band', figUseBrightness],
  ['hdr-use-contrast', 'Contrast: luminance ratios and the log-luminance histogram', figUseContrast],
  ['hdr-use-dynamics', 'Change over a day from hourly captures', figUseDynamics],
  ['hdr-use-reflectance', 'Reflectance of a matte sample', figUseReflectance],
  ['hdr-use-validation', 'Scale model, rendering and real space compared by region', figUseValidation],
  ['hdr-use-eye', 'What the eye receives: Ev and a melanopic estimate', figUseEye],
];
