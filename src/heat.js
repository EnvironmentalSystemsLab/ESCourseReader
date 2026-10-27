/** Steady-state heat transfer through the envelope (Chapter 07) and the building heat balance (Chapter 08).
 * Symbols follow ISO 7345 / ISO 6946 (as in DIN 4108 and the Lehrbuch der Bauphysik): θ Celsius temperature, Φ heat flow rate [W], q heat flux [W/m²], Q energy [J or kWh],
 * λ conductivity [W/(m·K)], d thickness [m], R resistance [m²K/W], U transmittance [W/(m²K)].
 *   Eq. 7.1  sensible heat           Q = m c ΔT
 *   Eq. 7.2  Fourier, plane layer    q = λ ΔT / d
 *   Eq. 7.3  layer resistance        R = d / λ,  q = ΔT / R
 *   Eq. 7.4  convection (Newton)     q = h_c (T_s − T_air)
 *   Eq. 7.5  radiation, linearised   q = ε σ (T_s⁴ − T_sur⁴) ≈ h_r (T_s − T_sur),  h_r = 4 ε σ T_m³
 *   Eq. 7.6  surface resistance      R_s = 1 / (h_c + h_r)
 *   Eq. 7.7  total resistance        R_T = R_si + Σ d_j / λ_j + R_se,  U = 1 / R_T
 *   Eq. 7.8  heat flow               Φ = U A ΔT,  Q = Φ t
 *   Eq. 7.9  temperature profile     T_j = T_i − q (R_si + Σ R_k)
 *   Eq. 7.10 air layer               R_g = 1 / (h_a + E h_r0),  E = 1 / (1/ε1 + 1/ε2 − 1)
 *   Eq. 7.11 parallel paths          U = Σ f_j U_j
 *   Eq. 7.12 periodic penetration    α = λ / (ρ c),  δ = √(α P / π)
 *   Eq. 7.13 time constant           τ = C / H
 *   Eq. 8.1–8.7 heat balance, ventilation, solar gain, degree days, annual demand, balance point
 */

export const SIGMA = 5.67e-8;
export const KELVIN = 273.15;
/** Air at room conditions: density kg/m³, specific heat J/(kg·K). */
export const AIR = { density: 1.2, specificHeat: 1000 };

/** Eq. 7.1 — sensible heat to change the temperature of mass m by ΔT, J. */
export const sensibleHeat = (mass, specificHeat, deltaT) => mass * specificHeat * deltaT;

/** Eq. 7.3 — resistance of a homogeneous layer, m²K/W. */
export const layerResistance = (thickness, conductivity) => thickness / conductivity;

/** Eq. 7.5 — linearised radiation coefficient of a black body at mean temperature T_m (°C), W/(m²K). */
export const blackRadiationCoefficient = (meanTemp = 20) => 4 * SIGMA * (meanTemp + KELVIN) ** 3;
/** Eq. 7.5 — exact net long-wave exchange of a small grey surface with large surroundings, W/m². */
export const netRadiation = (emissivity, surfaceTemp, surroundingTemp) => emissivity * SIGMA * ((surfaceTemp + KELVIN) ** 4 - (surroundingTemp + KELVIN) ** 4);

/** Convection coefficients of ISO 6946 Annex C: inside by heat-flow direction, outside from the wind speed v (m/s). */
export const INSIDE_CONVECTION = { up: 5.0, horizontal: 2.5, down: 0.7 };
export const outsideConvection = windSpeed => 4 + 4 * windSpeed;

/** Eq. 7.6 — surface resistance from convection and radiation in parallel. */
export function surfaceResistance({ convection, emissivity = 0.9, meanTemp = 20 }) {
  const radiation = emissivity * blackRadiationCoefficient(meanTemp);
  return { convection, radiation, resistance: 1 / (convection + radiation) };
}
/** Conventional surface resistances of ISO 6946 (ε = 0.9, inside 20 °C, outside 10 °C, wind 4 m/s), m²K/W. */
export const RSI = { horizontal: 0.13, up: 0.10, down: 0.17 };
export const RSE = 0.04;

/** Eq. 7.10 — unventilated air layer between two parallel surfaces (ISO 6946 Annex D). d in mm. */
export const effectiveEmissivity = (e1, e2) => 1 / (1 / e1 + 1 / e2 - 1);
export function airLayer(thicknessMm, direction = 'horizontal', e1 = 0.9, e2 = 0.9, meanTemp = 10) {
  const E = effectiveEmissivity(e1, e2), radiation = E * blackRadiationCoefficient(meanTemp);
  if (!(thicknessMm > 0)) return { convection: 0, radiation, E, resistance: 0, conductionOnly: true };
  const still = 0.025 / (thicknessMm / 1000);
  const convection = Math.max(direction === 'up' ? 1.95 : direction === 'down' ? 0.12 * thicknessMm ** -0.44 : 1.25, still);
  return { convection, radiation, E, resistance: 1 / (convection + radiation), conductionOnly: convection === still };
}

