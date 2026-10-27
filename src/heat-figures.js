// Static fine-liner figures for Chapters 07 (heat transfer through the envelope) and 08 (building heat
// balance). Written as editable SVG files and inlined into heat-transfer.html and heat-balance.html by
// scripts/generate-heat.mjs. Numbers in the drawings come from src/heat.js, so figure and text agree.
import { svgDocument } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { construction, temperatureProfile, airLayer, MATERIALS, diffusivity, penetrationDepth } from './heat.js';
import { materialFill, caption } from './heat-diagrams.js';

const n = (x, d = 1) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const lines = (k, x, y, arr, o = {}) => arr.map((t, i) => k.text(x, y + i * (o.step ?? 16), t, { size: 12, fill: k.c.ink, ...o })).join('');

/** Wavy arrow for long-wave or solar radiation from a to b. */
function wavy(k, a, b, o = {}) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, amp = o.amp ?? 3.5, waves = o.waves ?? Math.max(2, Math.round(L / 16));
  const pts = Array.from({ length: waves * 8 + 1 }, (_, i) => { const t = i / (waves * 8), s = Math.sin(t * waves * 2 * Math.PI) * amp * (t < .85 ? 1 : (1 - t) / .15); return `${(a.x + dx * t - uy * s).toFixed(2)},${(a.y + dy * t + ux * s).toFixed(2)}`; });
  return k.path(`M${pts.join(' L')}`, { stroke: o.stroke ?? k.c.heat, width: o.width ?? 1.4, arrow: o.arrow ?? 'alt' });
}
/** Straight arrow. */
const arrow = (k, a, b, stroke, name = 'alt', width = 1.6) => k.line(a, b, { stroke, width, arrow: name });
/** Break line (drafting) across a cut edge from (x0, y) to (x1, y). */
function breakLine(k, x0, x1, y) {
  const m = (x0 + x1) / 2;
  return k.polyline([{ x: x0 - 8, y }, { x: m - 6, y }, { x: m - 2, y: y - 7 }, { x: m + 2, y: y + 7 }, { x: m + 6, y }, { x: x1 + 8, y }], { stroke: k.c.ink, width: PEN.edge });
}
/** Resistor (zigzag) from (x, y) over length L. */
function resistor(k, x, y, L, o = {}) {
  const a = x + L * .25, b = x + L * .75, z = 6, steps = 6, w = (b - a) / steps;
  const pts = [{ x, y }, { x: a, y }];
  for (let i = 0; i < steps; i++) pts.push({ x: a + w * (i + .5), y: y + (i % 2 ? z : -z) });
  pts.push({ x: b, y }, { x: x + L, y });
  return k.polyline(pts, { stroke: o.stroke ?? k.c.ink, width: o.width ?? PEN.outline });
}

/* 01 · Three modes in a wall section (Incropera Fig. 1.1; lecture frames 603–605) */
export function figHeatModes(standalone = false) {
  const k = kit(standalone, 'hm'), c = k.c, top = 70, bot = 370, xa = 360, xb = 372, xc = 432, xd = 492;
  let wall = materialFill(k, xa, top, xb - xa, bot - top, 'plaster') + materialFill(k, xb, top, xc - xb, bot - top, 'brick') + materialFill(k, xc, top, xd - xc, bot - top, 'insulation');
  wall += breakLine(k, xa, xd, top) + breakLine(k, xa, xd, bot);
  wall += k.text((xa + xd) / 2, bot + 30, 'plaster · masonry · insulation', { size: 10.5, anchor: 'middle' });
  // Conduction through the layers.
  let cond = '';
  for (const y of [180, 220, 260]) cond += arrow(k, { x: xa - 4, y }, { x: xd + 6, y }, c.heat, 'alt', 2.2);
  cond += k.text((xa + xd) / 2, 46, 'CONDUCTION', { size: 12, weight: 700, fill: c.ink, anchor: 'middle' }) + k.text((xa + xd) / 2, 62, 'q = λ · Δθ / d', { size: 12, fill: c.ink, anchor: 'middle' });
  // Inside: air cools at the cold wall and sinks; long-wave radiation from the room surfaces.
  let inside = k.path(`M${xa - 18},110 L${xa - 18},330 Q${xa - 18},350 ${xa - 40},350 L${xa - 120},350 Q${xa - 140},350 ${xa - 140},330 L${xa - 140},130 Q${xa - 140},110 ${xa - 120},110 L${xa - 40},110`, { stroke: c.alt, width: 1.5, dash: '6 4' });
  inside += arrow(k, { x: xa - 18, y: 200 }, { x: xa - 18, y: 240 }, c.alt, 'alt', 1.8) + arrow(k, { x: xa - 140, y: 260 }, { x: xa - 140, y: 220 }, c.alt, 'alt', 1.8);
  inside += lines(k, 58, 206, ['FREE CONVECTION'], { weight: 700 }) + lines(k, 58, 224, ['Air cools at the cold surface', 'and sinks (downdraught).', 'h_c ≈ 2.5 W/(m²K)'], { size: 11 });
  for (const y of [150, 310]) inside += wavy(k, { x: 50, y }, { x: xa - 26, y: y + 12 }, { stroke: c.third, arrow: 'third' });
  inside += lines(k, 30, 386, ['LONG-WAVE RADIATION between room surfaces · h_r ≈ 5 W/(m²K)'], { size: 11, fill: c.third, weight: 600 });
  inside += k.rect(20, top, 24, bot - top, { fill: c.face }) + k.text(20, top - 8, 'room surfaces', { size: 10.5 });
  // Outside: wind (forced convection), radiation to the sky, absorbed sunlight.
  let outside = '';
  for (const [y0, y1] of [[96, 196], [196, 296], [276, 356]]) outside += k.path(`M${xd + 70},${y0} Q${xd + 18},${(y0 + y1) / 2} ${xd + 26},${y1}`, { stroke: c.azi, width: 1.6, arrow: 'azi' });
  outside += lines(k, xd + 90, 180, ['FORCED CONVECTION'], { weight: 700 }) + lines(k, xd + 90, 198, ['Wind along the facade', 'h_c ≈ 4 + 4·v W/(m²K)', '≈ 20 W/(m²K) at 4 m/s'], { size: 11 });
  outside += wavy(k, { x: xd + 10, y: 120 }, { x: xd + 100, y: 64 }, { stroke: c.third, arrow: 'third' }) + lines(k, xd + 110, 60, ['RADIATION to the sky', 'and the surroundings'], { size: 11, fill: c.third, weight: 600, step: 14 });
  outside += k.circle({ x: 720, y: 300 }, 12, { fill: c.sun, stroke: c.alt }) + wavy(k, { x: 704, y: 306 }, { x: xd + 10, y: 330 }, { stroke: c.alt, arrow: 'alt', amp: 2.5 });
  outside += lines(k, xd + 40, 362, ['SOLAR (short-wave): α · G absorbed'], { size: 11, fill: c.alt, weight: 600 });
  const head = caption(k, 20, 22, 'Winter · inside θi = 20 °C (left) · outside θe = 0 °C (right)');
  return svgDocument(k, { width: 760, height: 400, title: 'Conduction, convection and radiation in a wall section', body: k.group('title', head) + k.group('wall', wall) + k.group('conduction', cond) + k.group('inside', inside) + k.group('outside', outside) });
}

