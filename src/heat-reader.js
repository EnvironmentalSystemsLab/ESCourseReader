// Chapter 07 (heat transfer through the envelope): four interactive drawings, the self-test and navigation.
import { MATERIALS, construction, temperatureProfile, dewPoint, moldLimit, temperatureFactor, surfaceResistance, INSIDE_CONVECTION, outsideConvection, airLayer, inhomogeneous, RSI, RSE } from './heat.js';
import { drawWallProfile, drawSurface, drawAirLayer, drawStuds } from './heat-diagrams.js';
import { heatQuizQuestions } from './heat-quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';
import { calc, host, range, mount, wireExports } from './labs.js';

const n = (x, d = 2) => (Math.abs(x) < 5e-13 ? 0 : x).toFixed(d).replace('-', '−');
const deg = (x, d = 1) => `${n(x, d)} °C`;
const select = (key, label, options) => ({ type: 'select', key, label, options });

/* ── 05 · layered construction ─────────────────────────────────────────── */
// Layers inside → outside; the layer marked variable takes the material and thickness of the inputs.
const CONSTRUCTIONS = {
  lecture: { label: 'Lecture wall (slide 609)', layers: [{ material: 'limePlaster', thickness: .01, name: 'Plaster' }, { variable: true }, { material: 'basalt', thickness: .25 }], set: { material: 'mw032', thickness: 100, inside: 20, outside: 10 } },
  etics: { label: 'Brick + external insulation (ETICS)', layers: [{ material: 'gypsumPlaster', thickness: .015 }, { material: 'brick', thickness: .24 }, { variable: true }, { material: 'limePlaster', thickness: .01, name: 'Render' }], set: { material: 'eps', thickness: 160, inside: 20, outside: -10 } },
  timber: { label: 'Timber frame, field between studs', layers: [{ material: 'gypsumBoard', thickness: .0125 }, { material: 'plywood', thickness: .015, name: 'OSB' }, { variable: true }, { material: 'woodFibre', thickness: .06 }], rse: RSI.horizontal, note: 'Ventilated cladding: the layers outside the air gap are ignored and R_se = R_si = 0.13 (ISO 6946 §6.9).', set: { material: 'mineralWool', thickness: 200, inside: 20, outside: -10 } },
  interior: { label: 'Concrete + interior insulation', layers: [{ material: 'gypsumPlaster', thickness: .01 }, { variable: true }, { material: 'concrete', thickness: .2 }], set: { material: 'aac', thickness: 80, inside: 20, outside: -10 } },
  aacWall: { label: 'Monolithic AAC (Bauphysik example)', layers: [{ name: 'Plaster', material: 'gypsumPlaster', thickness: .015, lambda: .7 }, { variable: true }, { name: 'Render', material: 'limePlaster', thickness: .02, lambda: .87 }], set: { material: 'aacMasonry', thickness: 300, inside: 20, outside: -10 } },
  old: { label: 'Uninsulated solid brick', layers: [{ material: 'gypsumPlaster', thickness: .015 }, { variable: true }, { material: 'limePlaster', thickness: .02, name: 'Render' }], set: { material: 'brick', thickness: 365, inside: 20, outside: -10 } },
};
const VARIABLE = ['mw032', 'mineralWool', 'eps', 'xps', 'pir', 'woodFibre', 'cellulose', 'straw', 'cork', 'foamGlass', 'aerogel', 'vip', 'aac', 'aacMasonry', 'brick', 'concrete', 'softwood', 'basalt'];

