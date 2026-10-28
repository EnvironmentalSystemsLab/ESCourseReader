// Psychrometrics of the chapter on humid air: saturation, humidity, wet bulb, dew point, enthalpy,
// specific volume and the processes traced on the chart. SI units, θ in °C, pressures in kPa,
// AH in g/kg of dry air (Szokolay's notation; x in German texts, W in ASHRAE). Pure functions only.

/** Standard atmosphere at sea level, kPa (the pressure of the chart). */
export const P_ATM = 101.325;
/** Specific heat of dry air and of water vapor, kJ/(kg·K); latent heat of evaporation at 0 °C, kJ/kg. */
export const CP_AIR = 1.006;
export const CP_VAPOUR = 1.86;
export const H_EVAP = 2501;
/** Ratio of the molar masses of water and dry air, × 1000 for g/kg (Szokolay: 622). */
export const EPSILON = 621.945;

/** Eq. 1 — saturation vapor pressure over liquid water (Magnus formula, Sonntag 1990 constants), kPa. */
export const saturationPressure = t => 0.6112 * Math.exp(17.62 * t / (243.12 + t));
/** Szokolay's Antoine form, kPa, for comparison. */
export const saturationPressureAntoine = t => 0.1333222 * Math.exp(18.686 - 4030.183 / (t + 235));

/** Eq. 2 — absolute humidity (humidity ratio) from the vapor pressure, g/kg, and back. */
export const humidityFromPressure = (pv, p = P_ATM) => EPSILON * pv / (p - pv);
export const pressureFromHumidity = (ah, p = P_ATM) => ah * p / (EPSILON + ah);
/** Saturation humidity SH: the most moisture air at θ can hold, g/kg. */
export const saturationHumidity = (t, p = P_ATM) => humidityFromPressure(saturationPressure(t), p);

/** Eq. 3 — relative humidity, %: the vapor pressure as a share of the saturation pressure. */
export const relativeHumidity = (t, ah, p = P_ATM) => 100 * pressureFromHumidity(ah, p) / saturationPressure(t);
export const humidityFromRH = (t, rh, p = P_ATM) => humidityFromPressure(rh / 100 * saturationPressure(t), p);

/** Eq. 4 — dew point: the temperature at which the vapor pressure is the saturation pressure (inverse Magnus), °C. */
export function dewPointFromHumidity(ah, p = P_ATM) {
  const g = Math.log(Math.max(pressureFromHumidity(ah, p), 1e-6) / 0.6112);
  return 243.12 * g / (17.62 - g);
}

/** Eq. 5 — psychrometer equation (ASHRAE Handbook — Fundamentals, Ch. 1): AH from the dry- and wet-bulb temperatures, g/kg. */
export function humidityFromWetBulb(t, tw, p = P_ATM) {
  const ws = saturationHumidity(tw, p) / 1000;
  return 1000 * ((H_EVAP - 2.326 * tw) * ws - CP_AIR * (t - tw)) / (H_EVAP + CP_VAPOUR * t - 4.186 * tw);
}
/** Wet-bulb temperature of air at θ and AH, °C, by bisection of Eq. 5 between the dew point and θ. */
export function wetBulb(t, ah, p = P_ATM) {
  let lo = Math.min(dewPointFromHumidity(ah, p), t) - 1, hi = t;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (humidityFromWetBulb(t, m, p) > ah) hi = m; else lo = m; }
  return (lo + hi) / 2;
}
/** Dry-bulb temperature on the wet-bulb line θw at humidity AH, °C (for reading the chart along a WBT line). */
export function dryBulbFromWetBulb(tw, ah, p = P_ATM) {
  const ws = saturationHumidity(tw, p) / 1000, w = ah / 1000;
  return ((H_EVAP - 2.326 * tw) * ws + CP_AIR * tw - w * (H_EVAP - 4.186 * tw)) / (CP_AIR + CP_VAPOUR * w);
}

/** Eq. 6 — specific enthalpy of humid air relative to dry air and liquid water at 0 °C, kJ per kg of dry air,
 * split into the sensible part (dry air) and the latent part (the vapor). */
export function enthalpy(t, ah) {
  const w = ah / 1000, sensible = CP_AIR * t, latent = w * (H_EVAP + CP_VAPOUR * t);
  return { total: sensible + latent, sensible, latent };
}
/** Temperature on the enthalpy line h at humidity AH, °C. */
export const tempFromEnthalpy = (h, ah) => (h - ah / 1000 * H_EVAP) / (CP_AIR + CP_VAPOUR * ah / 1000);
/** Humidity on the enthalpy line h at temperature θ, g/kg. */
export const humidityFromEnthalpy = (h, t) => 1000 * (h - CP_AIR * t) / (H_EVAP + CP_VAPOUR * t);

/** Eq. 7 — specific volume of humid air per kg of dry air (ideal gases), m³/kg; density of the mixture, kg/m³. */
export const specificVolume = (t, ah, p = P_ATM) => 0.287042 * (t + 273.15) * (1 + 1.607858 * ah / 1000) / p;
export const density = (t, ah, p = P_ATM) => (1 + ah / 1000) / specificVolume(t, ah, p);
/** Temperature on the specific-volume line v at humidity AH, °C. */
export const tempFromVolume = (v, ah, p = P_ATM) => v * p / (0.287042 * (1 + 1.607858 * ah / 1000)) - 273.15;

