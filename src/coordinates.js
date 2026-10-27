// Figure 1 (Chapter 02): latitude and longitude on a world map, a globe, a meridian section and a
// polar plan. Kept apart from figures.js so the reader bundle can redraw it as the site moves.
import { RAD } from './solar.js';
import { svgDocument } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { LAND } from './world.js';

const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD);

/* 01 · Latitude and longitude. A site is { latitude, longitude, name? } with LONG positive west,
 * as in Eq. 2. One sheet: the world map on the left (the reader takes pointer input over it), the
 * globe top right, and the meridian section and polar plan side by side below the globe; the right
 * column spans the height of the map frame. */
export const COORD_SIZE = { width: 1000, height: 400 };
export const COORD_MAP = { x: 38, y: 30, w: 700, h: 350 };
const hemi = (v, pos, neg) => `${Math.abs(v).toFixed(1)}°${Math.abs(v) < .05 ? '' : ' ' + (v > 0 ? pos : neg)}`;
export const latText = l => hemi(l, 'N', 'S');
export const lonText = l => hemi(l, 'W', 'E');
const ITHACA = { latitude: 42.4, longitude: 76.5, name: 'Ithaca' };

/** Coastline through project(lat, lon) → point | null. Map-edge closures of the rings are skipped. */
function coastline(k, project) {
  let d = '';
  for (const ring of LAND) {
    const pts = [];
    for (let i = 0; i <= ring.length; i += 2) {
      const lon = ring[i % ring.length], lat = ring[i % ring.length + 1];
      if (i && ((Math.abs(lon) === 1800 && lon === ring[i - 2]) || (lat === -900 && ring[i - 1] === -900))) pts.push(null);
      pts.push(project(lat / 10, lon / 10));
    }
    d += k.broken(pts) + ' ';
  }
  return d.trim();
}

/* A: equirectangular world map. LONG runs along the equator from Greenwich, LAT up the site meridian. */
function coordMap(k, site) {
  const c = k.c, M = COORD_MAP, s = M.w / 360, lat = site.latitude, lon = -site.longitude;
  const P = (la, lo) => ({ x: M.x + (lo + 180) * s, y: M.y + (90 - la) * s });
  let g = k.title(2, 18, 'A · World map (equirectangular)') + k.rect(M.x, M.y, M.w, M.h, { fill: c.paper });
  for (let lo = -150; lo < 180; lo += 30) if (lo) g += k.line(P(90, lo), P(-90, lo), { stroke: c.axis, width: .6 });
  for (let la = -60; la <= 60; la += 30) if (la) g += k.line(P(la, -180), P(la, 180), { stroke: c.axis, width: .6 });
  g += k.path(LAND.map(r => k.d(Array.from({ length: r.length / 2 }, (_, i) => P(r[2 * i + 1] / 10, r[2 * i] / 10)), true)).join(' '), { fill: c.fineGrid, stroke: 'none' });
  g += k.path(coastline(k, P), { stroke: c.ink, width: .75 });
  g += k.line(P(0, -180), P(0, 180), { stroke: c.ink, width: 1.2 }) + k.line(P(90, 0), P(-90, 0), { stroke: c.ink, width: 1.2 });
  g += k.rect(M.x, M.y, M.w, M.h, { stroke: c.ink, width: PEN.edge });
  for (let lo = -180; lo <= 180; lo += 60) g += k.text(P(0, lo).x, M.y + M.h + 14, `${Math.abs(lo)}°${lo ? (lo < 0 ? ' W' : ' E') : ''}`, { size: 10.5, anchor: 'middle' });
  for (let la = -90; la <= 90; la += 30) g += k.text(M.x - 6, P(la, 0).y + 4, `${Math.abs(la)}°${la ? (la < 0 ? ' S' : ' N') : ''}`, { size: 10.5, anchor: 'end' });
  g += k.label(M.x + 5, P(0, 0).y - 5, 'Equator', { size: 10 }) + k.label(P(0, 0).x + 5, M.y + 13, 'Greenwich', { size: 10 });
  const at = P(lat, lon), foot = P(0, lon);
  g += k.line(P(0, 0), foot, { stroke: c.azi, width: 2.4 }) + k.line(foot, at, { stroke: c.alt, width: 2.4 });
  if (Math.abs(lon) > 15) g += k.label((P(0, 0).x + foot.x) / 2, foot.y + (lat < 0 ? -7 : 16), `LONG ${lonText(-lon)}`, { size: 11, fill: c.azi, weight: 700, anchor: 'middle' });
  if (Math.abs(lat) > 10) { const right = foot.x < M.x + M.w - 100; g += k.label(foot.x + (right ? 6 : -6), (foot.y + at.y) / 2 + 4, `LAT ${latText(lat)}`, { size: 11, fill: c.alt, weight: 700, anchor: right ? 'start' : 'end' }); }
  // The name goes on the side away from the LAT line.
  const flip = at.x > M.x + M.w - 130, below = at.y < M.y + 28 || (lat < 0 && at.y < M.y + M.h - 28);
  g += k.circle(at, 9, { stroke: c.red, width: 1.4 }) + k.circle(at, 4.5, { fill: c.red });
  g += k.label(at.x + (flip ? -13 : 13), at.y + (below ? 20 : -11), site.name ?? `${latText(lat)}, ${lonText(-lon)}`, { size: 12.5, fill: c.ink, weight: 600, anchor: flip ? 'end' : 'start' });
  return g;
}

