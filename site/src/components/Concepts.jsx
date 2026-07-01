import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from './Nav.jsx';
import Watermark from './Watermark.jsx';
import { AmbientCA2D } from './AmbientCA.jsx';
import InstrumentViewer from './InstrumentViewer.jsx';
import { buildSeedUrl } from '../lib/exploreSeed.js';

// Explorer's own dark-theme card palette (not shared with this light-theme
// page) -- used only when building ?seed= links, so cards read correctly
// once they land there.
const EXPLORE_COLORS = { cream: 'oklch(0.94 0.02 90)', teal: 'oklch(0.72 0.1 195)', amber: 'oklch(0.72 0.14 75)', purple: 'oklch(0.7 0.13 300)', red: 'oklch(0.66 0.15 22)', blue: 'oklch(0.7 0.13 240)', green: 'oklch(0.7 0.13 150)' };

// Consistent "symbol — role" labels for every viewer across this page.
const L_E = 'E(S) — base state';
const L_D = 'D(S) — derivative';
const L_D2 = 'D²(S) — 2nd derivative';
const L_DE = 'D(E(S)) — evolve-then-differentiate';
const L_ED = 'E(D(S)) — differentiate-then-evolve';
const L_G = 'G(S) — commutator';
const L_A = 'A(S) — absential';
const L_V = 'V(S) — void';

function defaultInitState(n) {
  const arr = new Array(n).fill(0);
  arr[Math.floor(n / 2)] = 1;
  return arr;
}

// Deliberately low-res: every canvas on this page is CSS-scaled up to a
// fixed display size (see InstrumentViewer / gc-field's image-rendering:
// pixelated), so fewer cells means bigger, more legible pixels -- the
// Explorer keeps a much finer 100x100 grid for actual exploration.
const N_CELLS = 24;
const STEPS = 24;
const ON_COLOR = '#2a2420';
const OFF_COLOR = '#fbfaf7';
const ACCENT = 'oklch(0.5 0.1 195)';
const INK_SOFT = '#6b6055';

const RULE_CATALOG = [
  { num: 0, cls: 'I' },
  { num: 4, cls: 'II' },
  { num: 184, cls: 'II' },
  { num: 30, cls: 'III' },
  { num: 110, cls: 'IV' },
  { num: 54, cls: 'IV' },
  { num: 90, cls: null },
];

// The one deliberate spot of color on this page's diagrams -- everything
// else stays black/white so the 0/1 reading never competes with a color
// legend. A class is otherwise-invisible metadata (only known for the 7
// catalog rules above), so a small dot earns its keep here.
const CLASS_COLOR = { I: 'oklch(0.7 0.02 90)', II: 'oklch(0.6 0.12 195)', III: 'oklch(0.6 0.16 22)', IV: 'oklch(0.55 0.14 300)' };
const CLASS_COLOR_UNKNOWN = 'var(--rule)';

const PAIR_PRESETS = [
  { a: 90, b: 150, regime: 'commute', note: 'both linear, weights align' },
  { a: 90, b: 165, regime: 'crystalline', note: 'linear vs affine-biased' },
  { a: 110, b: 30, regime: 'noisy', note: 'Class IV vs Class III' },
  { a: 110, b: 54, regime: 'structured', note: 'Class IV vs Class IV-ish' },
  { a: 184, b: 250, regime: 'drain', note: 'low image-ratio pair' },
];

// Literal colors for canvas fillStyle -- canvas doesn't resolve CSS custom
// properties, so this mirrors (not references) the --commute/etc tokens.
const REGIME_CANVAS_COLOR = {
  commute: 'oklch(0.58 0.13 150)',
  crystalline: 'oklch(0.58 0.13 240)',
  noisy: 'oklch(0.58 0.13 300)',
  structured: 'oklch(0.6 0.14 75)',
  drain: 'oklch(0.56 0.15 22)',
};

const TOC = [
  ['#ca', 'Cellular automata'],
  ['#calculus', 'Boolean calculus'],
  ['#state', 'State → State'],
  ['#secondderivative', 'Second derivative'],
  ['#evolvederivative', 'Evolving the derivative'],
  ['#commutator', 'The Groovy Commutator G'],
  ['#absential', 'Absential cells'],
  ['#secondorder', 'Reversible memory'],
  ['#coupling', 'Coupling rules'],
  ['#prehoc', 'The fourth input'],
  ['#rulefield', 'Rule fields'],
];

const pill = { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.76rem', fontWeight: 600, textDecoration: 'none', background: 'var(--bg-alt)', color: 'var(--ink-soft)', padding: '0.35rem 0.7rem', borderRadius: 999 };
const sectionKicker = { fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-soft)' };
const h2Style = { fontFamily: "'Lora',serif", fontSize: '1.35rem', margin: '0.3em 0 0.5em', fontWeight: 600 };
const h3Style = { fontFamily: "'Lora',serif", fontSize: '1.1rem', margin: '1.4em 0 0.5em', fontWeight: 600 };
const pBody = { fontSize: '0.98rem', color: 'var(--ink-soft)', margin: '0 0 1.1rem', maxWidth: '60ch' };
const formulaBlock = { fontFamily: "'IBM Plex Mono',monospace", background: 'var(--bg-alt)', border: '1px solid var(--rule)', padding: '0.9rem 1.1rem', borderRadius: 8, fontSize: '0.86rem', margin: '0 0 1.1rem' };

const CLASS_EXAMPLES = [
  { rule: 0, cls: 'I' },
  { rule: 4, cls: 'II' },
  { rule: 30, cls: 'III' },
  { rule: 110, cls: 'IV' },
];

// Fixed, non-interactive reference examples -- one per informal Wolfram
// class -- computed once on mount, independent of whatever rule the
// reader later picks in the interactive panel below.
function ClassExamples() {
  const refsRef = useRef(CLASS_EXAMPLES.map(() => ({ current: null })));
  useEffect(() => {
    let cancelled = false;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled) return;
      const n = 90, steps = 90;
      const s0 = engine.randomState(n, 7);
      CLASS_EXAMPLES.forEach((ex, i) => {
        const field = engine.evolveTrajectory(s0, ex.rule, steps);
        const canvas = refsRef.current[i].current;
        if (canvas) engine.renderFieldToCanvas(canvas, field, '#2a2420', '#f1ead9');
      });
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', margin: '0 0 1.1rem' }}>
      {CLASS_EXAMPLES.map((ex, i) => (
        <div key={ex.rule} style={{ flex: '1 1 120px', minWidth: 100, maxWidth: 160 }}>
          <canvas className="gc-field" ref={refsRef.current[i]} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
          <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem', textAlign: 'center' }}>
            Class {ex.cls} &middot; rule {ex.rule}
          </div>
        </div>
      ))}
    </div>
  );
}

// The one standard way a rule's neighborhood -> output mapping is drawn
// anywhere on this page (except inside actual formula/code blocks):
// three black/white input cells, an arrow, one output cell. `outlined`
// wraps the whole glyph in a border, for grouping several of these
// together as "one entry in a table" (vs. loose, for a plainer inline
// list). `onToggleOut`, when given, makes the *entire* glyph clickable
// (not just the output cell) -- clicking anywhere still only flips the
// output bit, since the inputs are fixed by definition; the bigger target
// is just easier to hit. Omit it for a read-only reference glyph. Built
// from spans, not divs, so the interactive version can be a single
// <button> without nesting a button inside a button.
function RuleGlyph({ l, c, r, out, outlined = false, size = 14, onToggleOut }) {
  const boxStyle = (bit, accent) => ({
    width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'IBM Plex Mono',monospace", fontSize: Math.round(size * 0.6), fontWeight: 700,
    background: bit ? ON_COLOR : OFF_COLOR, color: bit ? OFF_COLOR : ON_COLOR,
    border: accent ? '1.5px solid var(--accent)' : '1px solid var(--ink)', flex: 'none', lineHeight: 1,
  });
  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ display: 'inline-flex', gap: 1 }}>
        <span style={boxStyle(l)}>{l}</span>
        <span style={boxStyle(c)}>{c}</span>
        <span style={boxStyle(r)}>{r}</span>
      </span>
      <span className="gc-mono" style={{ fontSize: Math.round(size * 0.75), color: 'var(--ink-soft)' }}>&rarr;</span>
      <span style={boxStyle(out, !!onToggleOut)}>{out}</span>
    </span>
  );
  const outlineStyle = outlined ? { border: '1px solid var(--ink-soft)', borderRadius: 4, padding: 3 } : {};
  if (onToggleOut) {
    return (
      <button onClick={onToggleOut} style={{ display: 'inline-flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', ...outlineStyle }}>
        {inner}
      </button>
    );
  }
  return <span style={{ display: 'inline-flex', ...outlineStyle }}>{inner}</span>;
}