/** Typical properties: λ W/(m·K), ρ kg/m³, c J/(kg·K). Sources: Incropera Table A.3, ISO 10456, the lecture and manufacturer data. */
export const MATERIALS = {
  mineralWool: { name: 'Mineral wool (rock, glass)', lambda: 0.035, rho: 30, c: 830, insulation: true },
  mw032: { name: 'Mineral wool, λ 0.032 (lecture)', lambda: 0.032, rho: 20, c: 830, insulation: true },
  eps: { name: 'Expanded polystyrene (EPS)', lambda: 0.035, rho: 20, c: 1210, insulation: true },
  xps: { name: 'Extruded polystyrene (XPS)', lambda: 0.030, rho: 35, c: 1210, insulation: true },
  pir: { name: 'Polyisocyanurate (PIR) board', lambda: 0.023, rho: 32, c: 1400, insulation: true },
  woodFibre: { name: 'Wood-fibre board', lambda: 0.042, rho: 160, c: 2100, insulation: true },
  cellulose: { name: 'Cellulose, blown', lambda: 0.040, rho: 50, c: 2000, insulation: true },
  straw: { name: 'Straw (compressed panel)', lambda: 0.052, rho: 110, c: 2000, insulation: true },
  cork: { name: 'Cork board', lambda: 0.039, rho: 120, c: 1800, insulation: true },
  foamGlass: { name: 'Cellular (foam) glass', lambda: 0.045, rho: 120, c: 1000, insulation: true },
  aerogel: { name: 'Aerogel blanket', lambda: 0.015, rho: 150, c: 1000, insulation: true },
  vip: { name: 'Vacuum insulation panel (aged)', lambda: 0.007, rho: 190, c: 800, insulation: true },
  aac: { name: 'Mineral insulation board (AAC)', lambda: 0.045, rho: 115, c: 1300, insulation: true },
  gypsumBoard: { name: 'Gypsum board', lambda: 0.17, rho: 800, c: 1090 },
  gypsumPlaster: { name: 'Gypsum plaster', lambda: 0.22, rho: 1680, c: 1085 },
  limePlaster: { name: 'Lime-cement plaster, render', lambda: 1.0, rho: 1800, c: 1000 },
  softwood: { name: 'Softwood (fir, pine)', lambda: 0.12, rho: 510, c: 1380 },
  hardwood: { name: 'Hardwood (oak, maple)', lambda: 0.16, rho: 720, c: 1255 },
  plywood: { name: 'Plywood, OSB', lambda: 0.12, rho: 545, c: 1215 },
  brick: { name: 'Brick, common', lambda: 0.72, rho: 1920, c: 835 },
  aacMasonry: { name: 'Aerated concrete masonry (AAC)', lambda: 0.24, rho: 600, c: 1000 },
  concrete: { name: 'Concrete (stone mix)', lambda: 1.4, rho: 2300, c: 880 },
  basalt: { name: 'Basalt, stone', lambda: 3.5, rho: 2850, c: 1000 },
  steel: { name: 'Steel, carbon', lambda: 50, rho: 7850, c: 450 },
  glass: { name: 'Glass (soda lime)', lambda: 1.0, rho: 2500, c: 750 },
  water: { name: 'Water (still)', lambda: 0.61, rho: 1000, c: 4180 },
  air: { name: 'Air (still, 20 °C)', lambda: 0.026, rho: 1.2, c: 1000 },
};

/** Eq. 7.7 — construction from layers listed inside → outside: [{ material | lambda, thickness (m), name? }]. */
export function construction(layers, { rsi = RSI.horizontal, rse = RSE } = {}) {
  const resolved = layers.map(l => {
    const m = typeof l.material === 'string' ? MATERIALS[l.material] : l.material ?? {};
    const lambda = l.lambda ?? m.lambda, R = l.resistance ?? layerResistance(l.thickness, lambda);
    return { ...m, ...l, name: l.name ?? m.name, lambda, resistance: R };
  });
  const total = rsi + rse + resolved.reduce((s, l) => s + l.resistance, 0);
  return { layers: resolved, rsi, rse, total, U: 1 / total, thickness: resolved.reduce((s, l) => s + (l.thickness ?? 0), 0) };
}

