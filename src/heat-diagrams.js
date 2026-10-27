// Drawings for Chapters 07 (heat transfer through the envelope) and 08 (building heat balance), in the
// fine-liner style of Chapters 02–06. Materials in section follow drafting convention: insulation as a
// looped batt line, masonry and concrete hatched, plaster stippled, timber with grain. Temperatures are
// drawn in the ALT blue, the dew point and mould limit in the AZI cyan and violet; warnings in red.
// Each function returns a complete SVG; { standalone: true } gives the editable file.
import { svgDocument } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { MATERIALS, airLayer, surfaceResistance, INSIDE_CONVECTION, outsideConvection } from './heat.js';
import { monthNames } from './climate.js';

/** Mixed-case heading: k.title uppercases, which would turn θ, ε and units into Θ, Ε and M²K. */
export const caption = (k, x, y, s, o = {}) => k.text(x, y, s, { size: 12, weight: 700, fill: k.c.ink, ...o });
const n = (x, d = 1) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const deg = (x, d = 1) => `${n(x, d)} °C`;

/** Drafting kind of a material for its section fill. */
export function kindOf(layer) {
  const m = layer.kind ?? layer.material;
  if (layer.insulation || MATERIALS[m]?.insulation) return 'insulation';
  if (['gypsumBoard', 'gypsumPlaster', 'limePlaster', 'render', 'plaster'].includes(m)) return 'plaster';
  if (['softwood', 'hardwood', 'plywood', 'timber'].includes(m)) return 'timber';
  if (['brick', 'aacMasonry', 'masonry'].includes(m)) return 'brick';
  if (m === 'concrete') return 'concrete';
  if (['basalt', 'stone'].includes(m)) return 'stone';
  if (m === 'steel') return 'steel';
  if (m === 'glass') return 'glass';
  if (m === 'air') return 'air';
  return 'plaster';
}

/** A layer in section, x→ across the wall, y↓ along it. */
export function materialFill(k, x, y, w, h, kind) {
  const c = k.c, frame = k.rect(x, y, w, h, { stroke: c.ink, width: PEN.edge });
  if (w < .5 || h < .5) return '';
  let g = '';
  if (kind === 'insulation') {
    // Batt symbol: a looped line along the layer, each loop spanning its thickness (the shorter side).
    const across = w <= h * 1.2, T = across ? w : h, L = across ? h : w, step = Math.max(6, Math.min(T * .55, 26)), r = T / 2 * .92, m = (across ? x : y) + T / 2, s0 = (across ? y : x) + 2;
    const P = (a, b) => across ? `${a},${b}` : `${b},${a}`;
    let d = `M${P(m - r, s0)}`;
    for (let t = s0, sg = 1; t < s0 + L - 4; t += step, sg = -sg) {
      const t2 = Math.min(s0 + L - 4, t + step);
      d += ` C${P(m - sg * r * 1.25, t + (t2 - t) * .1)} ${P(m + sg * r * 1.25, t + (t2 - t) * .9)} ${P(m + sg * r, t2)}`;
    }
    g = k.rect(x, y, w, h, { fill: c.paper }) + k.path(d, { stroke: c.ink, width: PEN.hatch }) + frame;
  } else if (kind === 'brick') g = k.rect(x, y, w, h, { fill: c.face }) + frame;
  else if (kind === 'stone' || kind === 'steel') g = k.rect(x, y, w, h, { fill: c.shadow }) + frame;
  else if (kind === 'concrete' || kind === 'concreteLight') {
    // Hatch with aggregate as small triangles, drawn as one path; the light variant leaves the paper white.
    const light = kind === 'concreteLight', gy = light ? 30 : 17, gx = light ? 34 : 13;
    let d = '';
    for (let yy = y + 9, j = 0; yy < y + h - 4; yy += gy, j++) for (let xx = x + 5 + (j % 2) * gx / 2; xx < x + w - 3; xx += gx) d += `M${xx.toFixed(1)},${(yy - 2.5).toFixed(1)}l2.5,4.5h-5z`;
    g = k.rect(x, y, w, h, { fill: light ? c.paper : c.face }) + k.path(d, { fill: c.paper, stroke: c.ink, width: PEN.hatch }) + frame;
  } else if (kind === 'timber') {
    g = k.rect(x, y, w, h, { fill: c.paper });
    for (let j = 1; j < 4; j++) { const xx = x + w * j / 4; g += k.path(`M${xx},${y} Q${xx + w * .08},${y + h / 2} ${xx},${y + h}`, { stroke: c.ink, width: PEN.hatch }); }
    g += frame;
  } else if (kind === 'glass') g = k.rect(x, y, w, h, { fill: c.glass }) + frame;
  else if (kind === 'air') g = k.rect(x, y, w, h, { stroke: c.ink, width: PEN.hatch, dash: '3 3' });
  else {
    g = k.rect(x, y, w, h, { fill: c.paper });
    for (let yy = y + 5, j = 0; yy < y + h - 2; yy += 7, j++) for (let xx = x + 2 + (j % 3) * 1.6; xx < x + w - 1; xx += 5) g += k.circle({ x: xx, y: yy }, .55, { fill: c.ink });
    g += frame;
  }
  return g;
}

