// Self-tests for the solar chapters: geometry (Chapter 02), radiation (Chapter 05), sun paths and shading (Chapter 04).
// Numeric questions regenerate their values; every solution is written with the
// equation numbers used in the chapters, which run on from one chapter to the next.
import { RAD, declination, equationOfTime, calendarDate, formatHour, solarPosition } from './solar.js';

const sind = d => Math.sin(d * RAD), cosd = d => Math.cos(d * RAD), tand = d => Math.tan(d * RAD);
const n = (x, d = 2) => x.toFixed(d).replace('-', '−');
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const between = (a, b, step = 1) => a + Math.round(Math.random() * (b - a) / step) * step;
const eq = s => `<p class="quiz-eq">${s}</p>`;

function numeric(ref, unit, tolerance, make, extra = {}) {
  const q = { type: 'num', ref, unit, tolerance, ...extra };
  q.regenerate = (first = false) => Object.assign(q, make(first));
  q.regenerate(true);
  return q;
}

/** Chapter 02: sun position, time, declination, altitude and azimuth. */
export function solarQuizQuestions() {
  return [
    { type: 'mc', ref: 'Section 02', prompt: 'Which solar angle is measured in the horizontal plane?', options: ['Altitude (ALT)', 'Azimuth (AZI)', 'Zenith angle (ZEN)', 'Declination (DEC)'], correct: 1,
      solution: '<p>AZI is measured in plan from a reference direction. ALT and ZEN are measured in a vertical plane through the sun; DEC is an angle between the earth–sun line and the equatorial plane, not a site angle.</p>' },
    { type: 'mc', ref: 'Section 02', prompt: 'The sun stands exactly south-west of the site. What is its azimuth AZI?', options: ['45°', '135°', '225°', '315°'], correct: 2,
      solution: `${eq('AZI = 180° (south) + 45° = 225°')}<p>Azimuth is measured in plan from north, clockwise: east 90°, south 180°, west 270°. South-west lies halfway between south and west.</p>` },
    { type: 'mc', ref: 'Section 04', prompt: 'Why is it colder in Ithaca in January than in July?', options: ['The earth is farther from the sun in January', 'The tilt of the earth’s axis gives lower sun altitudes and shorter days in January', 'The equation of time is negative in January', 'The sun’s output is lower in winter'], correct: 1,
      solution: '<p>The earth is closest to the sun around Jan 3 (147.1 million km). The 23.45° axial tilt reduces the noon altitude (Eq. 5) and the day length (Eq. 9) in the northern winter; the cosine law (Chapter 05, Eq. 23) and the longer atmospheric path reduce the irradiance on the ground.</p>' },
    numeric('Section 05 · Eq. 2, 3', '(hh:mm)', 2 / 60, first => {
      const day = first ? 56 : between(1, 365), hh = first ? 11 : between(8, 16), mm = first ? 30 : pick([0, 15, 30, 45]), dst = first ? false : day > 70 && day < 307 && Math.random() < .7;
      const eot = equationOfTime(day), clock = hh + mm / 60, std = clock - (dst ? 1 : 0), solar = std + (-6 + eot) / 60;
      return { time: true, answer: solar, answerText: formatHour(solar),
        prompt: `Ithaca (76.5° W, standard meridian 75° W). ${calendarDate(day)} (NDY ${day}), the clock shows ${formatHour(clock)} ${dst ? 'EDT (daylight saving)' : 'EST'}. EOT = ${n(eot, 1)} min. What is the solar time?`,
        solution: `${dst ? eq(`T<sub>standard</sub> = ${formatHour(clock)} − 60 min = ${formatHour(std)}`) : ''}${eq(`T<sub>solar</sub> = ${formatHour(std)} + 4 × (75 − 76.5) + (${n(eot, 1)}) = ${formatHour(std)} − 6 ${eot < 0 ? '−' : '+'} ${n(Math.abs(eot), 1)} min = ${formatHour(solar)}`)}` };
    }, { placeholder: 'hh:mm' }),
    numeric('Section 06 · Eq. 4', '°', 0.3, first => {
      const day = first ? 111 : between(1, 365), arg = 360 / 365 * (284 + day), d = declination(day);
      return { answer: d, answerText: `${n(d, 2)}°`, prompt: `Calculate DEC for ${calendarDate(day)} (NDY = ${day}).`,
        solution: eq(`DEC = 23.45° × sin[360/365 × (284 + ${day})] = 23.45° × sin(${n(arg % 360, 1)}°) = ${n(d, 2)}°`) };
    }),
    numeric('Section 06 · Eq. 5', '°', 0.5, first => {
      const lat = first ? 42.4 : pick([-1, 1]) * between(25, 60, .5), [day, name] = first ? [355, 'Dec 21'] : pick([[355, 'Dec 21'], [172, 'Jun 21'], [80, 'Mar 21']]), d = declination(day), a = 90 - Math.abs(lat - d);
      return { answer: a, answerText: `${n(a, 1)}°`, prompt: `Noon altitude at LAT = ${n(Math.abs(lat), 1)}° ${lat > 0 ? 'N' : 'S'} on ${name} (DEC = ${n(d, 2)}°)?`,
        solution: eq(`ALT<sub>noon</sub> = 90° − |LAT − DEC| = 90° − |${n(lat, 1)}° − (${n(d, 2)}°)| = ${n(a, 1)}°`) + `<p>The sun is due ${lat > d ? 'south' : 'north'} at noon.</p>` };
    }),
    numeric('Section 07 · Eq. 6, 7', '°', 0.5, first => {
      const lat = first ? 42.4 : between(25, 55, .5), day = first ? 80 : pick([21, 52, 80, 111, 141, 172, 202, 233, 264, 294, 325, 355]), t = first ? 10 : pick([8, 9, 10, 11, 13, 14, 15, 16]);
      const d = declination(day), h = 15 * (t - 12), s = sind(d) * sind(lat) + cosd(d) * cosd(lat) * cosd(h), a = Math.asin(s) / RAD;
      return { answer: a, answerText: `${n(a, 1)}°`, prompt: `LAT = ${n(lat, 1)}° N, DEC = ${n(d, 2)}°, ${t}:00 solar time. Calculate ALT.`,
        solution: eq(`HRA = 15 × (${t} − 12) = ${h}°`) + eq(`sin ALT = sin ${n(d, 2)}° · sin ${n(lat, 1)}° + cos ${n(d, 2)}° · cos ${n(lat, 1)}° · cos ${h}° = ${n(s, 4)}`) + eq(`ALT = arcsin(${n(s, 4)}) = ${n(a, 1)}°`) };
    }),
    { type: 'mc', ref: 'Section 07 · Eq. 8', prompt: 'At 15:00 solar time the arccos expression of Eq. 8 returns AZI′ = 120°. What is the solar azimuth?', options: ['120°', '60°', '240°', '300°'], correct: 2,
      solution: `${eq('HRA = 15 × (15 − 12) = +45° &gt; 0 → afternoon → AZI = 360° − 120° = 240°')}<p>arccos only returns 0°–180°; afternoon sun is west of the meridian.</p>` },
  ];
}

