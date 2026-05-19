// collection.jsx — Collection grid + card detail view.
// Two states: grid (default) and detail. Toggle via Tweaks.

// Extended catalog for the grid view
const COLLECTION_CARDS = [
  ...TOP_HOLDINGS,
  { id: 7, player: 'Anthony Edwards',   year: 2020, set: 'Panini Prizm', num: '#258', grade: 'PSA 10', value: 320, cost: 180, delta: -8, pop: 2240, sport: 'NBA',  tint: '#005e3a', accent: '#f4d9a0' },
  { id: 8, player: 'CC Sabathia',       year: 2001, set: 'Topps Heritage', num: '#338', grade: 'PSA 8', value: 95,  cost: 30,  delta: 4,   pop: 412,  sport: 'MLB',  tint: '#0e1f3a', accent: '#e4c478' },
  { id: 9, player: 'A\'ja Wilson',      year: 2018, set: 'Donruss WNBA', num: '#34',  grade: 'PSA 9',  value: 280, cost: 110, delta: 18,  pop: 504,  sport: 'WNBA', tint: '#84141d', accent: '#f0c95a' },
  { id: 10, player: 'Bryce Harper',     year: 2011, set: 'Bowman Chrome',  num: '#BCP111', grade: 'BGS 9.5', value: 880, cost: 540, delta: 22, pop: 78, sport: 'MLB', tint: '#a51a2e', accent: '#f3f0e8' },
  { id: 11, player: 'Justin Jefferson', year: 2020, set: 'Panini Prizm',   num: '#398', grade: 'PSA 10', value: 420, cost: 220, delta: 12,  pop: 1180, sport: 'NFL',  tint: '#3a2a85', accent: '#f7c63a' },
  { id: 12, player: 'Shai Gilgeous-Alexander', year: 2018, set: 'Panini Prizm', num: '#127', grade: 'PSA 10', value: 380, cost: 95, delta: 64, pop: 920, sport: 'NBA', tint: '#0a4d9a', accent: '#fad36a' },
];

// ────────────────────────────────────────────────────────────────
//  Filter bar
// ────────────────────────────────────────────────────────────────
function CollectionFilterBar({ view, onViewChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 24, marginTop: 22,
      paddingBottom: 18, borderBottom: '1px solid ' + st.rule,
    }}>
      <div>
        <Eyebrow>View</Eyebrow>
        <div style={{ display: 'flex', gap: 0, marginTop: 6, border: '1px solid ' + st.rule, borderRadius: 4 }}>
          {['Grid', 'Table'].map((v, i) => (
            <button key={v} onClick={() => onViewChange(v.toLowerCase())} style={{
              padding: '7px 14px', background: view === v.toLowerCase() ? st.ink : 'transparent',
              color: view === v.toLowerCase() ? st.bg : st.ink2,
              border: 'none', cursor: 'pointer',
              fontFamily: st.sans, fontSize: 12, fontWeight: 500,
              borderRight: i === 0 ? '1px solid ' + st.rule : 'none',
            }}>{v}</button>
          ))}
        </div>
      </div>
      {[
        { label: 'Sport',    options: ['All', 'NBA · 142', 'NFL · 38', 'MLB · 47', 'WNBA · 20'] },
        { label: 'Company',  options: ['All', 'PSA · 62', 'BGS · 14', 'SGC · 8', 'Raw · 163'] },
        { label: 'Sort',     options: ['Value ↓', 'Recent', 'Player A–Z', 'Grade ↓'] },
      ].map(g => (
        <div key={g.label}>
          <Eyebrow>{g.label}</Eyebrow>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {g.options.slice(0, 2).map((opt, i) => (
              <button key={opt} style={{
                padding: '7px 12px', borderRadius: 4,
                background: i === 0 ? st.ink : 'transparent',
                color: i === 0 ? st.bg : st.ink2,
                border: '1px solid ' + (i === 0 ? st.ink : st.rule),
                fontFamily: st.sans, fontSize: 12, fontWeight: 400, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}>{opt}</button>
            ))}
            {g.options.length > 2 && (
              <span style={{
                padding: '7px 0', fontFamily: st.mono, fontSize: 10, color: st.ink3,
                letterSpacing: 1, alignSelf: 'center',
              }}>+{g.options.length - 2}</span>
            )}
          </div>
        </div>
      ))}
      <div style={{ flex: 1 }}/>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        border: '1px solid ' + st.rule, borderRadius: 6,
        fontFamily: st.mono, fontSize: 11, color: st.ink3,
      }}>
        <Icon.search style={{ width: 12, height: 12 }}/>
        <span>Search this collection</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Grid card — slab + meta