/** Eq. 7.8–7.9 — heat flux and the temperatures at the air, surfaces and interfaces, inside → outside. */
export function temperatureProfile(c, inside, outside) {
  const q = (inside - outside) / c.total;
  let T = inside - q * c.rsi;
  const nodes = [{ T: inside, at: 'inside air' }, { T, at: 'inside surface' }];
  c.layers.forEach((l, j) => { T -= q * l.resistance; nodes.push({ T, at: j === c.layers.length - 1 ? 'outside surface' : `${l.name} | ${c.layers[j + 1].name}` }); });
  nodes.push({ T: outside, at: 'outside air' });
  return { q, nodes, insideSurface: nodes[1].T, outsideSurface: nodes[nodes.length - 2].T, drops: c.layers.map(l => q * l.resistance) };
}

/** Dew-point temperature (Magnus formula, Sonntag constants), °C. */
export function dewPoint(temp, relativeHumidity) {
  const g = Math.log(Math.max(relativeHumidity, 0.1) / 100) + 17.62 * temp / (243.12 + temp);
  return 243.12 * g / (17.62 - g);
}

/** Eq. 7.11 — area-weighted transmittance of parallel paths: [{ fraction, U }]. */
export const parallelU = paths => paths.reduce((s, p) => s + p.fraction * p.U, 0);

/** ISO 6946 §6.7: upper limit R'_T (parallel paths, isolated sections) and lower limit R''_T (isothermal planes)
 * for sections [{ fraction, layers }] that share the same layer sequence (equal thicknesses, different materials). */
export function inhomogeneous(sections, { rsi = RSI.horizontal, rse = RSE } = {}) {
  const parts = sections.map(s => ({ ...s, c: construction(s.layers, { rsi, rse }) }));
  const upper = 1 / parts.reduce((sum, p) => sum + p.fraction / p.c.total, 0);
  const lower = rsi + rse + parts[0].c.layers.reduce((sum, l, j) => {
    const lambdaMean = parts.reduce((m, p) => m + p.fraction * p.c.layers[j].lambda, 0);
    return sum + l.thickness / lambdaMean;
  }, 0);
  const total = (upper + lower) / 2;
  return { upper, lower, total, U: 1 / total, error: (upper - lower) / (2 * total), parts };
}

/** Temperature factor f_Rsi = (θ_si − θ_e) / (θ_i − θ_e); DIN 4108-2 requires f_Rsi ≥ 0.70 against mould. */
export const temperatureFactor = (insideSurface, inside, outside) => (insideSurface - outside) / (inside - outside);
export const surfaceFactorFromU = (U, rsi = 0.25) => 1 - U * rsi;
/** Surface temperature at which the surface air reaches 80 % RH (mould criterion), °C. */
export const mouldLimit = (temp, relativeHumidity) => dewPoint(temp, relativeHumidity * 100 / 80);

/** Eq. 7.12 — thermal diffusivity (m²/s) and periodic penetration depth (m) for a period in hours. */
export const diffusivity = m => m.lambda / (m.rho * m.c);
export const penetrationDepth = (alpha, periodHours = 24) => Math.sqrt(alpha * periodHours * 3600 / Math.PI);
/** Amplitude ratio and time lag (h) of a periodic surface temperature at depth x in a thick layer. */
export function periodicResponse(m, depth, periodHours = 24) {
  const delta = penetrationDepth(diffusivity(m), periodHours);
  return { delta, amplitude: Math.exp(-depth / delta), lag: depth / delta * periodHours / (2 * Math.PI) };
}
/** Thermal effusivity b = √(λ ρ c), J/(m²·K·s^0.5), and the contact temperature of two touching bodies. */
export const effusivity = m => Math.sqrt(m.lambda * m.rho * m.c);
export const contactTemperature = (t1, b1, t2, b2) => (t1 * b1 + t2 * b2) / (b1 + b2);
/** Eq. 7.13 — time constant in hours of a zone with heat capacity C (J/K) and heat loss coefficient H (W/K). */
export const timeConstant = (capacity, H) => capacity / H / 3600;
/** Effective internal heat capacity per m² of floor, J/(m²K) (ISO 13790 classes). */
export const MASS_CLASSES = [['Very light', 80e3], ['Light', 110e3], ['Medium', 165e3], ['Heavy', 260e3], ['Very heavy', 370e3]];

/* ── Chapter 08 · building heat balance ─────────────────────────────────── */

/** Eq. 8.3 — ventilation / infiltration heat loss coefficient, W/K: ρ c n V / 3600 s. */
export const ventilationCoefficient = (ach, volume) => AIR.density * AIR.specificHeat * ach * volume / 3600;

/** Eq. 8.2–8.3 — heat loss coefficients: elements [{ name, U, area }]. */
export function heatLossCoefficient(elements, ach, volume) {
  const parts = elements.map(e => ({ ...e, UA: e.U * e.area }));
  const transmission = parts.reduce((s, e) => s + e.UA, 0), ventilation = ventilationCoefficient(ach, volume);
  return { parts, transmission, ventilation, total: transmission + ventilation };
}

