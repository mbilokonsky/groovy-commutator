import { Fragment, useEffect, useRef, useState } from 'react';
import Nav from './Nav.jsx';
import Watermark from './Watermark.jsx';

const REGIME_COUNTS = [
  { key: 'structured', count: 14751 },
  { key: 'crystalline', count: 7302 },
  { key: 'noisy', count: 5414 },
  { key: 'drain', count: 4009 },
  { key: 'commute', count: 1164 },
];
const TOTAL_PAIRS = 32640;

// Exhaustive image_ratio (n=14) for all 256 elementary rules -- see
// results/image_ratios.csv / scripts/precompute_image_ratios.py.
const IMAGE_RATIOS = [6.103515625e-05,0.0513916015625,0.01287841796875,0.16033935546875,0.05145263671875,0.15875244140625,0.184326171875,0.38092041015625,0.01287841796875,0.17230224609375,0.05133056640625,0.16033935546875,0.05145263671875,0.2027587890625,0.30950927734375,1.0,0.01287841796875,0.16033935546875,0.1346435546875,0.16033935546875,0.184326171875,0.38092041015625,0.50689697265625,0.201904296875,0.05133056640625,0.45001220703125,0.42987060546875,0.3094482421875,0.30950927734375,0.3095703125,0.95037841796875,0.38092041015625,0.05145263671875,0.2027587890625,0.05145263671875,0.38092041015625,0.13470458984375,0.47991943359375,0.3094482421875,0.3094482421875,0.184326171875,0.4437255859375,0.30950927734375,0.3095703125,0.3094482421875,0.9921875,0.0513916015625,0.16033935546875,0.05145263671875,0.38092041015625,0.30950927734375,1.0,0.3094482421875,0.3094482421875,0.38079833984375,0.16033935546875,0.30950927734375,0.4539794921875,0.380859375,0.38092041015625,0.5,0.45001220703125,0.47222900390625,0.16033935546875,0.01287841796875,0.17230224609375,0.05133056640625,0.45001220703125,0.05145263671875,0.2027587890625,0.30950927734375,0.3095703125,0.1346435546875,0.42620849609375,0.42987060546875,0.9921875,0.30950927734375,0.201904296875,0.380859375,0.2027587890625,0.05133056640625,0.16033935546875,0.42987060546875,0.3094482421875,0.30950927734375,1.0,0.95037841796875,0.38092041015625,0.42987060546875,0.9921875,0.25,0.47991943359375,0.380859375,0.2027587890625,0.39971923828125,0.15875244140625,0.184326171875,0.4437255859375,0.30950927734375,0.4539794921875,0.3094482421875,0.9921875,0.5,0.45001220703125,0.50689697265625,1.0,0.95037841796875,0.4437255859375,0.38079833984375,0.42620849609375,0.47222900390625,0.17230224609375,0.30950927734375,0.3095703125,0.380859375,0.38092041015625,0.0513916015625,0.16033935546875,0.47222900390625,0.16033935546875,0.95037841796875,0.4437255859375,0.39971923828125,0.2027587890625,0.47222900390625,0.17230224609375,0.13470458984375,0.0513916015625,0.0513916015625,0.13470458984375,0.17230224609375,0.47222900390625,0.2027587890625,0.39971923828125,0.4437255859375,0.95037841796875,0.16033935546875,0.47222900390625,0.16033935546875,0.0513916015625,0.38092041015625,0.380859375,0.3095703125,0.30950927734375,0.17230224609375,0.47222900390625,0.42620849609375,0.38079833984375,0.4437255859375,0.95037841796875,1.0,0.50689697265625,0.45001220703125,0.5,0.9921875,0.3094482421875,0.4539794921875,0.30950927734375,0.4437255859375,0.184326171875,0.15875244140625,0.39971923828125,0.2027587890625,0.380859375,0.47991943359375,0.25,0.9921875,0.42987060546875,0.38092041015625,0.95037841796875,1.0,0.30950927734375,0.3094482421875,0.42987060546875,0.16033935546875,0.05133056640625,0.2027587890625,0.380859375,0.201904296875,0.30950927734375,0.9921875,0.42987060546875,0.42620849609375,0.1346435546875,0.3095703125,0.30950927734375,0.2027587890625,0.05145263671875,0.45001220703125,0.05133056640625,0.17230224609375,0.01287841796875,0.16033935546875,0.47222900390625,0.45001220703125,0.5,0.38092041015625,0.380859375,0.4539794921875,0.30950927734375,0.16033935546875,0.38079833984375,0.3094482421875,0.3094482421875,1.0,0.30950927734375,0.38092041015625,0.05145263671875,0.16033935546875,0.0513916015625,0.9921875,0.3094482421875,0.3095703125,0.30950927734375,0.4437255859375,0.184326171875,0.3094482421875,0.3094482421875,0.47991943359375,0.1346435546875,0.38092041015625,0.05145263671875,0.2027587890625,0.05145263671875,0.38092041015625,0.95037841796875,0.3095703125,0.30950927734375,0.3094482421875,0.42987060546875,0.45001220703125,0.05133056640625,0.201904296875,0.50689697265625,0.38092041015625,0.184326171875,0.16033935546875,0.1346435546875,0.16033935546875,0.01287841796875,1.0,0.30950927734375,0.2027587890625,0.05145263671875,0.16033935546875,0.05133056640625,0.17230224609375,0.01287841796875,0.38092041015625,0.184326171875,0.15875244140625,0.05145263671875,0.16033935546875,0.01287841796875,0.0513916015625,6.103515625e-05];