/** Chapter 04: sun-path diagrams, masks, shading devices and shadows. */
export function shadingQuizQuestions() {
  return [
    numeric('Section 01 · Eq. 14', '°', 0.5, first => {
      const r = first ? 0.5 : between(.15, .9, .05), a = 90 - 2 * Math.atan(r) / RAD;
      return { answer: a, answerText: `${n(a, 1)}°`, prompt: `On a stereographic chart of radius R, a sun position lies at r = ${n(r, 2)} R from the center. What is its altitude?`,
        solution: eq(`r/R = tan(ZEN/2) → ZEN = 2 × arctan(${n(r, 2)}) = ${n(90 - a, 1)}°`) + eq(`ALT = 90° − ZEN = ${n(a, 1)}°`) + '<p>Not 45°: altitude rings are not equally spaced.</p>' };
    }),
    numeric('Section 02 · Eq. 15', '°', 0.5, first => {
      const H = first ? 12 : between(4, 40), D = first ? 20 : between(6, 60), a = Math.atan(H / D) / RAD;
      return { answer: a, answerText: `${n(a, 1)}°`, prompt: `A neighboring building rises ${H} m above a window sill, at a horizontal distance of ${D} m. What is the obstruction angle perpendicular to its face?`,
        solution: eq(`ALT<sub>obs</sub> = arctan(H / D) = arctan(${H} / ${D}) = ${n(a, 1)}°`) + '<p>Whenever the sun is lower than this (within the azimuth range of the building), the sill is shaded.</p>' };
    }),
    numeric('Section 03 · Eq. 16, 17', '°', 0.5, first => {
      const alt = first ? 40 : between(15, 65), ori = first ? 180 : pick([90, 135, 180, 225, 270]), hsa = first ? 45 : pick([-60, -45, -30, -15, 15, 30, 45, 60]), azi = (ori + hsa + 360) % 360;
      const v = Math.atan(tand(alt) / cosd(hsa)) / RAD;
      return { answer: v, answerText: `${n(v, 1)}°`, prompt: `Sun: ALT = ${alt}°, AZI = ${azi}°. Facade ORI = ${ori}°. Calculate the profile angle (VSA).`,
        solution: eq(`HSA = AZI − ORI = ${azi}° − ${ori}° = ${hsa}°`) + eq(`VSA = arctan(tan ${alt}° / cos ${hsa}°) = arctan(${n(tand(alt), 3)} / ${n(cosd(hsa), 3)}) = ${n(v, 1)}°`) + '<p>VSA ≥ ALT whenever the sun is oblique to the facade.</p>' };
    }),
    numeric('Section 03 · Eq. 19', 'm', 0.03, first => {
      const H = first ? 1.5 : between(1.2, 2.4, .1), G = first ? 0.3 : between(.1, .5, .1), v = first ? 60 : between(35, 75), D = (H + G) / tand(v);
      return { answer: D, answerText: `${n(D, 2)} m`, prompt: `A window of height H = ${n(H, 1)} m has an overhang G = ${n(G, 1)} m above its head. Minimum overhang depth D for full shade at VSA = ${v}°?`,
        solution: eq(`D = (H + G) / tan VSA = ${n(H + G, 1)} / tan ${v}° = ${n(H + G, 1)} / ${n(tand(v), 3)} = ${n(D, 2)} m`) };
    }),
    { type: 'mc', ref: 'Section 03 · Lechner 9.7', prompt: 'Which date should be used to check that a fixed south overhang shades the window for the whole overheated period?', options: ['June 21, because the sun is highest', 'December 21, because the sun is lowest', 'The last day of the overheated period, because the sun is lowest on that day within the period', 'March 21, because day and night are equal'], correct: 2,
      solution: '<p>On Jun 21 the sun is highest and easiest to shade. Within the overheated period the noon sun is lowest on its first or last day; an overhang that reaches the sun ray of that day shades the window for the whole period (Lechner 9.7, Szokolay 1.4.1).</p>' },
    { type: 'mc', ref: 'Section 03 · Eq. 17', prompt: 'Why are horizontal overhangs ineffective on west facades on summer afternoons?', options: ['ALT is low and the sun is nearly in front of the facade, so VSA is small', 'HSA exceeds 90°', 'The equation of time is positive in summer', 'Diffuse radiation dominates in the afternoon'], correct: 0,
      solution: `${eq('HSA ≈ 0 → VSA ≈ ALT, and ALT is small → D = (H + G)/tan VSA becomes very large')}<p>Use vertical fins angled toward north, movable screens, or exterior blinds instead.</p>` },
    numeric('Section 04 · Eq. 22', 'm', 0.1, first => {
      const H = first ? 10 : between(3, 30), lat = 42.4, day = first ? 80 : pick([21, 80, 172, 264, 355]), t = first ? 9 : pick([9, 10, 11, 12, 13, 14, 15]);
      const s = solarPosition(lat, day, t), L = H / tand(s.altitude);
      return { answer: L, answerText: `${n(L, 2)} m`, prompt: `Ithaca, ${calendarDate(day)}, ${t}:00 solar time: ALT = ${n(s.altitude, 1)}°, AZI = ${n(s.azimuth, 1)}°. How long is the shadow of a ${H} m vertical edge on level ground?`,
        solution: eq(`L = H / tan ALT = ${H} / tan ${n(s.altitude, 1)}° = ${n(L, 2)} m`) + eq(`direction = AZI + 180° = ${n((s.azimuth + 180) % 360, 1)}°`) };
    }),
  ];
}