/** Wavy arrow (heat flow in air) from a to b. */
const flowArrow = (k, a, b, colour = k.c.heat, name = 'alt') => k.line(a, b, { stroke: colour, width: 1.6, arrow: name });

/* ---------- 07 · Layered construction with its temperature profile (Eq. 7.7–7.9) ---------- */
/** state: { construction, profile, inside, outside, dew, mould, axis: 'thickness' | 'resistance', label } */
export function drawWallProfile({ construction: c0, profile: p, inside, outside, dew = null, mould = null, axis = 'thickness', label = '' }, { standalone = false } = {}) {
  const k = kit(standalone, 'wtp'), c = k.c, W = 720, top = 56, bottom = 330, airW = 70, x0 = 40 + airW, x1 = W - 40 - airW;
  const byR = axis === 'resistance', layers = c0.layers;
  // Horizontal scale: thickness (layers only) or thermal resistance (with the surface films as bands).
  const span = byR ? c0.total : Math.max(c0.thickness, 1e-6), minW = byR ? 0 : 5;
  const widths = layers.map(l => Math.max(minW, (byR ? l.resistance : l.thickness) / span * (x1 - x0)));
  const films = byR ? [c0.rsi / span * (x1 - x0), c0.rse / span * (x1 - x0)] : [0, 0];
  const scale = (x1 - x0 - films[0] - films[1]) / widths.reduce((s, w) => s + w, 0);
  const xs = [x0 + films[0]]; widths.forEach(w => xs.push(xs[xs.length - 1] + w * scale));
  // Temperature scale.
  const vals = [inside, outside, ...(dew !== null ? [dew] : []), ...(mould !== null ? [mould] : [])];
  const tmin = Math.floor((Math.min(...vals) - 2) / 5) * 5, tmax = Math.ceil((Math.max(...vals) + 2) / 5) * 5;
  const Y = t => bottom - (t - tmin) / (tmax - tmin) * (bottom - top);
  let grid = '';
  for (let t = tmin; t <= tmax; t += 5) grid += k.line({ x: 40, y: Y(t) }, { x: W - 40, y: Y(t) }, { stroke: t === 0 ? c.axis : c.fineGrid }) + k.text(34, Y(t) + 4, `${t}`, { size: 10.5, anchor: 'end' });
  grid += k.text(34, top - 14, '°C', { size: 10.5, anchor: 'end', fill: c.ink });
  // Layers, drawn from the top to the bottom of the temperature field.
  let wall = '';
  layers.forEach((l, j) => { wall += materialFill(k, xs[j], top - 10, xs[j + 1] - xs[j], bottom - top + 20, kindOf(l)); });
  if (byR) {
    wall += k.rect(x0, top - 10, films[0], bottom - top + 20, { fill: c.glass }) + k.rect(xs[xs.length - 1], top - 10, films[1], bottom - top + 20, { fill: c.glass });
    wall += k.text(x0 + films[0] / 2, bottom + 24, 'R_si', { size: 10.5, anchor: 'middle', fill: c.ink }) + k.text(x1 - films[1] / 2, bottom + 24, 'R_se', { size: 10.5, anchor: 'middle', fill: c.ink });
  }
  layers.forEach((l, j) => { const m = (xs[j] + xs[j + 1]) / 2; wall += k.circle({ x: m, y: bottom + 22 }, 8, { fill: c.paper, stroke: c.ink, width: PEN.edge }) + k.text(m, bottom + 26, String(j + 1), { size: 10.5, anchor: 'middle', fill: c.ink, weight: 700 }); });
  // Profile: air → surface (film) → interfaces → surface → air.
  const T = p.nodes.map(nd => nd.T);
  const pts = byR
    ? [{ x: x0, y: Y(T[0]) }, ...xs.map((x, j) => ({ x, y: Y(T[j + 1]) })), { x: x1, y: Y(T[T.length - 1]) }]
    : [{ x: x0 - airW + 8, y: Y(T[0]) }, { x: x0 - 26, y: Y(T[0]) }, ...xs.map((x, j) => ({ x, y: Y(T[j + 1]) })), { x: x1 + 26, y: Y(T[T.length - 1]) }, { x: x1 + airW - 8, y: Y(T[T.length - 1]) }];
  let prof = '';
  if (!byR) {
    // Boundary layers: curved transitions in the air next to each surface.
    prof += k.path(`M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y} Q${x0 - 4},${pts[1].y} ${pts[2].x},${pts[2].y}`, { stroke: c.alt, width: 2.6 });
    prof += k.polyline(pts.slice(2, pts.length - 2), { stroke: c.alt, width: 2.6 });
    const a = pts[pts.length - 3], b = pts[pts.length - 2], e = pts[pts.length - 1];
    prof += k.path(`M${a.x},${a.y} Q${x1 + 4},${b.y} ${b.x},${b.y} L${e.x},${e.y}`, { stroke: c.alt, width: 2.6 });
  } else prof += k.polyline(pts, { stroke: c.alt, width: 2.6 });
  xs.forEach((x, j) => { prof += k.circle({ x, y: Y(T[j + 1]) }, 3.2, { fill: c.paper, stroke: c.alt, width: 1.5 }); });
  // Temperature labels at the two surfaces and at every interface wider than the label.
  let lab = k.label(xs[0] + 6, Y(T[1]) - 8, `θsi ${deg(T[1])}`, { size: 12, weight: 700, fill: c.alt });
  lab += k.label(xs[xs.length - 1] - 6, Y(T[T.length - 2]) + 18, `θse ${deg(T[T.length - 2])}`, { size: 12, weight: 700, fill: c.alt, anchor: 'end' });
  for (let j = 1; j < xs.length - 1; j++) if (xs[j + 1] - xs[j] > 70 && xs[j] - xs[j - 1] > 40) lab += k.label(xs[j] + 5, Y(T[j + 1]) + (j % 2 ? -8 : 16), deg(T[j + 1]), { size: 10.5, fill: c.ink });
  lab += k.label(40 + 4, Y(inside) - 8, `θi ${deg(inside, 0)}`, { size: 12, weight: 700, fill: c.ink }) + k.label(W - 44, Y(outside) - 8, `θe ${deg(outside, 0)}`, { size: 12, weight: 700, fill: c.ink, anchor: 'end' });
  // Dew point and mould limit of the room air.
  let lim = '';
  if (dew !== null) lim += k.line({ x: 40, y: Y(dew) }, { x: xs[0] + 40, y: Y(dew) }, { stroke: c.azi, width: 1.4, dash: '6 4' }) + k.label(xs[0] - 6, Y(dew) + 14, `dew point ${deg(dew)}`, { size: 10.5, fill: c.azi, anchor: 'end', weight: 600 });
  if (mould !== null) lim += k.line({ x: 40, y: Y(mould) }, { x: xs[0] + 40, y: Y(mould) }, { stroke: c.third, width: 1.4, dash: '2 3' }) + k.label(xs[0] - 6, Y(mould) - 6, `mould limit ${deg(mould)}`, { size: 10.5, fill: c.third, anchor: 'end', weight: 600 });
  if (mould !== null && T[1] < mould) lim += k.text(W / 2, top - 30, T[1] < dew ? 'Inside surface below the dew point: condensation' : 'Inside surface below the mould limit (80 % RH at the surface)', { size: 12, fill: c.red, anchor: 'middle', weight: 700 });
  const head = caption(k, 40, 24, `${label}${label ? ' · ' : ''}U = ${n(c0.U, 3)} W/(m²K) · q = ${n(p.q, 1)} W/m² · x-axis: ${byR ? 'thermal resistance' : 'thickness'}`);
  const sides = k.text(40 + airW / 2, bottom + 52, 'INSIDE', { size: 10.5, weight: 700, anchor: 'middle', fill: c.ink, spacing: 1.2 }) + k.text(W - 40 - airW / 2, bottom + 52, 'OUTSIDE', { size: 10.5, weight: 700, anchor: 'middle', fill: c.ink, spacing: 1.2 })
    + flowArrow(k, { x: W / 2 - 50, y: bottom + 48 }, { x: W / 2 + 50, y: bottom + 48 }) + k.text(W / 2, bottom + 66, 'heat flow q', { size: 10.5, anchor: 'middle', fill: c.heat });
  return svgDocument(k, { width: W, height: bottom + 78, title: 'Temperature profile through a layered construction', body: k.group('title', head) + k.group('grid', grid) + k.group('layers', wall) + k.group('limits', lim) + k.group('profile', prof) + k.group('labels', lab) + k.group('sides', sides) });
}

