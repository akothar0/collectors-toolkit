// portfolio.jsx — Portfolio dashboard with real chart.

// 12-month value series (simulated)
const PORT_SERIES = [
  { m: 'May 25', v: 13200 },
  { m: 'Jun',    v: 13400 },
  { m: 'Jul',    v: 13100 },
  { m: 'Aug',    v: 13800 },
  { m: 'Sep',    v: 14100 },
  { m: 'Oct',    v: 14000 },
  { m: 'Nov',    v: 14600 },
  { m: 'Dec',    v: 15200 },
  { m: 'Jan 26', v: 15600 },
  { m: 'Feb',    v: 16400 },
  { m: 'Mar',    v: 17100 },
  { m: 'Apr',    v: 17800 },
  { m: 'May',    v: 18420 },
];

const BY_SPORT = [
  { sport: 'NBA',  count: 142, value: 11820 },
  { sport: 'NFL',  count: 38,  value: 3140 },
  { sport: 'MLB',  count: 47,  value: 2380 },
  { sport: 'WNBA', count: 20,  value: 1080 },
];

const BY_GRADE = [
  { label: 'PSA 10', count: 22, value: 6840 },
  { label: 'PSA 9',  count: 18, value: 2980 },
  { label: 'BGS 9.5',count: 4,  value: 1620 },
  { label: 'BGS 9',  count: 6,  value: 1380 },
  { label: 'SGC 10', count: 5,  value: 1100 },
  { label: 'Raw',    count: 163,value: 4500 },
];

