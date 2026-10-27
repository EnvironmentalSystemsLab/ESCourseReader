// Drawings for Chapter 05 (solar radiation on surfaces), in the ink style of the solar-geometry
// chapters. Each function returns a complete SVG; { standalone: true } gives the editable file.
import { RAD, solarPosition, formatHour, calendarDate } from './solar.js';
import { incidence, skyViewFactor, groundViewFactor } from './radiation.js';
import { monthNames } from './climate.js';
import { svgDocument, view } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';

const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD);
const deg = (x, n = 1) => `${x.toFixed(n).replace('-', '−')}°`;
const add = (a, b, s = 1) => a.map((x, i) => x + s * b[i]);
/** Arc between two 3D directions u and w around Q, as screen points. */
function arc3(v, Q, u, w, r, n = 24) {
  const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  const a = norm(u), b = norm(w), om = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, s = Math.sin(om) || 1, ka = om ? Math.sin((1 - t) * om) / s : 1 - t, kb = om ? Math.sin(t * om) / s : t;
    return v(...add(Q, a.map((x, j) => r * (ka * x + kb * b[j]))));
  });
}
/** Panel of side 1 with tilt TLT and orientation ORI, lower edge on the ground, centred over the origin. */
function panel(tilt, ori) {
  const N = [sind(tilt) * sind(ori), sind(tilt) * cosd(ori), cosd(tilt)];
  const u = [cosd(ori), -sind(ori), 0], w = [-cosd(tilt) * sind(ori), -cosd(tilt) * cosd(ori), sind(tilt)];
  const C = [0, 0, Math.max(0, .5 * sind(tilt))];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(add(C, u, .5 * a), w, .5 * b));
  return { N, C, corners };
}

/* ---------- 02 · Angle of incidence on a tilted surface (Eq. 25–26) ---------- */
export function drawIncidence(state, { standalone = false } = {}) {
  const k = kit(standalone, 'inc'), c = k.c, v = view(235, 22, 165, 330, 318);
  const sun = solarPosition(state.latitude, state.day, state.hour), i = incidence(sun, state.tilt, state.ori), p = panel(state.tilt, state.ori);
  const P = a => v(...a), C = P(p.C);
  // Angle label just outside the middle of its arc, on the side away from the arc's centre.
  const arcLabel = (u, w, r, t, color) => {
    const m = add(u.map(x => x / Math.hypot(...u)), w.map(x => x / Math.hypot(...w))), q = P(add(p.C, m.map(x => x / (Math.hypot(...m) || 1)), r + .1));
    return k.label(q.x + (q.x >= C.x ? 4 : -4), q.y + 4, t, { size: 13, weight: 700, fill: color, anchor: q.x >= C.x ? 'start' : 'end' });
  };
  let ground = k.polyline(Array.from({ length: 121 }, (_, j) => v(1.3 * sind(j * 3), 1.3 * cosd(j * 3))), { stroke: c.grid, dash: '4 5' });
  let compass = '';
  for (const [a, t] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const q = v(1.45 * sind(a), 1.45 * cosd(a)); ground += k.line(v(1.22 * sind(a), 1.22 * cosd(a)), v(1.3 * sind(a), 1.3 * cosd(a)), { stroke: c.ink }); compass += k.label(q.x, q.y + 4, t, { size: 12, weight: 700, fill: c.ink, anchor: 'middle' }); }
  const facing = i.facing;
  const surface = k.polygon(p.corners.map(P), { fill: facing ? c.paper : c.face, fillOpacity: facing ? .85 : undefined, stroke: c.ink, width: PEN.outline });
  // ORI: the normal's direction in plan, from north, clockwise.
  let orient = '';
  if (state.tilt > .5 && state.tilt < 179.5) {
    const arc = Array.from({ length: 41 }, (_, j) => v(.5 * sind(state.ori * j / 40), .5 * cosd(state.ori * j / 40))), mid = v(.62 * sind(state.ori / 2), .62 * cosd(state.ori / 2));
    orient += k.line(v(0, 0), v(1.1 * sind(state.ori), 1.1 * cosd(state.ori)), { stroke: c.azi, width: 1.4, dash: '6 4' }) + k.line(v(0, 0), v(0, 1.1), { stroke: c.muted, dash: '2 4' });
    if (state.ori > 2) orient += k.polyline(arc, { stroke: c.azi, width: 2, arrow: 'azi' });
    orient += k.label(mid.x, mid.y + 5, `ORI ${deg(state.ori, 0)}`, { size: 12, weight: 700, fill: c.azi, anchor: 'middle' });
  }
  const top = P(add(p.C, p.N, .9));
  let vectors = k.line(C, top, { stroke: c.ink, width: 1.8, arrow: 'ink' }) + k.label(top.x + (top.x >= C.x ? 8 : -8), top.y - 6, 'N (normal)', { size: 12, weight: 600, fill: c.ink, anchor: top.x >= C.x ? 'start' : 'end' });
  // TLT: angle between the vertical and the normal.
  if (state.tilt > 2) vectors += k.line(C, P(add(p.C, [0, 0, .62])), { stroke: c.muted, dash: '2 4' }) + k.polyline(arc3(v, p.C, [0, 0, 1], p.N, .3), { stroke: c.third, width: 2 }) + arcLabel([0, 0, 1], p.N, .3, `TLT ${deg(state.tilt, 0)}`, c.third);
  let ray = '', note = '';
  if (sun.aboveHorizon) {
    const S = [sun.east, sun.north, sun.up], end = P(add(p.C, S, 1.2));
    ray += k.line(C, end, { stroke: c.alt, width: 2.4, arrow: 'alt' }) + k.circle(end, 9, { fill: c.sun, stroke: c.alt });
    ray += k.label(end.x + (end.x >= C.x ? 16 : -16), end.y + 4, 'S (to the sun)', { size: 12, weight: 600, fill: c.ink, anchor: end.x >= C.x ? 'start' : 'end' });
    ray += k.polyline(arc3(v, p.C, p.N, S, .5), { stroke: c.ink, width: 2.4 }) + arcLabel(p.N, S, .5, `INC ${deg(i.inc)}`, c.ink);
    if (!facing) note = k.text(330, 52, 'cos INC < 0: the sun is behind the surface, no beam radiation', { size: 13, fill: c.red, anchor: 'middle', weight: 600 });
  } else note = k.text(330, 52, 'Sun below the horizon', { size: 13, fill: c.red, anchor: 'middle', weight: 600 });
  const head = k.title(20, 24, `${calendarDate(state.day)} · ${formatHour(state.hour)} solar · ALT ${deg(sun.altitude)} · AZI ${sun.azimuth === null ? '—' : deg(sun.azimuth)}`);
  return svgDocument(k, { width: 660, height: 450, title: 'Angle of incidence on a tilted surface', body: k.group('title', head) + k.group('ground', ground) + k.group('surface', surface) + k.group('orientation', orient) + k.group('sun-ray', ray) + k.group('normal-and-tilt', vectors) + k.group('compass', compass) + k.group('note', note) });
}

