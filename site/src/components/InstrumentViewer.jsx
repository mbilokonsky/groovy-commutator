import { useEffect, useRef, useState } from 'react';

const OVERLAP_COLOR = 'oklch(0.6 0.28 340)'; // vivid magenta -- not used elsewhere on the site, so it reads unambiguously as "more than one layer lit here"

// Read-only, light-themed viewer for a fixed set of State -> State fields:
// side-by-side or a mix-blend-mode overlay, using the same rendering
// primitives as the Explorer (renderFieldToCanvas / renderFieldToCanvasTransparent).
// Deliberately no card CRUD here -- these are fixed pedagogical examples,
// not an editable graph. `multiply` (not the Explorer's `screen`) because
// this site is light-on-dark there and dark-on-light here.
export default function InstrumentViewer({ items, exploreHref, size = 220 }) {
  const [mode, setMode] = useState('side');
  const [hidden, setHidden] = useState(() => new Set());
  const engineRef = useRef(null);
  const canvasRefsRef = useRef([]);
  const overlapRef = useRef(null);
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

  function toggleHidden(label) {
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  function draw() {
    const engine = engineRef.current;
    if (!engine) return;
    const isSuper = mode === 'super' && items.length > 1;
    items.forEach((item, i) => {
      const canvas = canvasRefsRef.current[i].current;
      if (!canvas || !item.field) return;
      const isVisible = !hidden.has(item.label);
      if (isSuper) {
        if (isVisible) engine.renderFieldToCanvasTransparent(canvas, item.field, item.color);
        else { canvas.width = item.field[0].length; canvas.height = item.field.length; canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); }
      } else {
        engine.renderFieldToCanvas(canvas, item.field, item.color, '#f1ead9');
      }
    });

    if (isSuper && overlapRef.current) {
      const visibleFields = items.filter((it) => !hidden.has(it.label) && it.field).map((it) => it.field);
      const canvas = overlapRef.current;
      if (visibleFields.length < 2) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width || 1, canvas.height || 1);
      } else {
        const steps = visibleFields[0].length, n = visibleFields[0][0].length;
        const overlapField = Array.from({ length: steps }, (_, t) => {
          const row = new Uint8Array(n);
          for (let i = 0; i < n; i++) {
            let count = 0;
            for (const f of visibleFields) if (f[t][i]) count++;
            row[i] = count >= 2 ? 1 : 0;
          }
          return row;
        });
        engine.renderFieldToCanvasTransparent(canvas, overlapField, OVERLAP_COLOR);
      }
    }
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
          {items.map((item, i) => {
            const isVisible = !hidden.has(item.label);
            return (
              <div key={item.label} style={{ width: size, opacity: isVisible ? 1 : 0.35 }}>
                {isVisible
                  ? <canvas className="gc-field" ref={canvasRefsRef.current[i]} style={{ width: '100%', height: 'auto', aspectRatio: '1' }}></canvas>
                  : <div style={{ width: '100%', aspectRatio: '1', border: '1px dashed var(--rule)', borderRadius: 6, background: 'var(--bg-alt)' }}></div>}
                <button onClick={() => toggleHidden(item.label)} className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.35em', fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '0.3rem', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, flex: 'none' }}></span>{item.label}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {isSuper && (
        <>
          <div style={{ position: 'relative', width: size, aspectRatio: '1', background: 'var(--bg-alt)', border: '1px solid var(--rule)', borderRadius: 6 }}>
            {items.map((item, i) => (
              <canvas key={item.label} className="gc-field" ref={canvasRefsRef.current[i]} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', borderRadius: 0, background: 'transparent', mixBlendMode: 'multiply' }}></canvas>
            ))}
            {/* normal blend, not multiply: multiplying magenta against an
                already-dark pixel (e.g. wherever the black E(S) layer is
                lit) crushes back down toward black, so the highlight would
                be nearly invisible exactly where two dark layers overlap.
                Painting opaque on top guarantees it's visible regardless of
                what's underneath, at the cost of hiding those layers' own
                colors in the overlap region -- an acceptable trade since
                the legend already lists which layers are active. */}
            <canvas ref={overlapRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', borderRadius: 0, background: 'transparent', imageRendering: 'pixelated' }}></canvas>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {items.map((item) => {
              const isVisible = !hidden.has(item.label);
              return (
                <button key={item.label} onClick={() => toggleHidden(item.label)} className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.35em', fontSize: '0.72rem', color: isVisible ? 'var(--ink-soft)' : 'var(--rule)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: item.color, opacity: isVisible ? 1 : 0.3, flex: 'none' }}></span>{item.label}
                </button>
              );
            })}
            <div className="gc-mono" style={{ display: 'flex', alignItems: 'center', gap: '0.35em', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: OVERLAP_COLOR, flex: 'none' }}></span>2+ layers here
            </div>
          </div>
        </>
      )}
    </div>
  );
}
