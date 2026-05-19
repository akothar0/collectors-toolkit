// shared.jsx — Mock data + atom components shared by all variations.
// Exports to window so each Babel script can see them.

// ────────────────────────────────────────────────────────────────
//  MOCK DATA — realistic, plausible sports-card values
// ────────────────────────────────────────────────────────────────
const PORTFOLIO = {
  totalValue: 18420,
  costBasis: 14200,
  unrealized: 4220,
  unrealizedPct: 29.7,
  cardCount: 247,
  graded: 84,
  raw: 163,
  weekDelta: 312,
  weekDeltaPct: 1.72,
  monthDelta: 1140,
  monthDeltaPct: 6.6,
};

const TOP_HOLDINGS = [
  { id: 1, player: 'Luka Dončić',     year: 2018, set: 'Panini Prizm',            num: '#280', grade: 'PSA 10', value: 1850, cost: 720,  delta: 130, pop: 1842, sport: 'NBA',  tint: '#1f1d6b', accent: '#f6cf3a' },
  { id: 2, player: 'LeBron James',    year: 2003, set: 'Topps Chrome RC',          num: '#111', grade: 'BGS 9',  value: 1250, cost: 980,  delta: -40, pop: 3120, sport: 'NBA',  tint: '#7a0c1e', accent: '#f4ddc1' },
  { id: 3, player: 'Victor Wembanyama',year: 2023, set: 'Topps Chrome RC',          num: '#180', grade: 'PSA 10', value: 940,  cost: 410,  delta: 88,  pop: 612,  sport: 'NBA',  tint: '#0e2a52', accent: '#c8d4e8' },
  { id: 4, player: 'Patrick Mahomes', year: 2017, set: 'Panini Prizm',             num: '#270', grade: 'PSA 9',  value: 720,  cost: 540,  delta: 12,  pop: 4820, sport: 'NFL',  tint: '#a51d2a', accent: '#fad36a' },
  { id: 5, player: 'Caitlin Clark',   year: 2024, set: 'Prizm WNBA Silver RC',     num: '#1',   grade: 'PSA 10', value: 540,  cost: 220,  delta: 64,  pop: 312,  sport: 'WNBA', tint: '#f2a51c', accent: '#1c2d57' },
  { id: 6, player: 'Paul Skenes',     year: 2024, set: 'Bowman Chrome Auto',       num: '#BCP-PS', grade: 'Raw',  value: 410,  cost: 90,   delta: 24,  pop: null, sport: 'MLB',  tint: '#0d322b', accent: '#f9c977' },
];

const ACTIVITY = [
  { id: 'a1', type: 'scan',  when: '2h ago',  dt: '14:22', title: 'Scanned PSA slab',
    detail: '2023 Topps Chrome Wembanyama RC #180', meta: 'PSA 10 · Pop 612 · Pop higher 0' },
  { id: 'a2', type: 'grade', when: 'Yesterday', dt: 'Mon 19:08', title: 'AI-graded raw card',
    detail: '2024 Bowman Chrome Paul Skenes RC #BCP-PS', meta: 'Predicted PSA 9 · Medium confidence · Submit recommended' },
  { id: 'a3', type: 'import',when: '2 days',   dt: 'Sun 11:40', title: 'Imported eBay CSV',
    detail: '12 line items parsed', meta: '10 high confidence · 2 need review' },
  { id: 'a4', type: 'value', when: '3 days',   dt: 'Sat 09:14', title: 'Updated value',
    detail: 'Doncic 2018 Prizm PSA 10',  meta: '$1,720 → $1,850 · +7.5%' },
  { id: 'a5', type: 'set',   when: '5 days',   dt: 'Thu 21:51', title: 'Set progress',
    detail: '2024 Topps Chrome base set',   meta: '184/220 · 84% complete' },
];

const WANT = [
  { id: 'w1', card: '2018 Prizm Trae Young Silver RC',     grade: 'PSA 10', target: 240,  last: 215,  status: 'under' },
  { id: 'w2', card: '2003 Topps Chrome LeBron Refractor', grade: 'BGS 9',  target: 1400, last: 1620, status: 'over' },
  { id: 'w3', card: '2024 Bowman Chrome Skenes 1st Auto',  grade: 'Raw',    target: 480,  last: 510,  status: 'over' },
  { id: 'w4', card: '1986 Fleer Jordan RC #57',            grade: 'PSA 7',  target: 1800, last: null, status: 'none' },
];