/* One blue/cyan fill per component (categorical, as in the Chapter 01 climate charts). */
const FILL = k => ({ beam: k.c.heatFill, sky: k.c.waterFill, ground: k.c.heatSoft });
const bar = (k, x, y, w, h, key) => k.rect(x, y, w, h, { fill: FILL(k)[key], stroke: k.c.ink, width: PEN.hatch });
const LABEL = { beam: 'Beam', sky: 'Sky diffuse', ground: 'Ground-reflected' };
function legend(k, x, y) {
  return Object.keys(LABEL).map((key, j) => bar(k, x + j * 150, y - 10, 16, 12, key) + k.text(x + j * 150 + 24, y, LABEL[key], { size: 12, fill: k.c.ink })).join('');
}

/* ---------- 03 · Components of the irradiance on a surface (Eq. 27–30) ---------- */
export function drawComponents(rows, { standalone = false, dni = null } = {}) {
  const k = kit(standalone, 'gcp'), c = k.c, x0 = 190, x1 = 610, top = 46, h = 34, gap = 22;
  const max = Math.max(200, Math.ceil(Math.max(dni ?? 0, ...rows.map(r => r.beam + r.sky + r.ground)) / 200) * 200), X = val => x0 + val / max * (x1 - x0);
  const H = top + rows.length * (h + gap) + 6;
  let grid = '';
  for (let val = 0; val <= max; val += max > 800 ? 200 : 100) grid += k.line({ x: X(val), y: top - 8 }, { x: X(val), y: H - 10 }, { stroke: c.fineGrid }) + k.text(X(val), H + 6, String(val), { size: 11, anchor: 'middle' });
  grid += k.text(x1, H + 24, 'W/m²', { size: 11, anchor: 'end', fill: c.ink });
  let bars = '';
  rows.forEach((r, j) => {
    const y = top + j * (h + gap); let x = x0;
    bars += k.text(x0 - 12, y + h / 2 + 4, r.label, { size: 12, anchor: 'end', fill: c.ink, weight: 600 });
    for (const key of ['beam', 'sky', 'ground']) { const w = r[key] / max * (x1 - x0); if (w > .2) bars += bar(k, x, y, w, h, key); x += w; }
    const total = r.beam + r.sky + r.ground;
    bars += k.label(x + 8, y + h / 2 + 4, `${Math.round(total)} W/m²`, { size: 12, weight: 700, fill: c.ink });
  });
  let ref = '';
  if (dni !== null) ref = k.line({ x: X(dni), y: top - 14 }, { x: X(dni), y: H - 10 }, { stroke: c.alt, width: 1.6, dash: '5 4' }) + k.label(X(dni), top - 20, `G_n = DNI = ${Math.round(dni)}`, { size: 11, fill: c.alt, anchor: dni > max * .8 ? 'end' : 'middle', weight: 700 });
  return svgDocument(k, { width: 640, height: H + 64, title: 'Beam, sky and ground components of the irradiance', body: k.group('grid', grid) + k.group('bars', bars) + k.group('dni', ref) + k.group('key', legend(k, 40, H + 50)) });
}

