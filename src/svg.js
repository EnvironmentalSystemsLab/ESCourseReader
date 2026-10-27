// Small SVG writer shared by the solar-geometry drawings.
// Every drawing is built twice from the same code: themed for the page, and with plain
// hex colors, named groups and real <text> for editing in Illustrator, Inkscape or Keynote.
import { colorsFor } from './palette.js';

export const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
export const f = x => Number.isFinite(x) ? (Math.round(x * 100) / 100).toString() : '0';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// One set of line weights and type sizes for every drawing (drawing units). Strokes and labels
// snap to the nearest step, so figures drawn with ad-hoc values still read as one family.
// On the page strokes are drawn non-scaling and text is corrected for the figure's scale
// (solar.css, src/diagram-scale.js), so a step looks the same in every figure.
export const LINE = { hair: .6, thin: 1, regular: 1.5, bold: 2.25, heavy: 3 };
export const TYPE = { small: 10.5, label: 12, emphasis: 14, display: 16 };
const step = (v, steps, limit) => {
  if (!Number.isFinite(v) || v > limit) return v;
  const s = Object.values(steps);
  return s.reduce((best, x) => Math.abs(x - v) < Math.abs(best - v) || (Math.abs(x - v) === Math.abs(best - v) && x > best) ? x : best, s[0]);
};
export const lineWeight = w => step(w, LINE, 3.5);
export const typeSize = s => step(s, TYPE, 19);
const attrs = o => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => `${k}="${typeof v === 'number' ? f(v) : v}"`).join(' ');

