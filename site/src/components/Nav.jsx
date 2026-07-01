const PAGES = [
  { href: 'index.html', label: 'Home', key: 'home' },
  { href: 'concepts.html', label: 'Concepts', key: 'concepts' },
  { href: 'findings.html', label: 'Findings', key: 'findings' },
  { href: 'explorer.html', label: 'Explorer', key: 'explorer' },
];

export default function Nav({ active, brandFont = "'Lora',serif" }) {
  return (
    <header className="gc-header">
      <nav className="gc-nav">
        <a href="index.html" className="gc-nav-brand" style={{ fontFamily: brandFont }}>Groovy Commutator</a>
        <div className="gc-nav-links">
          {PAGES.map((p) => (
            <a key={p.key} href={p.href} className={'gc-nav-link' + (p.key === active ? ' active' : '')}>
              {p.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
