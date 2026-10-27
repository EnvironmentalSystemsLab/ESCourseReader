// Section 03 time-zone dashboard: a world map of standard-time zones and the longitude
// correction for one city. Both drawings take a city from CITIES; the reader redraws them
// when a city is picked, and scripts/generate-solar.mjs writes the Ithaca state as files.
import { svgDocument, f, LINE } from './svg.js';
import { inkKit as kit, PEN } from './ink.js';
import { TZ_ZONES, TZ_LAND } from './world-time-zones.js';

/** Key cities: [id, name, LAT (°N), LONG (°E), standard UTC offset (h), zone name]. */
export const CITIES = [
  ['ithaca', 'Ithaca', 42.4, -76.5, -5, 'Eastern Standard Time'],
  ['honolulu', 'Honolulu', 21.3, -157.9, -10, 'Hawaii Standard Time'],
  ['los-angeles', 'Los Angeles', 34.1, -118.2, -8, 'Pacific Standard Time'],
  ['denver', 'Denver', 39.7, -105.0, -7, 'Mountain Standard Time'],
  ['chicago', 'Chicago', 41.9, -87.6, -6, 'Central Standard Time'],
  ['mexico-city', 'Mexico City', 19.4, -99.1, -6, 'Central Standard Time'],
  ['new-york', 'New York', 40.7, -74.0, -5, 'Eastern Standard Time'],
  ['st-johns', "St. John's", 47.6, -52.7, -3.5, 'Newfoundland Standard Time'],
  ['buenos-aires', 'Buenos Aires', -34.6, -58.4, -3, 'Argentina Time'],
  ['sao-paulo', 'São Paulo', -23.6, -46.6, -3, 'Brasília Time'],
  ['reykjavik', 'Reykjavík', 64.1, -21.9, 0, 'Greenwich Mean Time'],
  ['london', 'London', 51.5, -0.1, 0, 'Greenwich Mean Time'],
  ['madrid', 'Madrid', 40.4, -3.7, 1, 'Central European Time'],
  ['karlsruhe', 'Karlsruhe', 49.0, 8.4, 1, 'Central European Time'],
  ['frankfurt', 'Frankfurt', 50.1, 8.7, 1, 'Central European Time'],
  ['berlin', 'Berlin', 52.5, 13.4, 1, 'Central European Time'],
  ['lagos', 'Lagos', 6.5, 3.4, 1, 'West Africa Time'],
  ['cairo', 'Cairo', 30.0, 31.2, 2, 'Eastern European Time'],
  ['istanbul', 'Istanbul', 41.0, 29.0, 3, 'Turkey Time'],
  ['moscow', 'Moscow', 55.8, 37.6, 3, 'Moscow Time'],
  ['nairobi', 'Nairobi', -1.3, 36.8, 3, 'East Africa Time'],
  ['tehran', 'Tehran', 35.7, 51.4, 3.5, 'Iran Standard Time'],
  ['dubai', 'Dubai', 25.2, 55.3, 4, 'Gulf Standard Time'],
  ['mumbai', 'Mumbai', 19.1, 72.9, 5.5, 'India Standard Time'],
  ['kathmandu', 'Kathmandu', 27.7, 85.3, 5.75, 'Nepal Time'],
  ['urumqi', 'Ürümqi', 43.8, 87.6, 8, 'China Standard Time'],
  ['singapore', 'Singapore', 1.3, 103.8, 8, 'Singapore Time'],
  ['beijing', 'Beijing', 39.9, 116.4, 8, 'China Standard Time'],
  ['tokyo', 'Tokyo', 35.7, 139.7, 9, 'Japan Standard Time'],
  ['adelaide', 'Adelaide', -34.9, 138.6, 9.5, 'Australian Central Standard Time'],
  ['sydney', 'Sydney', -33.9, 151.2, 10, 'Australian Eastern Standard Time'],
  ['auckland', 'Auckland', -36.8, 174.8, 12, 'New Zealand Standard Time'],
].map(([id, name, latitude, longitude, offset, zone]) => ({ id, name, latitude, longitude, offset, zone }));
export const cityById = id => CITIES.find(c => c.id === id) ?? CITIES[0];

