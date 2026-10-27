// Static explanatory figures for Chapter 02. Generated into the page and into
// assets/diagrams/solar/*.svg by scripts/generate-solar.mjs.
import { RAD, solarPosition, stereographic, overhangMaskAltitude, shadowPolygon } from './solar.js';
import { svgDocument, view } from './svg.js';
import { figWorldTimeZones, figTimeZones } from './timezones.js';
import { inkKit as kit, PEN } from './ink.js';

// Reference dates in ink: June solid, equinox dashed, December dotted.
const DATES = [[172, 'Jun 21', { width: PEN.outline }], [80, 'Mar 21', { width: PEN.edge, dash: '6 4' }], [355, 'Dec 21', { width: 1.4, dash: '1.5 3' }]];
import { drawSky, drawOrbit, drawDeclination, drawEot, drawAnalemma, drawSundial, drawSunPath, drawCylindrical, drawProfileAxo } from './diagrams.js';
import { SKETCH_FIGURES } from './sketch.js';
import { figCoordinates } from './coordinates.js';
import { figComponents, incidenceReference } from './radiation-diagrams.js';

const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD), tand = d => Math.tan(d * RAD);

/* 04 · Cosine law */
export function figCosineLaw(standalone = false) {
  const k = kit(standalone, 'cos'), c = k.c;
  const panel = (x0, alt, title) => {
    let s = k.title(x0, 30, title);
    const gy = 250, cx = x0 + 110, w = 60, len = w / sind(alt);
    s += k.line({ x: x0, y: gy }, { x: x0 + 320, y: gy }, { stroke: c.ink, width: PEN.profile });
    const d = { x: -cosd(alt), y: sind(alt) };
    const a = { x: cx - len / 2, y: gy }, b = { x: cx + len / 2, y: gy };
    const n = { x: -d.y, y: -d.x }; void n;
    const A2 = { x: a.x - 150 * d.x, y: a.y - 150 * d.y }, B2 = { x: b.x - 150 * d.x, y: b.y - 150 * d.y };
    s += k.polygon([A2, B2, b, a], { fill: k.H.screen, stroke: c.alt });
    s += k.line(a, b, { stroke: c.red, width: 4 });
    s += k.label(cx, gy + 22, `ground width = beam width / sin ALT = ${(1 / sind(alt)).toFixed(2)}`, { size: 12, anchor: 'middle', fill: c.ink });
    s += k.arc(a.x, a.y, 34, 0, alt, { stroke: c.alt, width: 2 }) + k.label(a.x - 6, a.y - 8, `ALT ${alt}°`, { size: 12, anchor: 'end', fill: c.alt, weight: 700 });
    s += k.label(cx, gy + 42, `G_h = G_n × sin ALT = ${sind(alt).toFixed(2)} G_n`, { size: 12, anchor: 'middle', fill: c.alt, weight: 600 });
    return s;
  };
  const body = k.group('high-sun', panel(20, 71, 'Ithaca, Jun 21 noon · ALT 71°')) + k.group('low-sun', panel(380, 24, 'Ithaca, Dec 21 noon · ALT 24°'));
  return svgDocument(k, { width: 760, height: 310, title: 'Cosine law: the same beam spread over a larger area at low altitude', body });
}

