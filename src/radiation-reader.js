// Chapter 05 (solar radiation on surfaces): three interactive drawings, the self-test and navigation.
import { RAD, solarPosition } from './solar.js';
import { airMass, incidence, surfaceIrradiance, skyViewFactor, groundViewFactor, irradiation, ALBEDO } from './radiation.js';
import { drawIncidence, drawComponents, drawMonthlyIrradiation } from './radiation-diagrams.js';
import { defaultWeather } from './climate-data.js';
import { radiationQuizQuestions } from './quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';
import { calc, host, LAT, DAY, HOUR, range, mount, wireExports } from './labs.js';

const $ = id => document.getElementById(id);
const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD);
const n = (x, d = 2) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const dg = (x, d = 1) => `${n(x, d)}°`;
const wm = x => `${Math.round(x)} W/m²`;
const sunOf = st => solarPosition(st.latitude, st.day, st.hour);
const angle = v => `${Math.round(v)}°`;
const TILT = range('tilt', 'Tilt TLT (0° roof, 90° wall)', 0, 180, 1, angle), ORI = range('ori', 'Orientation ORI (normal, from N)', 0, 355, 5, angle);
const SURFACES = [['Flat roof', { tilt: 0, ori: 180 }], ['South wall', { tilt: 90, ori: 180 }], ['East wall', { tilt: 90, ori: 90 }], ['West wall', { tilt: 90, ori: 270 }], ['North wall', { tilt: 90, ori: 0 }], ['PV, TLT = 30°, S', { tilt: 30, ori: 180 }], ['Roof 30°, N', { tilt: 30, ori: 0 }]];
const surfaces = label => ({ type: 'presets', label, buttons: SURFACES });

function renderIncidence(st) {
  const sun = sunOf(st), i = incidence(sun, st.tilt, st.ori), N = i.normal, az = sun.azimuth ?? 0;
  host('d-incidence', drawIncidence(st));
  if (!sun.aboveHorizon) { calc('calc-incidence', [['ALT', '', dg(sun.altitude)], ['', 'Sun below the horizon: no beam radiation', '', 'warn']]); return; }
  const a = sind(sun.altitude) * cosd(st.tilt), b = cosd(sun.altitude) * sind(st.tilt) * cosd(az - st.ori);
  calc('calc-incidence', [
    ['ALT', 'Eq. 7', dg(sun.altitude)],
    ['AZI', 'Eq. 8', dg(az)],
    ['N', `(sin ${st.tilt}° sin ${st.ori}°, sin ${st.tilt}° cos ${st.ori}°, cos ${st.tilt}°)<br>= (${n(N.east, 3)}, ${n(N.north, 3)}, ${n(N.up, 3)})`, 'Eq. 25'],
    ['S', `(cos ALT sin AZI, cos ALT cos AZI, sin ALT)<br>= (${n(sun.east, 3)}, ${n(sun.north, 3)}, ${n(sun.up, 3)})`, 'Eq. 7a'],
    '—',
    ['cos INC', `sin ${n(sun.altitude, 1)}° · cos ${st.tilt}° + cos ${n(sun.altitude, 1)}° · sin ${st.tilt}° · cos(${n(az, 1)}° − ${st.ori}°)<br>= ${n(a, 4)} + ${n(b, 4)}`, n(i.cosInc, 4), 'key'],
    ['INC', `arccos(${n(i.cosInc, 4)})`, dg(i.inc), 'key'],
    i.facing ? ['G<sub>b</sub> / G<sub>n</sub>', 'share of the beam on the surface (Eq. 27)', `${Math.round(i.cosInc * 100)} %`] : ['', 'cos INC ≤ 0: the sun is behind the surface', '', 'warn'],
  ]);
}

function componentsOf(st) {
  const sun = sunOf(st), args = { dni: st.dni, dhi: st.dhi, albedo: st.albedo };
  return { sun, surface: surfaceIrradiance(args, sun, st.tilt, st.ori), roof: surfaceIrradiance(args, sun, 0, 180) };
}
function renderComponents(st) {
  const { sun, surface: g, roof } = componentsOf(st);
  host('d-components', drawComponents([{ label: `TLT ${st.tilt}°, ORI ${st.ori}°`, ...g }, { label: 'Horizontal (GHI)', ...roof }], { dni: sun.aboveHorizon ? st.dni : null }));
  const m = airMass(sun.altitude);
  calc('calc-components', [
    ['ALT', 'Eq. 7', sun.aboveHorizon ? dg(sun.altitude) : 'below horizon'],
    ['INC', 'Eq. 26', dg(g.inc)],
    ['m', '1 / sin ALT (Eq. 24)', m ? n(m, 2) : '—'],
    '—',
    ['G<sub>b</sub>', g.facing ? `DNI · cos INC = ${st.dni} × ${n(g.cosInc, 3)}` : 'sun behind the surface or below the horizon', wm(g.beam), 'key'],
    ['G<sub>d</sub>', `DHI · (1 + cos TLT) / 2 = ${st.dhi} × ${n(skyViewFactor(st.tilt), 3)}`, wm(g.sky), 'key'],
    ['GHI', `DNI · sin ALT + DHI = ${st.dni} × ${n(Math.max(0, sun.up), 3)} + ${st.dhi}`, wm(g.ghi)],
    ['G<sub>r</sub>', `ρ · GHI · (1 − cos TLT) / 2 = ${st.albedo} × ${Math.round(g.ghi)} × ${n(groundViewFactor(st.tilt), 3)}`, wm(g.ground), 'key'],
    '—',
    ['G<sub>t</sub>', `${Math.round(g.beam)} + ${Math.round(g.sky)} + ${Math.round(g.ground)}`, wm(g.total), 'key'],
  ]);
}

