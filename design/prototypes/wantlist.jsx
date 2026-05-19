// wantlist.jsx — Want list with target prices, comps, and quick fulfil.

const WANT_FULL = [
  { id: 'w1', card: '2018 Panini Prizm Trae Young Silver RC',     num: '#78',      grade: 'PSA 10', target: 240,  last: 215,  status: 'under', note: 'Hot streak after All-Star · prices dipping' },
  { id: 'w2', card: '2003 Topps Chrome LeBron James Refractor RC', num: '#111',     grade: 'BGS 9',  target: 1400, last: 1620, status: 'over',  note: 'Lebron retirement signal · keep watching' },
  { id: 'w3', card: '2024 Bowman Chrome Skenes 1st Auto',          num: '#BCP-PS', grade: 'Raw',    target: 480,  last: 510,  status: 'over',  note: '' },
  { id: 'w4', card: '1986 Fleer Michael Jordan RC',                num: '#57',      grade: 'PSA 7',  target: 1800, last: null, status: 'none',  note: 'PSA 6 acceptable if it surfaces' },
  { id: 'w5', card: '2019 Topps Chrome Update Tatis Jr.',          num: '#86T-25', grade: 'PSA 10', target: 220,  last: 195,  status: 'under', note: '' },
  { id: 'w6', card: '2018 Donruss Optic Trae Young Holo RC',       num: '#198',     grade: 'PSA 10', target: 160,  last: 175,  status: 'over',  note: '' },
];

function WantStatusPill({ status }) {
  const map = {
    under: { bg: '#d6e7dc', fg: st.pos,   text: 'UNDER TARGET' },
    over:  { bg: '#e9d0cb', fg: st.neg,   text: 'OVER TARGET' },
    none:  { bg: st.surface2, fg: st.ink3,text: 'NO COMPS YET' },
  }[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: map.bg, color: map.fg, padding: '4px 10px', borderRadius: 999,
      fontFamily: st.mono, fontSize: 10, fontWeight: 600, letterSpacing: 1.2,
    }}>
      ● {map.text}
    </span>
  );
}

