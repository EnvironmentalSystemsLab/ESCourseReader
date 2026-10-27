import { RAD, wrap, solarPosition, eotAngle, equationOfTime, noonAltitude, sunsetHourAngle, calendarDate, dayOfYear, clockToSolar, shadowAngles, shadeWindow, deviceVSA, deviceHSA, sundialTip, shadowVector, faceMask, isMasked, directSunHours, massingStudy, formatHour, declination } from './solar.js';
import { drawSky, drawOrbit, drawMeridian, drawDeclination, drawEot, drawAnalemma, drawSunVector, drawSundial, drawSunPath, drawCylindrical, drawMaskScene, drawProfileAxo, drawDevice, drawPoleShadow, drawMassing } from './diagrams.js';
import { solarQuizQuestions, shadingQuizQuestions } from './quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';
import { calc, host, LAT, DAY, HOUR, DAY_PLAY, range, latLabel, mount, update, stop, wireExports } from './labs.js';
import { figCoordinates, COORD_MAP, COORD_SIZE } from './coordinates.js';
import { CITIES, cityById, utc, lonEW, longitudeCorrection, correctionText, TZ_MAP, figWorldTimeZones, figTimeZones } from './timezones.js';

const $ = id => document.getElementById(id);
const text = (id, value) => { const el = $(id); if (el) el.textContent = value; };
const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD), tand = d => Math.tan(d * RAD);
const n = (x, d = 2) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const dg = (x, d = 1) => `${n(x, d)}°`;
// Longitudes are positive west, as in Eq. 2. Singapore keeps UTC+8 (120° E), so its clock runs about an hour ahead of the sun.
const lonLabel = l => `${Math.abs(l).toFixed(1)}°${l === 0 ? '' : l > 0 ? ' W' : ' E'}`;
const ANALEMMA_SITES = [['Ithaca, NY', 42.4, 76.5, 75], ['Phoenix, AZ', 33.4, 112.1, 105], ['Singapore', 1.3, -103.8, -120], ['Sydney', -33.9, -151.2, -150], ['Tromsø', 69.7, -19.0, -15]]
  .map(([name, latitude, longitude, meridian]) => [name, { latitude, longitude, meridian }]);
// Figure 1 locations: the key cities of the time-zone lab (CITIES has LONG positive east).
const COORD_SITES = CITIES.map(c => [`${c.name} · ${latLabel(c.latitude)}, ${lonEW(c.longitude)}`, { latitude: c.latitude, longitude: -c.longitude || 0 }, c.name]);
const analemmaSite = st => ({ latitude: st.latitude, longitude: st.longitude, standardMeridian: st.meridian });
const WINDOW = { height: 1.5, width: 1.2, gap: 0.3 };
const ORIENTATIONS = [[180, 'South · 180°'], [135, 'South-east · 135°'], [225, 'South-west · 225°'], [90, 'East · 90°'], [270, 'West · 270°'], [0, 'North · 0°']];
const sunOf = st => solarPosition(st.latitude, st.day, st.hour);
const dims = st => ({ ...WINDOW, depth: st.depth, fin: st.fin });

/* ── Labs ──────────────────────────────────────────────────────────────── */

function renderNoonCalc(st) {
  const L = st.latitude, d = declination(st.day), k = 360 / 365 * (284 + st.day), alt = noonAltitude(L, d);
  calc('calc-noon', [
    ['NDY', calendarDate(st.day), String(st.day)],
    ['DEC', `23.45 × sin[0.9863 × (284 + ${st.day})] = 23.45 × sin(${n(wrap(k), 1)}°)`, dg(d, 2), 'key'],
    ['ALT<sub>noon</sub>', `90° − |${n(L, 1)}° − (${n(d, 2)}°)|`, alt > 0 ? dg(alt) : `${dg(alt)} (below horizon)`, 'key'],
    ['ZEN<sub>noon</sub>', `|LAT − DEC|`, dg(Math.abs(L - d))],
    ['Noon sun', '', Math.abs(L - d) < 0.05 ? 'zenith' : L > d ? 'due south' : 'due north'],
  ]);
}

