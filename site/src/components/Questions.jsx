import { Fragment, useEffect, useRef, useState } from 'react';
import Nav from './Nav.jsx';
import Watermark from './Watermark.jsx';
import drainData from '../data/drain_predictor.json';
import thresholdData from '../data/threshold_check.json';
import prehocData from '../data/prehoc_coupling.json';
import nonuniformData from '../data/nonuniform.json';
import absential2dData from '../data/absential_2d.json';
import drainScalingData from '../data/drain_scaling.json';
import metaevolutionData from '../data/metaevolution.json';
import metaevoPairsData from '../data/metaevolution_pairs.json';

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

const GENERATOR_LABELS = {
  population_count: 'population count',
  absential_count: 'absential count',
  'g90_popcount (degenerate)': 'G(·,90) control',
  g30_popcount: 'G(·,30)',
  d90_sample: 'D(state,90) sample',
};

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
  const gens = metaevolutionData.generators;
  const maxVal = Math.max(...gens.map((g) => g.ci_high));
  const chartLeft = 150, chartWidth = 250, rowH = 36, rowGap = 8;
  const x = (v) => chartLeft + (v / maxVal) * chartWidth;
  return (
    <svg viewBox="0 0 520 220" style={{ width: '100%', height: 'auto', maxWidth: 480, display: 'block' }}>
      {gens.map((g, i) => {
        const y = i * (rowH + rowGap);
        const labelY = y + (rowH - 10) / 2 + 4;
        const barH = rowH - 10;
        return (
          <g key={g.generator}>
            <rect x={chartLeft} y={y} width={x(g.mean_generations) - chartLeft} height={barH} fill="var(--accent)" rx="3" />
            <line x1={x(g.ci_low)} y1={y + barH / 2} x2={x(g.ci_high)} y2={y + barH / 2} stroke="#2a2420" strokeWidth="1.5" />
            <line x1={x(g.ci_low)} y1={y + barH / 2 - 4} x2={x(g.ci_low)} y2={y + barH / 2 + 4} stroke="#2a2420" strokeWidth="1.5" />
            <line x1={x(g.ci_high)} y1={y + barH / 2 - 4} x2={x(g.ci_high)} y2={y + barH / 2 + 4} stroke="#2a2420" strokeWidth="1.5" />
            <text x="0" y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="11" fill="#6b6055">{GENERATOR_LABELS[g.generator] || g.generator}</text>
            <text x={x(g.ci_high) + 8} y={labelY} fontFamily="IBM Plex Mono, monospace" fontSize="12" fontWeight="700" fill="#2a2420">
              {g.mean_generations.toFixed(1)}
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

// log2(pair eventual image size) x attractor overlap, one dot per sampled
// pair -- the two structural coordinates the drain answer lives in.
function DrainScatter() {
  const W = 520, H = 280, padL = 42, padR = 12, padT = 12, padB = 40;
  const w = W - padL - padR, h = H - padT - padB;
  const groups = [
    { key: 'other', color: '#c9bda9', label: 'noisy / structured / mislabeled drain' },
    { key: 'crystalline', color: 'var(--crystalline)', label: 'crystalline (never converges)' },
    { key: 'converged', color: 'var(--drain)', label: 'converged (final disagreement = 0)' },
  ];
  const x = (lg) => padL + (lg / 12) * w;
  const y = (j) => padT + (1 - j) * h;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block' }}>
        <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke="#e4dac8" />
        <line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke="#e4dac8" />
        {[0, 4, 8, 12].map((v) => (
          <text key={v} x={x(v)} y={H - 22} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
        ))}
        {[0, 0.5, 1].map((v) => (
          <text key={v} x={padL - 6} y={y(v) + 3} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
        ))}
        <text x={padL + w / 2} y={H - 6} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">
          log&#8322; of the pair&#8217;s eventual image (0 = one single reachable state)
        </text>
        <text x={12} y={padT + h / 2} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055" transform={`rotate(-90 12 ${padT + h / 2})`}>
          attractor overlap
        </text>
        {groups.map((g) => (
          <g key={g.key}>
            {(drainData.scatter[g.key] || []).map(([lg, j], i) => (
              <circle key={i} cx={x(lg)} cy={y(j)} r="2.6" fill={g.color} opacity="0.55" />
            ))}
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        {groups.slice().reverse().map((g) => (
          <span key={g.key} className="gc-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: g.color, flex: 'none' }}></span>{g.label}
          </span>
        ))}
      </div>
    </>
  );
}

// The full-sweep compressibility histogram with the two classifier cut
// points as live sliders -- drag them and watch the regime counts move.
function ThresholdHistogram() {
  const { bins, bin_width, n_pairs, crystalline_sweep, noisy_sweep } = thresholdData;
  const [crysIdx, setCrysIdx] = useState(() => crystalline_sweep.findIndex((r) => r.cut === 0.1));
  const [noisyIdx, setNoisyIdx] = useState(() => noisy_sweep.findIndex((r) => r.cut === 0.85));
  const crysCut = crystalline_sweep[crysIdx].cut;
  const noisyCut = noisy_sweep[noisyIdx].cut;
  // the two cuts partition independently: crystalline count depends only on
  // the low cut, noisy only on the high cut
  const nCrys = crystalline_sweep[crysIdx].crystalline;
  const nNoisy = noisy_sweep[noisyIdx].noisy;
  const nStruct = n_pairs - nCrys - nNoisy;
  const stillModal = nStruct > Math.max(nCrys, nNoisy, 4009, 1164);

  const W = 520, H = 170, padB = 20;
  const maxBin = Math.max(...bins);
  const bw = W / bins.length;
  const cutX = (cut) => (cut / (bins.length * bin_width)) * W;
  const sliderStyle = { width: '100%', accentColor: 'var(--accent)' };
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block' }}>
        {bins.map((count, i) => {
          const hh = (count / maxBin) * (H - padB - 8);
          const mid = (i + 0.5) * bin_width;
          const color = mid < crysCut ? 'var(--crystalline)' : mid > noisyCut ? 'var(--noisy)' : 'var(--structured)';
          return <rect key={i} x={i * bw + 0.5} y={H - padB - hh} width={bw - 1} height={hh} fill={color} />;
        })}
        <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="#e4dac8" />
        {[[crysCut, 'crystalline cut'], [noisyCut, 'noisy cut']].map(([cut, label]) => (
          <g key={label}>
            <line x1={cutX(cut)} y1={0} x2={cutX(cut)} y2={H - padB} stroke="var(--ink)" strokeDasharray="3 3" />
            <text x={cutX(cut) + 4} y={12} fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink)">{cut.toFixed(2)}</text>
          </g>
        ))}
        {[0, 0.5, 1.0].map((v) => (
          <text key={v} x={(v / (bins.length * bin_width)) * W} y={H - 6} textAnchor={v === 0 ? 'start' : 'middle'} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', margin: '0.8rem 0 0.4rem' }}>
        <label className="gc-mono" style={{ flex: '1 1 200px', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
          crystalline cut: <strong style={{ color: 'var(--ink)' }}>{crysCut.toFixed(2)}</strong>
          <input type="range" min="0" max={crystalline_sweep.length - 1} value={crysIdx}
            onChange={(e) => setCrysIdx(Number(e.target.value))} style={sliderStyle} />
        </label>
        <label className="gc-mono" style={{ flex: '1 1 200px', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
          noisy cut: <strong style={{ color: 'var(--ink)' }}>{noisyCut.toFixed(2)}</strong>
          <input type="range" min="0" max={noisy_sweep.length - 1} value={noisyIdx}
            onChange={(e) => setNoisyIdx(Number(e.target.value))} style={sliderStyle} />
        </label>
      </div>
      <p className="gc-mono" style={{ fontSize: '0.74rem', color: 'var(--ink-soft)', margin: '0.3rem 0 0' }}>
        crystalline <strong style={{ color: 'var(--crystalline)' }}>{nCrys.toLocaleString()}</strong>
        {' '}&middot; structured <strong style={{ color: 'var(--structured)' }}>{nStruct.toLocaleString()}</strong>
        {' '}&middot; noisy <strong style={{ color: 'var(--noisy)' }}>{nNoisy.toLocaleString()}</strong>
        {' '}&middot; structured still the largest regime:{' '}
        <strong style={{ color: stillModal ? 'var(--commute)' : 'var(--drain)' }}>{stillModal ? 'yes' : 'no'}</strong>
      </p>
    </>
  );
}

// Compressibility of the coupled layer-A trajectory, pre-hoc random samples
// vs the post-hoc (XOR-coupled) control population.
function PrehocHistogram() {
  const { bin_edges, hist_comp_a } = prehocData;
  const nb = bin_edges.length - 1;
  const W = 520, H = 150, padB = 20;
  const maxBin = Math.max(...hist_comp_a.prehoc, ...hist_comp_a.posthoc);
  const bw = W / nb;
  const series = [
    { key: 'posthoc', color: '#c9bda9', label: 'post-hoc control: g(l,c,r) XOR other layer' },
    { key: 'prehoc', color: 'var(--accent)', label: 'pre-hoc: other layer inside the lookup' },
  ];
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block' }}>
        {series.map((s) => hist_comp_a[s.key].map((count, i) => {
          const hh = (count / maxBin) * (H - padB - 6);
          return <rect key={s.key + i} x={i * bw + 0.5} y={H - padB - hh} width={bw - 1} height={hh} fill={s.color} opacity="0.65" />;
        }))}
        <line x1="0" y1={H - padB} x2={W} y2={H - padB} stroke="#e4dac8" />
        {[0, 0.5, 1.0].map((v) => (
          <text key={v} x={(v / bin_edges[bin_edges.length - 1]) * W} y={H - 6} textAnchor={v === 0 ? 'start' : 'middle'} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
        {series.map((s) => (
          <span key={s.key} className="gc-mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35em', fontSize: '0.7rem', color: 'var(--ink-soft)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flex: 'none' }}></span>{s.label}
          </span>
        ))}
      </div>
      <p className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', margin: '0.4rem 0 0' }}>
        compressibility of one coupled layer&#8217;s trajectory, 0 &rarr; 1.1 &middot; 1,500 random samples each
      </p>
    </>
  );
}

// Median distinct-rule count over time under gated rule transport, with the
// interquartile band -- the polyculture question, answered as a picture.
function DiversityCurve() {
  const { diversity_median, diversity_q25, diversity_q75, steps } = nonuniformData;
  const W = 520, H = 180, padL = 36, padR = 10, padT = 10, padB = 30;
  const w = W - padL - padR, h = H - padT - padB;
  const maxY = 100;
  const x = (t) => padL + (t / (steps - 1)) * w;
  const y = (v) => padT + (1 - v / maxY) * h;
  const path = (arr) => arr.map((v, t) => `${t ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('');
  const band = diversity_q75.map((v, t) => `${t ? 'L' : 'M'}${x(t).toFixed(1)},${y(v).toFixed(1)}`).join('')
    + diversity_q25.slice().reverse().map((v, i) => `L${x(steps - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join('') + 'Z';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block' }}>
      <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke="#e4dac8" />
      <line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke="#e4dac8" />
      {[0, 50, 100].map((v) => (
        <text key={v} x={padL - 6} y={y(v) + 3} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
      ))}
      {[0, 100, 200].map((v) => (
        <text key={v} x={x(Math.min(v, steps - 1))} y={H - 8} textAnchor={v === 0 ? 'start' : 'middle'} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{v}</text>
      ))}
      <path d={band} fill="var(--accent-soft)" />
      <path d={path(diversity_median)} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <text x={padL + w - 4} y={y(diversity_median[diversity_median.length - 1]) - 8} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="var(--ink)">
        distinct rules alive &middot; median + IQR
      </text>
    </svg>
  );
}

// P(a rule value survives to the end | its popcount) -- the selection
// gradient, as bars.
function SurvivalByPopcount() {
  const surv = nonuniformData.survival_by_popcount;
  const W = 520, H = 170, padL = 36, padB = 30;
  const w = W - padL - 10, h = H - padB - 10;
  const bw = w / 9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 520, display: 'block' }}>
      {surv.map((p, k) => {
        const hh = (p || 0) * h;
        return (
          <g key={k}>
            <rect x={padL + k * bw + 3} y={10 + h - hh} width={bw - 6} height={hh} fill="var(--accent)" rx="2" />
            <text x={padL + k * bw + bw / 2} y={H - 16} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">{k}</text>
            <text x={padL + k * bw + bw / 2} y={10 + h - hh - 4} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="var(--ink)">{p === null ? '' : p.toFixed(2)}</text>
          </g>
        );
      })}
      <line x1={padL} y1={10 + h} x2={padL + w} y2={10 + h} stroke="#e4dac8" />
      <text x={padL + w / 2} y={H - 3} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">
        popcount of the rule (how many of its 8 outputs are 1)
      </text>
      <text x={8} y={12} fontFamily="IBM Plex Mono, monospace" fontSize="10" fill="#6b6055">P(survive)</text>
    </svg>
  );
}

// Live demo of state-gated rule transport: state trajectory next to the
// rule field's own trajectory (each rule value hashed to a color, so
// territories are visible), plus the live distinct-rule count.
function NonuniformDemo() {
  const [seed, setSeed] = useState(1);
  const [status, setStatus] = useState('computing…');
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
    const n = 100, steps = 100;
    const s0 = randomState(n, seed);
    const rng = mulberry32(seed + 5);
    const rf0 = Array.from({ length: n }, () => Math.floor(rng() * 256));
    const res = gatedDiffusionTrajectory(s0, rf0, steps);
    if (stateRef.current) renderFieldToCanvas(stateRef.current, res.states, '#2a2420', '#f1ead9');
    if (rulesRef.current) renderByteFieldToCanvas(rulesRef.current, res.rules);
    setStatus(`distinct rules alive: ${res.distinct[0]} at step 0 → ${res.distinct[steps - 1]} at step ${steps}.`);
  }

  return (
    <div>
      <button onClick={() => setSeed((s) => s + 1)} className="gc-mono"
        style={{ fontWeight: 700, fontSize: '0.76rem', padding: '0.4rem 0.8rem', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', cursor: 'pointer', marginBottom: '0.9rem' }}>
        reroll state + rule field ↻
      </button>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        {[[stateRef, 'the state, evolving under its local rules'],
          [rulesRef, 'the rule field itself — one color per rule value']].map(([ref, label]) => (
          <div key={label} style={{ width: 190 }}>
            <canvas className="gc-field" ref={ref} style={{ width: 190, height: 190 }}></canvas>
            <div className="gc-mono" style={{ fontSize: '0.66rem', color: 'var(--ink-soft)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <p className="gc-mono" style={{ fontSize: '0.74rem', color: 'var(--ink-soft)', margin: '0.7rem 0 0' }}>{status}</p>
    </div>
  );
}

// The emergence demo: four component rules, each boring alone, mutually
// coupled pre-hoc into two layers that are not boring at all. Runs the real
// engine live; reroll to convince yourself it isn't a cherry-picked seed.
const PREHOC_EXAMPLES = prehocData.emergent_examples.slice(0, 3);

function PrehocDemo() {
  const [exIdx, setExIdx] = useState(0);
  const [seed, setSeed] = useState(1);
  const [collapseStatus, setCollapseStatus] = useState('verifying…');
  const engineRef = useRef(null);
  const soloRefs = useRef([{ current: null }, { current: null }, { current: null }, { current: null }]);
  const layerARef = useRef(null);
  const layerBRef = useRef(null);
  const diffRef = useRef(null);

  const ex = PREHOC_EXAMPLES[exIdx];
  const parts = [ex.a0, ex.a1, ex.b0, ex.b1];

  useEffect(() => {
    let cancelled = false;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled) return;
      engineRef.current = engine;
      // live verification of the collapse theorem: feeding the absential
      // field (elementary rule 50) in as the 4th input of a random 4-input
      // rule equals a plain elementary rule, exactly, on random states
      const { randomState, applyRule, applyRule4, absentialField, collapseToElementary, mulberry32 } = engine;
      const rng = mulberry32(99);
      let ok = true, checks = 0;
      for (let trial = 0; trial < 25; trial++) {
        const table = Math.floor(rng() * 65536);
        const eff = collapseToElementary(table, 50);
        const s = randomState(64, 1000 + trial);
        const viaPrehoc = applyRule4(s, absentialField(s), table);
        const viaElementary = applyRule(s, eff);
        for (let i = 0; i < s.length; i++) { checks++; if (viaPrehoc[i] !== viaElementary[i]) ok = false; }
      }
      // and the separability count, brute force over all 65,536 tables
      let separable = 0;
      for (let t = 0; t < 65536; t++) if (engine.isSeparable4(t)) separable++;
      setCollapseStatus(ok
        ? `verified in your browser just now: ${checks.toLocaleString()} cell-level checks across 25 random 4-input rules, zero mismatches — and ${separable} of 65,536 tables are post-hoc separable.`
        : 'mismatch found (unexpected — please report this).');
      draw();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { draw(); });

  function draw() {
    const engine = engineRef.current;
    if (!engine) return;
    const { randomState, evolveTrajectory, coupledTrajectory, rule4FromPair, renderFieldToCanvas } = engine;
    const n = 100, steps = 100;
    const s0a = randomState(n, seed);
    const s0b = randomState(n, seed + 7919);
    parts.forEach((rule, i) => {
      const canvas = soloRefs.current[i].current;
      if (canvas) renderFieldToCanvas(canvas, evolveTrajectory(s0a, rule, steps), '#2a2420', '#f1ead9');
    });
    const res = coupledTrajectory(s0a, s0b, rule4FromPair(ex.a0, ex.a1), rule4FromPair(ex.b0, ex.b1), steps);
    if (layerARef.current) renderFieldToCanvas(layerARef.current, res.a, '#2a2420', '#f1ead9');
    if (layerBRef.current) renderFieldToCanvas(layerBRef.current, res.b, 'oklch(0.5 0.1 195)', '#f1ead9');
    if (diffRef.current) renderFieldToCanvas(diffRef.current, res.diff, 'oklch(0.6 0.28 340)', '#f1ead9');
  }

  const btn = { fontWeight: 700, fontSize: '0.76rem', padding: '0.4rem 0.8rem', borderRadius: 7, cursor: 'pointer' };
  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.9rem' }}>
        {PREHOC_EXAMPLES.map((e, i) => (
          <button key={i} onClick={() => setExIdx(i)} className="gc-mono"
            style={{ ...btn, border: '1px solid var(--accent)', background: i === exIdx ? 'var(--accent)' : '#fff', color: i === exIdx ? '#fff' : 'var(--accent)' }}>
            ({e.a0},{e.a1} | {e.b0},{e.b1})
          </button>
        ))}
        <button onClick={() => setSeed((s) => s + 1)} className="gc-mono"
          style={{ ...btn, border: '1px solid var(--rule)', background: '#fff', color: 'var(--ink-soft)' }}>
          reroll starting states ↻
        </button>
      </div>
      <div className="gc-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '0.4rem' }}>
        each component rule, alone
      </div>
      <div style={{ display: 'flex', gap: '0.7rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {parts.map((rule, i) => (
          <div key={i} style={{ width: 92 }}>
            <canvas className="gc-field" ref={soloRefs.current[i]} style={{ width: 92, height: 92 }}></canvas>
            <div className="gc-mono" style={{ fontSize: '0.66rem', color: 'var(--ink-soft)', marginTop: 2, textAlign: 'center' }}>rule {rule}</div>
          </div>
        ))}
      </div>
      <div className="gc-mono" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '0.4rem' }}>
        the same four rules, mutually coupled
      </div>
      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
        {[[layerARef, `layer A — x0=${ex.a0}, x1=${ex.a1}, 4th input = B`],
          [layerBRef, `layer B — x0=${ex.b0}, x1=${ex.b1}, 4th input = A`],
          [diffRef, 'C(A, B) — where the layers disagree']].map(([ref, label]) => (
          <div key={label} style={{ width: 150 }}>
            <canvas className="gc-field" ref={ref} style={{ width: 150, height: 150 }}></canvas>
            <div className="gc-mono" style={{ fontSize: '0.66rem', color: 'var(--ink-soft)', marginTop: 3 }}>{label}</div>
          </div>
        ))}
      </div>
      <p className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', margin: '0.9rem 0 0' }}>
        collapse theorem: {collapseStatus}
      </p>
    </div>
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
          <p className="gc-mono" style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', margin: '0.5rem 0 0' }}>
            * the drain count is known-inflated by a classifier artifact (honest census &asymp; 2,150) &mdash; see
            the drain question below; the correction doesn't change which regime is largest.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> structured divergence &mdash; the regime
            with no single-rule analog &mdash; was expected to be a narrow sliver between agreement and noise. At
            full scale it's the <strong>largest single regime</strong>, covering nearly half of all pairs. Two
            arbitrary rules are more likely than not to settle into a persistent, legible, non-identical relationship
            rather than either merging or dissolving into static.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.6rem 0 0' }}>
            Two revisions to these counts came out of checking them &mdash; the boundary lines hold up better than
            expected (<a href="#thresholds" style={{ color: 'var(--accent)' }}>next question</a>), but the drain
            count turns out to be measuring two different things at once
            (<a href="#drain-mechanism" style={{ color: 'var(--accent)' }}>further down</a>).
          </p>
        </QuestionCard>

        <QuestionCard
          id="thresholds"
          q="Are the five regimes real populations, or artifacts of where we drew the lines?"
          status="established" statusLabel="Established (mostly)"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            The classifier decides commute and drain from the <em>shape</em> of the disagreement trajectory; the
            other three regimes are cut from a single number &mdash; the disagreement field's compressibility &mdash;
            at two thresholds (0.10 and 0.85) that were eyeballed off the pilot, never fit to data. Here's the real
            distribution across all 27,467 shape-undecided pairs, with both cuts as live sliders &mdash; drag them
            and watch what the regime counts would have been:
          </p>
          <ThresholdHistogram />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> the crystalline cut is real &mdash;
            the distribution is genuinely bimodal at the low end, and 0.10 happens to sit in the empirical valley
            (the 0.10&ndash;0.12 bin is the histogram's minimum). The noisy cut is genuinely soft: there is no
            valley, just a smooth ramp up into the incompressible spike at 1.0, so the exact structured/noisy split
            is a judgment call. But the headline claim survives every version of that judgment: structured stays
            the largest single regime for <em>any</em> noisy cut from 0.60 to 0.98, and for any crystalline cut up
            to about 0.20. The one count these sliders can't fix is drain's &mdash; see below.
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
            real condition is something more structural than a single score &mdash; a pair-level property, found and
            measured in the <a href="#drain-mechanism" style={{ color: 'var(--accent)' }}>drain question below</a>.
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
            stable platform, not a runaway tower of ever-new rules. At scale (next question), <em>every</em> lineage
            locks in. An earlier version of this page reported a tantalizing ~5% that seemed to wander forever;
            chasing them with a 10&times; budget revealed they'd been locked all along &mdash; in period-4 and
            period-5 cycles (e.g. rules 23&rarr;41&rarr;19&rarr;43, forever) that a detector watching only for
            periods &le; 3 couldn't see. Every lineage that locks does so within ~27 generations; open-endedness has
            not survived contact with a better detector yet.
          </p>
        </QuestionCard>

        <QuestionCard
          id="generators"
          q="Does how the child rule gets generated change how long that search lasts?"
          status="established" statusLabel="Established (direction)"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Mean generations before locking into a cycle &mdash; {metaevolutionData.seeds} independent initial
            states per generator, whiskers are bootstrap 95% CIs, and with a detector that catches periods up to 6,
            lock-in is 100% across the board:
          </p>
          <GeneratorBarChart />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> yes, robustly &mdash; and one early
            reading didn't survive the scale-up. The information-free control
            (<code className="gc-code">G(&middot;,90)</code>, provably all-zero for every state by the affine
            theorem, so it always emits rule 0) sits at <em>exactly</em> 2.0 generations with zero variance &mdash;
            a floor pinned by a theorem. Every information-carrying generator searches 3&ndash;5&times; longer, with
            separated CIs. But the earlier suggestion that the &ldquo;richest&rdquo; generator searches longest
            didn't hold: at scale, humble population count statistically ties the 8-bit derivative sample at the
            top. Carrying <em>some</em> state information matters enormously; naive bit-count of the generator does
            not predict search length beyond that. (Two methodology corrections along the way, recorded in the
            experiment script: replicating across <em>starting rules</em> is pseudo-replication, because a
            state-only generator makes everything after the first handoff depend on the initial state alone; and
            the cycle detector needed to watch for periods beyond 3 &mdash; see the previous question.) One lattice
            size and one budget, still.
          </p>
        </QuestionCard>

        <QuestionCard
          id="pair-lineages"
          q="Give the lineage a vastly bigger rule space to search — does it stop settling down?"
          status="suggestive" statusLabel="Suggestive"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            One suspicion about the lock-in result above: maybe lineages settle only because elementary rule space
            is tiny (256 points). The pre-hoc decomposition (further down) opens a much larger, structured space
            &mdash; a coupled two-layer system is four component rules, 2<sup>32</sup> possible configurations.
            Same lineage protocol, lifted: the generator derives four child rules from the two current layers, the
            handoff is classified by the same five-regime diagnostic on the old-system-vs-new-system disagreement,
            and lock-in means the 4-byte table sequence starts repeating.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: 0 }}>
            <strong style={{ color: 'var(--ink)' }}>What happened:</strong> no. Across {metaevoPairsData.seeds}{' '}
            lineages, {Math.round(metaevoPairsData.lockin_rate * 100)}% still locked in within the{' '}
            {metaevoPairsData.max_generations}-generation budget &mdash; onto tiny platforms (only fixed points and
            2-cycles in table space) &mdash; after a roughly 2&times; longer search than the single-rule case
            (median {metaevoPairsData.median_generations_locked} generations vs. ~10 above). Multiplying the
            searchable space by sixteen million bought a doubling of exploration and no open-endedness. Suggestive,
            not established (one generator construction, one coupling topology) &mdash; but it points the
            &ldquo;why do lineages settle?&rdquo; question away from rule-space size and toward the structure of
            the state&rarr;rule feedback itself.
          </p>
        </QuestionCard>

        <QuestionCard
          id="absential"
          q="Can “boring” and “alive” behavior be told apart more cheaply than watching a rule evolve?"
          status="established" statusLabel="Established (negative) — 2D tested"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Hypothesis: cells that are off-but-adjacent-to-alive (the absential field, see Concepts) might compress
            in a more class-discriminating way than the base state, E(S). One canonical rule per Wolfram class, published
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
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1rem 0 1rem' }}>
            The 1D test above was inconclusive but also unfair &mdash; elementary CA don't have the persistent
            localized structures (gliders, still lifes) the hypothesis was framed around. So the fair version has
            now been run (<code className="gc-code">scripts/experiment_absential_2d.py</code>): seven Life-like 2D
            rules with well-known informal characters, random soup, and compressibility measured on the settled
            tail of each run (steps {absential2dData.settle_from}&ndash;{absential2dData.steps}, where Class IV
            should have condensed into structures while Class III is still churning):
          </p>
          <div style={{ overflowX: 'auto' }}>
            <div className="gc-abs-table" style={{ gridTemplateColumns: '0.9fr 1.6fr 0.7fr 0.9fr' }}>
              <div className="head">Rule</div>
              <div className="head">Character</div>
              <div className="head">Raw</div>
              <div className="head">Absential</div>
              {absential2dData.rules.map((r) => (
                <Fragment key={r.rule}>
                  <div>{r.rule.replace('_', ' ')}</div>
                  <div>{r.note}</div>
                  <div>{r.raw_settled.toFixed(3)}</div>
                  <div>{r.abs_settled.toFixed(3)}</div>
                </Fragment>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            And on the hypothesis's own home turf &mdash; pure structure fields under Life itself &mdash; six
            scattered still-life blocks compress to {absential2dData.probes[0].raw.toFixed(3)} raw
            vs {absential2dData.probes[0].absential.toFixed(3)} absential, and six gliders to{' '}
            {absential2dData.probes[1].raw.toFixed(3)} vs {absential2dData.probes[1].absential.toFixed(3)}:
            the two views never come apart, even here.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> no &mdash; and now with the fair test,
            so this is a real negative, not a shrug. The absential field's compressibility is a monotone rescaling
            of the raw state's in every condition tested (slightly <em>more</em> compressible in 1D, slightly{' '}
            <em>less</em> in 2D where the Moore halo is denser &mdash; but always tracking, never cross-cutting).
            Two consolation findings worth keeping: plain settled-window compressibility on its own is a decent
            informal class detector &mdash; frozen rules land at 0.01&ndash;0.02, the three Class IV rules in a
            tight middle band (0.32&ndash;0.36), chaos at 0.79 &mdash; echoing the pair-regime result that
            &ldquo;interesting&rdquo; lives in the compressibility middle. And the affine theorem crossed dimensions
            intact: B1357/S1357 (&ldquo;Replicator&rdquo;, neighbor parity &mdash; the 2D analog of rule 90) has
            G<sub>2D</sub> &equiv; 0 on all {absential2dData.affine_2d.trials} random grids tested, while Life's
            G<sub>2D</sub> was nonzero on all {absential2dData.affine_2d.trials} controls &mdash; the kinematic/dynamical
            split is not a 1D artifact.
          </p>
        </QuestionCard>

        <QuestionCard
          id="drain-mechanism"
          q="What actually predicts the drain regime, if not image_ratio alone?"
          status="established" statusLabel="Answered — with a correction"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            This was the open question above all others, and it's now been run
            (<code className="gc-code">scripts/experiment_drain_predictor.py</code>). The move: stop scoring rules
            one at a time and measure the <em>pair</em>. For every one of the 32,640 pairs, take one full round of
            the divergence construction (apply A then B) as a single composed map, push the <em>entire</em> n=12
            state space (4,096 states) through it repeatedly, and record two structural numbers: how small the
            reachable set collapses (the pair's <strong>eventual image</strong>), and how much the two orderings'
            eventual images <strong>overlap</strong> as sets (Jaccard).
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            <strong style={{ color: 'var(--ink)' }}>First, the correction the experiment forced.</strong> The sweep's
            "drain" label (disagreement peak minus final &gt; 0.15) turns out to conflate two populations. Of the
            4,009 labeled drains, {drainData.n_soft_drain_label.toLocaleString()} never actually converge &mdash;
            their disagreement decays from an early transient and then settles at a median of{' '}
            {drainData.median_final_soft_drain} <em>forever</em>. Real convergence (final disagreement exactly zero,
            after genuinely disagreeing) covers {drainData.n_converged.toLocaleString()} pairs &mdash;{' '}
            {drainData.converged_labeled_drain.toLocaleString()} labeled drain, plus{' '}
            {drainData.converged_labeled_crystalline} "quiet drains" that hid inside the crystalline count because
            their transient spike was too small to trip the threshold. The honest drain census is ~2,150 pairs
            (6.6%), not 4,009 (12.3%).
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 0.9rem' }}>
            Against that corrected ground truth, the two structural numbers &mdash; computed at toy scale, n=12,
            exhaustively &mdash; predict what happens at the sweep's n=100:
          </p>
          <DrainScatter />
          <div style={{ overflowX: 'auto', margin: '1.1rem 0 0' }}>
            <div className="gc-abs-table" style={{ gridTemplateColumns: '1.6fr 0.9fr 1fr 1fr' }}>
              <div className="head">population</div>
              <div className="head">pairs</div>
              <div className="head">median image</div>
              <div className="head">median overlap</div>
              {[['converged (real drain)', 'converged'], ['"drain"-labeled, never converges', 'soft_drain_label'],
                ['crystalline (non-converging)', 'crystalline_not_converged'], ['structured', 'structured'],
                ['noisy', 'noisy']].map(([label, key]) => {
                const m = drainData.medians[key];
                return (
                  <Fragment key={key}>
                    <div>{label}</div>
                    <div>{m.count.toLocaleString()}</div>
                    <div>{m.pair_image_count} states</div>
                    <div>{m.attractor_jaccard}</div>
                  </Fragment>
                );
              })}
            </div>
          </div>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1.1rem 0 0' }}>
            And the counterexample that killed the single-rule story is fully resolved: rule 4 against 30, 126, 54
            collapses to a shared attractor of {drainData.counterexample[0].pair_image_count},{' '}
            {drainData.counterexample[1].pair_image_count}, and {drainData.counterexample[2].pair_image_count} states
            (overlap 1.0) &mdash; while rule 4 against 18, same single-rule image_ratio as 126, keeps{' '}
            {drainData.counterexample[3].pair_image_count} reachable states with only partial overlap
            ({drainData.counterexample[3].jaccard}), and doesn't drain.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> drain is a two-part condition, and both
            parts belong to the pair, not to either rule: the composed dynamics must crush state space down to a
            tiny attractor set, <em>and</em> both orderings must crush it into the <em>same</em> attractor set.
            Crystalline is the near-miss case that shares the collapse but lands in disjoint (constant-offset)
            attractors &mdash; overlap 0.05 vs. 1.0, with similar image sizes. As a detector, ranking pairs by the
            n=12 structure separates converged from everything else at AUC {drainData.auc_pair_image} (the old
            min-image_ratio baseline: {drainData.auc_min_image_ratio}), and the crisp rule &ldquo;shared attractor
            of &le; {drainData.best_rule.max_image} states&rdquo; gets precision {drainData.best_rule.precision} /
            recall {drainData.best_rule.recall} &mdash; a 4,096-state toy computation predicting behavior at n=100.
            The mechanism question is settled: it's entropy death into a <em>shared</em> grave, and you can see the
            grave from n=12.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Does the toy's size matter?</strong> The residual error was
            first attributed to ring-size mismatch; measuring that attribution (same predictor at four ring sizes,
            same sample) mostly <em>refutes</em> it: AUC{' '}
            {drainScalingData.by_n.map((r, i) => (
              <Fragment key={r.n}>{i > 0 && ' · '}<span className="gc-mono">{r.auc_image.toFixed(3)}</span> at n={r.n}</Fragment>
            ))}. Even the 256-state computation nearly matches the 16,384-state one &mdash; the structure that
            predicts convergence is visible at any ring size, and the remaining error must come mostly from the
            ground truth itself (five sampled seeds per pair at n=100), not from the predictor's scale.
          </p>
        </QuestionCard>

        <QuestionCard
          id="rule-as-state"
          q="Could a rule live in the same State &rarr; State shape as the data it acts on?"
          status="suggestive" statusLabel="Suggestive — now implemented"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Every instrument in this project maps State &rarr; State; the rule sat outside that space as a fixed
            8-bit number. Non-uniform cellular automata &mdash; one rule <em>per cell</em> &mdash; put it inside
            (<code className="gc-code">src/groovy/nonuniform.py</code>): the rule field is an array the same shape
            as the state, its 8 bit-planes are literally state-shaped binary fields, and every diagnostic on this
            site applies to it unchanged. This traces back to von Neumann's self-reproducing automaton, where
            construction instructions were patterns in the same substrate they acted on.
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            <strong style={{ color: 'var(--ink)' }}>The tempting version collapses, again.</strong> The most
            self-referential reading &mdash; each cell's rule number is the byte spelled by the 8 state bits around
            it, &ldquo;the state writes its own rules&rdquo; &mdash; is provably just <em>one</em> ordinary uniform
            CA with a radius-4 neighborhood, by the same argument as the pre-hoc collapse theorem above (verified
            cell-by-cell against the explicit 256-entry window table). Same moral as before: self-reference at the
            same time step buys nothing; the rule field only becomes a genuine second citizen when it <em>persists</em>
            &mdash; when it has memory of its own.
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            So the honest construction gives it memory: the rule field persists, and the state gates its transport
            &mdash; a live cell copies its left neighbor's rule over its own; a dead cell keeps its rule. Rules
            become material flowing through the very medium they animate. Live, right now:
          </p>
          <NonuniformDemo />
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1.1rem 0 1rem' }}>
            Two measured findings from {nonuniformData.seeds} runs ({nonuniformData.steps} steps, n={nonuniformData.n}).
            First: the rule population never collapses to a monoculture &mdash; diversity falls fast, then holds:
          </p>
          <DiversityCurve />
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1.1rem 0 1rem' }}>
            Median {nonuniformData.distinct_t0_median} distinct rules at the start &rarr;{' '}
            {nonuniformData.distinct_final_median} at step {nonuniformData.steps} (never below{' '}
            {nonuniformData.distinct_final_min} in any run) &mdash; a stable polyculture, not a return to uniform
            CA. Second: which rules survive is not random. Transport only overwrites a cell's rule where that cell
            is <em>alive</em> &mdash; so a rule that quiets its own host cell can never be displaced. That's a
            selection pressure, and it shows up as a perfectly monotone gradient:
          </p>
          <SurvivalByPopcount />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1.1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> the moment the rule becomes
            state-shaped <em>with memory</em>, evolution shows up uninvited. All-quiet rules survive{' '}
            {Math.round(nonuniformData.survival_by_popcount[0] / Math.max(nonuniformData.survival_by_popcount[7], 0.001) / 10) * 10}&times;
            more reliably than all-restless ones, and the fraction of cells whose rule is restless (turns 000 into 1)
            drops from {nonuniformData.restless_frac_t0} to {nonuniformData.restless_frac_final} &mdash; yet the
            population settles at moderate quietness (cell share peaks at popcount 2&ndash;3), because
            <em> spreading</em> requires the very liveness that gets a rule overwritten. Persistence wants
            quiescence; propagation wants activity; the standoff is a polyculture. As for the state itself:
            every heterogeneous condition tested (quenched random field, mosaic, gated transport) lands its
            trajectory in the structured band (medians 0.11&ndash;0.16) &mdash; heterogeneity alone pins structure
            that no single uniform rule in the pair-sweep vocabulary produces.
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '0.8rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>Is this an artifact of leftward copying?</strong> No &mdash;
            tested against two other schemes (60 runs each). The mirror scheme (rightward copy) reproduces every
            statistic, as symmetry demands. The sharper test is <em>recombination</em>: let a live cell's rule
            become the XOR of its neighbors' rules, which can invent rules that never existed at the start &mdash;
            and 57% of final cells do carry invented rules, with diversity stabilizing at ~67 distinct rules
            instead of ~20. Yet the selection direction survives even there: the final rule pool is enriched
            2.1&times; toward all-quiet rules and depleted 3&times; at the restless end, despite XOR-mixing itself
            having no bias about quietness. The push toward quiescence belongs to the <em>gate</em> (only live
            cells get overwritten), not to the variation mechanism. And the polyculture isn't a lattice-size
            accident either: the plateau holds at every size tested and grows sublinearly with the ring
            (median 10 / 21.5 / 36.5 / 63 / 96.5 distinct rules at n = 50&ndash;800, log-log slope &asymp; 0.8,
            each verified flat out to 1,600 steps) &mdash; bigger worlds sustain more rules, but proportionally
            fewer. Nor is it a 1D artifact: per-cell <em>Life-like</em> rules on a 2D torus (9-bit born/survive
            masks, live cells copying their west neighbor's rule) reproduce the whole phenomenon &mdash; a
            perfectly monotone survival gradient (1.00 at born-popcount 0 down to 0.00 at 8&ndash;9), mean
            born-popcount drifting 4.5 &rarr; 2.6, and a stable ~283-rule polyculture on a 4,096-cell grid.
            What remains: a measured correlation rather than a proven mechanism.
          </p>
        </QuestionCard>

        <QuestionCard
          id="extended-neighborhoods"
          q="What if a rule's neighborhood could include cells from a different layer, not just adjacent cells in the same state?"
          status="suggestive" statusLabel="Suggestive — now implemented"
        >
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            Everything that composes two fields on this site &mdash; D, reversible memory, Comparison, Coupling
            &mdash; computes each field independently, then XORs the finished results: <strong>post-hoc
            composition</strong>. The proposal here was <strong>pre-hoc composition</strong>: let the rule's own
            lookup table take a fourth binary input, before &phi; is ever evaluated. That's now implemented
            (<code className="gc-code">src/groovy/prehoc.py</code>, mirrored in the site engine), and the first
            thing implementation forced was a decomposition that makes the whole space legible: a 16-entry table
            <em> is</em> an ordered pair of elementary rules &mdash; the 4th input just selects, per cell, per step,
            which of the two applies. So the 65,536 4-input rules are exactly the 256&times;256 ordered rule pairs,
            and only 512 of them (0.8%) are &ldquo;separable&rdquo; &mdash; expressible as post-hoc XOR composition.
            Almost the entire space is unreachable by the old move.
          </p>
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '0 0 1rem' }}>
            <strong style={{ color: 'var(--ink)' }}>A collapse theorem came out of it, too</strong> &mdash; and it
            kills the two most natural candidate inputs. If the 4th input is any same-time, radius-1 function of the
            same state, the 4-input rule provably collapses back into a plain elementary rule. Both proposed inputs
            are of that form: the absential field <em>is</em> elementary rule 50, and D(&middot;,&psi;) is elementary
            rule &psi;&nbsp;&oplus;&nbsp;204. Feeding a rule its own derivative or its own absential field as a
            fourth neighbor buys nothing new. Escaping the collapse requires the input to come from another{' '}
            <em>time</em> (memory) or another <em>trajectory</em> &mdash; which is why the experiment below couples
            two layers, each reading the other as its fourth input.
          </p>
          <PrehocHistogram />
          <p style={{ fontSize: '0.92rem', color: 'var(--ink-soft)', margin: '1.1rem 0 1rem' }}>
            Random pre-hoc couplings occupy the entire behavioral range, while the post-hoc control population
            (compute g, then XOR the other layer in) piles up as noise &mdash; three quarters of it lands at
            compressibility &ge; 0.97. And the sampling surfaced something better than a distribution: couplings
            where all four component rules are <em>boring alone</em> (every solo trajectory freezes or cycles,
            compressibility &lt; 0.10) but the coupled system is persistently structured. Live, right now, the
            real engine:
          </p>
          <PrehocDemo />
          <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: '1.1rem 0 0' }}>
            <strong style={{ color: 'var(--ink)' }}>What this says:</strong> pre-hoc composition is the more general
            mechanism, now demonstrably so &mdash; post-hoc coupling is a 0.8% sliver of the 4-input rule space, and
            the rest of that space does things the sliver doesn't, including manufacturing structure from components
            that have none ({prehocData.n_emergent} of {prehocData.samples_per_kind.toLocaleString()} random samples
            passed the strict screen; all three examples above stay structured across 20 rerolled starting states
            while their parts stay boring). That's the strongest instance this project has of a relationship
            carrying information its parts don't. Suggestive, not established: one sampling run, one coupling
            topology (mutual, symmetric), one lattice size.
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
