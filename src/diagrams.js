// Interactive and static drawings for Chapter 02. Each function returns a complete SVG.
// Pass { standalone: true } for the editable download version (hex colors, named groups).
import { RAD, wrap, solarPosition, declination, equationOfTime, eotComponents, noonAltitude, calendarDate, dayOfYear, clockToSolar, shadowAngles, shadeWindow, deviceVSA, deviceHSA, overhangMaskAltitude, stereographic, faceMask, isMasked, sundialTip, shadowVector, shadowPolygon, massingStudy, formatHour } from './solar.js';
import { svgDocument, view, f } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { penScene, box } from './sketch.js';

const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD), tand = d => Math.tan(d * RAD);
const deg = (x, n = 1) => `${x.toFixed(n)}°`;
const latLabel = l => `${Math.abs(l).toFixed(1)}°${l === 0 ? '' : l > 0 ? ' N' : ' S'}`;
export const DATE_LINES = [[172, 'Jun 21'], [141, 'May 21 / Jul 21'], [111, 'Apr 21 / Aug 21'], [80, 'Mar 21 / Sep 21'], [52, 'Feb 21 / Oct 21'], [21, 'Jan 21 / Nov 21'], [355, 'Dec 21']];
// Sun paths in ink: solstices and equinoxes with a heavier pen than the intermediate months.
const dateWidth = day => [172, 80, 355].includes(day) ? PEN.outline : PEN.hatch;
const sunVec = s => ({ x: s.east, y: s.north, z: s.up });

function fitView(psi, eps, pts, box) {
  const unit = view(psi, eps, 1, 0, 0), q = pts.map(p => unit(...p));
  const minx = Math.min(...q.map(p => p.x)), maxx = Math.max(...q.map(p => p.x));
  const miny = Math.min(...q.map(p => p.y)), maxy = Math.max(...q.map(p => p.y));
  const s = Math.min(box.w / (maxx - minx || 1), box.h / (maxy - miny || 1));
  return view(psi, eps, s, box.x + (box.w - (maxx - minx) * s) / 2 - minx * s, box.y + (box.h - (maxy - miny) * s) / 2 - miny * s);
}
/** Points along the arc between two 3D directions u and v, centred at Q. */
function arc3(v, Q, u, w, r, n = 24) {
  const norm = a => { const l = Math.hypot(...a) || 1; return a.map(x => x / l); };
  const a = norm(u), b = norm(w), dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot);
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, s = Math.sin(om) || 1, ka = om ? Math.sin((1 - t) * om) / s : 1 - t, kb = om ? Math.sin(t * om) / s : t;
    return v(Q[0] + r * (ka * a[0] + kb * b[0]), Q[1] + r * (ka * a[1] + kb * b[1]), Q[2] + r * (ka * a[2] + kb * b[2]));
  });
}

/* ---------- 02 · Altitude, azimuth, zenith on the sky hemisphere ---------- */
export function drawSky(state, { standalone = false, title } = {}) {
  const k = kit(standalone, 'sky'), c = k.c, v = view(200, 24, 210, 360, 318);
  const sun = solarPosition(state.latitude, state.day, state.hour);
  const ring = (alt, r = 1) => Array.from({ length: 121 }, (_, i) => v(r * cosd(alt) * sind(i * 3), r * cosd(alt) * cosd(i * 3), r * sind(alt)));
  let ground = k.polygon(ring(0, 1.14), { fill: c.ground, stroke: c.grid });
  ground += k.line(v(-1.14, 0), v(1.14, 0), { stroke: c.axis }) + k.line(v(0, -1.14), v(0, 1.14), { stroke: c.axis });
  let dome = k.arc(360, 318, 210, 0, 180, { stroke: c.axis, width: 1.3 });
  for (const alt of [30, 60]) dome += k.polyline(ring(alt), { stroke: c.grid, dash: '4 5' }) + k.label(v(0, -cosd(alt), sind(alt)).x + 6, v(0, -cosd(alt), sind(alt)).y - 4, `${alt}°`, { size: 11 });
  for (const a of [0, 90]) dome += k.polyline(Array.from({ length: 61 }, (_, i) => v(cosd(i * 3) * sind(a), cosd(i * 3) * cosd(a), sind(i * 3))), { stroke: c.grid, dash: '4 5' });
  dome += k.polyline(ring(0), { stroke: c.axis, width: 1.4 });
  const z = v(0, 0, 1); dome += k.circle(z, 3, { fill: c.ink }) + k.label(z.x + 8, z.y - 6, 'Zenith', { size: 12, fill: c.ink });
  let compass = '';
  for (const [a, n] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const p = v(1.26 * sind(a), 1.26 * cosd(a)); compass += k.text(p.x, p.y + 6, n, { size: 18, weight: 600, fill: c.ink, anchor: 'middle' }); }
  const samples = Array.from({ length: 289 }, (_, i) => solarPosition(state.latitude, state.day, i / 12));
  let path = k.path(k.broken(samples.map(p => p.aboveHorizon ? v(p.east, p.north, p.up) : null)), { stroke: c.ink, width: PEN.outline });
  for (let h = 4; h <= 20; h += 2) { const p = solarPosition(state.latitude, state.day, h); if (!p.aboveHorizon) continue; const q = v(p.east, p.north, p.up); path += k.circle(q, 2.2, { fill: c.ink }) + k.label(q.x + 7, q.y - 6, String(h), { size: 11 }); }
  // A small block at the observer: lit faces white, faces turned from the sun and its shadow hatched.
  const sc = penScene(k, v, v.toward, [box(-.07, .07, -.07, .07, 0, .12)], sunVec(sun));
  ground += sc.back;
  const building = sc.front;
  let angles = '';
  if (sun.aboveHorizon) {
    const az = sun.azimuth ?? 180, P = v(sun.east, sun.north, sun.up), G = v(sun.east, sun.north, 0), O = v(0, 0, 0.13);
    angles += k.line(v(0, 0, 0), G, { stroke: c.azi, dash: '5 4', width: 1.4 }) + k.line(P, G, { stroke: c.muted, dash: '2 4' });
    angles += k.line(v(0, 0, 0), P, { stroke: c.alt, width: 2 });
    const altArc = Array.from({ length: 31 }, (_, i) => { const t = sun.altitude * i / 30; return v(.55 * cosd(t) * sind(az), .55 * cosd(t) * cosd(az), .55 * sind(t)); });
    angles += k.polyline(altArc, { stroke: c.alt, width: 2.4 }); const am = altArc[15];
    angles += k.label(am.x + 10, am.y + 4, 'ALT', { size: 14, weight: 700, fill: c.alt });
    const zenArc = Array.from({ length: 31 }, (_, i) => { const t = sun.altitude + (90 - sun.altitude) * i / 30; return v(.32 * cosd(t) * sind(az), .32 * cosd(t) * cosd(az), .32 * sind(t)); });
    angles += k.line(v(0, 0, 0), v(0, 0, .36), { stroke: c.third, width: 1.2 }) + k.polyline(zenArc, { stroke: c.third, width: 2 });
    const zm = zenArc[15]; angles += k.label(zm.x - 8, zm.y - 6, 'ZEN', { size: 13, weight: 700, fill: c.third, anchor: 'end' });
    const azArc = Array.from({ length: 61 }, (_, i) => { const a = az * i / 60; return v(.82 * sind(a), .82 * cosd(a)); });
    angles += k.line(v(0, 0), v(0, .95), { stroke: c.azi, width: 1.2 });
    angles += k.polyline(azArc, { stroke: c.azi, width: 2.4, arrow: 'azi' }); const zz = azArc[30];
    angles += k.label(zz.x, zz.y + 18, 'AZI', { size: 13, weight: 700, fill: c.azi, anchor: 'middle' });
    angles += k.circle(P, 18, { fill: c.sun, fillOpacity: .2 }) + k.circle(P, 11, { fill: c.sun, stroke: c.alt, width: 1.2 }) + k.label(P.x + 20, P.y + 4, 'Sun', { size: 14, fill: c.ink, weight: 600 });
    angles += k.circle(v(0, 0, 0), 2.5, { fill: c.ink });
  } else angles += k.text(360, 70, 'Sun below the horizon (ALT < 0°)', { size: 16, fill: c.ink, anchor: 'middle' });
  let notes = k.text(24, 452, `${latLabel(state.latitude)} · ${calendarDate(state.day)} · ${formatHour(state.hour)} solar time`, { size: 12 });
  notes += k.text(696, 452, 'Observer at centre · not to scale', { size: 11, anchor: 'end' });
  return svgDocument(k, { width: 720, height: 470, title: title ?? 'Sky hemisphere with solar altitude, azimuth and zenith angle', body: k.group('ground', ground) + k.group('sky-grid', dome) + k.group('compass', compass) + k.group('building', building) + k.group('sun-path', path) + k.group('angles', angles) + k.group('notes', notes) });
}