function renderAltAzCalc(st, sun) {
  const L = st.latitude, d = sun.declination, h = sun.hourAngle, k = 360 / 365 * (284 + st.day);
  const a = sind(d) * sind(L), b = cosd(d) * cosd(L) * cosd(h);
  const rows = [
    ['DEC', `23.45 × sin(${n(wrap(k), 1)}°)`, dg(d, 2)],
    ['HRA', `15 × (${n(st.hour, 2)} − 12)`, dg(h, 1)],
    '—',
    ['sin ALT', `sin ${n(d, 2)}° · sin ${n(L, 1)}° + cos ${n(d, 2)}° · cos ${n(L, 1)}° · cos ${n(h, 1)}°<br>= ${n(a, 4)} + ${n(b, 4)}`, n(a + b, 4)],
    ['ALT', `arcsin(${n(a + b, 4)})`, dg(sun.altitude, 2), 'key'],
  ];
  if (sun.azimuth !== null && Math.abs(sun.altitude) < 89.99) {
    const p = cosd(L) * sind(d), q = cosd(d) * sind(L) * cosd(h), ca = cosd(sun.altitude);
    rows.push('—', ['cos AZI′', `(cos ${n(L, 1)}° · sin ${n(d, 2)}° − cos ${n(d, 2)}° · sin ${n(L, 1)}° · cos ${n(h, 1)}°) / cos ${n(sun.altitude, 2)}°<br>= (${n(p, 4)} − ${n(q, 4)}) / ${n(ca, 4)}`, n(sun.cosAzimuth, 4)]);
    rows.push(['AZI′', `arccos(${n(sun.cosAzimuth, 4)})`, dg(sun.arccosAzimuth, 2)]);
    rows.push(['AZI', h > 0 ? `HRA > 0 (afternoon): 360° − ${n(sun.arccosAzimuth, 2)}°` : 'HRA ≤ 0 (morning): AZI = AZI′', dg(sun.azimuth, 2), 'key']);
  } else rows.push(['AZI', 'sun at the zenith', 'undefined', 'key']);
  if (!sun.aboveHorizon) rows.push(['', 'ALT < 0: sun below the horizon', '', 'warn']);
  calc('calc-altaz', rows);
}

function renderDayLength(st) {
  const L = st.latitude, d = declination(st.day), ss = sunsetHourAngle(L, d);
  calc('calc-day', [
    ['DEC', calendarDate(st.day), dg(d, 2)],
    ['−tan LAT · tan DEC', `−tan ${n(L, 1)}° · tan ${n(d, 2)}°`, n(ss.q, 4)],
    ['HRA<sub>ss</sub>', ss.polar ? (ss.polar === 'day' ? 'value < −1: sun does not set' : 'value > 1: sun does not rise') : `arccos(${n(ss.q, 4)})`, dg(ss.hra, 2)],
    ['Day length', `2 × ${n(ss.hra, 2)}° / 15°`, `${n(2 * ss.hra / 15, 2)} h`, 'key'],
    ['Sunrise / sunset', ss.polar ? '' : `12:00 ∓ ${n(ss.hra / 15, 2)} h`, ss.polar ? (ss.polar === 'day' ? 'polar day' : 'polar night') : `${formatHour(12 - ss.hra / 15)} / ${formatHour(12 + ss.hra / 15)} solar`],
  ]);
}

function renderSundial(st) {
  const sun = sunOf(st);
  host('d-sundial', drawSundial(st.latitude, sun));
  if (!sun.aboveHorizon) { calc('calc-sundial', [['', 'Sun below the horizon: no shadow', '', 'warn']]); return; }
  const t = sundialTip(25, sun), L = 25 / tand(sun.altitude);
  calc('calc-sundial', [
    ['ALT', '', dg(sun.altitude)],
    ['L', `25 mm / tan ${n(sun.altitude, 1)}°`, `${n(L, 1)} mm`, 'key'],
    ['Direction', `AZI + 180° = ${n(sun.azimuth ?? 0, 1)}° + 180°`, dg(wrap((sun.azimuth ?? 0) + 180))],
    ['x<sub>E</sub>, y<sub>N</sub>', '', `${n(t.x, 1)}, ${n(t.y, 1)} mm`],
  ]);
}