// A small live-updating canvas thumbnail that doubles as a jump link to
// wherever that field is actually explained -- lets the rule panel show
// "here's what this looks like for your rule" without duplicating the
// explanation itself.
function MiniLinkThumb({ href, canvasRef, label, size = 64 }) {
  return (
    <a href={href} style={{ position: 'relative', display: 'block', textDecoration: 'none', flex: 'none' }} title={'jump to where ' + label + ' is explained'}>
      <canvas className="gc-field" ref={canvasRef} style={{ width: size, height: size }}></canvas>
      <div className="gc-mono" style={{ position: 'absolute', bottom: 3, right: 3, fontSize: '0.58rem', fontWeight: 700, color: '#fff', background: 'rgba(42,36,32,0.7)', padding: '1px 4px', borderRadius: 4 }}>{label}</div>
    </a>
  );
}

// A fixed, hand-computable worked example -- rule 90 (output = left XOR
// right, ignoring the center cell entirely), n=7, one seed cell -- walked
// row by row, cell by cell, so a reader can verify every single bit by
// hand before ever looking at a space-time diagram where this same
// arithmetic runs thousands of times too fast to see. Independent of the
// interactive rule/state above -- deliberately never changes.
const WALK_RULE = 90;
const WALK_N = 7;
const WALK_LUT = Array.from({ length: 8 }, (_, i) => (WALK_RULE >> i) & 1);
const WALK_ROW0 = [0, 0, 0, 1, 0, 0, 0];
// Same all-on-to-all-off order used everywhere else on this page.
const WALK_LUT_ROWS = [7, 6, 5, 4, 3, 2, 1, 0].map((idx) => ({
  idx, l: (idx >> 2) & 1, c: (idx >> 1) & 1, r: idx & 1, out: WALK_LUT[idx],
}));

function walkStep(row) {
  const out = new Array(WALK_N);
  const detail = [];
  for (let i = 0; i < WALK_N; i++) {
    const l = row[(i - 1 + WALK_N) % WALK_N];
    const c = row[i];
    const r = row[(i + 1) % WALK_N];
    const idx = 4 * l + 2 * c + r;
    const bit = WALK_LUT[idx];
    out[i] = bit;
    detail.push({ i, l, c, r, idx, bit });
  }
  return { out, detail };
}

const walkThtd = { padding: '0.25rem 0.55rem', whiteSpace: 'nowrap' };

function WalkCell({ bit }) {
  return (
    <div style={{
      width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'IBM Plex Mono',monospace", fontSize: '0.72rem', fontWeight: 700,
      background: bit ? ON_COLOR : OFF_COLOR, color: bit ? OFF_COLOR : 'var(--ink-soft)',
      border: '1px solid var(--rule)', flex: 'none',
    }}>{bit}</div>
  );
}

function WalkRow({ row }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {row.map((bit, i) => <WalkCell key={i} bit={bit} />)}
    </div>
  );
}

function WalkStepTable({ detail, label }) {
  return (
    <div style={{ overflowX: 'auto', margin: '0.5rem 0 1rem' }}>
      <table className="gc-mono" style={{ borderCollapse: 'collapse', fontSize: '0.72rem', width: '100%' }}>
        <thead>
          <tr style={{ color: 'var(--ink-soft)', textAlign: 'left' }}>
            <th style={walkThtd}>cell i</th>
            <th style={walkThtd}>left, self, right</th>
            <th style={walkThtd}>as index</th>
            <th style={walkThtd}>rule 90 says</th>
            <th style={walkThtd}>{label}[i]</th>
          </tr>
        </thead>
        <tbody>
          {detail.map((d) => (
            <tr key={d.i} style={{ borderTop: '1px solid var(--rule)' }}>
              <td style={walkThtd}>{d.i}</td>
              <td style={walkThtd}>{d.l}, {d.c}, {d.r}</td>
              <td style={walkThtd}>{d.l}{d.c}{d.r} = {d.idx}</td>
              <td style={walkThtd}>lookup[{d.idx}] = {d.bit}</td>
              <td style={{ ...walkThtd, fontWeight: 700 }}>{d.bit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RuleWalkthrough() {
  const [open, setOpen] = useState(false);
  const s1 = walkStep(WALK_ROW0);
  const s2 = walkStep(s1.out);
  const s3 = walkStep(s2.out);

  return (
    <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 8, padding: '1.1rem 1.2rem', margin: '1.2rem 0' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="gc-mono"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5em', width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)' }}
      >
        <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>&#9656;</span>
        Worked example &mdash; rule 90, by hand
      </button>
      {!open && (
        <p style={{ ...pBody, fontSize: '0.92rem', margin: '0.6rem 0 0' }}>
          New to reading these diagrams? Expand this for a slow, deliberately tedious walkthrough &mdash; every cell,
          every row, by hand &mdash; of exactly how one rule turns one row into the next, so nothing below is a
          mystery.
        </p>
      )}
      {open && <>
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '0.8rem' }}>
        Rule 90's table, read as three cells in, one cell out, in the same all-on-to-all-off order as everywhere
        else on this page:
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0.5rem 0 1rem' }}>
        {WALK_LUT_ROWS.map((nb) => <RuleGlyph key={nb.idx} l={nb.l} c={nb.c} r={nb.r} out={nb.out} outlined />)}
      </div>
      <p style={{ ...pBody, fontSize: '0.92rem' }}>
        Rule 90 happens to be a special case worth noticing: compare <code className="gc-code">111&rarr;0</code>{' '}
        against <code className="gc-code">101&rarr;0</code> above &mdash; the center bit flips from 1 to 0 and the
        output doesn't change. That holds for every entry in this table: rule 90's output turns out to depend only
        on the left and right neighbors (it's just left XOR right), with the center cell along for the ride. That's
        specific to rule 90, not a fact about rules in general &mdash; normally the center cell matters just as much
        as its neighbors, and each of the eight entries above is independently editable. Seven cells in a ring, one
        seed lit in the middle, index 3:
      </p>
      <WalkRow row={WALK_ROW0} />
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '0.8rem' }}>
        To get row 1, every cell looks at its own left/self/right neighbors in row 0 (wrapping around the ends:
        cell 0's left neighbor is cell 6, cell 6's right neighbor is cell 0), reads those three bits as a binary
        index into the table above, and writes down whatever that entry says. All seven cells, one at a time:
      </p>
      <WalkStepTable detail={s1.detail} label="row 1" />
      <WalkRow row={s1.out} />
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '0.8rem' }}>
        Same process again, row 1 &rarr; row 2 &mdash; no shortcuts, just the same eight-entry table applied seven
        more times:
      </p>
      <WalkStepTable detail={s2.detail} label="row 2" />
      <WalkRow row={s2.out} />
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '0.8rem' }}>
        And once more, row 2 &rarr; row 3:
      </p>
      <WalkStepTable detail={s3.detail} label="row 3" />
      <WalkRow row={s3.out} />
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '1rem' }}>
        Now stack those four rows in the order they were computed, oldest on top, and stop reading the individual
        bits:
      </p>
      <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2, background: OFF_COLOR, padding: 4, border: '1px solid var(--rule)' }}>
        <WalkRow row={WALK_ROW0} />
        <WalkRow row={s1.out} />
        <WalkRow row={s2.out} />
        <WalkRow row={s3.out} />
      </div>
      <p style={{ ...pBody, fontSize: '0.92rem', marginTop: '0.8rem' }}>
        That's it &mdash; that's the whole trick behind every space-time diagram on this site, including the ones
        below. Every "weird pattern" from here on is exactly this arithmetic: one small lookup table, applied to
        every cell, one row at a time, just run for hundreds of steps and thousands of cells instead of seven and
        three, too fast and too small to watch bit by bit. When a diagram looks like noise or like lace, there's
        nothing hidden in it beyond what you just did by hand above.
      </p>
      </>}
    </div>
  );
}

