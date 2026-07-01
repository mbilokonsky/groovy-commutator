// groovy-engine.js
// Client-side reimplementation of src/groovy/*.py — kept in lockstep with the
// Python package, which remains the canonical source of truth for the math.
// Every function here mirrors one in the repo 1:1 (same name in comments).
// Used by Concepts.dc.html and Findings.dc.html (and, later, the Explorer).

// ---- ca.py ----

export function ruleLUT(ruleNum) {
  const lut = new Uint8Array(8);
  for (let i = 0; i < 8; i++) lut[i] = (ruleNum >> i) & 1;
  return lut;
}

// One synchronous step of an elementary CA on a periodic 1D lattice.
export function applyRule(state, ruleNum) {
  const n = state.length;
  const lut = ruleLUT(ruleNum);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = state[(i - 1 + n) % n];
    const c = state[i];
    const r = state[(i + 1) % n];
    out[i] = lut[4 * l + 2 * c + r];
  }
  return out;
}

// Small seeded PRNG (mulberry32) so demos are reproducible per-seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomState(n, seed) {
  const rng = mulberry32(seed);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() < 0.5 ? 0 : 1;
  return out;
}

// ---- operators.py ----

export function C(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

export function D(state, ruleNum) {
  return C(state, applyRule(state, ruleNum));
}

export function E(state, ruleNum) {
  return applyRule(state, ruleNum);
}

export function G(state, ruleNum) {
  return C(D(E(state, ruleNum), ruleNum), E(D(state, ruleNum), ruleNum));
}

export function crossCommutator(state, ruleA, ruleB) {
  const ab = applyRule(applyRule(state, ruleB), ruleA);
  const ba = applyRule(applyRule(state, ruleA), ruleB);
  return C(ab, ba);
}

// Evolve state0 under a single rule, recording the absential field at each step.
export function absentialTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(absentialField(state));
    state = applyRule(state, ruleNum);
  }
  return field;
}

// Two divergent unfoldings from one shared initial state:
// path1 repeats (apply A, then B); path2 repeats (apply B, then A).
export function divergenceTrajectory(state0, ruleA, ruleB, steps) {
  let path1 = state0.slice();
  let path2 = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(C(path1, path2));
    path1 = applyRule(applyRule(path1, ruleA), ruleB);
    path2 = applyRule(applyRule(path2, ruleB), ruleA);
  }
  return field;
}

// Plain single-rule evolution trajectory (for the "elementary CA" / raw views).
export function evolveTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(state);
    state = applyRule(state, ruleNum);
  }
  return field;
}

export function dTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(D(state, ruleNum));
    state = applyRule(state, ruleNum);
  }
  return field;
}

// The second derivative: apply D to its own output under the same rule,
// D(D(S)) -- not part of src/groovy/ (a demo-only convenience, like the
// other *Trajectory helpers), but a real reading of "differentiate twice."
export function d2Trajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(D(D(state, ruleNum), ruleNum));
    state = applyRule(state, ruleNum);
  }
  return field;
}

export function gTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(G(state, ruleNum));
    state = applyRule(state, ruleNum);
  }
  return field;
}

// The two things G actually XORs together -- D(E(S)) (differentiate after
// evolving) and E(D(S)) (evolve after differentiating), one per time step.
// Neither equals the plain D(S) trajectory above: D(E(S)) = phi(S) XOR
// phi(phi(S)), a different field entirely.
export function deTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(D(E(state, ruleNum), ruleNum));
    state = applyRule(state, ruleNum);
  }
  return field;
}

export function edTrajectory(state0, ruleNum, steps) {
  let state = state0.slice();
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(E(D(state, ruleNum), ruleNum));
    state = applyRule(state, ruleNum);
  }
  return field;
}

// ---- metrics.py ----

// Cells OFF but within the radius-1 closed neighborhood of an ON cell.
export function absentialField(state) {
  const n = state.length;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const l = state[(i - 1 + n) % n];
    const c = state[i];
    const r = state[(i + 1) % n];
    const neighborhood = (l | c | r) ? 1 : 0;
    out[i] = neighborhood && !c ? 1 : 0;
  }
  return out;
}

function packBits(field) {
  let nBits = 0;
  for (const row of field) nBits += row.length;
  const out = new Uint8Array(Math.ceil(nBits / 8));
  let i = 0;
  for (const row of field) {
    for (const b of row) {
      if (b) out[i >> 3] |= 1 << (7 - (i % 8));
      i++;
    }
  }
  return out;
}