/* 02 · Wall section, temperature profile and the series resistor network (lecture frames 606–610) */
export function figResistorNetwork(standalone = false) {
  const k = kit(standalone, 'rn'), c = k.c, cons = construction([{ material: 'limePlaster', thickness: .01, name: 'Plaster' }, { material: 'mineralWool', thickness: .1, lambda: .032, name: 'Mineral wool' }, { material: 'basalt', thickness: .25, name: 'Basalt' }]);
  const p = temperatureProfile(cons, 20, 10), x0 = 220, s = 1, top = 50, bot = 210, xs = [x0];
  cons.layers.forEach(l => xs.push(xs[xs.length - 1] + l.thickness * 1000 * s));
  const Y = t => bot - 10 - (t - 9) / 12 * (bot - top - 20);
  let wall = '';
  cons.layers.forEach((l, j) => { wall += materialFill(k, xs[j], top, xs[j + 1] - xs[j], bot - top, ['plaster', 'insulation', 'stone'][j]); });
  const T = p.nodes.map(nd => nd.T), x1 = xs[3];
  let prof = k.path(`M${x0 - 110},${Y(20)} L${x0 - 30},${Y(20)} Q${x0 - 4},${Y(20)} ${x0},${Y(T[1])}`, { stroke: c.alt, width: 2.6 }) + k.polyline(xs.map((x, j) => ({ x, y: Y(T[j + 1]) })), { stroke: c.alt, width: 2.6 }) + k.path(`M${x1},${Y(T[4])} Q${x1 + 4},${Y(10)} ${x1 + 30},${Y(10)} L${x1 + 110},${Y(10)}`, { stroke: c.alt, width: 2.6 });
  prof += k.label(x0 - 108, Y(20) - 8, 'θi = 20 °C', { size: 12, weight: 700, fill: c.ink }) + k.label(x1 + 108, Y(10) - 8, 'θe = 10 °C', { size: 12, weight: 700, fill: c.ink, anchor: 'end' });
  prof += k.label(x0 + 14, Y(T[1]) + 18, `θsi = ${n(T[1], 2)} °C`, { size: 11, fill: c.alt, weight: 700 }) + k.label(xs[2] + 8, Y(T[3]) - 10, `${n(T[3], 2)} °C`, { size: 11, fill: c.alt }) + k.label(x1 - 6, Y(T[4]) + 18, `θse = ${n(T[4], 2)} °C`, { size: 11, fill: c.alt, weight: 700, anchor: 'end' });
  wall += k.text((x0 + xs[1]) / 2, bot + 16, '10', { size: 10.5, anchor: 'middle' }) + k.text((xs[1] + xs[2]) / 2, bot + 16, '100 mm · λ 0.032', { size: 10.5, anchor: 'middle' }) + k.text((xs[2] + x1) / 2, bot + 16, '250 mm · λ 3.5', { size: 10.5, anchor: 'middle' });
  // Resistor chain: nodes at the air, surfaces and interfaces.
  const ny = 300, nodes = [70, 200, 330, 460, 590, 720], names = ['θi', 'θsi', 'θ1', 'θ2', 'θse', 'θe'], vals = T;
  let net = '';
  const R = [cons.rsi, ...cons.layers.map(l => l.resistance), cons.rse], rn = ['R_si', 'R_1 plaster', 'R_2 wool', 'R_3 basalt', 'R_se'];
  for (let j = 0; j < 5; j++) {
    const a = nodes[j] + 6, L = nodes[j + 1] - nodes[j] - 12;
    if (j === 0 || j === 4) {
      // Surface resistance: convection and radiation in parallel.
      net += k.line({ x: a, y: ny }, { x: a + 12, y: ny }, { width: PEN.outline }) + k.line({ x: a + L - 12, y: ny }, { x: a + L, y: ny }, { width: PEN.outline });
      net += k.line({ x: a + 12, y: ny - 16 }, { x: a + 12, y: ny + 16 }, { width: PEN.outline }) + k.line({ x: a + L - 12, y: ny - 16 }, { x: a + L - 12, y: ny + 16 }, { width: PEN.outline });
      net += resistor(k, a + 12, ny - 16, L - 24) + resistor(k, a + 12, ny + 16, L - 24);
      net += k.text(a + L / 2, ny - 28, '1/h_c', { size: 10.5, anchor: 'middle' }) + k.text(a + L / 2, ny + 38, '1/h_r', { size: 10.5, anchor: 'middle' });
    } else net += resistor(k, a, ny, L);
    net += k.text(a + L / 2, ny + (j === 0 || j === 4 ? 56 : 30), rn[j], { size: 11, anchor: 'middle', fill: c.ink, weight: 600 }) + k.text(a + L / 2, ny + (j === 0 || j === 4 ? 70 : 44), `${n(R[j], 3)} m²K/W`, { size: 10.5, anchor: 'middle' });
  }
  nodes.forEach((x, j) => { net += k.circle({ x, y: ny }, 5, { fill: c.paper, stroke: c.alt, width: 1.8 }) + k.label(x, ny - 40, `${names[j]} ${n(vals[j], 2)}`, { size: 11, anchor: 'middle', fill: c.alt, weight: 700 }); });
  // Dashed links from the network nodes to the section.
  const sx = [x0 - 110, x0, xs[1], xs[2], x1, x1 + 110];
  nodes.forEach((x, j) => { net += k.line({ x: sx[j], y: bot + 24 }, { x, y: ny - 54 }, { stroke: c.axis, dash: '2 4' }); });
  net += arrow(k, { x: 300, y: ny + 92 }, { x: 490, y: ny + 92 }, c.heat, 'alt', 2) + k.text(395, ny + 110, `q = Δθ / R_T = 10 / ${n(cons.total, 2)} = ${n(p.q, 2)} W/m²  ·  U = 1 / R_T = ${n(cons.U, 3)} W/(m²K)`, { size: 12, anchor: 'middle', fill: c.ink, weight: 700 });
  const head = caption(k, 20, 26, 'Lecture example · Δθ = 10 K · the temperature drops in proportion to each resistance');
  return svgDocument(k, { width: 790, height: 430, title: 'Wall section, temperature profile and the equivalent series resistor network', body: k.group('title', head) + k.group('section', wall) + k.group('profile', prof) + k.group('network', net) });
}

