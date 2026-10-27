// Chapter 08 (building heat balance): degree days, the house heat balance and the window balance from the
// bundled Ithaca TMYx file of Chapter 01, the self-test and navigation.
import { GLAZING, heatLossCoefficient, heatBalance, balancePoint, degreeDays, annualHeating, windowBalance } from './heat.js';
import { irradiation } from './radiation.js';
import { drawDegreeDays, drawBalance, drawWindowBalance } from './heat-diagrams.js';
import { defaultWeather } from './climate-data.js';
import { balanceQuizQuestions } from './heat-quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';
import { calc, host, range, mount, wireExports } from './labs.js';

const n = (x, d = 2) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const deg = (x, d = 1) => `${n(x, d)} °C`;
const kwh = x => `${Math.round(x).toLocaleString('en-US')} kWh`;
const select = (key, label, options) => ({ type: 'select', key, label, options });
const weather = defaultWeather, rows = weather.rows;
const GLAZING_OPTIONS = Object.entries(GLAZING).map(([k, g]) => [k, `${g.name} · U ${g.U} · SHGC ${g.shgc}`]);

/* ── 06 · degree days ──────────────────────────────────────────────────── */
const ddLabel = st => st.limit < st.base ? `G_t${n(st.base, 0)}/${n(st.limit, 0)}: from ${n(st.base, 1)} °C, days below ${n(st.limit, 1)} °C` : `HDD base ${n(st.base, 1)} °C`;
const ddOf = st => { const d = degreeDays(rows, st.base, 18.3, Math.min(st.limit, st.base)), cool = degreeDays(rows, 18.3); d.months.forEach((m, j) => { m.cdd = cool.months[j].cdd; }); d.cdd = cool.cdd; return d; };
function renderDegreeDays(st) {
  const d = ddOf(st);
  host('d-degreedays', drawDegreeDays(d, { label: `Ithaca TMYx · ${ddLabel(st)}` }));
  calc('calc-degreedays', [
    ['HDD', st.limit < st.base ? `Σ (${n(st.base, 1)} − θe,mean) over days with θe,mean < ${n(st.limit, 1)} °C` : `Σ (${n(st.base, 1)} − θe,mean)⁺ over all days (Eq. 8.5)`, `${Math.round(d.hdd)} K·d`, 'key'],
    ['days', 'heating days counted', String(d.heatingDays)],
    ['DH / 24', `degree hours below ${n(st.base, 1)} °C, / 24`, `${Math.round(d.degreeHours / 24)} K·d`],
    ['CDD', 'Σ (θe,mean − 18.3)⁺ (US base)', `${Math.round(d.cdd)} K·d`],
    '—',
    ['Q / H', 'HDD · 24 h: heat loss per W/K of H (Eq. 8.6)', `${n(d.hdd * 24 / 1000, 1)} kWh/(W/K)`],
  ]);
}

