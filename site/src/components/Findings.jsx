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

export default function Findings() {
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
      <Nav active="findings" />
      <Watermark title="AI-written prose, mostly-live charts">
        {' '}The writing on this page was generated by an LLM. Most charts below are computed live in your browser
        from data checked into <code className="gc-code">results/</code>; two (marked) are kept as the original
        static figures because the full underlying table isn't small enough to ship. Check the{' '}
        <a href="https://github.com/mbilokonsky/groovy-commutator">source</a> if it matters to you.
      </Watermark>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <div className="gc-mono" style={{ textTransform: 'uppercase', letterSpacing: '.09em', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5em' }}>findings</div>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(1.8rem,5vw,2.4rem)', lineHeight: 1.25, margin: '0 0 0.4em', fontWeight: 600 }}>
          What we actually know &mdash; and how sure we are
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--ink-soft)', margin: '0 0 2rem', maxWidth: '62ch' }}>
          Each card is labeled with how confident we are in it. Several of the newer instruments are here specifically
          because they're <em>not</em> settled &mdash; saying so plainly is the point.
        </p>

        <section id="regime-counts" className="gc-finding">
          <div className="gc-finding-head">
            <h3>Structured divergence is the modal outcome, not the exception</h3>
            <Badge level="established">Established</Badge>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Across all 256 elementary CA rules &mdash; all 32,640 unordered pairs, 5 seeds each:
          </p>
          <RegimeBarChart />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Why it's interesting:</strong> structured divergence has no
            single-rule analog, and the intuition going in was that it'd be a narrow sliver between agreement and
            noise. At full scale it's the <strong>largest single regime</strong>, covering nearly half of all pairs.
          </p>
        </section>

        <section id="image-ratio" className="gc-finding">
          <div className="gc-finding-head">
            <h3>Rule "lossiness" alone doesn't predict the regime</h3>
            <Badge level="established">Established</Badge>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 0.9rem' }}>
            Live histogram of <code className="gc-code">image_ratio</code> across all 256 rules &mdash; the
            surjectivity measure the hypothesis was riding on:
          </p>
          <ImageRatioHistogram />
          <figure style={{ margin: '0 0 0.6rem' }}>
            <img
              src="/assets/img/regime_image_ratio_boxplot.png"
              alt="Box plot of minimum image_ratio between the two rules in a pair, grouped by regime, showing heavily overlapping distributions across all five regimes."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--rule)', background: '#fff' }}
            />
            <figcaption className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
              kept as the original static figure &mdash; this needs the per-pair regime join, which isn't in the lightweight results/ csvs.
            </figcaption>
          </figure>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Why it's interesting:</strong> distributions for drain, crystalline,
            and structured overlap heavily &mdash; there's no clean image_ratio threshold that separates them. Two rules
            can share an identical image_ratio and still differ in whether they drain.
          </p>
        </section>

        <section id="heatmap" className="gc-finding">
          <div className="gc-finding-head">
            <h3>The full regime landscape, all 256&times;256 rule pairs</h3>
            <Badge level="established">Established (descriptive)</Badge>
          </div>
          <figure style={{ margin: '0 0 0.6rem' }}>
            <img
              src="/assets/img/regime_heatmap.png"
              alt="A 256 by 256 grid heatmap where each cell is colored by the regime of that rule pair, showing dense vertical and horizontal banding."
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--rule)', background: '#fff' }}
            />
            <figcaption className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.4rem' }}>
              kept as the original static figure &mdash; all 65,536 cells aren't in a checked-in csv to recompute client-side (yet).
            </figcaption>
          </figure>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Why it's interesting:</strong> the banding is the headline &mdash;
            some rules behave almost the same against every partner, suggesting regime is partly a property of the
            rule itself, not just the pairing. In tension with (and not contradicted by) the image_ratio finding above.
          </p>
        </section>

        <section id="meta-evolution" className="gc-finding">
          <div className="gc-finding-head">
            <h3>Meta-evolution lineages wander, then lock into a small stable cycle</h3>
            <Badge level="suggestive">Suggestive</Badge>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Each generation derives a child rule from the current state (population count, by default), classifies
            the handoff, then adopts the child. This isn't a precomputed picture &mdash; press the button and it runs
            the real algorithm, live, right now, starting from rule 90:
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
        </section>

        <section id="generators" className="gc-finding">
          <div className="gc-finding-head">
            <h3>How a child rule gets generated changes how long the lineage searches</h3>
            <Badge level="suggestive">Suggestive</Badge>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Mean generations before locking into a cycle (8 seeds per generator; every run locked in 100% of the time
            within the 40-generation budget):
          </p>
          <GeneratorBarChart />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Why it's interesting:</strong> the deliberately information-free
            control (always emits rule 0) locks in almost immediately; the richest generator tested explores roughly
            5&times; longer. Consistent with "more state-information in the generator &rarr; longer search."
          </p>
        </section>

        <section id="absential" className="gc-finding">
          <div className="gc-finding-head">
            <h3>Absential field as a Class-IV detector: tested, inconclusive</h3>
            <Badge level="exploratory">Exploratory</Badge>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Hypothesis: cells that are off-but-adjacent-to-alive might compress in a more class-discriminating way than
            raw state. One canonical rule per Wolfram class, published numbers (zlib) alongside a live recomputation
            in your browser right now (deflate &mdash; same shape of metric, different compressor, so don't expect the
            two columns to match exactly):
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
            <strong style={{ color: 'var(--ink)' }}>This test does not confirm the original hypothesis</strong> &mdash;
            the absential field tracks the raw state's compressibility closely in every case, consistently a little
            more compressible, never dramatically so. Four rules is a thin sample; a fairer test would use 2D
            automata with known stable structures (e.g. Conway's Life).
          </p>
        </section>
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