// Compact live demo of two mutually pre-hoc coupled layers -- the mechanism
// is explained in the section around it; the full experimental findings
// live on the questions page. Self-contained (imports the engine itself)
// so it doesn't touch the sticky rule panel's plumbing.
function PrehocMiniDemo() {
  const [seed, setSeed] = useState(3);
  const engineRef = useRef(null);
  const aRef = useRef(null);
  const bRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled) return;
      engineRef.current = engine;
      draw();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(); });

  function draw() {
    const engine = engineRef.current;
    if (!engine) return;
    const { randomState, coupledTrajectory, rule4FromPair, renderFieldToCanvas } = engine;
    const res = coupledTrajectory(randomState(90, seed), randomState(90, seed + 101),
      rule4FromPair(77, 55), rule4FromPair(44, 23), 90);
    if (aRef.current) renderFieldToCanvas(aRef.current, res.a, ON_COLOR, '#f1ead9');
    if (bRef.current) renderFieldToCanvas(bRef.current, res.b, 'oklch(0.5 0.1 195)', '#f1ead9');
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem', flexWrap: 'wrap' }}>
      {[[aRef, 'layer A: rule 77 or 55, chosen per cell by B'],
        [bRef, 'layer B: rule 44 or 23, chosen per cell by A']].map(([ref, label]) => (
        <div key={label} style={{ width: 160 }}>
          <canvas className="gc-field" ref={ref} style={{ width: 160, height: 160 }}></canvas>
          <div className="gc-mono" style={{ fontSize: '0.66rem', color: INK_SOFT, marginTop: 3 }}>{label}</div>
        </div>
      ))}
      <button onClick={() => setSeed((s) => s + 1)} className="gc-mono"
        style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: 7, border: '1px solid var(--rule)', background: '#fff', color: INK_SOFT, cursor: 'pointer' }}>
        reroll ↻
      </button>
    </div>
  );
}

// Compact live demo of state-gated rule transport (non-uniform CA) --
// mechanism here, findings on the questions page.
function RuleFieldMiniDemo() {
  const [seed, setSeed] = useState(2);
  const engineRef = useRef(null);
  const stateRef = useRef(null);
  const rulesRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled) return;
      engineRef.current = engine;
      draw();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { draw(); });

  function draw() {
    const engine = engineRef.current;
    if (!engine) return;
    const { randomState, mulberry32, gatedDiffusionTrajectory, renderFieldToCanvas, renderByteFieldToCanvas } = engine;
    const s0 = randomState(90, seed);
    const rng = mulberry32(seed + 40);
    const rf0 = Array.from({ length: 90 }, () => Math.floor(rng() * 256));
    const res = gatedDiffusionTrajectory(s0, rf0, 90);
    if (stateRef.current) renderFieldToCanvas(stateRef.current, res.states, ON_COLOR, '#f1ead9');
    if (rulesRef.current) renderByteFieldToCanvas(rulesRef.current, res.rules);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.2rem', flexWrap: 'wrap' }}>
      {[[stateRef, 'the state, each cell under its own rule'],
        [rulesRef, 'the rule field — one color per rule value']].map(([ref, label]) => (
        <div key={label} style={{ width: 160 }}>
          <canvas className="gc-field" ref={ref} style={{ width: 160, height: 160 }}></canvas>
          <div className="gc-mono" style={{ fontSize: '0.66rem', color: INK_SOFT, marginTop: 3 }}>{label}</div>
        </div>
      ))}
      <button onClick={() => setSeed((s) => s + 1)} className="gc-mono"
        style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.4rem 0.8rem', borderRadius: 7, border: '1px solid var(--rule)', background: '#fff', color: INK_SOFT, cursor: 'pointer' }}>
        reroll ↻
      </button>
    </div>
  );
}

