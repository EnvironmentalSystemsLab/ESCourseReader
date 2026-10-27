// Ink kit for the Chapter 02 drawings: the same drawing calls as svg.js, rendered in the
// fine-liner manner of the hand-drawing figures (src/sketch.js). Surfaces stay white, shade and
// shadow become hatching, grids become light pencil, and straight ink edges run slightly past
// their corners as if ruled by hand. Angle colours (ALT, AZI, ZEN) are kept as coloured pencil.
import { kit, f, LINE } from './svg.js';

/** Pen widths shared with sketch.js, taken from the common line weights (drawing units). */
export const PEN = { profile: LINE.bold, outline: LINE.regular, edge: LINE.thin, hatch: LINE.hair, pencil: LINE.hair };

// Hatch patterns: [spacing, angle, opaque]. Shadow is dense, shade open (as in Chapter 04);
// "screen" is transparent so it crosses whatever lies beneath (device masks, glass).
const PATTERNS = { shadow: [3.4, 45, true], shade: [7.5, 45, true], screen: [4.2, 135, false] };
// Palette roles drawn as hatching or paper.
const ROLE_FILL = { shadow: 'shadow', canopy: 'shadow', eastWing: 'shadow', face: 'shade', wall: 'shade', mask: 'shade', night: 'shade', glass: 'screen' };
const PAPER = ['ground', 'roof', 'side', 'earth', 'interior', 'westWing', 'neighbor', 'directSun', 'sun', 'paper'];
const PENCIL = ['grid', 'fineGrid', 'axis'];
const INK = ['ink', 'buildingEdge', 'shadow', 'sun', 'canopy', 'maskEdge', 'wall', 'glass'];

/** Small deterministic hash so a line keeps the same hand-drawn wobble from frame to frame. */
const jitter = (...v) => { let h = 2166136261; for (const x of v) { h ^= Math.round(x * 10); h = Math.imul(h, 16777619); } return ((h >>> 0) % 1000) / 1000; };