function renderSunPath(st) {
  const sun = sunOf(st);
  host('d-sunpath', drawSunPath(st, { construction: st.construction }));
  if (!sun.aboveHorizon) { calc('calc-sunpath', [['', 'Sun below the horizon', '', 'warn']]); return; }
  const r = Math.tan((90 - sun.altitude) / 2 * RAD);
  calc('calc-sunpath', [['ALT', '', dg(sun.altitude)], ['AZI', '', sun.azimuth === null ? '—' : dg(sun.azimuth)], ['r / R', `tan((90° − ${n(sun.altitude, 1)}°) / 2)`, n(r, 3), 'key']]);
}

function renderMask(st) {
  const sun = sunOf(st), face = { bearing: st.bearing, height: st.height, distance: st.distance, width: st.width, offset: st.offset };
  host('d-maskscene', drawMaskScene(face, st));
  host('d-maskchart', drawSunPath(st, { face, prefix: 'spm' }));
  const m = faceMask(face), blocked = isMasked(sun, face);
  calc('calc-mask', [
    ['ALT<sub>obs</sub>', `arctan(${n(face.height, 1)} / ${n(face.distance, 1)})`, dg(m.normalAltitude), 'key'],
    ['AZI range', 'ends of the building', `${n(m.from, 0)}° – ${n(m.to, 0)}°`],
    ['Sun now', sun.aboveHorizon ? `ALT ${n(sun.altitude, 1)}°, AZI ${n(sun.azimuth ?? 0, 1)}°` : '', !sun.aboveHorizon ? 'below horizon' : blocked ? 'blocked' : 'visible', blocked ? 'warn' : ''],
  ]);
  const today = directSunHours(st.latitude, st.day, face), open = directSunHours(st.latitude, st.day, null);
  text('mask-hours', `${today.clear.toFixed(1)} h`);
  text('mask-intervals', `Unobstructed horizon: ${open.clear.toFixed(1)} h. Sunlit periods: ${today.intervals.length ? today.intervals.map(([a, b]) => `${formatHour(a)}–${formatHour(b)}`).join(', ') : 'none'} (solar time).`);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  $('mask-year').innerHTML = '<p class="small-label">21ST OF EACH MONTH · HOURS</p>' + months.map((m, i) => { const r = directSunHours(st.latitude, dayOfYear(i + 1, 21), face), o = directSunHours(st.latitude, dayOfYear(i + 1, 21), null); return `<div class="bar-row"><span>${m}</span><span class="bar"><i style="width:${(o.clear / 24 * 100).toFixed(1)}%"></i><b style="width:${(r.clear / 24 * 100).toFixed(1)}%"></b></span><span>${r.clear.toFixed(1)}</span></div>`; }).join('');
}

function renderProfile(st) {
  const sun = sunOf(st), r = shadeWindow(sun, st.ori, dims(st)), a = shadowAngles(sun, st.ori);
  host('d-profile', drawProfileAxo(sun, st.ori, dims(st)));
  host('d-device', drawDevice(sun, st.ori, dims(st)));
  if (!sun.aboveHorizon) { calc('calc-profile', [['', 'Sun below the horizon', '', 'warn']]); return; }
  const rows = [
    ['AZI, ALT', '', `${dg(sun.azimuth ?? 0)}, ${dg(sun.altitude)}`],
    ['HSA', `${n(sun.azimuth ?? 0, 1)}° − ${st.ori}°`, dg(a.hsa), 'key'],
    ['INC', `arccos(cos ${n(sun.altitude, 1)}° · cos ${n(a.hsa, 1)}°)`, dg(a.inc)],
  ];
  if (!a.onFacade) rows.push(['', '|HSA| ≥ 90°: sun behind the facade, no direct sun', '', 'warn']);
  else {
    rows.push(['VSA', `arctan(tan ${n(sun.altitude, 1)}° / cos ${n(a.hsa, 1)}°) = arctan(${n(tand(sun.altitude), 3)} / ${n(cosd(a.hsa), 3)})`, dg(a.vsa), 'key']);
    rows.push('—');
    rows.push(['Shadow drop', `D · tan VSA = ${st.depth.toFixed(2)} × ${n(tand(a.vsa), 3)}`, `${n(r.drop, 2)} m`]);
    rows.push(['Shaded height', `clamp(${n(r.drop, 2)} − ${WINDOW.gap}, 0, ${WINDOW.height})`, `${n(r.shadedHeight, 2)} m`]);
    rows.push(['D for full shade', `(H + G) / tan VSA = ${(WINDOW.height + WINDOW.gap).toFixed(1)} / ${n(tand(a.vsa), 3)}`, `${n((WINDOW.height + WINDOW.gap) / tand(a.vsa), 2)} m`]);
    if (Math.abs(a.hsa) > 0.5) {
      rows.push(['Fin shade width', `d · tan|HSA| = ${st.fin.toFixed(2)} × ${n(Math.abs(tand(a.hsa)), 3)}`, `${n(r.shadedWidth, 2)} m`]);
      rows.push(['d for full shade', `w / tan|HSA| = ${WINDOW.width} / ${n(Math.abs(tand(a.hsa)), 3)}`, `${n(WINDOW.width / Math.abs(tand(a.hsa)), 2)} m`]);
    }
    rows.push(['Window shaded', '1 − (H − h<sub>s</sub>)(w − w<sub>s</sub>) / (H·w)', `${Math.round(r.fraction * 100)} %`, 'key']);
  }
  calc('calc-profile', rows);
}