/* ---------- 04 · Earth's orbit ---------- */
export function sunLongitude(day) { return wrap((day - 80) * 360 / 365.24); }
export function drawOrbit(day = null, { standalone = false } = {}) {
  const k = kit(standalone, 'orbit'), c = k.c, cx = 360, cy = 200, a = 265, b = 105, er = 20;
  const pos = d => { const t = (-90 - sunLongitude(d)) * RAD; return { x: cx + a * Math.cos(t), y: cy + b * Math.sin(t) }; };
  let orbit = k.path(`M${cx - a},${cy} A${a},${b} 0 1 0 ${cx + a},${cy} A${a},${b} 0 1 0 ${cx - a},${cy}`, { stroke: c.axis, width: 1.4 });
  orbit += k.line(pos(172), pos(355), { stroke: c.grid, dash: '5 5' }) + k.line(pos(80), pos(266), { stroke: c.grid, dash: '5 5' });
  orbit += k.label(cx - 140, cy - 6, 'Line of solstices', { size: 11 }) + k.label(cx + 6, cy - 52, 'Line of equinoxes', { size: 11 });
  let sunG = k.circle({ x: cx, y: cy }, 30, { fill: c.sun, stroke: c.alt }) + k.text(cx, cy + 50, 'Sun', { size: 12, anchor: 'middle', fill: c.ink });
  const earth = (d, r, strong) => {
    const p = pos(d), ang = Math.atan2(cy - p.y, cx - p.x), tilt = 23.45 * RAD;
    const n = { x: Math.cos(ang + Math.PI / 2), y: Math.sin(ang + Math.PI / 2) };
    let s = k.circle(p, r, { fill: c.earth, stroke: c.buildingEdge, width: strong ? 1.6 : 1 });
    s += k.polygon(Array.from({ length: 25 }, (_, i) => { const t = ang + Math.PI / 2 + Math.PI * i / 24; return { x: p.x + r * Math.cos(t), y: p.y + r * Math.sin(t) }; }), { fill: c.night });
    void n; const ax = { x: Math.sin(tilt), y: -Math.cos(tilt) };
    s += k.line({ x: p.x - ax.x * r * 1.5, y: p.y - ax.y * r * 1.5 }, { x: p.x + ax.x * r * 1.5, y: p.y + ax.y * r * 1.5 }, { stroke: c.ink, width: 1.3 });
    s += k.text(p.x + ax.x * r * 1.5 + 3, p.y + ax.y * r * 1.5 - 2, 'N', { size: 10, fill: c.ink });
    return s;
  };
  let refs = '';
  const labels = { 80: ['Mar 20/21 · equinox', 0, -42, 'middle'], 172: ['Jun 21 · solstice', -10, -36, 'middle'], 266: ['Sep 22/23 · equinox', 0, 52, 'middle'], 355: ['Dec 21/22 · solstice', 10, -36, 'middle'] };
  for (const [d, [t, dx, dy, an]] of Object.entries(labels)) { refs += earth(+d, 14, false); const p = pos(+d); refs += k.label(p.x + dx, p.y + dy, t, { size: 12, fill: c.ink, anchor: an }); }
  const peri = pos(3), aph = pos(185);
  refs += k.circle(peri, 3, { fill: c.ink }) + k.label(peri.x + 10, peri.y + 34, 'Perihelion ~Jan 3 · 147.1 million km', { size: 11, anchor: 'end' });
  refs += k.circle(aph, 3, { fill: c.ink }) + k.label(aph.x - 4, aph.y + 38, 'Aphelion ~Jul 4 · 152.1 million km', { size: 11 });
  let current = '';
  if (day !== null) { current = earth(day, er, true); const p = pos(day); current += k.label(p.x, p.y + 40, calendarDate(day), { size: 13, weight: 700, fill: c.alt, anchor: 'middle' }); }
  let notes = k.text(24, 372, 'Axis tilted 23.45° from the orbit normal; its direction is fixed in space. Shaded half = night.', { size: 11 });
  notes += k.text(24, 390, 'Perspective view; eccentricity (0.017) is not visible at this scale.', { size: 11 });
  return svgDocument(k, { width: 720, height: 400, title: "Earth's orbit, axial tilt, solstices and equinoxes", body: k.group('orbit', orbit) + k.group('sun', sunG) + k.group('reference-positions', refs) + k.group('current', current) + k.group('notes', notes) });
}

/* ---------- 06 · Meridian section at solar noon ---------- */
export function drawMeridian(latitude, day, { standalone = false, compact = false } = {}) {
  const k = kit(standalone, `${compact ? 'mc' : 'mer'}${day}`), c = k.c, dec = declination(day), cx = 250, cy = 215, R = 150;
  const pt = (th, r = R) => ({ x: cx + r * cosd(th), y: cy - r * sind(th) });
  let earth = k.path(`M${cx},${cy - R} A${R},${R} 0 0 0 ${cx},${cy + R} Z`, { fill: c.night, stroke: 'none' });
  earth += k.circle({ x: cx, y: cy }, R, { stroke: c.buildingEdge, width: 1.4 });
  let lines = '';
  for (const [phi, name] of [[66.55, 'Arctic Circle'], [23.45, 'Tropic of Cancer'], [0, 'Equator'], [-23.45, 'Tropic of Capricorn'], [-66.55, 'Antarctic Circle']]) {
    const a = pt(phi - dec), b = pt(180 - phi - dec);
    lines += k.line(a, b, { stroke: phi === 0 ? c.ink : c.axis, width: phi === 0 ? 1.2 : .9, dash: phi === 0 ? null : '4 4' });
    if (!compact) lines += k.label(b.x - 6, b.y + 4, name, { size: 10, anchor: 'end' });
  }
  lines += k.line(pt(90 - dec, R * 1.17), pt(270 - dec, R * 1.17), { stroke: c.ink, width: 1.3 });
  lines += k.label(pt(90 - dec, R * 1.24).x, pt(90 - dec, R * 1.24).y, 'N', { size: 13, weight: 700, fill: c.ink, anchor: 'middle' });
  let rays = '';
  for (const dy of [-120, -60, 0, 60, 120]) { const x = cx + Math.sqrt(R * R - dy * dy); rays += k.line({ x: cx + R + 190, y: cy + dy }, { x: x + 2, y: cy + dy }, { stroke: c.sun, width: 1.6, arrow: 'alt' }); }
  if (!compact) rays += k.label(cx + R + 190, cy - 132, 'Sun rays (parallel)', { size: 11, anchor: 'end' });
  let angles = k.circle(pt(0), 4, { fill: c.alt });
  angles += k.arc(cx, cy, 46, Math.min(0, -dec), Math.max(0, -dec), { stroke: c.alt, width: 2 });
  if (Math.abs(dec) > 1) angles += k.label(cx + 52, cy + (dec > 0 ? 18 : -10), 'DEC', { size: 12, weight: 700, fill: c.alt });
  const th = latitude - dec;
  angles += k.line({ x: cx, y: cy }, pt(th), { stroke: c.third, width: 1.2 });
  angles += k.arc(cx, cy, 78, Math.min(-dec, th), Math.max(-dec, th), { stroke: c.third, width: 2 });
  const lm = pt((th - dec) / 2, 86); if (Math.abs(latitude) > 3) angles += k.label(lm.x + 4, lm.y + 4, 'LAT', { size: 12, weight: 700, fill: c.third });
  const P = pt(th), day_ = Math.abs(th) < 90;
  if (day_) {
    const ang = th > 0 ? th - 90 : th + 90, t = { x: cosd(ang), y: -sind(ang) };
    angles += k.line({ x: P.x - 60 * t.x, y: P.y - 60 * t.y }, { x: P.x + 80 * t.x, y: P.y + 80 * t.y }, { stroke: c.ink, width: 1.6 });
    angles += k.line(P, pt(th, R + 55), { stroke: c.muted, dash: '3 4' });
    angles += k.line({ x: P.x + 120, y: P.y }, P, { stroke: c.alt, width: 2, arrow: 'alt' });
    angles += k.arc(P.x, P.y, 36, Math.min(0, ang), Math.max(0, ang), { stroke: c.alt, width: 2.4 });
    angles += k.label(P.x + 42, P.y + (ang < 0 ? 16 : -8), 'ALT', { size: 13, weight: 700, fill: c.alt });
  }
  angles += k.circle(P, 5, { fill: c.ink }) + (compact ? '' : k.label(P.x - 10, P.y - 10, 'Site', { size: 12, fill: c.ink, anchor: 'end' }));
  let text = '';
  if (!compact) {
    const alt = noonAltitude(latitude, dec), x = 470;
    text += k.text(x, 300, `${calendarDate(day)} · LAT = ${latLabel(latitude)}`, { size: 13, fill: c.ink, weight: 600 });
    text += k.text(x, 324, `DEC = ${deg(dec, 2)}`, { size: 13, fill: c.alt });
    text += k.text(x, 348, `ALT(noon) = 90° − |LAT − DEC|`, { size: 13, fill: c.ink });
    text += k.text(x, 372, day_ ? `= 90° − |${latitude.toFixed(1)}° − (${dec.toFixed(2)}°)| = ${deg(alt)}` : 'Site on the night side: polar night', { size: 13, fill: day_ ? c.alt : c.red });
  } else text += k.text(cx, 405, calendarDate(day), { size: 15, weight: 700, fill: c.ink, anchor: 'middle' });
  return svgDocument(k, { width: 720, height: compact ? 420 : 410, title: `Meridian section at solar noon, ${calendarDate(day)}`, body: k.group('earth', earth) + k.group('latitude-lines', lines) + k.group('sun-rays', rays) + k.group('angles', angles) + k.group('text', text) });
}