export function inkKit(standalone = false, prefix = 'd', options = {}) {
  const base = kit(standalone, prefix, options), c = base.c;
  const role = {};
  for (const [name, value] of Object.entries(c)) if (!(value in role)) role[value] = name;
  // Some palette entries share a value (alt = gold = june); prefer the semantic names below.
  for (const name of [...PAPER, ...Object.keys(ROLE_FILL), ...PENCIL, 'ink', 'buildingEdge']) role[c[name]] = name;
  const roleOf = color => role[color];
  const H = Object.fromEntries(Object.keys(PATTERNS).map(n => [n, `url(#${prefix}-hatch-${n})`]));
  const isHatch = fill => typeof fill === 'string' && fill.startsWith(`url(#${prefix}-hatch-`);

  /** Stroke options mapped to pens: ink lines stay ink (with ink arrows), grids become pencil. */
  const pen = (o = {}) => {
    const r = roleOf(o.stroke ?? c.ink);
    if (PENCIL.includes(r)) return { ...o, stroke: c.axis, width: Math.min(o.width ?? 1, PEN.pencil) };
    if (r === 'glass') return { ...o, stroke: c.ink, width: PEN.edge };
    if (INK.includes(r)) return { ...o, stroke: c.ink, width: Math.max(PEN.hatch, o.width ?? 1), arrow: o.arrow ? 'ink' : undefined };
    return o;
  };
  /** Fill mapped to paper or hatching; data colours and warnings are kept. */
  const fill = color => {
    const r = roleOf(color);
    if (r in ROLE_FILL) return H[ROLE_FILL[r]];
    if (PAPER.includes(r)) return c.paper;
    return color;
  };
  const filled = o => {
    if (!o.fill || o.fill === 'none') return o;
    const to = fill(o.fill);
    return { ...o, fill: to, fillOpacity: to === o.fill && !isHatch(to) ? o.fillOpacity : undefined };
  };

  // One ruled stroke with a little overshoot at both ends.
  const ruled = (a, b, over) => {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
    const o1 = over * (.55 + .9 * jitter(a.x, a.y, b.x)), o2 = over * (.55 + .9 * jitter(b.y, a.x, b.x)), sag = Math.min(1, L / 180) * (jitter(a.y, b.y, a.x) * 2 - 1) * .8;
    const A = { x: a.x - ux * o1, y: a.y - uy * o1 }, B = { x: b.x + ux * o2, y: b.y + uy * o2 };
    return `M${f(A.x)},${f(A.y)} Q${f((A.x + B.x) / 2 - uy * sag)},${f((A.y + B.y) / 2 + ux * sag)} ${f(B.x)},${f(B.y)}`;
  };
  const overFor = w => w >= 1.5 ? 3 : 1.6;

  const k = {
    ...base,
    H,
    line: (a, b, o = {}) => {
      const q = pen(o);
      // No overshoot where an arrow head or a dash pattern would shift.
      if (q.stroke !== c.ink || q.dash || q.arrow || Math.hypot(b.x - a.x, b.y - a.y) < 6) return base.line(a, b, q);
      return base.path(ruled(a, b, overFor(q.width)), q);
    },
    polyline: (arr, o = {}) => base.polyline(arr, pen(o)),
    polygon: (arr, o = {}) => {
      if (arr.length < 3) return '';
      const q = filled(o), stroked = o.stroke !== undefined && o.stroke !== 'none' || o.width !== undefined;
      const outline = stroked ? pen(o) : isHatch(q.fill) ? { stroke: c.ink, width: PEN.hatch } : null;
      let out = base.polygon(arr, { fill: q.fill, fillOpacity: q.fillOpacity });
      if (outline && !outline.dash && outline.stroke === c.ink) out += base.path(arr.map((p, i) => ruled(p, arr[(i + 1) % arr.length], overFor(outline.width))).join(' '), outline);
      else if (outline) out += base.polygon(arr, { ...outline, fill: 'none' });
      return out;
    },
    path: (d, o = {}) => base.path(d, o.stroke === 'none' ? filled(o) : pen(filled(o))),
    circle: (p, r, o = {}) => {
      if (roleOf(o.fill) === 'sun') {
        // A translucent glow has no ink equivalent; the sun is a white disc with an ink rim and short rays.
        if (o.fillOpacity !== undefined && o.fillOpacity < 1) return '';
        const n = r < 7 ? 0 : 8, rays = Array.from({ length: n }, (_, i) => { const a = i * Math.PI / 4; return `M${f(p.x + Math.cos(a) * (r + 2.5))},${f(p.y + Math.sin(a) * (r + 2.5))} L${f(p.x + Math.cos(a) * (r + 6))},${f(p.y + Math.sin(a) * (r + 6))}`; });
        return base.circle(p, r, { fill: c.paper, stroke: c.ink, width: r < 7 ? PEN.edge : PEN.outline }) + base.path(rays.join(' '), { stroke: c.ink, width: PEN.edge });
      }
      return base.circle(p, r, o.stroke || o.width ? pen(filled(o)) : filled(o));
    },
    rect: (x, y, w, h, o = {}) => {
      const q = filled(o);
      return base.rect(x, y, w, h, o.stroke || o.width ? pen(q) : isHatch(q.fill) ? { ...q, stroke: c.ink, width: PEN.hatch } : q);
    },
    arc: (cx, cy, r, a0, a1, o = {}) => base.arc(cx, cy, r, a0, a1, pen(o)),
    /** Small-caps sheet title, as on the hand-drawing figures. */
    title: (x, y, s, o = {}) => base.text(x, y, String(s).toUpperCase(), { size: 11, weight: 700, spacing: 1.2, fill: c.ink, ...o }),
    defs: () => base.defs().replace('</defs>', Object.entries(PATTERNS).map(([name, [gap, angle, opaque]]) =>
      `<pattern id="${prefix}-hatch-${name}" patternUnits="userSpaceOnUse" width="${gap}" height="${gap}" patternTransform="rotate(${angle})">${opaque ? `<rect width="${gap}" height="${gap}" fill="${c.paper}"/>` : ''}<line x1="0" y1="0" x2="0" y2="${gap}" stroke="${c.ink}" stroke-width="${PEN.hatch}"/></pattern>`).join('') + '</defs>'),
  };
  return k;
}