function wallOf(st) {
  const def = CONSTRUCTIONS[st.preset], layers = def.layers.map(l => l.variable ? { material: st.material, thickness: st.thickness / 1000, variable: true } : l).filter(l => l.thickness > 0);
  const c = construction(layers, { rse: def.rse ?? RSE }), p = temperatureProfile(c, st.inside, st.outside);
  // Moisture check of DIN 4108-2 / ISO 13788: R_si = 0.25 for corners and surfaces behind furniture.
  const p25 = temperatureProfile(construction(layers, { rsi: .25, rse: def.rse ?? RSE }), st.inside, st.outside);
  return { def, c, p, p25, dew: dewPoint(st.inside, st.rh), mold: moldLimit(st.inside, st.rh) };
}
const drawWall = (st, standalone = false) => { const { def, c, p, dew, mold } = wallOf(st); return drawWallProfile({ construction: c, profile: p, inside: st.inside, outside: st.outside, dew, mold, axis: st.axis, label: def.label }, { standalone }); };
function renderWall(st) {
  const { def, c, p, p25, dew, mold } = wallOf(st), t25 = p25.insideSurface, f = temperatureFactor(t25, st.inside, st.outside);
  host('d-wall', drawWall(st));
  const rows = c.layers.map((l, j) => [String(j + 1), `${l.name} · d = ${n(l.thickness * 1000, l.thickness < .02 ? 1 : 0)} mm / λ = ${n(l.lambda, 3)}`, `R = ${n(l.resistance, 3)}`]);
  calc('calc-wall', [
    ['R<sub>si</sub>', 'inside surface, horizontal heat flow', n(c.rsi, 2)],
    ...rows,
    ['R<sub>se</sub>', def.rse ? 'ventilated cladding: R<sub>se</sub> = R<sub>si</sub>' : 'outside surface', n(c.rse, 2)],
    '—',
    ['R<sub>T</sub>', 'Σ R (Eq. 7.7), m²K/W', n(c.total, 3)],
    ['U', '1 / R<sub>T</sub>, W/(m²K)', n(c.U, 3), 'key'],
    ['q', `U · (θi − θe) = ${n(c.U, 3)} × ${n(st.inside - st.outside, 0)}`, `${n(p.q, 1)} W/m²`],
    '—',
    ['θ<sub>si</sub>', `θi − R<sub>si</sub> · q = ${st.inside} − ${n(c.rsi, 2)} × ${n(p.q, 2)}`, deg(p.insideSurface), 'key'],
    ['θ<sub>se</sub>', 'θe + R<sub>se</sub> · q', deg(p.outsideSurface)],
    '—',
    ['θ<sub>si,0.25</sub>', 'with R<sub>si</sub> = 0.25: corners, behind furniture (DIN 4108-2)', deg(t25)],
    ['f<sub>Rsi</sub>', '(θ<sub>si,0.25</sub> − θe) / (θi − θe), required ≥ 0.70', n(f, 2), f < .7 ? 'warn' : undefined],
    ['θ<sub>dew</sub>', `room air ${st.inside} °C, ${st.rh} % RH`, deg(dew)],
    ['θ<sub>80%</sub>', 'mold limit: 80 % RH at the surface', deg(mold)],
    p.insideSurface < dew ? ['', 'Condensation on the inside surface', '', 'warn'] : t25 < mold ? ['', 'Corners and surfaces behind furniture fall below the mold limit at this condition', '', 'warn'] : ['', `Corner surface ${n(t25 - mold, 1)} K above the mold limit`, ''],
    ...(def.note ? [['', def.note, '']] : []),
  ]);
}

/* ── 04 · surface coefficients ─────────────────────────────────────────── */
function renderSurface(st) {
  const inside = st.side === 'inside', hc = inside ? INSIDE_CONVECTION[st.direction] : outsideConvection(st.wind), s = surfaceResistance({ convection: hc, emissivity: st.emissivity, meanTemp: inside ? 20 : 10 });
  host('d-surface', drawSurface(st));
  calc('calc-surface', [
    ['h<sub>c</sub>', inside ? `ISO 6946 Annex C, heat flow ${st.direction}` : `4 + 4 · v = 4 + 4 × ${n(st.wind, 1)}`, `${n(hc, 2)} W/(m²K)`],
    ['h<sub>r0</sub>', `4 σ T<sub>m</sub>³, T<sub>m</sub> = ${inside ? 293 : 283} K`, `${n(s.radiation / st.emissivity, 2)} W/(m²K)`],
    ['h<sub>r</sub>', `ε · h<sub>r0</sub> = ${n(st.emissivity, 2)} × ${n(s.radiation / st.emissivity, 2)}`, `${n(s.radiation, 2)} W/(m²K)`],
    '—',
    ['R<sub>s</sub>', `1 / (h<sub>c</sub> + h<sub>r</sub>) = 1 / ${n(hc + s.radiation, 2)} (Eq. 7.6)`, `${n(s.resistance, 3)} m²K/W`, 'key'],
    ['ISO', inside ? 'R<sub>si</sub>: up 0.10 · horizontal 0.13 · down 0.17' : 'R<sub>se</sub> = 0.04 (any direction)', ''],
  ]);
}