// ────────────────────────────────────────────────────────────────
function CollectionCard({ h }) {
  return (
    <div style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
        <Slab holding={h} width={170} height={255} flavor="light"/>
      </div>
      <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1.2 }}>
        {h.sport} · {h.grade.toUpperCase()}
      </div>
      <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 19, marginTop: 4, lineHeight: 1.1 }}>
        {h.player}
      </div>
      <div style={{ fontSize: 12, color: st.ink2, marginTop: 2 }}>
        {h.year} {h.set} {h.num}
      </div>
      <Rule color={st.ruleSoft} style={{ margin: '10px 0' }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: st.serif, fontSize: 20, fontStyle: 'italic' }}>${h.value.toLocaleString()}</span>
        <span style={{
          fontFamily: st.mono, fontSize: 11,
          color: h.delta >= 0 ? st.pos : st.neg,
        }}>{h.delta >= 0 ? '+' : '−'}${Math.abs(h.delta)}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Grid view
// ────────────────────────────────────────────────────────────────
function CollectionGrid() {
  const [view, setView] = React.useState('grid');
  return (
    <>
      {/* Masthead */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <Eyebrow>Your collection · Volume IX</Eyebrow>
          <div style={{
            fontFamily: st.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
          }}>
            Two hundred forty-seven <span style={{ fontStyle: 'italic', color: st.accent }}>cards.</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {[
            { label: 'Graded', value: '84' },
            { label: 'Raw',    value: '163' },
            { label: 'Total value', value: '$18,420' },
            { label: 'Unrealized', value: '+$4,220', positive: true },
          ].map(s => (
            <div key={s.label}>
              <Eyebrow>{s.label}</Eyebrow>
              <div style={{
                fontFamily: st.serif, fontSize: 28, fontStyle: 'italic', marginTop: 4,
                color: s.positive ? st.pos : st.ink,
              }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <CollectionFilterBar view={view} onViewChange={setView}/>

      {view === 'grid' ? (
        <div style={{
          marginTop: 28,
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 28, columnGap: 18,
        }}>
          {COLLECTION_CARDS.slice(0, 10).map(h => (
            <CollectionCard key={h.id} h={h}/>
          ))}
        </div>
      ) : (
        <div style={{ marginTop: 28 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 120px 90px', gap: 16,
            padding: '10px 0', fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1.4,
            borderBottom: '1px solid ' + st.rule,
          }}>
            <div>#</div><div>CARD</div><div>GRADE</div><div>SPORT</div><div>VALUE</div>
            <div style={{ textAlign: 'right' }}>1W Δ</div>
          </div>
          {COLLECTION_CARDS.slice(0, 10).map((h, i) => (
            <div key={h.id} style={{
              display: 'grid', gridTemplateColumns: '32px 1fr 110px 110px 120px 90px', gap: 16,
              padding: '16px 0', alignItems: 'center', borderBottom: '1px solid ' + st.ruleSoft,
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
              <span style={{ fontFamily: st.mono, fontSize: 12, color: st.ink2 }}>{h.sport}</span>
              <span style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 20 }}>${h.value.toLocaleString()}</span>
              <span style={{ fontFamily: st.mono, fontSize: 12, textAlign: 'right', color: h.delta >= 0 ? st.pos : st.neg }}>
                {h.delta >= 0 ? '+' : '−'}${Math.abs(h.delta)}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ────────────────────────────────────────────────────────────────
//  Card detail view
// ────────────────────────────────────────────────────────────────
function CollectionDetail() {
  const h = COLLECTION_CARDS[0]; // Doncic
  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: st.ink2 }}>
        <span style={{ cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: st.rule }}>
          Collection
        </span>
        <Icon.chevron style={{ color: st.ink3 }}/>
        <span>{h.player}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: 40, alignItems: 'flex-start' }}>
        {/* Slab hero + gallery */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 18px' }}>
            <Slab holding={h} width={260} height={390} flavor="light"/>
          </div>
          <Eyebrow>Gallery · 3 photos</Eyebrow>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                aspectRatio: '7/10', borderRadius: 3, overflow: 'hidden',
                background: `linear-gradient(135deg, ${h.tint}, ${h.tint}aa)`,
                border: i === 0 ? '2px solid ' + st.ink : '1px solid ' + st.rule,
              }}/>
            ))}
            <div style={{
              aspectRatio: '7/10', borderRadius: 3,
              border: '1px dashed ' + st.rule, background: st.surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.ink3,
              fontFamily: st.mono, fontSize: 22,
            }}>+</div>
          </div>
          <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, marginTop: 8, letterSpacing: 0.4 }}>
            UP TO 10 · FRONT, BACK, CLOSE-UPS
          </div>
        </div>

        {/* Main info */}
        <div>
          <Eyebrow color={st.accent}>● ON YOUR WANT LIST WHEN YOU GOT IT · IN COLLECTION 14 FEB 2026</Eyebrow>
          <div style={{
            fontFamily: st.serif, fontSize: 60, lineHeight: 0.98, letterSpacing: -1.5, marginTop: 14,
          }}>
            Luka <span style={{ fontStyle: 'italic', color: st.accent }}>Dončić.</span>
          </div>
          <div style={{ fontSize: 15, color: st.ink2, marginTop: 8 }}>
            2018 Panini Prizm Silver RC · #280 · NBA
          </div>

          {/* Editable fields */}
          <div style={{
            marginTop: 28, background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4,
          }}>
            {[
              { label: 'Grade',        value: 'PSA 10 · Gem Mint',     edit: true },
              { label: 'Cert number',  value: '48029174',              mono: true },
              { label: 'Pop @ grade',  value: '1,842',                 mono: true, sub: 'POP HIGHER 0 · SNAPSHOT 19 MAY 03:14' },
              { label: 'Parallel',     value: '— None',                edit: true },
              { label: 'Purchase',     value: '$720 · 14 Feb 2026',    sub: 'SOURCE: EBAY · BIN' },
              { label: 'Current value',value: '$1,850',                edit: true, italic: true, sub: '+$130 1W · +$1,130 ALL TIME' },
              { label: 'Notes',        value: 'Centered. Acquired from a comc consolidation. Bought just before the playoffs.', long: true },
            ].map((f, i) => (
              <div key={f.label} style={{
                display: 'grid', gridTemplateColumns: '140px 1fr 60px', gap: 18,
                padding: '16px 22px', alignItems: 'baseline',
                borderBottom: i < 6 ? '1px solid ' + st.ruleSoft : 'none',
              }}>
                <Eyebrow>{f.label}</Eyebrow>
                <div>
                  <div style={{
                    fontFamily: f.mono ? st.mono : f.italic ? st.serif : st.sans,
                    fontStyle: f.italic ? 'italic' : 'normal',
                    fontSize: f.italic ? 26 : 14,
                    color: st.ink, lineHeight: 1.4,
                  }}>{f.value}</div>
                  {f.sub && (
                    <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, marginTop: 4, letterSpacing: 0.4 }}>
                      {f.sub}
                    </div>
                  )}
                </div>
                {f.edit && (
                  <span style={{
                    fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1,
                    textAlign: 'right', cursor: 'pointer',
                  }}>EDIT</span>
                )}
              </div>
            ))}
          </div>

          {/* Last sale strip */}
          <div style={{
            marginTop: 16, padding: '18px 22px',
            background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <Eyebrow>Comp window · 90d eBay</Eyebrow>
              <Eyebrow>14 SALES</Eyebrow>
            </div>
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 18 }}>
              <div>
                <div style={{ fontFamily: st.serif, fontSize: 36, fontStyle: 'italic', lineHeight: 1 }}>
                  $1,850
                </div>
                <div style={{ fontFamily: st.mono, fontSize: 11, color: st.pos, marginTop: 4 }}>
                  LAST · 14 MAY
                </div>
              </div>
              <div style={{ flex: 1, paddingTop: 4 }}>
                <div style={{ height: 4, background: st.ruleSoft, borderRadius: 2, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '22%', right: '10%', height: '100%', background: st.ink, borderRadius: 2 }}/>
                  <div style={{ position: 'absolute', left: '76%', top: -3, width: 2, height: 10, background: st.accent }}/>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: st.mono, fontSize: 10, color: st.ink3, marginTop: 6 }}>
                  <span>$1,680 LO</span><span>MEDIAN $1,790</span><span>$1,990 HI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right rail — actions + activity */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button style={{
              padding: '12px 16px', background: st.ink, color: st.bg, border: 'none', borderRadius: 4,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
            }}>
              <Icon.add style={{ width: 14, height: 14 }}/> Update value
            </button>
            <button style={{
              padding: '12px 16px', background: 'transparent', color: st.ink, border: '1px solid ' + st.rule, borderRadius: 4,
              fontSize: 13, cursor: 'pointer',
            }}>Mark as sold</button>
            <button style={{
              padding: '12px 16px', background: 'transparent', color: st.neg, border: '1px solid ' + st.rule, borderRadius: 4,
              fontSize: 13, cursor: 'pointer',
            }}>Delete card</button>
          </div>

          <div style={{ marginTop: 32 }}>
            <Eyebrow>Activity · this card</Eyebrow>
            <div style={{ marginTop: 14 }}>
              {[
                { dt: '14 MAY', type: 'VALUE',  text: 'Updated value', meta: '$1,720 → $1,850' },
                { dt: '02 MAY', type: 'PHOTO',  text: 'Added back photo', meta: '' },
                { dt: '21 APR', type: 'VALUE',  text: 'Updated value', meta: '$1,620 → $1,720' },
                { dt: '14 FEB', type: 'ADDED',  text: 'Added to collection', meta: 'via scanner · cert 48029174' },
              ].map((a, i) => (
                <div key={i} style={{
                  padding: '10px 0', borderBottom: i < 3 ? '1px solid ' + st.ruleSoft : 'none',
                  display: 'grid', gridTemplateColumns: '50px 1fr', gap: 12,
                }}>
                  <span style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 0.8 }}>{a.dt}</span>
                  <div>
                    <div style={{ fontFamily: st.mono, fontSize: 9, color: st.accent, letterSpacing: 1.2 }}>
                      {a.type}
                    </div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{a.text}</div>
                    {a.meta && (
                      <div style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, marginTop: 2 }}>{a.meta}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ────────────────────────────────────────────────────────────────
//  Wrapper
// ────────────────────────────────────────────────────────────────
function CollectionDesktop({ initialView = 'grid' }) {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: st.bg, color: st.ink, fontFamily: st.sans }}>
      <SharedNav active="Collection"/>
      <div style={{ padding: '36px 36px 24px' }}>
        {initialView === 'detail' ? <CollectionDetail/> : <CollectionGrid/>}
        <PageFooter
          left="COLLECTORS TOOLKIT · COLLECTION · 247 CARDS"
          right="SCANS 1/10 · GRADES 0/10 · POP REFRESHED 03:14"
        />
      </div>
    </div>
  );
}

Object.assign(window, { CollectionDesktop });
