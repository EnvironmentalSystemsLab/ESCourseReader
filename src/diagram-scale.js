// Each figure is drawn in its own viewBox and stretched to its column, so one drawing unit
// becomes anything from 0.3 to 1.7 screen pixels. Strokes are drawn non-scaling (solar.css);
// this sets --u (drawing units per screen pixel) on every diagram so its text, sized by --fs,
// shows at the same pixel size in every figure. Text never grows past its size in drawing
// units, since labels are laid out at that size: in figures shown below 1:1 it shrinks with them.
const U_MIN = .5, U_MAX = 1;

export function fitDiagramText(root = document.body) {
  if (typeof ResizeObserver === 'undefined') return;
  const resize = new ResizeObserver(entries => {
    for (const { target } of entries) {
      const vb = target.viewBox?.baseVal, w = target.getBoundingClientRect().width;
      if (vb?.width && w) target.style.setProperty('--u', Math.min(U_MAX, Math.max(U_MIN, vb.width / w)).toFixed(3));
    }
  });
  const watch = node => {
    if (node.nodeType !== 1) return;
    if (node.matches('svg.diagram')) resize.observe(node);
    node.querySelectorAll('svg.diagram').forEach(svg => resize.observe(svg));
  };
  watch(root);
  // Interactive diagrams are redrawn as new SVG elements.
  new MutationObserver(records => records.forEach(r => r.addedNodes.forEach(watch))).observe(root, { childList: true, subtree: true });
}