/** Eq. 8.1 — steady heat balance at a design condition. Positive heating: the plant must supply it. */
export function heatBalance({ H, inside, outside, internal = 0, solar = 0 }) {
  const loss = H.total * (inside - outside), gains = internal + solar;
  return { loss, gains, heating: Math.max(0, loss - gains), surplus: Math.max(0, gains - loss),
    parts: [...H.parts.map(p => ({ name: p.name, value: p.UA * (inside - outside) })), { name: 'Infiltration', value: H.ventilation * (inside - outside) }] };
}

/** Eq. 8.7 — balance-point temperature: the outdoor temperature at which gains alone hold T_i. */
export const balancePoint = (inside, gains, H) => inside - gains / H;

/** Eq. 8.5 — heating and cooling degree days (daily-mean method) and degree hours from hourly rows [m, d, h, T, …].
 * limit: heating limit (Heizgrenze) for the German G_t20/15 convention (VDI 3807): only days with mean < limit count.
 * Default: US / ASHRAE convention, base = limit (HDD 18.3 °C = 65 °F). */
export function degreeDays(rows, base = 18, coolingBase = base, limit = base) {
  const months = Array.from({ length: 12 }, () => ({ hdd: 0, cdd: 0, degreeHours: 0, coolingHours: 0 }));
  const days = new Map();
  for (const r of rows) {
    const T = r[3]; if (!Number.isFinite(T)) continue;
    const key = r[0] * 100 + r[1], d = days.get(key) ?? { month: r[0], sum: 0, n: 0 };
    d.sum += T; d.n++; days.set(key, d);
    months[r[0] - 1].degreeHours += Math.max(0, base - T); months[r[0] - 1].coolingHours += Math.max(0, T - coolingBase);
  }
  for (const d of days.values()) { const mean = d.sum / d.n, m = months[d.month - 1]; if (mean < limit) { m.hdd += Math.max(0, base - mean); m.heatingDays = (m.heatingDays ?? 0) + 1; } m.cdd += Math.max(0, mean - coolingBase); }
  const sum = key => months.reduce((s, m) => s + (m[key] ?? 0), 0);
  return { base, limit, months, heatingDays: sum('heatingDays'), hdd: sum('hdd'), cdd: sum('cdd'), degreeHours: sum('degreeHours'), coolingHours: sum('coolingHours') };
}

/** Eq. 8.6 — seasonal heating energy from H (W/K) and degree days (K·d), kWh. */
export const annualHeating = (H, hdd) => H * hdd * 24 / 1000;

/** Utilisation factor of gains (ISO 13790 / DIN V 4108-6): γ = gains / losses, a = 1 + τ / 16 h. */
export function gainUtilisation(gains, losses, tau) {
  const g = gains / losses, a = 1 + tau / 16;
  return Math.abs(g - 1) < 1e-9 ? a / (a + 1) : (1 - g ** a) / (1 - g ** (a + 1));
}

/** Window transmittance from glazing, frame and edge: U_w = (U_g A_g + U_f A_f + ψ_g l_g) / A_w (ISO 10077-1). */
export const windowU = ({ Ug, Ag, Uf, Af, psi, edge }) => (Ug * Ag + Uf * Af + psi * edge) / (Ag + Af);

/** Glazing of the lecture (centre of glass, EnergyPlus constructions). */
export const GLAZING = {
  single: { name: 'Single, clear 3 mm', U: 5.894, shgc: 0.905, tvis: 0.913 },
  double: { name: 'Double, clear, 6 mm air', U: 2.72, shgc: 0.764, tvis: 0.812 },
  lowE2: { name: 'Double low-e, tinted, coating on #2', U: 1.493, shgc: 0.373, tvis: 0.444 },
  lowE3: { name: 'Double low-e, coating on #3', U: 1.507, shgc: 0.649, tvis: 0.769 },
  triple: { name: 'Triple low-e', U: 0.785, shgc: 0.474, tvis: 0.661 },
};

/** Eq. 8.4 + 7.8 — monthly window balance: conduction loss U A Σ (T_i − T_o)⁺ and solar gain SHGC A H, kWh.
 * irradiation: { months: [{ total }] } in kWh/m² on the window plane (Chapter 05, Eq. 31). */
export function windowBalance(rows, irradiation, { U, shgc, area = 1, inside = 20 }) {
  const loss = Array(12).fill(0);
  for (const r of rows) if (Number.isFinite(r[3])) loss[r[0] - 1] += U * area * Math.max(0, inside - r[3]) / 1000;
  const months = loss.map((l, j) => ({ loss: l, gain: shgc * area * irradiation.months[j].total }));
  const sum = key => months.reduce((s, m) => s + m[key], 0);
  return { months, loss: sum('loss'), gain: sum('gain'), net: sum('gain') - sum('loss') };
}