/** Every property of a status point given by its dry-bulb temperature and absolute humidity. */
export function state(t, ah, p = P_ATM) {
  const pv = pressureFromHumidity(ah, p), ps = saturationPressure(t), h = enthalpy(t, ah);
  return { t, ah, p, pv, ps, sh: humidityFromPressure(ps, p), rh: 100 * pv / ps, dew: dewPointFromHumidity(ah, p),
    wet: wetBulb(t, ah, p), h: h.total, sensible: h.sensible, latent: h.latent, v: specificVolume(t, ah, p), rho: density(t, ah, p) };
}
/** Any two properties fix the state: { t, rh } | { t, wet } | { t, dew } | { t, ah } | { wet, ah } | { t, h }. */
export function stateFrom(given, p = P_ATM) {
  const { t, rh, wet, dew, ah, h } = given;
  if (t !== undefined && rh !== undefined) return state(t, humidityFromRH(t, rh, p), p);
  if (t !== undefined && wet !== undefined) return state(t, humidityFromWetBulb(t, wet, p), p);
  if (t !== undefined && dew !== undefined) return state(t, saturationHumidity(dew, p), p);
  if (t !== undefined && ah !== undefined) return state(t, ah, p);
  if (t !== undefined && h !== undefined) return state(t, humidityFromEnthalpy(h, t), p);
  if (wet !== undefined && ah !== undefined) return state(dryBulbFromWetBulb(wet, ah, p), ah, p);
  throw new Error('Give two independent properties of the air.');
}

/** Eq. 8 — heat for a change of state of m kg of dry air, kJ: total, sensible (the horizontal part) and latent (the vertical part). */
export function heatOfProcess(a, b, m = 1) {
  const total = m * (b.h - a.h), latent = m * (b.ah - a.ah) / 1000 * (H_EVAP + CP_VAPOUR * b.t);
  return { total, latent, sensible: total - latent };
}

/** Eq. 9 — adiabatic mixing of m1 kg of air a with m2 kg of air b: humidity and enthalpy are mass-weighted means. */
export function mix(a, b, m1, m2, p = P_ATM) {
  const ah = (m1 * a.ah + m2 * b.ah) / (m1 + m2), h = (m1 * a.h + m2 * b.h) / (m1 + m2);
  const s = state(tempFromEnthalpy(h, ah), ah, p);
  // Fog: a mixture beyond the saturation line condenses back to it (rare, but visible as breath on a cold day).
  return s.rh > 100 ? { ...saturateAlongEnthalpy(h, p), fog: ah - saturateAlongEnthalpy(h, p).ah } : { ...s, fog: 0 };
}
function saturateAlongEnthalpy(h, p) {
  let lo = -40, hi = 60;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (enthalpy(m, saturationHumidity(m, p)).total > h) hi = m; else lo = m; }
  const t = (lo + hi) / 2; return state(t, saturationHumidity(t, p), p);
}

/**
 * The processes of the chart from a start state to an end dry-bulb temperature:
 * 'sensible'   heating or cooling at constant AH; cooling below the dew point follows the saturation line and condenses water;
 * 'evaporative' adiabatic humidification along the wet-bulb line of the start state (θ cannot fall below the wet bulb);
 * 'sorbent'    adiabatic dehumidification along the enthalpy line (θ rises while AH falls, down to dry air).
 * Returns the end state, the path for drawing, the heat per kg of dry air and the water condensed (+) or added (−), g/kg.
 */
export function process(start, kind, endT, p = P_ATM) {
  const a = state(start.t, start.ah, p), path = [];
  let b, water = 0;
  if (kind === 'sensible') {
    if (endT >= a.dew) { b = state(endT, a.ah, p); path.push(a, b); }
    else {
      b = state(endT, saturationHumidity(endT, p), p); water = a.ah - b.ah;
      path.push(a, state(a.dew, a.ah, p));
      for (let i = 1; i <= 24; i++) { const t = a.dew + (endT - a.dew) * i / 24; path.push(state(t, saturationHumidity(t, p), p)); }
    }
  } else if (kind === 'evaporative') {
    const t = Math.max(Math.min(endT, a.t), a.wet);
    b = state(t, humidityFromWetBulb(t, a.wet, p), p); water = a.ah - b.ah;
    for (let i = 0; i <= 24; i++) { const ti = a.t + (t - a.t) * i / 24; path.push(state(ti, humidityFromWetBulb(ti, a.wet, p), p)); }
  } else if (kind === 'sorbent') {
    const tmax = tempFromEnthalpy(a.h, 0), t = Math.min(Math.max(endT, a.t), tmax);
    b = state(t, Math.max(0, humidityFromEnthalpy(a.h, t)), p); water = a.ah - b.ah;
    path.push(a, b);
  } else throw new Error(`Unknown process ${kind}`);
  return { a, b, path, water, heat: heatOfProcess(a, b) };
}
