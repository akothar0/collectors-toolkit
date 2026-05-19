// sets.jsx — Set completion tracker detail view.

const SET_DETAIL = {
  name: '2024 Topps Chrome',
  year: 2024, manufacturer: 'Topps', sport: 'NBA',
  total: 220, owned: 184,
  started: '14 Feb 2026',
  needed: [3, 7, 22, 41, 54, 61, 88, 92, 107, 118, 134, 142, 159, 167, 178, 191, 202, 209, 211, 214, 216, 217, 218, 219],
};

// Mock card titles for the "needed" list — just descriptive
const NEEDED_PLAYERS = {
  3: 'Stephon Castle RC',
  7: 'Reed Sheppard RC',
  22: 'Bub Carrington RC',
  41: 'Donovan Clingan RC',
  54: 'Zaccharie Risacher RC',
  61: 'Tidjane Salaün RC',
  88: 'Alex Sarr RC',
  92: 'Yves Missi RC',
  107: 'Devin Carter RC',
  118: 'Rob Dillingham RC',
  134: 'Cody Williams RC',
  142: 'Dalton Knecht RC',
  159: 'Matas Buzelis RC',
  167: 'Ja\'Kobe Walter RC',
  178: 'Kyle Filipowski RC',
  191: 'Pacôme Dadiet RC',
  202: 'KJ Simpson RC',
  209: 'AJ Johnson RC',
};

