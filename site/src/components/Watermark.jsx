export default function Watermark({ title = 'AI-written prose', maxWidth = 880, children }) {
  return (
    <div className="gc-watermark-wrap" style={{ maxWidth }}>
      <div className="gc-watermark">
        <b>Note — {title}</b>
        {children}
      </div>
    </div>
  );
}