/* 03 · Air layer: conduction, convection cell and radiation (Bauphysik II 2.3; Incropera §9.8, §13.2) */
export function figAirCavity(standalone = false) {
  const k = kit(standalone, 'ac'), c = k.c, top = 60, bot = 330;
  const panel = (x, gap, title, foil, R) => {
    let g = materialFill(k, x, top, 34, bot - top, 'brick') + materialFill(k, x + 34 + gap, top, 34, bot - top, 'brick');
    if (foil) g += k.line({ x: x + 34 + gap - 1.5, y: top }, { x: x + 34 + gap - 1.5, y: bot }, { stroke: c.ink, width: 2.25 });
    const L = x + 34, Rr = x + 34 + gap;
    if (gap < 20) for (const y of [120, 195, 270]) g += arrow(k, { x: L + 1, y }, { x: Rr - 1, y }, c.heat, 'alt', 1.2);
    else {
      g += k.path(`M${L + 7},${bot - 30} L${L + 7},${top + 30} Q${L + 7},${top + 12} ${(L + Rr) / 2},${top + 12} Q${Rr - 7},${top + 12} ${Rr - 7},${top + 30} L${Rr - 7},${bot - 30} Q${Rr - 7},${bot - 12} ${(L + Rr) / 2},${bot - 12} Q${L + 7},${bot - 12} ${L + 7},${bot - 30}`, { stroke: c.alt, width: 1.5, dash: '5 4' });
      g += arrow(k, { x: L + 7, y: 210 }, { x: L + 7, y: 170 }, c.alt, 'alt', 1.8) + arrow(k, { x: Rr - 7, y: 170 }, { x: Rr - 7, y: 210 }, c.alt, 'alt', 1.8);
    }
    for (const y of [140, 240]) g += foil ? wavy(k, { x: L + 3, y }, { x: Rr - 10, y: y + 4 }, { stroke: c.third, arrow: 'third', width: .8, amp: 2 }) : wavy(k, { x: L + 3, y }, { x: Rr - 4, y: y + 4 }, { stroke: c.third, arrow: 'third', amp: 2.5 });
    g += caption(k, x, top - 26, title) + k.text(x + 34 + gap / 2, bot + 22, `R_g = ${n(R, 2)} m²K/W`, { size: 12, anchor: 'middle', fill: c.ink, weight: 700 });
    g += k.text(x + 17, bot + 40, 'warm', { size: 10.5, anchor: 'middle' }) + k.text(x + 51 + gap, bot + 40, 'cold', { size: 10.5, anchor: 'middle' });
    return g;
  };
  let body = panel(40, 12, 'a · 10 mm', false, airLayer(10).resistance);
  body += panel(270, 60, 'b · 50 mm', false, airLayer(50).resistance);
  body += panel(530, 60, 'c · 50 mm, foil ε = 0.05', true, airLayer(50, 'horizontal', .9, .05).resistance);
  const key = arrow(k, { x: 40, y: 392 }, { x: 70, y: 392 }, c.heat, 'alt', 1.2) + k.text(78, 396, 'conduction through still air', { size: 11, fill: c.ink })
    + k.line({ x: 270, y: 392 }, { x: 300, y: 392 }, { stroke: c.alt, width: 1.5, dash: '5 4' }) + k.text(308, 396, 'convection cell (rises warm, falls cold)', { size: 11, fill: c.ink })
    + wavy(k, { x: 560, y: 392 }, { x: 590, y: 392 }, { stroke: c.third, arrow: 'third', amp: 2 }) + k.text(598, 396, 'long-wave radiation', { size: 11, fill: c.ink });
  return svgDocument(k, { width: 760, height: 412, title: 'Heat transfer across a vertical air layer: conduction, convection and radiation', body: k.group('panels', body) + k.group('key', key) });
}