export default function Concepts() {
  const [rule, setRule] = useState(110);
  const [ruleInputText, setRuleInputText] = useState('110');
  const [initState, setInitState] = useState(() => defaultInitState(N_CELLS));
  const [xorA, setXorA] = useState(0);
  const [xorB, setXorB] = useState(1);
  const [pairIdx, setPairIdx] = useState(2);
  const [secondOrderStatus, setSecondOrderStatus] = useState('computing…');
  const [isStuck, setIsStuck] = useState(false);
  const [ruleDetailOpen, setRuleDetailOpen] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [breakoutLeft, setBreakoutLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(58);
  const [engineReady, setEngineReady] = useState(false);
  const [computed, setComputed] = useState(null);

  const engineRef = useRef(null);
  const sentinelRef = useRef(null);
  const caRef = useRef(null);
  const miniDRef = useRef(null);
  const miniARef = useRef(null);
  const secondOrderRef = useRef(null);
  const pairRef = useRef(null);
  // Kept in sync with headerHeight state, but read from the setInterval
  // poll below -- that closure is created once on mount and would otherwise
  // never see header-height updates from later resizes.
  const headerHeightRef = useRef(58);

  const measureBreakout = useCallback(() => {
    if (!sentinelRef.current) return;
    const rect = sentinelRef.current.getBoundingClientRect();
    setBreakoutLeft(rect.left);
    setViewportWidth(window.innerWidth);
    // The nav wraps to two lines below ~480px, so its real height varies --
    // a hardcoded top offset leaves this panel's sticky bits rendering
    // partly underneath the (higher z-index) nav on narrow screens.
    const header = document.querySelector('.gc-header');
    if (header) {
      const h = header.getBoundingClientRect().height;
      setHeaderHeight(h);
      headerHeightRef.current = h;
    }
  }, []);

  useEffect(() => {
    import('../lib/groovy-engine.js').then((engine) => {
      engineRef.current = engine;
      setEngineReady(true);
    });
    measureBreakout();
    window.addEventListener('resize', measureBreakout);
    const stickyPoll = setInterval(() => {
      if (!sentinelRef.current) return;
      const stuck = sentinelRef.current.getBoundingClientRect().top <= headerHeightRef.current;
      setIsStuck((prev) => (prev === stuck ? prev : stuck));
    }, 120);
    return () => {
      clearInterval(stickyPoll);
      window.removeEventListener('resize', measureBreakout);
    };
  }, [measureBreakout]);

  // ---- redraw single-rule views whenever rule or initState changes ----
  useEffect(() => {
    if (!engineReady) return;
    const { evolveTrajectory, dTrajectory, d2Trajectory, gTrajectory, deTrajectory, edTrajectory,
      absentialTrajectory, runSecondOrder, verifySecondOrderReversible, renderFieldToCanvas } = engineRef.current;
    const s0 = Uint8Array.from(initState);

    const raw = evolveTrajectory(s0, rule, STEPS);
    if (caRef.current) renderFieldToCanvas(caRef.current, raw, ON_COLOR, '#f1ead9');

    const dField = dTrajectory(s0, rule, STEPS);
    if (miniDRef.current) renderFieldToCanvas(miniDRef.current, dField, ACCENT, '#f1ead9');
    const d2Field = d2Trajectory(s0, rule, STEPS);
    const gField = gTrajectory(s0, rule, STEPS);
    const deField = deTrajectory(s0, rule, STEPS);
    const edField = edTrajectory(s0, rule, STEPS);
    const absField = absentialTrajectory(s0, rule, STEPS);
    if (miniARef.current) renderFieldToCanvas(miniARef.current, absField, 'oklch(0.6 0.14 75)', '#f1ead9');
    // V(S) = NOT(S OR A(S)) -- void is whatever's left once live and
    // absential cells are accounted for (see the partition note below).
    const voidField = raw.map((row, t) => {
      const out = new Uint8Array(row.length);
      for (let i = 0; i < row.length; i++) out[i] = (row[i] || absField[t][i]) ? 0 : 1;
      return out;
    });
    setComputed({ raw, d: dField, d2: d2Field, g: gField, de: deField, ed: edField, absential: absField, void: voidField });

    const soTraj = runSecondOrder(s0, s0, rule, STEPS);
    if (secondOrderRef.current) renderFieldToCanvas(secondOrderRef.current, soTraj, 'oklch(0.5 0.12 230)', '#f1ead9');
    const reversible = verifySecondOrderReversible(soTraj, rule);
    setSecondOrderStatus(
      reversible
        ? 'confirmed — ran the recurrence backward from the final two states and recovered every earlier state exactly.'
        : 'mismatch found (unexpected — please report this).'
    );
  }, [engineReady, rule, initState]);

  // ---- redraw the cross-rule pair view whenever the preset changes ----
  useEffect(() => {
    if (!engineReady) return;
    const { divergenceTrajectory, randomState, renderFieldToCanvas } = engineRef.current;
    const preset = PAIR_PRESETS[pairIdx];
    const s0 = randomState(N_CELLS, 11);
    const field = divergenceTrajectory(s0, preset.a, preset.b, STEPS);
    if (pairRef.current) renderFieldToCanvas(pairRef.current, field, REGIME_CANVAS_COLOR[preset.regime], '#f1ead9');
  }, [engineReady, pairIdx]);

  function selectRule(num) {
    const clamped = Math.max(0, Math.min(255, num | 0));
    setRule(clamped);
    setRuleInputText(String(clamped));
  }
  function toggleOutputBit(idx) { selectRule(rule ^ (1 << idx)); }
  function handleRuleInputChange(e) {
    const text = e.target.value;
    setRuleInputText(text);
    const n = parseInt(text, 10);
    // Clamp the live rule immediately (so every keystroke gives valid
    // behavior), but leave the displayed text alone until blur -- snapping
    // it mid-typing would make it impossible to type e.g. "200" one digit
    // at a time.
    if (!isNaN(n)) setRule(Math.max(0, Math.min(255, n | 0)));
  }
  function handleRuleInputBlur() {
    const n = parseInt(ruleInputText, 10);
    const clamped = isNaN(n) ? rule : Math.max(0, Math.min(255, n | 0));
    setRule(clamped);
    setRuleInputText(String(clamped));
  }
  function toggleCell(i) {
    setInitState((s) => { const arr = s.slice(); arr[i] = arr[i] ? 0 : 1; return arr; });
  }
  function rerollInit() {
    setInitState(Array.from({ length: N_CELLS }, () => (Math.random() < 0.5 ? 0 : 1)));
  }

  const activeRule = RULE_CATALOG.find((r) => r.num === rule);
  const xorResult = xorA ^ xorB;
  const selectedPreset = PAIR_PRESETS[pairIdx];
  const isAffine = engineReady ? engineRef.current.isAffineRule(rule) : null;
  const selectedGlyphs = engineReady ? engineRef.current.ruleNeighborhoods(rule) : [];

  // Sticky is actively hostile on narrow screens: expanded, this panel is
  // tall enough to cover the entire viewport while pinned, blocking every
  // section it's supposed to accompany. Below the breakpoint it just scrolls
  // with the page like anything else -- scroll up if you want it again.
  const isNarrowViewport = viewportWidth > 0 && viewportWidth < 640;
  const stickyPanelStyle = isNarrowViewport
    ? {
        position: 'static',
        borderTop: '3px solid var(--accent)', borderBottom: '1px solid var(--rule)', background: '#fff',
      }
    : {
        position: 'sticky', top: headerHeight, zIndex: 5,
        borderTop: '3px solid var(--accent)', borderBottom: '1px solid var(--rule)', background: '#fff',
        transition: 'width 0.2s ease, margin-left 0.2s ease, box-shadow 0.2s ease',
        ...(isStuck
          ? { width: viewportWidth, marginLeft: -breakoutLeft, boxShadow: '0 6px 16px rgba(42,36,32,0.16)' }
          : { width: '100%', marginLeft: 0, boxShadow: 'none' }),
      };

  // Shared pieces reused by both the desktop sticky panel and the mobile
  // "chip + full-screen sheet" version below -- same controls, different
  // wrapper.
  const ruleAndPicksRow = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span className="gc-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-soft)' }}>Rule</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} title="click a digit to flip that bit">
          {selectedGlyphs.map((nb, i) => (
            <button key={nb.idx} onClick={() => toggleOutputBit(nb.idx)} className="gc-mono"
              style={{
                width: 16, height: 18, padding: 0, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1,
                background: nb.out ? ON_COLOR : OFF_COLOR, color: nb.out ? OFF_COLOR : ON_COLOR,
                border: '1.5px solid var(--accent)',
                marginRight: i === 3 ? 4 : 0,
              }}>{nb.out}</button>
          ))}
        </div>
        <span className="gc-mono" style={{ fontSize: '0.85rem', color: 'var(--ink-soft)' }}>=</span>
        <input type="number" min="0" max="255" value={ruleInputText} onChange={handleRuleInputChange} onBlur={handleRuleInputBlur}
          className="gc-mono" style={{ width: '4rem', fontSize: '1rem', fontWeight: 700, textAlign: 'center', padding: '0.35rem 0.3rem', borderRadius: 6, border: '1px solid var(--accent)', background: '#fff', color: 'var(--ink)' }} />
        <span className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>(0&ndash;255)</span>
      </div>

      <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
        quick picks:{' '}
        {RULE_CATALOG.map((r, i) => {
          const active = r.num === rule;
          return (
            <span key={r.num}>
              <button onClick={() => selectRule(r.num)} className="gc-mono" style={{ fontSize: '0.78rem', fontWeight: 700, padding: 0, border: 'none', background: 'none', cursor: 'pointer', textDecoration: active ? 'underline' : 'none', color: active ? ACCENT : INK_SOFT }}>{r.num}</button>
              {i < RULE_CATALOG.length - 1 ? ' · ' : ''}
            </span>
          );
        })}
      </div>
    </div>
  );

  const startingRowInner = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span className="gc-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-soft)' }}>Starting row:</span>
      <div style={{ display: 'flex', gap: 1 }}>
        {initState.map((bit, i) => (
          <button key={i} onClick={() => toggleCell(i)} style={{ width: 9, height: 9, padding: 0, border: '1px solid var(--ink)', background: bit ? ON_COLOR : OFF_COLOR, cursor: 'pointer', flex: 'none' }}></button>
        ))}
      </div>
      <button onClick={rerollInit} className="gc-mono" style={{ fontSize: '0.68rem', fontWeight: 700, background: 'none', border: '1px solid var(--rule)', borderRadius: 4, color: 'var(--accent)', cursor: 'pointer', padding: '2px 8px' }}>randomize</button>
    </div>
  );

  const glyphAndThumbsRow = (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '0.8rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '4px 10px' }}>
        {selectedGlyphs.map((nb) => (
          <div key={nb.idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span className="gc-mono" style={{ fontSize: '0.6rem', color: 'var(--ink-soft)' }}>{nb.idx}</span>
            <RuleGlyph l={nb.l} c={nb.c} r={nb.r} out={nb.out} outlined size={13} onToggleOut={() => toggleOutputBit(nb.idx)} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <MiniLinkThumb href="#phi-formal" canvasRef={caRef} label="E(S)" />
        <MiniLinkThumb href="#comparison-differentiation" canvasRef={miniDRef} label="D(S)" />
        <MiniLinkThumb href="#absential" canvasRef={miniARef} label="A(S)" />
      </div>
    </div>
  );

  const statsRowInner = (
    <div className="gc-mono" style={{ display: 'flex', gap: '1.6rem', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--ink-soft)' }}>
      <span>rule <strong style={{ color: 'var(--ink)' }}>{rule}</strong></span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
        class{' '}
        <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', color: 'var(--ink)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, flex: 'none', background: activeRule && activeRule.cls ? CLASS_COLOR[activeRule.cls] : CLASS_COLOR_UNKNOWN }}></span>
          {activeRule && activeRule.cls ? activeRule.cls : 'unclassified'}
        </strong>
      </span>
      <span>affine (GF2) <strong style={{ color: 'var(--ink)' }}>{isAffine === null ? '…' : isAffine ? 'yes' : 'no'}</strong></span>
      <span>density <strong style={{ color: 'var(--ink)' }}>{selectedGlyphs.reduce((n, g) => n + g.out, 0)}/8 on</strong></span>
    </div>
  );

  return (
    <>
      <Nav active="concepts" />
      <Watermark title="AI-written prose, live-computed demos">
        {' '}The writing on this page was generated by an LLM. The little widgets below it are not: they run the
        real <code className="gc-code">groovy</code> math (XOR, the rule lookup table, the commutator) live in your
        browser, reimplemented from the <a href="https://github.com/mbilokonsky/groovy-commutator">Python source</a>.
        Check that source if anything here matters to you.
      </Watermark>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        <div className="gc-mono" style={{ textTransform: 'uppercase', letterSpacing: '.09em', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5em' }}>concepts</div>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(1.8rem,5vw,2.4rem)', lineHeight: 1.25, margin: '0 0 0.4em', fontWeight: 600 }}>The building blocks, one at a time</h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-soft)', margin: '0 0 1.4em', maxWidth: '62ch' }}>
          Everything on this site is built from a handful of small pieces. None of them are individually complicated
          &mdash; play with each one before moving to the next.
        </p>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0 0 2rem' }}>
          {TOC.map(([href, label]) => <a key={href} href={href} style={pill}>{label}</a>)}
        </nav>

        {/* CELLULAR AUTOMATA -- general definition, then 1D, then 2D as commentary */}
        <section id="ca" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Substrate</div>
          <h2 style={h2Style}>Cellular automata</h2>
          <p style={pBody}>
            A cellular automaton is a regular grid of cells, each holding a small value (here, just 0 or 1), all
            updating together, forever, according to one shared rule that only ever looks at a cell's local
            neighborhood &mdash; never the whole grid. The grid itself can have any number of dimensions: a line, a
            2D plane, a 3D lattice. The definition doesn't care. What changes as dimension goes up is how big the
            neighborhood is, and how much rule-space there is to explore.
          </p>

          <h3 style={h3Style}>In one dimension</h3>
          <p style={pBody}>
            Start with the simplest case: a single row of cells, arranged in a circle so the last cell's right
            neighbor wraps back around to the first. Each tick, every cell looks at itself and its two immediate
            neighbors &mdash; three cells, eight possible on/off combinations, conventionally listed all-on down to
            all-off (111, 110, 101, 100, 011, 010, 001, 000). A rule is nothing more than a table of eight
            outputs, one per combination. Read those eight outputs off in that order as a binary number and you get
            the <strong>rule number</strong> &mdash; rule 110, rule 30, rule 90, and so on. 256 possible rules
            total. The interactive rule-builder below shows exactly this table: eight small diagrams, three cells on
            the left (the neighborhood, fixed) and one cell on the right (the output, click to flip it and build
            your own rule live).
          </p>

          <RuleWalkthrough />

          <h3 style={h3Style}>Four rough classes</h3>
          <p style={pBody}>
            Wolfram's informal classification of what a rule does, long-run, run from one random starting row:
          </p>
          <ClassExamples />
          <p style={pBody}>
            Class I dies out to a fixed pattern, Class II settles into small repeating cycles, Class III looks like
            noise, and Class IV sits in between &mdash; structured, but not obviously periodic. These labels are
            informal, not rigorous &mdash; see <code className="gc-code">classify.py</code>. Treat them as a
            starting vocabulary, not ground truth.
          </p>

          <h3 style={h3Style}>In more than one dimension</h3>
          <p style={pBody}>
            The same idea generalizes straightforwardly to a grid: each cell looks at its 8 neighbors (the Moore
            neighborhood) instead of 2. Listing outputs for a 512-entry table by hand is unwieldy, so 2D rules are
            usually specified by neighbor <em>count</em> instead of exact pattern &mdash; "born on N neighbors,
            survive on M" (<strong>B/S notation</strong>). Conway's Life is B3/S23. One conventional difference in
            how these get drawn: 1D CA are usually shown with time running down the page, since the row itself
            already fills the horizontal axis; 2D CA use both spatial axes for space, so time has to play out as an
            actual animation instead. Here's Life running on its own, no controls, just for texture:
          </p>
          <AmbientCA2D size={180} />
          <p style={{ ...pBody, marginTop: '1.1rem' }}>
            Rule-space also explodes fast with dimension. 1D elementary CA have 256 possible rules; the B/S family
            of 2D rules alone has 512 &times; 512 = 262,144; a rule sensitive to the exact 2D neighborhood pattern
            (the direct analog of the 1D lookup table, but for 9 cells instead of 3) would have 2<sup>512</sup> of
            them &mdash; a number too large to be worth writing out.
          </p>
          <p style={pBody}>
            Everything below works the 1D case by hand, since it's small enough to see clearly &mdash; but every
            instrument here (derivative, commutator, absential field, reversible memory) is defined identically
            regardless of dimension; only the neighborhood changes. The{' '}
            <a href="explorer.html" style={{ color: 'var(--accent)' }}>explorer</a> lets you build and couple 2D
            rules the same way as 1D.
          </p>
        </section>

        <hr style={{ border: 'none', borderTop: '1px solid var(--rule)', margin: 0 }} />

        {/* RULE + STARTING-ROW PANEL, shared by everything below through Instruments.
            Desktop: sticky, collapsible. Mobile: a small persistent chip that opens
            a full-screen sheet, since sticky-and-expanded is tall enough to cover
            the whole viewport on a phone -- see isNarrowViewport above. */}
        <div style={{ position: 'relative' }}>
          <div ref={sentinelRef} style={{ height: 1 }}></div>

          {isNarrowViewport ? (
            <>
              <div style={{ position: 'sticky', top: headerHeight, zIndex: 5, background: '#fff', borderTop: '3px solid var(--accent)', borderBottom: '1px solid var(--rule)' }}>
                <button onClick={() => setMobileSheetOpen(true)} className="gc-mono" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '0.6rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)' }}>
                  <span>Rule {rule}</span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.72rem' }}>edit &#9656;</span>
                </button>
              </div>

              {/* display-toggled, not unmounted, so the mini canvases inside
                  keep their drawn pixels between opens instead of flashing
                  blank while the next redraw catches up. */}
              <div style={{ display: mobileSheetOpen ? 'block' : 'none', position: 'fixed', inset: 0, zIndex: 50, background: '#fff', overflowY: 'auto', padding: '1rem 1.25rem 2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span className="gc-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Rule editor</span>
                  <button onClick={() => setMobileSheetOpen(false)} className="gc-mono" style={{ fontSize: '0.85rem', fontWeight: 700, background: 'none', border: '1px solid var(--rule)', borderRadius: 6, padding: '0.3rem 0.7rem', cursor: 'pointer', color: 'var(--ink)' }}>&times; close</button>
                </div>
                {ruleAndPicksRow}
                {startingRowInner}
                {glyphAndThumbsRow}
                <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--rule)' }}>
                  {statsRowInner}
                </div>
              </div>
            </>
          ) : (
            <div style={stickyPanelStyle}>
              <div style={{ maxWidth: 880, margin: '0 auto', padding: '0.8rem 1.25rem 0.9rem' }}>
                {ruleAndPicksRow}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: ruleDetailOpen ? 'flex-start' : 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {startingRowInner}
                  {!ruleDetailOpen && (
                    <button onClick={() => setRuleDetailOpen(true)} className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                      <span>&#9656;</span> show rule table
                    </button>
                  )}
                </div>

                {/* Canvas stays mounted (display toggled, not unmounted) so its
                    drawn content survives collapsing the panel -- otherwise
                    reopening would show a blank square until the next redraw. */}
                <div style={{ display: ruleDetailOpen ? 'block' : 'none' }}>
                  {glyphAndThumbsRow}
                </div>

                {ruleDetailOpen && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--rule)' }}>
                    {statsRowInner}
                    <button onClick={() => setRuleDetailOpen(false)} className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.3em', fontSize: '0.68rem', fontWeight: 700, color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>
                      <span style={{ display: 'inline-block', transform: 'rotate(90deg)' }}>&#9656;</span> hide rule table
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <section style={{ padding: '1.6rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '60ch', margin: 0 }}>
                This is the same rule-number/lookup-table system as the four classes shown earlier, now with a rule
                you built yourself. Edit the starting row above (or randomize it) and watch every view on this page
                update from it, including everything in the next few sections.
              </p>
            </div>
          </section>

          {/* BOOLEAN CALCULUS */}
          <section id="calculus" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Foundation</div>
            <h2 style={h2Style}>Boolean calculus</h2>
            <p style={pBody}>
              Every state above is a row of bits. Almost everything from here on is built from a single operation:{' '}
              <strong>XOR</strong> (&oplus;) &mdash; it's 1 exactly where two bits disagree. Click the two bits below:
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <button onClick={() => setXorA(xorA ? 0 : 1)} className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: xorA ? ON_COLOR : OFF_COLOR, color: xorA ? '#faf7f0' : '#2a2420', cursor: 'pointer' }}>{xorA}</button>
              <span className="gc-mono" style={{ fontSize: '1.1rem', color: 'var(--ink-soft)' }}>&oplus;</span>
              <button onClick={() => setXorB(xorB ? 0 : 1)} className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: xorB ? ON_COLOR : OFF_COLOR, color: xorB ? '#faf7f0' : '#2a2420', cursor: 'pointer' }}>{xorB}</button>
              <span className="gc-mono" style={{ fontSize: '1.1rem', color: 'var(--ink-soft)' }}>=</span>
              <div className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: xorResult ? ON_COLOR : OFF_COLOR, color: xorResult ? '#faf7f0' : '#2a2420' }}>{xorResult}</div>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--ink-soft)', margin: '0.9rem 0 1.6rem' }}>GF(2) just means "the two-element field" &mdash; arithmetic where 1 + 1 = 0. That's XOR.</p>

            <h3 id="phi-formal" style={h3Style}>Neighborhoods and rules, formally</h3>
            <div style={formulaBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>&phi;(S)<sub>i</sub> = R<sub>4&middot;S(i&minus;1) + 2&middot;S(i) + S(i+1)</sub></span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>one cell's next value</span></div>
            </div>
            <p style={pBody}>
              This is the rule-table lookup from above, written as a formula instead of a diagram: read cell i's own
              three-cell neighborhood off <code className="gc-code">S</code> (left, self, right), treat those three
              bits as a binary number 0&ndash;7, and use that number to index into the rule's eight-entry table{' '}
              <code className="gc-code">R</code> &mdash; exactly the lookup the worked example above walked through
              by hand, and exactly what the rule-builder's eight little diagrams show, one entry each.{' '}
              <code className="gc-code">&phi;(S)</code> (no subscript) means doing that for every cell{' '}
              <code className="gc-code">i</code> at once, producing a whole new row the same length as{' '}
              <code className="gc-code">S</code>. Every formula from here on treats <code className="gc-code">&phi;</code>{' '}
              as a given, already-understood building block &mdash; one call evolves an entire state by one step.
            </p>

            <h3 id="comparison-differentiation" style={h3Style}>Comparison and differentiation</h3>
            <div style={formulaBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>C(a, b) = a &oplus; b</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>comparison</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>D(S) = C(S, &phi;(S)) = S &oplus; &phi;(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>what changed</span></div>
            </div>
            <p style={pBody}>
              <code className="gc-code">C</code> is just XOR again, named for the role it plays: comparing two
              states bit by bit. <code className="gc-code">D</code> uses it to ask the smallest possible question
              about a rule &mdash; compare the state to what the rule turns it into, one step later. Base state and
              D(S), for Rule {rule}:
            </p>
            <InstrumentViewer
              items={[
                { label: L_E, field: computed && computed.raw, color: ON_COLOR },
                { label: L_D, field: computed && computed.d, color: ACCENT },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.teal },
              ])}
            />

            <h3 style={h3Style}>Integration, and why evolution is Euler's method in disguise</h3>
            <div style={formulaBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>I(a, b) = a &oplus; b</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>integration</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>E(S) = I(S, D(S))</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>evolution</span></div>
            </div>
            <p style={pBody}>
              <code className="gc-code">I</code> is the same arithmetic as <code className="gc-code">C</code> &mdash;
              XOR, again &mdash; but asked in the opposite direction: instead of "how do these two states differ,"
              it's "fold this difference back into a state." That's ordinary numerical integration, discretized:
              Euler's method updates <code className="gc-code">y</code> by <code className="gc-code">y + h&middot;f(y)</code>{' '}
              each step; here the step size <code className="gc-code">h</code> is 1, addition is XOR, and the rate of
              change <code className="gc-code">f</code> is exactly <code className="gc-code">D</code>. Integrating the
              derivative back into the state is <code className="gc-code">E</code> itself:
            </p>
            <div style={formulaBlock}>
              <div>E(S) = I(S, D(S)) = S &oplus; (S &oplus; &phi;(S)) = &phi;(S)</div>
            </div>
            <p style={pBody}>
              Evolution isn't a second, independent rule &mdash; it's what you get from integrating the derivative
              back into the state, over GF(2). <code className="gc-code">I</code> and <code className="gc-code">C</code>{' '}
              being the same operation isn't a coincidence to paper over; it's the point. Comparison and integration
              are the same move, XOR, asked of two different questions.
            </p>
          </section>

          {/* STATE -> STATE */}
          <section id="state" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Foundation</div>
            <h2 style={h2Style}>Everything is State &rarr; State</h2>
            <p style={pBody}>
              <code className="gc-code">D</code>, <code className="gc-code">E</code>, and every instrument below take
              a row of <code className="gc-code">n</code> bits in and return <em>another row of n bits</em> out.
              Nothing compresses, expands, or reinterprets the state &mdash; which is what makes every instrument
              stackable, comparable, and renderable the same way, and what makes an open-ended{' '}
              <a href="explorer.html" style={{ color: 'var(--accent)' }}>explorer</a> possible at all: nothing needs
              a bespoke UI per instrument, because every instrument is the same shape of thing.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
              <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--rule)', borderRadius: 7, background: '#fff' }}>State (n bits)</div>
              <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>&rarr;</span>
              <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--accent)', borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-dark)' }}>instrument</div>
              <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>&rarr;</span>
              <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--rule)', borderRadius: 7, background: '#fff' }}>State (n bits)</div>
            </div>
          </section>

          {/* INSTRUMENTS: D², G, ABSENTIAL, SECOND-ORDER */}
          <section id="secondderivative" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>The second derivative</h2>
            <div style={formulaBlock}>
              <div>D&sup2;(S) = D(D(S))</div>
            </div>
            <p style={pBody}>
              The obvious next move once <code className="gc-code">D</code> exists: apply it to its own output,
              under the same rule. Base state, D(S), and D&sup2;(S), for Rule {rule}:
            </p>
            <InstrumentViewer
              items={[
                { label: L_E, field: computed && computed.raw, color: ON_COLOR },
                { label: L_D, field: computed && computed.d, color: ACCENT },
                { label: L_D2, field: computed && computed.d2, color: 'oklch(0.55 0.14 30)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.teal },
                { id: 3, type: 'transform', dim: '1d', from: 2, op: 'd', rule, color: EXPLORE_COLORS.red },
              ])}
            />
            <p style={{ ...pBody, marginTop: '1.1rem' }}>
              Read the teal panel as "which cells are about to change" &mdash; it's <code className="gc-code">D(S)</code>,
              the difference between E(S) and what the rule turns it into next. The red panel is the same
              question asked one level up: treat <em>that</em> difference field as a state in its own right, and ask
              which of <em>its</em> cells are about to change under the same rule. Not a property of the original
              state directly &mdash; a property of how the state is changing.
            </p>
          </section>

          <section id="evolvederivative" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>Evolving the derivative</h2>
            <div style={formulaBlock}>
              <div>E(D(S)) = &phi;(D(S))</div>
            </div>
            <p style={pBody}>
              Something genuinely strange, worth pausing on before the next section needs it.{' '}
              <code className="gc-code">D(S)</code> is not a state in the usual sense &mdash; it's a mask, "which
              cells are about to change," not "which cells are alive." Nothing stops us from handing it
              to <code className="gc-code">&phi;</code> anyway: <code className="gc-code">&phi;</code> doesn't know
              or care what its input "means," it only sees a row of bits and looks each neighborhood up in the same
              eight-entry table it always uses. <code className="gc-code">E(D(S))</code> is what happens when you
              take that indifference seriously &mdash; reinterpret the derivative field as a fresh state under the
              very same rule, and ask what the rule predicts happens to it next.
            </p>
            <p style={pBody}>
              What does that even mean? Nothing physical, necessarily &mdash; there's no particular reason to expect
              "the future of which-cells-are-changing" to be a meaningful question. But it's a well-defined one:{' '}
              <code className="gc-code">D(S)</code> is a row the same length as <code className="gc-code">S</code>,
              so <code className="gc-code">&phi;</code> applies to it exactly as well as it applies to anything
              else. Whether the result says anything real about the rule or the state is exactly the kind of thing
              worth checking empirically rather than assuming &mdash; which is what the panels below are for. Base
              state, D(S), and E(D(S)), for Rule {rule}:
            </p>
            <InstrumentViewer
              items={[
                { label: L_E, field: computed && computed.raw, color: ON_COLOR },
                { label: L_D, field: computed && computed.d, color: ACCENT },
                { label: L_ED, field: computed && computed.ed, color: 'oklch(0.6 0.14 75)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.teal },
                { id: 3, type: 'transform', dim: '1d', from: 2, op: 'e', rule, color: EXPLORE_COLORS.amber },
              ])}
            />
            <p style={{ ...pBody, marginTop: '1.1rem' }}>
              This is exactly the ingredient the next section needs: the Groovy Commutator compares this field
              &mdash; differentiate, then evolve &mdash; against its mirror image, evolve then differentiate.
              Having it defined and looked at on its own first should make that comparison easier to read.
            </p>
          </section>

          <section id="commutator" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)', background: 'var(--bg)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>The Groovy Commutator G</h2>
            <div style={formulaBlock}>
              <div>G(S) = C(D(E(S)), E(D(S)))</div>
            </div>
            <p style={pBody}>
              Evolve-then-differentiate (<code className="gc-code">D(E(S))</code>), compared against
              differentiate-then-evolve (<code className="gc-code">E(D(S))</code>, defined above): does order agree?
              Same construction as the commutator <code className="gc-code">[A,B] = AB - BA</code> from ordinary
              algebra &mdash; does applying two operations one way give the same result as applying them the other
              way.
            </p>
            <p style={pBody}>
              Think of <code className="gc-code">S</code> as sitting at position 0 and <code className="gc-code">E(S)</code> at
              position 1. <code className="gc-code">D(S)</code> compares those two, so it straddles positions 0 and
              1 &mdash; call it position 0.5. <code className="gc-code">D(E(S))</code> is that same comparison, one
              full step later: it straddles 1 and 2, position 1.5 &mdash; which is exactly why{' '}
              <code className="gc-code">D(E(S))</code> turns out to equal the ordinary{' '}
              <code className="gc-code">D(S)</code> trajectory from a few sections back, read one row later
              (<code className="gc-code">D(E(S<sub>t</sub>)) = D(S<sub>t+1</sub>)</code>, exactly, not
              approximately). <code className="gc-code">E(D(S))</code> reaches for that same nominal position 1.5
              by a completely different, weirder route: it evolves whatever's sitting at 0.5 forward by one step
              &mdash; except position 0.5 was never a real point on the trajectory to begin with, just a mask. Two
              different paths, both aimed at the same target. <code className="gc-code">G(S)</code> is the question
              of whether they actually land there together.
            </p>
            <p style={pBody}>
              <strong>The affine theorem:</strong> G(S) is the same for every possible S, forever, if and only if
              &phi; is GF(2)-affine. Checked live against Rule {rule}'s own lookup table:{' '}
              {isAffine === null ? 'checking…'
                : isAffine ? 'this rule is GF(2)-affine — G is the same constant for every state, every step.'
                : 'this rule is not affine — G is not constant; watch the strip below churn.'}
            </p>
            <p style={pBody}>
              Worth flipping through the quick-pick rules above and watching what happens to the purple panel: rule{' '}
              90 is affine with no bias, so G(S) goes flat black &mdash; confirms the theorem directly, even though
              the teal and amber panels feeding into it are each still churning on their own. Rule 30 (class III)
              makes G(S) churn with no visible structure. Rule 110 or 54 (class IV) is the interesting middle case:
              G(S) is neither constant nor noise, it has visible structure of its own. Rules 4 and 184 (class II)
              tend to settle into something periodic. Same four panels, four qualitatively different stories, just
              by changing the rule number.
            </p>
            <InstrumentViewer
              items={[
                { label: L_E, field: computed && computed.raw, color: ON_COLOR },
                { label: L_DE, field: computed && computed.de, color: ACCENT },
                { label: L_ED, field: computed && computed.ed, color: 'oklch(0.6 0.14 75)' },
                { label: L_G, field: computed && computed.g, color: 'oklch(0.5 0.13 300)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'e', rule, color: EXPLORE_COLORS.teal },
                { id: 3, type: 'transform', dim: '1d', from: 2, op: 'd', rule, color: EXPLORE_COLORS.blue },
                { id: 4, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.amber },
                { id: 5, type: 'transform', dim: '1d', from: 4, op: 'e', rule, color: EXPLORE_COLORS.red },
                { id: 6, type: 'transform', dim: '1d', from: 1, op: 'g', rule, color: EXPLORE_COLORS.purple },
              ])}
            />
          </section>

          <section id="absential" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument &mdash; newer, less validated</div>
            <h2 style={h2Style}>Absential cells</h2>
            <p style={pBody}>
              A cell can be off because it's entirely outside any live cell's influence (<strong>void</strong>)
              &mdash; or off but adjacent to something alive, which philosopher Terrence Deacon calls{' '}
              <strong>absential</strong>: absence that does causal work by virtue of what it's next to.
            </p>
            <p style={pBody}>
              Everything so far has been built from XOR alone &mdash; GF(2) addition. Writing this one down needs two
              more familiar pieces of boolean algebra: <strong>OR</strong> (&or;, true if either input is true) and{' '}
              <strong>NOT</strong> (&not;, flips a bit). A cell's closed neighborhood is on if it or either neighbor
              is on; a cell is absential if its neighborhood is on but it itself isn't:
            </p>
            <div style={formulaBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>N(S) = S &or; left(S) &or; right(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>closed neighborhood</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>A(S) = N(S) &and; &not;S</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>absential field</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>V(S) = &not;N(S) = &not;S &and; &not;A(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>void field</span></div>
            </div>
            <p style={pBody}>
              S, A(S), and V(S) partition every cell into exactly one of three categories &mdash; live, absential, or
              void &mdash; with no overlap and nothing left over.
            </p>
            <InstrumentViewer
              items={[
                { label: L_E, field: computed && computed.raw, color: ON_COLOR },
                { label: L_A, field: computed && computed.absential, color: 'oklch(0.6 0.14 75)' },
                { label: L_V, field: computed && computed.void, color: 'oklch(0.6 0.13 240)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'absential', rule, color: EXPLORE_COLORS.amber },
              ])}
            />
            <p style={{ ...pBody, marginTop: '1.1rem' }}>
              Overlay mode is worth trying here specifically: all three fields are mutually exclusive by
              construction, so a correct overlay should show zero magenta (the 2+ layers highlight) anywhere on the
              grid &mdash; toggle layers off and on to check it. <code className="gc-code">V(S)</code> isn't wired
              into the explorer's transform menu yet, so the link below carries S and A(S) only.
            </p>
            <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '60ch', margin: 0 }}>
              Open question this raises: does this field's own compressibility work as a faster Class-IV detector
              than looking at G(S) or E(S) directly? First test didn't confirm it &mdash; see the{' '}
              <a href="questions.html#absential" style={{ color: 'var(--accent)' }}>questions page</a>.
            </p>
          </section>

          <section id="secondorder" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>Reversible memory (second-order CA)</h2>
            <div style={formulaBlock}>
              S(t+1) = &phi;(S(t)) &oplus; S(t&minus;1)
            </div>
            <p style={pBody}>
              A different shape of the same underlying move as comparison and coupling: compute two things
              separately, then XOR them together. Here the two things are the rule's ordinary output and a
              time-shifted copy of the same layer, one step back &mdash; and because XOR is its own inverse, running
              the recurrence backward exactly recovers every earlier state. That's the standard Margolus&ndash;Fredkin
              trick for giving 1D CA memory and reversibility at once, for <em>any</em> rule, not just famous ones.
            </p>
            <p style={pBody}>
              Worth being precise about what's <em>not</em> happening here: this isn't "log every{' '}
              <code className="gc-code">D(S)</code> as you go, then XOR the log backward." That would work too, but
              only because it stores the entire trajectory in disguise &mdash; one full row of diff bits per step, the
              same amount of information as just keeping every state. The interesting part of second-order memory is
              that it needs <em>none</em> of that history: knowing only the current and previous state (two rows,
              not a growing log) is enough to run forever in either direction, even though most rules{' '}
              <code className="gc-code">&phi;</code> are not themselves invertible &mdash; you generally can't
              recover <code className="gc-code">S(t)</code> from <code className="gc-code">S(t+1)</code> alone. The
              one extra row of memory is what smuggles in the missing information.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
              <div>
                <canvas className="gc-field" ref={secondOrderRef}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '0.4rem', maxWidth: 160 }}>second-order Rule {rule}</div>
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', maxWidth: '42ch', margin: 0 }}>
                Reversibility check, run live in your browser right now: {secondOrderStatus}
              </p>
            </div>
          </section>
        </div>

        {/* COUPLING */}
        <section id="coupling" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Instrument</div>
          <h2 style={h2Style}>Coupling two rules</h2>
          <p style={{ ...pBody, marginBottom: '1rem' }}>
            Everything above acts on one state under one rule. The natural next move: let two <em>different</em>{' '}
            rules act on the same shared starting state, and ask whether the order they're applied in matters. Run
            one shared starting row two ways &mdash; A-then-B, and B-then-A &mdash; and watch the two paths disagree
            over time. The disagreement reliably settles into one of five shapes:
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0 0 1.2rem' }}>
            {PAIR_PRESETS.map((p, idx) => {
              const active = idx === pairIdx;
              return (
                <button key={idx} onClick={() => setPairIdx(idx)} className="gc-mono"
                  style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.45rem 0.7rem', borderRadius: 7, border: '1px solid ' + (active ? ACCENT : '#e4dac8'), background: active ? ACCENT : '#fff', color: active ? '#fff' : INK_SOFT, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {p.a} vs {p.b}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
            <div><canvas className="gc-field" ref={pairRef}></canvas></div>
            <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '42ch', margin: 0 }}>
              <span className="gc-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em', fontWeight: 700, fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: 999, color: '#fff', background: `var(--${selectedPreset.regime})`, textTransform: 'uppercase' }}>{selectedPreset.regime}</span>
              <br /><br />{selectedPreset.a} vs {selectedPreset.b} &mdash; {selectedPreset.note}. Pattern above is
              computed live from one shared random row; regime label is the documented classification for this pair.
            </p>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1.1rem 0 0', maxWidth: '60ch' }}>
            <strong>Structured divergence has no single-rule analog</strong> &mdash; for one rule against itself
            there's nowhere for "persistently related but never identical" to live. It only shows up once two
            distinct rules are in play. Coupling rules at scale &mdash; which regimes are common, what predicts
            them &mdash; is exactly the kind of thing this construction makes askable; see the{' '}
            <a href="questions.html" style={{ color: 'var(--accent)' }}>questions page</a> for what's actually been
            found.
          </p>
        </section>

        {/* THE FOURTH INPUT (pre-hoc composition) */}
        <section id="prehoc" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Instrument &mdash; newer</div>
          <h2 style={h2Style}>The fourth input (pre-hoc composition)</h2>
          <p style={pBody}>
            Every composition above &mdash; D, reversible memory, coupling &mdash; computes two finished fields and
            then XORs or compares them: composition <em>after</em> the rule has run. There's a second, more invasive
            option: give the rule's own lookup table a <strong>fourth input</strong>, alongside left/self/right,
            before &phi; is ever evaluated. One extra binary input doubles the table from 8 entries to 16 &mdash;
            and the doubled table has a tidy reading:
          </p>
          <div style={formulaBlock}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>f(l, c, r, x) = x ? &phi;<sub>1</sub>(l,c,r) : &phi;<sub>0</sub>(l,c,r)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>a 16-entry table IS a rule pair</span></div>
          </div>
          <p style={pBody}>
            Every 4-input rule is exactly an <em>ordered pair of elementary rules</em>, with x choosing per cell,
            per step, which of the two applies. Only 512 of the 65,536 possible tables can be rewritten as
            &ldquo;compute one rule, then XOR x in afterward&rdquo; &mdash; the other 99.2% are genuinely new
            territory, unreachable by post-hoc composition.
          </p>
          <p style={pBody}>
            <strong>But there's a trap, and it's a theorem.</strong> If the fourth input is computed from the{' '}
            <em>same state at the same time</em> &mdash; say x = D(S), or x = the absential field A(S) from a few
            sections up &mdash; the whole thing collapses back into a single ordinary elementary rule. (Two facts
            fall out of proving this: A(S) <em>is</em> elementary rule 50, and D(&middot;,&psi;) <em>is</em>{' '}
            elementary rule &psi;&oplus;204.) The fourth input only escapes the collapse when it comes from another{' '}
            <em>time</em> (that's reversible memory, above) or another <em>trajectory</em> &mdash; a second layer
            with its own dynamics. Two layers, each using the other as its fourth input, live:
          </p>
          <PrehocMiniDemo />
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '60ch', margin: '1.1rem 0 0' }}>
            All four component rules here (77, 55, 44, 23) are frozen or periodic on their own &mdash; the structure
            you're seeing belongs to the coupling, not to any part. What that means at scale is on the{' '}
            <a href="questions.html#extended-neighborhoods" style={{ color: 'var(--accent)' }}>questions page</a>.
          </p>
        </section>

        {/* RULE FIELDS (non-uniform CA) */}
        <section id="rulefield" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Instrument &mdash; newest</div>
          <h2 style={h2Style}>Rule fields (a rule per cell)</h2>
          <p style={pBody}>
            One more wall to knock down. Everything above still assumes one shared global rule &mdash; the rule is
            a fixed number sitting <em>outside</em> the State &rarr; State world everything else lives in.
            Non-uniform CA give every cell its <em>own</em> rule: the rule field is now an array the same shape as
            the state, its 8 bit-planes are literally state-shaped binary fields, and every instrument on this page
            applies to it unchanged. This is the field's founding idea, not an exotic one &mdash; von Neumann's
            self-reproducing automaton stored its construction instructions as patterns in the same substrate they
            acted on.
          </p>
          <p style={pBody}>
            The same trap as the fourth input appears here, one level up: if each cell's rule is <em>re-read from
            the state around it every step</em> (&ldquo;the state writes its own rules&rdquo;), the whole system is
            provably just one uniform CA with a bigger neighborhood. Self-reference at a single time step is always
            just a bigger neighborhood. The rule field becomes a genuine second citizen only when it{' '}
            <em>persists</em> &mdash; when it has memory. The simplest honest version: rules stay put where the
            state is dead, and a live cell copies its left neighbor's rule over its own. The state gates transport
            of rules through the medium the rules themselves animate:
          </p>
          <RuleFieldMiniDemo />
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '60ch', margin: '1.1rem 0 0' }}>
            Watch the right panel: rule territories hold where the state is quiet and get invaded where it's
            active. That asymmetry turns out to be a selection pressure &mdash; see the{' '}
            <a href="questions.html#rule-as-state" style={{ color: 'var(--accent)' }}>questions page</a> for the
            evolution that falls out of it.
          </p>
        </section>

        {/* CLOSING POINTER -- questions (incl. rules birthing rules, and everything still open) live on their own page now */}
        <section style={{ padding: '1.6rem 0 2rem', borderTop: '1px solid var(--rule)' }}>
          <p style={pBody}>
            That's the instrument set built on this calculus so far. What happens when you push them further
            &mdash; a state that generates its own successor rule, what actually predicts the drain regime, whether
            a rule could live in the same shape as the data it acts on &mdash; is exactly what the{' '}
            <a href="questions.html" style={{ color: 'var(--accent)' }}>questions page</a> is for.
          </p>
        </section>

      </main>

      <footer className="gc-footer">
        <div className="gc-footer-inner">
          Source, library code, and full research notes live in the{' '}
          <a href="https://github.com/mbilokonsky/groovy-commutator">GitHub repository</a>.
        </div>
      </footer>
    </>
  );
}