function SetsDesktop() {
  const sp = SET_DETAIL;
  const pctComplete = (sp.owned / sp.total) * 100;
  return (
    <div style={{ width: '100%', minHeight: '100%', background: st.bg, color: st.ink, fontFamily: st.sans }}>
      <SharedNav active="Sets"/>
      <div style={{ padding: '36px 36px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 12, color: st.ink2 }}>
          <span style={{ textDecoration: 'underline', textUnderlineOffset: 4, textDecorationColor: st.rule }}>Sets</span>
          <Icon.chevron style={{ color: st.ink3 }}/>
          <span>{sp.name}</span>
        </div>

        {/* Masthead */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <Eyebrow>Building · started 14 Feb 2026</Eyebrow>
            <div style={{
              fontFamily: st.serif, fontSize: 56, lineHeight: 1.0, letterSpacing: -1.2, marginTop: 6,
            }}>
              {sp.name}. <span style={{ fontStyle: 'italic', color: st.accent }}>{sp.owned} of {sp.total}.</span>
            </div>
            <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 20, color: st.ink2, marginTop: 10, maxWidth: 600 }}>
              Thirty-six rookies to hunt. Most of them have shown up on eBay this month at fair prices.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Eyebrow>Complete</Eyebrow>
            <div style={{
              fontFamily: st.serif, fontSize: 88, lineHeight: 0.95, marginTop: 4,
              fontStyle: 'italic', color: st.accent, letterSpacing: -2,
            }}>{Math.round(pctComplete)}<span style={{ color: st.ink3, fontSize: 36 }}>%</span></div>
          </div>
        </div>

        <Rule style={{ margin: '28px 0 24px' }}/>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 36, marginBottom: 32 }}>
          {[
            { label: 'Owned',           value: sp.owned.toString(),          serif: true },
            { label: 'Needed',          value: (sp.total - sp.owned).toString(), serif: true, italic: true, color: st.accent },
            { label: 'Avg add / week',  value: '3.8',                         serif: true, italic: true },
            { label: 'Est. complete',   value: '~9 weeks',                    sans: true },
            { label: 'Total spent',     value: '$1,420',                      serif: true },
            { label: 'Last pull',       value: '5 days ago',                  sans: true },
          ].map(s => (
            <div key={s.label}>
              <Eyebrow>{s.label}</Eyebrow>
              <div style={{
                fontFamily: s.sans ? st.sans : st.serif,
                fontStyle: s.italic ? 'italic' : 'normal',
                fontSize: s.sans ? 22 : 32,
                color: s.color || st.ink, marginTop: 4, lineHeight: 1,
              }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Two-column main */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 36 }}>
          {/* The grid — every card slot */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic' }}>The grid</div>
              <Eyebrow>Click a slot to toggle owned</Eyebrow>
            </div>
            <div style={{
              background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4, padding: 22,
            }}>
              {/* Legend */}
              <div style={{
                display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center',
                fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 1,
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 14, background: st.ink, borderRadius: 1 }}/>OWNED · 184
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 14, background: st.accent, borderRadius: 1 }}/>NEEDED · 36
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 14, background: st.surface2, border: '1px solid ' + st.rule, borderRadius: 1 }}/>
                  EMPTY
                </span>
                <div style={{ flex: 1 }}/>
                <span>HOVER FOR CARD #</span>
              </div>
              {/* The 220 grid */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 4,
              }}>
                {Array.from({ length: sp.total }).map((_, i) => {
                  const cardNum = i + 1;
                  const needed = sp.needed.includes(cardNum);
                  return (
                    <div key={cardNum} title={`#${cardNum}${needed ? ' · NEEDED' : ' · owned'}`}
                      style={{
                        aspectRatio: '7/10',
                        background: needed ? st.accent : st.ink,
                        borderRadius: 2,
                        position: 'relative',
                        cursor: 'pointer',
                      }}>
                      {needed && (
                        <span style={{
                          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontFamily: st.mono, fontSize: 9, fontWeight: 700,
                        }}>{cardNum}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Needed list */}
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: st.serif, fontSize: 28, fontStyle: 'italic' }}>Still hunting</div>
              <Eyebrow>36 left</Eyebrow>
            </div>
            <div style={{ background: st.surface, border: '1px solid ' + st.rule, borderRadius: 4 }}>
              {sp.needed.slice(0, 12).map((num, i) => (
                <div key={num} style={{
                  display: 'grid', gridTemplateColumns: '60px 1fr 32px', gap: 12,
                  padding: '14px 18px', alignItems: 'center',
                  borderBottom: i < 11 ? '1px solid ' + st.ruleSoft : 'none',
                }}>
                  <span style={{ fontFamily: st.mono, fontSize: 11, color: st.accent, letterSpacing: 0.6, fontWeight: 600 }}>
                    #{String(num).padStart(3, '0')}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, color: st.ink }}>{NEEDED_PLAYERS[num] || `Card #${num}`}</div>
                    <div style={{ fontFamily: st.mono, fontSize: 10, color: st.ink3, letterSpacing: 0.4, marginTop: 3 }}>
                      EBAY · WHATNOT · FANATICS
                    </div>
                  </div>
                  <Icon.chevron style={{ color: st.ink3 }}/>
                </div>
              ))}
              <div style={{
                padding: '14px 18px', fontFamily: st.mono, fontSize: 11, color: st.ink3,
                letterSpacing: 0.4, textAlign: 'center', background: st.surface2,
              }}>
                +24 MORE · SHOW ALL →
              </div>
            </div>

            {/* Quick action card */}
            <div style={{
              marginTop: 14, padding: '18px 22px',
              background: st.surface2, border: '1px dashed ' + st.rule, borderRadius: 4,
            }}>
              <Eyebrow color={st.accent}>Speed up the hunt</Eyebrow>
              <div style={{ fontFamily: st.serif, fontStyle: 'italic', fontSize: 18, marginTop: 6, lineHeight: 1.3 }}>
                Add the whole list to your want list — we'll alert when a comp drops below target.
              </div>
              <button style={{
                marginTop: 12, padding: '8px 14px',
                background: st.ink, color: st.bg, border: 'none', borderRadius: 4,
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}>Add 36 to want list →</button>
            </div>
          </div>
        </div>

        <PageFooter
          left={"COLLECTORS TOOLKIT · SETS · " + sp.name.toUpperCase()}
          right="MASTER CHECKLIST · TOPPS · 220 BASE"
        />
      </div>
    </div>
  );
}

Object.assign(window, { SetsDesktop });