function renderDeviceMask(st) {
  const dv = deviceVSA(st.depth, WINDOW.height, WINDOW.gap), dh = deviceHSA(st.fin, WINDOW.width);
  host('d-devicemask', drawSunPath(st, { prefix: 'spd', device: { orientation: st.ori, vsa: dv, hsa: dh } }));
  text('dev-vsa', st.depth > 0 ? `arctan(${(WINDOW.height + WINDOW.gap).toFixed(1)} / ${st.depth.toFixed(2)}) = ${dg(dv)}` : 'no overhang');
  text('dev-hsa', st.fin > 0 ? `arctan(${WINDOW.width} / ${st.fin.toFixed(2)}) = ${dg(dh)}` : 'no fins');
  text('dev-eq20', `90° − ${Math.abs(st.latitude).toFixed(1)}° = ${dg(90 - Math.abs(st.latitude))}`);
}

function renderPole(st) {
  const sun = sunOf(st), s = shadowVector(3, sun);
  host('d-pole', drawPoleShadow(sun));
  calc('calc-pole', s ? [
    ['L', `3 m / tan ${n(sun.altitude, 1)}°`, s.length > 999 ? '> 999 m' : `${n(s.length, 2)} m`, 'key'],
    ['Direction', `${n(sun.azimuth ?? 0, 1)}° + 180°`, dg(wrap((sun.azimuth ?? 0) + 180))],
    ['Δx<sub>E</sub>, Δy<sub>N</sub>', `−L sin AZI, −L cos AZI`, `${n(s.east, 2)} m, ${n(s.north, 2)} m`],
  ] : [['', 'Sun below the horizon: no shadow', '', 'warn']]);
}

function renderMassing(st) {
  host('d-massing', drawMassing(st));
  const results = [10, 11, 12, 13, 14].map(hour => ({ hour, ...massingStudy(st.height, st.gap, hour, st.day, st.latitude) }));
  text('clear-count', `${results.filter(x => x.clear).length} / 5`);
  $('massing-checks').innerHTML = results.map(r => `<div class="${r.clear ? 'clear' : 'overlap'}"><strong>${formatHour(r.hour)}</strong><span>${r.clear ? '✓ Clear' : '× Overlap'}</span></div>`).join('');
}

/* One latitude and date drive orbit, EOT, DEC and the noon meridian section together. */
const DASHBOARD = { orbit: (st, o) => drawOrbit(st.day, o), eot: (st, o) => drawEot(st.day, o), declination: (st, o) => drawDeclination(st.day, o), meridian: (st, o) => drawMeridian(st.latitude, st.day, o) };
function renderDashboard(st) {
  for (const [name, draw] of Object.entries(DASHBOARD)) host(`d-dash-${name}`, draw(st));
  const L = st.latitude, d = declination(st.day), eot = equationOfTime(st.day), ss = sunsetHourAngle(L, d), alt = noonAltitude(L, d);
  // Solar noon on the Ithaca clock: T_standard = 12:00 − 4 (LONG_std − LONG_site) − EOT, with 75° and 76.5° W (Eq. 2).
  const clock = 12 + (6 - eot) / 60;
  calc('calc-dash', [
    ['NDY', calendarDate(st.day), String(st.day)],
    ['DEC', 'Eq. 4', dg(d, 2), 'key'],
    ['EOT', 'Eq. 3', `${n(eot, 1)} min`, 'key'],
    '—',
    ['ALT<sub>noon</sub>', `90° − |${n(L, 1)}° − (${n(d, 2)}°)|`, alt > 0 ? dg(alt) : `${dg(alt)} (below horizon)`, 'key'],
    ['Day length', 'Eq. 9', ss.polar ? (ss.polar === 'day' ? 'polar day' : 'polar night') : `${n(2 * ss.hra / 15, 2)} h`],
    ['Noon, Ithaca', '12:00 solar + 6 min − EOT', `${formatHour(clock)} EST`],
  ]);
}