/* 07 · Hour angle seen from above the north pole */
export function figHourAngle(standalone = false) {
  const k = kit(standalone, 'hra'), c = k.c, C = { x: 300, y: 200 }, R = 120;
  let g = k.circle(C, R, { fill: c.earth, stroke: c.buildingEdge, width: 1.4 }) + k.path(`M${C.x},${C.y - R} A${R},${R} 0 0 0 ${C.x},${C.y + R} Z`, { fill: c.night });
  for (let i = 0; i < 6; i++) g += k.line({ x: 560, y: 80 + i * 24 }, { x: C.x + R + 8, y: 80 + i * 24 }, { stroke: c.sun, width: 1.4, arrow: 'alt' });
  g += k.text(560, 64, 'Sun', { size: 13, anchor: 'end', fill: c.ink });
  for (let h = 0; h < 24; h++) {
    const a = (h - 12) * 15, p = { x: C.x + (R + 18) * cosd(a), y: C.y - (R + 18) * sind(a) };
    g += k.line({ x: C.x + R * cosd(a), y: C.y - R * sind(a) }, { x: C.x + (R + 6) * cosd(a), y: C.y - (R + 6) * sind(a) }, { stroke: c.ink });
    if (h % 3 === 0) g += k.text(p.x, p.y + 4, `${String(h).padStart(2, '0')}h`, { size: 11, anchor: 'middle', fill: c.ink });
  }
  const a = 45, q = { x: C.x + R * cosd(a), y: C.y - R * sind(a) };
  g += k.line(C, { x: C.x + R, y: C.y }, { stroke: c.ink, width: 1.4 }) + k.line(C, q, { stroke: c.third, width: 2 }) + k.circle(q, 5, { fill: c.red });
  g += k.arc(C.x, C.y, 55, 0, 45, { stroke: c.third, width: 2.4 }) + k.label(C.x + 62, C.y - 22, 'HRA = +45° (15:00)', { size: 13, fill: c.third, weight: 700 });
  g += k.circle(C, 3, { fill: c.ink }) + k.text(C.x - 8, C.y - 8, 'N pole', { size: 11, anchor: 'end' });
  g += k.text(30, 352, 'View from above the North Pole. The earth turns counter-clockwise, 15° per hour.', { size: 12 });
  g += k.text(30, 370, 'HRA = 0 when the site meridian faces the sun (solar noon).', { size: 12 });
  g += k.text(30, 388, 'HRA < 0 before noon, > 0 after noon.', { size: 12 });
  return svgDocument(k, { width: 620, height: 400, title: 'Hour angle: rotation of the site meridian away from solar noon', body: k.group('hour-angle', g) });
}

/* 09 · Stereographic projection construction */
export function figStereoConstruction(standalone = false) {
  const k = kit(standalone, 'stc'), c = k.c, O = { x: 260, y: 200 }, R = 150, N = { x: O.x, y: O.y + R };
  let g = k.arc(O.x, O.y, R, 0, 180, { stroke: c.ink, width: 1.6 }) + k.arc(O.x, O.y, R, 180, 360, { stroke: c.grid, dash: '4 4' });
  g += k.line({ x: O.x - R - 40, y: O.y }, { x: O.x + R + 40, y: O.y }, { stroke: c.ink, width: 1.2 }) + k.text(O.x + R + 44, O.y + 4, 'horizon plane = chart', { size: 11 });
  g += k.circle(N, 4, { fill: c.ink }) + k.label(N.x + 8, N.y + 14, 'Nadir (projection point)', { size: 12, fill: c.ink });
  for (const alt of [15, 30, 45, 60, 75]) {
    const p = { x: O.x + R * cosd(alt), y: O.y - R * sind(alt) }, r = R * tand((90 - alt) / 2), q = { x: O.x + r, y: O.y };
    g += k.line(N, p, { stroke: c.alt, width: .9, opacity: .8 }) + k.circle(p, 3, { fill: c.alt }) + k.circle(q, 3, { fill: c.third });
    g += k.label(p.x + 6, p.y - 4, `${alt}°`, { size: 11, fill: c.alt });
  }
  g += k.circle({ x: O.x, y: O.y - R }, 3, { fill: c.ink }) + k.label(O.x + 6, O.y - R - 6, 'Zenith → centre', { size: 11, fill: c.ink });
  g += k.text(30, 30, 'Section: points on the sky dome are projected toward the nadir.', { size: 12, fill: c.ink });
  let plan = '';
  const P = { x: 640, y: 200 };
  for (let a = 0; a <= 80; a += 10) plan += k.circle(P, R * tand((90 - a) / 2) * .9, { stroke: a ? c.grid : c.ink, width: a ? .8 : 1.4 });
  for (const alt of [15, 30, 45, 60, 75]) plan += k.label(P.x + R * tand((90 - alt) / 2) * .9 + 2, P.y - 4, `${alt}°`, { size: 10, fill: c.third });
  plan += k.text(P.x, 375, 'r = R · tan(ZEN / 2) = R · tan((90° − ALT) / 2)', { size: 14, anchor: 'middle', fill: c.third, weight: 700 });
  plan += k.text(520, 30, 'Plan: altitude rings are not equally spaced.', { size: 12, fill: c.ink });
  return svgDocument(k, { width: 820, height: 395, title: 'Stereographic projection of the sky hemisphere', body: k.group('section', g) + k.group('plan', plan) });
}