// Fallback structure proxy when CompressionStream isn't available: fraction
// of adjacent-bit transitions in the packed stream (rough, NOT the published
// zlib metric — only used so the demo still degrades gracefully).
function approxStructureScore(packed) {
  if (packed.length < 2) return 0;
  let transitions = 0;
  for (let i = 1; i < packed.length; i++) {
    if (packed[i] !== packed[i - 1]) transitions++;
  }
  return transitions / packed.length;
}

// zlib-compressed-size / raw-size analog, computed live via the browser's
// native deflate implementation. Same SHAPE of metric as metrics.compressibility
// (lower = more structured/compressible) but not numerically identical to the
// zlib level-9 figures published on the questions page — labeled as such
// wherever it's shown.
export async function compressibility(field) {
  const packed = packBits(field);
  if (typeof CompressionStream === 'undefined') {
    return approxStructureScore(packed);
  }
  try {
    const cs = new CompressionStream('deflate');
    const writer = cs.writable.getWriter();
    writer.write(packed);
    writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return buf.byteLength / packed.length;
  } catch (e) {
    return approxStructureScore(packed);
  }
}

export async function divergenceStats(field, peakWindow = 20, settleWindow = 10) {
  const steps = field.length;
  const n = field[0].length;
  const dens = field.map(row => row.reduce((a, b) => a + b, 0) / n);
  const peak = Math.max(...dens.slice(0, peakWindow));
  const tail = dens.slice(Math.max(0, steps - settleWindow));
  const final = tail.reduce((a, b) => a + b, 0) / tail.length;
  const compress = await compressibility(field);
  return {
    final, peak,
    drained: (peak - final) > 0.15,
    compressibility: compress,
    mean: dens.reduce((a, b) => a + b, 0) / steps,
  };
}

// ---- classify.py ----

export const CRYSTALLINE_COMPRESSIBILITY = 0.10;
export const NOISY_COMPRESSIBILITY = 0.85;

export function classifyRegime(stats) {
  if (stats.drained) return 'drain';
  if (stats.final === 0 && stats.peak === 0) return 'commute';
  if (stats.compressibility < CRYSTALLINE_COMPRESSIBILITY) return 'crystalline';
  if (stats.compressibility > NOISY_COMPRESSIBILITY) return 'noisy';
  return 'structured';
}

// ---- secondorder.py ----

export function stepSecondOrder(stateT, stateTMinus1, ruleNum) {
  return C(applyRule(stateT, ruleNum), stateTMinus1);
}

// Returns trajectory including the two seed states, length steps+2.
export function runSecondOrder(state0, state1, ruleNum, steps) {
  const traj = [state0, state1];
  for (let t = 0; t < steps; t++) {
    const prev = traj[traj.length - 2];
    const cur = traj[traj.length - 1];
    traj.push(stepSecondOrder(cur, prev, ruleNum));
  }
  return traj;
}

// Confirms S(t-1) = phi(S(t)) XOR S(t+1) recovers the trajectory exactly,
// running backward from the last two states.
export function verifySecondOrderReversible(traj, ruleNum) {
  const len = traj.length;
  const rebuilt = new Array(len);
  rebuilt[len - 1] = traj[len - 1];
  rebuilt[len - 2] = traj[len - 2];
  for (let t = len - 3; t >= 0; t--) {
    rebuilt[t] = stepSecondOrder(rebuilt[t + 1], traj[t + 2], ruleNum);
    // i.e. S(t) = phi(S(t+1)) XOR S(t+2)
  }
  for (let t = 0; t < len; t++) {
    for (let i = 0; i < traj[t].length; i++) {
      if (traj[t][i] !== rebuilt[t][i]) return false;
    }
  }
  return true;
}

// The 8 neighborhood -> output mappings that define a rule, ordered
// 111,110,101,100,011,010,001,000 (the conventional left-to-right order
// rule diagrams are drawn in, all-on to all-off).
export function ruleNeighborhoods(ruleNum) {
  const lut = ruleLUT(ruleNum);
  const out = [];
  for (let idx = 7; idx >= 0; idx--) {
    out.push({ idx, l: (idx >> 2) & 1, c: (idx >> 1) & 1, r: idx & 1, out: lut[idx] });
  }
  return out;
}