/* ---------- 04 · Monthly irradiation on a surface from the weather file (Eq. 31) ---------- */
export function drawMonthlyIrradiation(result, reference, { standalone = false, label = 'This surface', refLabel = 'Horizontal' } = {}) {
  const k = kit(standalone, 'mir'), c = k.c, x0 = 70, x1 = 690, y0 = 40, y1 = 250;
  const peak = Math.max(...result.months.map(m => m.total), ...(reference ? reference.months.map(m => m.total) : [0]));
  const step = peak > 150 ? 50 : 25, ymax = Math.max(step * 2, Math.ceil(peak / step) * step), Y = val => y1 - val / ymax * (y1 - y0), bw = (x1 - x0) / 12;
  let grid = '';
  for (let val = 0; val <= ymax; val += step) grid += k.line({ x: x0, y: Y(val) }, { x: x1, y: Y(val) }, { stroke: val ? c.fineGrid : c.axis }) + k.text(x0 - 8, Y(val) + 4, String(val), { size: 11, anchor: 'end' });
  grid += k.text(x0 - 56, y0 - 16, 'kWh/m² per month', { size: 11, fill: c.ink });
  let bars = '';
  result.months.forEach((m, j) => {
    const x = x0 + j * bw + bw * .18, w = bw * .64; let y = y1;
    for (const key of ['beam', 'sky', 'ground']) { const hgt = m[key] / ymax * (y1 - y0); if (hgt > .2) bars += bar(k, x, y - hgt, w, hgt, key); y -= hgt; }
    bars += k.text(x + w / 2, y - 6, String(Math.round(m.total)), { size: 10, anchor: 'middle', fill: c.ink });
    bars += k.text(x0 + j * bw + bw / 2, y1 + 18, monthNames[j], { size: 11, anchor: 'middle' });
  });
  let ref = '';
  if (reference) {
    const pts = reference.months.flatMap((m, j) => [{ x: x0 + j * bw, y: Y(m.total) }, { x: x0 + (j + 1) * bw, y: Y(m.total) }]);
    ref = k.polyline(pts, { stroke: c.alt, width: 1.8, dash: '6 4' }) + k.line({ x: x0 + 2, y: y1 + 42 }, { x: x0 + 30, y: y1 + 42 }, { stroke: c.alt, width: 1.8, dash: '6 4' }) + k.text(x0 + 36, y1 + 46, `${refLabel} · ${Math.round(reference.year.total)} kWh/m² per year`, { size: 12, fill: c.ink });
  }
  const totals = k.text(x1, y0 - 16, `${label} · ${Math.round(result.year.total)} kWh/m² per year`, { size: 12, weight: 700, fill: c.ink, anchor: 'end' });
  return svgDocument(k, { width: 720, height: y1 + 90, title: 'Monthly solar irradiation on a surface', body: k.group('grid', grid) + k.group('bars', bars) + k.group('horizontal', ref) + k.group('totals', totals) + k.group('key', legend(k, x0 + 2, y1 + 70)) });
}