/* 09 · Sun paths at different latitudes */
export function figLatitudes(standalone = false) {
  const k = kit(standalone, 'lat'), c = k.c;
  let body = '';
  [[0, 'Equator 0°'], [23.45, 'Tropic 23.45° N'], [42.4, 'Ithaca 42.4° N'], [66.55, 'Arctic Circle 66.55° N'], [90, 'North Pole 90° N']].forEach(([lat, name], i) => {
    const v = view(200, 22, 82, 100 + i * 190, 190);
    let s = k.polygon(Array.from({ length: 73 }, (_, j) => v(sind(j * 5), cosd(j * 5))), { fill: c.ground, stroke: c.axis }) + k.arc(100 + i * 190, 190, 82, 0, 180, { stroke: c.grid });
    for (const [day, , pen] of DATES) s += k.path(k.broken(Array.from({ length: 145 }, (_, j) => { const p = solarPosition(lat, day, j / 6); return p.aboveHorizon ? v(p.east, p.north, p.up) : null; })), { stroke: c.ink, ...pen });
    for (const [a, n] of [[0, 'N'], [180, 'S'], [90, 'E']]) { const p = v(1.18 * sind(a), 1.18 * cosd(a)); s += k.text(p.x, p.y + 4, n, { size: 11, anchor: 'middle', fill: c.ink }); }
    s += k.text(100 + i * 190, 270, name, { size: 13, anchor: 'middle', fill: c.ink, weight: 600 });
    body += k.group(`lat-${String(lat).replace('.', '-')}`, s);
  });
  let key = '';
  DATES.forEach(([, t, pen], i) => { key += k.line({ x: 300 + i * 150, y: 300 }, { x: 328 + i * 150, y: 300 }, { stroke: c.ink, ...pen }) + k.text(334 + i * 150, 304, t === 'Mar 21' ? 'Mar 21 / Sep 21' : t, { size: 12 }); });
  return svgDocument(k, { width: 960, height: 320, title: 'Sun paths at five latitudes', body: body + k.group('key', key) });
}

/* 10 · Solar window (Lechner 6.8b) */
export function figSolarWindow(standalone = false, latitude = 42.4) {
  const k = kit(standalone, 'sw'), c = k.c, v = view(200, 22, 230, 360, 300);
  const pos = (d, h) => { const p = solarPosition(latitude, d, h); return v(p.east, p.north, p.up); };
  let s = k.polygon(Array.from({ length: 73 }, (_, j) => v(sind(j * 5), cosd(j * 5))), { fill: c.ground, stroke: c.axis }) + k.arc(360, 300, 230, 0, 180, { stroke: c.grid });
  const region = [...Array.from({ length: 25 }, (_, i) => pos(172, 9 + i / 4)), ...Array.from({ length: 31 }, (_, i) => pos(Math.round(172 + i * (183 / 30)), 15)), ...Array.from({ length: 25 }, (_, i) => pos(355, 15 - i / 4)), ...Array.from({ length: 31 }, (_, i) => pos(Math.round(355 - i * (183 / 30)), 9))];
  s += k.polygon(region, { fill: k.H.screen, stroke: c.alt, width: 1.4 });
  for (const [day, n, pen] of DATES) { s += k.path(k.broken(Array.from({ length: 145 }, (_, j) => { const p = solarPosition(latitude, day, j / 6); return p.aboveHorizon ? v(p.east, p.north, p.up) : null; })), { stroke: c.ink, ...pen }); const q = pos(day, 12); s += k.label(q.x + 8, q.y - 6, n, { size: 12, fill: c.ink, weight: 600 }); }
  for (const h of [9, 15]) { const q = pos(355, h); s += k.label(q.x, q.y + 18, `${h}:00`, { size: 12, anchor: 'middle', fill: c.ink }); }
  for (const [a, n] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) { const p = v(1.15 * sind(a), 1.15 * cosd(a)); s += k.text(p.x, p.y + 5, n, { size: 15, weight: 700, anchor: 'middle', fill: c.ink }); }
  s += k.text(30, 40, 'Solar window: the sky region crossed by the sun between 09:00 and 15:00 solar time, Dec 21 to Jun 21.', { size: 12, fill: c.ink });
  s += k.text(30, 60, 'Keep it unobstructed for solar heating (lower part, winter) or PV and hot water (whole window).', { size: 12 });
  return svgDocument(k, { width: 720, height: 450, title: `Solar window at ${latitude}° N`, body: k.group('solar-window', s) });
}