const SET_PROGRESS = {
  name: '2024 Topps Chrome',
  total: 220,
  owned: 184,
  // bit pattern for owned slots — generated to look organic
  ownedMap: (() => {
    const arr = new Array(220).fill(false);
    const skip = new Set([3,7,22,41,54,61,88,92,107,118,134,142,159,167,178,191,202,209,211,214,216,217,218,219]);
    for (let i = 0; i < 220; i++) if (!skip.has(i+1)) arr[i] = true;
    return arr;
  })(),
};

const POP_TICKER = [
  { tag: 'PSA 10', card: 'Wembanyama RC #180',     prev: 610, next: 612, delta: 2 },
  { tag: 'PSA 10', card: 'Caitlin Clark Prizm #1', prev: 308, next: 312, delta: 4 },
  { tag: 'BGS 9.5',card: 'LeBron Topps Chrome RC', prev: 211, next: 211, delta: 0 },
  { tag: 'PSA 9',  card: 'Mahomes Prizm #270',     prev: 4806,next: 4820,delta: 14 },
];

// ────────────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────────────
const money = (n, dp = 0) => {
  const v = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  return sign + '$' + v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
};
const moneyShort = (n) => {
  if (Math.abs(n) >= 1000) return '$' + (n/1000).toFixed(1).replace('.0','') + 'k';
  return '$' + n.toLocaleString('en-US');
};
const pct = (n, dp = 1) => (n >= 0 ? '+' : '−') + Math.abs(n).toFixed(dp) + '%';
const signed = (n) => (n >= 0 ? '+' : '−') + Math.abs(n);
const initials = (name) => name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
const lastName = (name) => name.split(' ').slice(-1)[0];

