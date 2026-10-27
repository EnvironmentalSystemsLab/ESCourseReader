/** Geometric solar model for the course reader. Degrees, metres, minutes, solar hours.
 * The equations follow Szokolay, Method sheet M.1.1:
 *   DEC  Cooper (1969):  DEC = 23.45 sin[360/365 (284 + NDY)]
 *   EOT  Spencer (1971), as in Duffie & Beckman: B = (NDY - 1) 360/365
 *   ALT  arcsin(sin DEC sin LAT + cos DEC cos LAT cos HRA)
 *   AZI  arccos[(cos LAT sin DEC - cos DEC sin LAT cos HRA) / cos ALT], 360 - AZI after noon
 * Representative 365-day calendar (2026). No refraction, solar disc, terrain or weather.
 */
export const RAD = Math.PI / 180;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const wrap = (x, m = 360) => ((x % m) + m) % m;
/** Signed angle difference in (-180, 180]. */
export const signed = x => { const w = wrap(x + 180) - 180; return w === -180 ? 180 : w; };
const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD), tan = d => Math.tan(d * RAD);
const asin = x => Math.asin(clamp(x, -1, 1)) / RAD, acos = x => Math.acos(clamp(x, -1, 1)) / RAD;

export function dayOfYear(month, day) {
  return Math.round((Date.UTC(2026, month - 1, day) - Date.UTC(2026, 0, 0)) / 86400000);
}
export function calendarDate(day) {
  const date = new Date(Date.UTC(2026, 0, clamp(Math.round(day), 1, 365)));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

/** Eq. 4 — solar declination (Cooper). */
export function declination(day) { return 23.45 * sin(360 / 365 * (284 + day)); }
/** Eq. 3 — equation of time in minutes (Spencer). */
export function eotAngle(day) { return (day - 1) * 360 / 365; }
export function equationOfTime(day) {
  const B = eotAngle(day);
  return 229.2 * (0.000075 + 0.001868 * cos(B) - 0.032077 * sin(B) - 0.014615 * cos(2 * B) - 0.04089 * sin(2 * B));
}
/** Approximate decomposition of EOT into its two causes (B' = 360(NDY - 81)/364). */
export function eotComponents(day) {
  const b = 360 * (day - 81) / 364;
  return { obliquity: 9.87 * sin(2 * b), eccentricity: -7.53 * cos(b) - 1.5 * sin(b) };
}
export function dailySolar(day) { return { declination: declination(day), equationOfTime: equationOfTime(day) }; }

/** Eq. 6 */
export const hourAngle = solarHour => 15 * (solarHour - 12);

/** Eq. 7 and 8. Returns angles plus the unit sun vector (east, north, up). */
export function solarPosition(latitude, day, solarHour) {
  const dec = declination(day), hra = hourAngle(solarHour);
  const up = sin(dec) * sin(latitude) + cos(dec) * cos(latitude) * cos(hra);
  const altitude = asin(up);
  const east = -cos(dec) * sin(hra);
  const north = cos(latitude) * sin(dec) - sin(latitude) * cos(dec) * cos(hra);
  const horizontal = Math.hypot(east, north);
  const atZenith = horizontal < 1e-10;
  // Slide 226 form: arccos gives 0–180°; the afternoon branch is 360° − AZI.
  const cosAzimuth = atZenith ? null : north / horizontal;
  const arccosAzimuth = atZenith ? null : acos(cosAzimuth);
  let azimuth = null;
  if (!atZenith) azimuth = east < 0 ? 360 - arccosAzimuth : arccosAzimuth;
  if (azimuth === 360) azimuth = 0;
  return { altitude, azimuth, zenith: 90 - altitude, east, north, up, declination: dec, hourAngle: hra,
    cosAzimuth, arccosAzimuth, afternoon: east < 0, aboveHorizon: up > 1e-8 };
}
/** Eq. 5 */
export const noonAltitude = (latitude, dec) => 90 - Math.abs(latitude - dec);
/** Eq. 9 — sunset hour angle; null in polar day (24 h) or polar night (0 h). */
export function sunsetHourAngle(latitude, dec) {
  const q = -tan(latitude) * tan(dec);
  if (q <= -1) return { hra: 180, polar: 'day', q };
  if (q >= 1) return { hra: 0, polar: 'night', q };
  return { hra: acos(q), polar: null, q };
}
export function daylightHours(latitude, day) { return 2 * sunsetHourAngle(latitude, declination(day)).hra / 15; }

/** Eq. 2 with longitudes in degrees WEST and an optional DST hour. */
export function clockToSolar(clockHour, day, { longitude = 76.5, standardMeridian = 75, dst = false } = {}) {
  const eot = equationOfTime(day), longitudeCorrection = 4 * (standardMeridian - longitude), dstCorrection = dst ? -60 : 0;
  const minutes = clockHour * 60 + dstCorrection + longitudeCorrection + eot;
  return { hour: wrap(minutes, 1440) / 60, dayOffset: Math.floor(minutes / 1440), equationOfTime: eot,
    longitudeCorrection, dstCorrection, totalOffset: dstCorrection + longitudeCorrection + eot };
}
export function solarToClock(solarHour, day, options = {}) {
  const r = clockToSolar(0, day, options);
  return wrap(solarHour * 60 - r.totalOffset, 1440) / 60;
}

/** Eq. 16–18: shadow angles for a vertical surface with outward normal azimuth ORI. */
export function shadowAngles(sun, orientation) {
  if (!sun.aboveHorizon || sun.azimuth === null) return { onFacade: false, hsa: null, vsa: null, inc: null };
  const hsa = signed(sun.azimuth - orientation);
  const inc = acos(cos(sun.altitude) * cos(hsa));
  if (Math.abs(hsa) >= 90 - 1e-9) return { onFacade: false, hsa, vsa: null, inc };
  const vsa = Math.atan(tan(sun.altitude) / cos(hsa)) / RAD;
  return { onFacade: true, hsa, vsa, inc };
}
/** Window with an infinitely wide overhang and infinitely tall side fins.
 * height H, width w, gap G between window head and overhang, overhang depth D, fin depth d. */
export function shadeWindow(sun, orientation, { depth = 0.6, height = 1.5, width = 1.2, gap = 0.3, fin = 0 } = {}) {
  const a = shadowAngles(sun, orientation);
  if (!a.onFacade) return { ...a, direct: false, fraction: 0, drop: 0, shadedHeight: 0, shadedWidth: 0 };
  const drop = depth * tan(a.vsa);                       // Eq. 19
  const shadedHeight = clamp(drop - gap, 0, height);
  const shadedWidth = clamp(fin * Math.abs(tan(a.hsa)), 0, width);  // Eq. 20
  const lit = (height - shadedHeight) * (width - shadedWidth);
  return { ...a, direct: true, drop, shadedHeight, shadedWidth, fraction: 1 - lit / (height * width),
    profile: a.vsa };
}
/** Device cut-off angles: full shade when solar VSA >= device VSA, or |HSA| >= device HSA. */
export const deviceVSA = (depth, height, gap) => depth > 0 ? Math.atan((height + gap) / depth) / RAD : 90;
export const deviceHSA = (fin, width) => fin > 0 ? Math.atan(width / fin) / RAD : 90;
/** Mask boundary of a horizontal device in sky coordinates. */
export const overhangMaskAltitude = (vsa, hsa) => Math.atan(tan(vsa) * cos(hsa)) / RAD;

/** Eq. 22 — shadow of a vertical edge of height H on level ground. */
export function shadowVector(height, sun) {
  if (!sun.aboveHorizon || height < 0) return null;
  const east = -height * sun.east / sun.up, north = -height * sun.north / sun.up;
  return { east, north, length: Math.hypot(east, north) };
}
/** Eq. 14 — stereographic projection; north up, east right. */
export function stereographic(altitude, azimuth, radius = 190) {
  const r = radius * tan((90 - altitude) / 2);
  return { x: r * sin(azimuth), y: -r * cos(azimuth) };
}

/** Eq. 15 — mask of a vertical rectangular face seen from a point.
 * The face is perpendicular to bearing B at horizontal distance D, rises H above eye level,
 * and spans lateral offsets x1..x2 (positive = clockwise from B). */
export function faceMask({ bearing = 180, distance = 12, height = 9, offset = 0, width = 30 } = {}, samples = 48) {
  const x1 = offset - width / 2, x2 = offset + width / 2, points = [];
  for (let i = 0; i <= samples; i++) {
    const x = x1 + (x2 - x1) * i / samples;
    points.push({ azimuth: wrap(bearing + Math.atan2(x, distance) / RAD),
      altitude: Math.atan2(Math.max(height, 0), Math.hypot(distance, x)) / RAD });
  }
  return { points, normalAltitude: Math.atan2(Math.max(height, 0), distance) / RAD,
    from: wrap(bearing + Math.atan2(x1, distance) / RAD), to: wrap(bearing + Math.atan2(x2, distance) / RAD) };
}
export function isMasked(sun, face) {
  if (!sun.aboveHorizon || sun.azimuth === null) return false;
  const rel = signed(sun.azimuth - face.bearing);
  if (Math.abs(rel) >= 90) return false;
  const x = face.distance * tan(rel);
  if (x < face.offset - face.width / 2 || x > face.offset + face.width / 2) return false;
  return sun.altitude < Math.atan2(face.height, Math.hypot(face.distance, x)) / RAD;
}
export function directSunHours(latitude, day, face) {
  // Midpoint integration at five-minute resolution; geometry only.
  let clear = 0, blocked = 0, intervals = [], open = null;
  for (let i = 0; i < 288; i++) {
    const h = (i + 0.5) / 12, sun = solarPosition(latitude, day, h);
    const lit = sun.aboveHorizon && !(face && isMasked(sun, face));
    if (sun.aboveHorizon) { if (lit) clear += 1 / 12; else blocked += 1 / 12; }
    if (lit && open === null) open = i / 12;
    if (!lit && open !== null) { intervals.push([open, i / 12]); open = null; }
  }
  if (open !== null) intervals.push([open, 24]);
  return { clear, blocked, intervals };
}

/** Eq. 11 — horizontal sundial: shadow-tip of a vertical peg of length P. */
export function sundialTip(peg, sun) {
  if (!sun.aboveHorizon) return null;
  return { x: -peg * sun.east / sun.up, y: -peg * sun.north / sun.up };
}

export function convexHull(points) {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lower = [], upper = [];
  for (const p of sorted) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...sorted].reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  lower.pop(); upper.pop(); return lower.concat(upper);
}
export function shadowPolygon(rect, height, sun) {
  const shadow = shadowVector(height, sun);
  if (!shadow) return [];
  const p = [{ x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y }, { x: rect.x + rect.w, y: rect.y + rect.d }, { x: rect.x, y: rect.y + rect.d }];
  return convexHull([...p, ...p.map(q => ({ x: q.x + shadow.east, y: q.y + shadow.north }))]);
}
export function polygonsOverlap(a, b) {
  if (a.length < 3 || b.length < 3) return false;
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length], axis = { x: -(q.y - p.y), y: q.x - p.x };
      const project = poly => poly.map(v => v.x * axis.x + v.y * axis.y);
      const aa = project(a), bb = project(b);
      // Contact at an edge has no positive-area overlap.
      if (Math.max(...aa) <= Math.min(...bb) + 1e-9 || Math.max(...bb) <= Math.min(...aa) + 1e-9) return false;
    }
  }
  return true;
}
/** Massing study (default: Ithaca, March 21). The neighbours lie north of the proposed building. */
export function massingStudy(height = 6, gap = 3, solarHour = 12, day = 80, latitude = 42.4) {
  const sun = solarPosition(latitude, day, solarHour);
  const wings = [{ x: -3, y: 0, w: 3, d: 6, h: 3 }, { x: 0, y: 0, w: 3, d: 6, h: height }];
  const neighbors = [-8, 0, 8].map(x => ({ x: x - 3, y: 6 + gap, w: 6, d: 6 }));
  const shadows = wings.map(b => shadowPolygon(b, b.h, sun));
  const rect = n => [{ x: n.x, y: n.y }, { x: n.x + n.w, y: n.y }, { x: n.x + n.w, y: n.y + n.d }, { x: n.x, y: n.y + n.d }];
  const hit = neighbors.map(n => shadows.some(s => polygonsOverlap(s, rect(n))));
  return { sun, wings, neighbors, shadows, hit, clear: !hit.some(Boolean) };
}
export function formatHour(hour) {
  const minutes = wrap(Math.round(hour * 60), 1440);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