/* ---------- 07 · Surface coefficients: convection and radiation in parallel (Eq. 7.4–7.6) ---------- */
export function drawSurface(st, { standalone = false } = {}) {
  const k = kit(standalone, 'srf'), c = k.c, x0 = 180, x1 = 640, top = 46, h = 30, gap = 26;
  const inside = st.side === 'inside', conv = inside ? INSIDE_CONVECTION[st.direction] : outsideConvection(st.wind);
  const s = surfaceResistance({ convection: conv, emissivity: st.emissivity, meanTemp: inside ? 20 : 10 });
  const ref = surfaceResistance({ convection: inside ? INSIDE_CONVECTION[st.direction] : outsideConvection(4), emissivity: .9, meanTemp: inside ? 20 : 10 });
  const rows = [['This surface', s], [inside ? `ISO 6946, ε = 0.9` : 'ISO 6946, ε = 0.9, 4 m/s', ref]];
  const max = Math.max(10, Math.ceil(Math.max(...rows.map(([, r]) => r.convection + r.radiation)) / 5) * 5), X = v => x0 + v / max * (x1 - x0);
  const H = top + rows.length * (h + gap);
  let grid = '';
  for (let v = 0; v <= max; v += max > 20 ? 5 : max > 10 ? 2 : 1) grid += k.line({ x: X(v), y: top - 8 }, { x: X(v), y: H - 12 }, { stroke: c.fineGrid }) + k.text(X(v), H + 4, String(v), { size: 10.5, anchor: 'middle' });
  grid += k.text(x1, H + 22, 'h  W/(m²K)', { size: 10.5, anchor: 'end', fill: c.ink });
  let bars = '';
  rows.forEach(([name, r], j) => {
    const y = top + j * (h + gap), wc = r.convection / max * (x1 - x0), wr = r.radiation / max * (x1 - x0);
    bars += k.text(x0 - 12, y + h / 2 + 4, name, { size: 12, anchor: 'end', fill: c.ink, weight: 600 });
    bars += k.rect(x0, y, wc, h, { fill: c.heatFill, stroke: c.ink, width: PEN.hatch }) + k.rect(x0 + wc, y, wr, h, { fill: c.waterFill, stroke: c.ink, width: PEN.hatch });
    bars += k.label(x0 + wc + wr + 8, y + h / 2 + 4, `R_s = 1 / ${n(r.convection + r.radiation, 2)} = ${n(r.resistance, 3)} m²K/W`, { size: 12, weight: 700, fill: c.ink });
  });
  const key = k.rect(x0, H + 34, 16, 12, { fill: c.heatFill, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 22, H + 44, 'h_c convection', { size: 12, fill: c.ink })
    + k.rect(x0 + 150, H + 34, 16, 12, { fill: c.waterFill, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 172, H + 44, 'h_r long-wave radiation', { size: 12, fill: c.ink });
  const head = caption(k, 20, 24, `${inside ? `Inside surface · heat flow ${st.direction}` : `Outside surface · wind ${n(st.wind, 1)} m/s`} · ε = ${n(st.emissivity, 2)}`);
  return svgDocument(k, { width: 900, height: H + 60, title: 'Surface heat transfer coefficients and surface resistance', body: k.group('title', head) + k.group('grid', grid) + k.group('bars', bars) + k.group('key', key) });
}

/* ---------- 07 · Air layers (Eq. 7.10) ---------- */
export function drawAirLayer(st, { standalone = false } = {}) {
  const k = kit(standalone, 'air'), c = k.c, x0 = 70, x1 = 640, y0 = 50, y1 = 300, dmax = 100;
  const curve = (e1, e2) => Array.from({ length: 101 }, (_, j) => j * dmax / 100).map(d => ({ d, R: airLayer(d, st.direction, e1, e2).resistance }));
  const cur = curve(st.e1, st.e2), ref = curve(.9, .9), rmax = Math.max(.3, Math.ceil(Math.max(...cur.map(p => p.R), ...ref.map(p => p.R)) * 10 + .5) / 10);
  const X = d => x0 + d / dmax * (x1 - x0), Y = R => y1 - R / rmax * (y1 - y0);
  let grid = '';
  for (let R = 0; R <= rmax + 1e-9; R += rmax > .6 ? .2 : .1) grid += k.line({ x: x0, y: Y(R) }, { x: x1, y: Y(R) }, { stroke: R ? c.fineGrid : c.axis }) + k.text(x0 - 8, Y(R) + 4, n(R, 1), { size: 10.5, anchor: 'end' });
  for (let d = 0; d <= dmax; d += 10) grid += k.line({ x: X(d), y: y1 }, { x: X(d), y: y1 + 5 }, { stroke: c.axis }) + k.text(X(d), y1 + 18, String(d), { size: 10.5, anchor: 'middle' });
  grid += k.text(x0 - 8, y0 - 16, 'R_g  m²K/W', { size: 10.5, fill: c.ink }) + k.text(x1, y1 + 36, 'thickness of the air layer, mm', { size: 10.5, anchor: 'end', fill: c.ink });
  const line = (pts, o) => k.polyline(pts.map(p => ({ x: X(p.d), y: Y(p.R) })), o);
  let plot = line(ref, { stroke: c.muted, width: 1.4, dash: '5 4' }) + line(cur, { stroke: c.alt, width: 2.6 });
  const here = airLayer(st.thickness, st.direction, st.e1, st.e2), px = X(st.thickness), py = Y(here.resistance);
  plot += k.line({ x: px, y: y1 }, { x: px, y: py }, { stroke: c.alt, width: 1, dash: '2 3' }) + k.circle({ x: px, y: py }, 4.5, { fill: c.paper, stroke: c.alt, width: 2 });
  plot += k.label(px + (px > x1 - 160 ? -8 : 8), py - 10, `${st.thickness} mm · R_g = ${n(here.resistance, 2)}`, { size: 12, weight: 700, fill: c.alt, anchor: px > x1 - 160 ? 'end' : 'start' });
  plot += k.label(X(70), Y(ref[70].R) + 16, 'ε 0.9 / 0.9 (ordinary surfaces)', { size: 10.5, fill: c.muted, anchor: 'middle' });
  // Where conduction gives way to convection: the knee of the curve.
  const knee = cur.find(p => !airLayer(Math.max(p.d, .1), st.direction, st.e1, st.e2).conductionOnly);
  if (knee && knee.d > 0) plot += k.line({ x: X(knee.d), y: y0 }, { x: X(knee.d), y: y1 }, { stroke: c.axis, dash: '2 4' }) + k.text(X(knee.d) - 6, y0 + 10, '← still air conducts', { size: 10.5, anchor: 'end' }) + k.text(X(knee.d) + 6, y0 + 10, 'convection cells →', { size: 10.5 });
  const head = caption(k, 20, 24, `Heat flow ${st.direction} · ε₁ = ${n(st.e1, 2)}, ε₂ = ${n(st.e2, 2)} · E = ${n(here.E, 3)} · h_a = ${n(here.convection, 2)}, h_r = ${n(here.radiation, 2)} W/(m²K)`);
  return svgDocument(k, { width: 680, height: y1 + 50, title: 'Thermal resistance of an unventilated air layer', body: k.group('title', head) + k.group('grid', grid) + k.group('plot', plot) });
}

/* ---------- 07 · Parallel paths through a stud wall (Eq. 7.11) ---------- */
export function drawStuds(r, st, { standalone = false } = {}) {
  const k = kit(standalone, 'std'), c = k.c, W = 760, left = 60, right = W - 60, y0 = 70, depth = 120;
  // Plan section: two bays, the studs at the spacing, the insulation between.
  const bay = (right - left) / 2, sw = Math.max(5, st.studWidth / st.spacing * bay);
  let plan = k.rect(left, y0 - 10, right - left, 10, { fill: c.paper, stroke: c.ink, width: PEN.edge }) + materialFill(k, left, y0 - 10, right - left, 10, 'plaster');
  plan += materialFill(k, left, y0, right - left, depth, 'insulation');
  for (const x of [left + bay / 2, left + bay * 1.5]) plan += materialFill(k, x - sw / 2, y0, sw, depth, st.stud === 'steel' ? 'steel' : 'timber');
  plan += k.text(left - 8, y0 - 1, 'in', { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 }) + k.text(left - 8, y0 + depth + 4, 'out', { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 });
  plan += k.line({ x: left + bay / 2, y: y0 + depth + 18 }, { x: left + bay * 1.5, y: y0 + depth + 18 }, { stroke: c.ink, width: PEN.hatch }) + k.label(left + bay, y0 + depth + 32, `spacing ${st.spacing} mm`, { size: 10.5, anchor: 'middle', fill: c.ink });
  // Heat flux arrows, stroke width ∝ q of each path (upper-limit assumption: paths do not exchange heat).
  const qi = r.parts[0].c.U, qs = r.parts[1].c.U, wmax = Math.max(qi, qs), arrow = (x, q, colour) => k.line({ x, y: y0 + 8 }, { x, y: y0 + depth - 8 }, { stroke: colour, width: Math.max(.8, 6 * q / wmax), arrow: 'alt' });
  let flux = '';
  for (const f of [.15, .3, .7, .85]) flux += arrow(left + bay * f, qi, c.alt) + arrow(left + bay * (1 + f), qi, c.alt);
  for (const x of [left + bay / 2, left + bay * 1.5]) flux += arrow(x, qs, c.heat);
  // Bars: the two paths, the area-weighted result and the ISO 6946 limits.
  const bx0 = 250, bx1 = right - 120, by = y0 + depth + 60, umax = Math.max(.5, Math.ceil(Math.max(qi, qs, 1 / r.lower) * 4) / 4), X = u => bx0 + u / umax * (bx1 - bx0);
  const rowsU = [[`Insulation path · ${n(r.parts[0].fraction * 100, 1)} %`, qi], [`Stud path · ${n(r.parts[1].fraction * 100, 1)} %`, qs], ['Upper limit R′T (parallel paths)', 1 / r.upper], ['Lower limit R″T (isothermal planes)', 1 / r.lower], ['ISO 6946: mean of both', r.U]];
  let bars = '';
  rowsU.forEach(([name, u], j) => {
    const y = by + j * 26;
    bars += k.text(bx0 - 10, y + 13, name, { size: 12, anchor: 'end', fill: c.ink, weight: j === 4 ? 700 : 400 });
    bars += k.rect(bx0, y, Math.min(X(u), bx1 + 60) - bx0, 16, { fill: j === 4 ? c.heatFill : j < 2 ? c.paper : c.heatSoft, stroke: c.ink, width: PEN.hatch });
    bars += k.label(Math.min(X(u), bx1 + 60) + 6, y + 13, `U = ${n(u, 3)}`, { size: 12, fill: c.ink, weight: j === 4 ? 700 : 400 });
  });
  const warn = r.upper / r.lower > 1.5 ? k.text(W / 2, by + 5 * 26 + 18, `R′T / R″T = ${n(r.upper / r.lower, 2)} > 1.5: outside the scope of the simple method; use a numerical (2D) calculation`, { size: 12, anchor: 'middle', fill: c.red, weight: 700 }) : '';
  const head = caption(k, 20, 24, `${st.stud === 'steel' ? 'Steel' : 'Timber'} studs ${st.studWidth} mm at ${st.spacing} mm · insulation ${st.thickness} mm, λ = ${n(MATERIALS[st.insulation].lambda, 3)}`);
  return svgDocument(k, { width: W, height: by + 5 * 26 + (warn ? 34 : 14), title: 'Parallel heat flow paths through a stud wall', body: k.group('title', head) + k.group('plan', plan) + k.group('flux', flux) + k.group('bars', bars) + k.group('warning', warn) });
}

/* ---------- 08 · Monthly degree days (Eq. 8.5) ---------- */
export function drawDegreeDays(dd, { standalone = false, label = '' } = {}) {
  const k = kit(standalone, 'hdd'), c = k.c, x0 = 70, x1 = 690, y0 = 46, y1 = 250, bw = (x1 - x0) / 12;
  const peak = Math.max(...dd.months.map(m => Math.max(m.hdd, m.cdd))), step = peak > 400 ? 100 : 50, ymax = Math.max(step * 2, Math.ceil(peak / step) * step), Y = v => y1 - v / ymax * (y1 - y0);
  let grid = '';
  for (let v = 0; v <= ymax; v += step) grid += k.line({ x: x0, y: Y(v) }, { x: x1, y: Y(v) }, { stroke: v ? c.fineGrid : c.axis }) + k.text(x0 - 8, Y(v) + 4, String(v), { size: 10.5, anchor: 'end' });
  grid += k.text(x0 - 56, y0 - 16, 'K·d per month', { size: 10.5, fill: c.ink });
  let bars = '';
  dd.months.forEach((m, j) => {
    const x = x0 + j * bw;
    if (m.hdd > .5) bars += k.rect(x + bw * .14, Y(m.hdd), bw * .44, y1 - Y(m.hdd), { fill: c.heatFill, stroke: c.ink, width: PEN.hatch }) + k.text(x + bw * .36, Y(m.hdd) - 5, String(Math.round(m.hdd)), { size: 10, anchor: 'middle', fill: c.ink });
    if (m.cdd > .5) bars += k.rect(x + bw * .6, Y(m.cdd), bw * .28, y1 - Y(m.cdd), { fill: c.waterFill, stroke: c.ink, width: PEN.hatch }) + k.text(x + bw * .74, Y(m.cdd) - 5, String(Math.round(m.cdd)), { size: 10, anchor: 'middle', fill: c.muted });
    bars += k.text(x + bw / 2, y1 + 18, monthNames[j], { size: 10.5, anchor: 'middle' });
  });
  const key = k.rect(x0, y1 + 34, 16, 12, { fill: c.heatFill, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 22, y1 + 44, `Heating degree days · ${Math.round(dd.hdd)} K·d per year`, { size: 12, fill: c.ink, weight: 700 })
    + k.rect(x0 + 330, y1 + 34, 16, 12, { fill: c.waterFill, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 352, y1 + 44, `Cooling degree days · ${Math.round(dd.cdd)} K·d`, { size: 12, fill: c.ink });
  const head = caption(k, 20, 24, label);
  return svgDocument(k, { width: 720, height: y1 + 60, title: 'Monthly heating and cooling degree days', body: k.group('title', head) + k.group('grid', grid) + k.group('bars', bars) + k.group('key', key) });
}

/* ---------- 08 · Steady heat balance of a building (Eq. 8.1) ---------- */
/** losses: [{ name, value }] W; gains: [{ name, value }] W; heating W. */
export function drawBalance({ losses, gains, heating, surplus = 0 }, { standalone = false, label = '' } = {}) {
  const k = kit(standalone, 'bal'), c = k.c, x0 = 150, x1 = 690, top = 56, h = 40;
  const total = Math.max(1, losses.reduce((s, l) => s + l.value, 0)), supply = gains.reduce((s, g) => s + g.value, 0) + heating;
  const max = Math.max(total, supply), X = v => x0 + v / max * (x1 - x0);
  const FILLS = [c.heatSoft, c.heatFill, c.paper, c.waterFill, c.face, c.glass];
  const stack = (items, y, fills) => { let x = x0, g = ''; items.forEach((it, j) => { const w = it.value / max * (x1 - x0); if (w > .3) { g += k.rect(x, y, w, h, { fill: fills[j % fills.length], stroke: c.ink, width: PEN.hatch }); if (w > 52) g += k.label(x + w / 2, y + h / 2 - 2, it.name, { size: 10.5, anchor: 'middle', fill: c.ink, weight: 600 }) + k.label(x + w / 2, y + h / 2 + 12, `${Math.round(it.value)} W`, { size: 10.5, anchor: 'middle', fill: c.ink }); } x += w; }); return g; };
  let body = k.text(x0 - 12, top + h / 2 + 4, 'Losses', { size: 12, anchor: 'end', fill: c.ink, weight: 700 }) + stack(losses, top, FILLS);
  body += k.label(X(total) + 6, top + h / 2 + 4, `${Math.round(total)} W`, { size: 12, fill: c.ink, weight: 700 });
  const y2 = top + h + 30, supplies = gains;
  body += k.text(x0 - 12, y2 + h / 2 + 4, 'Gains + heating', { size: 12, anchor: 'end', fill: c.ink, weight: 700 }) + stack(supplies, y2, [c.paper, c.waterFill, c.heatSoft, c.face]);
  if (heating > .5) { const x = X(supply - heating); body += k.rect(x, y2, X(supply) - x, h, { fill: c.shadow, stroke: c.ink, width: PEN.edge }) + k.label((x + X(supply)) / 2, y2 + h / 2 + 4, `Heating ${Math.round(heating)} W`, { size: 12, anchor: 'middle', fill: c.ink, weight: 700 }); }
  if (surplus > .5) body += k.text(x0, y2 + h + 22, `Gains exceed the losses by ${Math.round(surplus)} W: the space overheats unless heat is removed (ventilation, cooling).`, { size: 12, fill: c.red, weight: 700 });
  body += k.line({ x: X(total), y: top - 10 }, { x: X(total), y: y2 + h + 8 }, { stroke: c.alt, width: 1.4, dash: '5 4' });
  const head = caption(k, 20, 24, label);
  return svgDocument(k, { width: 720, height: y2 + h + (surplus > .5 ? 34 : 16), title: 'Steady-state heat balance: losses and the gains and heating that balance them', body: k.group('title', head) + k.group('balance', body) });
}

/* ---------- 08 · Monthly window balance: conduction loss vs solar gain ---------- */
export function drawWindowBalance(r, { standalone = false, label = '' } = {}) {
  const k = kit(standalone, 'wbl'), c = k.c, x0 = 70, x1 = 690, y0 = 46, y1 = 250, bw = (x1 - x0) / 12;
  const peak = Math.max(...r.months.map(m => Math.max(m.loss, m.gain)), 10), step = peak > 100 ? 25 : peak > 40 ? 10 : 5, ymax = Math.ceil(peak / step) * step, Y = v => y1 - v / ymax * (y1 - y0);
  let grid = '';
  for (let v = 0; v <= ymax; v += step) grid += k.line({ x: x0, y: Y(v) }, { x: x1, y: Y(v) }, { stroke: v ? c.fineGrid : c.axis }) + k.text(x0 - 8, Y(v) + 4, String(v), { size: 10.5, anchor: 'end' });
  grid += k.text(x0 - 56, y0 - 16, 'kWh per m² of window and month', { size: 10.5, fill: c.ink });
  let bars = '';
  r.months.forEach((m, j) => {
    const x = x0 + j * bw;
    bars += k.rect(x + bw * .14, Y(m.loss), bw * .34, y1 - Y(m.loss), { fill: c.face, stroke: c.ink, width: PEN.hatch });
    bars += k.rect(x + bw * .52, Y(m.gain), bw * .34, y1 - Y(m.gain), { fill: c.heatFill, stroke: c.ink, width: PEN.hatch });
    bars += k.text(x + bw / 2, y1 + 18, monthNames[j], { size: 10.5, anchor: 'middle' });
  });
  const key = k.rect(x0, y1 + 34, 16, 12, { fill: c.face, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 22, y1 + 44, `Conduction loss U·Σ(θi − θe)⁺ · ${Math.round(r.loss)} kWh/m²a`, { size: 12, fill: c.ink })
    + k.rect(x0 + 330, y1 + 34, 16, 12, { fill: c.heatFill, stroke: c.ink, width: PEN.hatch }) + k.text(x0 + 352, y1 + 44, `Solar gain SHGC·H · ${Math.round(r.gain)} kWh/m²a`, { size: 12, fill: c.ink });
  return svgDocument(k, { width: 720, height: y1 + 60, title: 'Monthly conduction loss and solar gain of a window', body: k.group('title', caption(k, 20, 24, label)) + k.group('grid', grid) + k.group('bars', bars) + k.group('key', key) });
}

