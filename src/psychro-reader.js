// Page script of the chapter on humid air (psychrometrics): the status-point chart (click or drag to move
// the point), the process lab, the surface-condensation lab, the self-test and navigation.
import { state, stateFrom, humidityFromRH, saturationHumidity, process } from './psychro.js';
import { drawState, drawProcess, drawSurface, frame, CHART } from './psychro-diagrams.js';
import { psychroQuizQuestions } from './psychro-quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';
import { calc, host, range, mount, update, wireExports } from './labs.js';

const n = (x, d = 1) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const deg = (x, d = 1) => `${n(x, d)} °C`;
const select = (key, label, options) => ({ type: 'select', key, label, options });
// Equation labels follow the chapter's place in content/book.json.
const CH = Number(document.querySelector('.course-chapters [aria-current="page"] span')?.textContent) || 9;
const E = (...i) => `Eq. ${i.map(j => `${CH}.${j}`).join('–')}`;
const rhOf = (t, ah) => Math.round(Math.min(100, Math.max(1, state(t, ah).rh)) * 10) / 10;

/* ── 03 · the status point ─────────────────────────────────────────────── */
const pointOf = st => state(st.t, humidityFromRH(st.t, st.rh));
function renderState(st) {
  const s = pointOf(st);
  host('d-state', drawState(s, { comfort: st.comfort }));
  calc('calc-state', [
    ['p<sub>s</sub>', `saturation vapor pressure at ${deg(s.t)} (${E(1)})`, `${n(s.ps, 3)} kPa`],
    ['p<sub>v</sub>', `RH · p<sub>s</sub> = ${n(s.rh, 0)} % × ${n(s.ps, 3)}`, `${n(s.pv, 3)} kPa`],
    ['AH', `622 · p<sub>v</sub> / (101.325 − p<sub>v</sub>) (${E(2)})`, `${n(s.ah, 2)} g/kg`, 'key'],
    ['SH', 'saturation humidity at this DBT', `${n(s.sh, 1)} g/kg`],
    '—',
    ['DPT', `temperature where p<sub>s</sub> = p<sub>v</sub> (${E(4)})`, deg(s.dew), 'key'],
    ['WBT', `psychrometer equation (${E(5)})`, deg(s.wet)],
    ['h', `1.006 · θ + AH · (2501 + 1.86 · θ) / 1000 (${E(6)})`, `${n(s.h)} kJ/kg`, 'key'],
    ['', `sensible ${n(s.sensible)} + latent ${n(s.latent)} kJ/kg`, ''],
    ['v · ρ', `specific volume (${E(7)}) · density`, `${n(s.v, 3)} m³/kg · ${n(s.rho, 3)} kg/m³`],
  ]);
}
// Clicking or dragging on the chart moves the status point (clamped to the saturation curve).
function wireChartPointer(lab) {
  const el = document.getElementById('d-state'); if (!el) return;
  const F = frame(CHART);
  const move = e => {
    const svg = el.querySelector('svg'), m = svg?.getScreenCTM(); if (!m) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
    const t = Math.min(F.tmax, Math.max(F.tmin, Math.round(F.T(p.x) * 2) / 2)), ah = Math.min(saturationHumidity(t), Math.max(.1, F.AH(p.y)));
    Object.assign(lab.state, { t: Math.min(45, t), rh: rhOf(Math.min(45, t), ah) });
    update(lab);
  };
  let dragging = false;
  // A tap moves the point; a mouse or pen can also drag it. Touch drags keep scrolling the page.
  el.addEventListener('pointerdown', e => { if (e.pointerType !== 'touch') { dragging = true; el.setPointerCapture(e.pointerId); } move(e); });
  el.addEventListener('pointermove', e => { if (dragging) move(e); });
  for (const type of ['pointerup', 'pointercancel']) el.addEventListener(type, () => { dragging = false; });
}
const fromTwo = given => { const s = stateFrom(given); return { t: Math.round(s.t * 10) / 10, rh: rhOf(Math.round(s.t * 10) / 10, s.ah) }; };