/* 04 · ISO 6946 upper and lower limits for an inhomogeneous layer (Bauphysik II 8.4) */
export function figBounds(standalone = false) {
  const k = kit(standalone, 'bd'), c = k.c, top = 70, h = 200;
  const element = (x, title) => {
    // Inside on top: board, then insulation with a stud, then board. Heat flows down.
    let g = materialFill(k, x, top, 300, 16, 'plaster') + materialFill(k, x, top + 16, 300, h - 32, 'insulation') + materialFill(k, x + 125, top + 16, 50, h - 32, 'timber') + materialFill(k, x, top + h - 16, 300, 16, 'plaster');
    return g + caption(k, x, top - 30, title) + k.text(x - 8, top + 10, 'in', { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 }) + k.text(x - 8, top + h - 2, 'out', { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 });
  };
  let a = element(40, 'a · upper limit R′T: adiabatic planes');
  for (const x of [165, 215]) a += k.line({ x, y: top - 8 }, { x, y: top + h + 8 }, { stroke: c.red, width: 1.5, dash: '6 3' });
  for (const x of [80, 120, 190, 260, 300]) a += arrow(k, { x, y: top + 4 }, { x, y: top + h - 4 }, x === 190 ? c.heat : c.alt, 'alt', x === 190 ? 3 : 1.4);
  a += lines(k, 40, top + h + 30, ['Each section is its own wall; no heat crosses', 'the section boundaries. Sections add in parallel:', '1 / R′T = Σ f_j / R_T,j  (overestimates R)'], { size: 11 });
  let b = element(420, 'b · lower limit R″T: isothermal planes');
  for (const y of [top + 16, top + h - 16]) b += k.line({ x: 410, y }, { x: 730, y }, { stroke: c.red, width: 1.5, dash: '6 3' });
  b += k.path(`M470,${top + 20} Q560,${top + 70} 570,${top + h - 20}`, { stroke: c.alt, width: 1.4, arrow: 'alt' }) + k.path(`M680,${top + 20} Q580,${top + 70} 580,${top + h - 20}`, { stroke: c.alt, width: 1.4, arrow: 'alt' }) + arrow(k, { x: 575, y: top + 20 }, { x: 575, y: top + h - 20 }, c.heat, 'alt', 3);
  b += lines(k, 420, top + h + 30, ['Each layer is averaged first; heat may move', 'sideways into the stud. Layers add in series:', 'R″T = R_si + Σ d_i / λ_mean,i + R_se  (underestimates R)'], { size: 11 });
  const foot = lines(k, 390, top + h + 96, ['ISO 6946 uses R_T = (R′T + R″T) / 2, valid while R′T / R″T ≤ 1.5.', 'Beyond that (steel studs, metal fixings) a numerical 2D or 3D calculation is required (ISO 10211).'], { size: 11.5, anchor: 'middle', weight: 600 });
  return svgDocument(k, { width: 780, height: top + h + 120, title: 'Upper and lower limits of the thermal resistance of an inhomogeneous construction', body: k.group('upper', a) + k.group('lower', b) + k.group('note', foot) });
}

/** Explicit finite-difference temperatures in a slab with fixed surface temperatures (for figure 05). */
function slabProfiles(m, L, tInit, tIn, tOut, hours) {
  const N = 31, dx = L / (N - 1), a = diffusivity(m), dt = .4 * dx * dx / a, T = Array(N).fill(tInit);
  T[0] = tIn; T[N - 1] = tOut;
  const out = [], marks = hours.map(h => h * 3600);
  let t = 0, next = 0;
  while (next < marks.length) {
    if (t >= marks[next]) { out.push([...T]); next++; continue; }
    const U = [...T];
    for (let i = 1; i < N - 1; i++) T[i] = U[i] + a * dt / (dx * dx) * (U[i + 1] - 2 * U[i] + U[i - 1]);
    t += dt;
  }
  return out;
}

