// Static fine-liner figures of the chapter on humid air (psychrometrics). Written as editable SVG files by
// scripts/generate-psychro.mjs and inlined into psychrometrics.html by the content build. Every curve and
// number comes from src/psychro.js, so the figures agree with the text, the labs and the self-test.
import { svgDocument } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { stateFrom, state, saturationHumidity, humidityFromWetBulb, humidityFromEnthalpy, process, mix } from './psychro.js';
import { CHART, chart, readings, caption } from './psychro-diagrams.js';

const n = (x, d = 1) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const lines = (k, x, y, arr, o = {}) => arr.map((t, i) => k.text(x, y + i * (o.step ?? 15), t, { size: 11, fill: k.c.ink, ...o })).join('');
const arrow = (k, a, b, stroke, name = 'alt', width = PEN.outline) => k.line(a, b, { stroke, width, arrow: name });
/** A small chart frame for multi-panel figures. */
const mini = (x, y, w, h, o = {}) => ({ x0: x, x1: x + w, y0: y, y1: y + h, tmin: o.tmin ?? -10, tmax: o.tmax ?? 45, ahmax: o.ahmax ?? 25 });

/* 01 · The complete chart (Szokolay Fig. 1.9; lecture frame 528), printable */
export function figChart(standalone = false) {
  const k = kit(standalone, 'pch'), { svg } = chart(k, CHART, { wet: true, h: true, v: true, scales: true });
  const title = k.title(CHART.x0 + 4, CHART.y0 - 18, 'Psychrometric chart · SI units · sea level, 101.325 kPa')
    + lines(k, CHART.x0 + 4, CHART.y0 + 6, ['Solid diagonals: enthalpy h, kJ/kg (labels at the saturation curve)', 'Dashed diagonals: wet-bulb temperature WBT, °C', 'Dotted steep lines: specific volume v, m³/kg', 'Curves: relative humidity RH, %'], { size: 10.5, fill: k.c.muted, step: 14 });
  return svgDocument(k, { width: 760, height: CHART.y1 + 50, title: 'Psychrometric chart, SI units, sea level', body: k.group('title', title) + svg });
}

/* 02 · Anatomy: one family of lines per panel (lecture frames 525–527; Szokolay Figs. 1.4–1.10) */
export function figAnatomy(standalone = false) {
  const k = kit(standalone, 'pan'), c = k.c, w = 220, h = 150, panels = [
    ['Dry-bulb temperature DBT', 'vertical lines, °C', { dbt: true }],
    ['Absolute humidity AH', 'horizontal lines, g/kg', { ah: true }],
    ['Relative humidity RH', 'curves, % of saturation', { rh: true }],
    ['Wet-bulb temperature WBT', 'dashed diagonals, °C', { wet: true }],
    ['Enthalpy h', 'diagonals, kJ/kg', { h: true }],
    ['Specific volume v', 'steep lines, m³/kg', { v: true }],
  ];
  let body = '';
  panels.forEach(([name, note, show], i) => {
    const x = 30 + (i % 3) * (w + 30), y = 40 + Math.floor(i / 3) * (h + 70);
    const { svg } = chart(k, mini(x, y, w, h), { dbt: false, ah: false, rh: false, ...show, labels: false, fine: false, rhLabels: false, id: `p${i + 1}` });
    body += k.group(`panel-${i + 1}`, svg + k.text(x, y + h + 20, name, { size: 12, weight: 700, fill: c.ink }) + k.text(x, y + h + 35, note, { size: 10.5 }));
  });
  body += k.text(30, 24, 'The saturation curve (100 % RH) bounds every panel: air cannot hold more water vapor at that temperature.', { size: 11, fill: c.ink });
  return svgDocument(k, { width: 780, height: 2 * (h + 70) + 30, title: 'Anatomy of the psychrometric chart: the six families of lines', body });
}