/* ── 06 · air layers ───────────────────────────────────────────────────── */
function renderCavity(st) {
  const a = airLayer(st.thickness, st.direction, st.e1, st.e2);
  host('d-cavity', drawAirLayer(st));
  calc('calc-cavity', [
    ['E', `1 / (1/${n(st.e1, 2)} + 1/${n(st.e2, 2)} − 1)`, n(a.E, 3)],
    ['h<sub>r</sub>', 'E · h<sub>r0</sub>, h<sub>r0</sub> ≈ 5.1 W/(m²K) at 10 °C', `${n(a.radiation, 2)} W/(m²K)`],
    ['h<sub>a</sub>', a.conductionOnly ? `still air: 0.025 / d = 0.025 / ${n(st.thickness / 1000, 3)}` : `convection, heat flow ${st.direction} (ISO 6946 Annex D)`, `${n(a.convection, 2)} W/(m²K)`],
    '—',
    ['R<sub>g</sub>', `1 / (h<sub>a</sub> + h<sub>r</sub>) (Eq. 7.10)`, `${n(a.resistance, 3)} m²K/W`, 'key'],
    ['share', 'of the heat crossing by radiation', `${Math.round(a.radiation / (a.radiation + a.convection) * 100)} %`],
  ]);
}

/* ── 07 · parallel paths ───────────────────────────────────────────────── */
function studsOf(st) {
  const f = Math.min(.5, st.studWidth / st.spacing), outer = [{ material: 'gypsumBoard', thickness: .0125 }], skin = [{ material: 'plywood', thickness: .012, name: 'OSB' }];
  return inhomogeneous([
    { fraction: 1 - f, layers: [...outer, { material: st.insulation, thickness: st.thickness / 1000 }, ...skin] },
    { fraction: f, layers: [...outer, { material: st.stud, thickness: st.thickness / 1000 }, ...skin] },
  ]);
}
function renderStuds(st) {
  const r = studsOf(st);
  host('d-studs', drawStuds(r, st));
  calc('calc-studs', [
    ['f<sub>stud</sub>', `${st.studWidth} / ${st.spacing}`, `${n(r.parts[1].fraction * 100, 1)} %`],
    ['U<sub>ins</sub>', 'insulation path alone', n(r.parts[0].c.U, 3)],
    ['U<sub>stud</sub>', `${MATERIALS[st.stud].name.toLowerCase()} path alone`, n(r.parts[1].c.U, 3)],
    '—',
    ['R′<sub>T</sub>', '1 / Σ (f / R<sub>T</sub>): parallel paths', n(r.upper, 3)],
    ['R″<sub>T</sub>', 'R<sub>si</sub> + Σ d / λ<sub>mean</sub> + R<sub>se</sub>: isothermal planes', n(r.lower, 3)],
    ['R<sub>T</sub>', '(R′<sub>T</sub> + R″<sub>T</sub>) / 2', n(r.total, 3)],
    ['U', '1 / R<sub>T</sub>, W/(m²K)', n(r.U, 3), 'key'],
    ['vs. field', 'increase over the insulation path', `+${Math.round((r.U / r.parts[0].c.U - 1) * 100)} %`],
    r.upper / r.lower > 1.5 ? ['', `R′<sub>T</sub> / R″<sub>T</sub> = ${n(r.upper / r.lower, 2)} > 1.5: the simple method is not valid; calculate numerically (ISO 10211)`, '', 'warn'] : ['', `R′<sub>T</sub> / R″<sub>T</sub> = ${n(r.upper / r.lower, 2)}: maximum error ±${n(r.error * 100, 1)} %`, ''],
  ]);
}

