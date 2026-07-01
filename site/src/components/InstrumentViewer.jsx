import { useEffect, useRef, useState } from 'react';

// Read-only, light-themed viewer for a fixed set of State -> State fields:
// side-by-side or a mix-blend-mode overlay, using the same rendering
// primitives as the Explorer (renderFieldToCanvas / renderFieldToCanvasTransparent).
// Deliberately no card CRUD here -- these are fixed pedagogical examples,
// not an editable graph. `multiply` (not the Explorer's `screen`) because
// this site is light-on-dark there and dark-on-light here.
export default function InstrumentViewer({ items, exploreHref, size = 150 }) {
  const [mode, setMode] = useState('side');
  const engineRef = useRef(null);
  const canvasRefsRef = useRef([]);
  if (canvasRefsRef.current.length !== items.length) {
    canvasRefsRef.current = items.map(() => ({ current: null }));
  }

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
    const isSuper = mode === 'super' && items.length > 1;
    items.forEach((item, i) => {
      const canvas = canvasRefsRef.current[i].current;
      if (!canvas || !item.field) return;
      if (isSuper) engine.renderFieldToCanvasTransparent(canvas, item.field, item.color);
      else engine.renderFieldToCanvas(canvas, item.field, item.color, '#f1ead9');
    });
  }

  const isSuper = mode === 'super';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        {items.length > 1 && (
          <div>
            <button onClick={() => setMode('side')} className="gc-mono" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '6px 0 0 6px', cursor: 'pointer', border: '1px solid var(--rule)', background: !isSuper ? 'var(--accent)' : '#fff', color: !isSuper ? '#fff' : 'var(--ink-soft)' }}>side by side</button>
            <button onClick={() => setMode('super')} className="gc-mono" style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.6rem', borderRadius: '0 6px 6px 0', cursor: 'pointer', border: '1px solid var(--rule)', borderLeft: 'none', background: isSuper ? 'var(--accent)' : '#fff', color: isSuper ? '#fff' : 'var(--ink-soft)' }}>overlay</button>
          </div>
        )}
        {exploreHref && (
          <a href={exploreHref} className="gc-mono" style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none', marginLeft: 'auto' }}>
            Explore this &rarr;
          </a>
        )}
      </div>

      {!isSuper && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {items.map((item, i) => (
            <div key={item.label} style={{ width: size }}>
              <canvas className="gc-field" ref={canvasRefsRef.current[i]} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
              <div className="gc-mono" style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem' }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {isSuper && (
        <>
          <div style={{ position: 'relative', width: size, aspectRatio: '1', background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 6 }}>
            {items.map((item, i) => (
              <canvas key={item.label} className="gc-field" ref={canvasRefsRef.current[i]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', borderRadius: 0, background: 'transparent', mixBlendMode: 'multiply' }}></canvas>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {items.map((item) => (
              <div key={item.label} className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.35em', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color }}></span>{item.label}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
