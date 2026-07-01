import { useEffect, useRef, useState } from 'react';
import Watermark from './Watermark.jsx';
import { readSeedFromLocation } from '../lib/exploreSeed.js';

const TYPE_COLORS = {
  source: 'var(--c-source)', transform: 'var(--c-transform)',
  comparison: 'var(--c-comparison)', coupling: 'var(--c-coupling)',
};
const CANVAS_TYPE_COLORS = {
  source: 'oklch(0.72 0.1 195)', transform: 'oklch(0.72 0.14 75)',
  comparison: 'oklch(0.7 0.13 300)', coupling: 'oklch(0.7 0.13 240)',
};
const N = 100, DEFAULT_STEPS = 100;
const GRID_N = 28, MAX_GEN_2D = 40;

const LIFE_PRESETS = [
  { name: "Conway's Life", born: [3], survive: [2, 3] },
  { name: 'HighLife', born: [3, 6], survive: [2, 3] },
  { name: 'Seeds', born: [2], survive: [] },
  { name: 'Day & Night', born: [3, 6, 7, 8], survive: [3, 4, 6, 7, 8] },
];
function bsLabel(born, survive) {
  return 'B' + born.slice().sort((a, b) => a - b).join('') + '/S' + survive.slice().sort((a, b) => a - b).join('');
}

const CARD_COLORS = [
  { key: 'cream', css: 'oklch(0.94 0.02 90)' },
  { key: 'teal', css: 'oklch(0.72 0.1 195)' },
  { key: 'amber', css: 'oklch(0.72 0.14 75)' },
  { key: 'purple', css: 'oklch(0.7 0.13 300)' },
  { key: 'blue', css: 'oklch(0.7 0.13 240)' },
  { key: 'green', css: 'oklch(0.7 0.13 150)' },
  { key: 'red', css: 'oklch(0.66 0.15 22)' },
];
function randomCardColor() {
  const pool = CARD_COLORS.slice(1);
  return pool[Math.floor(Math.random() * pool.length)].css;
}

function centerSeedIC(n) {
  const arr = new Array(n).fill(0);
  arr[Math.floor(n / 2)] = 1;
  return arr;
}

// Pre-seeded cards handed in via ?seed=... (see lib/exploreSeed.js) --
// lets a fixed worked example on Concepts drop straight into the real,
// editable tool already loaded with equivalent cards. Falls back to the
// same single default source card as always when there's no seed.
function buildInitialCards() {
  const seed = readSeedFromLocation();
  if (seed) {
    const configs = {};
    seed.cards.forEach((c) => { configs[c.id] = { ...c, color: c.color || CANVAS_TYPE_COLORS[c.type] }; });
    return { configs, order: seed.cards.map((c) => c.id), mode: seed.mode || '1d' };
  }
  return {
    configs: { 1: { id: 1, type: 'source', dim: '1d', rule: 110, ic: centerSeedIC(N), steps: DEFAULT_STEPS, color: CARD_COLORS[0].css } },
    order: [1],
    mode: '1d',
  };
}

const NAV_PAGES = [
  { href: 'index.html', label: 'Home' },
  { href: 'concepts.html', label: 'Concepts' },
  { href: 'questions.html', label: 'Questions' },
  { href: 'explorer.html', label: 'Explorer', active: true },
];