/* Section 03: one city drives the time-zone map, the longitude correction and Eq. 2 without EOT. */
function renderTimeZones(st) {
  const city = cityById(st.city), min = longitudeCorrection(city), stdW = -15 * city.offset, siteW = -city.longitude;
  const par = v => v < 0 ? `(${n(v, 1)})` : n(v, 1);
  host('d-tz-map', figWorldTimeZones(false, city, { compact: true }));
  host('d-tz-zones', figTimeZones(false, city, { compact: true }));
  const note = $('tz-note'); if (note) note.innerHTML = [...correctionText(city), 'Map: standard time on land; daylight saving is not shown. Zone borders follow countries and states, not the 15° bands.'].map(t => `<p>${t}</p>`).join('');
  calc('calc-tz', [
    ['City', city.name, `${latLabel(city.latitude)} · ${lonEW(city.longitude)}`],
    ['Zone', city.zone, `UTC${utc(city.offset)}`],
    ['LONG<sub>standard</sub>', `15° × ${utc(city.offset)} h`, lonEW(-stdW), 'key'],
    ['LONG<sub>site</sub>', `${n(Math.abs(stdW - siteW), 1)}° ${siteW > stdW ? 'W' : 'E'} of it`, lonEW(city.longitude)],
    '—',
    ['ΔT', `4 × (${par(stdW)} − ${par(siteW)})`, `${n(min, 1)} min`, 'key'],
    ['Solar noon', '12:00 − ΔT', `${formatHour(12 - min / 60)}`, 'key'],
  ]);
}