/* 05 · Steady state, a step change and a daily cycle (Incropera §5.7, §5.9; Bauphysik II 3) */
export function figSteadyTransient(standalone = false) {
  const k = kit(standalone, 'st'), c = k.c, top = 70, bot = 300, Wp = 200, L = .3, con = MATERIALS.concrete;
  const panel = (x, title) => materialFill(k, x, top, Wp, bot - top, 'concreteLight') + caption(k, x - 10, top - 30, title) + k.text(x - 4, bot + 18, 'in', { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 }) + k.text(x + Wp + 4, bot + 18, 'out', { size: 10.5, fill: c.ink, weight: 700 }) + k.text(x + Wp / 2, bot + 18, '300 mm concrete', { size: 10.5, anchor: 'middle' });
  const Y = t => bot - 10 - (t - 0) / 25 * (bot - top - 20);
  const curve = (x0, T) => k.polyline(T.map((t, i) => ({ x: x0 + i / (T.length - 1) * Wp, y: Y(t) })), { stroke: c.alt, width: 2.4 });
  // a · steady state: a straight line that does not change.
  let a = panel(40, 'a · steady state') + curve(40, [20, 5]) + k.label(40 + Wp / 2, Y(12.5) - 14, 'θ(x) fixed in time', { size: 11, fill: c.alt, anchor: 'middle', weight: 700 });
  a += lines(k, 30, bot + 44, ['q in = q out at every instant.', 'Only λ and d matter (R, U).'], { size: 11 });
  // b · heating switched on: profiles after 2 h, 12 h, 48 h and the steady line.
  const hrs = [2, 12, 48], prof = slabProfiles(con, L, 5, 20, 5, hrs);
  let b = panel(300, 'b · step: heating switched on');
  prof.forEach((T, j) => { b += k.polyline(T.map((t, i) => ({ x: 300 + i / (T.length - 1) * Wp, y: Y(t) })), { stroke: c.alt, width: 1.6, dash: j < 2 ? '5 3' : undefined }); const i = T.findIndex(t => t < 7.5); b += k.label(300 + Math.max(.07, i / (T.length - 1)) * Wp + 4, Y(7.5) - j * 14 - 4, `${hrs[j]} h`, { size: 10.5, fill: c.alt, weight: 700 }); });
  b += k.polyline([{ x: 300, y: Y(20) }, { x: 300 + Wp, y: Y(5) }], { stroke: c.muted, width: 1.2, dash: '2 3' }) + k.label(300 + Wp * .3, Y(15.5) - 8, 'steady', { size: 10.5, fill: c.muted });
  b += lines(k, 290, bot + 44, ['Heat goes into storage first; the wall needs', 'days to settle (ρ, c and λ all matter).'], { size: 11 });
  // c · daily cycle at the outer surface: amplitude decays as exp(−x/δ).
  const delta = penetrationDepth(diffusivity(con)), xs = Array.from({ length: 31 }, (_, i) => i / 30 * L);
  const up = xs.map(x => 15 + 10 * Math.exp(-(L - x) / delta)), lo = xs.map(x => 15 - 10 * Math.exp(-(L - x) / delta));
  let cc = panel(560, 'c · daily cycle outside ±10 K');
  cc += curve(560, up) + curve(560, lo);
  for (const ph of [0, 1.6, 3.2]) cc += k.polyline(xs.map((x, i) => ({ x: 560 + i / 30 * Wp, y: Y(15 + 10 * Math.exp(-(L - x) / delta) * Math.cos(ph - (L - x) / delta)) })), { stroke: c.alt, width: 1, dash: '3 3' });
  const xd = 560 + (L - delta) / L * Wp;
  cc += k.line({ x: xd, y: top + 6 }, { x: xd, y: bot - 6 }, { stroke: c.azi, width: 1.4, dash: '6 3' }) + k.line({ x: xd, y: top + 16 }, { x: 560 + Wp, y: top + 16 }, { stroke: c.azi, width: 1, arrow: 'azi' }) + k.label(xd - 6, top + 20, `δ = ${n(delta * 1000, 0)} mm`, { size: 11, fill: c.azi, anchor: 'end', weight: 700 });
  cc += lines(k, 550, bot + 44, ['Envelope of the daily swing; at depth δ the', 'amplitude is 37 %, at 3δ only 5 %.'], { size: 11 });
  return svgDocument(k, { width: 800, height: bot + 84, title: 'Temperature profiles in a concrete wall: steady state, after a step change and under a daily cycle', body: k.group('steady', a) + k.group('step', b) + k.group('periodic', cc) });
}