export default function Explorer() {
  // configs/fields live in refs, not React state -- they're not
  // serializable/diffable in a way React needs to re-render on; state just
  // tracks the thin "what's selected / what's the UI doing" layer plus a
  // version counter that forces a re-render whenever the ref data changes.
  const initialRef = useRef(null);
  if (initialRef.current === null) initialRef.current = buildInitialCards();
  const initial = initialRef.current;

  const cardConfigsRef = useRef(initial.configs);
  const fieldsRef = useRef({});
  const canvasRefsRef = useRef(Object.fromEntries(initial.order.map((id) => [id, { current: null }])));
  const engineRef = useRef(null);
  const playTimerRef = useRef(null);

  const [engineReady, setEngineReady] = useState(false);
  const [version, setVersion] = useState(0);
  const [mode, setModeState] = useState(initial.mode);
  const [gen2D, setGen2D] = useState(0);
  const [playing2D, setPlaying2D] = useState(false);
  const [order, setOrder] = useState(initial.order);
  const [selected, setSelected] = useState(() => Object.fromEntries(initial.order.map((id) => [id, true])));
  const [layoutMode, setLayoutMode] = useState('side');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalFrom, setModalFromState] = useState(null);
  const [modalFromB, setModalFromBState] = useState(null);
  const [modalOp, setModalOp] = useState('raw');
  const [modalRule, setModalRuleState] = useState(110);
  const [modalRuleB, setModalRuleBState] = useState(30);
  const [modalIcSource, setModalIcSourceState] = useState('fresh');
  const [modalIC, setModalIC] = useState(centerSeedIC(N));
  const [modalColor, setModalColor] = useState(CARD_COLORS[1].css);
  const [modalBorn, setModalBorn] = useState([3]);
  const [modalSurvive, setModalSurvive] = useState([2, 3]);
  const [modalBornB, setModalBornB] = useState([3, 6]);
  const [modalSurviveB, setModalSurviveB] = useState([2, 3]);
  const [modalIC2DPreset, setModalIC2DPreset] = useState('random');
  const [modalIC2D, setModalIC2D] = useState(null);
  const [editingCardId, setEditingCardId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const cardConfigs = cardConfigsRef.current;
  const fields = fieldsRef.current;

  function touch() { setVersion((v) => v + 1); }
  function getRef(id) {
    if (!canvasRefsRef.current[id]) canvasRefsRef.current[id] = { current: null };
    return canvasRefsRef.current[id];
  }

  // ---- data model ----
  function builtFromOf(id) {
    const c = cardConfigs[id];
    if (!c) return [];
    if (c.type === 'transform') return [c.from];
    if (c.type === 'comparison') return [c.from, c.fromB];
    return [];
  }
  function dependentsOf(id) { return order.filter((oid) => builtFromOf(oid).includes(id)); }
  function transitiveDependents(id) {
    const out = [];
    const walk = (n) => { dependentsOf(n).forEach((d) => { out.push(d); walk(d); }); };
    walk(id);
    return [...new Set(out)];
  }

  function computeField(id) {
    const engine = engineRef.current;
    const c = cardConfigs[id];
    if (!c || !engine) return null;
    if (c.dim === '2d') return computeField2D(c);
    if (c.type === 'source') return engine.evolveTrajectory(Uint8Array.from(c.ic), c.rule, c.steps);
    if (c.type === 'transform') {
      const fromField = fields[c.from];
      if (!fromField) return null;
      const rule = c.rule;
      if (c.op === 'raw') return fromField;
      if (c.op === 'd') return fromField.map((row) => engine.C(row, engine.applyRule(row, rule)));
      if (c.op === 'g') return fromField.map((row) => engine.G(row, rule));
      if (c.op === 'absential') return fromField.map((row) => engine.absentialField(row));
      if (c.op === 'secondorder') return engine.runSecondOrder(fromField[0], fromField[1], rule, fromField.length - 2);
      return fromField;
    }
    if (c.type === 'comparison') {
      const fa = fields[c.from], fb = fields[c.fromB];
      if (!fa || !fb) return null;
      const steps = Math.min(fa.length, fb.length);
      const out = [];
      for (let t = 0; t < steps; t++) out.push(engine.C(fa[t], fb[t]));
      return out;
    }
    if (c.type === 'coupling') return engine.divergenceTrajectory(Uint8Array.from(c.ic), c.rule, c.ruleB, c.steps);
    return null;
  }

  function computeField2D(c) {
    const engine = engineRef.current;
    if (c.type === 'source') return engine.evolveTrajectory2D(c.ic2d, c.born, c.survive, MAX_GEN_2D);
    if (c.type === 'transform') {
      const fromField = fields[c.from];
      if (!fromField) return null;
      const { born, survive } = c;
      if (c.op === 'raw') return fromField;
      if (c.op === 'd') return fromField.map((g) => engine.D2D(g, born, survive));
      if (c.op === 'g') return fromField.map((g) => engine.G2D(g, born, survive));
      if (c.op === 'absential') return fromField.map((g) => engine.absentialField2D(g));
      if (c.op === 'secondorder') return engine.runSecondOrder2D(fromField[0], fromField[1], born, survive, fromField.length - 2);
      return fromField;
    }
    if (c.type === 'comparison') {
      const fa = fields[c.from], fb = fields[c.fromB];
      if (!fa || !fb) return null;
      const steps = Math.min(fa.length, fb.length);
      const out = [];
      for (let t = 0; t < steps; t++) out.push(engine.C2D(fa[t], fb[t]));
      return out;
    }
    if (c.type === 'coupling') return engine.divergenceTrajectory2D(c.ic2d, { born: c.born, survive: c.survive }, { born: c.bornB, survive: c.surviveB }, MAX_GEN_2D);
    return null;
  }

  function recomputeCard(id) {
    fields[id] = computeField(id);
    dependentsOf(id).forEach((d) => recomputeCard(d));
  }
  function updateCardConfig(id, patch) {
    cardConfigs[id] = { ...cardConfigs[id], ...patch };
    recomputeCard(id);
    touch();
  }

  function metaFor(id) {
    const c = cardConfigs[id];
    if (!c) return null;
    if (c.dim === '2d') return metaFor2D(c);
    if (c.type === 'source') return { title: 'Rule ' + c.rule + ', raw', desc: '1D, ' + c.steps + ' steps from the row below.' };
    if (c.type === 'transform') {
      const opLabel = { raw: 'Raw (identity)', d: 'D (derivative)', g: 'G (commutator)', absential: 'Absential field', secondorder: 'Second-order' }[c.op];
      const fromRule = cardConfigs[c.from] && cardConfigs[c.from].rule;
      let desc;
      if (c.op === 'raw') desc = 'Passed through unchanged from C' + c.from + '.';
      else if (c.op === 'absential') desc = 'Off-but-adjacent cells of C' + c.from + ', step by step.';
      else desc = 'C' + c.from + ' reinterpreted as a fresh CA state, under rule ' + c.rule +
        (fromRule != null && fromRule === c.rule ? ' — same rule as C' + c.from + '.' : '.');
      return { title: opLabel + ' of C' + c.from, desc };
    }
    if (c.type === 'comparison') return { title: 'C' + c.from + ' vs C' + c.fromB, desc: 'XOR of C' + c.from + ' and C' + c.fromB + ', step by step.' };
    if (c.type === 'coupling') return { title: 'Rule ' + c.rule + ' ↔ Rule ' + c.ruleB, desc: 'Cross-rule divergence, rule ' + c.rule + ' vs rule ' + c.ruleB + '.' };
    return { title: '?', desc: '' };
  }
  function metaFor2D(c) {
    if (c.type === 'source') return { title: bsLabel(c.born, c.survive) + ', raw', desc: '2D, ' + GRID_N + '×' + GRID_N + ', Moore neighborhood.' };
    if (c.type === 'transform') {
      const opLabel = { raw: 'Raw (identity)', d: 'D (derivative)', g: 'G (commutator)', absential: 'Absential field', secondorder: 'Second-order' }[c.op];
      let desc;
      if (c.op === 'raw') desc = 'Passed through unchanged from C' + c.from + '.';
      else if (c.op === 'absential') desc = 'Off-but-Moore-adjacent cells of C' + c.from + ', per generation.';
      else desc = 'C' + c.from + ' reinterpreted as a fresh grid, under ' + bsLabel(c.born, c.survive) + '.';
      return { title: opLabel + ' of C' + c.from, desc };
    }
    if (c.type === 'comparison') return { title: 'C' + c.from + ' vs C' + c.fromB, desc: 'XOR of C' + c.from + ' and C' + c.fromB + ', per generation.' };
    if (c.type === 'coupling') return { title: bsLabel(c.born, c.survive) + ' ↔ ' + bsLabel(c.bornB, c.surviveB), desc: 'Cross-rule divergence, 2D, shared starting grid.' };
    return { title: '?', desc: '' };
  }

  function colorForCard(id) { return cardConfigs[id].color || CANVAS_TYPE_COLORS[cardConfigs[id].type]; }

  function drawCard(id) {
    const ref = canvasRefsRef.current[id];
    const field = fields[id];
    const engine = engineRef.current;
    if (!ref || !ref.current || !field || !engine) return;
    const color = colorForCard(id);
    const c = cardConfigs[id];
    if (c.dim === '2d') {
      const gen = Math.min(gen2D, field.length - 1);
      const grid = field[gen];
      if (grid) engine.renderGrid2DToCanvas(ref.current, grid, color, '#2c2620');
      return;
    }
    const selCount = Object.keys(selected).filter((k) => selected[k]).length;
    if (layoutMode === 'super' && selCount > 1) engine.renderFieldToCanvasTransparent(ref.current, field, color);
    else engine.renderFieldToCanvas(ref.current, field, color, '#2c2620');
  }

  // ---- mount ----
  useEffect(() => {
    import('../lib/groovy-engine.js').then((engine) => {
      engineRef.current = engine;
      setEngineReady(true);
      // sources/couplings first (no upstream deps), then anything that
      // reads from them -- correct for the depth-1 chains real seeds use.
      const ids = initial.order;
      const sources = ids.filter((id) => ['source', 'coupling'].includes(cardConfigs[id].type));
      const rest = ids.filter((id) => !['source', 'coupling'].includes(cardConfigs[id].type));
      [...sources, ...rest].forEach((id) => { fields[id] = computeField(id); });
      touch();
    });
    return () => { if (playTimerRef.current) clearInterval(playTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- redraw selected cards after every render ----
  useEffect(() => {
    if (!engineRef.current) return;
    Object.keys(selected).map(Number).forEach((id) => {
      if (selected[id] && cardConfigs[id]) drawCard(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // ---- 2D mode + playback ----
  function setMode(m) {
    const idsInMode = order.filter((id) => (cardConfigs[id].dim || '1d') === m);
    const sel = {};
    if (idsInMode.length) sel[idsInMode[0]] = true;
    setModeState(m);
    setSelected(sel);
    setGen2D(0);
    setPlaying2D(false);
  }
  function stepGen2D(delta) { setGen2D((g) => Math.max(0, Math.min(MAX_GEN_2D - 1, g + delta))); }
  function togglePlay2D() {
    const willPlay = !playing2D;
    setPlaying2D(willPlay);
    if (willPlay) {
      playTimerRef.current = setInterval(() => {
        setGen2D((g) => {
          const next = g + 1;
          if (next >= MAX_GEN_2D) { clearInterval(playTimerRef.current); setPlaying2D(false); return 0; }
          return next;
        });
      }, 220);
    } else if (playTimerRef.current) clearInterval(playTimerRef.current);
  }
  function resetGen2D() {
    if (playTimerRef.current) clearInterval(playTimerRef.current);
    setGen2D(0);
    setPlaying2D(false);
  }

  // ---- selection / layout ----
  function toggleSelect(id) { setSelected((s) => ({ ...s, [id]: !s[id] })); }
  function addSelect(id) { setSelected((s) => ({ ...s, [id]: true })); }

  // ---- delete ----
  function confirmDelete() {
    const id = deleteTarget;
    const doomed = [id, ...transitiveDependents(id)];
    doomed.forEach((d) => { delete cardConfigs[d]; delete fields[d]; delete canvasRefsRef.current[d]; });
    setOrder((prevOrder) => {
      const newOrder = prevOrder.filter((oid) => !doomed.includes(oid));
      setSelected((s) => {
        const sel = { ...s };
        doomed.forEach((d) => delete sel[d]);
        if (Object.keys(sel).filter((k) => sel[k]).length === 0 && newOrder.length) sel[newOrder[0]] = true;
        return sel;
      });
      return newOrder;
    });
    setDeleteTarget(null);
  }

  // ---- modal-time IC editing (source cards only) ----
  function toggleModalICCell(i) {
    setModalIC((ic) => { const arr = ic.slice(); arr[i] = arr[i] ? 0 : 1; return arr; });
  }
  function randomizeModalIC() {
    setModalIC(Array.from({ length: N }, () => (Math.random() < 0.5 ? 0 : 1)));
  }

  // ---- modal ----
  function openModal() {
    const ids = order.filter((id) => (cardConfigs[id].dim || '1d') === mode);
    setModalOpen(true); setModalType(null); setEditingCardId(null);
    setModalFromState(ids[0] || null); setModalFromBState(ids[1] || ids[0] || null);
    setModalOp('raw'); setModalRuleState(110); setModalRuleBState(30); setModalIcSourceState('fresh');
    setModalIC(centerSeedIC(N));
    setModalBorn([3]); setModalSurvive([2, 3]); setModalBornB([3, 6]); setModalSurviveB([2, 3]);
    setModalIC2DPreset('random');
    setModalIC2D(engineRef.current ? engineRef.current.randomGrid2D(GRID_N, GRID_N) : null);
  }
  function openEditModal(id) {
    const c = cardConfigs[id];
    setModalOpen(true); setEditingCardId(id); setModalType(c.type);
    setModalFromState(c.from != null ? c.from : order[0]);
    setModalFromBState(c.fromB != null ? c.fromB : order[0]);
    setModalOp(c.op || 'raw');
    setModalRuleState(c.dim === '2d' ? 110 : (c.rule != null ? c.rule : 110));
    setModalRuleBState(c.dim === '2d' ? 30 : (c.ruleB != null ? c.ruleB : 30));
    setModalIcSourceState('fresh');
    setModalIC(c.ic ? c.ic.slice() : centerSeedIC(N));
    setModalColor(c.color || randomCardColor());
    setModalBorn(c.born ? c.born.slice() : [3]);
    setModalSurvive(c.survive ? c.survive.slice() : [2, 3]);
    setModalBornB(c.bornB ? c.bornB.slice() : [3, 6]);
    setModalSurviveB(c.surviveB ? c.surviveB.slice() : [2, 3]);
  }
  function closeModal() { setModalOpen(false); setModalType(null); setEditingCardId(null); }
  function chooseModalType(type) { setModalType(type); setModalColor(randomCardColor()); }

  function toggleModalDigit(which, n) {
    const setters = { modalBorn: [modalBorn, setModalBorn], modalSurvive: [modalSurvive, setModalSurvive], modalBornB: [modalBornB, setModalBornB], modalSurviveB: [modalSurviveB, setModalSurviveB] };
    const [arrVal, setter] = setters[which];
    const arr = arrVal.slice();
    const i = arr.indexOf(n);
    if (i >= 0) arr.splice(i, 1); else arr.push(n);
    setter(arr);
  }
  function applyLifePreset(preset, which) {
    if (which === 'A') { setModalBorn(preset.born.slice()); setModalSurvive(preset.survive.slice()); }
    else { setModalBornB(preset.born.slice()); setModalSurviveB(preset.survive.slice()); }
  }
  function setModalIC2DPresetFn(kind) {
    let ic2d;
    if (kind === 'empty') ic2d = engineRef.current.emptyGrid2D(GRID_N, GRID_N);
    else if (kind === 'glider') ic2d = engineRef.current.gliderGrid2D(GRID_N, GRID_N);
    else ic2d = engineRef.current.randomGrid2D(GRID_N, GRID_N);
    setModalIC2DPreset(kind);
    setModalIC2D(ic2d);
  }
  function toggleModalIC2DCell(r, c) {
    setModalIC2D((grid) => { const g = grid.map((row) => row.slice()); g[r][c] = g[r][c] ? 0 : 1; return g; });
  }
  function setModalFrom(e) {
    const n = Number(e.target.value);
    const upstream = cardConfigs[n];
    setModalFromState(n);
    if (upstream && upstream.rule != null) setModalRuleState(upstream.rule);
  }
  function setModalFromB(e) { setModalFromBState(Number(e.target.value)); }
  function setModalRule(e) { setModalRuleState(Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0))); }
  function setModalRuleB(e) { setModalRuleBState(Math.max(0, Math.min(255, parseInt(e.target.value, 10) || 0))); }
  function setModalIcSource(e) { setModalIcSourceState(e.target.value); }

  function createCard() {
    const engine = engineRef.current;
    if (!engine || !modalType) return;
    const type = modalType;
    const editId = editingCardId;
    const dim = mode;

    if (editId != null) {
      let patch;
      if (dim === '2d') {
        if (type === 'source') patch = { born: modalBorn.slice(), survive: modalSurvive.slice() };
        else if (type === 'transform') patch = { from: modalFrom, op: modalOp, born: modalBorn.slice(), survive: modalSurvive.slice() };
        else if (type === 'comparison') { if (modalFrom === modalFromB) return; patch = { from: modalFrom, fromB: modalFromB }; }
        else if (type === 'coupling') patch = { born: modalBorn.slice(), survive: modalSurvive.slice(), bornB: modalBornB.slice(), surviveB: modalSurviveB.slice() };
        else return;
      } else {
        if (type === 'source') patch = { rule: modalRule };
        else if (type === 'transform') patch = { from: modalFrom, op: modalOp, rule: modalRule };
        else if (type === 'comparison') { if (modalFrom === modalFromB) return; patch = { from: modalFrom, fromB: modalFromB }; }
        else if (type === 'coupling') patch = { rule: modalRule, ruleB: modalRuleB };
        else return;
      }
      patch.color = modalColor;
      updateCardConfig(editId, patch);
      setModalOpen(false); setModalType(null); setEditingCardId(null);
      return;
    }

    const id = Math.max(0, ...order, 0) + 1;
    let config;
    if (dim === '2d') {
      if (type === 'source') config = { id, type, dim, born: modalBorn.slice(), survive: modalSurvive.slice(), ic2d: modalIC2D };
      else if (type === 'transform') config = { id, type, dim, from: modalFrom, op: modalOp, born: modalBorn.slice(), survive: modalSurvive.slice() };
      else if (type === 'comparison') { if (modalFrom === modalFromB) return; config = { id, type, dim, from: modalFrom, fromB: modalFromB }; }
      else if (type === 'coupling') {
        let ic2d;
        if (modalIcSource === 'fresh') ic2d = engine.randomGrid2D(GRID_N, GRID_N);
        else ic2d = cardConfigs[Number(modalIcSource)].ic2d.map((row) => row.slice());
        config = { id, type, dim, born: modalBorn.slice(), survive: modalSurvive.slice(), bornB: modalBornB.slice(), surviveB: modalSurviveB.slice(), ic2d };
      } else return;
    } else {
      if (type === 'source') config = { id, type, dim, rule: modalRule, ic: modalIC.slice(), steps: DEFAULT_STEPS };
      else if (type === 'transform') config = { id, type, dim, from: modalFrom, op: modalOp, rule: modalRule };
      else if (type === 'comparison') { if (modalFrom === modalFromB) return; config = { id, type, dim, from: modalFrom, fromB: modalFromB }; }
      else if (type === 'coupling') {
        let ic;
        if (modalIcSource === 'fresh') ic = Array.from({ length: N }, () => (Math.random() < 0.5 ? 0 : 1));
        else ic = cardConfigs[Number(modalIcSource)].ic.slice();
        config = { id, type, dim, rule: modalRule, ruleB: modalRuleB, ic, steps: DEFAULT_STEPS };
      } else return;
    }

    config.color = modalColor;
    cardConfigs[id] = config;
    getRef(id);
    recomputeCard(id);
    setOrder((o) => [...o, id]);
    setSelected((s) => ({ ...s, [id]: true }));
    setModalOpen(false); setModalType(null);
  }

  // =====================================================================
  // derived display data (recomputed each render, cheap)
  // =====================================================================
  const selectedIds = order.filter((id) => selected[id] && (cardConfigs[id].dim || '1d') === mode);
  const isSide = layoutMode !== 'side' ? false : true;
  const isSuper = layoutMode === 'super';
  const is2D = mode === '2d';
  const modeIds = order.filter((id) => (cardConfigs[id].dim || '1d') === mode);
  const isSingle = selectedIds.length === 1;

  const typeBgMap = {
    source: 'color-mix(in oklch, var(--c-source) 25%, transparent)',
    transform: 'color-mix(in oklch, var(--c-transform) 25%, transparent)',
    comparison: 'color-mix(in oklch, var(--c-comparison) 25%, transparent)',
    coupling: 'color-mix(in oklch, var(--c-coupling) 25%, transparent)',
  };

  const cardOptions = modeIds.map((id) => ({ value: id, label: 'C' + id + ': ' + metaFor(id).title }));
  const sourceCardOptions = modeIds.filter((id) => cardConfigs[id].type === 'source' || cardConfigs[id].type === 'coupling')
    .map((id) => ({ value: String(id), label: 'C' + id }));

  const opDefs = [
    { key: 'raw', label: 'Raw' }, { key: 'd', label: 'D' }, { key: 'g', label: 'G' },
    { key: 'absential', label: 'Absential' }, { key: 'secondorder', label: '2nd-order' },
  ];
  const opNeedsRule = ['d', 'g', 'secondorder'].includes(modalOp);
  const fromMetaForHelper = modalFrom != null ? cardConfigs[modalFrom] : null;
  const ruleAutoFilled = fromMetaForHelper && fromMetaForHelper.rule != null && fromMetaForHelper.rule === modalRule;
  const opHelperText = {
    raw: 'Passes the input through unchanged — useful for comparing "before" and "after" side by side.',
    d: 'S ⊕ φ(S) of the input, under the rule below.' + (ruleAutoFilled ? ' Auto-filled from C' + modalFrom + ' — D of a D with the same rule is exactly the second derivative.' : ' Change it to reinterpret the input under a different rule.'),
    g: 'The Groovy Commutator of the input, under the rule below.',
    absential: 'Off-but-adjacent cells of the input, at each step. No rule needed.',
    secondorder: "The input reinterpreted via the chosen rule's reversible recurrence, seeded from its first two rows.",
  }[modalOp];

  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const bsLabelA = bsLabel(modalBorn, modalSurvive);
  const bsLabelB = bsLabel(modalBornB, modalSurviveB);
  const modalIC2DCells = modalIC2D ? modalIC2D.flatMap((row, r) => Array.from(row).map((bit, c) => ({ r, c, bit }))) : [];
  const maxGenIdx = MAX_GEN_2D - 1;
  const deleteDeps = deleteTarget != null ? transitiveDependents(deleteTarget) : [];

  function digitBtnStyle(arr, n) {
    const active = arr.includes(n);
    return { width: 22, height: 22, borderRadius: 4, cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', fontWeight: 700, border: '1px solid ' + (active ? 'var(--accent)' : 'var(--rule)'), background: active ? 'var(--accent)' : 'none', color: active ? '#1b1714' : 'var(--ink-soft)' };
  }
  function typeCardBtnStyle(t) {
    return { flex: 1, minWidth: 110, textAlign: 'left', padding: 10, borderRadius: 8, cursor: 'pointer', border: '1.5px solid ' + (modalType === t ? TYPE_COLORS[t] : 'var(--rule)'), background: modalType === t ? `color-mix(in oklch, ${TYPE_COLORS[t]} 16%, transparent)` : 'var(--inset)' };
  }
  function ic2dPresetBtnStyle(kind) {
    const active = modalIC2DPreset === kind;
    return { fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', fontWeight: 700, padding: '4px 8px', borderRadius: 5, cursor: 'pointer', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--rule)'), background: active ? 'color-mix(in oklch, var(--accent) 20%, transparent)' : 'none', color: active ? 'var(--accent)' : 'var(--ink-soft)' };
  }
  function opBtnStyle(key) {
    const active = modalOp === key;
    return { fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', fontWeight: 700, padding: '4px 7px', borderRadius: 5, cursor: 'pointer', border: '1px solid ' + (active ? 'var(--c-transform)' : 'var(--rule)'), background: active ? 'color-mix(in oklch, var(--c-transform) 20%, transparent)' : 'none', color: active ? 'var(--c-transform)' : 'var(--ink-soft)' };
  }

  const soloId = isSingle ? selectedIds[0] : null;
  const soloConfig = soloId != null ? cardConfigs[soloId] : null;
  const soloMeta = soloId != null ? metaFor(soloId) : null;
  const soloBuiltFrom = soloId != null ? builtFromOf(soloId).filter((x) => x != null) : [];
  const soloUsedBy = soloId != null ? dependentsOf(soloId) : [];
  const soloIsConfigurable = soloConfig ? (soloConfig.rule != null || soloConfig.ruleB != null || soloConfig.born != null || soloConfig.type === 'transform' || soloConfig.type === 'comparison') : false;

  const multiPanels = (!isSingle && !isSuper) ? selectedIds.map((id) => ({ id, c: cardConfigs[id], meta: metaFor(id) })) : [];
  const superSelected = (!isSingle && isSuper) ? selectedIds : [];

  return (
    <div className="ex-root">
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(27,23,20,0.92)', backdropFilter: 'blur(6px)', borderBottom: '1px solid var(--rule)' }}>
        <nav style={{ maxWidth: 1120, margin: '0 auto', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
          <a href="index.html" style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.01em', fontFamily: "'Lora',serif" }}>Groovy Commutator</a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.3rem' }}>
            {NAV_PAGES.map((p) => (
              <a key={p.href} href={p.href} style={{ textDecoration: 'none', color: p.active ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: 600, fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '.04em', paddingBottom: 3, borderBottom: '2px solid ' + (p.active ? 'var(--accent)' : 'transparent') }}>{p.label}</a>
            ))}
          </div>
        </nav>
      </header>

      <Watermark title="AI-written prose, fully live math" maxWidth={1120}>
        {' '}The writing here was generated by an LLM. Every card below is computed live in your browser from the real{' '}
        <code>groovy</code> math, reimplemented from the <a href="https://github.com/mbilokonsky/groovy-commutator">Python source</a>{' '}
        &mdash; nothing is precomputed or faked.
      </Watermark>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '1.8rem 1.25rem 4rem' }}>
        <div style={{ textTransform: 'uppercase', letterSpacing: '.09em', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.5em' }}>explorer</div>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(1.7rem,4.5vw,2.2rem)', lineHeight: 1.25, margin: '0 0 0.5em', fontWeight: 600, color: 'var(--ink)' }}>
          Build and run the instruments yourself
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--ink-soft)', margin: '0 0 1.6em', maxWidth: '70ch' }}>
          Every instrument here is <a href="concepts.html#state" style={{ color: 'var(--accent)' }}>State &rarr; State</a>:
          a card takes one or more inputs, applies one operation, and produces a new field of the same shape &mdash;
          which can itself feed another card, at any depth. New here?{' '}
          <a href="concepts.html" style={{ color: 'var(--accent)' }}>Concepts</a> builds the vocabulary one piece at a time first.
        </p>

        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setMode('1d')} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, padding: '6px 14px', borderRadius: '6px 0 0 6px', cursor: 'pointer', border: '1px solid var(--rule)', background: !is2D ? 'var(--accent)' : 'none', color: !is2D ? '#1b1714' : 'var(--ink-soft)' }}>1D</button>
          <button onClick={() => setMode('2d')} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, padding: '6px 14px', borderRadius: '0 6px 6px 0', cursor: 'pointer', border: '1px solid var(--rule)', borderLeft: 'none', background: is2D ? 'var(--accent)' : 'none', color: is2D ? '#1b1714' : 'var(--ink-soft)' }}>2D</button>
        </div>

        <div className="ex-shell" style={{ display: 'flex', border: '1px solid var(--rule)', borderRadius: 10, overflow: 'hidden', background: 'var(--panel)', minHeight: 480 }}>
          <div className="ex-rail" style={{ width: 170, flex: 'none', borderRight: '1px solid var(--rule)', padding: '12px 8px', overflowY: 'auto' }}>
            <div style={{ fontSize: 9, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', padding: '0 4px 8px' }}>cards &mdash; click to compare</div>
            {modeIds.map((id) => {
              const meta = metaFor(id);
              const isSel = !!selected[id];
              const color = colorForCard(id);
              return (
                <button key={id} onClick={() => toggleSelect(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', background: isSel ? 'rgba(255,255,255,0.06)' : 'transparent', border: 'none', borderRadius: 5, padding: '7px 8px', marginBottom: 5, cursor: 'pointer', fontFamily: "'IBM Plex Mono',monospace" }}>
                  <span style={{ flex: 'none', color: isSel ? color : 'var(--ink-soft)' }}>
                    {isSel ? (
                      <svg viewBox="0 0 24 24" width="13" height="13" style={{ display: 'block' }}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" width="13" height="13" style={{ display: 'block' }}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" fill="none" stroke="currentColor" strokeWidth="2" /><line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" strokeWidth="2" /></svg>
                    )}
                  </span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--ink)' }}>C{id}</span>
                  <span style={{ fontSize: '9.5px', color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.title}</span>
                </button>
              );
            })}
            <button className="ex-btn ex-add" onClick={openModal} style={{ width: '100%', marginTop: 4, padding: 8, background: 'none', border: '1px dashed var(--accent)', color: 'var(--accent)' }}>+ add card</button>
          </div>

          <div style={{ flex: 1, padding: 16, overflow: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 9, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                {selectedIds.length === 0 ? 'nothing selected' : (selectedIds.length === 1 ? 'viewing C' + selectedIds[0] : selectedIds.length + ' cards compared')}
              </span>
              <div>
                <button onClick={() => setLayoutMode('side')} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', fontWeight: 700, padding: '5px 10px', borderRadius: '5px 0 0 5px', cursor: 'pointer', border: '1px solid var(--rule)', background: !isSuper ? 'var(--accent)' : 'none', color: !isSuper ? '#1b1714' : 'var(--ink-soft)' }}>side by side</button>
                <button onClick={() => setLayoutMode('super')} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', fontWeight: 700, padding: '5px 10px', borderRadius: '0 5px 5px 0', cursor: 'pointer', border: '1px solid var(--rule)', borderLeft: 'none', background: isSuper ? 'var(--accent)' : 'none', color: isSuper ? '#1b1714' : 'var(--ink-soft)' }}>superimposed</button>
              </div>
            </div>

            {is2D && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 8, padding: '8px 10px' }}>
                <button onClick={() => stepGen2D(-1)} style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-soft)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', padding: '4px 9px', borderRadius: 5, cursor: 'pointer' }}>&#8592;</button>
                <button onClick={togglePlay2D} style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: '#1b1714', fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: 5, cursor: 'pointer' }}>{playing2D ? 'pause' : 'play'}</button>
                <button onClick={() => stepGen2D(1)} style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-soft)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', padding: '4px 9px', borderRadius: 5, cursor: 'pointer' }}>&#8594;</button>
                <button onClick={resetGen2D} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}>reset</button>
                <span style={{ fontSize: 10, color: 'var(--ink-soft)', marginLeft: 'auto' }}>gen {gen2D} / {maxGenIdx}</span>
              </div>
            )}

            {isSingle && soloConfig && (
              <div style={{ maxWidth: 520 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span className="ex-cid">C{soloId}</span>
                  <span className="ex-typechip" style={{ background: typeBgMap[soloConfig.type], color: TYPE_COLORS[soloConfig.type] }}>{soloConfig.type}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {soloIsConfigurable && <button onClick={() => openEditModal(soloId)} style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>edit</button>}
                    <button onClick={() => setDeleteTarget(soloId)} style={{ background: 'none', border: '1px solid var(--rule)', color: 'var(--ink-soft)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', padding: '3px 8px', borderRadius: 5, cursor: 'pointer' }}>delete</button>
                  </span>
                </div>
                <h3 style={{ margin: '0 0 10px', fontFamily: "'Lora',serif", fontSize: 16, color: 'var(--ink)' }}>{soloMeta.title}</h3>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 12 }}>
                  <canvas className="ex-field" ref={getRef(soloId)} style={{ width: 220, height: 220, background: 'var(--inset)', borderRadius: 6, flex: 'none' }}></canvas>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <p style={{ fontSize: '11.5px', color: 'var(--ink-soft)', margin: '0 0 10px' }}>{soloMeta.desc}</p>
                    <div style={{ fontSize: 10, color: 'var(--ink-soft)', marginBottom: 4 }}>
                      built from:{' '}
                      {soloBuiltFrom.length === 0
                        ? <span>nothing &mdash; this is a source</span>
                        : soloBuiltFrom.map((n) => (
                          <button key={n} onClick={() => addSelect(n)} style={{ background: 'none', border: 'none', color: TYPE_COLORS[cardConfigs[n].type], fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: '0 2px' }}>C{n}</button>
                        ))}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink-soft)' }}>
                      used by:{' '}
                      {soloUsedBy.length === 0
                        ? <span>nothing yet</span>
                        : soloUsedBy.map((n) => (
                          <button key={n} onClick={() => addSelect(n)} style={{ background: 'none', border: 'none', color: TYPE_COLORS[cardConfigs[n].type], fontFamily: "'IBM Plex Mono',monospace", fontSize: '10px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: '0 2px' }}>C{n}</button>
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isSingle && !isSuper && selectedIds.length > 0 && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {multiPanels.map((p) => {
                  const isConfigurable = p.c.rule != null || p.c.ruleB != null || p.c.born != null || p.c.type === 'transform' || p.c.type === 'comparison';
                  return (
                    <div key={p.id} style={{ width: 170, border: '1px solid var(--rule)', borderRadius: 8, background: 'var(--inset)', overflow: 'hidden', flex: 'none' }}>
                      <div style={{ padding: '7px 8px', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span className="ex-cid">C{p.id}</span>
                        <span className="ex-typechip" style={{ background: typeBgMap[p.c.type], color: TYPE_COLORS[p.c.type] }}>{p.c.type}</span>
                        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                          {isConfigurable && <button onClick={() => openEditModal(p.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', padding: 0, cursor: 'pointer' }}><svg viewBox="0 0 24 24" width="12" height="12" style={{ display: 'block' }}><path d="M4 20l1-4.5L15.5 5l3 3L8 18.5 4 20z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg></button>}
                          <button onClick={() => setDeleteTarget(p.id)} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', padding: 0, cursor: 'pointer' }}><svg viewBox="0 0 24 24" width="12" height="12" style={{ display: 'block' }}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
                        </span>
                      </div>
                      <canvas className="ex-field" ref={getRef(p.id)} style={{ width: 154, height: 154, background: 'var(--panel)', display: 'block', margin: '8px auto' }}></canvas>
                      <p style={{ fontSize: 10, color: 'var(--ink-soft)', margin: '0 8px 8px' }}>{p.meta.title}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {!isSingle && isSuper && selectedIds.length > 0 && (
              <>
                <div style={{ position: 'relative', width: 260, height: 260, background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 8, marginBottom: 12 }}>
                  {superSelected.map((id) => (
                    <canvas key={id} className="ex-field" ref={getRef(id)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'screen' }}></canvas>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {superSelected.map((id) => (
                    <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '10.5px', color: 'var(--ink-soft)' }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: colorForCard(id) }}></span>C{id}: {metaFor(id).title}
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedIds.length === 0 && (
              <p style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>Select one or more cards from the rail on the left, or add a new one.</p>
            )}

            {deleteTarget != null && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,6,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25, padding: 16 }}>
                <div style={{ width: '100%', maxWidth: 320, background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontFamily: "'Lora',serif", fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}>Delete C{deleteTarget}?</div>
                  <p style={{ fontSize: 11, color: 'var(--ink-soft)', margin: '0 0 12px' }}>
                    {deleteDeps.length > 0
                      ? `This will also delete ${deleteDeps.map((d) => 'C' + d).join(', ')}, which ${deleteDeps.length === 1 ? 'is' : 'are'} built from it.`
                      : 'This card has no dependents.'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => setDeleteTarget(null)} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', fontWeight: 700, padding: '6px 11px', borderRadius: 6, border: '1px solid var(--rule)', background: 'none', color: 'var(--ink-soft)', cursor: 'pointer' }}>cancel</button>
                    <button onClick={confirmDelete} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', fontWeight: 700, padding: '6px 11px', borderRadius: 6, border: '1px solid oklch(0.6 0.16 22)', background: 'oklch(0.6 0.16 22)', color: '#1b1714', cursor: 'pointer' }}>{deleteDeps.length > 0 ? 'delete all' : 'delete'}</button>
                  </div>
                </div>
              </div>
            )}

            {modalOpen && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,6,0.6)', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
                <div style={{ width: '100%', maxWidth: 400, maxHeight: '100%', overflowY: 'auto', background: 'var(--panel)', border: '1px solid var(--rule)', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontFamily: "'Lora',serif", fontSize: 15, color: 'var(--ink)' }}>{editingCardId != null ? `Edit C${editingCardId}` : 'Add a card'}</div>
                    <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--ink-soft)', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>&times;</button>
                  </div>

                  {editingCardId == null ? (
                    <>
                      <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>1. type</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        <button onClick={() => chooseModalType('source')} style={typeCardBtnStyle('source')}><div className="ex-typechip" style={{ background: 'none', color: 'var(--c-source)', padding: 0, marginBottom: 3 }}>source</div><div style={{ fontSize: '9.5px', color: 'var(--ink-soft)' }}>fresh IC + rule</div></button>
                        <button onClick={() => chooseModalType('transform')} style={typeCardBtnStyle('transform')}><div className="ex-typechip" style={{ background: 'none', color: 'var(--c-transform)', padding: 0, marginBottom: 3 }}>transform</div><div style={{ fontSize: '9.5px', color: 'var(--ink-soft)' }}>one input, row-by-row</div></button>
                        <button onClick={() => chooseModalType('comparison')} style={typeCardBtnStyle('comparison')}><div className="ex-typechip" style={{ background: 'none', color: 'var(--c-comparison)', padding: 0, marginBottom: 3 }}>comparison</div><div style={{ fontSize: '9.5px', color: 'var(--ink-soft)' }}>XOR two inputs</div></button>
                        <button onClick={() => chooseModalType('coupling')} style={typeCardBtnStyle('coupling')}><div className="ex-typechip" style={{ background: 'none', color: 'var(--c-coupling)', padding: 0, marginBottom: 3 }}>coupling</div><div style={{ fontSize: '9.5px', color: 'var(--ink-soft)' }}>two rules, shared IC</div></button>
                      </div>
                    </>
                  ) : (
                    <div className="ex-typechip" style={{ background: `color-mix(in oklch, ${TYPE_COLORS[modalType]} 22%, transparent)`, color: TYPE_COLORS[modalType], marginBottom: 14 }}>{modalType}</div>
                  )}

                  {modalType && (
                    <>
                      <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>2. configure</div>

                      {modalType === 'source' && !is2D && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 36 }}>rule</span>
                            <input type="number" min="0" max="255" value={modalRule} onChange={setModalRule} style={{ width: 64, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 4, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--inset)', color: 'var(--ink)' }} />
                          </div>
                          {editingCardId == null && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>initial row &mdash; click to toggle</span>
                                <button onClick={randomizeModalIC} style={{ background: 'none', border: '1px solid var(--accent)', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', padding: '2px 7px', borderRadius: 5, cursor: 'pointer' }}>randomize &#8635;</button>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 5, padding: 5 }}>
                                {modalIC.map((bit, i) => (
                                  <button key={i} onClick={() => toggleModalICCell(i)} style={{ width: 7, height: 7, padding: 0, border: 'none', background: bit ? '#f3ede0' : '#2c2620', cursor: 'pointer', flex: 'none' }}></button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {modalType === 'source' && is2D && (
                        <>
                          <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', marginBottom: 5 }}>presets: {LIFE_PRESETS.map((lp) => <button key={lp.name} onClick={() => applyLifePreset(lp, 'A')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', textDecoration: 'underline', cursor: 'pointer', padding: '0 3px' }}>{lp.name}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>born</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalBorn', d)} style={digitBtnStyle(modalBorn, d)}>{d}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>survive</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalSurvive', d)} style={digitBtnStyle(modalSurvive, d)}>{d}</button>)}</div>
                          <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', margin: '0 0 10px' }}>{bsLabelA}</p>
                          {editingCardId == null && (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>initial grid</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  {[['random', 'random soup'], ['empty', 'empty'], ['glider', 'glider']].map(([kind, label]) => (
                                    <button key={kind} onClick={() => setModalIC2DPresetFn(kind)} style={ic2dPresetBtnStyle(kind)}>{label}</button>
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(28,6px)', gap: 1, background: 'var(--inset)', border: '1px solid var(--rule)', borderRadius: 5, padding: 4, width: 'max-content' }}>
                                {modalIC2DCells.map((cell) => (
                                  <button key={cell.r + '-' + cell.c} onClick={() => toggleModalIC2DCell(cell.r, cell.c)} style={{ width: 6, height: 6, padding: 0, border: 'none', background: cell.bit ? '#f3ede0' : '#2c2620', cursor: 'pointer' }}></button>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                      )}

                      {modalType === 'transform' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 36 }}>from</span>
                            <select value={modalFrom ?? ''} onChange={setModalFrom} style={{ flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', padding: 4, borderRadius: 5, border: '1px solid var(--rule)', background: 'var(--inset)', color: 'var(--ink)' }}>
                              {cardOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 36 }}>op</span>
                            {opDefs.map((o) => <button key={o.key} onClick={() => setModalOp(o.key)} style={opBtnStyle(o.key)}>{o.label}</button>)}
                          </div>
                          <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', lineHeight: 1.5, margin: '0 0 8px' }}>{opHelperText}</p>
                          {!is2D && opNeedsRule && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 36 }}>rule</span>
                              <input type="number" min="0" max="255" value={modalRule} onChange={setModalRule} style={{ width: 64, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 4, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--inset)', color: 'var(--ink)' }} />
                            </div>
                          )}
                          {is2D && opNeedsRule && (
                            <>
                              <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', marginBottom: 5 }}>presets: {LIFE_PRESETS.map((lp) => <button key={lp.name} onClick={() => applyLifePreset(lp, 'A')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', textDecoration: 'underline', cursor: 'pointer', padding: '0 3px' }}>{lp.name}</button>)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>born</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalBorn', d)} style={digitBtnStyle(modalBorn, d)}>{d}</button>)}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>survive</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalSurvive', d)} style={digitBtnStyle(modalSurvive, d)}>{d}</button>)}</div>
                              <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', margin: 0 }}>{bsLabelA}</p>
                            </>
                          )}
                        </>
                      )}

                      {modalType === 'comparison' && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 16 }}>A</span>
                            <select value={modalFrom ?? ''} onChange={setModalFrom} style={{ flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', padding: 4, borderRadius: 5, border: '1px solid var(--rule)', background: 'var(--inset)', color: 'var(--ink)' }}>
                              {cardOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 16 }}>B</span>
                            <select value={modalFromB ?? ''} onChange={setModalFromB} style={{ flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', padding: 4, borderRadius: 5, border: '1px solid var(--rule)', background: 'var(--inset)', color: 'var(--ink)' }}>
                              {cardOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          {modalFrom != null && modalFrom === modalFromB && (
                            <p style={{ fontSize: '9.5px', color: 'oklch(0.7 0.13 60)', margin: '6px 0 0' }}>A and B are the same card &mdash; pick two different inputs.</p>
                          )}
                        </>
                      )}

                      {modalType === 'coupling' && !is2D && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 50 }}>rule A</span>
                            <input type="number" min="0" max="255" value={modalRule} onChange={setModalRule} style={{ width: 64, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 4, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--inset)', color: 'var(--ink)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 50 }}>rule B</span>
                            <input type="number" min="0" max="255" value={modalRuleB} onChange={setModalRuleB} style={{ width: 64, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 700, textAlign: 'center', padding: 4, borderRadius: 5, border: '1px solid var(--accent)', background: 'var(--inset)', color: 'var(--ink)' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 70 }}>shared IC</span>
                            <select value={modalIcSource} onChange={setModalIcSource} style={{ flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: '10.5px', padding: 4, borderRadius: 5, border: '1px solid var(--rule)', background: 'var(--inset)', color: 'var(--ink)' }}>
                              <option value="fresh">fresh random row</option>
                              {sourceCardOptions.map((opt) => <option key={opt.value} value={opt.value}>reuse {opt.label}</option>)}
                            </select>
                          </div>
                          <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', margin: '8px 0 0' }}>Reusing a source's IC copies its current row &mdash; not its rule.</p>
                        </>
                      )}

                      {modalType === 'coupling' && is2D && (
                        <>
                          <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', marginBottom: 5 }}>rule A presets: {LIFE_PRESETS.map((lp) => <button key={lp.name} onClick={() => applyLifePreset(lp, 'A')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', textDecoration: 'underline', cursor: 'pointer', padding: '0 3px' }}>{lp.name}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>born</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalBorn', d)} style={digitBtnStyle(modalBorn, d)}>{d}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>survive</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalSurvive', d)} style={digitBtnStyle(modalSurvive, d)}>{d}</button>)}</div>
                          <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', margin: '0 0 8px' }}>A: {bsLabelA}</p>

                          <div style={{ fontSize: '9.5px', color: 'var(--ink-soft)', marginBottom: 5 }}>rule B presets: {LIFE_PRESETS.map((lp) => <button key={lp.name} onClick={() => applyLifePreset(lp, 'B')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', textDecoration: 'underline', cursor: 'pointer', padding: '0 3px' }}>{lp.name}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>born</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalBornB', d)} style={digitBtnStyle(modalBornB, d)}>{d}</button>)}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}><span style={{ fontSize: 10, color: 'var(--ink-soft)', width: 40 }}>survive</span>{digits.map((d) => <button key={d} onClick={() => toggleModalDigit('modalSurviveB', d)} style={digitBtnStyle(modalSurviveB, d)}>{d}</button>)}</div>
                          <p style={{ fontSize: '9.5px', color: 'var(--ink-soft)', margin: '0 0 10px' }}>B: {bsLabelB}</p>

                          {editingCardId == null && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--ink-soft)' }}>shared IC</span>
                              <select value={modalIcSource} onChange={setModalIcSource} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '9.5px', padding: 3, borderRadius: 5, border: '1px solid var(--rule)', background: 'var(--inset)', color: 'var(--ink)' }}>
                                <option value="fresh">fresh random grid</option>
                                {sourceCardOptions.map((opt) => <option key={opt.value} value={opt.value}>reuse {opt.label}</option>)}
                              </select>
                            </div>
                          )}
                        </>
                      )}

                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--rule)' }}>
                        <span style={{ fontSize: 10, color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>color</span>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {CARD_COLORS.map((c) => (
                            <button key={c.key} onClick={() => setModalColor(c.css)} style={{ width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', background: c.css, border: '2px solid ' + (modalColor === c.css ? '#fff' : 'transparent'), boxShadow: '0 0 0 1px var(--rule)' }}></button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, borderTop: '1px solid var(--rule)', paddingTop: 12 }}>
                    <button onClick={closeModal} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, padding: '7px 12px', borderRadius: 6, border: '1px solid var(--rule)', background: 'none', color: 'var(--ink-soft)', cursor: 'pointer' }}>cancel</button>
                    <button onClick={createCard} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: '11px', fontWeight: 700, padding: '7px 12px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#1b1714', cursor: 'pointer' }}>{editingCardId != null ? 'save' : 'create'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--rule)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '1.6rem 1.25rem', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
          Source, library code, and full research notes live in the{' '}
          <a href="https://github.com/mbilokonsky/groovy-commutator" style={{ color: 'var(--accent)' }}>GitHub repository</a>.
        </div>
      </footer>
    </div>
  );
}