// ────────────────────────────────────────────────────────────────
//  SLAB COMPONENT — CSS-only graded slab placeholder.
//  Reads as a real PSA/BGS/SGC slab without an image.
// ────────────────────────────────────────────────────────────────
function Slab({
  holding,
  width = 168,
  height = 252,
  flavor = 'light',          // 'light' (PSA red label) or 'dark' (matte)
  showLabel = true,
  tilt = 0,
  style = {},
  onClick,
}) {
  const isPSA = holding.grade.startsWith('PSA');
  const isBGS = holding.grade.startsWith('BGS');
  const isSGC = holding.grade.startsWith('SGC');
  const isRaw = holding.grade === 'Raw';

  const labelBg = isPSA ? '#c41e3a' : isBGS ? '#101935' : isSGC ? '#1d3e8b' : '#222';
  const labelInk = '#fff';
  const labelText = isPSA ? 'PSA' : isBGS ? 'BGS' : isSGC ? 'SGC' : 'RAW';
  const gradeNum = holding.grade.replace(/PSA|BGS|SGC|\s/g, '');
  const tint = holding.tint || '#2d2e34';
  const accent = holding.accent || '#f4f4f1';

  // plastic
  const plasticGrad = flavor === 'dark'
    ? 'linear-gradient(160deg, #2a2a2c 0%, #1a1a1c 60%, #232325 100%)'
    : 'linear-gradient(160deg, #ffffff 0%, #ecebe7 55%, #f7f5ef 100%)';
  const plasticShadow = flavor === 'dark'
    ? '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 28px rgba(0,0,0,0.45)'
    : '0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.04) inset, 0 8px 22px rgba(20,17,13,0.10), 0 2px 6px rgba(20,17,13,0.06)';
  const plasticBorder = flavor === 'dark' ? '1px solid #303033' : '1px solid rgba(20,17,13,0.06)';

  return (
    <div
      onClick={onClick}
      style={{
        width, height, position: 'relative',
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
        transition: 'transform .25s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* plastic case */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: width * 0.04,
        background: plasticGrad, boxShadow: plasticShadow, border: plasticBorder,
      }} />

      {/* label band (top) */}
      {showLabel && !isRaw && (
        <div style={{
          position: 'absolute', top: width * 0.04, left: width * 0.04, right: width * 0.04,
          height: height * 0.11, background: labelBg, borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 8px', color: labelInk,
          fontFamily: 'Geist, sans-serif', fontWeight: 700, fontSize: width * 0.058,
          letterSpacing: 0.6, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.18)',
        }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span>{labelText}</span>
            <span style={{ fontSize: width * 0.078, fontWeight: 800 }}>{gradeNum}</span>
          </span>
          <span style={{ fontSize: width * 0.044, opacity: 0.85 }}>
            {gradeNum === '10' ? 'GEM MT' : gradeNum === '9' ? 'MINT' : 'NM/MT'}
          </span>
        </div>
      )}
      {showLabel && isRaw && (
        <div style={{
          position: 'absolute', top: width * 0.04, left: width * 0.04, right: width * 0.04,
          height: height * 0.06, background: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 6px',
          fontFamily: 'Geist Mono, monospace', fontSize: width * 0.044,
          letterSpacing: 1.2, color: flavor === 'dark' ? '#a09c92' : '#8a867b',
        }}>
          <span>RAW · UNGRADED</span>
        </div>
      )}

      {/* card window */}
      <div style={{
        position: 'absolute',
        top: showLabel ? (isRaw ? height * 0.10 : height * 0.18) : height * 0.04,
        left: width * 0.08, right: width * 0.08,
        bottom: height * 0.10,
        background: `linear-gradient(180deg, ${tint} 0%, ${tint}cc 55%, ${darken(tint, 0.35)} 100%)`,
        borderRadius: 2, overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.15)',
      }}>
        {/* refractor sheen */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(115deg, transparent 0%, transparent 40%, rgba(255,255,255,0.10) 50%, transparent 60%, transparent 100%)',
        }} />
        {/* radial spotlight */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 62%, rgba(0,0,0,0.45), transparent 72%)',
        }} />
        {/* player silhouette: two stacked ellipses (head + torso) */}
        <div style={{
          position: 'absolute', left: '50%', bottom: '22%', transform: 'translateX(-50%)',
          width: '38%', height: '52%',
        }}>
          <div style={{
            position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)',
            width: '38%', aspectRatio: '1', borderRadius: '50%',
            background: 'rgba(0,0,0,0.42)', filter: 'blur(0.4px)',
          }} />
          <div style={{
            position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
            width: '100%', height: '64%',
            background: 'rgba(0,0,0,0.42)',
            borderRadius: '46% 46% 6% 6% / 60% 60% 8% 8%',
          }} />
        </div>
        {/* card-number watermark */}
        <div style={{
          position: 'absolute', top: 6, right: 8,
          color: 'rgba(255,255,255,0.55)', fontFamily: 'Geist Mono, monospace',
          fontSize: width * 0.05, fontWeight: 600, letterSpacing: 0.4,
        }}>{holding.num}</div>
        {/* player surname */}
        <div style={{
          position: 'absolute', bottom: 6, left: 8, right: 8,
          color: accent, fontFamily: 'Instrument Serif, serif',
          fontSize: width * 0.10, fontStyle: 'italic', lineHeight: 1,
          textShadow: '0 1px 2px rgba(0,0,0,0.55)',
        }}>{lastName(holding.player)}</div>
        {/* sport tag */}
        <div style={{
          position: 'absolute', top: 6, left: 8,
          color: 'rgba(255,255,255,0.75)', fontFamily: 'Geist Mono, monospace',
          fontSize: width * 0.042, fontWeight: 500, letterSpacing: 1,
        }}>{holding.sport}</div>
      </div>

      {/* bottom band — set info */}
      <div style={{
        position: 'absolute', bottom: 0, left: width * 0.08, right: width * 0.08,
        height: height * 0.10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        color: flavor === 'dark' ? '#a09c92' : '#3a3a35',
        fontFamily: 'Geist Mono, monospace', fontSize: width * 0.042,
        letterSpacing: 0.6, fontWeight: 500,
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {holding.year} {holding.set.toUpperCase()}
        </span>
      </div>
    </div>
  );
}

