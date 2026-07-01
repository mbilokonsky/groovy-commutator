import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from './Nav.jsx';
import Watermark from './Watermark.jsx';
import { AmbientCA2D } from './AmbientCA.jsx';
import InstrumentViewer from './InstrumentViewer.jsx';
import { buildSeedUrl } from '../lib/exploreSeed.js';

// Explorer's own dark-theme card palette (not shared with this light-theme
// page) -- used only when building ?seed= links, so cards read correctly
// once they land there.
const EXPLORE_COLORS = { cream: 'oklch(0.94 0.02 90)', teal: 'oklch(0.72 0.1 195)', amber: 'oklch(0.72 0.14 75)', purple: 'oklch(0.7 0.13 300)', red: 'oklch(0.66 0.15 22)' };

function defaultInitState(n) {
  const arr = new Array(n).fill(0);
  arr[Math.floor(n / 2)] = 1;
  return arr;
}

const N_CELLS = 70;
const STEPS = 70;
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
  ['#commutator', 'The Groovy Commutator G'],
  ['#absential', 'Absential cells'],
  ['#secondorder', 'Reversible memory'],
  ['#coupling', 'Coupling rules'],
  ['#metaevo', 'Rules birthing rules'],
  ['#open', 'Open questions'],
];

const OPEN_QUESTIONS = [
  ['What exactly predicts drain?', 'image_ratio correlates but doesn’t fully explain it — the real condition looks more structural than a single score.'],
  ['Does the absential view detect Class IV?', 'First test was inconclusive — open whether a better test (2D, more rules) changes that.'],
  ['Does generator choice change meta-evolution?', 'Early evidence says yes — richer generators search longer — on a small sample.'],
  ['Could "rule" live in the same shape as state?', 'Non-uniform CA — one rule per cell — traces to von Neumann. Not implemented here yet.'],
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

export default function Concepts() {
  const [rule, setRule] = useState(110);
  const [ruleInputText, setRuleInputText] = useState('110');
  const [initState, setInitState] = useState(() => defaultInitState(N_CELLS));
  const [xorA, setXorA] = useState(0);
  const [xorB, setXorB] = useState(1);
  const [pairIdx, setPairIdx] = useState(2);
  const [secondOrderStatus, setSecondOrderStatus] = useState('computing…');
  const [isStuck, setIsStuck] = useState(false);
  const [breakoutLeft, setBreakoutLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [engineReady, setEngineReady] = useState(false);
  const [computed, setComputed] = useState(null);

  const engineRef = useRef(null);
  const sentinelRef = useRef(null);
  const caRef = useRef(null);
  const caRef2 = useRef(null);
  const dRef = useRef(null);
  const secondOrderRef = useRef(null);
  const pairRef = useRef(null);

  const measureBreakout = useCallback(() => {
    if (!sentinelRef.current) return;
    const rect = sentinelRef.current.getBoundingClientRect();
    setBreakoutLeft(rect.left);
    setViewportWidth(window.innerWidth);
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
      const stuck = sentinelRef.current.getBoundingClientRect().top <= 58;
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
    const { evolveTrajectory, dTrajectory, d2Trajectory, gTrajectory, absentialTrajectory,
      runSecondOrder, verifySecondOrderReversible, renderFieldToCanvas } = engineRef.current;
    const s0 = Uint8Array.from(initState);

    const raw = evolveTrajectory(s0, rule, STEPS);
    if (caRef.current) renderFieldToCanvas(caRef.current, raw, ON_COLOR, '#f1ead9');
    if (caRef2.current) renderFieldToCanvas(caRef2.current, raw, ON_COLOR, '#f1ead9');

    const dField = dTrajectory(s0, rule, STEPS);
    if (dRef.current) renderFieldToCanvas(dRef.current, dField, ACCENT, '#f1ead9');

    const d2Field = d2Trajectory(s0, rule, STEPS);
    const gField = gTrajectory(s0, rule, STEPS);
    const absField = absentialTrajectory(s0, rule, STEPS);
    setComputed({ raw, d: dField, d2: d2Field, g: gField, absential: absField });

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
    if (!isNaN(n) && n >= 0 && n <= 255) setRule(n);
  }
  function handleRuleInputBlur() { setRuleInputText(String(rule)); }
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

  const stickyPanelStyle = {
    position: 'sticky', top: 58, zIndex: 5,
    borderTop: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)', background: '#fff',
    ...(isStuck
      ? { width: viewportWidth, marginLeft: -breakoutLeft, boxShadow: '0 6px 16px rgba(42,36,32,0.16)' }
      : { width: '100%', marginLeft: 0, boxShadow: 'none' }),
  };

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
            top (the neighborhood, fixed) and one cell below (the output, click to flip it and build your own rule
            live).
          </p>

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

        {/* STICKY RULE + STARTING-ROW PANEL, shared by everything below through Instruments */}
        <div style={{ position: 'relative' }}>
          <div ref={sentinelRef} style={{ height: 1 }}></div>
          <div style={stickyPanelStyle}>
            <div style={{ maxWidth: 880, margin: '0 auto', padding: '0.8rem 1.25rem 0.9rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span className="gc-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ink-soft)' }}>Rule</span>
              <input type="number" min="0" max="255" value={ruleInputText} onChange={handleRuleInputChange} onBlur={handleRuleInputBlur}
                className="gc-mono" style={{ width: '4.2rem', fontSize: '1rem', fontWeight: 700, textAlign: 'center', padding: '0.35rem 0.3rem', borderRadius: 6, border: '1px solid var(--accent)', background: '#fff', color: 'var(--ink)' }} />
              <span className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>(0&ndash;255)</span>
            </div>
            <p className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 0.7rem' }}>
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
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {selectedGlyphs.map((nb) => (
                <div key={nb.idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, border: '1px solid var(--ink-soft)', borderRadius: 4, padding: 3 }}>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[nb.l, nb.c, nb.r].map((bit, i) => (
                      <div key={i} className="gc-mono" style={{ width: 13, height: 13, border: '1px solid var(--ink)', background: bit ? ON_COLOR : OFF_COLOR, color: bit ? OFF_COLOR : ON_COLOR, fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{bit}</div>
                    ))}
                  </div>
                  <button onClick={() => toggleOutputBit(nb.idx)} className="gc-mono" style={{ width: 13, height: 13, padding: 0, border: '1.5px solid var(--accent)', background: nb.out ? ON_COLOR : OFF_COLOR, color: nb.out ? OFF_COLOR : ON_COLOR, fontSize: 8, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{nb.out}</button>
                </div>
              ))}
            </div>
            <p className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', margin: '0 0 0.7rem', textAlign: 'center' }}>{`Rule ${rule} is ${activeRule && activeRule.cls ? `informally Class ${activeRule.cls}` : 'not in the informal class set'} — 3 cells in (top, fixed) → 1 output (bottom, click to flip — builds your own rule live).`}</p>

            <div style={{ borderTop: '1px dashed var(--rule)', margin: '0 0 0.7rem' }}></div>

            <p className="gc-mono" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 0.4rem' }}>Starting row &mdash; click a cell to toggle it, or{' '}
              <button onClick={rerollInit} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit', padding: 0 }}>randomize</button>
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 1, overflowX: 'auto' }}>
              {initState.map((bit, i) => (
                <button key={i} onClick={() => toggleCell(i)} style={{ width: 9, height: 9, padding: 0, border: '1px solid var(--ink)', background: bit ? ON_COLOR : OFF_COLOR, cursor: 'pointer', flex: 'none' }}></button>
              ))}
            </div>
            </div>
          </div>

          <section style={{ padding: '1.6rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
              <div>
                <canvas className="gc-field" ref={caRef}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '0.4rem', maxWidth: 160 }}>raw evolution, Rule {rule}</div>
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '42ch', margin: 0 }}>
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

            <h3 style={h3Style}>Comparison and differentiation</h3>
            <div style={formulaBlock}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>C(a, b) = a &oplus; b</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>comparison</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>D(S) = C(S, &phi;(S)) = S &oplus; &phi;(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>what changed</span></div>
            </div>
            <p style={pBody}>
              <code className="gc-code">C</code> is just XOR again, named for the role it plays: comparing two
              states bit by bit. <code className="gc-code">D</code> uses it to ask the smallest possible question
              about a rule &mdash; compare the state to what the rule turns it into, one step later. Raw state and
              D(S), for Rule {rule}:
            </p>
            <div className="gc-lens-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1rem', maxWidth: 420 }}>
              <div>
                <canvas className="gc-field" ref={caRef2} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>raw state</div>
              </div>
              <div>
                <canvas className="gc-field" ref={dRef} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>D(S)</div>
              </div>
            </div>

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
              under the same rule. Raw state, D(S), and D&sup2;(S), for Rule {rule}:
            </p>
            <InstrumentViewer
              items={[
                { label: 'raw state', field: computed && computed.raw, color: ON_COLOR },
                { label: 'D(S)', field: computed && computed.d, color: ACCENT },
                { label: 'D²(S)', field: computed && computed.d2, color: 'oklch(0.55 0.14 30)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.teal },
                { id: 3, type: 'transform', dim: '1d', from: 2, op: 'd', rule, color: EXPLORE_COLORS.red },
              ])}
            />
            <p style={{ ...pBody, marginTop: '1.1rem' }}>
              Read the teal panel as "which cells are about to change" &mdash; it's <code className="gc-code">D(S)</code>,
              the difference between the raw state and what the rule turns it into next. The red panel is the same
              question asked one level up: treat <em>that</em> difference field as a state in its own right, and ask
              which of <em>its</em> cells are about to change under the same rule. Not a property of the original
              state directly &mdash; a property of how the state is changing.
            </p>
          </section>

          <section id="commutator" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)', background: 'var(--bg)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>The Groovy Commutator G</h2>
            <div style={formulaBlock}>
              <div>G(S) = C(D(E(S)), E(D(S)))</div>
            </div>
            <p style={pBody}>
              Differentiate-then-evolve, compared against evolve-then-differentiate: does order agree? Same
              construction as the commutator <code className="gc-code">[A,B] = AB - BA</code> from ordinary
              algebra &mdash; does applying two operations one way give the same result as applying them the other
              way.
            </p>
            <p style={pBody}>
              <strong>The affine theorem:</strong> G(S) is the same for every possible S, forever, if and only if
              &phi; is GF(2)-affine. Checked live against Rule {rule}'s own lookup table:{' '}
              {isAffine === null ? 'checking…'
                : isAffine ? 'this rule is GF(2)-affine — G is the same constant for every state, every step.'
                : 'this rule is not affine — G is not constant; watch the strip below churn.'}
            </p>
            <InstrumentViewer
              items={[
                { label: 'raw state', field: computed && computed.raw, color: ON_COLOR },
                { label: 'D(S)', field: computed && computed.d, color: ACCENT },
                { label: 'G(S)', field: computed && computed.g, color: 'oklch(0.5 0.13 300)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'd', rule, color: EXPLORE_COLORS.teal },
                { id: 3, type: 'transform', dim: '1d', from: 1, op: 'g', rule, color: EXPLORE_COLORS.purple },
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
            </div>
            <InstrumentViewer
              items={[
                { label: 'raw state, S', field: computed && computed.raw, color: ON_COLOR },
                { label: 'A(S)', field: computed && computed.absential, color: 'oklch(0.6 0.14 75)' },
              ]}
              exploreHref={buildSeedUrl([
                { id: 1, type: 'source', dim: '1d', rule, ic: initState, steps: STEPS, color: EXPLORE_COLORS.cream },
                { id: 2, type: 'transform', dim: '1d', from: 1, op: 'absential', rule, color: EXPLORE_COLORS.amber },
              ])}
            />
            <p style={{ ...pBody, marginTop: '1.1rem' }}>
              Overlay mode is worth trying here specifically: S and A(S) are never on at the same cell by
              construction, so the overlay shows them filling in the space around each other, never colliding.
            </p>
            <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '60ch', margin: 0 }}>
              Open question this raises: does this field's own compressibility work as a faster Class-IV detector
              than looking at G or the raw state? First test didn't confirm it &mdash; see the{' '}
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
              Because XOR is its own inverse, this recurrence run backward exactly recovers every earlier state
              &mdash; the standard Margolus&ndash;Fredkin trick for giving 1D CA memory and reversibility at once,
              for <em>any</em> rule &mdash; not just famous ones.
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

        {/* META EVOLUTION */}
        <section id="metaevo" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Instrument &mdash; newest, most speculative</div>
          <h2 style={h2Style}>Rules birthing rules</h2>
          <p style={{ fontSize: '0.98rem', color: 'var(--ink-soft)', margin: 0, maxWidth: '60ch' }}>
            Instead of fixing one rule and watching a state evolve, let the state <em>generate its own successor
            rule</em> each generation, classify the parent&rarr;child handoff with the same five-regime diagnostic
            above, then hand control to the child. Lineages reliably wander for a few generations, then lock into a
            small repeating cycle in rule space itself &mdash; see the{' '}
            <a href="questions.html#meta-evolution" style={{ color: 'var(--accent)' }}>questions page</a> for a live
            version of this you can re-run yourself.
          </p>
        </section>

        {/* OPEN QUESTIONS */}
        <section id="open" style={{ padding: '1.6rem 0 2rem', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Where the curiosity is pointed right now</div>
          <h2 style={{ ...h2Style, margin: '0.3em 0 0.9em' }}>Open questions</h2>
          <p style={pBody}>
            A quick preview &mdash; the <a href="questions.html" style={{ color: 'var(--accent)' }}>questions page</a>{' '}
            covers these (and the ones we do have data for) properly.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '0.8rem' }}>
            {OPEN_QUESTIONS.map(([title, body]) => (
              <div key={title} style={{ background: '#fff', border: '1px solid var(--rule)', borderRadius: 8, padding: '0.9rem 1rem' }}>
                <p style={{ fontSize: '0.88rem', margin: 0, color: 'var(--ink-soft)' }}><strong style={{ color: 'var(--ink)' }}>{title}</strong> {body}</p>
              </div>
            ))}
          </div>
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