/* 03 · The psychrometer (lecture frame 526; Szokolay Fig. 1.6; Lechner Fig. 4.6b) */
export function figPsychrometer(standalone = false) {
  const k = kit(standalone, 'psy'), c = k.c, s = stateFrom({ t: 20, wet: 12 });
  const thermometer = (x, label, value, wet) => {
    let g = k.rect(x - 9, 60, 18, 230, { rx: 9, fill: c.paper, stroke: c.ink, width: PEN.outline });
    const Y = t => 270 - (t + 10) / 50 * 190;
    for (let t = -10; t <= 40; t += 5) g += k.line({ x: x + 9, y: Y(t) }, { x: x + (t % 10 ? 15 : 20), y: Y(t) }, { stroke: c.ink, width: PEN.hatch }) + (t % 10 ? '' : k.text(x + 24, Y(t) + 4, String(t), { size: 10.5 }));
    g += k.rect(x - 2.5, Y(value), 5, 286 - Y(value), { fill: c.alt }) + k.circle({ x, y: 296 }, 13, { fill: c.alt, stroke: c.ink, width: PEN.outline });
    if (wet) {
      g += k.rect(x - 15, 280, 30, 34, { rx: 6, fill: c.waterFill, fillOpacity: .5, stroke: c.ink, width: PEN.edge });
      g += k.path(`M${x},314 C${x - 4},330 ${x + 4},344 ${x},356`, { stroke: c.ink, width: PEN.edge, dash: '2 2' });
      g += lines(k, x - 60, 330, ['wet wick'], { size: 10.5 });
    }
    g += k.text(x, 46, label, { size: 12, weight: 700, anchor: 'middle', fill: c.ink }) + k.label(x - 16, Y(value) + 4, `${n(value)} °C`, { size: 11, weight: 700, anchor: 'end', fill: c.alt });
    return g;
  };
  let body = thermometer(140, 'DRY BULB', s.t, false) + thermometer(280, 'WET BULB', s.wet, true);
  body += k.rect(230, 356, 110, 32, { rx: 8, fill: c.waterFill, fillOpacity: .4, stroke: c.ink, width: PEN.outline }) + k.text(285, 377, 'water', { size: 10.5, anchor: 'middle' });
  for (const x of [190, 210]) body += arrow(k, { x, y: 330 }, { x, y: 230 }, c.azi, 'azi', PEN.outline);
  body += k.text(200, 350, 'air flow', { size: 10.5, anchor: 'middle', fill: c.azi, weight: 700 });
  body += lines(k, 400, 90, [
    'Evaporation from the wick cools the wet bulb.',
    'Dry air: strong evaporation, large depression.',
    'Saturated air: no evaporation, WBT = DBT.',
    '',
    `DBT ${n(s.t)} °C, WBT ${n(s.wet)} °C`,
    `wet-bulb depression ${n(s.t - s.wet)} K`,
    `→ RH ${n(s.rh, 0)} %, AH ${n(s.ah)} g/kg (lecture: 38 %)`,
    '',
    'Whirl the sling psychrometer (or run the fan of an',
    'aspirated one) for ≥ 2–3 m/s past the wick, then read',
    'the wet bulb first. Plot both on the chart: the',
    'intersection is the status point.',
  ], { size: 11.5, step: 17 });
  return svgDocument(k, { width: 780, height: 410, title: 'Sling psychrometer: dry-bulb and wet-bulb thermometers', body });
}

/* 04 · Reading the chart from two known properties (lecture frames 529–531) */
export function figReading(standalone = false) {
  const k = kit(standalone, 'prd'), c = k.c, w = 330, h = 250;
  const cases = [
    ['a · DBT 20 °C and WBT 12 °C (sling psychrometer)', stateFrom({ t: 20, wet: 12 }), ['dbt', 'wet', 'rh', 'ah']],
    ['b · WBT 15 °C and AH 8 g/kg: find DBT and DPT', stateFrom({ wet: 15, ah: 8 }), ['dbt', 'wet', 'ah', 'dew']],
  ];
  let body = '';
  cases.forEach(([title, s, which], i) => {
    const x = 30 + i * (w + 80), { svg, F } = chart(k, mini(x, 50, w, h, { tmin: -5, tmax: 35, ahmax: 20 }), { wet: true, fine: true, rhLabels: false, labels: true, short: true, id: `c${i + 1}` });
    body += k.group(`case-${i + 1}`, caption(k, x, 24, title) + svg + readings(k, F, s, which));
  });
  return svgDocument(k, { width: 860, height: 380, title: 'Reading the chart from two known properties: the two lecture examples', body });
}