/* 11 · Device types and their shading masks (Szokolay Figs 1.47–1.50) */
export function figDeviceTypes(standalone = false) {
  const k = kit(standalone, 'dvt'), c = k.c, R = 105;
  const chart = (cx, cy, vsa, hsa) => {
    const loc = (alt, az) => { const p = stereographic(alt, az, R); return { x: cx + p.x, y: cy + p.y }; }; const C = { x: cx, y: cy };
    let s = '';
    for (let a = 0; a < 90; a += 15) s += k.circle(C, R * tand((90 - a) / 2), { stroke: a ? c.grid : c.ink, width: a ? .7 : 1.3 });
    const back = []; for (let a = 90; a <= 270; a += 5) back.push(loc(0, 180 + a)); s += k.polygon([...back, C], { fill: c.mask });
    if (vsa) { const b = []; for (let h = -90; h <= 90; h += 3) b.push(loc(overhangMaskAltitude(vsa, h), 180 + h)); s += k.polygon([...b, C], { fill: k.H.screen, stroke: c.alt, width: 1.2 }); }
    if (hsa) for (const sg of [1, -1]) { const b = [C]; for (let a = hsa; a <= 90.01; a += 3) b.push(loc(0, 180 + sg * a)); s += k.polygon(b, { fill: k.H.screen, stroke: c.azi, width: 1.2 }); }
    s += k.line(loc(0, 90), loc(0, 270), { stroke: c.ink, width: 2 }) + k.text(cx, cy + R + 16, 'S', { size: 12, anchor: 'middle', fill: c.ink, weight: 700 }) + k.text(cx, cy - R - 6, 'N', { size: 12, anchor: 'middle', fill: c.ink, weight: 700 });
    return s;
  };
  let a = k.title(130, 30, 'Horizontal device', { anchor: 'middle' }) + k.text(130, 48, 'characterised by VSA · segmental mask', { size: 11, anchor: 'middle' });
  a += k.rect(60, 70, 10, 90, { fill: c.wall }) + k.rect(60, 70, 80, 7, { fill: c.canopy }) + k.line({ x: 70, y: 160 }, { x: 140, y: 77 }, { stroke: c.muted, dash: '4 3' }) + k.arc(70, 160, 30, 0, 50, { stroke: c.alt, width: 2 }) + k.label(104, 150, 'VSA 50°', { size: 11, fill: c.alt, weight: 700 });
  a += chart(130, 310, 50, 0);
  let b = k.title(390, 30, 'Vertical fins', { anchor: 'middle' }) + k.text(390, 48, 'characterised by HSA · sectoral mask', { size: 11, anchor: 'middle' });
  b += k.line({ x: 330, y: 80 }, { x: 450, y: 80 }, { stroke: c.wall, width: 6 }); for (const x of [340, 390, 440]) b += k.rect(x - 2, 80, 4, 45, { fill: c.canopy });
  b += k.line({ x: 390, y: 80 }, { x: 435, y: 125 }, { stroke: c.muted, dash: '4 3' }) + k.label(420, 150, 'HSA 45°', { size: 11, fill: c.azi, weight: 700 }) + k.text(330, 72, 'plan', { size: 10 });
  b += chart(390, 310, 0, 45);
  let e = k.title(650, 30, 'Egg-crate', { anchor: 'middle' }) + k.text(650, 48, 'VSA and HSA combined', { size: 11, anchor: 'middle' });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) e += k.rect(600 + i * 26, 70 + j * 26, 22, 22, { stroke: c.canopy, width: 3 });
  e += chart(650, 310, 50, 45);
  const n = k.text(390, 448, 'South facade. Hatched 45°: sun behind the facade. Hatched 135°: sun positions fully screened by the device.', { size: 12, anchor: 'middle' });
  return svgDocument(k, { width: 780, height: 460, title: 'Shading device types and their shading masks', body: k.group('horizontal', a) + k.group('vertical', b) + k.group('eggcrate', e) + k.group('note', n) });
}