/* B: orthographic globe turned toward the site. */
function coordGlobe(k, site) {
  const c = k.c, lat = site.latitude, lon = -site.longitude, name = site.name ?? 'Site';
  const lat0 = Math.max(-50, Math.min(50, lat * .6)), lon0 = lon, R = 98, C = { x: 879, y: COORD_MAP.y + 98 };
  const P = (la, lo) => { const x = cosd(la) * sind(lo - lon0), y = cosd(lat0) * sind(la) - sind(lat0) * cosd(la) * cosd(lo - lon0), z = sind(lat0) * sind(la) + cosd(lat0) * cosd(la) * cosd(lo - lon0); return z >= 0 ? { x: C.x + R * x, y: C.y - R * y } : null; };
  let g = k.title(758, 18, 'B · Globe') + k.circle(C, R, { fill: c.earth, stroke: c.buildingEdge, width: 1.4 });
  for (let la = -75; la <= 75; la += 15) g += k.path(k.broken(Array.from({ length: 181 }, (_, i) => P(la, -180 + i * 2))), { stroke: la === 0 ? c.ink : c.axis, width: la === 0 ? 1.3 : .6 });
  for (let lo = -180; lo < 180; lo += 15) g += k.path(k.broken(Array.from({ length: 91 }, (_, i) => P(-90 + i * 2, lo))), { stroke: lo === 0 ? c.ink : c.axis, width: lo === 0 ? 1.3 : .6 });
  g += k.path(coastline(k, P), { stroke: c.ink, width: .65 });
  const it = P(lat, lon);
  g += k.path(k.broken(Array.from({ length: 50 }, (_, i) => P(lat * i / 49, lon))), { stroke: c.alt, width: 2.2 });
  g += k.path(k.broken(Array.from({ length: 80 }, (_, i) => P(0, lon * i / 79))), { stroke: c.azi, width: 2.2 });
  g += k.circle(it, 4.5, { fill: c.red }) + k.label(it.x + 7, it.y - 6, name, { size: 12, fill: c.ink, weight: 600 });
  // Labels go where they are farthest from the site: the equator on the side away from the LONG arc.
  const eq = P(0, lon0 + (lon > 0 ? 45 : -45));
  const gr = [-45, -30, 15, 30, 45, 60].map(la => P(la, 0)).filter(Boolean).sort((a, b) => Math.hypot(b.x - it.x, b.y - it.y) - Math.hypot(a.x - it.x, a.y - it.y))[0];
  g += (eq ? k.label(eq.x, eq.y + (lat < 0 ? -6 : 14), 'Equator', { size: 10, anchor: 'middle' }) : '') + (gr ? k.label(gr.x + (gr.x > C.x ? -5 : 5), gr.y, 'Greenwich', { size: 10, anchor: gr.x > C.x ? 'end' : 'start' }) : '');
  return g;
}