/* ── 07 · house heat balance ───────────────────────────────────────────── */
const HOUSE = { roof: 106, wall: 140, window: 24, floor: 70, volume: 420 };
function houseOf(st) {
  const g = GLAZING[st.glazing];
  const H = heatLossCoefficient([{ name: 'Roof', U: st.roofU, area: HOUSE.roof }, { name: 'Walls', U: st.wallU, area: HOUSE.wall }, { name: 'Windows', U: g.U, area: HOUSE.window }], st.ach, HOUSE.volume);
  const internal = st.people * 100 + st.appliances * HOUSE.floor, b = heatBalance({ H, inside: st.inside, outside: st.outside, internal });
  const tb = balancePoint(st.inside, st.residents * 100 + st.appliances * HOUSE.floor, H.total), dd = degreeDays(rows, tb);
  return { g, H, internal, b, tb, dd, annual: annualHeating(H.total, dd.hdd) };
}
const drawHouse = (st, standalone = false) => { const { b } = houseOf(st); return drawBalance({ losses: b.parts, gains: [{ name: `People (${n(st.people, 1)})`, value: st.people * 100 }, { name: 'Equipment', value: st.appliances * HOUSE.floor }], heating: b.heating, surplus: b.surplus }, { standalone, label: `Design condition θi ${n(st.inside, 0)} °C · θe ${n(st.outside, 0)} °C · no sun` }); };
function renderHouse(st) {
  const { g, H, internal, b, tb, dd, annual } = houseOf(st), guests = Math.max(0, Math.ceil(b.heating / 100));
  host('d-house', drawHouse(st));
  calc('calc-house', [
    ...H.parts.map(p => [p.name, `${n(p.U, 3)} × ${p.area} m²${p.name === 'Windows' ? ` (${g.name})` : ''}`, `${n(p.UA, 1)} W/K`]),
    ['H<sub>V</sub>', `1200 × ${n(st.ach, 2)} × ${HOUSE.volume} / 3600 (Eq. 8.3)`, `${n(H.ventilation, 1)} W/K`],
    ['H', 'H<sub>T</sub> + H<sub>V</sub>', `${n(H.total, 1)} W/K`, 'key'],
    '—',
    ['Φ<sub>loss</sub>', `H · (θi − θe) = ${n(H.total, 1)} × ${n(st.inside - st.outside, 0)}`, `${Math.round(b.loss)} W`],
    ['Φ<sub>i</sub>', `${n(st.people, 1)} × 100 W + ${n(st.appliances, 1)} W/m² × ${HOUSE.floor} m²`, `${Math.round(internal)} W`],
    ['Φ<sub>h</sub>', 'heating needed (Eq. 8.1)', `${Math.round(b.heating)} W`, 'key'],
    ['guests', 'at 100 W each to replace the heating', guests ? String(guests) : '0: no heating needed'],
    '—',
    ['θ<sub>b</sub>', `balance point with ${n(st.residents, 1)} residents: θi − Φ<sub>i</sub> / H (Eq. 8.7)`, deg(tb)],
    ['HDD', `Ithaca TMYx, base θ<sub>b</sub> = ${n(tb, 1)} °C`, `${Math.round(dd.hdd)} K·d`],
    ['Q<sub>h</sub>', 'H · HDD(θ<sub>b</sub>) · 24 h, without solar gains (Eq. 8.6)', kwh(annual), 'key'],
    ['q<sub>h</sub>', `per m² of floor (${HOUSE.floor} m²)`, `${Math.round(annual / HOUSE.floor)} kWh/(m²a)`],
  ]);
}

/* ── 05 · window balance ───────────────────────────────────────────────── */
const irrCache = new Map(), irr = ori => { if (!irrCache.has(ori)) irrCache.set(ori, irradiation(weather, 90, ori)); return irrCache.get(ori); };
const windowOf = st => windowBalance(rows, irr(st.ori), { ...GLAZING[st.glazing], inside: st.inside });
const ORI_NAME = { 0: 'north', 90: 'east', 180: 'south', 270: 'west' };
const drawWindow = (st, standalone = false) => drawWindowBalance(windowOf(st), { standalone, label: `Ithaca TMYx · ${GLAZING[st.glazing].name} · facing ${ORI_NAME[st.ori] ?? `ORI ${st.ori}°`} · θi ${n(st.inside, 0)} °C` });
function renderWindow(st) {
  const r = windowOf(st), g = GLAZING[st.glazing], winter = [0, 1, 2, 3, 9, 10, 11], w = winter.reduce((s, j) => ({ loss: s.loss + r.months[j].loss, gain: s.gain + r.months[j].gain }), { loss: 0, gain: 0 });
  host('d-window', drawWindow(st));
  calc('calc-window', [
    ['loss', `U · Σ (θi − θe)⁺ · 1 h = ${g.U} × ${Math.round(r.loss / g.U * 1000).toLocaleString('en-US')} K·h`, `${Math.round(r.loss)} kWh/m²a`],
    ['H<sub>v</sub>', 'irradiation on the vertical window plane (Chapter 05, Eq. 31)', `${Math.round(r.gain / g.shgc)} kWh/m²a`],
    ['gain', `SHGC · H<sub>v</sub> = ${g.shgc} × ${Math.round(r.gain / g.shgc)}`, `${Math.round(r.gain)} kWh/m²a`],
    '—',
    ['net, year', 'gain − loss', `${r.net >= 0 ? '+' : ''}${Math.round(r.net)} kWh/m²a`, 'key'],
    ['net, Oct–Apr', 'heating season only', `${w.gain - w.loss >= 0 ? '+' : ''}${Math.round(w.gain - w.loss)} kWh/m²a`, w.gain - w.loss < 0 ? 'warn' : 'key'],
    ['', 'Glass only: frame, shading, dirt and angle-dependent SHGC reduce the gain; summer gains are a cooling load, not a benefit.', ''],
  ]);
}
function windowTable() {
  const el = document.getElementById('window-table'); if (!el) return;
  el.innerHTML = Object.entries(GLAZING).map(([key, g]) => `<tr><th scope="row">${g.name}</th><td>${g.U}</td><td>${g.shgc}</td>${[180, 90, 270, 0].map(ori => {
    const r = windowBalance(rows, irr(ori), { ...g, inside: 20 }), w = [0, 1, 2, 3, 9, 10, 11].reduce((s, j) => s + r.months[j].gain - r.months[j].loss, 0);
    return `<td>${w >= 0 ? '+' : '−'}${Math.abs(Math.round(w))}</td>`;
  }).join('')}</tr>`).join('');
}