/** UTC offset as −5, +5:30, ±0. */
export const utc = off => off ? `${off < 0 ? '−' : '+'}${Math.trunc(Math.abs(off))}${off % 1 ? `:${String(Math.round(Math.abs(off) % 1 * 60)).padStart(2, '0')}` : ''}` : '±0';
/** Longitude with hemisphere: −76.5 → 76.5° W. */
export const lonEW = lon => { lon = ((lon + 540) % 360 + 360) % 360 - 180; return `${f(Math.abs(lon))}°${lon && Math.abs(lon) !== 180 ? (lon < 0 ? ' W' : ' E') : ''}`; };
/** Longitude correction for a city (Eq. 2, minutes): T_solar − T_standard before EOT. */
export const longitudeCorrection = city => 4 * (city.longitude - 15 * city.offset);

/** Map frame in drawing units (plate carrée), shared with the reader's click handling. */
export const TZ_MAP = { x0: 30, x1: 870, top: 78, bottom: -56, y0: 40 };

/* World map of standard-time zones (plate carrée, so meridians are evenly spaced verticals) */
/** compact: the in-page version, with the explanatory line moved to the calculation panel. */
export function figWorldTimeZones(standalone = false, city = CITIES[0], { compact = false } = {}) {
  const k = kit(standalone, 'wtz'), c = k.c;
  const { x0, x1, top, bottom, y0 } = TZ_MAP, s = (x1 - x0) / 360;
  const X = lon => x0 + (lon + 180) * s, Y = lat => y0 + (top - lat) * s, yB = Y(bottom);
  const g1 = v => (Math.round(v * 10) / 10).toString();
  const ring = r => { let d = ''; for (let i = 0; i < r.length; i += 2) d += `${i ? 'L' : 'M'}${g1(X(r[i] / 10))},${g1(Y(r[i + 1] / 10))}`; return d + 'Z'; };
  const fillFor = off => off === city.offset ? c.directSun : off % 1 ? k.H.screen : Math.abs(off) % 2 ? c.side : c.ground;
  const raw = (d, fill) => `<path d="${d}" fill="${fill}" fill-rule="evenodd" stroke="${c.paper}" stroke-width="${LINE.hair}" stroke-linejoin="round"/>`;
  // Nominal zones: 15° bands centred on the standard meridians, alternately tinted over the sea.
  let bands = '';
  for (let n = -12; n <= 12; n++) {
    const w = Math.max(-180, n * 15 - 7.5), e = Math.min(180, n * 15 + 7.5), own = n === city.offset;
    if (n % 2) bands += `<rect x="${f(X(w))}" y="${f(y0)}" width="${f(X(e) - X(w))}" height="${f(yB - y0)}" fill="${c.interior}"/>`;
    bands += k.text(X(n * 15), y0 - 8, n ? utc(n) : '0', { size: 10, anchor: 'middle', fill: own ? c.alt : c.ink, weight: own ? 700 : 400 });
  }
  bands += k.text(x0, y0 - 24, 'NOMINAL ZONE (UTC OFFSET OF THE STANDARD MERIDIAN)', { size: 9, spacing: .8 });
  // Actual zones on land: whole-hour zones alternate two tints; half- and quarter-hour zones are
  // hatched; the selected city's zone is highlighted.
  let land = '';
  for (const [off, rings] of TZ_ZONES) {
    const d = rings.map(ring).join('');
    land += off % 1 && off !== city.offset ? raw(d, c.side) + raw(d, fillFor(off)) : raw(d, fillFor(off));
  }
  const coast = `<path d="${TZ_LAND.map(ring).join('')}" fill="none" stroke="${c.buildingEdge}" stroke-width="${LINE.hair}" stroke-linejoin="round"/>`;
  // Graticule: zone edges (±7.5°) in pencil, Greenwich dashed in ink.
  let grid = '';
  for (let n = -11; n <= 12; n++) grid += k.line({ x: X(n * 15 - 7.5), y: y0 }, { x: X(n * 15 - 7.5), y: yB }, { stroke: c.axis, width: .5 });
  for (let lon = -180; lon <= 180; lon += 30) {
    grid += k.line({ x: X(lon), y: yB }, { x: X(lon), y: yB + 5 }, { stroke: c.axis });
    grid += k.text(X(lon), yB + 17, lon ? lonEW(lon) : '0°', { size: 10, anchor: 'middle' });
  }
  for (const lat of [-30, 0, 30, 60]) grid += k.line({ x: x0, y: Y(lat) }, { x: x1, y: Y(lat) }, { stroke: c.axis, width: .4, dash: '2 3' }) + k.text(x0 - 4, Y(lat) + 3, `${Math.abs(lat)}°${lat ? (lat > 0 ? 'N' : 'S') : ''}`, { size: 9, anchor: 'end' });
  grid += k.rect(x0, y0, x1 - x0, yB - y0, { stroke: c.ink, width: PEN.edge });
  grid += k.line({ x: X(0), y: y0 }, { x: X(0), y: yB }, { stroke: c.ink, width: .8, dash: '6 4' });
  // The city on its zone's standard meridian. Notes near the city are left out so labels do not collide.
  const p = { x: X(city.longitude), y: Y(city.latitude) }, std = 15 * city.offset, right = city.longitude < -120;
  let marks = k.line({ x: X(std), y: y0 }, { x: X(std), y: yB }, { stroke: c.alt, width: 1.4, dash: '6 4' });
  marks += k.circle(p, 4, { fill: c.red, stroke: c.paper, width: 1 }) + k.label(p.x + (right ? 8 : -8), p.y - 6, `${city.name} · UTC${utc(city.offset)} · ${lonEW(std)}`, { size: 11, fill: c.red, anchor: right ? 'start' : 'end', weight: 600 });
  const notes = [[103, 31, 'China: one zone, UTC+8,'], [103, 26.5, 'over ~60° of longitude'], [78, 16, 'India +5:30', 'end'], [-4, 46, 'Spain, France: UTC+1', 'end'], [-178, -24, 'Date line: −12 / +12', 'start']];
  for (const [lon, lat, text, anchor = 'middle'] of notes) {
    const x = X(lon), w = text.length * 5.2, from = anchor === 'end' ? x - w : anchor === 'start' ? x : x - w / 2, to = from + w;
    const labelFrom = right ? p.x : p.x - 230, labelTo = right ? p.x + 230 : p.x;
    if (Math.abs(Y(lat) - p.y) < 28 && to > Math.min(labelFrom, p.x - 10) && from < Math.max(labelTo, p.x + 10)) continue;
    marks += k.label(x, Y(lat), text, { size: 10, fill: c.ink, anchor });
  }
  // Legend.
  const ly = yB + 38, sw = (x, fill, text) => `<rect x="${x}" y="${ly - 9}" width="16" height="11" fill="${fill}" stroke="${c.axis}" stroke-width="${LINE.hair}"/>` + k.text(x + 22, ly, text, { size: 11 });
  let legend = sw(x0, c.ground, 'Even-hour zone') + sw(x0 + 130, c.side, 'Odd-hour zone') + sw(x0 + 255, c.directSun, `UTC${utc(city.offset)} (${city.name})`);
  legend += `<rect x="${x0 + 410}" y="${ly - 9}" width="16" height="11" fill="${c.side}"/><rect x="${x0 + 410}" y="${ly - 9}" width="16" height="11" fill="${k.H.screen}" stroke="${c.axis}" stroke-width="${LINE.hair}"/>` + k.text(x0 + 432, ly, 'Half- or quarter-hour offset', { size: 11 });
  legend += k.line({ x: x0 + 610, y: ly - 4 }, { x: x0 + 626, y: ly - 4 }, { stroke: c.axis, width: .5 }) + k.text(x0 + 632, ly, 'Nominal edge, meridian ± 7.5°', { size: 11 });
  if (!compact) legend += k.text(x0, ly + 22, 'Standard time on land; daylight saving not shown. Zone borders follow countries and states, not the 15° bands.', { size: 11 });
  legend += k.text(x0, ly + (compact ? 18 : 38), 'Boundaries: timezone-boundary-builder 2026e, © OpenStreetMap contributors (ODbL). Land: Natural Earth. Offsets: IANA tz database.', { size: 9 });
  return svgDocument(k, { width: 900, height: yB + (compact ? 64 : 84), title: `World map of standard-time zones, ${city.name} UTC${utc(city.offset)}`, body: k.group('bands', bands) + k.group('zones', land) + k.group('coast', coast) + k.group('grid', grid) + k.group('city', marks) + k.group('legend', legend) });
}