/* ---------- Year charts: declination and equation of time ---------- */
function yearChart(k, { x0 = 70, x1 = 690, y0 = 30, y1 = 220, ymin, ymax, step, unit, series, day, yLabel }) {
  const c = k.c, X = d => x0 + (d - 1) / 364 * (x1 - x0), Y = v => y1 - (v - ymin) / (ymax - ymin) * (y1 - y0);
  let grid = '';
  for (let v = ymin; v <= ymax + 1e-9; v += step) grid += k.line({ x: x0, y: Y(v) }, { x: x1, y: Y(v) }, { stroke: v === 0 ? c.axis : c.fineGrid, width: v === 0 ? 1.2 : 1 }) + k.text(x0 - 8, Y(v) + 4, `${v}${unit}`, { size: 11, anchor: 'end' });
  ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].forEach((m, i) => { const d = dayOfYear(i + 1, 1); grid += k.line({ x: X(d), y: y0 }, { x: X(d), y: y1 }, { stroke: c.fineGrid }) + k.text(X(d + 15), y1 + 18, m, { size: 11, anchor: 'middle' }); });
  grid += k.text(x0 - 50, y0 - 10, yLabel, { size: 11, fill: c.ink });
  let lines = '';
  for (const s of series) lines += k.polyline(Array.from({ length: 365 }, (_, i) => ({ x: X(i + 1), y: Y(s.fn(i + 1)) })), { stroke: s.color, width: s.width ?? 2, dash: s.dash });
  let marker = '';
  if (day !== null) { const v = series[0].fn(day); marker = k.line({ x: X(day), y: y0 }, { x: X(day), y: y1 }, { stroke: c.ink, dash: '3 3' }) + k.circle({ x: X(day), y: Y(v) }, 5, { fill: c.paper, stroke: c.ink, width: PEN.outline }) + k.label(X(day) + (day > 300 ? -9 : 9), Y(v) - 9, `${calendarDate(day)}: ${v.toFixed(1)}${unit === '°' ? '°' : ' min'}`, { size: 12, weight: 700, fill: c.ink, anchor: day > 300 ? 'end' : 'start' }); }
  return { grid, lines, marker, X, Y };
}
export function drawDeclination(day = null, { standalone = false } = {}) {
  const k = kit(standalone, 'dec'), c = k.c;
  const ch = yearChart(k, { ymin: -30, ymax: 30, step: 10, unit: '°', series: [{ fn: declination, color: c.ink, width: PEN.outline }], day, yLabel: 'DEC' });
  let ref = '';
  for (const [d, t, dy] of [[80, 'Mar equinox', -10], [172, 'Jun solstice +23.45°', -12], [266, 'Sep equinox', -10], [355, 'Dec solstice −23.45°', 24]]) ref += k.circle({ x: ch.X(d), y: ch.Y(declination(d)) }, 3, { fill: c.ink }) + k.label(ch.X(d), ch.Y(declination(d)) + dy, t, { size: 11, anchor: d > 340 ? 'end' : 'middle' });
  return svgDocument(k, { width: 720, height: 250, title: 'Solar declination over the year', body: k.group('grid', ch.grid) + k.group('curve', ch.lines) + k.group('reference-dates', ref) + k.group('marker', ch.marker) });
}
export function drawEot(day = null, { standalone = false } = {}) {
  const k = kit(standalone, 'eot'), c = k.c;
  const ch = yearChart(k, { ymin: -20, ymax: 20, step: 5, unit: '', series: [{ fn: equationOfTime, color: c.ink, width: PEN.profile }, { fn: d => eotComponents(d).eccentricity, color: c.ink, dash: '6 5', width: PEN.edge }, { fn: d => eotComponents(d).obliquity, color: c.ink, dash: '1.5 3.5', width: PEN.edge }], day, yLabel: 'EOT (min)' });
  let key = '';
  [['Equation of time (Eq. 3)', c.ink, null], ['Eccentricity component', c.ink, '6 5'], ['Obliquity (tilt) component', c.ink, '1.5 3.5']].forEach(([t, col, dash], i) => { key += k.line({ x: 90 + i * 200, y: 252 }, { x: 118 + i * 200, y: 252 }, { stroke: col, width: 2, dash }) + k.text(124 + i * 200, 256, t, { size: 11 }); });
  return svgDocument(k, { width: 720, height: 268, title: 'Equation of time and its two components', body: k.group('grid', ch.grid) + k.group('curves', ch.lines) + k.group('key', key) + k.group('marker', ch.marker) });
}

/* ---------- 05 · Analemma: sun position at one clock time over a year ---------- */
export function drawAnalemma(clockHour, day = null, { standalone = false, latitude = 42.4, longitude = 76.5, standardMeridian = 75 } = {}) {
  const k = kit(standalone, 'ana'), c = k.c;
  const pts = Array.from({ length: 365 }, (_, i) => { const d = i + 1, t = clockToSolar(clockHour, d, { longitude, standardMeridian }); return { d, ...solarPosition(latitude, d, t.hour) }; });
  const vis = pts.filter(p => p.aboveHorizon);
  if (!vis.length) return svgDocument(k, { width: 400, height: 440, title: 'Analemma', body: k.text(200, 220, 'Sun below the horizon all year at this clock time', { anchor: 'middle' }) });
  // A north-facing analemma (southern hemisphere, tropics) straddles AZI 0°/360°: unwrap it to −180…180.
  if (vis.some(p => p.azimuth < 90) && vis.some(p => p.azimuth > 270)) pts.forEach(p => { if (p.azimuth > 180) p.azimuth -= 360; });
  const azs = vis.map(p => p.azimuth);
  const a0 = Math.floor(Math.min(...azs) / 5) * 5 - 5, a1 = Math.ceil(Math.max(...azs) / 5) * 5 + 5;
  const top = 40, bottom = 400, s = (bottom - top) / 90, width = (a1 - a0) * s, left = Math.max(70, 220 - width / 2);
  const X = a => left + (a - a0) * s, Y = h => bottom - h * s, W = Math.max(400, left + width + 60);
  let grid = '';
  for (let h = 0; h <= 90; h += 10) grid += k.line({ x: left, y: Y(h) }, { x: left + width, y: Y(h) }, { stroke: h ? c.fineGrid : c.axis }) + k.text(left - 8, Y(h) + 4, `${h}°`, { size: 11, anchor: 'end' });
  for (let a = a0; a <= a1; a += 5) grid += k.line({ x: X(a), y: top }, { x: X(a), y: bottom }, { stroke: c.fineGrid }) + (a % 10 === 0 ? k.text(X(a), bottom + 16, `${(a + 360) % 360}°`, { size: 10, anchor: 'middle' }) : '');
  grid += k.text(left - 40, top - 14, 'ALT', { size: 11, fill: c.ink }) + k.text(left + width / 2, bottom + 34, 'AZI (from N)', { size: 11, anchor: 'middle', fill: c.ink });
  let curve = k.path(k.broken(pts.map(p => p.aboveHorizon ? { x: X(p.azimuth), y: Y(p.altitude) } : null)) + ' Z', { stroke: c.ink, width: PEN.outline });
  for (let m = 1; m <= 12; m++) { const p = pts[dayOfYear(m, 21) - 1]; if (!p.aboveHorizon) continue; curve += k.circle({ x: X(p.azimuth), y: Y(p.altitude) }, 3, { fill: c.ink }) + k.label(X(p.azimuth) + (p.d > 172 && p.d < 355 ? -7 : 7), Y(p.altitude) + 4, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1], { size: 10, anchor: p.d > 172 && p.d < 355 ? 'end' : 'start' }); }
  let marker = '';
  if (day !== null && pts[day - 1].aboveHorizon) { const p = pts[day - 1]; marker = k.circle({ x: X(p.azimuth), y: Y(p.altitude) }, 8, { fill: c.sun, stroke: c.alt, width: 1.5 }); }
  return svgDocument(k, { width: W, height: 440, title: `Analemma at ${formatHour(clockHour)} standard time, ${latLabel(latitude)}, ${Math.abs(longitude).toFixed(1)}° ${longitude >= 0 ? 'W' : 'E'}`, body: k.group('grid', grid) + k.group('analemma', curve) + k.group('marker', marker) });
}

