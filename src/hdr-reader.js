// Chapter 06, HDR photography: the exposure explorer, the mini quiz and the navigation.
// The figures are static; the page reads without JavaScript.
import { SHUTTER, hdrQuizQuestions } from './hdr-quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';

function mountExposureExplorer() {
  const host = document.getElementById('exposure-explorer');
  if (!host) return;
  const slider = document.getElementById('exposure-range'), photo = document.getElementById('exposure-image');
  const update = () => {
    const i = Number(slider.value), frame = String(418 + i).padStart(4, '0'), [shutter, seconds] = SHUTTER[i];
    const stops = Math.log2(SHUTTER[0][1] / seconds);
    photo.src = `./assets/hdr/fisheye-${frame}.webp`;
    photo.alt = `Example fisheye exposure IMG_${frame}.JPG at ${shutter}`;
    document.getElementById('exposure-label').textContent = `IMG_${frame}.JPG · ${shutter} · f/4 · ISO 200`;
    document.getElementById('exposure-position').textContent = `${i + 1} / ${SHUTTER.length}`;
    document.getElementById('exposure-stops').textContent = i ? `${stops.toFixed(2)} stops shorter than the first frame (Eq. 6.1)` : 'First, longest frame';
    slider.setAttribute('aria-valuetext', `${shutter}, frame ${i + 1} of ${SHUTTER.length}`);
  };
  slider.addEventListener('input', update);
  update();
  host.hidden = false;
}

mountExposureExplorer();
mountQuiz(hdrQuizQuestions());
mountNav();
fitDiagramText();
