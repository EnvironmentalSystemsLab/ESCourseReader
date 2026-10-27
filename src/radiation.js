/** Solar radiation on a surface of any tilt and orientation (Chapter 05).
 *   Eq. 23  cosine law             G = G_n cos INC, G_h = G_n sin ALT
 *   Eq. 24  air mass               m = 1 / sin ALT
 *   Eq. 25  surface normal         N = (sin TLT sin ORI, sin TLT cos ORI, cos TLT)
 *   Eq. 26  angle of incidence     cos INC = S · N = sin ALT cos TLT + cos ALT sin TLT cos(AZI − ORI)
 *   Eq. 27–30  beam, isotropic sky (Liu–Jordan) and ground-reflected components, and their sum
 *   Eq. 31  irradiation            H = Σ G_t Δt
 * Irradiance in W/m², irradiation in Wh/m² (kWh/m² for monthly and annual totals).
 */
import { RAD, clamp, dayOfYear, clockToSolar, solarPosition } from './solar.js';

const sin = d => Math.sin(d * RAD), cos = d => Math.cos(d * RAD);

/** Eq. 24 — relative air mass; null when the sun is below the horizon. */
export const airMass = altitude => altitude > 0 ? 1 / sin(altitude) : null;

/** Eq. 25 — outward unit normal (east, north, up) of a surface with tilt TLT and orientation ORI. */
export function surfaceNormal(tilt, orientation) {
  return { east: sin(tilt) * sin(orientation), north: sin(tilt) * cos(orientation), up: cos(tilt) };
}

/** Eq. 26 — angle of incidence. cos INC ≤ 0: the sun is behind the surface. */
export function incidence(sun, tilt, orientation) {
  const N = surfaceNormal(tilt, orientation);
  const cosInc = sun.east * N.east + sun.north * N.north + sun.up * N.up;
  return { cosInc, inc: Math.acos(clamp(cosInc, -1, 1)) / RAD, normal: N, facing: cosInc > 1e-9 && sun.aboveHorizon };
}

/** View factors of an inclined surface to the sky and to the ground (isotropic). */
export const skyViewFactor = tilt => (1 + cos(tilt)) / 2;
export const groundViewFactor = tilt => (1 - cos(tilt)) / 2;

/** Eq. 27–30 — irradiance on the surface from DNI and DHI (W/m²). GHI defaults to the closure DNI sin ALT + DHI. */
export function surfaceIrradiance({ dni, dhi, ghi = null, albedo = 0.2 }, sun, tilt, orientation) {
  const i = incidence(sun, tilt, orientation);
  const horizontal = ghi ?? (sun.aboveHorizon ? dni * sun.up : 0) + dhi;
  const beam = i.facing ? dni * i.cosInc : 0;
  const sky = dhi * skyViewFactor(tilt), ground = albedo * horizontal * groundViewFactor(tilt);
  return { ...i, ghi: horizontal, beam, sky, ground, total: beam + sky + ground };
}

/** Sun position at the middle of an EPW hour. EPW hour h covers (h − 1, h] in local standard time. */
export function epwSun(weather, month, day, hour) {
  const ndy = Math.min(365, dayOfYear(month, day));
  const t = clockToSolar(hour - 0.5, ndy, { longitude: -weather.longitude, standardMeridian: -15 * weather.utcOffset });
  return solarPosition(weather.latitude, ndy, t.hour);
}

/** Eq. 31 — monthly and annual irradiation (kWh/m²) on a surface from hourly weather rows
 * [month, day, hour, …, GHI, DNI, DHI, …] (columns 6–8, as in src/climate.js). */
export function irradiation(weather, tilt, orientation, albedo = 0.2) {
  const months = Array.from({ length: 12 }, () => ({ beam: 0, sky: 0, ground: 0, total: 0 }));
  const suns = weather.suns ?? (weather.suns = weather.rows.map(r => epwSun(weather, r[0], r[1], r[2])));
  weather.rows.forEach((r, j) => {
    const [ghi, dni, dhi] = [r[6], r[7], r[8]];
    if (![ghi, dni, dhi].every(Number.isFinite)) return;
    const g = surfaceIrradiance({ dni, dhi, ghi, albedo }, suns[j], tilt, orientation), m = months[r[0] - 1];
    m.beam += g.beam / 1000; m.sky += g.sky / 1000; m.ground += g.ground / 1000; m.total += g.total / 1000;
  });
  const year = months.reduce((s, m) => ({ beam: s.beam + m.beam, sky: s.sky + m.sky, ground: s.ground + m.ground, total: s.total + m.total }), { beam: 0, sky: 0, ground: 0, total: 0 });
  return { months, year };
}

/** Typical ground reflectances (albedo) for Eq. 29. */
export const ALBEDO = [[0.2, 'Grass, typical default · 0.20'], [0.1, 'Asphalt · 0.10'], [0.3, 'Concrete · 0.30'], [0.4, 'Light paving, sand · 0.40'], [0.8, 'Fresh snow · 0.80']];
