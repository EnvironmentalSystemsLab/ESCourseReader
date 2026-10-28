// Psychrometric chart drawings for the chapter on humid air, in the fine-liner style of the other chapters:
// pencil grid, ink saturation and RH curves, wet-bulb lines dashed, readings in the ALT blue and water in
// the AZI cyan. Every line is computed from src/psychro.js, so chart, labs, text and self-test agree.
// Each draw function returns a complete SVG; { standalone: true } gives the editable file.
import { svgDocument } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { saturationHumidity, humidityFromRH, humidityFromWetBulb, dryBulbFromWetBulb, humidityFromEnthalpy, humidityFromPressure, tempFromVolume, dewPointFromHumidity } from './psychro.js';

const n = (x, d = 1) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
export const caption = (k, x, y, s, o = {}) => k.text(x, y, s, { size: 12, weight: 700, fill: k.c.ink, ...o });

/** Chart frame in drawing units and the range it shows. */
export const CHART = { x0: 60, x1: 640, y0: 46, y1: 476, tmin: -10, tmax: 50, ahmax: 30 };
export function frame(g = CHART) {
  const X = t => g.x0 + (t - g.tmin) / (g.tmax - g.tmin) * (g.x1 - g.x0), Y = ah => g.y1 - ah / g.ahmax * (g.y1 - g.y0);
  const T = x => g.tmin + (x - g.x0) / (g.x1 - g.x0) * (g.tmax - g.tmin), AH = y => (g.y1 - y) / (g.y1 - g.y0) * g.ahmax;
  const P = (t, ah) => ({ x: X(t), y: Y(ah) });
  const inside = (t, ah) => t >= g.tmin - 1e-9 && t <= g.tmax + 1e-9 && ah >= -1e-9 && ah <= g.ahmax + 1e-9 && ah <= saturationHumidity(t) + 1e-7;
  return { ...g, X, Y, T, AH, P, inside };
}

/** Samples a line family member s → { t, ah } and keeps the parts inside the chart, with exact ends (bisection). */
function trace(F, fn, s0, s1, steps = 36) {
  const parts = [];
  let cur = null, prev = null;
  const ok = s => { const q = fn(s); return Number.isFinite(q.t) && Number.isFinite(q.ah) && F.inside(q.t, q.ah); };
  const edge = (a, b) => { let lo = a, hi = b; const okLo = ok(lo); for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (ok(m) === okLo) lo = m; else hi = m; } return okLo ? lo : hi; };
  for (let i = 0; i <= steps; i++) {
    const s = s0 + (s1 - s0) * i / steps, isIn = ok(s);
    if (prev !== null && isIn !== prev.isIn) {
      const e = fn(edge(prev.s, s));
      if (isIn) { cur = [F.P(e.t, e.ah)]; } else if (cur) { cur.push(F.P(e.t, e.ah)); parts.push(cur); cur = null; }
    }
    if (isIn) { if (!cur) cur = []; const q = fn(s); cur.push(F.P(q.t, q.ah)); }
    prev = { s, isIn };
  }
  if (cur && cur.length > 1) parts.push(cur);
  return parts;
}
const polylines = (k, parts, o) => parts.map(p => k.polyline(p, o)).join('');

/** Temperature at which an RH curve leaves the top of the chart (or tmax). */
const exitT = (F, rh) => { let lo = F.tmin, hi = F.tmax; if (humidityFromRH(hi, rh) <= F.ahmax) return hi; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (humidityFromRH(m, rh) > F.ahmax) hi = m; else lo = m; } return lo; };

/**
 * The chart itself. opts: id (group prefix when one drawing holds several charts), dbt, ah, rh, wet, h, v (line families), labels (axis numbers), short (axis titles), scales (pv), fine (1 K / 1 g grid).
 * Returns { svg, F } so callers can draw readings on the same frame.
 */