const LABS = [
  { id: 'degreedays', state: { base: 18.3, limit: 18.3 },
    inputs: [{ type: 'presets', label: 'CONVENTIONS', buttons: [['US HDD, 65 °F = 18.3 °C', { base: 18.3, limit: 18.3 }], ['Lecture, base 18 °C', { base: 18, limit: 18 }], ['Germany G_t20/15 (VDI 3807)', { base: 20, limit: 15 }], ['Balance point 15 °C', { base: 15, limit: 15 }]] },
      range('base', 'Base (indoor reference) temperature', 10, 22, .1, v => deg(v)), range('limit', 'Heating limit: count days below', 10, 22, .1, v => deg(v))],
    render: renderDegreeDays, save: st => drawDegreeDays(ddOf(st), { standalone: true, label: `Ithaca TMYx · ${ddLabel(st)}` }) },
  { id: 'house', state: { wallU: .233, roofU: .192, glazing: 'double', ach: 1, inside: 20, outside: 0, people: 1.4, residents: 1.4, appliances: 2 },
    inputs: [{ type: 'presets', label: 'CASES', buttons: [['Lecture house', { wallU: .233, roofU: .192, glazing: 'double', ach: 1, people: 1.4, appliances: 2, inside: 20, outside: 0 }], ['Party: + 49 guests', { people: 50.4 }], ['Uninsulated 1950s', { wallU: 1.4, roofU: 1.0, glazing: 'single', ach: 1.5 }], ['Passive-house level', { wallU: .1, roofU: .1, glazing: 'triple', ach: .15 }]] },
      range('wallU', 'Walls U', .1, 2, .001, v => `${n(v, 3)} W/(m²K)`), range('roofU', 'Roof U', .1, 2, .001, v => `${n(v, 3)} W/(m²K)`), select('glazing', 'Windows (24 m²)', GLAZING_OPTIONS),
      range('ach', 'Air change rate n', .1, 3, .05, v => `${n(v, 2)} h⁻¹`), range('inside', 'Inside θi', 16, 24, .5, v => deg(v)), range('outside', 'Outside design θe', -25, 15, 1, v => deg(v, 0)),
      range('people', 'People present (100 W each)', 0, 80, .2, v => n(v, 1)), range('appliances', 'Equipment', 0, 10, .5, v => `${n(v, 1)} W/m²`)],
    render: renderHouse, save: st => drawHouse(st, true) },
  { id: 'window', state: { glazing: 'triple', ori: 180, inside: 20 },
    inputs: [select('glazing', 'Glazing', GLAZING_OPTIONS), { type: 'presets', label: 'ORIENTATION', buttons: [['South', { ori: 180 }], ['East', { ori: 90 }], ['West', { ori: 270 }], ['North', { ori: 0 }]] },
      range('ori', 'Orientation ORI (normal, from N)', 0, 355, 5, v => `${v}°`), range('inside', 'Inside θi', 16, 24, .5, v => deg(v))],
    render: renderWindow, save: st => drawWindow(st, true) },
];

wireExports(LABS);
windowTable();
mountQuiz(balanceQuizQuestions());
for (const lab of LABS) mount(lab);
mountNav();
fitDiagramText();
