// Isometric climate-principle drawings, redrawn from Timur Dogan's
// DesignPrinciples-converted_2.pdf (2020): four climates × seven design lenses.
// Each drawing sits on the same site plinth so the matrix reads as one sheet.
// Conventions: +y is south (front-left face), +x is east (front-right face), z is up.
import { colorsFor } from './palette.js';

const CX = Math.cos(Math.PI / 6), SY = 0.5, OX = 120, OY = 116, H = 46, rad = Math.PI / 180;
const r1 = n => Math.round(n * 10) / 10;
const P = (x, y, z = 0) => [OX + (x - y) * CX, OY + (x + y) * SY - z];
const join = a => a.map(p => `${r1(p[0])},${r1(p[1])}`).join(' ');
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i, n));

function makeKit(k) {
  const edge = k.buildingEdge;
  const stroke = (s = edge, w = .9, dash) => `stroke="${s}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ''}`;
  const poly2 = (a, fill, s, w, dash) => `<polygon points="${join(a)}" fill="${fill}" ${s === 'none' ? 'stroke="none"' : stroke(s, w, dash)}/>`;
  const poly = (a3, fill = k.paper, s, w, dash) => poly2(a3.map(p => P(...p)), fill, s, w, dash);
  const line2 = (a, s = edge, w = .9, dash) => `<polyline points="${join(a)}" fill="none" ${stroke(s, w, dash)}/>`;
  const line = (a3, s, w, dash) => line2(a3.map(p => P(...p)), s, w, dash);
  // Arrow along a screen polyline or a sampled curve; the head follows the last segment.
  const arrow2 = (a, s = k.green, w = 1.8, dash) => {
    const [e, f] = [a[a.length - 1], a[a.length - 2]], L = Math.hypot(e[0] - f[0], e[1] - f[1]) || 1;
    const u = [(e[0] - f[0]) / L, (e[1] - f[1]) / L], n = [-u[1], u[0]], hd = 4 + w * 1.6, hw = 2 + w;
    const base = [e[0] - u[0] * hd, e[1] - u[1] * hd], tip = [e[0] + u[0], e[1] + u[1]];
    const body = [...a.slice(0, -1), base];
    return `${line2(body, s, w, dash)}<polygon points="${join([tip, [base[0] + n[0] * hw, base[1] + n[1] * hw], [base[0] - n[0] * hw, base[1] - n[1] * hw]])}" fill="${s}" stroke="none"/>`;
  };
  const bez = (p0, p1, p2, p3, n = 24) => range(n + 1, i => {
    const t = i / n, m = 1 - t;
    return [0, 1].map(j => m * m * m * p0[j] + 3 * m * m * t * p1[j] + 3 * m * t * t * p2[j] + t * t * t * p3[j]);
  });
  const arrow3 = (a3, s, w, dash) => arrow2(a3.map(p => P(...p)), s, w, dash);
  // Axis-aligned box; faces are the visible top, south (+y) and east (+x) sides.
  const box = (x, y, z, w, d, h, o = {}) => {
    const { top = k.paper, south = k.interior, east = k.ground, s = edge, sw = .9 } = o;
    return poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], east, s, sw)
      + poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], south, s, sw)
      + poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, s, sw);
  };
  const plate = (top = k.paper) => box(-H, -H, -4, 2 * H, 2 * H, 4, { top, south: k.ground, east: k.side });
  // Gable house with the ridge along x; optional eave overhang and per-face fills.
  const gable = (o = {}) => {
    const { x = -24, y = -18, w = 48, d = 36, h = 24, rh = 20, ov = 0, wall = k.interior, side = k.ground, roof = k.paper, back = k.ground, gableFill = side, s = edge, sw = .9 } = o;
    const yc = y + d / 2, zr = h + rh, drop = ov * rh / (d / 2), ze = h - drop;
    const x0 = x - ov, x1 = x + w + ov, y0 = y - ov, y1 = y + d + ov;
    return poly([[x0, y0, ze], [x1, y0, ze], [x1, yc, zr], [x0, yc, zr]], back, s, sw)
      + box(x, y, 0, w, d, h, { top: wall, south: wall, east: side, s, sw })
      + poly([[x + w, y, h], [x + w, y + d, h], [x + w, yc, zr]], gableFill, s, sw)
      + poly([[x0, y1, ze], [x1, y1, ze], [x1, yc, zr], [x0, yc, zr]], roof, s, sw);
  };
  // Hipped roof over a raised floor: tropical and warm-humid houses.
  const hip = (o = {}) => {
    const { x = -22, y = -15, w = 44, d = 30, z = 12, h = 18, ov = 9, rh = 26, inset = 9, roof = k.paper, wall = k.interior, side = k.ground, thatch = edge, piles = edge, pileW = 1.6, s = edge } = o;
    const zb = z + h, zr = zb + rh, x0 = x - ov, x1 = x + w + ov, y0 = y - ov, y1 = y + d + ov, yc = y + d / 2, rx0 = x + inset, rx1 = x + w - inset;
    let out = '';
    for (const px of [x + 3, x + w / 2, x + w - 3]) for (const py of [y + 3, y + d - 3]) out += line([[px, py, 0], [px, py, z]], piles, pileW);
    out += box(x - 3, y - 3, z - 2, w + 6, d + 6, 2, { top: k.paper, south: k.ground, east: k.side, s });
    out += box(x, y, z, w, d, h, { top: wall, south: wall, east: side, s });
    out += poly([[x0, y0, zb], [x1, y0, zb], [rx1, yc, zr], [rx0, yc, zr]], roof, s);
    const east = [[x1, y0, zb], [x1, y1, zb], [rx1, yc, zr]], south = [[x0, y1, zb], [x1, y1, zb], [rx1, yc, zr], [rx0, yc, zr]];
    out += poly(east, roof, s) + poly(south, roof, s);
    if (thatch) {
      out += range(9, i => { const t = (i + 1) / 10; return line([lerp(south[0], south[1], t), lerp(south[3], south[2], t)], thatch, .55); }).join('');
      out += range(5, i => { const t = (i + 1) / 6; return line([lerp(east[0], east[1], t), east[2]], thatch, .55); }).join('');
      out += line([lerp(south[0], south[3], .5), lerp(south[1], south[2], .5)], thatch, .55);
    }
    // Small gablet: the ventilated roof end in the reference drawing.
    out += poly([[rx1, yc - 5, zr - 7], [rx1, yc + 5, zr - 7], [rx1, yc, zr]], k.ground, s, .8);
    return out;
  };
  // Hemisphere (igloo): upper silhouette arc plus the front half of the base ellipse.
  const dome = (r, fill = k.paper, s = edge, w = .9, dash, cx = 0, cy = 0) => {
    const [X, Y] = P(cx, cy), R = r * 1.2247, ry = r * .7071;
    return `<path d="M${r1(X - R)} ${r1(Y)}A${r1(R)} ${r1(R)} 0 0 1 ${r1(X + R)} ${r1(Y)}A${r1(R)} ${r1(ry)} 0 0 1 ${r1(X - R)} ${r1(Y)}Z" fill="${fill}" ${stroke(s, w, dash)}/>`;
  };
  // Visible spherical cap above height zc, from the silhouette and the cap circle.
  const cap = (r, zc, fill) => {
    const rc = Math.sqrt(r * r - zc * zc), sum = -zc, q = Math.sqrt(Math.max(0, 2 * rc * rc - sum * sum));
    const A = [(sum - q) / 2, (sum + q) / 2], B = [(sum + q) / 2, (sum - q) / 2];
    const [X, Y] = P(0, 0), R = r * 1.2247, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
    const ang = p => { const [px, py] = P(p[0], p[1], zc); return wrap(Math.atan2(py - Y, px - X) + Math.PI / 2); };
    const da = ang(A), db = ang(B);
    const sil = range(25, i => { const t = da + (db - da) * i / 24 - Math.PI / 2; return [X + R * Math.cos(t), Y + R * Math.sin(t)]; });
    // Return from B to A along the front (viewer-facing) half of the cap circle.
    const tA = Math.atan2(A[1], A[0]); let tB = Math.atan2(B[1], B[0]);
    const front = t => Math.cos(t) + Math.sin(t) > 0;
    let dt = tA - tB; dt = wrap(dt); if (!front(tB + dt / 2)) dt = dt > 0 ? dt - 2 * Math.PI : dt + 2 * Math.PI;
    const arc = range(25, i => { const t = tB + dt * i / 24; return P(rc * Math.cos(t), rc * Math.sin(t), zc); });
    return poly2([...sil, ...arc], fill, edge, .9);
  };
  // Daily sun path (latitude, declination) centered on the plinth; hour angle in degrees.
  const sunVec = (lat, dec, ha) => {
    const n = [0, -Math.cos(lat * rad), Math.sin(lat * rad)], m = [0, Math.sin(lat * rad), Math.cos(lat * rad)];
    return [0, 1, 2].map(i => n[i] * Math.sin(dec * rad) + Math.cos(dec * rad) * (m[i] * Math.cos(ha * rad) - (i === 0 ? Math.sin(ha * rad) : 0)));
  };
  const sunPath = (lat, dec, R = 78, dash) => {
    const pts = range(121, i => sunVec(lat, dec, -180 + i * 3)).filter(v => v[2] > -0.01).map(v => P(R * v[0], R * v[1], R * v[2]));
    return line2(pts, k.heat, .8, dash);
  };
  const sunAt = (lat, dec, ha, R = 78) => { const v = sunVec(lat, dec, ha); return { v, p: P(R * v[0], R * v[1], R * v[2]) }; };
  const disc = (p, r = 6.5) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r}" fill="${k.heatFill}" stroke="${k.heat}" stroke-width=".8"/>`;
  const rays = (p, r = 6.5) => range(8, i => { const a = i * Math.PI / 4; return line2([[p[0] + (r + 2.5) * Math.cos(a), p[1] + (r + 2.5) * Math.sin(a)], [p[0] + (r + 5.5) * Math.cos(a), p[1] + (r + 5.5) * Math.sin(a)]], k.heat, 1); }).join('');
  const rain = (x0, y0, n = 9, len = 26, gap = 7, s = k.green) => range(n, i => line2([[x0 + i * gap, y0 + (i % 3) * 5], [x0 + i * gap - len * .45, y0 + (i % 3) * 5 + len]], s, .9, '3 2.5')).join('');
  // Convex hull of ground-plane points, for cast shadows.
  const hull = pts => {
    const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], hi = [];
    for (const q of p) { while (lo.length > 1 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (hi.length > 1 && cross(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
    return [...lo.slice(0, -1), ...hi.slice(0, -1)];
  };
  const boxShadow = (x, y, w, d, h, v, z = 0) => {
    const dx = -v[0] / v[2] * h, dy = -v[1] / v[2] * h, base = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
    return poly(hull([...base, ...base.map(([a, b]) => [a + dx, b + dy])]).map(([a, b]) => [a, b, z]), k.shadow, 'none').replace('/>', ' fill-opacity=".35"/>');
  };
  // Courtyard block: floor, inner back walls, top ring with a hole, outer faces.
  const court = (o = {}) => {
    const { a = 38, b = 18, h = 16, top = k.paper, south = k.interior, east = k.ground, floor = k.ground, inner = k.interior, innerEast = k.ground, extra = '' } = o;
    const ring = [[-a, -a, h], [a, -a, h], [a, a, h], [-a, a, h]].map(p => P(...p)), hole = [[-b, -b, h], [b, -b, h], [b, b, h], [-b, b, h]].map(p => P(...p));
    const ringPath = `<path d="M${join(ring).replace(/ /g, 'L')}ZM${join(hole).replace(/ /g, 'L')}Z" fill="${top}" fill-rule="evenodd" ${stroke()}/>`;
    return poly([[-b, -b, 0], [b, -b, 0], [b, b, 0], [-b, b, 0]], floor) + extra
      + poly([[-b, -b, 0], [-b, b, 0], [-b, b, h], [-b, -b, h]], innerEast) + poly([[-b, -b, 0], [b, -b, 0], [b, -b, h], [-b, -b, h]], inner)
      + poly([[a, -a, 0], [a, a, 0], [a, a, h], [a, -a, h]], east) + poly([[-a, a, 0], [a, a, 0], [a, a, h], [-a, a, h]], south) + ringPath;
  };
  const dots = (quad, n, fill, seed = 7) => {
    let s = seed; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    return range(n, () => { const u = rnd(), v = rnd(), p = lerp(lerp(quad[0], quad[1], u), lerp(quad[3], quad[2], u), v), [X, Y] = P(...p); return `<circle cx="${r1(X)}" cy="${r1(Y)}" r=".9" fill="${fill}"/>`; }).join('');
  };
  return { k, P, poly, poly2, line, line2, arrow2, arrow3, bez, box, plate, gable, hip, dome, cap, sunPath, sunAt, disc, rays, rain, boxShadow, court, dots, stroke };
}

// Igloo entrance tunnel on the east side.
const tunnel = g => g.box(24, -7, 0, 17, 14, 10) + g.poly([[41, -3.5, 0], [41, 3.5, 0], [41, 3.5, 7], [41, -3.5, 7]], g.k.canopy, 'none');

const drawings = {
  polar: {
    form: g => g.plate() + g.dome(30) + g.dome(24, 'none', g.k.axis, .8, '2.5 2') + g.dome(13, g.k.heatFill, g.k.heat) + tunnel(g),
    zoning: g => { const k = g.k; return `<circle cx="120" cy="96" r="58" fill="${k.ground}" stroke="${k.buildingEdge}" stroke-width=".9"/><circle cx="120" cy="96" r="44" fill="${k.heatSoft}" stroke="${k.buildingEdge}" stroke-width=".9"/><circle cx="120" cy="96" r="29" fill="${k.heatFill}" stroke="${k.heat}" stroke-width=".9"/><rect x="176" y="88" width="20" height="16" fill="${k.paper}" stroke="${k.buildingEdge}" stroke-width=".9"/><path d="M196 92v8" stroke="${k.canopy}" stroke-width="2"/>`; },
    rain: g => g.plate() + g.dome(30) + g.cap(30, 15, g.k.waterFill) + tunnel(g) + [-16, 0, 16].map(dx => g.arrow2([[120 + dx, 22], [120 + dx, 44 + Math.abs(dx) * .25]], g.k.green, 1.5)).join(''),
    air: g => g.plate() + g.dome(30) + tunnel(g)
      + g.arrow2(g.bez([214, 150], [180, 128], [168, 62], [124, 60]).concat(g.bez([124, 60], [100, 59], [86, 64], [74, 76]).slice(1)), g.k.green, 1.8)
      + g.arrow2(g.bez([222, 124], [200, 118], [180, 121], [168, 132]), g.k.green, 1.4),
    sun: g => { const s = g.sunAt(70, 0, 42); return g.sunPath(70, 0) + g.plate() + g.dome(30) + tunnel(g) + g.disc(s.p) + g.rays(s.p) + g.arrow2([[s.p[0] + 10, s.p[1] + 3], [84, 112]], g.k.heat, 1.4) + [-16, 0, 16].map(dx => g.arrow2([[120 + dx, 14], [120 + dx, 34]], g.k.heat, 1.3)).join(''); },
    ground: g => { const s = g.sunAt(70, 0, 52); return g.plate(g.k.waterFill) + g.dome(30) + tunnel(g) + g.disc(s.p) + g.rays(s.p) + g.arrow2([[s.p[0] + 8, s.p[1] + 6], [70, 140]], g.k.heat, 1.3) + g.arrow2([[70, 140], [93, 112]], g.k.heat, 1.3, '3 2'); },
    material: g => {
      const k = g.k, y0 = 12, z0 = 10, r = 10, x0 = -6, x1 = 40;
      const ring = x => Array.from({ length: 37 }, (_, i) => { const t = i * 10 * rad; return [x, y0 + r * Math.cos(t), z0 + r * Math.sin(t)]; });
      const nrm = p => { const [X, Y] = g.P(...p); return -SY * X + CX * Y; };
      const back = ring(x0), front = ring(x1), lo = back.reduce((a, b) => nrm(a) < nrm(b) ? a : b), hi = back.reduce((a, b) => nrm(a) > nrm(b) ? a : b);
      const sh = p => [p[0] + x1 - x0, p[1], p[2]];
      const spiral = Array.from({ length: 80 }, (_, i) => { const t = i / 79, a = t * 3.2 * 2 * Math.PI, rr = r * (1 - t * .85); return [x1, y0 + rr * Math.cos(a), z0 + rr * Math.sin(a)]; });
      return g.box(-44, -30, 0, 34, 26, 2.5) + g.box(-41, -27, 2.5, 34, 26, 2.5)
        + g.poly(back, k.ground) + g.poly([lo, sh(lo), sh(hi), hi], k.ground, 'none') + g.line([lo, sh(lo)]) + g.line([hi, sh(hi)])
        + g.poly(front, k.heatSoft, k.heat, 1.1) + g.line(spiral, k.heat, .8);
    }
  },
  temperate: {
    form: g => g.plate() + g.gable({ wall: g.k.heatFill, side: g.k.heatFill, roof: g.k.heatFill, back: g.k.heatFill, s: g.k.paper, sw: 1.2 }),
    zoning: g => { const k = g.k; return `<rect x="72" y="34" width="96" height="104" fill="${k.paper}" stroke="${k.buildingEdge}" stroke-width=".9"/><rect x="72" y="70" width="96" height="68" fill="${k.heatFill}" stroke="${k.buildingEdge}" stroke-width=".9"/><circle cx="120" cy="170" r="6.5" fill="${k.heatFill}" stroke="${k.heat}" stroke-width=".8"/>${[-14, 0, 14].map(dx => g.arrow2([[120 + dx * .9, 160], [120 + dx * .6, 144]], k.heat, 1.2)).join('')}<text x="186" y="40" font-size="9" fill="${k.muted}" text-anchor="middle">N</text><path d="M186 44v14" stroke="${k.muted}" stroke-width=".9"/>`; },
    rain: g => g.plate() + g.gable({ ov: 7, roof: g.k.waterFill, back: g.k.waterFill }) + g.rain(150, 10, 9, 30, 6.5)
      + g.arrow2([[73, 108], [73, 136]], g.k.green, 1.3),
    air: g => g.plate() + g.gable({ s: g.k.buildingEdge }) + g.box(24, -7, 0, 10, 14, 13, { top: g.k.paper })
      + g.arrow2(g.bez([216, 150], [190, 132], [176, 72], [138, 58]).concat(g.bez([138, 58], [118, 52], [100, 58], [88, 68]).slice(1)), g.k.green, 1.8)
      + g.arrow2(g.bez([226, 128], [208, 122], [190, 124], [178, 132]), g.k.green, 1.4),
    sun: g => {
      const w = g.sunAt(42, -23.4, 0), su = g.sunAt(42, 23.4, 0), k = g.k;
      return g.sunPath(42, 23.4) + g.sunPath(42, -23.4, 78, '3 2') + g.plate()
        + g.gable({ h: 22 }) + g.poly([[-11, 18, 5], [11, 18, 5], [11, 18, 17], [-11, 18, 17]], k.glass)
        + g.box(-15, 18, 18.5, 30, 9, 1.2, { top: k.face, south: k.face, east: k.face })
        + g.disc(w.p) + g.disc(su.p) + g.arrow2([[w.p[0] + 8, w.p[1]], [g.P(0, 18, 11)[0] - 2, g.P(0, 18, 11)[1]]], k.heat, 1.4)
        + g.arrow2([[su.p[0], su.p[1] + 8], [g.P(0, 27, 20)[0], g.P(0, 27, 20)[1] - 1]], k.heat, 1.4)
        + `<text x="${r1(su.p[0] + 10)}" y="${r1(su.p[1] - 6)}" font-size="8" fill="${k.muted}">JUN</text><text x="${r1(w.p[0] - 6)}" y="${r1(w.p[1] - 11)}" font-size="8" fill="${k.muted}">DEC</text>`;
    },
    ground: g => [-12, 0, 12].map(x => g.line([[x, 30, -6], [x, 30, -40]], g.k.green, 3.2)).join('') + g.plate()
      + [-12, 0, 12].map(x => g.line([[x, 30, 0], [x, 30, -4]], g.k.green, 1, '2 2')).join('') + g.gable()
      + g.line([[-24, 18, 0], [-24, 18, -4], [24, 18, -4], [24, 18, 0]], g.k.axis, .8, '2 2'),
    material: g => {
      const k = g.k, x = -16, w = 40, h = 64, s = g.sunAt(42, -23.4, 30);
      const wall = g.box(x, -6, 0, w, 10, h, { top: k.heatSoft, south: k.heatSoft, east: k.heatSoft }) + g.box(x, 4, 0, w, 8, h, { top: k.paper, south: k.interior, east: k.paper });
      const hatch = range(7, i => g.line([[x + w, -6 + i * 1.5, 0], [x + w, -6 + i * 1.5 + 1.4, h]], k.heat, .5)).join('');
      const zig = g.line(range(17, i => [x + w, 6 + (i % 2) * 4, i * h / 16]), k.axis, .6);
      const win = g.poly([[x + 10, 12, 22], [x + 30, 12, 22], [x + 30, 12, 46], [x + 10, 12, 46]], k.glass);
      return g.plate() + wall + hatch + zig + win + g.disc([s.p[0] - 6, s.p[1] - 18]) + g.rays([s.p[0] - 6, s.p[1] - 18])
        + g.arrow2([[s.p[0] + 6, s.p[1] - 12], g.P(x + 20, 12, 34)], k.heat, 1.5);
    }
  },
  arid: {
    form: g => { const s = { p: [212, 42] }; return g.plate() + g.court({ top: g.k.heatFill, south: g.k.heatFill, east: g.k.heatFill, floor: g.k.paper }) + g.disc(s.p) + g.rays(s.p) + g.arrow2([[s.p[0] - 6, s.p[1] + 7], g.P(38, 14, 10)], g.k.heat, 1.3); },
    zoning: g => { const k = g.k; return `<rect x="62" y="38" width="116" height="116" fill="${k.paper}" stroke="${k.buildingEdge}" stroke-width=".9"/><path d="M70 46h100v100H70ZM104 80v32h32V80Z" fill="${k.heatFill}" fill-rule="evenodd" stroke="${k.heat}" stroke-width=".9"/>`; },
    rain: g => g.plate() + g.court({ floor: g.k.waterFill }) + g.rain(132, 20, 6, 50, 5)
      + g.arrow3([[-30, 0, 22], [-15, 0, 22]], g.k.green, 1.2) + g.arrow3([[0, -30, 22], [0, -15, 22]], g.k.green, 1.2),
    air: g => {
      const k = g.k, base = g.P(0, 0, 0);
      return g.plate() + g.court({ floor: k.ground }) + g.box(-36, -36, 16, 15, 15, 24) + g.poly([[-21, -32, 30], [-21, -25, 30], [-21, -25, 38], [-21, -32, 38]], k.canopy, 'none')
        + g.arrow2([[228, 30], [g.P(-21, -28, 34)[0] + 3, g.P(-21, -28, 34)[1]]], k.green, 1.6)
        + g.line([[-28, -28, 34], [-28, -28, 4], [-8, -8, 4]], k.green, 1.2, '3 2')
        + g.arrow2([[base[0], base[1] - 4], [base[0], base[1] - 58]], k.green, 1.8);
    },
    sun: g => {
      const s = g.sunAt(25, 15, 48), v = s.v, k = g.k, b = 18, h = 16, dx = -v[0] / v[2] * h, dy = -v[1] / v[2] * h;
      const lx0 = Math.max(-b, -b + dx), lx1 = Math.min(b, b + dx), ly0 = Math.max(-b, -b + dy), ly1 = Math.min(b, b + dy);
      const lit = lx1 > lx0 && ly1 > ly0 ? g.poly([[lx0, ly0, 0], [lx1, ly0, 0], [lx1, ly1, 0], [lx0, ly1, 0]], k.paper, 'none') : '';
      return g.sunPath(25, 15) + g.plate() + g.boxShadow(-38, -38, 76, 76, h, v)
        + g.court({ top: k.heatFill, floor: k.shadow, extra: lit, inner: k.interior, innerEast: k.ground }) + g.disc(s.p) + g.rays(s.p)
        + g.arrow2([[s.p[0] + 4, s.p[1] + 8], g.P(12, 12, 18)], k.heat, 1.4);
    },
    ground: g => {
      const k = g.k, a = H, z0 = -34, hb = -6, hx = 30;
      const top = [[-a, -a, 0], [a, -a, 0], [a, a, 0], [-a, a, 0]].map(p => g.P(...p)), hole = [[hb, hb, 0], [hx, hb, 0], [hx, hx, 0], [hb, hx, 0]].map(p => g.P(...p));
      const ring = `<path d="M${join(top).replace(/ /g, 'L')}ZM${join(hole).replace(/ /g, 'L')}Z" fill="${k.paper}" fill-rule="evenodd" ${g.stroke()}/>`;
      const south = [[-a, a, z0], [a, a, z0], [a, a, 0], [-a, a, 0]], east = [[a, -a, z0], [a, a, z0], [a, a, 0], [a, -a, 0]];
      return g.poly([[hb, hb, -20], [hx, hb, -20], [hx, hx, -20], [hb, hx, -20]], k.ground) + g.poly([[hb, hb, -20], [hb, hx, -20], [hb, hx, 0], [hb, hb, 0]], k.interior) + g.poly([[hb, hb, -20], [hx, hb, -20], [hx, hb, 0], [hb, hb, 0]], k.heatSoft)
        + g.poly(east, k.ground) + g.poly(south, k.heatSoft) + g.dots(south, 70, k.heat) + g.dots(east, 50, k.heat, 3) + ring
        + g.box(-38, -38, 0, 26, 26, 16) + g.box(-40, 30, 0, 7, 7, 14)
        + g.line([[-36.5, 33.5, 12], [-36.5, 33.5, -27], [12, 33.5, -27], [12, 30, -20]], k.green, 1.1, '3 2')
        + g.arrow3([[-36.5, 33.5, -27], [-6, 33.5, -27]], k.heat, 1.4) + g.arrow3([[12, 30, -20], [12, 18, -14]], k.green, 1.4);
    },
    material: g => {
      const k = g.k, h = 62, layers = [[-26, k.heatSoft, 90], [-10, k.heatFill, 70], [6, k.heatSoft, 90]];
      let out = g.plate();
      for (const [x, fill, n] of layers) {
        const south = [[x, 14, 0], [x + 16, 14, 0], [x + 16, 14, h], [x, 14, h]];
        out += g.box(x, -14, 0, 16, 28, h, { top: k.paper, south: fill, east: k.ground }) + g.dots(south, n, k.heat, x + 40);
      }
      const sun = [44, 32], moon = [196, 34];
      return out + g.disc(sun, 6) + g.rays(sun, 6)
        + `<path d="M${moon[0] + 4} ${moon[1] - 7}a8 8 0 1 0 4 13a6.5 6.5 0 1 1-4-13Z" fill="${k.heatSoft}" stroke="${k.heat}" stroke-width=".8"/>`
        + g.arrow2(g.bez([58, 34], [100, 14], [150, 14], [182, 32]), k.heat, 1.2, '3 2');
    }
  },
  tropical: {
    form: g => g.plate() + g.hip({ roof: g.k.heatFill, thatch: g.k.heat }),
    zoning: g => { const k = g.k; return `<rect x="66" y="44" width="108" height="100" fill="${k.paper}" stroke="${k.buildingEdge}" stroke-width=".9"/><rect x="130" y="44" width="44" height="100" fill="${k.heatSoft}" stroke="${k.buildingEdge}" stroke-width=".9"/>${range(10, i => `<path d="M${134 + i * 4} 46v96" stroke="${k.heat}" stroke-width=".8"/>`).join('')}${range(12, i => `<path d="M131 ${50 + i * 8}h42" stroke="${k.heat}" stroke-width=".5"/>`).join('')}`; },
    rain: g => { const k = g.k; return g.plate() + g.hip({ roof: k.waterFill, thatch: k.green }) + g.rain(150, 6, 9, 30, 6.5) + g.arrow3([[31, 26, 28], [31, 26, 2]], k.green, 1.3) + g.arrow3([[-31, 26, 28], [-31, 26, 2]], k.green, 1.3); },
    air: g => {
      const k = g.k;
      return g.plate() + g.hip({ thatch: k.axis })
        + g.arrow3([[62, -6, 20], [21, -6, 20]], k.green, 1.6) + g.arrow3([[62, 8, 24], [21, 8, 24]], k.green, 1.6)
        + g.arrow3([[-6, 15, 22], [-6, 52, 22]], k.green, 1.6) + g.arrow3([[10, 15, 18], [10, 50, 18]], k.green, 1.6)
        + g.arrow3([[56, 30, 5], [-2, 30, 5]], k.green, 1.3) + g.arrow3([[0, 0, 62], [-10, -12, 78]], k.green, 1.8);
    },
    sun: g => { const s = g.sunAt(5, 0, 30), k = g.k, hit = g.P(5, 22, 38); return g.sunPath(5, 0) + g.plate() + g.hip({ roof: k.heatFill, thatch: k.heat }) + g.disc(s.p) + g.rays(s.p) + g.arrow2([[s.p[0] - 3, s.p[1] + 8], hit], k.heat, 1.4) + g.arrow2([hit, [hit[0] + 34, hit[1] - 30]], k.heat, 1.2, '3 2'); },
    ground: g => g.plate() + g.hip({ z: 18, thatch: g.k.axis, piles: g.k.green, pileW: 3 }),
    material: g => {
      const k = g.k, x = -30, w = 30, h = 60, y = 0;
      const face = [[x, y + 4, 0], [x + w, y + 4, 0], [x + w, y + 4, h], [x, y + 4, h]];
      let out = g.plate() + g.box(x, y, 0, w, 4, h, { top: k.heatFill, south: k.heatFill, east: k.heatFill });
      for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) {
        const u0 = x + 3 + i * 5.4, z0 = 4 + j * 6.2;
        out += g.poly([[u0, y + 4, z0], [u0 + 3, y + 4, z0], [u0 + 3, y + 4, z0 + 3.6], [u0, y + 4, z0 + 3.6]], k.paper, 'none');
      }
      out += g.poly(face, 'none') + g.box(16, -10, 0, 18, 2.5, 52, { top: k.heatFill, south: k.heatFill, east: k.heat });
      return out + g.arrow3([[-8, -40, 30], [-14, 40, 30]], k.green, 1.6) + g.arrow3([[-20, -40, 16], [-26, 40, 16]], k.green, 1.6);
    }
  }
};

export function drawPrincipleSheet(family, aspect, standalone = false) {
  const k = colorsFor(standalone), g = makeKit(k), draw = drawings[family]?.[aspect];
  if (!draw) throw new Error(`No drawing for ${family}/${aspect}`);
  const name = `${family}: ${aspect} design principle`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 190" role="img" aria-label="${name}"><title>${name}</title><g fill="none" stroke-linejoin="round" stroke-linecap="round" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">${draw(g)}</g></svg>`;
}