export function chart(k, g = CHART, opts = {}) {
  const o = { dbt: true, ah: true, rh: true, wet: false, h: false, v: false, labels: true, fine: true, rhLabels: true, scales: false, ...opts };
  const F = frame(g), c = k.c, sat = t => saturationHumidity(t);
  const satTop = dewPointFromHumidity(F.ahmax);
  let grid = '', curves = '', text = '';
  // Dry-bulb verticals, from dry air up to the saturation curve.
  if (o.dbt) for (let t = Math.ceil(F.tmin); t <= F.tmax; t += 1) {
    const major = t % 5 === 0; if (!major && !o.fine) continue;
    grid += k.line(F.P(t, 0), F.P(t, Math.min(sat(t), F.ahmax)), { stroke: major ? c.grid : c.fineGrid, width: PEN.pencil });
  }
  // Absolute-humidity horizontals, from the saturation curve (the dew point) to the right edge.
  if (o.ah) for (let a = 1; a <= F.ahmax; a += 1) {
    const major = a % 5 === 0; if (!major && !o.fine) continue;
    grid += k.line(F.P(Math.max(F.tmin, dewPointFromHumidity(a)), a), F.P(F.tmax, a), { stroke: major ? c.grid : c.fineGrid, width: PEN.pencil });
  }
  // Specific-volume lines, steep, every 0.02 m³/kg.
  if (o.v) for (let v = .76; v <= .92 + 1e-9; v += .02) {
    const parts = trace(F, a => ({ t: tempFromVolume(v, a), ah: a }), 0, F.ahmax, 12);
    curves += polylines(k, parts, { stroke: c.muted, width: PEN.hatch, dash: '1.5 3' });
    if (o.labels && parts[0]) { const p = parts[0][0]; if (p.x > F.x0 + 10 && p.x < F.x1 - 10) text += k.label(p.x + 3, p.y - 6, `${v.toFixed(2)}`, { size: 10.5, rotate: -72, fill: c.muted }); }
  }
  // Enthalpy lines every 10 kJ/kg, labeled just outside the saturation curve.
  if (o.h) for (let h = 0; h <= 110; h += 10) {
    const parts = trace(F, t => ({ t, ah: humidityFromEnthalpy(h, t) }), F.tmin, F.tmax, 40);
    curves += polylines(k, parts, { stroke: c.muted, width: PEN.hatch });
    if (o.labels && parts[0]) { const p = parts[0][0]; if (p.y > F.y0 + 4) text += k.label(p.x - 6, p.y - 6, String(h), { size: 10.5, anchor: 'end', fill: c.muted }); }
  }
  // Wet-bulb lines every 5 °C, dashed, from the saturation curve down to dry air.
  if (o.wet) for (let tw = -10; tw <= 30; tw += 5) {
    const parts = trace(F, t => ({ t, ah: humidityFromWetBulb(t, tw) }), tw, Math.min(F.tmax, dryBulbFromWetBulb(tw, 0) + 1), 30);
    curves += polylines(k, parts, { stroke: c.ink, width: PEN.edge, dash: '6 3' });
    if (o.labels && sat(tw) < F.ahmax && tw > F.tmin) { const p = F.P(tw, sat(tw)); text += k.label(p.x + 6, p.y + 12, String(tw), { size: 10.5, fill: c.ink, weight: 600 }); }
  }
  // Relative-humidity curves, 10–90 %, and the saturation curve (100 %).
  if (o.rh) for (let rh = 10; rh <= 90; rh += 10) {
    const pts = []; for (let t = F.tmin; t <= exitT(F, rh) + 1e-9; t += .5) pts.push(F.P(t, humidityFromRH(t, rh)));
    pts.push(F.P(exitT(F, rh), humidityFromRH(exitT(F, rh), rh)));
    curves += k.polyline(pts, { stroke: c.ink, width: PEN.hatch });
    if (o.rhLabels) {
      // Labels spread along the curves: each sits where its curve reaches 85 % × RH of the chart height.
      const target = .85 * F.ahmax * rh / 100;
      let lo = F.tmin, hi = F.tmax; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (humidityFromRH(m, rh) > target) hi = m; else lo = m; }
      const tl = Math.min(lo, F.tmax - (F.tmax - F.tmin) * .06), a = F.P(tl, humidityFromRH(tl, rh)), b = F.P(tl + .5, humidityFromRH(tl + .5, rh));
      text += k.label(a.x - 2, a.y - 3, `${rh} %`, { size: 10.5, fill: c.ink, anchor: 'end', rotate: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI });
    }
  }
  const satPts = []; for (let t = F.tmin; t < satTop; t += .25) satPts.push(F.P(t, sat(t))); satPts.push(F.P(satTop, F.ahmax));
  curves += k.polyline(satPts, { stroke: c.ink, width: PEN.profile });
  // Frame: base line (dry air) and the right-hand AH scale.
  let axes = k.line(F.P(F.tmin, 0), F.P(F.tmax, 0), { stroke: c.ink, width: PEN.outline }) + k.line(F.P(F.tmax, 0), F.P(F.tmax, F.ahmax), { stroke: c.ink, width: PEN.outline });
  axes += k.line(F.P(F.tmin, 0), F.P(F.tmin, sat(F.tmin)), { stroke: c.ink, width: PEN.edge }) + k.line(F.P(satTop, F.ahmax), F.P(F.tmax, F.ahmax), { stroke: c.ink, width: PEN.edge });
  if (o.labels) {
    for (let t = F.tmin; t <= F.tmax; t += 5) axes += k.line(F.P(t, 0), { x: F.X(t), y: F.y1 + 5 }, { stroke: c.ink, width: PEN.edge }) + k.text(F.X(t), F.y1 + 18, n(t, 0), { size: 10.5, anchor: 'middle', fill: c.ink });
    for (let a = 0; a <= F.ahmax; a += 2) axes += k.line(F.P(F.tmax, a), { x: F.x1 + 5, y: F.Y(a) }, { stroke: c.ink, width: PEN.edge }) + k.text(F.x1 + 9, F.Y(a) + 4, String(a), { size: 10.5, fill: c.ink });
    axes += k.text((F.x0 + F.x1) / 2, F.y1 + 36, o.short ? 'DBT °C' : 'Dry-bulb temperature DBT  °C', { size: 12, anchor: 'middle', fill: c.ink, weight: 600 });
    axes += k.text(F.x1 + 34, (F.y0 + F.y1) / 2, o.short ? 'AH g/kg' : 'Absolute humidity AH  g/kg dry air', { size: 12, anchor: 'middle', fill: c.ink, weight: 600, rotate: 90 });
    if (o.scales) {
      const xs = F.x1 + 58;
      axes += k.line({ x: xs, y: F.y1 }, { x: xs, y: F.y0 }, { stroke: c.ink, width: PEN.edge });
      for (let pv = 0; pv <= 4.5 + 1e-9; pv += .5) { const y = F.Y(humidityFromPressure(pv)); if (y < F.y0) break; axes += k.line({ x: xs, y }, { x: xs + 5, y }, { stroke: c.ink, width: PEN.edge }) + k.text(xs + 9, y + 4, n(pv, 1), { size: 10.5, fill: c.ink }); }
      axes += k.text(xs + 44, (F.y0 + F.y1) / 2, 'Vapor pressure pv  kPa', { size: 12, anchor: 'middle', fill: c.ink, weight: 600, rotate: 90 });
    }
  }
  const id = o.id ? `${o.id}-` : '';
  return { svg: k.group(`${id}grid`, grid) + k.group(`${id}curves`, curves) + k.group(`${id}labels`, text) + k.group(`${id}axes`, axes), F };
}