/* ---------- 07 · Sun vector and its components ---------- */
export function drawSunVector(state, { standalone = false } = {}) {
  const k = kit(standalone, 'vec'), c = k.c, v = view(215, 22, 220, 290, 300);
  const s = solarPosition(state.latitude, state.day, state.hour), up = s.aboveHorizon;
  let axes = k.polyline(Array.from({ length: 121 }, (_, i) => v(sind(i * 3), cosd(i * 3))), { stroke: c.grid, dash: '4 5' });
  for (const [e, n, u, t] of [[1.2, 0, 0, 'East'], [0, 1.2, 0, 'North'], [0, 0, 1.15, 'Zenith']]) { const p = v(e, n, u); axes += k.line(v(0, 0), p, { stroke: c.ink, width: 1.2, arrow: 'ink' }) + k.label(p.x + 6, p.y - 4, t, { size: 12, fill: c.ink }); }
  axes += k.line(v(-1.1, 0), v(0, 0), { stroke: c.grid, dash: '3 4' }) + k.line(v(0, -1.1), v(0, 0), { stroke: c.grid, dash: '3 4' });
  let vec = '';
  const S = v(s.east, s.north, s.up), G = v(s.east, s.north, 0);
  vec += k.line(v(0, 0), G, { stroke: c.azi, width: 1.6, dash: '6 4' }) + k.line(S, G, { stroke: c.muted, dash: '2 4' });
  vec += k.line(G, v(0, s.north, 0), { stroke: c.muted, dash: '2 3' }) + k.line(G, v(s.east, 0, 0), { stroke: c.muted, dash: '2 3' });
  vec += k.line(v(0, 0), S, { stroke: c.alt, width: 2.6, arrow: 'alt' }) + k.circle(S, 9, { fill: c.sun, stroke: c.alt });
  vec += k.label(S.x + 14, S.y - 2, 'S (unit vector to sun)', { size: 12, fill: c.ink, weight: 600 });
  const az = s.azimuth ?? 0;
  if (up) {
    const altArc = arc3(v, [0, 0, 0], [sind(az), cosd(az), 0], [s.east, s.north, s.up], .5);
    vec += k.polyline(altArc, { stroke: c.alt, width: 2.2 }) + k.label(altArc[12].x + 8, altArc[12].y, 'ALT', { size: 13, weight: 700, fill: c.alt });
  }
  const azArc = Array.from({ length: 61 }, (_, i) => v(.22 * sind(az * i / 60), .22 * cosd(az * i / 60)));
  vec += k.polyline(azArc, { stroke: c.azi, width: 2.2, arrow: 'azi' }) + k.label(azArc[30].x, azArc[30].y + 18, 'AZI', { size: 13, weight: 700, fill: c.azi, anchor: 'middle' });
  let comps = '';
  const pe = v(s.east, 0, 0), pn = v(0, s.north, 0);
  comps += k.line(v(0, 0), pe, { stroke: c.third, width: 3 }) + k.label(pe.x, pe.y + 20, `Sₑ = ${s.east.toFixed(3)}`, { size: 12, fill: c.third, anchor: 'middle' });
  comps += k.line(v(0, 0), pn, { stroke: c.third, width: 3 }) + k.label(pn.x - 8, pn.y - 8, `Sₙ = ${s.north.toFixed(3)}`, { size: 12, fill: c.third, anchor: 'end' });
  comps += k.label((S.x + G.x) / 2 + 8, (S.y + G.y) / 2, `S_z = sin ALT = ${s.up.toFixed(3)}`, { size: 12, fill: c.third });
  const note = up ? '' : k.text(290, 40, 'Sun below the horizon: S_z < 0', { size: 14, fill: c.red, anchor: 'middle' });
  return svgDocument(k, { width: 600, height: 420, title: 'Sun vector, its components, altitude and azimuth', body: k.group('axes', axes) + k.group('sun-vector', vec) + k.group('components', comps) + k.group('note', note) });
}

/* ---------- 08 · Horizontal sundial for model testing ---------- */
export function drawSundial(latitude, sun = null, { standalone = false, peg = 25, minAlt = 15 } = {}) {
  const k = kit(standalone, 'dial', { exact: true }), c = k.c, tipOf = (d, h) => { const s = solarPosition(latitude, d, h); return s.altitude >= minAlt ? sundialTip(peg, s) : null; };
  const all = [];
  const dates = DATE_LINES.map(([d, name]) => ({ d, name, pts: Array.from({ length: 241 }, (_, i) => tipOf(d, 2 + i / 12)) }));
  dates.forEach(l => l.pts.forEach(p => p && all.push(p)));
  all.push({ x: 0, y: 0 });
  const minx = Math.min(...all.map(p => p.x)) - 22, maxx = Math.max(...all.map(p => p.x)) + 22, miny = Math.min(...all.map(p => -p.y)) - 26, maxy = Math.max(...all.map(p => -p.y)) + 30;
  const T = p => ({ x: p.x - minx, y: -p.y - miny }), W = maxx - minx, H = maxy - miny + 18;
  let grid = k.rect(1, 1, W - 2, H - 2, { stroke: c.grid });
  let lines = '';
  for (const l of dates) {
    lines += k.path(k.broken(l.pts.map(p => p && T(p))), { stroke: c.ink, width: [172, 80, 355].includes(l.d) ? 0.6 : 0.3 });
    const first = l.pts.find(Boolean); if (first) { const q = T(first); lines += k.text(q.x + (first.x < 0 ? -2 : 2), q.y - 1.5, l.name, { size: 3, anchor: first.x < 0 ? 'end' : 'start', fill: c.ink }); }
  }
  for (let h = 5; h <= 19; h++) {
    const pts = Array.from({ length: 92 }, (_, i) => tipOf(172 + i * 2 <= 355 ? 172 + i * 2 : 355, h)).map(p => p && T(p));
    lines += k.path(k.broken(pts), { stroke: c.muted, width: 0.35, dash: '1.2 1' });
    const lab = pts.find(Boolean) ?? null, labEnd = [...pts].reverse().find(Boolean);
    const at = lab ?? labEnd; if (at) lines += k.text(at.x, at.y + (latitude >= 0 ? 4.5 : -2.5), `${h}h`, { size: 3, anchor: 'middle', fill: c.muted });
  }
  const O = T({ x: 0, y: 0 });
  let pegG = k.circle(O, 1.6, { fill: c.ink }) + k.text(O.x + 3, O.y + (latitude >= 0 ? 5 : -3), 'Peg', { size: 3.2, fill: c.ink });
  pegG += k.line({ x: 6, y: H - 8 }, { x: 6 + peg, y: H - 8 }, { stroke: c.ink, width: .5 }) + k.line({ x: 6, y: H - 10 }, { x: 6, y: H - 6 }, { stroke: c.ink, width: .5 }) + k.line({ x: 6 + peg, y: H - 10 }, { x: 6 + peg, y: H - 6 }, { stroke: c.ink, width: .5 });
  pegG += k.text(8 + peg, H - 7, `Peg length P = ${peg} mm (print at 100%)`, { size: 3, fill: c.ink });
  pegG += k.text(W - 6, 8, `Sundial · ${latLabel(latitude)} · solar time · north ↑`, { size: 3.4, anchor: 'end', fill: c.ink, weight: 600 });
  pegG += k.line({ x: W - 10, y: 20 }, { x: W - 10, y: 12 }, { stroke: c.ink, width: .6, arrow: 'ink' });
  let cur = '';
  if (sun && sun.aboveHorizon) { const t = sundialTip(peg, sun); const q = T(t); const inside = q.x > 0 && q.x < W && q.y > 0 && q.y < H; cur += k.line(O, inside ? q : { x: O.x + (q.x - O.x) * .2, y: O.y + (q.y - O.y) * .2 }, { stroke: c.ink, width: 1.2 }); if (inside) cur += k.circle(q, 2, { fill: c.sun, stroke: c.alt, width: .6 }); else cur += k.text(O.x, O.y - 6, 'Shadow tip outside the chart', { size: 3, anchor: 'middle', fill: c.red }); }
  const title = `Horizontal sundial for model testing at ${latLabel(latitude)}`, body = k.group('frame', grid) + k.group('date-and-hour-lines', lines) + k.group('peg-and-scale', pegG) + k.group('current-shadow', cur);
  // The printable file keeps its true millimetre size. On the page the dial sits centred in a
  // fixed frame, so the panel does not change size when the latitude changes the dial's extent.
  if (standalone) return svgDocument(k, { width: W, height: H, scale: 1, title, body });
  const FW = 240, FH = 186;
  return svgDocument(k, { width: FW, height: FH, title, className: 'diagram exact', body: `<svg x="0" y="0" width="${FW}" height="${FH}" viewBox="0 0 ${f(W)} ${f(H)}">${body}</svg>` });
}