/* Longitude correction: the city between the nominal 15° zones, and 4 minutes per degree */
/** Sentences explaining the correction; drawn below the standalone figure, shown beside the in-page one. */
export function correctionText(city) {
  const std = 15 * city.offset, delta = city.longitude - std, min = longitudeCorrection(city), first = delta < 0 ? lonEW(std) : `${city.name}’s meridian`;
  return [Math.abs(min) < .5 ? `${city.name} lies on its standard meridian: solar time equals standard time (before EOT).`
    : `The sun crosses ${first} first. ${city.name} solar time is ${f(Math.abs(min))} min ${min < 0 ? 'behind' : 'ahead of'} UTC${utc(city.offset)} (before EOT).`,
    Math.abs(delta) > 7.5 ? `${city.name} lies outside its zone’s nominal band (${lonEW(std)} ± 7.5°): the border follows politics, not the meridian.` : '360° in 24 h → 15° per hour → 4 minutes per degree of longitude.'];
}

export function figTimeZones(standalone = false, city = CITIES[0], { compact = false } = {}) {
  const k = kit(standalone, 'tz'), c = k.c, lon = city.longitude, std = 15 * city.offset, delta = lon - std, min = longitudeCorrection(city);
  // A window around the city and its standard meridian, at least 60° wide.
  const mid = (lon + std) / 2, half = Math.max(30, Math.abs(delta) / 2 + 14), w0 = mid - half, w1 = mid + half;
  const y0 = compact ? 34 : 70, y1 = compact ? 140 : 230, X = l => 60 + (l - w0) / (w1 - w0) * 780;
  const clip = (a, b) => [Math.max(a, w0), Math.min(b, w1)];
  let g = '';
  // Nominal zones on the integer meridians; the city's own zone (std ± 7.5°) is tinted.
  for (let n = Math.ceil((w0 - 7.5) / 15); n * 15 - 7.5 < w1; n++) {
    const [a, b] = clip(n * 15 - 7.5, n * 15 + 7.5);
    g += k.rect(X(a), y0, X(b) - X(a), y1 - y0, { stroke: c.grid });
    if (n * 15 >= w0 && n * 15 <= w1) {
      g += k.line({ x: X(n * 15), y: y0 }, { x: X(n * 15), y: y1 }, { stroke: c.ink, width: 1.4, dash: '6 4' });
      if (b - a > 11) g += k.text(X(n * 15), y0 - 12, `UTC${utc(n > 12 ? n - 24 : n < -12 ? n + 24 : n)} · ${lonEW(n * 15)}`, { size: 11, anchor: 'middle', fill: n === city.offset ? c.alt : c.ink, weight: n === city.offset ? 700 : 400 });
    }
  }
  const [a, b] = clip(std - 7.5, std + 7.5);
  g = `<rect x="${f(X(a))}" y="${y0}" width="${f(X(b) - X(a))}" height="${y1 - y0}" fill="${c.directSun}" fill-opacity="0.35"/>` + g;
  if (city.offset % 1) g += k.line({ x: X(std), y: y0 }, { x: X(std), y: y1 }, { stroke: c.alt, width: 1.4, dash: '6 4' }) + k.text(X(std), y0 - 12, `UTC${utc(city.offset)} · ${lonEW(std)}`, { size: 11, anchor: 'middle', fill: c.alt, weight: 700 });
  const step = half > 45 ? 10 : 5;
  for (let l = Math.ceil(w0 / step) * step; l <= w1; l += step) g += k.line({ x: X(l), y: y1 }, { x: X(l), y: y1 + 6 }, { stroke: c.axis }) + k.text(X(l), y1 + 20, lonEW(l), { size: 10, anchor: 'middle' });
  // The city's meridian and the correction to its standard meridian.
  const right = delta < 0;
  g += k.line({ x: X(lon), y: y0 + 20 }, { x: X(lon), y: y1 }, { stroke: c.red, width: 2 }) + k.label(X(lon) + (right ? -6 : 6), y0 + 36, `${city.name} ${lonEW(lon)}`, { size: 12, fill: c.red, anchor: right ? 'end' : 'start', weight: 600 });
  if (Math.abs(delta) > .05) g += k.line({ x: X(lon), y: y1 - 50 }, { x: X(std), y: y1 - 50 }, { stroke: c.alt, width: 2, arrow: 'alt' });
  g += k.label((X(lon) + X(std)) / 2, y1 - 30, `${f(Math.abs(delta))}° × 4 min/° = ${f(Math.abs(min))} min`, { size: 12, fill: c.alt, anchor: 'middle', weight: 700 });
  if (!compact) { const [one, two] = correctionText(city); g += k.text(60, 285, one, { size: 12 }) + k.text(60, 305, two, { size: 12, fill: c.ink, weight: 600 }); }
  return svgDocument(k, { width: 900, height: compact ? y1 + 30 : 320, title: `Longitude correction for ${city.name}: ${f(Math.abs(delta))}° from the ${lonEW(std)} standard meridian`, body: k.group('zones', g) });
}