/** Dashed reading line in the reading color. */
const reading = (k, a, b, o = {}) => k.line(a, b, { stroke: o.stroke ?? k.c.alt, width: o.width ?? PEN.edge, dash: o.dash ?? '4 3', arrow: o.arrow });
/** Value tag at an axis. */
const tag = (k, x, y, s, o = {}) => k.label(x, y, s, { size: 11, weight: 700, fill: o.fill ?? k.c.alt, anchor: o.anchor ?? 'middle', ...o });

/** Readings of one status point: which = list of 'dbt', 'ah', 'dew', 'wet', 'rh', 'h'. */
export function readings(k, F, s, which = ['dbt', 'ah', 'dew', 'wet', 'rh'], o = {}) {
  const c = k.c, P = F.P(s.t, s.ah), col = o.stroke ?? c.alt;
  let g = '';
  if (which.includes('dbt')) g += reading(k, P, F.P(s.t, 0), { stroke: col }) + tag(k, P.x, F.y1 + 50, `DBT ${n(s.t)} °C`, { fill: col });
  if (which.includes('ah')) g += reading(k, P, F.P(F.tmax, s.ah), { stroke: col }) + tag(k, F.x1 - 4, F.Y(s.ah) - 6, `AH ${n(s.ah)} g/kg`, { fill: col, anchor: 'end' });
  if (which.includes('dew') && s.dew >= F.tmin) {
    const D = F.P(s.dew, s.ah);
    g += reading(k, P, D, { stroke: col }) + reading(k, D, F.P(s.dew, 0), { stroke: col, dash: '1.5 3' }) + k.circle(D, 3.2, { fill: col });
    g += tag(k, D.x - 8, D.y - 6, `DPT ${n(s.dew)} °C`, { fill: col, anchor: 'end' });
  }
  if (which.includes('wet')) {
    const W = F.P(s.wet, saturationHumidity(s.wet)), pts = [];
    for (let i = 0; i <= 12; i++) { const t = s.t + (s.wet - s.t) * i / 12; pts.push(F.P(t, humidityFromWetBulb(t, s.wet))); }
    g += k.polyline(pts, { stroke: col, width: PEN.outline, dash: '6 3' }) + k.circle(W, 3.2, { fill: col });
    g += tag(k, W.x - 8, W.y - 12, `WBT ${n(s.wet)} °C`, { fill: col, anchor: 'end' });
  }
  g += k.circle(P, 5, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.circle(P, 2, { fill: c.ink });
  const lab = [which.includes('rh') ? `RH ${n(s.rh, 0)} %` : '', which.includes('h') ? `h ${n(s.h)} kJ/kg` : ''].filter(Boolean).join(' · ');
  if (lab) g += k.label(P.x + 10, P.y + 16, lab, { size: 11, weight: 700, fill: c.ink });
  if (o.name) g += k.label(P.x + 9, P.y - 8, o.name, { size: 12, weight: 700, fill: c.ink, italic: true });
  return g;
}

/** Lecture comfort range (Lechner 4.4, 4.8): 20–25.5 °C (68–78 °F), RH 20–60 % in summer, up to 80 % in winter. */
export function comfortZone(k, F) {
  const c = k.c, t0 = 20, t1 = 25.5, side = (rh, a, b) => Array.from({ length: 12 }, (_, i) => { const t = a + (b - a) * i / 11; return F.P(t, humidityFromRH(t, rh)); });
  const zone = [...side(20, t0, t1), ...side(60, t1, t0)], ext = [...side(60, t0, t1), ...side(80, t1, t0)];
  return k.polygon(zone, { fill: c.heatSoft, fillOpacity: .55, stroke: c.heat, width: PEN.outline }) + k.polygon(ext, { fill: 'none', stroke: c.heat, width: PEN.edge, dash: '4 3' })
    + k.label(F.X(22.75), F.Y(humidityFromRH(22.75, 40)) + 4, 'comfort', { size: 10.5, anchor: 'middle', fill: c.heat, weight: 700 });
}

/* ── Lab: the status point (Eq. 1–7) ─────────────────────────────────────── */
export function drawState(s, { standalone = false, comfort = false, label = '' } = {}) {
  const k = kit(standalone, 'pst'), { svg, F } = chart(k, CHART, { wet: true, h: false });
  const extra = comfort ? comfortZone(k, F) : '';
  const head = caption(k, 20, 24, label || `DBT ${n(s.t)} °C · RH ${n(s.rh, 0)} % · AH ${n(s.ah)} g/kg · sea level`);
  return svgDocument(k, { width: 720, height: CHART.y1 + 66, title: 'Psychrometric chart with the status point and its readings', body: k.group('title', head) + svg + k.group('comfort', extra) + k.group('readings', readings(k, F, s, ['dbt', 'ah', 'dew', 'wet', 'rh', 'h'])) });
}

/* ── Lab: processes (Eq. 8) ──────────────────────────────────────────────── */
export function drawProcess(r, { standalone = false, label = '' } = {}) {
  const k = kit(standalone, 'ppr'), c = k.c, { svg, F } = chart(k, CHART, { wet: true, h: true, labels: true });
  const { a, b, path, water } = r;
  // Shaded bands for the temperature and humidity change, as on the lecture slides.
  let bands = '';
  const tl = Math.min(a.t, b.t), tr = Math.max(a.t, b.t), al = Math.min(a.ah, b.ah), ar = Math.max(a.ah, b.ah);
  if (tr - tl > .05) bands += k.rect(F.X(tl), F.Y(Math.max(a.ah, b.ah)), F.X(tr) - F.X(tl), F.y1 - F.Y(Math.max(a.ah, b.ah)), { fill: c.heatSoft, fillOpacity: .5 });
  if (ar - al > .02) bands += k.rect(F.X(Math.max(a.t, b.t)), F.Y(ar), F.x1 - F.X(Math.max(a.t, b.t)), F.Y(al) - F.Y(ar), { fill: c.waterFill, fillOpacity: .45 });
  let g = k.polyline(path.map(p => F.P(p.t, p.ah)), { stroke: c.alt, width: PEN.profile });
  const end = path.at(-1), before = path.at(-2) ?? path[0], E = F.P(end.t, end.ah), B = F.P(before.t, before.ah), L = Math.hypot(E.x - B.x, E.y - B.y);
  if (L > .5) g += k.line({ x: E.x - (E.x - B.x) / L * 12, y: E.y - (E.y - B.y) / L * 12 }, E, { stroke: c.alt, width: PEN.profile, arrow: 'alt' });
  g += readings(k, F, a, ['rh'], { name: '1' }) + readings(k, F, b, ['rh'], { name: '2' });
  if (tr - tl > .05) g += tag(k, (F.X(tl) + F.X(tr)) / 2, F.y1 + 50, `Δθ = ${n(b.t - a.t)} K`);
  if (ar - al > .02) g += tag(k, F.x1 - 4, F.Y(ar) - 6, `${water > 0 ? 'condensed' : 'ΔAH'} ${n(Math.abs(b.ah - a.ah), 2)} g/kg`, { fill: c.azi, anchor: 'end' });
  const head = caption(k, 20, 24, label);
  return svgDocument(k, { width: 720, height: CHART.y1 + 66, title: 'Psychrometric process on the chart', body: k.group('title', head) + k.group('bands', bands) + svg + k.group('process', g) });
}

/* ── Lab: surface condensation (Eq. 4 with the inside surface temperature of the heat-transfer chapter) ── */
export function drawSurface(r, { standalone = false, label = '' } = {}) {
  const k = kit(standalone, 'psf'), c = k.c, g0 = { ...CHART, tmin: -10, tmax: 35, ahmax: 20 }, { svg, F } = chart(k, g0, { wet: false });
  const room = r.room, S = F.P(r.surface, 0), top = F.P(r.surface, Math.min(saturationHumidity(r.surface), F.ahmax));
  let g = k.line(S, top, { stroke: r.condenses ? c.red : c.azi, width: PEN.profile });
  g += tag(k, S.x, F.y1 + 50, `surface θsi ${n(r.surface)} °C`, { fill: r.condenses ? c.red : c.azi });
  const M = F.P(r.mold, room.ah);
  g += k.line(M, F.P(r.mold, 0), { stroke: c.third, width: PEN.edge, dash: '2 3' }) + k.circle(M, 3, { fill: c.third }) + k.label(M.x - 6, M.y - 18, `80 % RH at ${n(r.mold)} °C`, { size: 10.5, anchor: 'end', fill: c.third, weight: 700 });
  g += readings(k, F, room, ['dew', 'rh'], { name: 'room air' });
  if (r.condenses) {
    const pts = []; for (let t = room.dew; t >= r.surface; t -= .25) pts.push(F.P(t, saturationHumidity(t)));
    if (pts.length > 1) g += k.polyline(pts, { stroke: c.red, width: PEN.profile });
    g += k.label(top.x + 8, top.y + 30, 'condensation', { size: 12, weight: 700, fill: c.red });
  }
  const head = caption(k, 20, 24, label);
  return svgDocument(k, { width: 720, height: g0.y1 + 66, title: 'Surface condensation: room air, dew point and the inside surface temperature', body: k.group('title', head) + svg + k.group('reading', g) });
}