/* ── 05 · processes ────────────────────────────────────────────────────── */
const KINDS = [['sensible', 'Heating or cooling (constant AH; condensation below the dew point)'], ['evaporative', 'Evaporative cooling (adiabatic humidification)'], ['sorbent', 'Sorbent dehumidification (adiabatic)']];
const KIND_NAME = { sensible: 'Heating / cooling', evaporative: 'Evaporative cooling', sorbent: 'Sorbent dehumidification' };
const processOf = st => process(state(st.t, humidityFromRH(st.t, st.rh)), st.kind, st.end);
const processLabel = (st, r) => `${KIND_NAME[st.kind]} · 1: ${deg(r.a.t)}, ${n(r.a.rh, 0)} % → 2: ${deg(r.b.t)}, ${n(r.b.rh, 0)} %`;
function renderProcess(st) {
  const r = processOf(st), { a, b, heat, water } = r, mdot = a.rho * st.flow / 3600 / (1 + a.ah / 1000);
  host('d-process', drawProcess(r, { label: processLabel(st, r) }));
  const rows = [
    ['1', `${deg(a.t)} · ${n(a.rh, 0)} % · AH ${n(a.ah, 2)} g/kg`, `h ${n(a.h)} kJ/kg`],
    ['2', `${deg(b.t)} · ${n(b.rh, 0)} % · AH ${n(b.ah, 2)} g/kg`, `h ${n(b.h)} kJ/kg`],
    '—',
    ['Δh', `h<sub>2</sub> − h<sub>1</sub>, per kg of dry air (${E(8)})`, `${n(heat.total, 2)} kJ/kg`, 'key'],
    ['sensible', 'the horizontal part: c · Δθ with c = 1.006 + 1.86 · AH', `${n(heat.sensible, 2)} kJ/kg`],
    ['latent', 'the vertical part: ΔAH · (2501 + 1.86 · θ)', `${n(heat.latent, 2)} kJ/kg`],
  ];
  if (st.kind === 'sensible' && water > 0) rows.push(['water', `condensed below the dew point ${deg(a.dew)}`, `${n(water, 2)} g/kg`, 'warn']);
  if (st.kind === 'evaporative') rows.push(['water', `evaporated; the air cannot fall below its WBT ${deg(a.wet)}`, `${n(-water, 2)} g/kg`]);
  if (st.kind === 'sorbent') rows.push(['water', 'adsorbed by the sorbent; its latent heat becomes sensible heat', `${n(water, 2)} g/kg`]);
  rows.push('—', ['ṁ', `ρ · flow = ${n(a.rho, 3)} × ${st.flow} m³/h / 3600, per dry air`, `${n(mdot, 4)} kg/s`],
    ['Φ', 'ṁ · Δh: heating (+) or cooling (−) power', `${n(mdot * heat.total * 1000, 0)} W`, 'key']);
  if (water > 0 || st.kind === 'evaporative') rows.push(['ṁ<sub>w</sub>', `water ${st.kind === 'evaporative' ? 'evaporated' : 'removed'} per hour`, `${n(Math.abs(water) * mdot * 3.6, 2)} kg/h`]);
  calc('calc-process', rows);
}

/* ── 06 · surface condensation ─────────────────────────────────────────── */
const RSI = 0.13;
const surfaceOf = st => {
  const room = state(st.ti, humidityFromRH(st.ti, st.rh)), surface = st.ti - st.U * RSI * (st.ti - st.te);
  const mold = moldLimit(room.ah);
  return { room, surface, mold, condenses: surface < room.dew, molds: surface < mold };
};
// Mold criterion (DIN 4108-2, ISO 13788): the surface air must stay below 80 % RH, i.e. the surface above the temperature at which AH = 80 % of SH.
const moldLimit = ah => { let lo = -30, hi = 50; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (.8 * saturationHumidity(m) > ah) hi = m; else lo = m; } return (lo + hi) / 2; };
const ELEMENTS = [['Single glazing, U 5.8', { U: 5.8 }], ['Double glazing, U 2.8', { U: 2.8 }], ['Low-e double, U 1.3', { U: 1.3 }], ['Triple, U 0.7', { U: .7 }], ['Uninsulated wall, U 1.5', { U: 1.5 }], ['Insulated wall, U 0.25', { U: .25 }]];
function renderSurface(st) {
  const r = surfaceOf(st);
  host('d-surface', drawSurface(r, { label: `Room ${deg(st.ti, 0)}, ${n(st.rh, 0)} % · outside ${deg(st.te, 0)} · U ${n(st.U, 2)} W/(m²K)` }));
  calc('calc-surface', [
    ['θ<sub>si</sub>', `θi − U · R<sub>si</sub> · (θi − θe) = ${n(st.ti, 1)} − ${n(st.U, 2)} × ${RSI} × ${n(st.ti - st.te, 0)} (heat transfer, Eq. 7.9)`, deg(r.surface), 'key'],
    ['DPT', `of the room air, ${n(r.room.ah, 2)} g/kg (${E(4)})`, deg(r.room.dew)],
    ['80 % RH', 'surface temperature at which mold can grow', deg(r.mold)],
    '—',
    ['result', r.condenses ? 'surface below the dew point: water condenses on it' : r.molds ? 'no condensation, but the surface air exceeds 80 % RH: mold risk' : 'surface above the mold limit', r.condenses ? 'condensation' : r.molds ? 'mold risk' : 'dry', r.condenses || r.molds ? 'warn' : 'key'],
    ['θ<sub>e</sub> limit', 'outside temperature at which condensation starts', deg(st.ti - (st.ti - r.room.dew) / (st.U * RSI))],
  ]);
}