const metres = (d = 1) => v => `${Number(v).toFixed(d)} m`;
const coordSite = st => ({ ...st, name: COORD_SITES.find(([, s]) => Math.abs(s.latitude - st.latitude) < .05 && Math.abs(s.longitude - st.longitude) < .05)?.[2] });
const LABS = [
  { id: 'coordinates', state: { latitude: 42.4, longitude: 76.5 },
    inputs: [{ type: 'places', label: 'Location', places: COORD_SITES }, { type: 'coord', key: 'latitude', label: 'Latitude LAT' }, { type: 'coord', key: 'longitude', label: 'Longitude LONG' }],
    render: st => {
      const plate = $('fig-coordinates')?.querySelector('.fig-plate'), M = COORD_MAP, W = COORD_SIZE.width, H = COORD_SIZE.height, pc = (v, of) => `${(v / of * 100).toFixed(3)}%`;
      // Pointer and touch input reach the map through a layer over it, so the rest of the figure still scrolls on touch screens.
      if (plate) plate.innerHTML = `<div class="coord-stage">${figCoordinates(false, coordSite(st))}<div class="coord-hit" style="left:${pc(M.x, W)};top:${pc(M.y, H)};width:${pc(M.w, W)};height:${pc(M.h, H)}"></div></div>`;
    },
    save: st => figCoordinates(true, coordSite(st)) },
  { id: 'timezones', state: { city: 'ithaca' },
    inputs: [{ type: 'select', key: 'city', label: 'City', options: CITIES.map(c => [c.id, `${c.name} · UTC${utc(c.offset)}`]) },
      { type: 'presets', label: 'FAR FROM THEIR STANDARD MERIDIAN', buttons: ['madrid', 'reykjavik', 'urumqi', 'buenos-aires', 'kathmandu'].map(id => [cityById(id).name, { city: id }]) }],
    render: renderTimeZones, save: (st, name) => (name === 'tz-map' ? figWorldTimeZones : figTimeZones)(true, cityById(st.city)) },
  { id: 'sky', state: { latitude: 42.4, day: 80, hour: 10 }, inputs: [LAT, DAY, HOUR],
    render: st => { const sun = sunOf(st); host('d-sky', drawSky(st)); text('sky-alt', dg(sun.altitude)); text('sky-zen', dg(90 - sun.altitude)); text('sky-azn', sun.azimuth === null ? 'undefined' : dg(sun.azimuth)); },
    save: st => drawSky(st, { standalone: true }) },
  { id: 'orbit', state: { day: 80 }, inputs: [DAY], render: st => host('d-orbit', drawOrbit(st.day)), save: st => drawOrbit(st.day, { standalone: true }) },
  { id: 'eot', state: { day: 56 }, inputs: [DAY], render: st => host('d-eot', drawEot(st.day)), save: st => drawEot(st.day, { standalone: true }) },
  { id: 'analemma', state: { clock: 12, day: 80, latitude: 42.4, longitude: 76.5, meridian: 75 },
    inputs: [range('clock', 'Clock time (standard)', 6, 18, 0.5, formatHour), DAY, LAT,
      range('longitude', 'LONG site', -180, 180, 0.1, lonLabel), range('meridian', 'LONG standard (time zone)', -180, 180, 15, lonLabel),
      { type: 'presets', label: 'LOCATIONS · LAT, LONG, ZONE', buttons: ANALEMMA_SITES }],
    render: st => host('d-analemma', drawAnalemma(st.clock, st.day, analemmaSite(st))), save: st => drawAnalemma(st.clock, st.day, { standalone: true, ...analemmaSite(st) }) },
  { id: 'declination', state: { day: 80 }, inputs: [DAY], render: st => host('d-declination', drawDeclination(st.day)), save: st => drawDeclination(st.day, { standalone: true }) },
  { id: 'meridian', state: { latitude: 42.4, day: 172 }, inputs: [LAT, DAY], render: st => { host('d-meridian', drawMeridian(st.latitude, st.day)); renderNoonCalc(st); }, save: st => drawMeridian(st.latitude, st.day, { standalone: true }) },
  { id: 'vector', state: { latitude: 42.4, day: 80, hour: 10 }, inputs: [LAT, DAY, HOUR], render: st => { host('d-vector', drawSunVector(st)); renderAltAzCalc(st, sunOf(st)); }, save: st => drawSunVector(st, { standalone: true }) },
  { id: 'daylength', state: { latitude: 42.4, day: 172 }, inputs: [LAT, DAY], render: renderDayLength },
  { id: 'dashboard', state: { latitude: 42.4, day: 80 }, inputs: [LAT, DAY_PLAY], render: renderDashboard,
    save: (st, name) => DASHBOARD[name.replace('dash-', '')](st, { standalone: true }) },
  { id: 'sundial', state: { latitude: 42.4, day: 80, hour: 10 }, inputs: [LAT, DAY, HOUR], render: renderSundial, save: st => drawSundial(st.latitude, null, { standalone: true }) },
  { id: 'sunpath', state: { latitude: 42.4, day: 80, hour: 10, construction: true }, inputs: [LAT, DAY, HOUR, { type: 'check', key: 'construction', label: 'Show projection radius (Eq. 14)' }],
    render: renderSunPath, save: st => drawSunPath(st, { standalone: true, construction: st.construction }) },
  { id: 'cylindrical', state: { latitude: 42.4, day: 80, hour: 10 }, inputs: [LAT, DAY, HOUR], render: st => host('d-cylindrical', drawCylindrical(st)), save: st => drawCylindrical(st, { standalone: true }) },
  { id: 'mask', state: { latitude: 42.4, day: 355, hour: 12, bearing: 180, height: 9, distance: 12, width: 30, offset: 0 },
    inputs: [{ type: 'select', key: 'bearing', label: 'Direction of the building', options: ORIENTATIONS.filter(([o]) => o !== 0) }, range('height', 'H above the point', 0, 40, 0.5, metres()), range('distance', 'Distance D', 3, 60, 0.5, metres()),
      range('width', 'Width', 4, 120, 1, metres(0)), range('offset', 'Lateral offset', -40, 40, 1, metres(0)), LAT, DAY, HOUR],
    render: renderMask, save: (st, name) => { const face = { bearing: st.bearing, height: st.height, distance: st.distance, width: st.width, offset: st.offset }; return name === 'maskscene' ? drawMaskScene(face, st, { standalone: true }) : drawSunPath(st, { standalone: true, face }); } },
  { id: 'profile', state: { latitude: 42.4, day: 264, hour: 12, ori: 180, depth: 0.8, fin: 0 },
    inputs: [{ type: 'select', key: 'ori', label: 'Facade orientation ORI', options: ORIENTATIONS }, range('depth', 'Overhang depth D', 0, 2.5, 0.05, metres(2)), range('fin', 'Fin depth d', 0, 1.5, 0.05, metres(2)), LAT, DAY, HOUR,
      { type: 'presets', label: 'TEST CONDITIONS · ITHACA', buttons: [['Sep 21 noon', { latitude: 42.4, day: 264, hour: 12, ori: 180 }], ['Jun 21 noon', { latitude: 42.4, day: 172, hour: 12, ori: 180 }], ['Dec 21 noon', { latitude: 42.4, day: 355, hour: 12, ori: 180 }], ['Aug 21 16:00, W', { latitude: 42.4, day: 233, hour: 16, ori: 270 }]] }],
    render: renderProfile, save: (st, name) => (name === 'profile' ? drawProfileAxo : drawDevice)(sunOf(st), st.ori, dims(st), { standalone: true }) },
  { id: 'devicemask', state: { latitude: 42.4, day: 172, hour: 12, ori: 180, depth: 0.8, fin: 0 },
    inputs: [{ type: 'select', key: 'ori', label: 'Facade orientation ORI', options: ORIENTATIONS }, range('depth', 'Overhang depth D', 0, 2.5, 0.05, metres(2)), range('fin', 'Fin depth d', 0, 1.5, 0.05, metres(2)), LAT, DAY, HOUR],
    render: renderDeviceMask, save: st => drawSunPath(st, { standalone: true, device: { orientation: st.ori, vsa: deviceVSA(st.depth, WINDOW.height, WINDOW.gap), hsa: deviceHSA(st.fin, WINDOW.width) } }) },
  { id: 'pole', state: { latitude: 42.4, day: 80, hour: 10 }, inputs: [LAT, DAY, HOUR], render: renderPole, save: st => drawPoleShadow(sunOf(st), { standalone: true }) },
  { id: 'massing', state: { latitude: 42.4, day: 80, height: 6, gap: 3, hour: 12, showAll: true },
    inputs: [range('height', 'East-wing height', 3, 9, 0.25, metres(2)), range('gap', 'Gap to neighbours', 3, 10, 0.25, metres(2)), range('hour', 'Solar time', 10, 14, 0.25, formatHour),
      { type: 'check', key: 'showAll', label: 'Overlay the five hourly shadows' }, LAT, DAY],
    render: renderMassing, save: st => drawMassing(st, { standalone: true }) },
];