/* 05 · Processes on the chart (lecture frames 533–543; Szokolay Figs. 1.11–1.14; Lechner Figs. 4.5–4.7) */
export function figProcesses(standalone = false) {
  const k = kit(standalone, 'ppc'), c = k.c, w = 340, h = 260, P0 = { t: 22, ah: 9 };
  // Left: the directions of change from one status point P.
  const left = chart(k, mini(30, 50, w, h, { tmin: 0, tmax: 40, ahmax: 20 }), { fine: false, rhLabels: false, labels: false, id: 'a' });
  const F = left.F, P = F.P(P0.t, P0.ah), s0 = state(P0.t, P0.ah);
  const go = (t, ah) => F.P(t, ah), dirs = [
    [go(32, 9), 'heating', 'start'], [go(12, 9), 'cooling', 'end'], [go(22, 14), 'humidification', 'middle'], [go(22, 4.5), 'dehumidification', 'middle'],
    [go(15, humidityFromWetBulb(15, s0.wet)), 'evaporative cooling', 'end'], [go(31, humidityFromEnthalpy(s0.h, 31)), 'sorbent', 'start'],
  ];
  let g = '';
  for (const [to, label, anchor] of dirs) {
    g += arrow(k, P, to, c.alt, 'alt', PEN.outline);
    const dx = to.x - P.x, dy = to.y - P.y, L = Math.hypot(dx, dy);
    g += k.label(to.x + dx / L * 8, to.y + dy / L * 8 + (Math.abs(dy) > Math.abs(dx) ? (dy < 0 ? -4 : 12) : 4), label, { size: 10.5, anchor, fill: c.ink, weight: 600 });
  }
  g += k.circle(P, 4.5, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.label(P.x - 8, P.y + 16, 'P', { size: 13, weight: 700, italic: true, fill: c.ink });
  const leftBody = caption(k, 30, 24, 'a · Directions of change from P') + left.svg + g;
  // Right: cooling below the dew point.
  const right = chart(k, mini(440, 50, w, h, { tmin: 0, tmax: 40, ahmax: 20 }), { fine: false, rhLabels: false, labels: false, id: 'b' });
  const G = right.F, r = process(stateFrom({ t: 29, rh: 60 }), 'sensible', 15);
  let q = k.polyline(r.path.map(p => G.P(p.t, p.ah)), { stroke: c.alt, width: PEN.profile }) + k.line(G.P(r.b.t + .6, saturationHumidity(r.b.t + .6)), G.P(r.b.t, r.b.ah), { stroke: c.alt, width: PEN.profile, arrow: 'alt' });
  const A = G.P(r.a.t, r.a.ah), D = G.P(r.a.dew, r.a.ah), B = G.P(r.b.t, r.b.ah);
  q += k.circle(A, 4.5, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.label(A.x + 8, A.y - 8, `29 °C, 60 % · ${n(r.a.ah)} g/kg`, { size: 10.5, fill: c.ink, weight: 600 });
  q += k.circle(D, 3.5, { fill: c.alt }) + k.label(D.x - 8, D.y - 8, `dew point ${n(r.a.dew)} °C`, { size: 10.5, anchor: 'end', fill: c.alt, weight: 700 });
  q += k.line(D, G.P(r.a.dew, 0), { stroke: c.alt, width: PEN.edge, dash: '2 3' });
  q += k.circle(B, 3.5, { fill: c.alt }) + k.label(B.x - 8, B.y + 14, `15 °C · ${n(r.b.ah)} g/kg`, { size: 10.5, anchor: 'end', fill: c.ink });
  const xb = G.x1 + 14;
  q += k.line({ x: xb, y: G.Y(r.a.ah) }, { x: xb, y: G.Y(r.b.ah) }, { stroke: c.azi, width: PEN.outline, arrow: 'azi' }) + k.line({ x: xb - 5, y: G.Y(r.a.ah) }, { x: xb + 5, y: G.Y(r.a.ah) }, { stroke: c.azi, width: PEN.outline });
  q += lines(k, xb + 8, (G.Y(r.a.ah) + G.Y(r.b.ah)) / 2, ['condensed', `${n(r.water)} g/kg`], { size: 10.5, fill: c.azi, weight: 700 });
  const rightBody = caption(k, 440, 24, 'b · Cooling below the dew point (Szokolay)') + right.svg + q;
  const foot = k.text(30, h + 84, 'Horizontal: sensible heat only. Vertical: moisture (latent heat). Evaporative cooling follows a wet-bulb line; a sorbent moves the point along an enthalpy line.', { size: 11, fill: c.ink });
  return svgDocument(k, { width: 880, height: h + 100, title: 'Psychrometric processes: heating, cooling, humidification, dehumidification, evaporative cooling, sorbent dehumidification and condensation', body: k.group('directions', leftBody) + k.group('condensation', rightBody) + k.group('note', foot) });
}

/* 06 · Sensible and latent heat; mixing of two air streams (Szokolay §1.1.3; Lechner Fig. 4.7a; ASHRAE Fundamentals Ch. 1) */
export function figEnthalpyMixing(standalone = false) {
  const k = kit(standalone, 'pem'), c = k.c, w = 340, h = 260;
  const left = chart(k, mini(30, 50, w, h, { tmin: -10, tmax: 40, ahmax: 20 }), { fine: false, rhLabels: false, labels: false, h: true, id: 'a' });
  const F = left.F, s = stateFrom({ t: 26, rh: 60 }), O = F.P(0, 0), P = F.P(s.t, s.ah), Q = F.P(s.t, 0);
  let g = k.line(O, Q, { stroke: c.heat, width: PEN.profile }) + k.line(Q, P, { stroke: c.azi, width: PEN.profile }) + k.line(O, P, { stroke: c.ink, width: PEN.edge, dash: '4 3' });
  g += k.circle(O, 3, { fill: c.ink }) + k.label(O.x - 4, O.y - 8, '0 °C, 0 g/kg: h = 0', { size: 10.5, anchor: 'end', fill: c.ink });
  g += k.label((O.x + Q.x) / 2, Q.y - 8, `sensible 1.006 × ${n(s.t, 0)} = ${n(s.sensible)} kJ/kg`, { size: 10.5, anchor: 'middle', fill: c.heat, weight: 700 });
  g += k.label(Q.x + 8, (Q.y + P.y) / 2 + 10, 'latent', { size: 10.5, fill: c.azi, weight: 700 }) + k.label(Q.x + 8, (Q.y + P.y) / 2 + 24, `${n(s.latent)} kJ/kg`, { size: 10.5, fill: c.azi, weight: 700 });
  g += k.circle(P, 4.5, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.label(P.x - 8, P.y - 10, `26 °C, 60 %: h = ${n(s.h)} kJ/kg`, { size: 10.5, anchor: 'end', fill: c.ink, weight: 700 });
  const leftBody = caption(k, 30, 24, 'a · Enthalpy = sensible + latent heat') + left.svg + g;
  const right = chart(k, mini(440, 50, w, h, { tmin: -10, tmax: 40, ahmax: 20 }), { fine: false, rhLabels: false, labels: false, id: 'b' });
  const G = right.F, room = stateFrom({ t: 22, rh: 50 }), out = stateFrom({ t: -2, rh: 80 }), m = mix(room, out, 2, 1);
  const A = G.P(room.t, room.ah), B = G.P(out.t, out.ah), M = G.P(m.t, m.ah);
  let q = k.line(A, B, { stroke: c.alt, width: PEN.outline });
  for (const [p, s2, name, anchor, dy] of [[A, room, 'room 22 °C, 50 %', 'start', -10], [B, out, 'outdoor −2 °C, 80 %', 'start', 18], [M, m, `mixture 2 : 1 · ${n(m.t)} °C, ${n(m.ah)} g/kg`, 'end', -10]]) {
    q += k.circle(p, 4, { fill: p === M ? c.alt : c.paper, stroke: c.ink, width: PEN.outline }) + k.label(p.x + (anchor === 'end' ? -8 : 8), p.y + dy, name, { size: 10.5, anchor, fill: c.ink, weight: 600 });
  }
  q += lines(k, 452, 76, ['The mixture lies on the straight line between', 'the two states, closer to the larger mass flow', '(lever rule).'], { size: 10.5, step: 14 });
  const rightBody = caption(k, 440, 24, 'b · Mixing two air streams') + right.svg + q;
  return svgDocument(k, { width: 820, height: h + 80, title: 'Sensible and latent heat in the enthalpy of humid air, and adiabatic mixing of two air streams', body: k.group('enthalpy', leftBody) + k.group('mixing', rightBody) });
}

/** [name, caption, draw, page] — numbered in the order they appear on the page. */
export const PSY_FIGURES = [
  ['psychrometer', 'Sling psychrometer: dry and wet bulb', figPsychrometer, 'psychrometrics.html'],
  ['chart-anatomy', 'Anatomy of the psychrometric chart', figAnatomy, 'psychrometrics.html'],
  ['psychrometric-chart', 'Psychrometric chart, SI units, sea level', figChart, 'psychrometrics.html'],
  ['chart-reading', 'Reading the chart from two known properties', figReading, 'psychrometrics.html'],
  ['enthalpy-mixing', 'Sensible and latent heat; mixing of two air streams', figEnthalpyMixing, 'psychrometrics.html'],
  ['chart-processes', 'Psychrometric processes', figProcesses, 'psychrometrics.html'],
];