/* 06 · Heat flows of a building (lecture frames 583, 651) */
export function figEnergyFlows(standalone = false) {
  const k = kit(standalone, 'ef'), c = k.c, gy = 360, xl = 180, xr = 560, eave = 200, ridge = 110;
  let house = k.line({ x: 40, y: gy }, { x: 740, y: gy }, { stroke: c.ink, width: PEN.profile });
  for (let x = 46; x < 740; x += 14) house += k.line({ x, y: gy }, { x: x - 8, y: gy + 8 }, { stroke: c.ink, width: PEN.hatch });
  house += k.polygon([{ x: xl, y: gy }, { x: xl, y: eave }, { x: (xl + xr) / 2, y: ridge }, { x: xr, y: eave }, { x: xr, y: gy }], { fill: c.paper, stroke: c.ink, width: PEN.outline });
  house += k.rect(xr - 6, 240, 12, 70, { fill: c.glass, stroke: c.ink, width: PEN.edge }) + k.text(xr + 14, 330, 'window (south)', { size: 10.5 });
  // Losses: transmission through roof, walls, window; infiltration and ventilation.
  let loss = arrow(k, { x: 300, y: 158 }, { x: 270, y: 108 }, c.heat, 'alt', 2) + arrow(k, { x: 440, y: 158 }, { x: 470, y: 108 }, c.heat, 'alt', 2) + arrow(k, { x: xl + 4, y: 280 }, { x: xl - 46, y: 280 }, c.heat, 'alt', 2) + arrow(k, { x: xr + 4, y: 226 }, { x: xr + 50, y: 226 }, c.heat, 'alt', 2);
  loss += lines(k, 200, 92, ['Φ_T  transmission (conduction): Σ U·A · (θi − θe)'], { weight: 700, size: 11.5 });
  loss += k.path(`M${xl - 50},336 Q${xl - 20},340 ${xl + 30},330`, { stroke: c.azi, width: 1.6, arrow: 'azi' }) + k.path(`M${(xl + xr) / 2 + 30},${ridge + 40} Q${(xl + xr) / 2 + 60},${ridge + 10} ${(xl + xr) / 2 + 110},${ridge - 20}`, { stroke: c.azi, width: 1.6, arrow: 'azi' });
  loss += lines(k, 40, 300, ['Φ_V  infiltration,', 'ventilation'], { weight: 700, size: 11.5, fill: c.azi }) + lines(k, 500, 76, ['air out: ρ·c·n·V/3600 · (θi − θe)'], { size: 11, fill: c.azi });
  // Gains: sun through the window, people and equipment, heating.
  let gain = k.circle({ x: 700, y: 150 }, 13, { fill: c.sun, stroke: c.alt });
  for (const dy of [0, 22]) gain += arrow(k, { x: 684, y: 166 + dy }, { x: xr - 30, y: 266 + dy }, c.alt, 'alt', 1.6);
  gain += lines(k, 600, 116, ['Φ_s  solar: A·SHGC·G'], { weight: 700, size: 11.5, fill: c.alt });
  // A person and a laptop on a table.
  gain += k.circle({ x: 330, y: 268 }, 9, { stroke: c.ink, width: PEN.outline }) + k.polyline([{ x: 330, y: 277 }, { x: 330, y: 318 }], { stroke: c.ink, width: PEN.outline }) + k.polyline([{ x: 316, y: 296 }, { x: 330, y: 288 }, { x: 344, y: 296 }], { stroke: c.ink, width: PEN.outline }) + k.polyline([{ x: 318, y: gy }, { x: 330, y: 318 }, { x: 342, y: gy }], { stroke: c.ink, width: PEN.outline });
  gain += k.rect(370, 314, 70, 6, { fill: c.paper, stroke: c.ink, width: PEN.edge }) + k.line({ x: 378, y: 320 }, { x: 378, y: gy }, { width: PEN.edge }) + k.line({ x: 432, y: 320 }, { x: 432, y: gy }, { width: PEN.edge }) + k.rect(392, 300, 26, 14, { fill: c.paper, stroke: c.ink, width: PEN.edge });
  for (const [a, b] of [[{ x: 330, y: 254 }, { x: 330, y: 230 }], [{ x: 405, y: 296 }, { x: 405, y: 270 }]]) gain += wavy(k, a, b, { stroke: c.third, arrow: 'third', amp: 2 });
  gain += lines(k, 300, 214, ['Φ_i  internal: people, lights, equipment'], { weight: 700, size: 11.5, fill: c.third });
  gain += k.rect(xl + 12, 300, 14, 50, { fill: c.face, stroke: c.ink, width: PEN.edge }) + wavy(k, { x: xl + 30, y: 312 }, { x: xl + 62, y: 300 }, { stroke: c.red, arrow: 'red', amp: 2 }) + lines(k, xl + 30, 290, ['Φ_h heating'], { weight: 700, size: 11.5, fill: c.red });
  const eq = k.text(390, gy + 40, 'Steady balance (heating season):  Φ_h + Φ_i + Φ_s = Φ_T + Φ_V = (H_T + H_V) · (θi − θe)', { size: 13, anchor: 'middle', fill: c.ink, weight: 700 });
  return svgDocument(k, { width: 780, height: gy + 60, title: 'Heat flows that set the indoor temperature of a building', body: k.group('house', house) + k.group('losses', loss) + k.group('gains', gain) + k.group('equation', eq) });
}