/* Figure 1 takes a site: drag it on the world map, use the arrow keys, or type LAT and LONG below. */
function hydrateCoordinates() {
  const fig = $('fig-coordinates'), plate = fig?.querySelector('.fig-plate');
  if (!plate) return;
  const link = fig.querySelector('figcaption a[download]');
  if (link) link.outerHTML = '<button type="button" class="quiet-button" data-export="coordinates">Save SVG ↓</button>';
  plate.tabIndex = 0;
  plate.setAttribute('aria-label', 'World map with the site. Drag the site, or use the arrow keys to move it by 1° (Shift: 10°).');
  const lab = () => LABS.find(l => l.id === 'coordinates');
  const set = (lat, lonE) => { const st = lab().state; stop(); st.latitude = Math.round(Math.max(-90, Math.min(90, lat)) * 10) / 10; st.longitude = Math.round(-Math.max(-180, Math.min(180, lonE)) * 10) / 10 || 0; update(lab()); };
  // Pointer position in map degrees; null outside the map frame unless a drag is under way.
  let dragging = false;
  const at = e => {
    const m = plate.querySelector('svg.coord-fig')?.getScreenCTM(); if (!m) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), M = COORD_MAP, pad = 8;
    if (!dragging && (p.x < M.x - pad || p.x > M.x + M.w + pad || p.y < M.y - pad || p.y > M.y + M.h + pad)) return null;
    return { lat: 90 - (p.y - M.y) / M.h * 180, lonE: (p.x - M.x) / M.w * 360 - 180 };
  };
  plate.addEventListener('pointerdown', e => { const q = at(e); if (!q || e.button) return; e.preventDefault(); plate.focus({ preventScroll: true }); dragging = true; plate.setPointerCapture(e.pointerId); set(q.lat, q.lonE); });
  plate.addEventListener('pointermove', e => { const q = dragging && at(e); if (q) set(q.lat, q.lonE); });
  for (const type of ['pointerup', 'pointercancel']) plate.addEventListener(type, () => { dragging = false; });
  plate.addEventListener('keydown', e => {
    const step = e.shiftKey ? 10 : 1, st = lab().state, d = { ArrowUp: [step, 0], ArrowDown: [-step, 0], ArrowLeft: [0, -step], ArrowRight: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault(); set(st.latitude + d[0], -st.longitude + d[1]);
  });
}
hydrateCoordinates();