function PortfolioChart() {
  const w = 760, h = 220, pad = 24;
  const max = Math.max(...PORT_SERIES.map(p => p.v)) * 1.02;
  const min = Math.min(...PORT_SERIES.map(p => p.v)) * 0.92;
  const x = (i) => pad + (i / (PORT_SERIES.length - 1)) * (w - pad * 2);
  const y = (v) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const pts = PORT_SERIES.map((p, i) => `${x(i)},${y(p.v)}`).join(' ');
  const area = `M ${x(0)},${h - pad} L ${pts.split(' ').join(' L ')} L ${x(PORT_SERIES.length - 1)},${h - pad} Z`;
  const line = `M ${pts.split(' ').join(' L ')}`;
  return (
    <div style={{
      background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4, padding: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <Eyebrow>Book value · 12 months</Eyebrow>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 6 }}>
            <span style={{ fontFamily: st.serif, fontSize: 52, fontStyle: 'italic', lineHeight: 1 }}>$18,420</span>
            <span style={{ fontFamily: st.mono, fontSize: 14, color: st.pos }}>
              +$5,220 · +39.5% YEAR
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, border: '1px solid ' + st.rule, borderRadius: 4, overflow: 'hidden' }}>
          {['1M', '3M', '6M', '12M', 'ALL'].map((p, i) => (
            <button key={p} style={{
              padding: '6px 12px', fontFamily: st.mono, fontSize: 11, letterSpacing: 0.5,
              background: i === 3 ? st.ink : 'transparent', color: i === 3 ? st.bg : st.ink2,
              border: 'none', borderRight: i < 4 ? '1px solid ' + st.rule : 'none', cursor: 'pointer',
            }}>{p}</button>
          ))}
        </div>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={st.accent} stopOpacity="0.18"/>
            <stop offset="100%" stopColor={st.accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={pad} y1={pad + p * (h - pad * 2)} x2={w - pad} y2={pad + p * (h - pad * 2)}
                stroke={st.ruleSoft}/>
        ))}
        <path d={area} fill="url(#area-grad)"/>
        <path d={line} stroke={st.ink} strokeWidth="1.5" fill="none"/>
        {PORT_SERIES.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.v)} r={i === PORT_SERIES.length - 1 ? 4 : 0}
                  fill={st.accent} stroke={st.bg} strokeWidth="2"/>
        ))}
        {/* x labels */}
        {PORT_SERIES.filter((_, i) => i % 3 === 0).map((p, i) => {
          const idx = i * 3;
          return (
            <text key={p.m} x={x(idx)} y={h - 4}
                  fontFamily="Geist Mono, monospace" fontSize="10" fill={st.ink3}
                  textAnchor="middle" letterSpacing="0.5">
              {p.m.toUpperCase()}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function ByBreakdown({ title, items, valueKey, max }) {
  return (
    <div style={{ background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4, padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div style={{ fontFamily: st.serif, fontSize: 22, fontStyle: 'italic' }}>{title}</div>
        <Eyebrow>{items.length} buckets</Eyebrow>
      </div>
      <div style={{ marginTop: 16 }}>
        {items.map((it, i) => {
          const v = it[valueKey];
          return (
            <div key={i} style={{
              padding: '12px 0', borderBottom: i < items.length - 1 ? '1px solid ' + st.ruleSoft : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontFamily: st.sans, fontSize: 13, fontWeight: 500 }}>
                  {it.sport || it.label}
                </span>
                <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3 }}>
                  {it.count} cards · ${v.toLocaleString()}
                </span>
              </div>
              <div style={{ height: 3, background: st.ruleSoft, borderRadius: 2 }}>
                <div style={{
                  width: `${(v / max) * 100}%`, height: '100%',
                  background: i === 0 ? st.ink : st.ink + 'cc',
                  borderRadius: 2,
                }}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PortfolioDesktop() {
  const maxSport = Math.max(...BY_SPORT.map(s => s.value));
  const maxGrade = Math.max(...BY_GRADE.map(g => g.value));
  return (
    <div style={{ width: '100%', minHeight: '100%', background: st.bg, color: st.ink, fontFamily: st.sans }}>
      <SharedNav active="Portfolio"/>
      <div style={{ padding: '36px 36px 24px' }}>
        {/* Masthead */}
        <div>
          <Eyebrow>Portfolio · book of record</Eyebrow>
          <div style={{
            fontFamily: st.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
          }}>
            What you have, <span style={{ fontStyle: 'italic', color: st.accent }}>at a glance.</span>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{
          marginTop: 28, border: '1px solid ' + st.rule, borderRadius: 4, background: st.surface, display: 'flex',
        }}>
          {[
            { label: 'Book value',     value: '$18,420',  big: true, delta: '+$312 1W',   deltaPos: true },
            { label: 'Cost basis',     value: '$14,200',  sub: '247 CARDS · AVG $57.49' },
            { label: 'Unrealized',     value: '+$4,220',  italic: true, color: st.pos, delta: '+29.7% VS COST' },
            { label: 'Best year',      value: '+$5,220',  sub: 'MAY 25 → MAY 26 · +39.5%' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '24px 28px',
              borderRight: i < 3 ? '1px solid ' + st.rule : 'none',
            }}>
              <Eyebrow>{s.label}</Eyebrow>
              <div style={{
                fontFamily: st.serif, fontSize: s.big ? 56 : 44, lineHeight: 1, marginTop: 12,
                fontStyle: s.italic ? 'italic' : 'normal', color: s.color || st.ink, letterSpacing: -0.5,
              }}>{s.value}</div>
              {s.delta && (
                <div style={{ fontFamily: st.mono, fontSize: 11, color: s.deltaPos ? st.pos : st.ink3, marginTop: 10 }}>
                  {s.deltaPos && '↗ '}{s.delta}
                </div>
              )}
              {s.sub && (
                <div style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, marginTop: 10, letterSpacing: 0.4 }}>
                  {s.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ marginTop: 18 }}>
          <PortfolioChart/>
        </div>

        {/* Breakdowns */}
        <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <ByBreakdown title="By sport"  items={BY_SPORT}  valueKey="value" max={maxSport}/>
          <ByBreakdown title="By grade" items={BY_GRADE} valueKey="value" max={maxGrade}/>
        </div>

        {/* Top 10 */}
        <div style={{ marginTop: 36 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: st.serif, fontSize: 30, fontStyle: 'italic' }}>Top 10 by value</div>
            <Eyebrow>61% of book in top 10</Eyebrow>
          </div>
          <Rule/>
          {[
            ...TOP_HOLDINGS,
            { id: 7, player: 'Anthony Edwards', year: 2020, set: 'Panini Prizm', num: '#258', grade: 'PSA 10', value: 320, cost: 180, delta: -8, pop: 2240, sport: 'NBA', tint: '#005e3a', accent: '#f4d9a0' },
            { id: 8, player: 'Justin Jefferson', year: 2020, set: 'Panini Prizm', num: '#398', grade: 'PSA 10', value: 420, cost: 220, delta: 12, pop: 1180, sport: 'NFL', tint: '#3a2a85', accent: '#f7c63a' },
            { id: 9, player: 'Shai Gilgeous-Alexander', year: 2018, set: 'Panini Prizm', num: '#127', grade: 'PSA 10', value: 380, cost: 95, delta: 64, pop: 920, sport: 'NBA', tint: '#0a4d9a', accent: '#fad36a' },
            { id: 10, player: 'Bryce Harper', year: 2011, set: 'Bowman Chrome', num: '#BCP111', grade: 'BGS 9.5', value: 880, cost: 540, delta: 22, pop: 78, sport: 'MLB', tint: '#a51a2e', accent: '#f3f0e8' },
          ].slice(0, 10).map((h, i) => (
            <div key={h.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 110px 100px 120px 100px 80px', gap: 16,
              padding: '14px 0', alignItems: 'center', borderBottom: '1px solid ' + st.ruleSoft,
            }}>
              <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3 }}>{String(i+1).padStart(2,'0')}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Slab holding={h} width={32} height={48} flavor="light" showLabel={false}/>
                <div>
                  <div style={{ fontFamily: st.serif, fontSize: 17 }}>{h.player}</div>
                  <div style={{ fontSize: 12, color: st.ink2 }}>{h.year} {h.set} {h.num}</div>
                </div>
              </div>
              <span style={{ fontFamily: st.mono, fontSize: 12 }}>{h.grade}</span>
              <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3 }}>
                {h.pop ? `POP ${h.pop.toLocaleString()}` : '—'}
              </span>
              <span style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 22 }}>${h.value.toLocaleString()}</span>
              <span style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3 }}>
                COST ${h.cost.toLocaleString()}
              </span>
              <span style={{
                fontFamily: st.mono, fontSize: 12, textAlign: 'right',
                color: h.delta >= 0 ? st.pos : st.neg,
              }}>{h.delta >= 0 ? '+' : '−'}${Math.abs(h.delta)}</span>
            </div>
          ))}
        </div>

        <PageFooter
          left="COLLECTORS TOOLKIT · PORTFOLIO · v1.0"
          right="VALUES UPDATED LIVE · BOOK MARKED TO MARKET WHERE COMPS EXIST"
        />
      </div>
    </div>
  );
}

Object.assign(window, { PortfolioDesktop });
