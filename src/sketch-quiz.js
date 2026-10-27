// Mini quiz for Chapter 03, drawing shadows by hand. Numeric questions
// regenerate their values; solutions cite the sections and equation numbers.
import { RAD, calendarDate, solarPosition, wrap } from './solar.js';

const tand = d => Math.tan(d * RAD), cosd = d => Math.cos(d * RAD);
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

export function sketchQuizQuestions() {
  return [
    { type: 'mc', ref: 'Section 01', prompt: 'On which surfaces can a cast shadow appear?', options: ['Only on surfaces that face the sun and would otherwise be lit', 'Only on surfaces already in shade', 'On any surface, lit or in shade', 'Only on the ground plane'], correct: 0,
      solution: '<p>A shadow is the part of a lit surface where another object blocks the sun. A surface in shade is already turned away from the sun, so nothing more can be cast on it.</p>' },
    { type: 'mc', ref: 'Section 02 · rule 3', prompt: 'A flat roof edge runs parallel to level ground. What is its shadow on the ground?', options: ['A line parallel to the edge and equally long', 'A line parallel to the edge, shortened by 1 / tan ALT', 'A line along the shadow bearing AZI + 180°', 'A single point at the foot of the wall'], correct: 0,
      solution: '<p>Every point of the edge moves by the same offset along the rays, so its shadow is a copy of the edge. Construct the two end points (rule 1, Eq. 22) and join them.</p>' },
    { type: 'mc', ref: 'Section 03 · Eq. 12', prompt: 'Rays of the 45° convention appear at 45° in both plan and elevation. What is their true altitude?', options: ['45.0°', '35.3°', '54.7°', '26.6°'], correct: 1,
      solution: `${eq('ALT = arctan(1 / √2) = 35.3°')}<p>The rays follow the body diagonal of a cube. Its horizontal projection is the face diagonal, √2 long, while it rises 1.</p>` },
    numeric('Section 04 · Eq. 22', 'm', 0.1, first => {
      const H = first ? 15 : between(9, 30), h = first ? 6 : between(3, H - 4), [day, t] = first ? [80, 12] : [pick([80, 172, 355]), pick([10, 12, 14])];
      const s = solarPosition(42.4, day, t), L = (H - h) / tand(s.altitude);
      return { answer: L, answerText: `${n(L, 2)} m`, prompt: `Ithaca, ${calendarDate(day)}, ${t}:00 solar time: ALT = ${n(s.altitude, 1)}°. A ${H} m tower stands beside a flat roof at ${h} m. How far across the lower roof does the shadow of the tower's roof edge reach, measured from the tower along the bearing?`,
        solution: eq(`L = (H − h) / tan ALT = (${H} − ${h}) / tan ${n(s.altitude, 1)}° = ${n(L, 2)} m`) + eq(`bearing = AZI + 180° = ${n(wrap(s.azimuth + 180), 0)}°`) + '<p>On a lower roof, use only the height above that roof.</p>' };
    }),
    numeric('Section 05 · Eq. 17, 13', 'm', 0.03, first => {
      const w = first ? 1.2 : between(.6, 1.8, .1), alt = first ? 40 : between(25, 60), hsa = first ? 30 : pick([-45, -30, -15, 0, 15, 30, 45]);
      const vsa = Math.atan(tand(alt) / cosd(hsa)) / RAD, dv = w * tand(vsa), du = w * tand(Math.abs(hsa));
      return { answer: dv, answerText: `${n(dv, 2)} m`, prompt: `A balcony slab projects w = ${n(w, 1)} m from a facade. Sun: ALT = ${alt}°, HSA = ${hsa}°. In elevation, how far below the slab's front edge does its shadow line fall on the wall?`,
        solution: eq(`VSA = arctan(tan ${alt}° / cos ${hsa}°) = ${n(vsa, 1)}°`) + eq(`Δv = w · tan VSA = ${n(w, 1)} × ${n(tand(vsa), 3)} = ${n(dv, 2)} m`) + eq(`sideways Δu = w · tan |HSA| = ${n(du, 2)} m`) };
    }),
    { type: 'mc', ref: 'Section 05 · Eq. 13', prompt: 'With the 45° convention, a canopy projects 1.2 m from a facade. Where is the shadow of its front corner in the elevation?', options: ['1.2 m down and 1.2 m to the side', '1.2 m down, no sideways shift', '0.85 m down and 0.85 m to the side (1.2 × sin 45°)', 'It depends on the date'], correct: 0,
      solution: `${eq('HSA = VSA = 45° → Δu = Δv = w · tan 45° = w = 1.2 m')}<p>In the convention, every offset in elevation equals the depth of the projecting element.</p>` },
    { type: 'mc', ref: 'Section 07', prompt: 'In a two-point perspective the sun is behind the viewer. Where is the vanishing point of the rays, VP<sub>s</sub>?', options: ['Above the horizon, directly above VP<sub>sh</sub>', 'Below the horizon, directly below VP<sub>sh</sub>', 'On the horizon, at VP<sub>sh</sub>', 'There is none; the rays are drawn parallel'], correct: 1,
      solution: '<p>Rays travel away from the viewer and downward, so they converge below the horizon, on the vertical through VP<sub>sh</sub>. With the sun in front, VP<sub>s</sub> lies above the horizon; with the sun parallel to the picture plane, there is no VP<sub>s</sub>.</p>' },
    { type: 'mc', ref: 'Section 08', prompt: 'Which value order is right for a fine-liner rendering?', options: ['Shadow darkest, shade lighter, lit faces white', 'Shade darkest, shadow lighter, lit faces white', 'Shadow and shade equal, lit faces white', 'Lit faces lightly hatched, shade and shadow solid black'], correct: 0,
      solution: '<p>Shade still receives sky and reflected light, so it is lighter than shadow. Hatch shade at about twice the spacing used for shadow, with the same pen, and leave lit faces white.</p>' },
  ];
}