/** Chapter 05: cosine law, angle of incidence and the components of the irradiance on a surface. */
export function radiationQuizQuestions() {
  return [
    numeric('Section 01 · Eq. 23', 'W/m²', 5, first => {
      const G = first ? 800 : between(400, 950, 50), alt = first ? 30 : between(10, 75), Gh = G * sind(alt);
      return { answer: Gh, answerText: `${n(Gh, 0)} W/m²`, prompt: `The direct normal irradiance is G<sub>n</sub> = ${G} W/m² and the sun stands at ALT = ${alt}°. What beam irradiance reaches a horizontal roof?`,
        solution: eq(`G<sub>h</sub> = G<sub>n</sub> · sin ALT = ${G} × sin ${alt}° = ${G} × ${n(sind(alt), 3)} = ${n(Gh, 0)} W/m²`) + '<p>The same beam is spread over 1 / sin ALT times the area it would cover at normal incidence.</p>' };
    }),
    numeric('Section 02 · Eq. 26', '°', 0.5, first => {
      const alt = first ? 24 : between(10, 70), azi = first ? 180 : pick([120, 150, 165, 180, 195, 210, 240]), tilt = first ? 90 : pick([0, 30, 45, 60, 90]), ori = first ? 180 : pick([135, 180, 225]);
      const ci = sind(alt) * cosd(tilt) + cosd(alt) * sind(tilt) * cosd(azi - ori), inc = Math.acos(ci) / RAD;
      return { answer: inc, answerText: `${n(inc, 1)}°`, prompt: `Sun: ALT = ${alt}°, AZI = ${azi}°. Surface: TLT = ${tilt}°, ORI = ${ori}°. Calculate the angle of incidence INC.`,
        solution: eq(`cos INC = sin ${alt}° · cos ${tilt}° + cos ${alt}° · sin ${tilt}° · cos(${azi}° − ${ori}°)`) + eq(`= ${n(sind(alt) * cosd(tilt), 4)} + ${n(cosd(alt) * sind(tilt) * cosd(azi - ori), 4)} = ${n(ci, 4)}`) + eq(`INC = arccos(${n(ci, 4)}) = ${n(inc, 1)}°`) };
    }),
    { type: 'mc', ref: 'Section 02 · Eq. 26', prompt: 'Ithaca, a June afternoon: ALT = 20°, AZI = 290°. How much beam radiation does the south facade (TLT = 90°, ORI = 180°) receive?', options: ['G<sub>n</sub> · sin 20°', 'G<sub>n</sub> · cos 20°', 'None: cos INC is negative, the sun is behind the facade', 'Half of G<sub>n</sub>'], correct: 2,
      solution: `${eq('cos INC = sin 20° · cos 90° + cos 20° · sin 90° · cos(290° − 180°) = 0 + 0.940 × (−0.342) = −0.321')}<p>A negative cos INC means the sun lies behind the surface. In summer the sun rises and sets north of east and west, so a south facade loses its beam in the early morning and late afternoon.</p>` },
    numeric('Section 03 · Eq. 28', 'W/m²', 2, first => {
      const dhi = first ? 120 : between(60, 300, 10), tilt = first ? 90 : pick([30, 45, 60, 90]), g = dhi * (1 + cosd(tilt)) / 2;
      return { answer: g, answerText: `${n(g, 0)} W/m²`, prompt: `Diffuse horizontal irradiance DHI = ${dhi} W/m². With an isotropic sky, what sky-diffuse irradiance reaches a surface tilted TLT = ${tilt}°?`,
        solution: eq(`G<sub>d</sub> = DHI · (1 + cos TLT) / 2 = ${dhi} × (1 + ${n(cosd(tilt), 3)}) / 2 = ${n(g, 0)} W/m²`) + '<p>A vertical surface sees half the sky dome; the other half of its view is ground.</p>' };
    }),
    numeric('Section 03 · Eq. 27–30', 'W/m²', 5, first => {
      const dni = first ? 700 : between(300, 900, 50), dhi = first ? 100 : between(60, 200, 10), alt = first ? 24 : between(15, 60), ci = first ? 0.91 : between(.3, .95, .01), rho = first ? 0.2 : pick([0.2, 0.3, 0.8]), tilt = 90;
      const ghi = dni * sind(alt) + dhi, b = dni * ci, d = dhi / 2, r = rho * ghi / 2, t = b + d + r;
      return { answer: t, answerText: `${n(t, 0)} W/m²`, prompt: `A vertical facade (TLT = 90°): DNI = ${dni} W/m², DHI = ${dhi} W/m², ALT = ${alt}°, cos INC = ${n(ci, 2)}, ground reflectance ρ = ${rho}. What is the total irradiance on the facade?`,
        solution: eq(`G<sub>b</sub> = ${dni} × ${n(ci, 2)} = ${n(b, 0)} W/m²`) + eq(`G<sub>d</sub> = ${dhi} × (1 + 0) / 2 = ${n(d, 0)} W/m²`) + eq(`GHI = ${dni} × sin ${alt}° + ${dhi} = ${n(ghi, 0)} W/m² → G<sub>r</sub> = ${rho} × ${n(ghi, 0)} × (1 − 0) / 2 = ${n(r, 0)} W/m²`) + eq(`G<sub>t</sub> = ${n(b, 0)} + ${n(d, 0)} + ${n(r, 0)} = ${n(t, 0)} W/m²`) };
    }),
    { type: 'mc', ref: 'Section 04 · Eq. 31', prompt: 'Ithaca weather file: in January a south facade receives about 72 kWh/m², a flat roof only 53 kWh/m². In June the roof receives about 181 kWh/m², more than twice the facade. Why?', options: ['The earth is closest to the sun in January', 'The low winter sun strikes the facade near its normal (small INC) and the roof at a grazing angle; the high summer sun does the opposite and sets behind the facade', 'Snow raises the diffuse sky radiation in January', 'The equation of time is negative in January'], correct: 1,
      solution: '<p>Noon, Dec 21: ALT ≈ 24°, so cos INC ≈ 0.91 on the south wall but sin ALT ≈ 0.41 on the roof. Noon, Jun 21: ALT ≈ 71°, so cos INC ≈ 0.33 on the wall and 0.95 on the roof, and the sun is behind the wall in the early morning and late afternoon. Snow raises the ground-reflected part on the wall, not the sky part; the earth–sun distance changes the irradiance by only about ±3 %.</p>' }
  ];
}