/* The time-zone map picks the nearest key city on click. */
function hydrateTimeZones() {
  const plate = $('d-tz-map'); if (!plate) return;
  plate.addEventListener('click', e => {
    const m = plate.querySelector('svg')?.getScreenCTM(); if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), s = (TZ_MAP.x1 - TZ_MAP.x0) / 360;
    const lon = (p.x - TZ_MAP.x0) / s - 180, lat = TZ_MAP.top - (p.y - TZ_MAP.y0) / s;
    if (Math.abs(lon) > 180 || lat > TZ_MAP.top || lat < TZ_MAP.bottom) return;
    const dist = c => Math.hypot((c.longitude - lon) * Math.cos(lat * RAD), c.latitude - lat);
    const lab = LABS.find(l => l.id === 'timezones'), city = CITIES.reduce((a, b) => dist(b) < dist(a) ? b : a);
    stop(); lab.state.city = city.id; update(lab);
  });
}
hydrateTimeZones();

/* Editable SVG downloads of each drawing in its current state */
const exportLab = { maskscene: 'mask', maskchart: 'mask', device: 'profile', 'tz-map': 'timezones', 'tz-zones': 'timezones', ...Object.fromEntries(Object.keys(DASHBOARD).map(k => [`dash-${k}`, 'dashboard'])) };
wireExports(LABS, exportLab);

/* Clock time to solar time (its inputs sit with the calculation) */
function renderTime() {
  const date = $('clock-date').value, time = $('civil-time').value;
  const lon = Number($('site-long').value), std = Number($('std-long').value), dst = $('dst').checked;
  if (!/^2026-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isFinite(lon) || !Number.isFinite(std)) { calc('calc-time', [['', 'Enter a 2026 date, a clock time and both longitudes.', '', 'warn']]); return; }
  const [, mo, da] = date.split('-').map(Number), [hh, mm] = time.split(':').map(Number), day = dayOfYear(mo, da);
  const r = clockToSolar(hh + mm / 60, day, { longitude: lon, standardMeridian: std, dst }), B = eotAngle(day);
  calc('calc-time', [
    ['NDY', `${calendarDate(day)}`, String(day)],
    ['B', `(${day} − 1) × 360° / 365`, dg(B, 2)],
    ['EOT', `229.2 × (0.000075 + 0.001868 cos B − 0.032077 sin B − 0.014615 cos 2B − 0.04089 sin 2B)`, `${n(r.equationOfTime, 1)} min`],
    ['Longitude', `4 × (${std} − ${lon})`, `${n(r.longitudeCorrection, 1)} min`],
    ['DST', dst ? 'clock − 60 min' : 'none', `${n(r.dstCorrection, 0)} min`],
    '—',
    ['T<sub>solar</sub>', `${time} ${r.totalOffset < 0 ? '−' : '+'} ${n(Math.abs(r.totalOffset), 1)} min`, formatHour(r.hour) + (r.dayOffset ? (r.dayOffset < 0 ? ' (previous day)' : ' (next day)') : ''), 'key'],
  ]);
}
const hasClock = !!$('calc-time');
if (hasClock) for (const id of ['clock-date', 'civil-time', 'dst', 'site-long', 'std-long']) $(id).addEventListener('input', renderTime);

/* Self-test and navigation. Chapters 02 and 04 share this script: each page mounts the
 * labs whose inputs it contains and the self-test named by its quiz form. */
const QUIZZES = { solar: solarQuizQuestions, shading: shadingQuizQuestions };
mountQuiz(QUIZZES[$('quiz-form').dataset.quiz]());
for (const lab of LABS) mount(lab);
if (hasClock) renderTime();
mountNav();
fitDiagramText();
