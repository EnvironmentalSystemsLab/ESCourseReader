// Self-tests for Chapter 07 (heat transfer through the envelope) and Chapter 08 (building heat balance).
// Numeric questions regenerate their values; each solution cites the section and equation numbers.
import { construction, temperatureProfile, ventilationCoefficient, MATERIALS } from './heat.js';

const n = (x, d = 2) => x.toFixed(d).replace('-', '−');
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const between = (a, b, step = 1) => a + Math.round(Math.random() * (b - a) / step) * step;
const eq = s => `<p class="quiz-eq">${s}</p>`;

function numeric(ref, unit, tolerance, make) {
  const q = { type: 'num', ref, unit, tolerance };
  q.regenerate = (first = false) => Object.assign(q, make(first));
  q.regenerate(true);
  return q;
}

/** Chapter 07 */
export function heatQuizQuestions() {
  return [
    numeric('Section 01 · Eq. 7.1', 's', 3, first => {
      const m = first ? .5 : between(.3, 1.5, .1), t0 = first ? 20 : between(5, 25), P = first ? 800 : pick([800, 1200, 2000]), Q = m * 4176 * (100 - t0), t = Q / P;
      return { answer: t, answerText: `${n(t, 0)} s`, prompt: `A kettle with a ${P} W element (100 % efficient) holds ${n(m, 1)} kg of water at ${t0} °C. How long until it boils? (c = 4176 J/(kg·K))`,
        solution: eq(`Q = m · c · Δθ = ${n(m, 1)} × 4176 × (100 − ${t0}) = ${n(Q, 0)} J`) + eq(`t = Q / Φ = ${n(Q, 0)} / ${P} = ${n(t, 0)} s`) + '<p>Energy (J) is power (W = J/s) times time.</p>' };
    }),
    numeric('Section 03 · Eq. 7.3', 'W', 0.6, first => {
      const key = first ? 'mineralWool' : pick(['mineralWool', 'eps', 'woodFibre', 'brick', 'concrete']), m = MATERIALS[key], d = first ? .2 : between(.05, .3, .05), dT = first ? 10 : between(5, 30, 5), A = first ? 1 : between(1, 10);
      const R = d / m.lambda, phi = A * dT / R;
      return { answer: phi, answerText: `${n(phi, 1)} W`, prompt: `${n(A, 0)} m² of ${m.name.toLowerCase()} (λ = ${m.lambda} W/(m·K)), ${n(d * 1000, 0)} mm thick, separate two surfaces ${dT} K apart. What heat flow passes through it (surfaces only, no air films)?`,
        solution: eq(`R = d / λ = ${n(d, 2)} / ${m.lambda} = ${n(R, 3)} m²K/W`) + eq(`Φ = A · Δθ / R = ${n(A, 0)} × ${dT} / ${n(R, 3)} = ${n(phi, 1)} W`) };
    }),
    { type: 'mc', ref: 'Section 04 · Eq. 7.6', prompt: 'Why is R<sub>si</sub> (0.13 m²K/W) about three times larger than R<sub>se</sub> (0.04 m²K/W)?', options: ['Indoor air is still, so convection is weak; outside, wind raises h<sub>c</sub> to about 20 W/(m²K)', 'Indoor surfaces have a lower emissivity', 'Radiation only acts on the outside surface', 'Indoor air is warmer and conducts heat less well'], correct: 0,
      solution: `${eq('R_si = 1 / (h_c + h_r) = 1 / (2.5 + 5.1) ≈ 0.13 · R_se = 1 / (20 + 4.6) ≈ 0.04 m²K/W')}<p>Both surfaces radiate with h<sub>r</sub> ≈ 5 W/(m²K) at ε = 0.9. The difference is convection: free convection inside, forced by wind outside (ISO 6946 Annex C).</p>` },
    numeric('Section 05 · Eq. 7.7', 'W/(m²K)', 0.006, first => {
      const dIns = first ? .1 : between(.06, .3, .02), lam = first ? .032 : pick([.032, .035, .04]), dMas = first ? .25 : pick([.175, .24, .25, .3]), mas = first ? 'basalt' : pick(['basalt', 'brick', 'concrete']);
      const c = construction([{ material: 'limePlaster', thickness: .01 }, { material: 'mineralWool', thickness: dIns, lambda: lam }, { material: mas, thickness: dMas }]);
      return { answer: c.U, answerText: `${n(c.U, 3)} W/(m²K)`, prompt: `Wall, inside → outside: 10 mm plaster (λ = 1.0), ${n(dIns * 1000, 0)} mm mineral wool (λ = ${lam}), ${n(dMas * 1000, 0)} mm ${MATERIALS[mas].name.toLowerCase()} (λ = ${MATERIALS[mas].lambda}). R<sub>si</sub> = 0.13, R<sub>se</sub> = 0.04 m²K/W. Calculate U.`,
        solution: eq(`R_T = 0.13 + 0.01/1.0 + ${n(dIns, 2)}/${lam} + ${n(dMas, 3)}/${MATERIALS[mas].lambda} + 0.04 = ${n(c.total, 3)} m²K/W`) + eq(`U = 1 / R_T = ${n(c.U, 3)} W/(m²K)`) };
    }),
    numeric('Section 05 · Eq. 7.9', '°C', 0.15, first => {
      const ti = 20, te = first ? -10 : between(-15, 5), dAac = first ? .3 : pick([.24, .3, .365]);
      const c = construction([{ name: 'Plaster', thickness: .015, lambda: .7 }, { name: 'AAC', thickness: dAac, lambda: .24 }, { name: 'Render', thickness: .02, lambda: .87 }]), p = temperatureProfile(c, ti, te);
      return { answer: p.insideSurface, answerText: `${n(p.insideSurface, 1)} °C`, prompt: `Aerated-concrete wall (Lehrbuch der Bauphysik example): 15 mm plaster (λ 0.7), ${n(dAac * 1000, 0)} mm AAC masonry (λ 0.24), 20 mm render (λ 0.87); R<sub>si</sub> 0.13, R<sub>se</sub> 0.04. θi = ${ti} °C, θe = ${te} °C. What is the inside surface temperature θsi?`,
        solution: eq(`R_T = 0.13 + 0.015/0.7 + ${dAac}/0.24 + 0.02/0.87 + 0.04 = ${n(c.total, 3)} m²K/W`) + eq(`q = (${ti} − (${te})) / ${n(c.total, 3)} = ${n(p.q, 2)} W/m²`) + eq(`θsi = θi − R_si · q = ${ti} − 0.13 × ${n(p.q, 2)} = ${n(p.insideSurface, 1)} °C`) + '<p>The temperature drop across each layer is q times its resistance; the largest drop is in the layer with the largest R.</p>' };
    }),
    numeric('Section 05 · f_Rsi', '', 0.01, first => {
      const ti = 20, te = first ? -5 : between(-15, 0), U = first ? 1.2 : between(.3, 2.5, .1), tsi = ti - .25 * U * (ti - te), f = (tsi - te) / (ti - te);
      return { answer: f, answerText: n(f, 2), prompt: `A wall corner has U = ${n(U, 1)} W/(m²K). With the mold check value R<sub>si</sub> = 0.25 m²K/W, θi = ${ti} °C and θe = ${te} °C, the corner surface reaches θsi = ${n(tsi, 1)} °C. What is its temperature factor f<sub>Rsi</sub>? (DIN 4108-2 requires ≥ 0.70.)`,
        solution: eq(`f_Rsi = (θsi − θe) / (θi − θe) = (${n(tsi, 1)} − (${te})) / (${ti} − (${te})) = ${n(f, 2)}`) + `<p>${f >= .7 ? 'Meets' : 'Fails'} the DIN 4108-2 criterion f<sub>Rsi</sub> ≥ 0.70, which keeps the surface above 12.6 °C at −5 °C outside, the temperature at which room air of 20 °C and 50 % RH reaches 80 % RH at the surface.</p>` };
    }),
    { type: 'mc', ref: 'Section 06 · Eq. 7.10', prompt: 'A 50 mm unventilated cavity has R<sub>g</sub> ≈ 0.18 m²K/W, a 100 mm cavity the same. What changes R<sub>g</sub> substantially?', options: ['A low-emissivity foil on one face (ε ≈ 0.05): R<sub>g</sub> rises to about 0.6', 'Doubling the cavity to 200 mm', 'Painting both faces white', 'Filling the cavity with ventilated outdoor air'], correct: 0,
      solution: '<p>Beyond about 20 mm, convection cells form and radiation, which does not depend on the width, carries most of the heat. Only lowering the emissivity of a face reduces it: E = 1 / (1/0.9 + 1/0.05 − 1) ≈ 0.05. White paint has ε ≈ 0.9 in the long-wave range; color matters only for sunlight.</p>' },
    { type: 'mc', ref: 'Section 07 · ISO 6946', prompt: 'Insulation between studs: the stud path has U = 0.6, the insulation path U = 0.2 W/(m²K), studs cover 15 % of the area. For the upper limit, the paths are combined…', options: ['area-weighted: U = 0.85 × 0.2 + 0.15 × 0.6 = 0.26 W/(m²K)', 'by adding the resistances of both paths', 'by taking the insulation value only', 'by taking the stud value as the worst case'], correct: 0,
      solution: '<p>Parallel paths add their conductances weighted by area (Eq. 7.11). The resistances add only in series. ISO 6946 averages this upper limit of R with a lower limit from isothermal planes; for steel studs the two limits differ too much and a numerical calculation is required.</p>' },
    { type: 'mc', ref: 'Section 08 · transient', prompt: 'When can a steady-state U-value calculation NOT predict the result well?', options: ['Peak indoor temperatures on a sunny summer day in a heavy building', 'Annual heating energy of a well-insulated house in a cold climate', 'Comparing two wall options by U-value', 'The heat loss on a cold, overcast winter night'], correct: 0,
      solution: '<p>Over periods longer than about two weeks, storage and release in the walls cancel out (Lehrbuch der Bauphysik II 2), so steady state works for seasonal energy and for winter design nights. Daily peaks driven by sun and internal gains depend on heat capacity: ρ, c and λ together set the time lag and damping.</p>' },
  ];
}