const LABS = [
  { id: 'wall', state: { preset: 'lecture', material: 'mw032', thickness: 100, inside: 20, outside: 10, rh: 50, axis: 'thickness' },
    inputs: [{ type: 'presets', label: 'CONSTRUCTIONS', buttons: Object.entries(CONSTRUCTIONS).map(([key, d]) => [d.label, { preset: key, ...d.set }]) },
      select('material', 'Variable layer: material', VARIABLE.map(key => [key, `${MATERIALS[key].name} · λ ${MATERIALS[key].lambda}`])),
      range('thickness', 'Variable layer: thickness', 0, 400, 5, v => `${v} mm`),
      range('inside', 'Inside air θi', 15, 25, .5, v => deg(v)), range('outside', 'Outside air θe', -20, 20, 1, v => deg(v, 0)), range('rh', 'Room relative humidity', 20, 80, 5, v => `${v} %`),
      select('axis', 'Horizontal axis', [['thickness', 'Thickness (section)'], ['resistance', 'Thermal resistance (Bauphysik graphical method)']])],
    render: renderWall, save: st => drawWall(st, true) },
  { id: 'surface', state: { side: 'inside', direction: 'horizontal', emissivity: .9, wind: 4 },
    inputs: [select('side', 'Surface', [['inside', 'Inside (room air)'], ['outside', 'Outside (wind)']]), select('direction', 'Heat flow direction (inside)', [['horizontal', 'Horizontal: walls, windows'], ['up', 'Upward: ceilings, roofs'], ['down', 'Downward: floors']]),
      range('emissivity', 'Long-wave emissivity ε', .02, .95, .01, v => n(v, 2)), range('wind', 'Wind speed v (outside)', 0, 10, .5, v => `${n(v, 1)} m/s`),
      { type: 'presets', label: 'SURFACES', buttons: [['Painted, plaster (ε 0.9)', { emissivity: .9 }], ['Low-e coating (ε 0.05)', { emissivity: .05 }], ['Galvanized steel (ε 0.28)', { emissivity: .28 }]] }],
    render: renderSurface, save: st => drawSurface(st, { standalone: true }) },
  { id: 'cavity', state: { thickness: 25, direction: 'horizontal', e1: .9, e2: .9 },
    inputs: [range('thickness', 'Air layer thickness d', 0, 100, 1, v => `${v} mm`), select('direction', 'Heat flow direction', [['horizontal', 'Horizontal (wall)'], ['up', 'Upward (roof, ceiling)'], ['down', 'Downward (floor)']]),
      range('e1', 'Emissivity of face 1, ε₁', .02, .95, .01, v => n(v, 2)), range('e2', 'Emissivity of face 2, ε₂', .02, .95, .01, v => n(v, 2)),
      { type: 'presets', label: 'FACES', buttons: [['Masonry / masonry', { e1: .9, e2: .9 }], ['One foil face', { e1: .9, e2: .05 }], ['Two foil faces', { e1: .05, e2: .05 }]] }],
    render: renderCavity, save: st => drawAirLayer(st, { standalone: true }) },
  { id: 'studs', state: { stud: 'softwood', studWidth: 45, spacing: 600, insulation: 'mineralWool', thickness: 140 },
    inputs: [{ type: 'presets', label: 'FRAMES', buttons: [['Timber 45 at 600 mm', { stud: 'softwood', studWidth: 45, spacing: 600 }], ['Timber 45 at 400 mm (US 16″)', { stud: 'softwood', studWidth: 45, spacing: 400 }], ['Steel C-stud, 1 mm web', { stud: 'steel', studWidth: 1, spacing: 600 }]] },
      select('stud', 'Stud material', [['softwood', 'Softwood · λ 0.12'], ['hardwood', 'Hardwood, glulam · λ 0.16'], ['steel', 'Steel · λ 50']]),
      range('studWidth', 'Stud width (steel: web thickness)', 1, 120, 1, v => `${v} mm`), range('spacing', 'Stud spacing', 300, 1000, 25, v => `${v} mm`),
      select('insulation', 'Insulation between studs', ['mineralWool', 'cellulose', 'woodFibre', 'straw', 'pir'].map(k => [k, `${MATERIALS[k].name} · λ ${MATERIALS[k].lambda}`])), range('thickness', 'Stud depth = insulation thickness', 60, 400, 10, v => `${v} mm`)],
    render: renderStuds, save: st => drawStuds(studsOf(st), st, { standalone: true }) },
];

wireExports(LABS);
mountQuiz(heatQuizQuestions());
for (const lab of LABS) mount(lab);
mountNav();
fitDiagramText();