const GENERATOR_DATA = [
  { key: 'population_count', label: 'population count', vals: [8,9,15,7,7,12,9,6] },
  { key: 'absential_count', label: 'absential count', vals: [3,6,5,9,6,7,2,5] },
  { key: 'g90_popcount', label: 'G(·,90) control', vals: [2,2,2,2,2,2,2,2] },
  { key: 'g30_popcount', label: 'G(·,30)', vals: [3,5,7,7,7,12,4,2] },
  { key: 'd90_sample', label: 'D(state,90) sample', vals: [3,4,8,5,6,39,11,9] },
];

const ABSENTIAL_PUBLISHED = [
  { rule: 0, cls: 'I', pubRaw: '0.020', pubAbs: '0.020' },
  { rule: 4, cls: 'II', pubRaw: '0.055', pubAbs: '0.056' },
  { rule: 30, cls: 'III', pubRaw: '1.005', pubAbs: '0.905' },
  { rule: 110, cls: 'IV', pubRaw: '0.920', pubAbs: '0.828' },
];

function Badge({ level, children }) {
  return <span className={'gc-badge ' + level}>{children}</span>;
}

function QuestionCard({ id, q, status, statusLabel, children }) {
  return (
    <section id={id} className="gc-finding">
      <div className="gc-finding-head">
        <h3>{q}</h3>
        <Badge level={status}>{statusLabel}</Badge>
      </div>
      {children}
    </section>
  );
}

