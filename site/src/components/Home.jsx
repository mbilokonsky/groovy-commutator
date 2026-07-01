import Nav from './Nav.jsx';
import { StaticRuleGrid } from './AmbientCA.jsx';

// Same rules as the Concepts page's quick-pick list, one color each --
// reuses the site's established regime hues for visual continuity.
const SAMPLE_RULES = [
  { num: 4, color: 'oklch(0.55 0.12 195)' },
  { num: 184, color: 'oklch(0.58 0.13 150)' },
  { num: 30, color: 'oklch(0.58 0.13 300)' },
  { num: 110, color: 'oklch(0.58 0.13 240)' },
  { num: 54, color: 'oklch(0.6 0.14 75)' },
  { num: 90, color: 'oklch(0.56 0.15 22)' },
];

const formulaBlock = { fontFamily: "'IBM Plex Mono',monospace", background: 'var(--bg-alt)', border: '1px solid var(--rule)', padding: '0.9rem 1.1rem', borderRadius: 8, fontSize: '0.86rem', margin: '1.4rem 0' };
const formulaLine = { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem 1.5rem', margin: '0.15em 0' };
const formulaNote = { color: 'var(--ink-soft)', fontSize: '0.7rem' };
const pBody = { fontSize: '1rem', color: 'var(--ink-soft)', margin: '0 0 1.2rem', maxWidth: '68ch' };

export default function Home() {
  return (
    <>
      <Nav active="home" />

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>
        <section style={{ padding: '1.6rem 0 0.5rem' }}>
          <h1 style={{ fontFamily: "'Lora',serif", fontSize: 'clamp(1.9rem,5vw,2.6rem)', lineHeight: 1.25, margin: '0 0 0.6em', fontWeight: 600, letterSpacing: '-0.01em' }}>
            A New Lens on Cellular Automata
          </h1>

          <p style={pBody}>
            Some years ago I had an idea for a simple Boolean calculus specifically for cellular automata &mdash; so
            simple it's almost trivial. More details are available on the{' '}
            <a href="concepts.html" style={{ color: 'var(--accent)' }}>Concepts page</a>, but the entire thing can be
            defined here, mostly in terms of XOR.
          </p>

          <p style={pBody}>
            Normally you'd just say: the next state is <code className="gc-code">&phi;(S)</code>, full stop. Call
            that step <code className="gc-code">E(S)</code>, for <em>evolve</em> &mdash; and if all you want is the
            next state, that's the whole story, no calculus required. What follows arrives at that exact
            same <code className="gc-code">&phi;(S)</code> by a longer road, through a derivative and an integral.
            That's not a different answer &mdash; <code className="gc-code">E(S)</code> is provably identical to
            plain <code className="gc-code">&phi;(S)</code>, an isomorphism, not a new evolution rule. The point of
            the detour is what it exposes along the way: two internal moving parts, <code className="gc-code">D</code>{' '}
            and <code className="gc-code">I</code>, that turn out to be useful on their own.
          </p>

          <div style={formulaBlock}>
            <div style={formulaLine}><span>R &isin; {'{0, 1, …, 255}'}</span><span style={formulaNote}>the rule</span></div>
            <div style={formulaLine}><span>&phi;(S)<sub>i</sub> = R<sub>4&middot;S(i&minus;1) + 2&middot;S(i) + S(i+1)</sub></span><span style={formulaNote}>one cell's next value</span></div>
            <div style={formulaLine}><span>D(S) = S &oplus; &phi;(S)</span><span style={formulaNote}>differentiate &mdash; what changed</span></div>
            <div style={formulaLine}><span>I(a, b) = a &oplus; b</span><span style={formulaNote}>integrate &mdash; fold a difference back in</span></div>
            <div style={formulaLine}><span>E(S) = I(S, D(S)) = &phi;(S)</span><span style={formulaNote}>evolve &mdash; derived, not assumed</span></div>
          </div>
          <p style={{ ...pBody, fontSize: '0.9rem' }}>
            <code className="gc-code">&phi;</code>{' '}
            just reads <code className="gc-code">R</code>{' '}
            as an 8-entry lookup table, indexed by the 3-cell neighborhood &mdash; the same table the rule-diagram on
            the Concepts page lets you edit by hand.
          </p>

          <StaticRuleGrid rules={SAMPLE_RULES} />

          <p style={{ ...pBody, marginTop: '1.8rem' }}>
            For the longest time I thought of this as just a sort of pedantic expansion of some trivial dynamics
            &mdash; I assumed it was an established way to look at CAs. When I dusted it off in November of 2025,
            though, I realized that at least a cursory exploration of the space didn't surface anyone else looking at
            CAs this way. Furthermore, this time I noticed some affordances through it that I'd never noticed before.
          </p>

          <p style={pBody}>
            This site exists to document and explore some of the implications. I'm not heavily invested in CA
            studies, I'm not making any claims that any of this is groundbreaking, but some of it is interesting
            enough that I wanted to create a coherent place to share it.
          </p>

          <p style={pBody}>
            What I have is a Boolean calculus and then a few instruments defined or inspired by it, and together
            they give me some interesting lenses through which to examine CA rules.
          </p>

          <p style={pBody}>
            On this site you'll find a <a href="concepts.html" style={{ color: 'var(--accent)' }}>Concepts page</a>,
            where I go into detail about the various concepts in play &mdash; the goal is to be intelligible even to
            someone who has never played with CAs before.
          </p>

          <p style={pBody}>
            You'll find a <a href="questions.html" style={{ color: 'var(--accent)' }}>Questions page</a>, where I
            document questions that arise for me and the experiments I've run to answer them.
          </p>

          <p style={pBody}>
            And you'll find an <a href="explorer.html" style={{ color: 'var(--accent)' }}>Explorer page</a>, which
            lets you play with CAs in an interface designed to support the novel affordances that emerge from this
            calculus and the related instruments.
          </p>

          <div className="gc-cta" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', margin: '1.8em 0 0' }}>
            <a href="concepts.html" className="gc-mono" style={{ display: 'inline-block', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', padding: '0.7rem 1.3rem', borderRadius: 7, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff' }}>
              Read the concepts &rarr;
            </a>
            <a href="questions.html" className="gc-mono" style={{ display: 'inline-block', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', padding: '0.7rem 1.3rem', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)' }}>
              See the questions
            </a>
            <a href="explorer.html" className="gc-mono" style={{ display: 'inline-block', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none', padding: '0.7rem 1.3rem', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)' }}>
              Try the explorer
            </a>
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