function darken(hex, amount) {
  // simple hex darken
  const h = hex.replace('#', '');
  const num = parseInt(h, 16);
  let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
  r = Math.max(0, Math.floor(r * (1 - amount)));
  g = Math.max(0, Math.floor(g * (1 - amount)));
  b = Math.max(0, Math.floor(b * (1 - amount)));
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// ────────────────────────────────────────────────────────────────
//  ICONS — simple line icons
// ────────────────────────────────────────────────────────────────
const Icon = {
  scan: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/>
      <path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
      <path d="M7 12h10"/>
    </svg>
  ),
  grade: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>
    </svg>
  ),
  add: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 5v14"/><path d="M5 12h14"/>
    </svg>
  ),
  import: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
    </svg>
  ),
  collection: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="4" width="6" height="16" rx="1"/><rect x="11" y="4" width="6" height="16" rx="1"/><path d="M19 7l2 1v12l-2 1"/>
    </svg>
  ),
  want: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 14c1.5-1.5 3-3.5 3-5.5A4.5 4.5 0 0 0 17.5 4 4.5 4.5 0 0 0 12 7a4.5 4.5 0 0 0-5.5-3A4.5 4.5 0 0 0 2 8.5c0 2 1.5 4 3 5.5L12 21l7-7Z"/>
    </svg>
  ),
  portfolio: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 19h18"/><path d="M5 16V9"/><path d="M10 16V5"/><path d="M15 16v-7"/><path d="M20 16v-4"/>
    </svg>
  ),
  sets: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  ),
  arrowUp: (p={}) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 17L17 7"/><path d="M8 7h9v9"/>
    </svg>
  ),
  arrowDown: (p={}) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M17 7L7 17"/><path d="M16 17H7V8"/>
    </svg>
  ),
  camera: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14.5 4h-5l-2 2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.5l-2-2Z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  ),
  bell: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/>
    </svg>
  ),
  search: (p={}) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  ),
  chevron: (p={}) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
};