/** exact: keep stroke widths and type sizes as given (true-size print drawings such as the sundial). */
export function kit(standalone = false, prefix = 'd', { exact = false } = {}) {
  const c = colorsFor(standalone);
  const lw = w => exact ? w : lineWeight(w), ts = s => exact ? s : typeSize(s);
  const pts = arr => arr.map(p => `${f(p.x)},${f(p.y)}`).join(' ');
  const stroke = o => ({ stroke: o.stroke ?? c.ink, 'stroke-width': lw(o.width ?? 1), 'stroke-dasharray': o.dash,
    opacity: o.opacity, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'marker-end': o.arrow ? `url(#${prefix}-arrow-${o.arrow})` : undefined });
  const k = {
    c, standalone, prefix, exact,
    line: (a, b, o = {}) => `<line ${attrs({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...stroke(o) })}/>`,
    polyline: (arr, o = {}) => arr.length < 2 ? '' : `<polyline ${attrs({ points: pts(arr), fill: 'none', ...stroke(o) })}/>`,
    polygon: (arr, o = {}) => arr.length < 3 ? '' : `<polygon ${attrs({ points: pts(arr), fill: o.fill ?? 'none', 'fill-opacity': o.fillOpacity,
      ...(o.stroke === undefined && o.width === undefined ? { stroke: 'none' } : stroke(o)) })}/>`,
    path: (d, o = {}) => d ? `<path ${attrs({ d, fill: o.fill ?? 'none', 'fill-opacity': o.fillOpacity, 'fill-rule': o.rule,
      ...(o.stroke === 'none' ? { stroke: 'none' } : stroke(o)) })}/>` : '',
    circle: (p, r, o = {}) => `<circle ${attrs({ cx: p.x, cy: p.y, r, fill: o.fill ?? 'none', 'fill-opacity': o.fillOpacity,
      ...(o.stroke || o.width ? stroke(o) : { stroke: 'none' }) })}/>`,
    rect: (x, y, w, h, o = {}) => `<rect ${attrs({ x, y, width: w, height: h, rx: o.rx, fill: o.fill ?? 'none', 'fill-opacity': o.fillOpacity,
      ...(o.stroke || o.width ? stroke(o) : { stroke: 'none' }) })}/>`,
    // On the page --fs carries the size so solar.css can correct it for the figure's scale.
    text: (x, y, s, o = {}) => {
      const size = ts(o.size ?? 13);
      return `<text ${attrs({ x, y, 'font-size': size, style: standalone || exact ? undefined : `--fs:${f(size)}`, fill: o.fill ?? c.muted, 'text-anchor': o.anchor,
        'font-weight': o.weight, 'font-style': o.italic ? 'italic' : undefined, 'letter-spacing': o.spacing,
        'dominant-baseline': o.baseline, transform: o.rotate ? `rotate(${o.rotate} ${f(x)} ${f(y)})` : undefined })}>${esc(s)}</text>`;
    },
    // Text with a background halo so labels stay legible over lines.
    label: (x, y, s, o = {}) => k.text(x, y, s, { ...o, halo: true }).replace('<text ', `<text paint-order="stroke" stroke="${c.paper}" stroke-width="4" stroke-linejoin="round" `),
    group: (id, content, extra = '') => content ? `<g id="${prefix}-${id}"${extra ? ' ' + extra : ''}>${content}</g>` : '',
    /** Screen-space circular arc between angles (degrees, 0 = +x, counterclockwise on screen). */
    arc: (cx, cy, r, a0, a1, o = {}) => {
      const p = a => ({ x: cx + r * Math.cos(a * Math.PI / 180), y: cy - r * Math.sin(a * Math.PI / 180) });
      const s = p(a0), e = p(a1), large = Math.abs(a1 - a0) > 180 ? 1 : 0, sweep = a1 > a0 ? 0 : 1;
      return k.path(`M${f(s.x)},${f(s.y)} A${f(r)},${f(r)} 0 ${large} ${sweep} ${f(e.x)},${f(e.y)}`, o);
    },
    d: (arr, close = false) => arr.length ? arr.map((p, i) => `${i ? 'L' : 'M'}${f(p.x)},${f(p.y)}`).join(' ') + (close ? ' Z' : '') : '',
    /** Path through samples; null samples break the line. */
    broken: arr => { let d = '', open = false; for (const p of arr) { if (!p) { open = false; continue; } d += `${open ? 'L' : 'M'}${f(p.x)},${f(p.y)} `; open = true; } return d.trim(); },
    defs: () => `<defs>${['ink', 'alt', 'azi', 'third', 'muted', 'red'].map(n => `<marker id="${prefix}-arrow-${n}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,1 L9,5 L0,9" fill="none" stroke="${c[n]}" stroke-width="${LINE.regular}"/></marker>`).join('')}</defs>`,
  };
  return k;
}

/** Wrap drawing content as a complete SVG document or inline element. */
export function svgDocument(k, { width, height, title, body, className = 'diagram', scale = null }) {
  const size = k.standalone && scale ? ` width="${f(width * scale)}mm" height="${f(height * scale)}mm"` : '';
  const bg = k.standalone ? `<rect id="${k.prefix}-background" width="${width}" height="${height}" fill="#ffffff"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${size}${k.standalone ? '' : ` class="${className}"`} role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${k.defs()}${bg}<g font-family="${FONT}">${body}</g></svg>`;
}

/** Orthographic axonometric view of (east, north, up) world coordinates.
 * psi: azimuth from the origin toward the viewer; eps: viewer elevation. */
export function view(psi, eps, scale, cx, cy) {
  const r = Math.PI / 180, sp = Math.sin(psi * r), cp = Math.cos(psi * r), se = Math.sin(eps * r), ce = Math.cos(eps * r);
  const R = [-cp, sp, 0], U = [-se * sp, -se * cp, ce], C = [ce * sp, ce * cp, se];
  const p = (e, n, u = 0) => ({ x: cx + scale * (e * R[0] + n * R[1]), y: cy - scale * (e * U[0] + n * U[1] + u * U[2]), depth: e * C[0] + n * C[1] + u * C[2] });
  p.toward = C; p.scale = scale;
  return p;
}