/** Chapter 08 */
export function balanceQuizQuestions() {
  return [
    numeric('Section 02 · Eq. 8.2', 'W/K', 0.5, first => {
      const els = first ? [['roof', .192, 106], ['walls', .233, 140], ['windows', 2.72, 24]] : [['roof', between(.12, .4, .01), between(60, 150)], ['walls', between(.15, .5, .01), between(100, 250)], ['windows', pick([.785, 1.493, 2.72]), between(10, 40)]];
      const H = els.reduce((s, [, U, A]) => s + U * A, 0);
      return { answer: H, answerText: `${n(H, 1)} W/K`, prompt: `Calculate the transmission heat loss coefficient H<sub>T</sub>: ${els.map(([name, U, A]) => `${name} ${A} m² with U = ${U}`).join(', ')} W/(m²K).`,
        solution: eq(`H_T = Σ U·A = ${els.map(([, U, A]) => `${U} × ${A}`).join(' + ')} = ${n(H, 1)} W/K`) + '<p>H<sub>T</sub> is the heat flow per kelvin of indoor–outdoor difference.</p>' };
    }),
    numeric('Section 03 · Eq. 8.3', 'W', 10, first => {
      const ach = first ? 1 : pick([.3, .5, .7, 1, 1.5]), V = first ? 420 : between(200, 900, 10), dT = first ? 20 : between(15, 35), H = ventilationCoefficient(ach, V), phi = H * dT;
      return { answer: phi, answerText: `${n(phi, 0)} W`, prompt: `A house of V = ${V} m³ has an air change rate n = ${ach} h⁻¹. What is the infiltration heat loss at θi − θe = ${dT} K? (ρ = 1.2 kg/m³, c = 1000 J/(kg·K))`,
        solution: eq(`H_V = ρ · c · n · V / 3600 = 1.2 × 1000 × ${ach} × ${V} / 3600 = ${n(H, 1)} W/K`) + eq(`Φ_V = H_V · Δθ = ${n(H, 1)} × ${dT} = ${n(phi, 0)} W`) + '<p>German texts write 0.34 · n · V (W/K), with ρc for air at 20 °C.</p>' };
    }),
    numeric('Section 04–05 · Eq. 8.4', 'W', 5, first => {
      const A = first ? 6 : between(2, 12), shgc = first ? .474 : pick([.373, .474, .649, .764]), G = first ? 500 : between(150, 800, 50), phi = A * shgc * G;
      return { answer: phi, answerText: `${n(phi, 0)} W`, prompt: `A window of ${A} m² glazing with SHGC (g) = ${shgc} receives G = ${G} W/m² on its plane. What solar heat gain enters the room?`,
        solution: eq(`Φ_s = A · SHGC · G = ${A} × ${shgc} × ${G} = ${n(phi, 0)} W`) + '<p>G is the total irradiance on the window plane from Chapter 05 (Eq. 30); the SHGC falls at large angles of incidence.</p>' };
    }),
    numeric('Section 06 · Eq. 8.6', 'kWh', 60, first => {
      const H = first ? 258.25 : between(120, 450, 5), dd = first ? 3484 : pick([2900, 3484, 3881, 4150, 5000]), Q = H * dd * 24 / 1000;
      return { answer: Q, answerText: `${n(Q, 0)} kWh`, prompt: `A house has H = H<sub>T</sub> + H<sub>V</sub> = ${n(H, 2)} W/K. The heating degree days are ${dd} K·d. Estimate the seasonal heat loss (before gains).`,
        solution: eq(`Q = H · HDD · 24 h = ${n(H, 2)} × ${dd} × 24 / 1000 = ${n(Q, 0)} kWh`) + '<p>Degree days are K·d; multiply by 24 h/d to get K·h, so W/K × K·h = Wh.</p>' };
    }),
    numeric('Section 07 · Eq. 8.7', '°C', 0.15, first => {
      const ti = first ? 20 : pick([19, 20, 21]), gains = first ? 280 : between(150, 900, 10), H = first ? 258.25 : between(120, 450, 5), tb = ti - gains / H;
      return { answer: tb, answerText: `${n(tb, 1)} °C`, prompt: `θi = ${ti} °C, average internal and solar gains ${gains} W, H = ${n(H, 2)} W/K. Below which outdoor temperature does the house need heating (balance point)?`,
        solution: eq(`θ_b = θi − (Φ_i + Φ_s) / H = ${ti} − ${gains} / ${n(H, 2)} = ${n(tb, 1)} °C`) + '<p>The better the envelope (smaller H), the lower the balance point, and the shorter the heating season (Heizgrenztemperatur).</p>' };
    }),
    numeric('Section 07 · party problem', 'guests', 1, first => {
      const loss = first ? 5165 : between(2000, 8000, 50), existing = first ? 280 : between(150, 400, 10), per = first ? 100 : pick([70, 80, 100]), g = Math.ceil((loss - existing) / per);
      return { answer: g, answerText: `${g} guests`, prompt: `At the design temperature the house loses ${loss} W. Existing gains are ${existing} W. How many guests (each ${per} W) are needed so the heating can stay off?`,
        solution: eq(`(${loss} − ${existing}) / ${per} = ${n((loss - existing) / per, 1)} → ${g} guests`) + '<p>Each guest also needs fresh air (about 25–30 m³/h), which raises H<sub>V</sub>: the real number is higher.</p>' };
    }),
    { type: 'mc', ref: 'Section 06', prompt: 'The same Ithaca weather file gives 3,568 K·d as US HDD (base 18.3 °C) and 3,881 K·d as German G<sub>t</sub>20/15. Why does the German figure differ?', options: ['It measures from 20 °C, but only counts days with a mean below the 15 °C heating limit', 'It uses Fahrenheit', 'It includes cooling degree days', 'It uses hourly instead of daily temperatures'], correct: 0,
      solution: '<p>VDI 3807 G<sub>t</sub>20/15 sums (20 − θe,mean) over the heating days (θe,mean < 15 °C). The US convention sums (18.3 − θe,mean) over all days below 18.3 °C (65 °F). Always state the base, the limit and the weather file with a degree-day value.</p>' },
  ];
}