// A 3-input boolean function (the rule's lookup table) is GF(2)-affine iff
// it equals c0 XOR (cl & l) XOR (cc & c) XOR (cr & r) for fixed bits derived
// from the table itself. Exhaustively checked against all 8 neighborhoods —
// this is the live, computed version of the affine theorem on the concepts
// page (not asserted, derived from the rule's own LUT each time).
export function isAffineRule(ruleNum) {
  const lut = ruleLUT(ruleNum);
  const c0 = lut[0];
  const cl = lut[4] ^ lut[0];
  const cc = lut[2] ^ lut[0];
  const cr = lut[1] ^ lut[0];
  for (let l = 0; l < 2; l++) {
    for (let c = 0; c < 2; c++) {
      for (let r = 0; r < 2; r++) {
        const idx = 4 * l + 2 * c + r;
        const predicted = c0 ^ (cl & l) ^ (cc & c) ^ (cr & r);
        if (predicted !== lut[idx]) return false;
      }
    }
  }
  return true;
}

// ---- rendering helper (shared canvas pixel-blit, not part of the Python lib) ----

// field: array of rows (Uint8Array/array of 0/1), same length each row.
// Draws one pixel per cell at native field resolution; canvas should be
// CSS-scaled up with image-rendering:pixelated by the caller.
export function renderFieldToCanvas(canvas, field, colorOn, colorOff) {
  const steps = field.length;
  const n = field[0].length;
  canvas.width = n;
  canvas.height = steps;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorOff;
  ctx.fillRect(0, 0, n, steps);
  ctx.fillStyle = colorOn;
  for (let t = 0; t < steps; t++) {
    const row = field[t];
    for (let i = 0; i < n; i++) {
      if (row[i]) ctx.fillRect(i, t, 1, 1);
    }
  }
}

// Same as renderFieldToCanvas but leaves "off" cells fully transparent
// instead of filling a background color -- for stacking multiple fields in
// the same space with CSS mix-blend-mode.
export function renderFieldToCanvasTransparent(canvas, field, colorOn) {
  const steps = field.length;
  const n = field[0].length;
  canvas.width = n;
  canvas.height = steps;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, n, steps);
  ctx.fillStyle = colorOn;
  for (let t = 0; t < steps; t++) {
    const row = field[t];
    for (let i = 0; i < n; i++) {
      if (row[i]) ctx.fillRect(i, t, 1, 1);
    }
  }
}

// ---- 2D (Life-like outer-totalistic) ----
// NOT part of src/groovy/ -- 2D semantics don't exist in the Python package
// yet (see INTERACTIVE_EXPLORER_SPEC.md's "open architectural question").
// This is the explorer's own first implementation: Moore-neighborhood,
// B/S ("born/survive") notation, toroidal (wraparound) grid -- the same
// family of construction as Conway's Life. Every instrument below (D, G,
// absential, second-order, comparison, coupling) mirrors its 1D counterpart
// exactly, just swapping the neighborhood.

export function emptyGrid2D(h, w) {
  return Array.from({ length: h }, () => new Uint8Array(w));
}

export function randomGrid2D(h, w, density = 0.25) {
  return Array.from({ length: h }, () => Uint8Array.from({ length: w }, () => (Math.random() < density ? 1 : 0)));
}

// A standard 5-cell glider, placed near the top-left corner.
export function gliderGrid2D(h, w) {
  const g = emptyGrid2D(h, w);
  const cells = [[0, 1], [1, 2], [2, 0], [2, 1], [2, 2]];
  cells.forEach(([r, c]) => { g[(2 + r) % h][(2 + c) % w] = 1; });
  return g;
}

export function neighborCount2D(grid, r, c) {
  const h = grid.length, w = grid[0].length;
  let n = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      n += grid[(r + dr + h) % h][(c + dc + w) % w];
    }
  }
  return n;
}

// One step of a Life-like outer-totalistic rule: bornSet/surviveSet are
// arrays of neighbor counts (0-8) that turn a cell on / keep it on.
export function apply2DRule(grid, bornSet, surviveSet) {
  const h = grid.length, w = grid[0].length;
  const bornHas = new Set(bornSet), surviveHas = new Set(surviveSet);
  const out = emptyGrid2D(h, w);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const n = neighborCount2D(grid, r, c);
      const alive = grid[r][c] === 1;
      out[r][c] = alive ? (surviveHas.has(n) ? 1 : 0) : (bornHas.has(n) ? 1 : 0);
    }
  }
  return out;
}

export function C2D(a, b) {
  const h = a.length, w = a[0].length;
  const out = emptyGrid2D(h, w);
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out[r][c] = a[r][c] ^ b[r][c];
  return out;
}

