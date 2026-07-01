import { useEffect, useRef } from 'react';

// Decorative, non-interactive CA visuals -- no controls, just something
// alive on the page. Real interaction lives in the Explorer.

// Static, one-shot grid of space-time diagrams -- same rules as the
// Concepts page's quick-pick list, one shared random starting row, each
// rendered once in its own color. Deliberately not animated: a looping
// visual reads as decoration, a fixed grid reads as "here's the range of
// what these rules do."
export function StaticRuleGrid({ rules, size = 220, n = 90, steps = 90, seed = 3 }) {
  const canvasRefsRef = useRef(rules.map(() => ({ current: null })));

  useEffect(() => {
    let cancelled = false;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled) return;
      const s0 = engine.randomState(n, seed);
      rules.forEach((r, i) => {
        const field = engine.evolveTrajectory(s0, r.num, steps);
        const canvas = canvasRefsRef.current[i].current;
        if (canvas) engine.renderFieldToCanvas(canvas, field, r.color, '#f1ead9');
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${Math.min(size, 150)}px, ${size}px))`, gap: '1rem', justifyContent: 'center' }}>
      {rules.map((r, i) => (
        <div key={r.num}>
          <canvas className="gc-field" ref={canvasRefsRef.current[i]} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
          <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem', textAlign: 'center' }}>rule {r.num}</div>
        </div>
      ))}
    </div>
  );
}

export function AmbientCA2D({ size = 220 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled || !canvasRef.current) return;
      const n = 28;
      const maxGen = 60;
      let grid, gen;

      function restart() {
        grid = engine.randomGrid2D(n, n, 0.25);
        gen = 0;
      }
      restart();

      function tick() {
        if (cancelled) return;
        engine.renderGrid2DToCanvas(canvasRef.current, grid, '#2a2420', '#f1ead9');
        grid = engine.apply2DRule(grid, [3], [2, 3]); // Conway's Life, B3/S23
        gen++;
        if (gen >= maxGen) restart();
        timer = setTimeout(tick, 160);
      }
      tick();
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, imageRendering: 'pixelated', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--bg-alt)', display: 'block' }}
    />
  );
}