/* 12 · Shadow construction: building as a set of poles */
export function figShadowConstruction(standalone = false, day = 80) {
  const k = kit(standalone, 'shc'), c = k.c, rect = { x: -6, y: -4, w: 12, d: 8 }, H = 6;
  let body = '';
  [9, 12, 15].forEach((h, i) => {
    const sun = solarPosition(42.4, day, h), O = { x: 140 + i * 250, y: 250 }, s = 6;
    const P = q => ({ x: O.x + q.x * s, y: O.y - q.y * s });
    let g = k.text(O.x, 30, `${h}:00 solar · ALT ${sun.altitude.toFixed(1)}° · AZI ${sun.azimuth.toFixed(1)}°`, { size: 12, anchor: 'middle', fill: c.ink, weight: 600 });
    const poly = shadowPolygon(rect, H, sun);
    g += k.polygon(poly.map(P), { fill: c.shadow });
    const corners = [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x + rect.w, rect.y + rect.d], [rect.x, rect.y + rect.d]];
    const L = H / tand(sun.altitude);
    for (const [x, y] of corners) { const tip = { x: x - L * sind(sun.azimuth), y: y - L * cosd(sun.azimuth) }; g += k.line(P({ x, y }), P(tip), { stroke: c.ink, width: .9, dash: '3 3' }) + k.circle(P(tip), 2.5, { fill: c.ink }); }
    g += k.polygon(corners.map(([x, y]) => P({ x, y })), { fill: c.paper, stroke: c.ink, width: PEN.profile });
    g += k.text(O.x, 470, `L = ${H} / tan ${sun.altitude.toFixed(1)}° = ${L.toFixed(1)} m`, { size: 12, anchor: 'middle', fill: c.alt, weight: 600 });
    body += k.group(`shadow-${h}`, g);
  });
  body += k.line({ x: 735, y: 90 }, { x: 735, y: 55 }, { stroke: c.ink, width: 1.6, arrow: 'ink' }) + k.text(735, 48, 'N', { size: 14, anchor: 'middle', weight: 700, fill: c.ink });
  body += k.text(20, 492, 'Ithaca, Mar 21. Plan 12 × 8 m, height 6 m. Each vertical corner is a pole (Eq. 22).', { size: 12 }) + k.text(20, 508, 'Connect the shadow tips and the base to obtain the shadow outline.', { size: 12 });
  return svgDocument(k, { width: 760, height: 520, title: 'Shadow construction for a box building at three hours', body });
}

/* All figures with file names, captions and an optional caption note. */
export const FIGURES = [
  ['coordinates', 'Latitude and longitude', 'LAT positive north; LONG in degrees west (°W), as in Eq. 2', figCoordinates],
  ['sky-dome', 'Sky hemisphere: ALT, AZI, ZEN', null, s => drawSky({ latitude: 42.4, day: 80, hour: 10 }, { standalone: s })],
  ['world-time-zones', 'Standard-time zones of the world', null, figWorldTimeZones],
  ['time-zones', 'Time zones and longitude correction', null, figTimeZones],
  ['orbit', "Earth's orbit", null, s => drawOrbit(null, { standalone: s })],
  ['cosine-law', 'Cosine law', null, figCosineLaw],
  ['incidence-tilted-surface', 'Angle of incidence on a tilted surface', null, incidenceReference],
  ['irradiance-components', 'Beam, sky and ground components', null, figComponents],
  ['equation-of-time', 'Equation of time', null, s => drawEot(null, { standalone: s })],
  ['analemma-ithaca-noon', 'Analemma, Ithaca 12:00 EST', null, s => drawAnalemma(12, null, { standalone: s })],
  ['declination', 'Declination over the year', null, s => drawDeclination(null, { standalone: s })],
  ['hour-angle', 'Hour angle', null, figHourAngle],
  ['sundial-42N', 'Sundial for model testing, 42.4° N, print at 100%', null, s => drawSundial(42.4, null, { standalone: s })],
  ['stereographic-construction', 'Stereographic projection', null, figStereoConstruction],
  ['sunpath-ithaca-stereographic', 'Sun-path diagram, Ithaca', null, s => drawSunPath({ latitude: 42.4, day: 80, hour: 12 }, { standalone: s, sunMarker: false })],
  ['sunpath-ithaca-cylindrical', 'Cylindrical sun-path diagram, Ithaca', null, s => drawCylindrical({ latitude: 42.4, day: 80, hour: 12 }, { standalone: s })],
  ['latitudes', 'Sun paths at different latitudes', null, figLatitudes],
  ['solar-window', 'Solar window, Ithaca', null, figSolarWindow],
  ['profile-angle', 'Profile angle construction', null, s => drawProfileAxo({ altitude: 45, azimuth: 215, aboveHorizon: true }, 180, { depth: .8 }, { standalone: s })],
  ['device-types', 'Device types and shading masks', null, figDeviceTypes],
  ['shadow-construction', 'Shadow construction', null, figShadowConstruction],
  ...SKETCH_FIGURES.map(([name, caption, draw]) => [name, caption, 'Hand drawing', s => draw(s)]),
];
