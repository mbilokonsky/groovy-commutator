import { useCallback, useEffect, useRef, useState } from 'react';
import Nav from './Nav.jsx';
import Watermark from './Watermark.jsx';

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
  ['#xor', 'XOR'],
  ['#state', 'State → State'],
  ['#ca', 'Elementary CA'],
  ['#deg', 'D, E, G'],
  ['#absential', 'Absential cells'],
  ['#secondorder', 'Reversible memory'],
  ['#crossrule', 'Cross-rule pairs'],
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
const pBody = { fontSize: '0.98rem', color: 'var(--ink-soft)', margin: '0 0 1.1rem', maxWidth: '60ch' };

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

  const engineRef = useRef(null);
  const sentinelRef = useRef(null);
  const caRef = useRef(null);
  const caRef2 = useRef(null);
  const dRef = useRef(null);
  const gRef = useRef(null);
  const absentialRef = useRef(null);
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
    const { evolveTrajectory, dTrajectory, gTrajectory, absentialTrajectory,
      runSecondOrder, verifySecondOrderReversible, renderFieldToCanvas } = engineRef.current;
    const s0 = Uint8Array.from(initState);

    const raw = evolveTrajectory(s0, rule, STEPS);
    if (caRef.current) renderFieldToCanvas(caRef.current, raw, ON_COLOR, '#f1ead9');
    if (caRef2.current) renderFieldToCanvas(caRef2.current, raw, ON_COLOR, '#f1ead9');

    const dField = dTrajectory(s0, rule, STEPS);
    if (dRef.current) renderFieldToCanvas(dRef.current, dField, ACCENT, '#f1ead9');

    const gField = gTrajectory(s0, rule, STEPS);
    if (gRef.current) renderFieldToCanvas(gRef.current, gField, 'oklch(0.5 0.13 300)', '#f1ead9');

    const absField = absentialTrajectory(s0, rule, STEPS);
    if (absentialRef.current) renderFieldToCanvas(absentialRef.current, absField, 'oklch(0.6 0.14 75)', '#f1ead9');

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
          Everything on this site is built from a handful of small pieces. None of them are individually
          complicated &mdash; play with each one before moving to the next.
        </p>

        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '0 0 2rem' }}>
          {TOC.map(([href, label]) => <a key={href} href={href} style={pill}>{label}</a>)}
        </nav>

        {/* XOR */}
        <section id="xor" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Foundation</div>
          <h2 style={h2Style}>XOR is the only operation you need</h2>
          <p style={pBody}>
            Every state in this project is a row of bits. The one operation almost everything is built from is{' '}
            <strong>XOR</strong> (&oplus;) &mdash; it's 1 exactly where two bits disagree. Click the two bits below:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <button onClick={() => setXorA(xorA ? 0 : 1)} className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', background: xorA ? ON_COLOR : OFF_COLOR, cursor: 'pointer' }}></button>
            <span className="gc-mono" style={{ fontSize: '1.1rem', color: 'var(--ink-soft)' }}>&oplus;</span>
            <button onClick={() => setXorB(xorB ? 0 : 1)} className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', background: xorB ? ON_COLOR : OFF_COLOR, cursor: 'pointer' }}></button>
            <span className="gc-mono" style={{ fontSize: '1.1rem', color: 'var(--ink-soft)' }}>=</span>
            <div className="gc-mono" style={{ fontWeight: 800, fontSize: '1.3rem', width: 54, height: 54, borderRadius: 8, border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: xorResult ? ON_COLOR : OFF_COLOR, color: xorResult ? '#faf7f0' : '#2a2420' }}>{xorResult}</div>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--ink-soft)', margin: '0.9rem 0 0' }}>GF(2) just means "the two-element field" &mdash; arithmetic where 1 + 1 = 0. That's XOR.</p>
        </section>

        {/* STATE -> STATE */}
        <section id="state" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Foundation</div>
          <h2 style={h2Style}>Everything is State &rarr; State</h2>
          <p style={pBody}>
            Every instrument below &mdash; the derivative, the commutator, the absential mask, a reversible memory
            step &mdash; takes a row of <code className="gc-code">n</code> bits in and returns <em>another row of n
            bits</em> out. Nothing compresses, expands, or reinterprets the state &mdash; which is what makes every
            instrument stackable, comparable, and renderable the same way.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
            <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--rule)', borderRadius: 7, background: '#fff' }}>State (n bits)</div>
            <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>&rarr;</span>
            <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--accent)', borderRadius: 7, background: 'var(--accent-soft)', color: 'var(--accent-dark)' }}>instrument</div>
            <span style={{ color: 'var(--accent)', fontSize: '1.1rem' }}>&rarr;</span>
            <div className="gc-mono" style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.6rem 0.9rem', border: '1px solid var(--rule)', borderRadius: 7, background: '#fff' }}>State (n bits)</div>
          </div>
        </section>

        {/* STICKY PANEL + CA / DEG / ABSENTIAL / SECONDORDER */}
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
                      <div style={{ width: 9, height: 9, border: '1px solid var(--ink)', background: nb.l ? ON_COLOR : OFF_COLOR }}></div>
                      <div style={{ width: 9, height: 9, border: '1px solid var(--ink)', background: nb.c ? ON_COLOR : OFF_COLOR }}></div>
                      <div style={{ width: 9, height: 9, border: '1px solid var(--ink)', background: nb.r ? ON_COLOR : OFF_COLOR }}></div>
                    </div>
                    <button onClick={() => toggleOutputBit(nb.idx)} style={{ width: 9, height: 9, padding: 0, border: '1.5px solid var(--accent)', background: nb.out ? ON_COLOR : OFF_COLOR, cursor: 'pointer' }}></button>
                  </div>
                ))}
              </div>
              <p className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', margin: '0 0 0.7rem', textAlign: 'center' }}>
                Rule {rule} is {activeRule && activeRule.cls ? `informally Class ${activeRule.cls}` : 'not in the informal class set'} &mdash; 3 cells in (top, fixed) &rarr; 1 output (bottom, click to flip &mdash; builds your own rule live).
              </p>

              <div style={{ borderTop: '1px dashed var(--rule)', margin: '0 0 0.7rem' }}></div>

              <p className="gc-mono" style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', textAlign: 'center', margin: '0 0 0.4rem' }}>
                Starting row &mdash; click a cell to toggle it, or{' '}
                <button onClick={rerollInit} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', font: 'inherit', padding: 0 }}>randomize</button>
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 1, overflowX: 'auto' }}>
                {initState.map((bit, i) => (
                  <button key={i} onClick={() => toggleCell(i)} style={{ width: 9, height: 9, padding: 0, border: '1px solid var(--ink)', background: bit ? ON_COLOR : OFF_COLOR, cursor: 'pointer', flex: 'none' }}></button>
                ))}
              </div>
            </div>
          </div>

          <section id="ca" style={{ padding: '1.6rem 0' }}>
            <div style={sectionKicker}>Substrate</div>
            <h2 style={h2Style}>Elementary cellular automata</h2>
            <p style={pBody}>
              A row of cells on a circular lattice. Each tick, every cell looks at itself and its two neighbors (8
              possible 3-cell patterns) and outputs 0 or 1. That 8-entry lookup table, read as a number, is the{' '}
              <strong>rule number</strong>.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
              <div>
                <canvas className="gc-field" ref={caRef}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '0.4rem', maxWidth: 160 }}>raw evolution, Rule {rule}</div>
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '42ch', margin: 0 }}>
                The textbook Wolfram class labels above are informal, not rigorous &mdash; see{' '}
                <code className="gc-code">classify.py</code>. Edit the starting row above (or randomize it) and
                watch every view on this page update from it.
              </p>
            </div>
          </section>

          <section id="deg" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)', background: 'var(--bg)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>D, E, and the single-rule commutator G</h2>
            <div className="gc-mono" style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', padding: '0.9rem 1.1rem', borderRadius: 8, fontSize: '0.86rem', margin: '0 0 1.1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>D(S) = S &oplus; &phi;(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>what changed</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>E(S) = &phi;(S)</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>one step</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '0.15em 0' }}><span>G(S) = C(D(E(S)), E(D(S)))</span><span style={{ color: 'var(--ink-soft)', fontSize: '0.7rem' }}>order agree?</span></div>
            </div>
            <p style={pBody}>
              <strong>The affine theorem:</strong> G(S) is the same for every possible S, forever, if and only if
              &phi; is GF(2)-affine. Checked live against Rule {rule}'s own lookup table:{' '}
              {isAffine === null ? 'checking…'
                : isAffine ? 'this rule is GF(2)-affine — G is the same constant for every state, every step.'
                : 'this rule is not affine — G is not constant; watch the third strip churn.'}
            </p>
            <div className="gc-lens-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem' }}>
              <div>
                <canvas className="gc-field" ref={caRef2} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>raw state</div>
              </div>
              <div>
                <canvas className="gc-field" ref={dRef} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>D(S)</div>
              </div>
              <div>
                <canvas className="gc-field" ref={gRef} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>G(S)</div>
              </div>
            </div>
          </section>

          <section id="absential" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument &mdash; newer, less validated</div>
            <h2 style={h2Style}>Absential cells</h2>
            <p style={pBody}>
              A cell can be off because it's entirely outside any live cell's influence (<strong>void</strong>)
              &mdash; or off but adjacent to something alive, which philosopher Terrence Deacon calls{' '}
              <strong>absential</strong>: absence that does causal work by virtue of what it's next to.
            </p>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.4rem', flexWrap: 'wrap' }}>
              <div>
                <canvas className="gc-field" ref={absentialRef}></canvas>
                <div className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '0.4rem', maxWidth: 160 }}>absential field, Rule {rule}</div>
              </div>
              <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', maxWidth: '42ch', margin: 0 }}>
                Open question this raises: does this field's own compressibility work as a faster Class-IV detector
                than looking at G or the raw state? First test didn't confirm it &mdash; see the{' '}
                <a href="findings.html#absential" style={{ color: 'var(--accent)' }}>findings page</a>.
              </p>
            </div>
          </section>

          <section id="secondorder" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
            <div style={sectionKicker}>Instrument</div>
            <h2 style={h2Style}>Reversible memory (second-order CA)</h2>
            <div className="gc-mono" style={{ background: 'var(--bg-alt)', border: '1px solid var(--rule)', padding: '0.7rem 1rem', borderRadius: 8, fontSize: '0.86rem', margin: '0 0 1rem' }}>
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

        {/* CROSS RULE PAIRS */}
        <section id="crossrule" style={{ padding: '1.6rem 0', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Instrument</div>
          <h2 style={h2Style}>Cross-rule pairs and the five regimes</h2>
          <p style={{ ...pBody, marginBottom: '1rem' }}>
            Instead of asking whether a rule commutes with itself, ask whether two <em>different</em> rules commute.
            Run one shared starting row two ways &mdash; A-then-B, and B-then-A &mdash; and watch the two paths
            disagree over time. The disagreement reliably settles into one of five shapes:
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
            distinct rules are in play, and the full sweep (findings page) found it's actually the <em>most
            common</em> outcome.
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
            <a href="findings.html#meta-evolution" style={{ color: 'var(--accent)' }}>findings page</a> for a live
            version of this you can re-run yourself.
          </p>
        </section>

        {/* OPEN QUESTIONS */}
        <section id="open" style={{ padding: '1.6rem 0 2rem', borderTop: '1px solid var(--rule)' }}>
          <div style={sectionKicker}>Where the curiosity is pointed right now</div>
          <h2 style={{ ...h2Style, margin: '0.3em 0 0.9em' }}>Open questions</h2>
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