/* C: meridian section — latitude is an angle at the centre, north–south. */
function coordSection(k, site) {
  const c = k.c, lat = site.latitude, B = { x: 812, y: 304 }, r = 44;
  let g = k.title(758, 246, 'C · Latitude') + k.circle(B, r, { fill: c.earth, stroke: c.buildingEdge, width: 1.3 });
  g += k.line({ x: B.x - r - 10, y: B.y }, { x: B.x + r + 10, y: B.y }, { stroke: c.ink }) + k.line({ x: B.x, y: B.y + r + 6 }, { x: B.x, y: B.y - r - 6 }, { stroke: c.ink });
  const q = { x: B.x + r * cosd(lat), y: B.y - r * sind(lat) };
  g += k.line(B, q, { stroke: c.alt, width: 1.8 }) + k.arc(B.x, B.y, 18, 0, lat, { stroke: c.alt, width: 2.2 }) + k.circle(q, 4, { fill: c.red });
  g += k.text(B.x + 5, B.y - r - 1, 'N', { size: 10, fill: c.ink, weight: 700 }) + k.label(B.x - r + 3, B.y - 4, 'Equator', { size: 9 });
  g += k.text(B.x, COORD_MAP.y + COORD_MAP.h, `LAT = ${latText(lat)}`, { size: 12, fill: c.alt, weight: 700, anchor: 'middle' });
  return g;
}

/* D: polar plan — longitude is an angle at the axis, east–west. Greenwich points down; seen from
 * above the pole, east is counter-clockwise. */
function coordPolar(k, site) {
  const c = k.c, lon = -site.longitude, D = { x: 940, y: 304 }, r = 44;
  const ang = lo => -90 + lo, pt = (lo, rr = r) => ({ x: D.x + rr * cosd(ang(lo)), y: D.y - rr * sind(ang(lo)) });
  let g = k.title(892, 246, 'D · Longitude') + k.circle(D, r, { fill: c.earth, stroke: c.buildingEdge, width: 1.3 });
  g += k.line(D, pt(0, r + 6), { stroke: c.ink }) + k.label(D.x - 4, D.y + r + 6, 'Greenwich 0°', { size: 9, anchor: 'end' });
  g += k.line(D, pt(lon), { stroke: c.azi, width: 1.8 }) + k.arc(D.x, D.y, 18, ang(0), ang(lon), { stroke: c.azi, width: 2.2 }) + k.circle(pt(lon), 4, { fill: c.red });
  g += k.circle(D, 2.5, { fill: c.ink }) + k.label(D.x + (lon > 0 ? -5 : 5), D.y - 6, 'N pole', { size: 9.5, anchor: lon > 0 ? 'end' : 'start' });
  g += k.text(D.x, COORD_MAP.y + COORD_MAP.h, `LONG = ${lonText(-lon)}`, { size: 12, fill: c.azi, weight: 700, anchor: 'middle' });
  return g;
}

export function figCoordinates(standalone = false, site = ITHACA) {
  const k = kit(standalone, 'coord'), title = `Latitude and longitude of ${site.name ?? `${latText(site.latitude)}, ${lonText(site.longitude)}`}`;
  return svgDocument(k, { ...COORD_SIZE, title, className: 'diagram coord-fig',
    body: k.group('map', coordMap(k, site)) + k.group('globe', coordGlobe(k, site)) + k.group('latitude', coordSection(k, site)) + k.group('longitude', coordPolar(k, site)) });
}