// ────────────────────────────────────────────────────────────────
//  CAPTURE MODAL — shared for both variations.
//  Camera viewfinder mock that runs through a fake scan timeline.
// ────────────────────────────────────────────────────────────────
function CaptureModal({ open, onClose, theme = 'light' }) {
  const [phase, setPhase] = React.useState('aim'); // aim | scanning | lookup | result
  React.useEffect(() => {
    if (!open) { setPhase('aim'); return; }
    const t1 = setTimeout(() => setPhase('scanning'), 700);
    const t2 = setTimeout(() => setPhase('lookup'),   2000);
    const t3 = setTimeout(() => setPhase('result'),   3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [open]);
  if (!open) return null;

  const dark = theme === 'dark';
  const bg = dark ? '#0b0b0c' : '#14110d';
  const surface = dark ? '#16171a' : '#fff';
  const ink = dark ? '#f2efe7' : '#14110d';
  const inkMuted = dark ? '#a09c92' : '#5c594f';
  const rule = dark ? '#24242a' : '#e4e0d5';
  const accent = dark ? '#d4a24c' : '#b8531a';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, background: 'rgba(11,11,12,0.66)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 40, animation: 'cm-fade .25s ease',
      }}
    >
      <style>{`
        @keyframes cm-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cm-scan { 0% { top: 8%; } 100% { top: 88%; } }
        @keyframes cm-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 100%)', background: surface, color: ink,
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 30px 80px rgba(0,0,0,0.45)',
          fontFamily: 'Geist, sans-serif',
          border: dark ? '1px solid #232328' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid ' + rule,
        }}>
          <div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, letterSpacing: 2, color: inkMuted, textTransform: 'uppercase' }}>
              Quick scan · cert lookup
            </div>
            <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 26, lineHeight: 1.1, marginTop: 4 }}>
              Point at the slab label.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: inkMuted, fontSize: 22,
            cursor: 'pointer', padding: 6, lineHeight: 1,
          }}>×</button>
        </div>
        {/* Viewfinder */}
        <div style={{ padding: 22, background: dark ? '#0e0e10' : '#f6f4ef' }}>
          <div style={{
            position: 'relative', aspectRatio: '16/10', borderRadius: 8,
            background: 'linear-gradient(160deg, #1c1c1f 0%, #0c0c0e 100%)',
            overflow: 'hidden',
          }}>
            {/* corner brackets */}
            {[
              { top: 16, left: 16, bt: 2, lt: 2, bb: 0, lb: 0 },
              { top: 16, right: 16, bt: 2, rt: 2, bb: 0, rb: 0 },
              { bottom: 16, left: 16, bb: 2, lb: 2, bt: 0, lt: 0 },
              { bottom: 16, right: 16, bb: 2, rb: 2, bt: 0, rt: 0 },
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute', width: 28, height: 28,
                borderTop: c.bt ? `${c.bt}px solid ${accent}` : 'none',
                borderBottom: c.bb ? `${c.bb}px solid ${accent}` : 'none',
                borderLeft: c.lt || c.lb ? `${c.lt||c.lb}px solid ${accent}` : 'none',
                borderRight: c.rt || c.rb ? `${c.rt||c.rb}px solid ${accent}` : 'none',
                top: c.top, left: c.left, right: c.right, bottom: c.bottom,
              }}/>
            ))}
            {/* faux slab in frame */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-3deg)',
              opacity: phase === 'result' ? 0 : 1, transition: 'opacity .25s',
            }}>
              <Slab holding={TOP_HOLDINGS[2]} width={140} height={210} flavor="dark" />
            </div>
            {/* scan line */}
            {phase === 'scanning' && (
              <div style={{
                position: 'absolute', left: '8%', right: '8%', height: 1,
                background: 'linear-gradient(90deg, transparent, ' + accent + ', transparent)',
                boxShadow: '0 0 12px ' + accent,
                animation: 'cm-scan 1.3s ease-in-out infinite alternate',
              }}/>
            )}
            {/* result overlay */}
            {phase === 'result' && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'linear-gradient(180deg, rgba(11,11,12,0.86), rgba(11,11,12,0.96))',
                color: '#f2efe7', padding: 24,
              }}>
                <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                  <Slab holding={TOP_HOLDINGS[2]} width={120} height={180} flavor="dark" />
                  <div>
                    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 10, letterSpacing: 2, color: accent }}>MATCHED · PSA</div>
                    <div style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 28, marginTop: 4 }}>
                      Victor Wembanyama
                    </div>
                    <div style={{ fontSize: 13, color: '#a09c92', marginTop: 2 }}>
                      2023 Topps Chrome RC · #180 · PSA 10
                    </div>
                    <div style={{ display: 'flex', gap: 18, marginTop: 14, fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
                      <div><div style={{ color: '#6b6862' }}>POP@10</div><div style={{ fontSize: 18, color: '#f2efe7' }}>612</div></div>
                      <div><div style={{ color: '#6b6862' }}>POP HIGHER</div><div style={{ fontSize: 18, color: '#f2efe7' }}>0</div></div>
                      <div><div style={{ color: '#6b6862' }}>EST. VALUE</div><div style={{ fontSize: 18, color: accent }}>$940</div></div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                      <button style={{
                        background: accent, color: '#14110d', border: 'none', borderRadius: 999,
                        padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>Save to collection</button>
                      <button style={{
                        background: 'transparent', color: '#f2efe7', border: '1px solid #303034', borderRadius: 999,
                        padding: '8px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}>Scan another</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* status line */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 16px',
              background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.6))',
              color: '#f2efe7', fontFamily: 'Geist Mono, monospace', fontSize: 11, letterSpacing: 1,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ animation: phase !== 'result' ? 'cm-pulse 1.4s infinite' : 'none' }}>
                {phase === 'aim' && '· · ·  AIM · KEEP LABEL READABLE'}
                {phase === 'scanning' && '· OCR · READING CERT 48029174'}
                {phase === 'lookup' && '· LOOKUP · PSA API · 0.4s'}
                {phase === 'result' && '· MATCH FOUND · 1.1s'}
              </span>
              <span style={{ color: accent }}>
                {phase === 'result' ? 'PSA · CONFIRMED' : 'OCR ' + (phase === 'aim' ? '00%' : phase === 'scanning' ? '64%' : '100%')}
              </span>
            </div>
          </div>
        </div>
        <div style={{
          padding: '12px 22px', display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: inkMuted, fontFamily: 'Geist Mono, monospace', letterSpacing: 1,
        }}>
          <span>9 scans remaining today</span>
          <span>PSA · BGS · SGC supported</span>
        </div>
      </div>
    </div>
  );
}

// Expose
Object.assign(window, {
  PORTFOLIO, TOP_HOLDINGS, ACTIVITY, WANT, SET_PROGRESS, POP_TICKER,
  money, moneyShort, pct, signed, initials, lastName,
  Slab, Icon, CaptureModal, darken,
});
