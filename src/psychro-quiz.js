// Self-test of the chapter on humid air (psychrometrics). Numeric questions regenerate their values;
// each solution cites the section and the equation. ch is the displayed chapter number from content/book.json.
import { saturationPressure, humidityFromPressure, pressureFromHumidity, humidityFromRH, dewPointFromHumidity, process, stateFrom, CP_AIR, CP_VAPOUR } from './psychro.js';

const n = (x, d = 2) => x.toFixed(d).replace('-', '−');
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const between = (a, b, step = 1) => a + Math.round(Math.random() * (b - a) / step) * step;
const eq = s => `<p class="quiz-eq">${s}</p>`;

function numeric(ref, unit, tolerance, make) {
  const q = { type: 'num', ref, unit };
  // A variant outside the question's range (saturated air, nothing condenses) returns NaN and is drawn again.
  q.regenerate = (first = false) => { let v; do { v = make(first); first = false; } while (!Number.isFinite(v.answer)); Object.assign(q, v); q.tolerance = typeof tolerance === 'function' ? tolerance(q.answer) : tolerance; return q; };
  q.regenerate(true);
  return q;
}

export function psychroQuizQuestions(ch = 9) {
  const E = i => `Eq. ${ch}.${i}`;
  return [
    numeric(`Section 01 · ${E(2)}`, 'g/kg', 0.15, first => {
      const pv = first ? 2 : between(.8, 3.2, .1), ah = humidityFromPressure(pv);
      return { answer: ah, answerText: `${n(ah, 1)} g/kg`, prompt: `The vapor pressure of the air is p<sub>v</sub> = ${n(pv, 1)} kPa at sea level (p = 101.325 kPa). What is its absolute humidity AH?`,
        solution: eq(`AH = 622 · p<sub>v</sub> / (p − p<sub>v</sub>) = 622 × ${n(pv, 1)} / (101.325 − ${n(pv, 1)}) = ${n(ah, 1)} g/kg`) + '<p>The example of Szokolay §1.1.3. Vapor pressure and AH are two scales for the same moisture content.</p>' };
    }),
    numeric(`Section 01 · ${E(1)}–${E(3)}`, '%', 1.5, first => {
      const t = first ? 25 : between(15, 32), ah = first ? 10 : between(4, 14, .5), ps = saturationPressure(t), pv = pressureFromHumidity(ah), rh = 100 * pv / ps;
      if (rh > 98) return { answer: NaN };
      return { answer: rh, answerText: `${n(rh, 0)} %`, prompt: `Air at ${t} °C holds ${n(ah, 1)} g of water vapor per kg of dry air. What is its relative humidity?`,
        solution: eq(`p<sub>s</sub>(${t} °C) = 0.6112 · exp(17.62 × ${t} / (243.12 + ${t})) = ${n(ps, 3)} kPa`) + eq(`p<sub>v</sub> = AH · p / (622 + AH) = ${n(ah, 1)} × 101.325 / ${n(622 + ah, 1)} = ${n(pv, 3)} kPa`) + eq(`RH = p<sub>v</sub> / p<sub>s</sub> = ${n(rh, 0)} %`) + `<p>Approximately AH / SH: ${n(ah, 1)} / ${n(humidityFromPressure(ps), 1)} = ${n(100 * ah / humidityFromPressure(ps), 0)} %.</p>` };
    }),
    numeric(`Section 02 · ${E(4)}`, '°C', 0.4, first => {
      const t = first ? 20 : between(18, 26), rh = first ? 50 : between(30, 70, 5), ah = humidityFromRH(t, rh), d = dewPointFromHumidity(ah);
      return { answer: d, answerText: `${n(d, 1)} °C`, prompt: `Room air is at ${t} °C and ${rh} % RH. Below which surface temperature will it condense (dew point)?`,
        solution: eq(`p<sub>v</sub> = ${rh} % × p<sub>s</sub>(${t} °C) = ${n(rh / 100 * saturationPressure(t), 3)} kPa · AH = ${n(ah, 1)} g/kg`) + eq(`DPT: p<sub>s</sub>(θ<sub>d</sub>) = p<sub>v</sub> → θ<sub>d</sub> = ${n(d, 1)} °C`) + '<p>On the chart: move horizontally left from the status point to the saturation curve.</p>' };
    }),
    { type: 'mc', ref: `Section 05 · ${E(8)}`, prompt: 'Outdoor air at 5 °C and 80 % RH is heated to 20 °C in a radiator-heated room without adding moisture. What happens?', options: ['AH stays at 4.3 g/kg; RH falls to about 30 %', 'RH stays at 80 %; the air holds more water', 'AH and RH both fall', 'RH rises because warm air carries more moisture'], correct: 0,
      solution: `${eq('heating: horizontal move to the right; AH = 4.3 g/kg, SH(20 °C) = 14.7 g/kg → RH ≈ 30 %')}<p>The lecture example. This is why heated rooms are dry in winter and why humidifiers sit on radiators.</p>` },
    numeric(`Section 04 · ${E(6)}`, 'kJ', a => Math.max(.3, .03 * Math.abs(a)), first => {
      const m = first ? 1 : between(1, 5), t1 = first ? 5 : between(-5, 15), t2 = first ? 20 : t1 + between(5, 20), ah = first ? 4.3 : between(2, 6, .5);
      const c = CP_AIR + CP_VAPOUR * ah / 1000, q = m * c * (t2 - t1);
      return { answer: q, answerText: `${n(q, 1)} kJ`, prompt: `How much heat warms ${m} kg of (dry) air with AH = ${n(ah, 1)} g/kg from ${t1} °C to ${t2} °C, without changing its moisture content?`,
        solution: eq(`c = 1.006 + 1.86 × ${n(ah / 1000, 4)} = ${n(c, 3)} kJ/(kg·K)`) + eq(`q = m · c · Δθ = ${m} × ${n(c, 3)} × ${t2 - t1} = ${n(q, 1)} kJ`) + `<p>Sensible heat only: Δh along a horizontal line. The lecture rounds c to 1 kJ/(kg·K), which gives ${n(m * (t2 - t1), 0)} kJ.</p>` };
    }),
    numeric(`Section 05 · ${E(4)}, ${E(8)}`, 'g/kg', 0.4, first => {
      const t = first ? 29 : between(24, 32), rh = first ? 60 : between(50, 80, 5), t2 = first ? 15 : between(8, 16), r = process(stateFrom({ t, rh }), 'sensible', t2);
      if (r.water <= .3) return { answer: NaN };
      return { answer: r.water, answerText: `${n(r.water, 1)} g/kg`, prompt: `Air at ${t} °C and ${rh} % RH is cooled to ${t2} °C over a cooling coil. How much water condenses per kg of dry air?`,
        solution: eq(`AH<sub>1</sub> = ${n(r.a.ah, 1)} g/kg, dew point ${n(r.a.dew, 1)} °C`) + eq(`below the dew point the air stays saturated: AH<sub>2</sub> = SH(${t2} °C) = ${n(r.b.ah, 1)} g/kg`) + eq(`condensate = ${n(r.a.ah, 1)} − ${n(r.b.ah, 1)} = ${n(r.water, 1)} g/kg`) + '<p>Szokolay §1.1.3: 29 °C, 60 % cooled to 15 °C gives 15.2 − 10.5 = 4.7 g/kg.</p>' };
    }),
    { type: 'mc', ref: `Section 05 · ${E(5)}`, prompt: 'Water evaporates into hot, dry air with no heat added or removed (a fountain, a wet pad, a malqaf). Along which line does the status point move?', options: ['Up and to the left along a wet-bulb line, almost a line of constant enthalpy', 'Horizontally to the left at constant AH', 'Down and to the right along an enthalpy line', 'Up the saturation curve'], correct: 0,
      solution: '<p>Adiabatic humidification: the latent heat of evaporation comes from the air, so DBT falls while AH and RH rise; total heat stays (almost) the same. The air cannot be cooled below its wet-bulb temperature. A sorbent does the opposite: down and to the right along an enthalpy line.</p>' },
    numeric(`Section 06 · ${E(8)}`, 'W', a => Math.max(5, .04 * a), first => {
      const V = first ? 300 : between(100, 1200, 50), x1 = first ? 14 : between(10, 18, .5), x2 = first ? 9 : between(7, 10, .5), rho = 1.2;
      const phi = rho * V / 3600 * (x1 - x2) / 1000 * 2450 * 1000;
      return { answer: phi, answerText: `${n(phi, 0)} W`, prompt: `A ventilation system supplies ${V} m³/h of outdoor air with AH = ${n(x1, 1)} g/kg; the room is held at ${n(x2, 1)} g/kg. What latent cooling load does the moisture add? (ρ = 1.2 kg/m³, h<sub>fg</sub> ≈ 2450 kJ/kg)`,
        solution: eq(`ṁ = ρ · V̇ = 1.2 × ${V} / 3600 = ${n(rho * V / 3600, 4)} kg/s`) + eq(`Φ<sub>L</sub> = ṁ · ΔAH · h<sub>fg</sub> = ${n(rho * V / 3600, 4)} × ${n((x1 - x2) / 1000, 4)} × 2 450 000 = ${n(phi, 0)} W`) + '<p>In humid climates the latent load of ventilation air can exceed its sensible load.</p>' };
    }),
    { type: 'mc', ref: `Section 02 · ${E(5)}`, prompt: 'A sling psychrometer reads the same temperature on the wet and the dry bulb. What is the relative humidity?', options: ['100 %: saturated air, no evaporation from the wick', '0 %: completely dry air', '50 %', 'It cannot be determined without the dew point'], correct: 0,
      solution: '<p>The wet-bulb depression (DBT − WBT) measures how fast water evaporates. In saturated air nothing evaporates, so WBT = DBT = DPT. All three lines meet on the saturation curve.</p>' },
  ];
}