/* ---------- 09 · Sun-path diagrams ---------- */
function sunPathLines(latitude) {
  const dateLines = DATE_LINES.map(([d, name]) => ({ d, name, pts: Array.from({ length: 289 }, (_, i) => solarPosition(latitude, d, i / 12)) }));
  const hourLines = [];
  for (let h = 3; h <= 21; h++) hourLines.push({ h, pts: Array.from({ length: 93 }, (_, i) => solarPosition(latitude, Math.min(172 + i * 2, 355), h)) });
  return { dateLines, hourLines };
}
export function drawSunPath(state, { standalone = false, face = null, device = null, construction = false, paths = true, sunMarker = true, title, prefix = 'sp' } = {}) {
  const k = kit(standalone, prefix), c = k.c, C = { x: 400, y: 300 }, R = 240;
  const loc = (alt, az) => { const p = stereographic(alt, az, R); return { x: C.x + p.x, y: C.y + p.y }; };
  const L = s => s.aboveHorizon ? loc(s.altitude, s.azimuth ?? 0) : null;
  let grid = '';
  for (let a = 0; a < 90; a += 10) { const r = R * tand((90 - a) / 2); grid += k.circle(C, r, { stroke: a ? c.grid : c.ink, width: a ? .8 : 1.6 }); if (a) grid += k.label(C.x + 3, C.y - r + 11, `${a}°`, { size: 10 }); }
  for (let az = 0; az < 360; az += 10) { const o = loc(0, az), i = loc(az % 30 ? 2 : 80, az); grid += k.line(az % 30 ? loc(0, az) : C, az % 30 ? loc(4, az) : o, { stroke: az % 30 ? c.axis : c.grid, width: .8 }); if (az % 30 === 0) { const t = loc(-6, az); grid += k.text(t.x, t.y + 4, `${az}°`, { size: 11, anchor: 'middle' }); } }
  for (const [az, n] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const t = loc(-14, az); grid += k.text(t.x, t.y + (az === 270 ? -16 : 6), n, { size: 17, weight: 700, fill: c.ink, anchor: 'middle' }); }
  let masks = '';
  if (face) {
    const m = faceMask(face), top = m.points.map(p => loc(p.altitude, p.azimuth)), bottom = [...m.points].reverse().map(p => loc(0, p.azimuth));
    masks += k.polygon([...top, ...bottom], { fill: c.mask, fillOpacity: .75, stroke: c.maskEdge, width: 1.2 });
  }
  if (device) {
    const ori = device.orientation, back = [], hz = a => loc(0, ori + a);
    for (let a = 90; a <= 270; a += 3) back.push(hz(a));
    masks += k.polygon([...back, C], { fill: c.mask, fillOpacity: .35, stroke: 'none' });
    if (device.vsa < 89.9) { const b = []; for (let h = -90; h <= 90; h += 2) b.push(loc(overhangMaskAltitude(device.vsa, h), ori + h)); masks += k.polygon([...b, C], { fill: k.H.screen, stroke: c.alt, width: 1.4 }); }
    if (device.hsa < 89.9) for (const sgn of [1, -1]) { const b = [C]; for (let a = device.hsa; a <= 90.01; a += 2) b.push(hz(sgn * a)); masks += k.polygon(b, { fill: k.H.screen, stroke: c.azi, width: 1.4 }); }
    masks += k.line(hz(-90), hz(90), { stroke: c.ink, width: 2.4 }) + k.line(C, loc(55, ori), { stroke: c.ink, width: 1.4, arrow: 'ink' });
    const fl = loc(-3, ori + 90); masks += k.label(fl.x, fl.y, 'facade plane', { size: 11, fill: c.ink, anchor: 'middle' });
  }
  let lines = '';
  if (paths) {
    const { dateLines, hourLines } = sunPathLines(state.latitude);
    for (const l of hourLines) {
      lines += k.path(k.broken(l.pts.map(L)), { stroke: c.axis, width: .8, dash: '3 3' });
      const summer = state.latitude >= 0 ? l.pts[0] : l.pts.at(-1);
      if (summer.aboveHorizon) { const p = L(summer); lines += k.label(p.x, p.y - 7, String(l.h), { size: 11, anchor: 'middle', fill: c.ink }); }
    }
    for (const l of dateLines) {
      const main = [172, 80, 355].includes(l.d);
      lines += k.path(k.broken(l.pts.map(L)), { stroke: c.ink, width: dateWidth(l.d) });
      const set = [...l.pts].reverse().find(p => p.aboveHorizon && p.hourAngle > 0);
      if (set && l.pts.some(p => !p.aboveHorizon)) { const a = set.azimuth, q = loc(-2, a), t = loc(-5, a); lines += k.line(loc(0, a), q, { stroke: c.muted, width: .8 }) + k.text(t.x - 2, t.y + 4, l.name, { size: main ? 11 : 10, anchor: 'end', fill: main ? c.ink : c.muted, weight: main ? 700 : undefined }); }
    }
  }
  let current = '';
  if (sunMarker) {
    const today = Array.from({ length: 289 }, (_, i) => solarPosition(state.latitude, state.day, i / 12));
    // Today's path in blue pencil over the ink chart.
    if (paths) current += k.path(k.broken(today.map(L)), { stroke: c.alt, width: 2.2 });
    const sun = solarPosition(state.latitude, state.day, state.hour);
    if (sun.aboveHorizon) {
      const p = L(sun), blocked = face && isMasked(sun, face);
      if (construction) { current += k.line(C, p, { stroke: c.third, width: 1.8 }) + k.label((C.x + p.x) / 2 + 8, (C.y + p.y) / 2 - 6, `r = R·tan(ZEN/2) = ${(stereographic(sun.altitude, 0, 1).y * -1).toFixed(3)} R`, { size: 12, fill: c.third, weight: 600 }); }
      current += k.circle(p, 13, { fill: c.paper, fillOpacity: .85 }) + k.circle(p, 8, { fill: blocked ? c.red : c.sun, stroke: blocked ? c.red : c.alt, width: 1.5 });
    }
  }
  let notes = k.text(24, 588, `${latLabel(state.latitude)} · stereographic · solar time`, { size: 11 }) + k.text(776, 588, 'Centre = zenith · outer circle = horizon', { size: 11, anchor: 'end' });
  return svgDocument(k, { width: 800, height: 600, title: title ?? `Stereographic sun-path diagram, ${latLabel(state.latitude)}`, body: k.group('grid', grid) + k.group('masks', masks) + k.group('sun-paths', lines) + k.group('current-sun', current) + k.group('notes', notes) });
}
export function drawCylindrical(state, { standalone = false, face = null } = {}) {
  const k = kit(standalone, 'cyl'), c = k.c, x0 = 50, x1 = 690, y0 = 24, y1 = 300;
  const X = az => x0 + az / 360 * (x1 - x0), Y = alt => y1 - alt / 90 * (y1 - y0);
  const P = s => s.aboveHorizon ? { x: X(s.azimuth ?? 180), y: Y(s.altitude), az: s.azimuth ?? 180 } : null;
  const brk = arr => { const out = []; let prev = null; for (const p of arr) { if (p && prev && Math.abs(p.az - prev.az) > 180) out.push(null); out.push(p); prev = p; } return k.broken(out); };
  let grid = '';
  for (let a = 0; a <= 90; a += 10) grid += k.line({ x: x0, y: Y(a) }, { x: x1, y: Y(a) }, { stroke: a ? c.fineGrid : c.ink, width: a ? 1 : 1.4 }) + k.text(x0 - 6, Y(a) + 4, `${a}°`, { size: 10, anchor: 'end' });
  for (let a = 0; a <= 360; a += 30) grid += k.line({ x: X(a), y: y0 }, { x: X(a), y: y1 }, { stroke: c.fineGrid }) + k.text(X(a), y1 + 16, `${a}°`, { size: 10, anchor: 'middle' });
  for (const [a, n] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W'], [360, 'N']]) grid += k.text(X(a), y1 + 34, n, { size: 14, weight: 700, fill: c.ink, anchor: 'middle' });
  let masks = '';
  if (face) { const m = faceMask(face); masks += k.polygon([...m.points.map(p => ({ x: X(p.azimuth), y: Y(p.altitude) })), ...[...m.points].reverse().map(p => ({ x: X(p.azimuth), y: Y(0) }))], { fill: c.mask, fillOpacity: .75, stroke: c.maskEdge }); }
  const { dateLines, hourLines } = sunPathLines(state.latitude);
  let lines = '';
  for (const l of hourLines) lines += k.path(brk(l.pts.map(P)), { stroke: c.axis, width: .8, dash: '3 3' });
  for (const l of dateLines) lines += k.path(brk(l.pts.map(P)), { stroke: c.ink, width: dateWidth(l.d) });
  let current = k.path(brk(Array.from({ length: 289 }, (_, i) => P(solarPosition(state.latitude, state.day, i / 12)))), { stroke: c.alt, width: 2.2 });
  const sun = solarPosition(state.latitude, state.day, state.hour);
  if (sun.aboveHorizon) { const p = P(sun); current += k.circle(p, 7, { fill: face && isMasked(sun, face) ? c.red : c.sun, stroke: c.alt, width: 1.4 }); }
  return svgDocument(k, { width: 720, height: 350, title: `Cylindrical sun-path diagram, ${latLabel(state.latitude)}`, body: k.group('grid', grid) + k.group('mask', masks) + k.group('sun-paths', lines) + k.group('current-sun', current) });
}

/* ---------- 10 · Obstruction seen from a point ---------- */
export function drawMaskScene(face, state, { standalone = false } = {}) {
  const k = kit(standalone, 'msc'), c = k.c, B = face.bearing;
  const fw = [sind(B), cosd(B)], lat = [sind(B + 90), cosd(B + 90)];
  const W = (x, y, z) => [fw[0] * y + lat[0] * x, fw[1] * y + lat[1] * x, z];
  const x1 = face.offset - face.width / 2, x2 = face.offset + face.width / 2, D = face.distance, Dd = D + 10, H = face.height;
  const corners = [W(x1, D, 0), W(x2, D, 0), W(x2, Dd, 0), W(x1, Dd, 0)];
  const v = fitView(B + 245, 18, [...corners, ...corners.map(p => [p[0], p[1], H]), [0, 0, 0], W(0, -4, 0)], { x: 30, y: 30, w: 580, h: 300 });
  let scene = k.polygon([W(-6, -6, 0), W(-6, Dd + 6, 0), W(6, Dd + 6, 0), W(6, -6, 0)].map(p => v(...p)), { fill: 'none' });
  // The neighbour in its own frame (x along the face, y away from the observer), shaded by the current sun.
  const sun = solarPosition(state.latitude, state.day, state.hour);
  const local = d => [d[0] * lat[0] + d[1] * lat[1], d[0] * fw[0] + d[1] * fw[1], d[2]];
  const [sx, sy, sz] = local([sun.east, sun.north, sun.up]);
  const sc = penScene(k, (x, y, z) => v(...W(x, y, z)), local(v.toward), [box(x1, x2, D, Dd, 0, H)], { x: sx, y: sy, z: sz });
  const building = sc.back + sc.front;
  let geo = '';
  const O = v(0, 0, 0), foot = v(...W(0, D, 0)), top = v(...W(0, D, H));
  geo += k.line(O, foot, { stroke: c.azi, width: 1.8 }) + k.label((O.x + foot.x) / 2, (O.y + foot.y) / 2 + 16, `D = ${D.toFixed(1)} m`, { size: 12, fill: c.azi, weight: 600, anchor: 'middle' });
  geo += k.line(foot, top, { stroke: c.ink, width: 1.8 }) + k.label(top.x + 8, (foot.y + top.y) / 2, `H = ${H.toFixed(1)} m`, { size: 12, fill: c.ink, weight: 600 });
  geo += k.line(O, top, { stroke: c.alt, width: 1.6, dash: '6 4' });
  const a = arc3(v, [0, 0, 0], W(0, 1, 0), W(0, D, H), Math.min(D, 6) * .5);
  geo += k.polyline(a, { stroke: c.alt, width: 2.2 }) + k.label(a[12].x + 8, a[12].y - 4, `ALT_obs = ${deg(Math.atan2(H, D) / RAD)}`, { size: 12, fill: c.alt, weight: 700 });
  geo += k.circle(O, 5, { fill: c.ink }) + k.label(O.x - 8, O.y + 18, 'Observation point', { size: 12, fill: c.ink, anchor: 'end' });
  if (sun.aboveHorizon) { const L = Math.min(D, 10) * .55, blocked = isMasked(sun, face); geo += k.line(v(sun.east * L, sun.north * L, sun.up * L), O, { stroke: blocked ? c.red : c.sun, width: 2.4, arrow: blocked ? 'red' : 'alt' }); const sp = v(sun.east * L, sun.north * L, sun.up * L); geo += k.circle(sp, 8, { fill: c.sun, stroke: c.alt }) + k.label(sp.x + 12, sp.y, blocked ? 'Sun blocked' : 'Sun visible', { size: 12, fill: blocked ? c.red : c.ink, weight: 600 }); }
  return svgDocument(k, { width: 640, height: 360, title: 'Obstruction angle from an observation point to a neighbouring building', body: k.group('building', building) + k.group('geometry', geo) });
}

/* ---------- 11 · Profile angle construction ---------- */
export function drawProfileAxo(sun, orientation, dims = {}, { standalone = false } = {}) {
  const k = kit(standalone, 'pro'), c = k.c, { depth: D = .8, height: Hw = 1.5, width: w = 1.2, gap: G = .3 } = dims;
  const a = shadowAngles(sun, orientation), zH = Hw + G;
  const pts = [[-1.2, 0, -.3], [1.2, 0, -.3], [1.2, 0, 2.2], [-1.2, 0, 2.2], [-1.2, D, zH], [1.2, D, zH], [0, D + .3, zH], [0, 0, -.3]];
  const v = fitView(38, 20, pts, { x: 20, y: 20, w: 600, h: 380 });
  const P = (x, y, z) => v(x, y, z);
  const wall = `${k.d([P(-1.2, 0, -.3), P(1.2, 0, -.3), P(1.2, 0, 2.2), P(-1.2, 0, 2.2)], true)} ${k.d([P(-w / 2, 0, 0), P(w / 2, 0, 0), P(w / 2, 0, Hw), P(-w / 2, 0, Hw)], true)}`;
  let building = k.path(wall, { fill: a.onFacade ? c.paper : c.face, rule: 'evenodd', stroke: c.ink, width: PEN.outline });
  building += k.polygon([P(-w / 2, 0, 0), P(w / 2, 0, 0), P(w / 2, 0, Hw), P(-w / 2, 0, Hw)], { fill: c.glass, fillOpacity: .35, stroke: c.buildingEdge });
  let shade = '', geo = '';
  if (a.onFacade) {
    const zL = zH - D * tand(a.vsa), xL = -D * tand(a.hsa);
    const zc = Math.max(zL, -.3);
    shade += k.polygon([P(-1.2, 0, zH), P(1.2, 0, zH), P(1.2, 0, zc), P(-1.2, 0, zc)], { fill: c.shadow, fillOpacity: .35 });
    shade += k.line(P(-1.2, 0, zc), P(1.2, 0, zc), { stroke: c.shadow, width: 1.2 });
    const E = [0, D, zH], Lp = [xL, 0, zL], Ls = [0, 0, zL], Eh = [0, D, zL];
    geo += k.line(P(...E), P(...Eh), { stroke: c.muted, dash: '2 3' });
    geo += k.line(P(...Eh), P(...Lp), { stroke: c.azi, width: 1.8, dash: '6 4' });
    geo += k.line(P(...Eh), P(...Ls), { stroke: c.muted, width: 1, dash: '3 3' });
    geo += k.line(P(...E), P(...Ls), { stroke: c.third, width: 2.2 });
    geo += k.line(P(...E), P(...Lp), { stroke: c.alt, width: 2.6, arrow: 'alt' });
    const r = Math.max(.25, Math.min(.6, D * .6));
    const altArc = arc3(v, Lp, [0 - xL, D, 0], [0 - xL, D, zH - zL], r);
    geo += k.polyline(altArc, { stroke: c.alt, width: 2.2 }) + k.label(altArc[12].x - 10, altArc[12].y - 4, 'ALT', { size: 13, weight: 700, fill: c.alt, anchor: 'end' });
    if (Math.abs(a.hsa) > 1) { const hArc = arc3(v, Lp, [0, 1, 0], [-xL, D, 0], r * 1.3); geo += k.line(P(...Lp), P(xL, D * .9, zL), { stroke: c.muted, dash: '2 3' }) + k.polyline(hArc, { stroke: c.azi, width: 2.2 }) + k.label(hArc[12].x, hArc[12].y + 16, 'HSA', { size: 13, weight: 700, fill: c.azi, anchor: 'middle' }); }
    const vArc = arc3(v, Ls, [0, 1, 0], [0, D, zH - zL], r * 1.05);
    geo += k.polyline(vArc, { stroke: c.third, width: 2.2 }) + k.label(vArc[12].x + 10, vArc[12].y + 4, 'VSA (profile angle)', { size: 13, weight: 700, fill: c.third });
    geo += k.circle(P(...E), 3.5, { fill: c.ink }) + k.label(P(...E).x + 8, P(...E).y - 8, 'Overhang edge', { size: 11, fill: c.ink });
  } else geo += k.text(320, 40, sun.aboveHorizon ? 'Sun behind the facade (|HSA| ≥ 90°): no direct sun' : 'Sun below the horizon', { size: 14, fill: c.ink, anchor: 'middle' });
  let slab = k.polygon([P(-1.2, 0, zH), P(1.2, 0, zH), P(1.2, D, zH), P(-1.2, D, zH)], { fill: c.paper, stroke: c.ink, width: PEN.outline });
  slab += k.polygon([P(-1.2, D, zH), P(1.2, D, zH), P(1.2, D, zH + .06), P(-1.2, D, zH + .06)], { fill: c.face, stroke: c.ink, width: PEN.edge });
  const nrm = k.line(P(.95, 0, -.2), P(.95, .7, -.2), { stroke: c.ink, width: 1.2, arrow: 'ink' }) + k.label(P(.95, .75, -.2).x + 6, P(.95, .75, -.2).y + 4, 'Facade normal (ORI)', { size: 11, fill: c.ink });
  return svgDocument(k, { width: 640, height: 420, title: 'Profile angle (vertical shadow angle) construction', body: k.group('wall', building) + k.group('shadow-on-wall', shade) + k.group('overhang', slab) + k.group('construction', geo) + k.group('normal', nrm) });
}

/* ---------- 11 · Section (VSA) and plan (HSA) of a window with overhang and fins ---------- */
export function drawDevice(sun, orientation, dims = {}, { standalone = false } = {}) {
  const k = kit(standalone, 'dev'), c = k.c, { depth: D = .8, height: H = 1.5, width: w = 1.2, gap: G = .3, fin = 0 } = dims;
  const r = shadeWindow(sun, orientation, { depth: D, height: H, width: w, gap: G, fin }), s = 110;
  // Section: wall at x = 140, exterior to the right.
  const wx = 140, sill = 290, Y = z => sill - z * s, head = Y(H), oh = Y(H + G);
  let sec = k.title(30, 30, 'Section · vertical shadow angle');
  sec += k.rect(wx - 14, 40, 14, head - 40, { fill: c.wall }) + k.rect(wx - 14, sill, 14, 50, { fill: c.wall });
  sec += k.line({ x: wx - 7, y: head }, { x: wx - 7, y: sill }, { stroke: c.glass, width: 5 });
  sec += k.rect(wx - 14, oh - 7, D * s + 14, 7, { fill: c.canopy });
  if (r.direct) {
    sec += k.rect(wx - 9, head, 4, r.shadedHeight * s, { fill: c.canopy });
    const tip = { x: wx + D * s, y: oh }, land = { x: wx, y: oh + D * s * tand(r.vsa) }, far = { x: tip.x + 90 * cosd(r.vsa), y: tip.y - 90 * sind(r.vsa) };
    sec += k.line(far, land, { stroke: c.alt, width: 1.8, arrow: 'alt' });
    sec += k.line(tip, { x: tip.x - 50, y: tip.y }, { stroke: c.muted, dash: '2 3' }) + k.arc(tip.x, tip.y, 30, 180, 180 + r.vsa, { stroke: c.third, width: 2 }) + k.label(tip.x - 40, tip.y + 24, `VSA ${deg(r.vsa)}`, { size: 12, fill: c.third, weight: 700, anchor: 'end' });
  }
  const dv = deviceVSA(D, H, G);
  if (D > 0) sec += k.line({ x: wx, y: sill }, { x: wx + D * s, y: oh }, { stroke: c.muted, dash: '5 4' }) + k.label(wx + D * s * .55 + 8, sill - (H + G) * s * .55, `full-shade line ${deg(dv)}`, { size: 10 });
  sec += k.line({ x: wx, y: oh - 22 }, { x: wx + D * s, y: oh - 22 }, { stroke: c.azi }) + k.text(wx + D * s / 2, oh - 28, `D = ${D.toFixed(2)} m`, { size: 11, anchor: 'middle', fill: c.ink });
  sec += k.text(wx - 22, (head + sill) / 2, `H = ${H} m`, { size: 11, anchor: 'end', fill: c.ink }) + k.text(wx - 22, (oh + head) / 2 + 4, `G = ${G} m`, { size: 11, anchor: 'end' });
  // Plan: wall along x, exterior downward.
  const px = 420, py = 120, ps = 110;
  let plan = k.title(400, 30, 'Plan · horizontal shadow angle');
  plan += k.rect(px - 40, py - 14, 40, 14, { fill: c.wall }) + k.rect(px + w * ps, py - 14, 40, 14, { fill: c.wall });
  plan += k.line({ x: px, y: py - 7 }, { x: px + w * ps, y: py - 7 }, { stroke: c.glass, width: 5 });
  if (fin > 0) for (const x of [px, px + w * ps]) plan += k.rect(x - 3, py, 6, fin * ps, { fill: c.canopy });
  if (r.direct) {
    // Positive HSA: sun clockwise from the normal, i.e. to the left in this facade-aligned plan.
    const left = r.hsa >= 0;
    plan += k.rect(left ? px : px + w * ps - r.shadedWidth * ps, py - 9, r.shadedWidth * ps, 4, { fill: c.canopy });
    const base = { x: left ? px : px + w * ps, y: py + fin * ps };
    const far = { x: base.x - 110 * sind(r.hsa), y: base.y + 110 * cosd(r.hsa) };
    plan += k.line(far, { x: base.x + fin * ps * tand(r.hsa), y: py }, { stroke: c.azi, width: 1.8, arrow: 'azi' });
    plan += k.line({ x: px + w * ps / 2, y: py }, { x: px + w * ps / 2, y: py + 130 }, { stroke: c.muted, dash: '2 3' }) + k.text(px + w * ps / 2 + 6, py + 140, 'normal', { size: 10 });
    plan += k.label(px + w * ps / 2, py + 175, `HSA = AZI − ORI = ${r.hsa.toFixed(1)}°`, { size: 12, fill: c.azi, weight: 700, anchor: 'middle' });
  }
  plan += k.text(px + w * ps / 2, py - 22, `w = ${w} m`, { size: 11, anchor: 'middle', fill: c.ink }) + (fin > 0 ? k.text(px - 8, py + fin * ps, `d = ${fin.toFixed(2)} m`, { size: 11, anchor: 'end', fill: c.ink }) : '');
  plan += k.text(400, 320, r.direct ? `Window area shaded: ${Math.round(r.fraction * 100)}%` : 'No direct sun on this facade', { size: 14, fill: c.ink, weight: 600 });
  return svgDocument(k, { width: 680, height: 340, title: 'Window section and plan with overhang and fins', body: k.group('section', sec) + k.group('plan', plan) });
}

/** A shadow cast by a thin member: a narrow hatched strip along a–b. */
function strip(k, a, b, half) {
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1, n = { x: -(b.y - a.y) / L * half, y: (b.x - a.x) / L * half };
  return k.polygon([{ x: a.x + n.x, y: a.y + n.y }, { x: b.x + n.x, y: b.y + n.y }, { x: b.x - n.x, y: b.y - n.y }, { x: a.x - n.x, y: a.y - n.y }], { fill: k.c.shadow });
}

/* ---------- 12 · Shadow of a vertical pole ---------- */
export function drawPoleShadow(sun, { standalone = false, height = 3 } = {}) {
  const k = kit(standalone, 'pole'), c = k.c;
  let sec = k.title(24, 28, 'Section along the sun azimuth'), plan = k.title(420, 28, 'Plan');
  const g = { x: 300, y: 240 }, s = 40;
  sec += k.line({ x: 20, y: g.y }, { x: 380, y: g.y }, { stroke: c.ink, width: PEN.profile });
  sec += k.line(g, { x: g.x, y: g.y - height * s }, { stroke: c.ink, width: 4 }) + k.text(g.x + 8, g.y - height * s / 2, `H = ${height} m`, { size: 12, fill: c.ink });
  const sh = shadowVector(height, sun);
  if (sh) {
    const L = sh.length, Ld = Math.min(L, 7);
    sec += strip(k, { x: g.x, y: g.y - 3.5 }, { x: g.x - Ld * s, y: g.y - 3.5 }, 3.5);
    const top = { x: g.x, y: g.y - height * s }, far = { x: g.x + 60 * cosd(sun.altitude), y: top.y - 60 * sind(sun.altitude) };
    sec += k.line(far, top, { stroke: c.alt, width: 1.6 }) + (L <= 7 ? k.line(top, { x: g.x - L * s, y: g.y }, { stroke: c.alt, width: 1.6, arrow: 'alt' }) : '');
    if (L <= 7) sec += k.arc(g.x - L * s, g.y, 40, 0, sun.altitude, { stroke: c.alt, width: 2 }) + k.label(g.x - L * s + 46, g.y - 8, `ALT ${deg(sun.altitude)}`, { size: 12, fill: c.alt, weight: 700 });
    sec += k.label(g.x - Ld * s / 2, g.y + 22, `L = H / tan ALT = ${L > 999 ? '> 999' : L.toFixed(2)} m${L > 7 ? ' (clipped)' : ''}`, { size: 12, fill: c.ink, anchor: 'middle', weight: 600 });
    // plan
    const o = { x: 545, y: 165 }, ps = 18, Lp = Math.min(L, 6.5);
    plan += k.circle(o, 110, { stroke: c.grid, dash: '3 4' });
    for (const [a, n] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) plan += k.text(o.x + 125 * sind(a), o.y - 125 * cosd(a) + 5, n, { size: 14, weight: 700, fill: c.ink, anchor: 'middle' });
    const dir = sun.azimuth + 180, tip = { x: o.x + Lp * ps * sind(dir), y: o.y - Lp * ps * cosd(dir) };
    plan += strip(k, o, tip, 3.5) + k.line({ x: o.x + 100 * sind(sun.azimuth), y: o.y - 100 * cosd(sun.azimuth) }, o, { stroke: c.alt, width: 1.6, arrow: 'alt', dash: '6 4' });
    plan += k.path(k.d(Array.from({ length: 41 }, (_, i) => ({ x: o.x + 40 * sind(sun.azimuth * i / 40), y: o.y - 40 * cosd(sun.azimuth * i / 40) }))), { stroke: c.azi, width: 2, arrow: 'azi' });
    plan += k.label(o.x + 52 * sind(sun.azimuth / 2), o.y - 52 * cosd(sun.azimuth / 2), `AZI ${deg(sun.azimuth)}`, { size: 12, fill: c.azi, weight: 700, anchor: 'middle' });
    plan += k.label(tip.x, tip.y + (cosd(dir) > 0 ? -10 : 18), `shadow → ${deg(wrap(dir))}`, { size: 12, fill: c.ink, anchor: 'middle' });
    plan += k.circle(o, 4, { fill: c.ink });
  } else sec += k.text(200, 120, 'Sun below the horizon: no shadow', { size: 14, anchor: 'middle', fill: c.ink });
  return svgDocument(k, { width: 700, height: 300, title: 'Shadow of a vertical pole in section and plan', body: k.group('section', sec) + k.group('plan', plan) });
}

/* ---------- 12 · Massing shadow study ---------- */
export function drawMassing(model, { standalone = false } = {}) {
  const { latitude = 42.4, day = 80 } = model;
  const k = kit(standalone, 'mass'), c = k.c, study = massingStudy(model.height, model.gap, model.hour, day, latitude);
  const scale = 14, O = { x: 360, y: 375 }, p = (x, y) => ({ x: O.x + x * scale, y: O.y - y * scale });
  const rect = b => [p(b.x, b.y), p(b.x + b.w, b.y), p(b.x + b.w, b.y + b.d), p(b.x, b.y + b.d)];
  let grid = '';
  for (let x = -20; x <= 20; x += 2) grid += k.line(p(x, -2), p(x, 25), { stroke: c.fineGrid, width: .7 });
  for (let y = -2; y <= 24; y += 2) grid += k.line(p(-20, y), p(20, y), { stroke: c.fineGrid, width: .7 });
  // Other hours as dashed outlines with their hour at the far tip; the current hour hatched.
  let shadows = '';
  if (model.showAll) for (const hour of [10, 11, 12, 13, 14]) {
    const r = massingStudy(model.height, model.gap, hour, day, latitude);
    for (const sh of r.shadows) shadows += k.polygon(sh.map(q => p(q.x, q.y)), { stroke: c.ink, width: PEN.hatch, dash: '3 3' });
    if (!r.shadows[1].length) continue;
    const tip = r.shadows[1].map(q => p(q.x, q.y)).reduce((a, b) => (b.y < a.y ? b : a));
    shadows += k.label(tip.x, tip.y - 6, String(hour), { size: 10, anchor: 'middle', fill: c.muted });
  }
  for (const sh of study.shadows) shadows += k.polygon(sh.map(q => p(q.x, q.y)), { fill: c.shadow, stroke: c.ink, width: PEN.hatch });
  let blocks = '';
  for (const [i, n] of study.neighbors.entries()) { blocks += k.polygon(rect(n), study.hit[i] ? { fill: c.overlap, stroke: c.red, width: PEN.outline } : { fill: c.paper, stroke: c.ink, width: PEN.edge }); const q = p(n.x + 3, n.y + 3); blocks += k.text(q.x, q.y + 4, `N${i + 1}`, { anchor: 'middle', fill: study.hit[i] ? c.red : c.ink }); }
  for (const b of study.wings) { blocks += k.polygon(rect(b), { fill: c.paper, stroke: c.ink, width: PEN.profile }); const q = p(b.x + 1.5, 3); blocks += k.text(q.x, q.y + 5, `${b.h} m`, { anchor: 'middle', size: 15, weight: 600, fill: c.ink }); }
  let ann = k.line(p(5.2, 6), p(5.2, 6 + model.gap), { stroke: c.azi }) + k.text(p(5.2, 6).x + 8, p(5.2, 6 + model.gap / 2).y + 4, `${model.gap} m gap`, { size: 11 });
  ann += k.title(30, 35, `${formatHour(model.hour)} solar time · ${latLabel(latitude)} · ${calendarDate(day)}`) + k.text(30, 56, !study.sun.aboveHorizon ? 'Sun below the horizon' : study.clear ? 'Current shadow: clear of neighbours' : 'Current shadow: overlaps a neighbour', { size: 11 });
  const north = { x: 660, y: 120 }; ann += k.line({ x: north.x, y: north.y + 35 }, north, { stroke: c.ink, width: 1.8, arrow: 'ink' }) + k.text(north.x, north.y - 8, 'N', { size: 16, weight: 700, anchor: 'middle', fill: c.ink });
  if (model.showAll) ann += k.line({ x: 30, y: 420 }, { x: 58, y: 420 }, { stroke: c.ink, width: PEN.hatch, dash: '3 3' }) + k.text(64, 424, 'Shadows at 10:00–14:00 solar time (hour at the tip)', { size: 10 });
  return svgDocument(k, { width: 720, height: 470, title: `Massing shadow study, ${latLabel(latitude)}, ${calendarDate(day)}`, body: k.group('grid', grid) + k.group('shadows', shadows) + k.group('buildings', blocks) + k.group('annotations', ann) });
}