const LABS = [
  { id: 'state', state: { t: 20, rh: 37.6, comfort: false },
    inputs: [{ type: 'presets', label: 'EXAMPLES', buttons: [['Lecture: DBT 20, WBT 12', fromTwo({ t: 20, wet: 12 })], ['Lecture: WBT 15, AH 8', fromTwo({ wet: 15, ah: 8 })], ['Szokolay: DBT 29, WBT 23', fromTwo({ t: 29, wet: 23 })], ['Heated room in winter', { t: 21, rh: 25 }], ['Phoenix, July afternoon', { t: 41, rh: 12 }], ['Miami, July afternoon', { t: 31, rh: 65 }]] },
      range('t', 'Dry-bulb temperature DBT', -10, 45, .1, v => deg(v)), range('rh', 'Relative humidity RH', 1, 100, .1, v => `${n(v, 1)} %`), { type: 'check', key: 'comfort', label: 'Show the comfort range (Lechner)' }],
    render: renderState, save: st => drawState(pointOf(st), { standalone: true, comfort: st.comfort }) },
  { id: 'process', state: { kind: 'sensible', t: 5, rh: 80, end: 20, flow: 100 },
    inputs: [{ type: 'presets', label: 'LECTURE AND TEXTBOOK CASES', buttons: [['Heating 5 → 20 °C', { kind: 'sensible', t: 5, rh: 80, end: 20 }], ['Dehumidification 10 → 3 °C', { kind: 'sensible', t: 10, rh: 80, end: 3 }], ['Szokolay: 29 °C, 60 % → 15 °C', { kind: 'sensible', t: 29, rh: 60, end: 15 }], ['Evaporative cooling 30 → 20 °C', { kind: 'evaporative', t: 30, rh: 10, end: 20 }], ['Silica gel 25 → 35 °C', { kind: 'sorbent', t: 25, rh: 60, end: 35 }]] },
      select('kind', 'Process', KINDS), range('t', 'Start DBT', -10, 45, .5, v => deg(v)), range('rh', 'Start RH', 1, 100, 1, v => `${n(v, 0)} %`), range('end', 'End DBT', -10, 45, .5, v => deg(v)),
      range('flow', 'Air flow rate', 0, 2000, 10, v => `${v} m³/h`)],
    render: renderProcess, save: st => drawProcess(processOf(st), { standalone: true, label: processLabel(st, processOf(st)) }) },
  { id: 'surface', state: { ti: 20, rh: 50, te: -5, U: 2.8 },
    inputs: [{ type: 'presets', label: 'ELEMENT', buttons: ELEMENTS },
      range('ti', 'Room air θi', 15, 26, .5, v => deg(v)), range('rh', 'Room RH', 20, 90, 1, v => `${n(v, 0)} %`), range('te', 'Outside θe', -25, 15, 1, v => deg(v, 0)), range('U', 'U-value of the element', .1, 6, .05, v => `${n(v, 2)} W/(m²K)`)],
    render: renderSurface, save: st => drawSurface(surfaceOf(st), { standalone: true }) },
];

wireExports(LABS);
mountQuiz(psychroQuizQuestions(CH));
for (const lab of LABS) mount(lab);
wireChartPointer(LABS[0]);
mountNav();
fitDiagramText();