/* ---------- Figure · beam, sky and ground on a tilted surface ---------- */
export function figComponents(standalone = false) {
  const k = kit(standalone, 'cmp'), c = k.c, tilt = 40, alt = 35;
  // Section through a south-facing surface: south to the right, up. The surface rises toward the north.
  const X = x => 330 + x * 150, Z = z => 325 - z * 150, pt = (x, z) => ({ x: X(x), y: Z(z) });
  const a = pt(.35, 0), b = pt(.35 - cosd(tilt), sind(tilt)), at = t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }), mid = at(.5);
  let ground = k.line(pt(-1.9, 0), pt(1.9, 0), { stroke: c.ink, width: PEN.profile });
  for (let x = -1.85; x < 1.9; x += .14) ground += k.line(pt(x, 0), pt(x - .08, -.08), { stroke: c.ink, width: PEN.hatch });
  ground += k.text(X(-1.85), Z(0) + 30, 'N', { size: 12, weight: 700, fill: c.ink }) + k.text(X(1.85), Z(0) + 30, 'S', { size: 12, weight: 700, fill: c.ink, anchor: 'end' });
  let surf = k.line(a, b, { stroke: c.ink, width: 4 });
  const nx = sind(tilt), nz = cosd(tilt), ntip = { x: mid.x + nx * 95, y: mid.y - nz * 95 };
  surf += k.line(mid, ntip, { stroke: c.ink, width: 1.4, arrow: 'ink' }) + k.label(ntip.x + 6, ntip.y - 4, 'N (normal)', { size: 12, weight: 700, fill: c.ink });
  surf += k.arc(a.x, a.y, 48, 180 - tilt, 180, { stroke: c.third, width: 2 }) + k.label(a.x - 56, a.y - 10, 'TLT', { size: 12, weight: 700, fill: c.third, anchor: 'end' });
  // Beam: parallel rays from the sun, low in the south.
    let beam = '';
  for (const t of [.25, .5, .75]) { const p = at(t), L = 240; beam += k.line({ x: p.x + cosd(alt) * L, y: p.y - sind(alt) * L }, p, { stroke: c.alt, width: 1.8, arrow: 'alt' }); }
  const s0 = at(.5); beam += k.circle({ x: s0.x + cosd(alt) * 270, y: s0.y - sind(alt) * 270 }, 12, { fill: c.sun, stroke: c.alt });
  beam += k.label(s0.x + cosd(alt) * 270, s0.y - sind(alt) * 270 - 24, 'Beam · DNI × cos INC', { size: 12, weight: 700, fill: c.ink, anchor: 'middle' });
  // Sky: the share of the sky dome the surface sees, (1 + cos TLT) / 2.
  let sky = k.path(`M${X(-1.7)},${Z(0)} A${1.7 * 150},${1.7 * 150} 0 0 1 ${X(1.7)},${Z(0)}`, { stroke: c.grid, dash: '4 5' });
  for (const ang of [75, 100, 125]) { const q = { x: mid.x + 1.45 * 150 * cosd(ang), y: mid.y - 1.45 * 150 * sind(ang) }; sky += k.line(q, { x: q.x + (mid.x - q.x) * .62, y: q.y + (mid.y - q.y) * .62 }, { stroke: c.azi, width: 1.4, arrow: 'azi', dash: '2 3' }); }
  sky += k.label(X(-.75), Z(1.72), 'Sky · DHI × (1 + cos TLT) / 2', { size: 12, weight: 700, fill: c.ink, anchor: 'middle' });
  // Ground: reflected from the foreground the surface sees, (1 − cos TLT) / 2.
  let gr = '';
  for (const x of [.8, 1.15]) { const g = pt(x, 0); gr += k.line(g, { x: g.x + (mid.x - g.x) * .62, y: g.y + (mid.y - g.y) * .62 }, { stroke: c.third, width: 1.4, arrow: 'third', dash: '2 3' }); }
  gr += k.label(X(1.05), Z(0) + 30, 'Ground · ρ × GHI × (1 − cos TLT) / 2', { size: 12, weight: 700, fill: c.ink, anchor: 'middle' });
  const vf = k.title(20, 24, `TLT ${tilt}° · sky view ${skyViewFactor(tilt).toFixed(2)} · ground view ${groundViewFactor(tilt).toFixed(2)}`);
  return svgDocument(k, { width: 660, height: 375, title: 'Beam, sky-diffuse and ground-reflected radiation on a tilted surface', body: k.group('ground', ground) + k.group('sky', sky) + k.group('ground-reflected', gr) + k.group('beam', beam) + k.group('surface', surf) + k.group('view-factors', vf) });
}

/** Reference state of the interactive incidence drawing, for the figure files. */
export const incidenceReference = s => drawIncidence({ latitude: 42.4, day: 355, hour: 12, tilt: 90, ori: 180 }, { standalone: s });
