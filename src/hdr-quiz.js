// Mini quiz for Chapter 06, HDR photography. Numeric questions regenerate their
// values; solutions cite the sections and equation numbers.
export const SHUTTER = [['1.3 s', 1.3], ['1 s', 1], ['0.6 s', .6], ['0.4 s', .4], ['1/4 s', 1 / 4], ['1/5 s', 1 / 5], ['1/8 s', 1 / 8], ['1/13 s', 1 / 13], ['1/20 s', 1 / 20], ['1/30 s', 1 / 30], ['1/50 s', 1 / 50]];

const n = (x, d = 2) => x.toFixed(d).replace('-', '−');
const between = (a, b, step = 1) => a + Math.round(Math.random() * (b - a) / step) * step;
const eq = s => `<p class="quiz-eq">${s}</p>`;

function numeric(ref, unit, tolerance, make) {
  const q = { type: 'num', ref, unit, tolerance };
  q.regenerate = (first = false) => Object.assign(q, make(first));
  q.regenerate(true);
  return q;
}

export function hdrQuizQuestions() {
  return [
    { type: 'mc', ref: 'Section 01', prompt: 'A lux meter lies face up on a desk. What does it measure?', options: ['Illuminance: light arriving on the desk plane', 'Luminance of the desk surface', 'Luminance of the window', 'The reflectance of the desk'], correct: 0,
      solution: '<p>Illuminance E, in lux, is light arriving on a plane from every direction above it. Luminance L, in cd/m², is light leaving a surface in one direction, toward the lens or the eye.</p>' },
    numeric('Section 04 · Eq. 6.1', 'stops', 0.05, first => {
      const i = first ? 0 : between(0, 5), j = first ? 10 : between(i + 3, 10), [a, ta] = SHUTTER[i], [b, tb] = SHUTTER[j], s = Math.log2(ta / tb);
      return { answer: s, answerText: n(s, 2), prompt: `At fixed aperture and ISO, how many stops lie between exposures of ${a} and ${b}?`,
        solution: eq(`Δ = log₂(${n(ta, 3)} / ${n(tb, 3)}) = ${n(s, 2)}`) + '<p>Each stop halves or doubles the light collected; the bracket range is the ratio of the longest and shortest shutter times.</p>' };
    }),
    numeric('Section 05 · Eq. 6.2', 'cm', 0.15, first => {
      const D = first ? 3 : between(2, 8, .5), th = first ? 1 : [1, 1 / 3][between(0, 1)], d = 2 * D * Math.tan(th / 2 * Math.PI / 180) * 100;
      return { answer: d, answerText: n(d, 2), prompt: `A spot luminance meter with a ${th === 1 ? '1°' : '1/3°'} acceptance angle is aimed at a wall ${n(D, 1)} m away. How wide is the measured spot?`,
        solution: eq(`d = 2 · ${n(D, 1)} m · tan(${n(th / 2, 3)}°) × 100 = ${n(d, 2)}`) + '<p>The uniform patch must be clearly larger than this spot, so that aiming errors stay inside it.</p>' };
    }),
    numeric('Section 06 · Eq. 6.3', '', 0.01, first => {
      const img = first ? 120 : between(40, 400, 5), m = first ? 150 : Math.round(img * between(.7, 1.4, .01));
      const f = m / img;
      return { answer: f, answerText: n(f, 3), prompt: `A matte target reads ${img} in the unscaled HDR and ${m} cd/m² on the spot meter. What scale factor does this single point imply?`,
        solution: eq(`k = ${m} / ${img} = ${n(f, 3)}`) + '<p>LumiSnap combines several valid points and shows each residual. Keep one target out of the fit to check the result independently.</p>' };
    }),
    { type: 'mc', ref: 'Section 04', prompt: 'A window is clipped in every exposure of the bracket. What does the merged HDR record there?', options: ['An unknown value: the merge cannot recover it', 'Its correct luminance, recovered from the longest exposure', 'Its correct luminance, recovered from the overlap', 'Its luminance after calibration with a spot reading'], correct: 0,
      solution: '<p>HDR combines measurements; it cannot invent them. Extend the bracket with shorter exposures, or a characterized ND filter, until each important source is below clipping in at least one frame.</p>' },
    { type: 'mc', ref: 'Section 03', prompt: 'You raise the ISO from 100 to 800 at the same shutter time. What changes?', options: ['Signal gain rises; highlight headroom may fall', 'The sensor collects eight times more light', 'The lens geometry and vignetting change', 'Nothing that matters for calibration'], correct: 0,
      solution: '<p>ISO amplifies the signal; it does not collect more photons. Keep a fixed, low native ISO for the whole bracket and change only the shutter time.</p>' },
    { type: 'mc', ref: 'Section 02', prompt: 'Which capture can be used for the LumiSnap glare workflow (DGP with evalglare)?', options: ['A calibrated 180° fisheye view at the eye position, along the gaze direction', 'An iPhone Ultra Wide capture of the same view', 'A normal-lens view of the window', 'Any calibrated HDR, after cropping to the window'], correct: 0,
      solution: '<p>Glare depends on source luminance, size and position across the whole forward hemisphere, and on the eye illuminance. A narrower view omits sources and distorts their size and position.</p>' },
    { type: 'mc', ref: 'Section 06', prompt: 'Which check is an independent validation of a calibrated HDR?', options: ['A spot target not used in the fit, and the measured Ev at the lens', 'The residuals of the targets used in the fit', 'A false-color image that looks plausible', 'Rescaling until every target agrees'], correct: 0,
      solution: '<p>Targets used to fit the scale cannot test it. Compare a held-out target, and the vertical illuminance Ev measured at the lens with the Ev integrated from the fisheye HDR. Report disagreements.</p>' },
    numeric('Section 07 · Eq. 6.7', '', 0.01, first => {
      const L = first ? 40 : between(10, 60), E = first ? 250 : between(250, 600, 10), rho = Math.PI * L / E;
      return { answer: rho, answerText: n(rho, 3), prompt: `A matte plaster sample reads L = ${L} cd/m² in the calibrated HDR. A lux sensor flat against it reads E = ${E} lx. What is its reflectance ρ?`,
        solution: eq(`ρ = π · ${L} / ${E} = ${n(rho, 3)}`) + '<p>Valid for diffuse surfaces only, with the sensor in the plane of the sample.</p>' };
    }),
    { type: 'mc', ref: 'Section 07 · use 2', prompt: 'Two design options give the same 500 lx on the desk. Option B has lighter walls. Which metric shows that B will feel brighter?', options: ['Mean luminance in the 40° horizontal band at eye level', 'Horizontal illuminance on the desk', 'DGP at the desk', 'The luminance of the window'], correct: 0,
      solution: '<p>People judge brightness from the surfaces they look at, mostly walls within a band around eye level. Roughly 30 cd/m² mean luminance in the 40° band separates adequately lit from gloomy (Loe et al.). Desk illuminance does not see the walls at all.</p>' },
  ];
}