/* 07 · Degree hours and degree days (lecture frame 611) */
export function figDegreeDays(standalone = false) {
  const k = kit(standalone, 'dd'), c = k.c, x0 = 70, x1 = 720, y0 = 60, y1 = 300, days = 3, base = 18;
  const T = h => 9.5 + 5.5 * Math.sin((h % 24 - 9) / 24 * 2 * Math.PI) + 4 * Math.sin(h / 72 * 2 * Math.PI + 1.2) + 1.2 * Math.sin(h * .7);
  const X = h => x0 + h / (24 * days) * (x1 - x0), Y = t => y1 - (t - 0) / 25 * (y1 - y0);
  let grid = '';
  for (let t = 0; t <= 25; t += 5) grid += k.line({ x: x0, y: Y(t) }, { x: x1, y: Y(t) }, { stroke: c.fineGrid }) + k.text(x0 - 8, Y(t) + 4, String(t), { size: 10.5, anchor: 'end' });
  for (let d = 0; d <= days; d++) grid += k.line({ x: X(d * 24), y: y0 }, { x: X(d * 24), y: y1 }, { stroke: c.axis }) + (d < days ? k.text(X(d * 24 + 12), y1 + 20, `Day ${d + 1}`, { size: 11, anchor: 'middle', fill: c.ink }) : '');
  grid += k.text(x0 - 8, y0 - 16, '°C', { size: 10.5, anchor: 'end', fill: c.ink });
  const hrs = Array.from({ length: 24 * days + 1 }, (_, h) => h);
  let area = k.polygon([{ x: X(0), y: Y(base) }, ...hrs.map(h => ({ x: X(h), y: Y(Math.min(base, T(h))) })), { x: X(24 * days), y: Y(base) }], { fill: c.heatSoft });
  area += k.polyline(hrs.map(h => ({ x: X(h), y: Y(T(h)) })), { stroke: c.alt, width: 2.2 });
  area += k.line({ x: x0, y: Y(base) }, { x: x1, y: Y(base) }, { stroke: c.ink, width: 1.5 }) + k.label(x1 - 4, Y(base) - 8, `base temperature ${base} °C`, { size: 12, anchor: 'end', fill: c.ink, weight: 700 });
  let means = '';
  for (let d = 0; d < days; d++) {
    const m = hrs.slice(d * 24, d * 24 + 24).reduce((s, h) => s + T(h), 0) / 24;
    means += k.line({ x: X(d * 24), y: Y(m) }, { x: X(d * 24 + 24), y: Y(m) }, { stroke: c.azi, width: 1.6, dash: '6 3' }) + k.label(X(d * 24 + 12), Y(m) + 16, `mean ${n(m, 1)} °C → ${n(base - m, 1)} K·d`, { size: 11, anchor: 'middle', fill: c.azi, weight: 600 });
  }
  const note = lines(k, x0, y1 + 46, ['Shaded: degree hours, Σ (θ_base − θ_e) over the hours below the base. Divided by 24 they approach the degree days,', 'Σ (θ_base − θ_e,mean) over the days, which use the daily mean temperature.'], { size: 11 });
  return svgDocument(k, { width: 760, height: y1 + 84, title: 'Degree hours and degree days below a base temperature', body: k.group('grid', grid) + k.group('degree-hours', area) + k.group('daily-means', means) + k.group('note', note) });
}

/* 08 · Solar heat gain through double glazing (lecture frames 663, 670; Bauphysik Bild 5.19) */
export function figGlazing(standalone = false) {
  const k = kit(standalone, 'gl'), c = k.c, top = 60, bot = 330, xa = 330, xb = 410, t = 10;
  let panes = materialFill(k, xa, top, t, bot - top, 'glass') + materialFill(k, xb, top, t, bot - top, 'glass');
  panes += k.line({ x: xa + t + .5, y: top }, { x: xa + t + .5, y: bot }, { stroke: c.third, width: 3 }) + k.label(xa + t + 4, top - 8, 'low-e on #3', { size: 10.5, fill: c.third, weight: 700, anchor: 'middle' });
  [['#4', xa - 2], ['#3', xa + t + 10], ['#2', xb - 10], ['#1', xb + t + 4]].forEach(([s, x]) => { panes += k.text(x, bot + 18, s, { size: 11, anchor: s === '#4' ? 'end' : 'start', fill: c.ink, weight: 700 }); });
  panes += k.text(xa - 60, bot + 40, 'INSIDE', { size: 10.5, weight: 700, spacing: 1.2, fill: c.ink, anchor: 'middle' }) + k.text(xb + 80, bot + 40, 'OUTSIDE', { size: 10.5, weight: 700, spacing: 1.2, fill: c.ink, anchor: 'middle' }) + k.text((xa + xb + t) / 2, bot + 40, 'gas fill', { size: 10.5, anchor: 'middle' });
  // Solar: incident, reflected, transmitted, absorbed and re-emitted.
  const hit = { x: xb + t, y: 150 };
  let sol = k.circle({ x: 700, y: 70 }, 13, { fill: c.sun, stroke: c.alt }) + arrow(k, { x: 684, y: 80 }, hit, c.alt, 'alt', 2.4) + k.label(600, 96, 'G  incident (100 %)', { size: 12, fill: c.alt, weight: 700 });
  sol += arrow(k, hit, { x: 620, y: 220 }, c.muted, 'muted', 1.4) + k.label(630, 232, 'ρ·G  reflected', { size: 11, fill: c.muted });
  sol += arrow(k, hit, { x: 90, y: 300 }, c.alt, 'alt', 2) + k.label(100, 318, 'τ·G  transmitted (short-wave)', { size: 11, fill: c.alt, weight: 600 });
  sol += wavy(k, { x: xa - 4, y: 200 }, { x: xa - 90, y: 200 }, { stroke: c.third, arrow: 'third', amp: 2 }) + wavy(k, { x: xb + t + 4, y: 270 }, { x: xb + t + 90, y: 270 }, { stroke: c.third, arrow: 'third', amp: 2 });
  sol += lines(k, 70, 168, ['q_i  absorbed, then released', 'inward by convection and', 'long-wave radiation'], { size: 11, fill: c.third, step: 14 }) + lines(k, xb + t + 96, 266, ['q_e  released outward'], { size: 11, fill: c.third });
  const eq = lines(k, 40, bot + 68, ['SHGC (US, NFRC) ≈ g-value (EN 410, Gesamtenergiedurchlassgrad) = (τ·G + q_i) / G.', 'Low-e on #2: low SHGC for cooling-dominated buildings. Low-e on #3: high SHGC for passive solar heating.', 'U_g covers conduction, convection and long-wave radiation across the gap: the coating cuts the radiation, argon the conduction.'], { size: 11, step: 16 });
  const loss = arrow(k, { x: xa - 120, y: 110 }, { x: xb + t + 120, y: 110 }, c.heat, 'alt', 1.8) + k.label(xa - 118, 98, 'U_g · (θi − θe)  heat loss', { size: 11, fill: c.heat, weight: 600 });
  return svgDocument(k, { width: 800, height: bot + 126, title: 'Solar heat gain coefficient (g-value) and heat loss of double glazing', body: k.group('panes', panes) + k.group('loss', loss) + k.group('solar', sol) + k.group('definitions', eq) });
}

