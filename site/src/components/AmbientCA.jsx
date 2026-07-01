import { useEffect, useRef } from 'react';

// Decorative, non-interactive CA visuals -- no controls, just something
// alive on the page. Real interaction lives in the Explorer.

const RULE_CYCLE_1D = [110, 54, 30, 90, 184];

export function AmbientCA1D({ size = 420 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer;
    import('../lib/groovy-engine.js').then((engine) => {
      if (cancelled || !canvasRef.current) return;
      const n = 140, rows = 140;
      const canvas = canvasRef.current;
      canvas.width = n;
      canvas.height = rows;
      const ctx = canvas.getContext('2d');
      let ruleIdx = 0;
      let state, row, rule;

      function restart() {
        rule = RULE_CYCLE_1D[ruleIdx % RULE_CYCLE_1D.length];
        ruleIdx++;
        state = engine.randomState(n, Math.floor(Math.random() * 1e9));
        row = 0;
        ctx.fillStyle = '#f1ead9';
        ctx.fillRect(0, 0, n, rows);
      }
      restart();

      function tick() {
        if (cancelled) return;
        if (row >= rows) restart();
        ctx.fillStyle = '#2a2420';
        for (let i = 0; i < n; i++) if (state[i]) ctx.fillRect(i, row, 1, 1);
        state = engine.applyRule(state, rule);
        row++;
        timer = setTimeout(tick, 45);
      }
      tick();
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', maxWidth: size, height: 'auto', aspectRatio: '1', imageRendering: 'pixelated', border: '1px solid var(--rule)', borderRadius: 10, background: 'var(--bg-alt)', display: 'block', margin: '0 auto' }}
    />
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