// Hourly irradiation from the bundled Ithaca TMYx file; the sun positions are computed once.
const weather = defaultWeather, horizontal = irradiation(weather, 0, 180);
const ORIENTATION_TABLE = [['Horizontal roof', 0, 180], ['South wall', 90, 180], ['East wall', 90, 90], ['West wall', 90, 270], ['North wall', 90, 0], ['South, TLT = 30°', 30, 180], ['South, TLT = LAT = 42°', 42, 180]];
function renderAnnual(st) {
  const r = irradiation(weather, st.tilt, st.ori, st.albedo), y = r.year, best = r.months.reduce((a, m, j) => m.total > r.months[a].total ? j : a, 0);
  host('d-annual', drawMonthlyIrradiation(r, horizontal, { label: `TLT ${st.tilt}°, ORI ${st.ori}°` }));
  calc('calc-annual', [
    ['H<sub>b</sub>', 'Σ G<sub>b</sub> · 1 h', `${Math.round(y.beam)} kWh/m²`],
    ['H<sub>d</sub>', 'Σ G<sub>d</sub> · 1 h', `${Math.round(y.sky)} kWh/m²`],
    ['H<sub>r</sub>', 'Σ G<sub>r</sub> · 1 h', `${Math.round(y.ground)} kWh/m²`],
    '—',
    ['H', 'per year (Eq. 31)', `${Math.round(y.total)} kWh/m²`, 'key'],
    ['H / H<sub>h</sub>', `relative to the horizontal ${Math.round(horizontal.year.total)} kWh/m²`, `${Math.round(y.total / horizontal.year.total * 100)} %`],
    ['Peak month', '', `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][best]} · ${Math.round(r.months[best].total)} kWh/m²`],
  ]);
}
function orientationTable() {
  const el = $('orientation-table'); if (!el) return;
  el.innerHTML = ORIENTATION_TABLE.map(([name, tilt, ori]) => {
    const r = irradiation(weather, tilt, ori), m = r.months;
    return `<tr><th scope="row">${name}</th><td>${tilt}° · ${ori}°</td><td>${Math.round(m[0].total)}</td><td>${Math.round(m[5].total)}</td><td><strong>${Math.round(r.year.total)}</strong></td><td>${Math.round(r.year.beam / r.year.total * 100)} %</td></tr>`;
  }).join('');
}

const LABS = [
  { id: 'incidence', state: { latitude: 42.4, day: 355, hour: 12, tilt: 90, ori: 180 }, inputs: [TILT, ORI, surfaces('SURFACES'), LAT, DAY, HOUR],
    render: renderIncidence, save: st => drawIncidence(st, { standalone: true }) },
  { id: 'components', state: { latitude: 42.4, day: 355, hour: 12, tilt: 90, ori: 180, dni: 800, dhi: 100, albedo: 0.2 },
    inputs: [range('dni', 'DNI (direct normal)', 0, 1000, 10, wm), range('dhi', 'DHI (diffuse horizontal)', 0, 500, 10, wm), { type: 'select', key: 'albedo', label: 'Ground reflectance ρ', options: ALBEDO },
      { type: 'presets', label: 'SKY', buttons: [['Clear', { dni: 850, dhi: 90 }], ['Hazy', { dni: 500, dhi: 200 }], ['Overcast', { dni: 0, dhi: 180 }]] }, TILT, ORI, surfaces('SURFACES'), LAT, DAY, HOUR],
    render: renderComponents, save: st => { const { surface, roof } = componentsOf(st); return drawComponents([{ label: `TLT ${st.tilt}°, ORI ${st.ori}°`, ...surface }, { label: 'Horizontal (GHI)', ...roof }], { standalone: true, dni: st.dni }); } },
  { id: 'annual', state: { tilt: 90, ori: 180, albedo: 0.2 }, inputs: [TILT, ORI, { type: 'select', key: 'albedo', label: 'Ground reflectance ρ', options: ALBEDO }, surfaces('SURFACES')],
    render: renderAnnual, save: st => drawMonthlyIrradiation(irradiation(weather, st.tilt, st.ori, st.albedo), horizontal, { standalone: true, label: `TLT ${st.tilt}°, ORI ${st.ori}°` }) },
];

wireExports(LABS);
orientationTable();
mountQuiz(radiationQuizQuestions());
for (const lab of LABS) mount(lab);
mountNav();
fitDiagramText();