function RegimeBarChart() {
  const maxCount = Math.max(...REGIME_COUNTS.map((r) => r.count));
  const chartLeft = 110, chartWidth = 280, rowH = 32, rowGap = 8;
  return (
    <svg viewBox="0 0 520 200" style={{ width: '100%', height: 'auto', maxWidth: 480, display: 'block' }}>
      {REGIME_COUNTS.map((r, i) => {
        const w = (r.count / maxCount) * chartWidth;
        const y = i * (rowH + rowGap);
        const pct = ((r.count / TOTAL_PAIRS) * 100).toFixed(1);
        const labelY = y + (rowH - 8) / 2 + 4;
        return (
          <g key={r.key}>
            <rect x={chartLeft} y={y} width={w} height={rowH - 8} fill={`var(--${r.key})`} rx="3" />
            <text x="0" y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="12" fill="#6b6055">{r.key}</text>
            <text x={chartLeft + w + 10} y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="700" fill="#2a2420">
              {r.count.toLocaleString()} ({pct}%)
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ImageRatioHistogram() {
  const bins = new Array(10).fill(0);
  for (const v of IMAGE_RATIOS) {
    let idx = Math.floor(v * 10);
    if (idx > 9) idx = 9;
    if (idx < 0) idx = 0;
    bins[idx]++;
  }
  const maxBin = Math.max(...bins);
  const binW = 520 / 10;
  return (
    <>
      <svg viewBox="0 0 520 160" style={{ width: '100%', height: 'auto', maxWidth: 480, display: 'block', marginBottom: '1rem' }}>
        {bins.map((count, i) => {
          const h = (count / maxBin) * 120;
          return <rect key={i} x={i * binW + 2} y={140 - h} width={binW - 4} height={h} fill="var(--accent)" />;
        })}
        <line x1="0" y1="140" x2="520" y2="140" stroke="#e4dac8" />
      </svg>
      <p className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', margin: '-0.6rem 0 1rem' }}>
        image_ratio, 0 &rarr; 1, binned across all 256 rules
      </p>
    </>
  );
}

function GeneratorBarChart() {
  const genMeans = GENERATOR_DATA.map((g) => ({ label: g.label, mean: g.vals.reduce((a, b) => a + b, 0) / g.vals.length }));
  const maxMean = Math.max(...genMeans.map((g) => g.mean));
  const chartLeft = 150, chartWidth = 290, rowH = 36, rowGap = 8;
  return (
    <svg viewBox="0 0 520 220" style={{ width: '100%', height: 'auto', maxWidth: 480, display: 'block' }}>
      {genMeans.map((g, i) => {
        const w = (g.mean / maxMean) * chartWidth;
        const y = i * (rowH + rowGap);
        const labelY = y + (rowH - 10) / 2 + 4;
        return (
          <g key={g.label}>
            <rect x={chartLeft} y={y} width={w} height={rowH - 10} fill="var(--accent)" rx="3" />
            <text x="0" y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#6b6055">{g.label}</text>
            <text x={chartLeft + w + 10} y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="700" fill="#2a2420">
              {g.mean.toFixed(1)} gens
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineageChart({ history }) {
  const REGIME_VAR = { commute: 'var(--commute)', crystalline: 'var(--crystalline)', noisy: 'var(--noisy)', structured: 'var(--structured)', drain: 'var(--drain)' };
  if (!history) return <svg viewBox="0 0 520 200" style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block', background: 'var(--bg-alt)', borderRadius: 8 }} />;
  const padL = 30, padR = 10, padT = 10, padB = 10;
  const w = 520 - padL - padR, h = 200 - padT - padB;
  const n = history.length;
  const points = history.map((e, i) => ({
    x: padL + (n <= 1 ? 0 : (i / (n - 1)) * w),
    y: padT + h - (e.rule / 255) * h,
    color: REGIME_VAR[e.regime] || '#6b6055',
  }));
  return (
    <svg viewBox="0 0 520 200" style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block', background: 'var(--bg-alt)', borderRadius: 8 }}>
      {points.slice(1).map((p, i) => (
        <line key={i} x1={points[i].x} y1={points[i].y} x2={p.x} y2={p.y} stroke="#d8c6a0" strokeWidth="1" />
      ))}
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4" fill={p.color} />)}
    </svg>
  );
}

export default function Questions() {
  const engineRef = useRef(null);
  const [absentialLive, setAbsentialLive] = useState(null);
  const [lineageHistory, setLineageHistory] = useState(null);
  const [lineageRunning, setLineageRunning] = useState(false);
  const [lineageSeed, setLineageSeed] = useState(1);
  const [lineageStatus, setLineageStatus] = useState('Press the button to run a lineage live.');

  useEffect(() => {
    import('../lib/groovy-engine.js').then(async (engine) => {
      engineRef.current = engine;
      const { randomState, evolveTrajectory, absentialTrajectory, compressibility } = engine;
      const n = 100, steps = 100;
      const live = {};
      for (const r of ABSENTIAL_PUBLISHED) {
        const s0 = randomState(n, 3);
        const raw = evolveTrajectory(s0, r.rule, steps);
        const abs = absentialTrajectory(s0, r.rule, steps);
        const rawC = await compressibility(raw);
        const absC = await compressibility(abs);
        live[r.rule] = { liveRaw: rawC.toFixed(3), liveAbs: absC.toFixed(3) };
      }
      setAbsentialLive(live);
    });
  }, []);

  async function runLineage() {
    const engine = engineRef.current;
    if (!engine || lineageRunning) return;
    setLineageRunning(true);
    setLineageStatus('Running live… (40-generation budget, rule 90 start)');
    const { randomState, lineage } = engine;
    const s0 = randomState(100, lineageSeed);
    const history = await lineage(s0, 90, undefined, 40, 100, 6);
    const last = history[history.length - 1];
    setLineageHistory(history);
    setLineageRunning(false);
    setLineageSeed((s) => s + 1);
    setLineageStatus(
      last.cyclePeriod
        ? `Locked into a repeating cycle (period ${last.cyclePeriod}) after ${history.length} generations.`
        : `Ran the full ${history.length}-generation budget without locking in.`
    );
  }

  return (
    <>
      <Nav active="questions" />
      <Watermark title="AI-written prose, mostly-live charts">
        {' '}The writing on this page was generated by an LLM. Most charts below are computed live in your browser
        from data checked into <code className="gc-code">results/</code>; two (marked) are kept as the original
        static figures because the full underlying table isn't small enough to ship. Check the{' '}
        <a href="https://github.com/mbilokonsky/groovy-commutator">source</a> if it matters to you.
      </Watermark>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <div className="gc-mono" style={{ textTransform: 'uppercase', letterSpacing: '.09em', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5em' }}>questions</div>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(1.8rem,5vw,2.4rem)', lineHeight: 1.25, margin: '0 0 0.4em', fontWeight: 600 }}>
          What we've asked, and what we've found so far
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-soft)', margin: '0 0 2rem', maxWidth: '62ch' }}>
          The boolean calculus and its instruments (see <a href="concepts.html" style={{ color: 'var(--accent)' }}>Concepts</a>)
          make certain questions askable that weren't before. Each one below is named first, then answered with
          whatever we've actually got &mdash; confidence-labeled, including the ones that came back negative, and
          including the ones still genuinely open.
        </p>

        <QuestionCard
          id="regime-counts"
          q="When two elementary CA rules run against each other, what actually happens?"
          status="established" statusLabel="Established"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Across all 256 rules &mdash; all 32,640 unordered pairs, 5 seeds each &mdash; the disagreement between two
            rules settles into one of five regimes (see Concepts for what each one means):
          </p>
          <RegimeBarChart />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> structured divergence &mdash; the regime
            with no single-rule analog &mdash; was expected to be a narrow sliver between agreement and noise. At
            full scale it's the <strong>largest single regime</strong>, covering nearly half of all pairs. Two
            arbitrary rules are more likely than not to settle into a persistent, legible, non-identical relationship
            rather than either merging or dissolving into static.
          </p>
        </QuestionCard>

        <QuestionCard
          id="image-ratio"
          q="Does a rule's own “lossiness” predict how it behaves when paired with another rule?"
          status="established" statusLabel="Established (negative)"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 0.9rem' }}>
            The working hypothesis: a rule that destroys a lot of state-space information on its own
            (<code className="gc-code">image_ratio</code>, rich in Garden-of-Eden configurations) should be more
            likely to <strong>drain</strong> &mdash; collapse into a shared trivial attractor &mdash; when paired
            with anything. Live histogram of image_ratio across all 256 rules:
          </p>
          <ImageRatioHistogram />
          <figure style={{ margin: '0 0 0.6rem' }}>
            <img
              src="assets/img/regime_image_ratio_boxplot.png"
              alt="Box plot of minimum image_ratio between the two rules in a pair, grouped by regime, showing heavily overlapping distributions across all five regimes."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--rule)', background: '#fff' }}
            />
            <figcaption className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
              kept as the original static figure &mdash; needs the per-pair regime join, which isn't in the lightweight results/ csvs.
            </figcaption>
          </figure>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> no. Distributions for drain, crystalline,
            and structured overlap heavily &mdash; there's no clean image_ratio threshold that separates them. Two
            rules can share an identical image_ratio and still differ in whether they drain against a third. The
            real condition is something more structural than a single score &mdash; see the open question below.
          </p>
        </QuestionCard>

        <QuestionCard
          id="heatmap"
          q="Is a rule's regime-behavior mostly about the rule, or mostly about the specific pairing?"
          status="established" statusLabel="Established (descriptive)"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 0.9rem' }}>
            The full 256&times;256 landscape, one cell per rule pair, colored by regime:
          </p>
          <figure style={{ margin: '0 0 0.6rem' }}>
            <img
              src="assets/img/regime_heatmap.png"
              alt="A 256 by 256 grid heatmap where each cell is colored by the regime of that rule pair, showing dense vertical and horizontal banding."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--rule)', background: '#fff' }}
            />
            <figcaption className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
              kept as the original static figure &mdash; all 65,536 cells aren't in a checked-in csv to recompute client-side (yet).
            </figcaption>
          </figure>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> both, in tension. The banding is the
            headline &mdash; some rules behave almost the same against nearly every partner (a strong vertical or
            horizontal stripe of one color), which suggests a rule's regime-tendency is partly its own property, not
            purely a function of the pairing. That's in tension with (not contradicted by) the image_ratio result
            above, which says the fine-grained outcome is genuinely pairwise. Both can be true at once: a rule can
            have a strong individual tendency and the exact partner can still matter at the margins.
          </p>
        </QuestionCard>

        <QuestionCard
          id="meta-evolution"
          q="If a state gets to pick its own next rule, does it keep discovering new behavior, or does it settle down?"
          status="suggestive" statusLabel="Suggestive"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Each generation derives a child rule from the current state (population count, by default), classifies
            the parent&rarr;child handoff, then adopts the child. This isn't a precomputed picture &mdash; press the
            button and it runs the real algorithm, live, right now, starting from rule 90:
          </p>
          <button
            onClick={runLineage}
            className="gc-mono"
            style={{ fontWeight: 700, fontSize: '0.82rem', padding: '0.55rem 1rem', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginBottom: '1rem' }}
          >
            {lineageRunning ? 'Running…' : (lineageHistory ? 'Run another lineage live ↻' : 'Run a lineage live ▶')}
          </button>
          <LineageChart history={lineageHistory} />
          <p className="gc-mono" style={{ fontSize: '0.74rem', color: 'var(--ink-soft)', margin: '0.5rem 0 0' }}>
            x: generation &middot; y: active rule number (0&ndash;255) &middot; dot color: handoff regime
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>{lineageStatus}</p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> lineages reliably wander through a few
            structured or noisy handoffs, then lock into a small repeating cycle in rule space itself &mdash; a found
            stable platform, not a runaway tower of ever-new rules. Confirmed across repeated runs with this
            generator; whether a richer generator ever fails to lock in is still untested.
          </p>
        </QuestionCard>

        <QuestionCard
          id="generators"
          q="Does how the child rule gets generated change how long that search lasts?"
          status="suggestive" statusLabel="Suggestive"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Mean generations before locking into a cycle (8 seeds per generator; every run locked in 100% of the time
            within the 40-generation budget):
          </p>
          <GeneratorBarChart />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> yes. The deliberately information-free
            control (<code className="gc-code">G(&middot;,90)</code>, which is provably all-zero for every state by
            the affine theorem, so it always emits rule 0) locks in almost immediately; the richest generator tested
            explores roughly 5&times; longer. Consistent with "more state-information in the generator &rarr; longer
            search" &mdash; and the degenerate control landing exactly at the floor is a nice sanity check that the
            mechanism is real.
          </p>
        </QuestionCard>

        <QuestionCard
          id="absential"
          q="Can “boring” and “alive” behavior be told apart more cheaply than watching a rule evolve?"
          status="exploratory" statusLabel="Exploratory (inconclusive)"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Hypothesis: cells that are off-but-adjacent-to-alive (the absential field, see Concepts) might compress
            in a more class-discriminating way than raw state. One canonical rule per Wolfram class, published
            numbers (zlib) alongside a live recomputation in your browser right now (deflate &mdash; same shape of
            metric, different compressor, so don't expect the two columns to match exactly):
          </p>
          <div style={{ overflowX: 'auto' }}>
            <div className="gc-abs-table">
              <div className="head">Rule</div>
              <div className="head">Class</div>
              <div className="head">Pub. raw</div>
              <div className="head">Pub. absential</div>
              <div className="head">Live raw</div>
              <div className="head">Live absential</div>
              {ABSENTIAL_PUBLISHED.map((r) => {
                const live = absentialLive ? absentialLive[r.rule] : null;
                return (
                  <Fragment key={r.rule}>
                    <div>{r.rule}</div>
                    <div>{r.cls}</div>
                    <div>{r.pubRaw}</div>
                    <div>{r.pubAbs}</div>
                    <div>{live ? live.liveRaw : '…'}</div>
                    <div>{live ? live.liveAbs : '…'}</div>
                  </Fragment>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> not from this test. The absential field
            tracks the raw state's compressibility closely in every case, consistently a little more compressible,
            never dramatically so. Four rules is a thin sample, and elementary CA don't really have the kind of
            persistent localized structures (gliders, still lifes) the hypothesis was framed around &mdash; a fairer
            test would use 2D automata with known stable structures, like Conway's Life.
          </p>
        </QuestionCard>

        <QuestionCard
          id="drain-mechanism"
          q="What actually predicts the drain regime, if not image_ratio alone?"
          status="open" statusLabel="Open — no data yet"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: 0 }}>
            We know it's not a scalar score (see above). The one concrete counterexample on record: rule 4
            (image_ratio 0.051) drains against rules 30, 126, and 54, but <em>not</em> against rule 18 &mdash;
            despite rule 18 and rule 126 sharing an identical image_ratio (0.135). The real condition looks closer in
            spirit to Moore &amp; Boykett's algebraic conditions for commuting CA (permutivity, linearity-in-each-other)
            than to any single number, but that hasn't actually been tested against the drain set yet. A concrete,
            runnable next step &mdash; not yet done.
          </p>
        </QuestionCard>

        <QuestionCard
          id="rule-as-state"
          q="Could a rule live in the same State &rarr; State shape as the data it acts on?"
          status="open" statusLabel="Open — not implemented"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: 0 }}>
            Every instrument in this project maps State &rarr; State. A rule, by contrast, is a fixed number sitting
            outside that space. Non-uniform cellular automata &mdash; one rule per cell instead of one shared global
            rule &mdash; would give the rule-field the same shape as the state itself, and trace back to von
            Neumann's self-reproducing automaton (construction instructions stored as patterns in the same substrate
            they act on). Not implemented anywhere in this project yet.
          </p>
        </QuestionCard>
      </main>

      <footer className="gc-footer">
        <div className="gc-footer-inner">
          Raw data behind every chart here is checked into <code className="gc-code">results/</code> in the{' '}
          <a href="https://github.com/mbilokonsky/groovy-commutator">GitHub repository</a>.
        </div>
      </footer>
    </>
  );
}