/* 09 · Infiltration: wind, stack effect and the blower-door test (lecture frames 652–653) */
export function figInfiltration(standalone = false) {
  const k = kit(standalone, 'inf'), c = k.c, gy = 360, xl = 250, xr = 530, top = 90, neutral = 225;
  let b = k.line({ x: 40, y: gy }, { x: 760, y: gy }, { stroke: c.ink, width: PEN.profile });
  for (let x = 46; x < 760; x += 14) b += k.line({ x, y: gy }, { x: x - 8, y: gy + 8 }, { stroke: c.ink, width: PEN.hatch });
  b += k.rect(xl, top, xr - xl, gy - top, { fill: c.paper, stroke: c.ink, width: PEN.outline });
  for (const y of [180, 270]) b += k.line({ x: xl, y }, { x: xr, y }, { stroke: c.ink, width: PEN.edge });
  b += k.line({ x: xl - 20, y: neutral }, { x: xr + 20, y: neutral }, { stroke: c.muted, dash: '6 4' }) + k.label(xr + 24, neutral + 4, 'neutral pressure plane', { size: 10.5, fill: c.muted });
  // Stack effect in winter: warm, light air leaves at the top, cold air enters at the bottom.
  let stack = '';
  for (const y of [110, 150]) stack += arrow(k, { x: xr - 20, y }, { x: xr + 40, y: y - 10 }, c.heat, 'alt', 1.6);
  for (const y of [300, 340]) stack += arrow(k, { x: xl - 50, y: y + 6 }, { x: xl + 20, y }, c.azi, 'azi', 1.6);
  stack += k.path(`M${(xl + xr) / 2 - 40},330 Q${(xl + xr) / 2},220 ${(xl + xr) / 2 - 20},115`, { stroke: c.alt, width: 1.4, dash: '5 4', arrow: 'alt' });
  stack += lines(k, xr + 46, 80, ['STACK EFFECT (winter)', 'warm air leaves at the top'], { size: 11, step: 14 }) + lines(k, 40, 288, ['cold air enters', 'at the bottom'], { size: 11, step: 14 });
  // Wind from the left.
  let wind = '';
  for (const y of [130, 190, 250]) wind += arrow(k, { x: 60, y }, { x: xl - 30, y }, c.azi, 'azi', 1.6);
  wind += lines(k, 60, 112, ['WIND: + pressure windward'], { size: 11, weight: 700, fill: c.azi }) + k.text(xr + 46, 300, '− suction leeward', { size: 11, weight: 700, fill: c.azi });
  // Blower door in the ground-floor door.
  let door = k.rect(xr - 4, 290, 8, 70, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.circle({ x: xr, y: 322 }, 16, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + arrow(k, { x: xr + 6, y: 322 }, { x: xr + 60, y: 322 }, c.ink, 'ink', 1.6);
  door += lines(k, xr + 66, 336, ['BLOWER DOOR: a fan holds 50 Pa;', 'the air flow gives n50 (ACH at 50 Pa)'], { size: 11, step: 14 });
  const foot = k.text(400, gy + 40, 'Leaky building: 1–2 ACH · tight: 0.2–0.3 ACH (natural conditions). Each air change costs ρ·c·V·(θi − θe).', { size: 12, anchor: 'middle', fill: c.ink, weight: 600 });
  return svgDocument(k, { width: 800, height: gy + 60, title: 'Drivers of infiltration: wind and stack effect, and the blower-door test', body: k.group('building', b) + k.group('stack', stack) + k.group('wind', wind) + k.group('blower-door', door) + k.group('note', foot) });
}

/** [name, caption, draw, page] — numbered per page in this order. */
export const HEAT_FIGURES = [
  ['heat-modes', 'Conduction, convection and radiation in a wall section', figHeatModes, 'heat-transfer.html'],
  ['resistor-network', 'Temperature profile and the equivalent resistor network (lecture example)', figResistorNetwork, 'heat-transfer.html'],
  ['air-cavity', 'Air layers: conduction, convection cell and radiation', figAirCavity, 'heat-transfer.html'],
  ['iso6946-bounds', 'Upper and lower limits for inhomogeneous layers (ISO 6946)', figBounds, 'heat-transfer.html'],
  ['steady-transient', 'Steady state, a step change and a daily cycle in a concrete wall', figSteadyTransient, 'heat-transfer.html'],
  ['energy-flows', 'Heat flows of a building', figEnergyFlows, 'heat-balance.html'],
  ['infiltration', 'Infiltration: wind, stack effect and the blower-door test', figInfiltration, 'heat-balance.html'],
  ['glazing-shgc', 'Solar heat gain coefficient (g-value) of double glazing', figGlazing, 'heat-balance.html'],
  ['degree-days', 'Degree hours and degree days', figDegreeDays, 'heat-balance.html'],
];
