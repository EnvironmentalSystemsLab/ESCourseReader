// Chapter 03, drawing shadows by hand: the figures are static, so the page
// script only runs the mini quiz and the navigation.
import { sketchQuizQuestions } from './sketch-quiz.js';
import { mountQuiz } from './quiz-ui.js';
import { mountNav } from './nav.js';
import { fitDiagramText } from './diagram-scale.js';

mountQuiz(sketchQuizQuestions());
mountNav();
fitDiagramText();