export function D2D(grid, bornSet, surviveSet) {
  return C2D(grid, apply2DRule(grid, bornSet, surviveSet));
}

export function G2D(grid, bornSet, surviveSet) {
  const nextThenD = D2D(apply2DRule(grid, bornSet, surviveSet), bornSet, surviveSet);
  const dThenNext = apply2DRule(D2D(grid, bornSet, surviveSet), bornSet, surviveSet);
  return C2D(nextThenD, dThenNext);
}

// Off-but-Moore-adjacent-to-alive cells (2D analog of metrics.absential_field).
export function absentialField2D(grid) {
  const h = grid.length, w = grid[0].length;
  const out = emptyGrid2D(h, w);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (grid[r][c] === 1) continue;
      out[r][c] = neighborCount2D(grid, r, c) > 0 ? 1 : 0;
    }
  }
  return out;
}

export function stepSecondOrder2D(gridT, gridTMinus1, bornSet, surviveSet) {
  return C2D(apply2DRule(gridT, bornSet, surviveSet), gridTMinus1);
}

export function runSecondOrder2D(grid0, grid1, bornSet, surviveSet, steps) {
  const traj = [grid0, grid1];
  for (let t = 0; t < steps; t++) {
    const prev = traj[traj.length - 2], cur = traj[traj.length - 1];
    traj.push(stepSecondOrder2D(cur, prev, bornSet, surviveSet));
  }
  return traj;
}

// Cross-rule divergence, 2D: path1 repeats (apply A, then B); path2 repeats
// (apply B, then A); records the disagreement grid at each generation.
export function divergenceTrajectory2D(grid0, ruleA, ruleB, steps) {
  let path1 = grid0, path2 = grid0;
  const field = [];
  for (let t = 0; t < steps; t++) {
    field.push(C2D(path1, path2));
    path1 = apply2DRule(apply2DRule(path1, ruleA.born, ruleA.survive), ruleB.born, ruleB.survive);
    path2 = apply2DRule(apply2DRule(path2, ruleB.born, ruleB.survive), ruleA.born, ruleA.survive);
  }
  return field;
}

export function evolveTrajectory2D(grid0, bornSet, surviveSet, steps) {
  let grid = grid0;
  const traj = [];
  for (let t = 0; t < steps; t++) {
    traj.push(grid);
    grid = apply2DRule(grid, bornSet, surviveSet);
  }
  return traj;
}

// Draws a single 2D generation (not a whole trajectory) -- one pixel per cell.
export function renderGrid2DToCanvas(canvas, grid, colorOn, colorOff) {
  const h = grid.length, w = grid[0].length;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = colorOff;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colorOn;
  for (let r = 0; r < h; r++) {
    const row = grid[r];
    for (let c = 0; c < w; c++) if (row[c]) ctx.fillRect(c, r, 1, 1);
  }
}

// ---- metaevolution.py ----

export function populationCountGenerator(state) {
  let s = 0;
  for (const b of state) s += b;
  return s % 256;
}

function trailingCyclePeriod(ruleSequence, window) {
  const tail = ruleSequence.slice(-window);
  for (let period = 1; period <= Math.floor(tail.length / 2); period++) {
    const a = tail.slice(tail.length - period);
    const b = tail.slice(tail.length - 2 * period, tail.length - period);
    if (a.length === b.length && a.every((v, i) => v === b[i])) return period;
  }
  return null;
}

// Runs a meta-evolution lineage in "replace" mode, same algorithm as
// metaevolution.lineage(). Async because divergenceStats is async.
export async function lineage(state0, rule0, generator = populationCountGenerator,
                               maxGenerations = 50, steps = 100, cycleWindow = 6) {
  let state = state0.slice();
  let rule = rule0;
  const history = [];
  const ruleSequence = [rule0];

  for (let gen = 0; gen < maxGenerations; gen++) {
    const newRule = generator(state);
    const field = divergenceTrajectory(state, rule, newRule, steps);
    const stats = await divergenceStats(field);
    const regime = classifyRegime(stats);
    const entry = { gen, rule, newRule, regime, final: stats.final, compressibility: stats.compressibility };
    history.push(entry);

    ruleSequence.push(newRule);
    const period = trailingCyclePeriod(ruleSequence, cycleWindow);
    if (period !== null) {
      entry.cyclePeriod = period;
      break;
    }
    state = applyRule(state, newRule);
    rule = newRule;
  }
  return history;
}