function WantListDesktop() {
  return (
    <div style={{ width: '100%', minHeight: '100%', background: st.bg, color: st.ink, fontFamily: st.sans }}>
      <SharedNav active="Want list"/>
      <div style={{ padding: '36px 36px 24px' }}>
        {/* Masthead */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <Eyebrow>Hunt list · the search</Eyebrow>
            <div style={{
              fontFamily: st.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
            }}>
              Six cards <span style={{ fontStyle: 'italic', color: st.accent }}>worth watching.</span>
            </div>
            <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 20, color: st.ink2, marginTop: 10, maxWidth: 600 }}>
              Two are under target right now. The Jordan rookie hasn't surfaced in 6 weeks.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <div>
              <Eyebrow>Active</Eyebrow>
              <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic', marginTop: 4 }}>6</div>
            </div>
            <div>
              <Eyebrow>Under target</Eyebrow>
              <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic', marginTop: 4, color: st.pos }}>2</div>
            </div>
            <div>
              <Eyebrow>Found this month</Eyebrow>
              <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic', marginTop: 4 }}>3</div>
            </div>
          </div>
        </div>

        <Rule style={{ margin: '24px 0' }}/>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button style={{
            padding: '8px 14px', background: st.ink, color: st.bg, border: 'none', borderRadius: 4,
            fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Icon.add style={{ width: 12, height: 12 }}/> Add a hunt
          </button>
          <button style={{
            padding: '8px 14px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
            fontSize: 12, color: st.ink2, cursor: 'pointer',
          }}>From a card I own</button>
          <button style={{
            padding: '8px 14px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
            fontSize: 12, color: st.ink2, cursor: 'pointer',
          }}>Import from set checklist</button>
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'flex', gap: 4, border: '1px solid ' + st.rule, borderRadius: 4 }}>
            {['ALL', 'UNDER', 'OVER', 'NO COMPS'].map((f, i) => (
              <button key={f} style={{
                padding: '7px 12px', background: i === 0 ? st.ink : 'transparent', color: i === 0 ? st.bg : st.ink2,
                border: 'none', borderRight: i < 3 ? '1px solid ' + st.rule : 'none',
                fontFamily: st.mono, fontSize: 10, letterSpacing: 0.8, cursor: 'pointer',
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Table head */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '20px 1fr 110px 110px 110px 160px 120px',
          gap: 14, padding: '10px 20px',
          background: st.surface2, border: '1px solid ' + st.rule, borderRadius: '4px 4px 0 0',
          fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1.4,
        }}>
          <div></div><div>CARD</div><div>GRADE</div>
          <div style={{ textAlign: 'right' }}>TARGET</div>
          <div style={{ textAlign: 'right' }}>LAST COMP</div>
          <div>STATUS</div><div></div>
        </div>

        {/* Rows */}
        <div style={{ border: '1px solid ' + st.rule, borderTop: 'none', borderRadius: '0 0 4px 4px', background: st.surface }}>
          {WANT_FULL.map((w, i) => (
            <React.Fragment key={w.id}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr 110px 110px 110px 160px 120px',
                gap: 14, padding: '18px 20px', alignItems: 'center',
                borderBottom: w.note || i < WANT_FULL.length - 1 ? '1px solid ' + st.ruleSoft : 'none',
              }}>
                {/* Bullet */}
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: w.status === 'under' ? st.pos : w.status === 'over' ? st.neg : st.ink4,
                }}/>
                {/* Card */}
                <div>
                  <div style={{ fontFamily: st.serif, fontSize: 18, lineHeight: 1.1 }}>{w.card}</div>
                  <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, marginTop: 4, letterSpacing: 0.4 }}>
                    {w.num}
                  </div>
                </div>
                {/* Grade */}
                <span style={{ fontFamily: st.mono, fontSize: 12, color: st.ink }}>
                  {w.grade.toUpperCase()}
                </span>
                {/* Target */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontFamily: st.serif, fontSize: 20, fontStyle: 'italic' }}>
                    ${w.target.toLocaleString()}
                  </span>
                </div>
                {/* Last comp */}
                <div style={{ textAlign: 'right' }}>
                  {w.last ? (
                    <>
                      <div style={{
                        fontFamily: st.serif, fontSize: 20, fontStyle: 'italic',
                        color: w.status === 'under' ? st.pos : st.neg,
                      }}>${w.last.toLocaleString()}</div>
                      <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, marginTop: 2 }}>
                        {w.status === 'under' ? `-${Math.round(((w.target-w.last)/w.target)*100)}%` : `+${Math.round(((w.last-w.target)/w.target)*100)}%`}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontFamily: st.mono, fontSize: 12, color: st.ink3 }}>—</span>
                  )}
                </div>
                {/* Status */}
                <div><WantStatusPill status={w.status}/></div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button style={{
                    padding: '6px 10px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 3,
                    fontFamily: st.mono, fontSize: 10, letterSpacing: 0.8, color: st.ink, cursor: 'pointer',
                  }}>I FOUND IT</button>
                </div>
              </div>
              {w.note && (
                <div style={{
                  padding: '0 20px 14px 42px',
                  borderBottom: i < WANT_FULL.length - 1 ? '1px solid ' + st.ruleSoft : 'none',
                }}>
                  <div style={{
                    fontFamily: st.serif, fontStyle: 'italic', fontSize: 14, color: st.ink2, lineHeight: 1.4,
                  }}>
                    "{w.note}"
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Add-row affordance */}
        <div style={{
          marginTop: 14, padding: '20px 22px',
          background: st.surface2, border: '1px dashed ' + st.rule, borderRadius: 4,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', border: '1.5px solid ' + st.ink3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.ink3,
          }}>
            <Icon.add style={{ width: 14, height: 14 }}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 18 }}>
              Add a card you're hunting.
            </div>
            <div style={{ fontFamily: st.mono, fontSize: 11, color: st.ink3, marginTop: 4, letterSpacing: 0.4 }}>
              DESCRIBE THE CARD · SET TARGET PRICE · OPTIONAL NOTES
            </div>
          </div>
          <button style={{
            padding: '8px 14px', background: 'transparent', border: '1px solid ' + st.rule, borderRadius: 4,
            fontSize: 12, color: st.ink, cursor: 'pointer',
          }}>Quick add</button>
        </div>

        <PageFooter
          left="COLLECTORS TOOLKIT · WANT LIST · 6 ACTIVE"
          right="COMPS REFRESHED FROM EBAY · TARGET ALERTS VIA EMAIL (v2 ROADMAP)"
        />
      </div>
    </div>
  );
}

Object.assign(window, { WantListDesktop });
