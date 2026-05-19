// variation-a.jsx — Editorial / Restrained
// Warm paper bg, ink black, serif italic display, single cinnabar accent.
// Financial-statement composure. Typography & rules do the work.

const editorialTokens = {
  bg: '#f6f4ef',
  surface: '#ffffff',
  ink: '#14110d',
  ink2: '#5c594f',
  ink3: '#8a867b',
  rule: '#e4e0d5',
  ruleSoft: '#efeae0',
  accent: '#b8531a',
  pos: '#2f6f4a',
  neg: '#b23a2e',
  serif: 'Instrument Serif, "Times New Roman", serif',
  sans: 'Geist, -apple-system, sans-serif',
  mono: 'Geist Mono, ui-monospace, monospace',
};

// ────────────────────────────────────────────────────────────────
//  Atoms
// ────────────────────────────────────────────────────────────────
function ARule({ vertical = false, color = editorialTokens.rule, style = {} }) {
  return <div style={{
    background: color,
    width: vertical ? 1 : '100%',
    height: vertical ? '100%' : 1,
    ...style,
  }}/>;
}

function AEyebrow({ children, style = {} }) {
  return <div style={{
    fontFamily: editorialTokens.mono, fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', color: editorialTokens.ink3, ...style,
  }}>{children}</div>;
}

function ANavBar({ active = 'Home', onCapture }) {
  const items = ['Home', 'Scanner', 'Grader', 'Collection', 'Portfolio', 'Want list', 'Sets', 'Import'];
  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center', padding: '0 36px',
      borderBottom: '1px solid ' + editorialTokens.rule, background: editorialTokens.bg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 4, background: editorialTokens.ink,
          color: editorialTokens.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: editorialTokens.serif, fontStyle: 'italic', fontSize: 16, fontWeight: 500,
        }}>c</div>
        <div style={{
          fontFamily: editorialTokens.sans, fontSize: 14, fontWeight: 500, color: editorialTokens.ink,
          letterSpacing: -0.2,
        }}>Collectors Toolkit</div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginLeft: 36 }}>
        {items.map(it => (
          <div key={it} style={{
            padding: '6px 12px', fontSize: 13, fontFamily: editorialTokens.sans,
            color: it === active ? editorialTokens.ink : editorialTokens.ink2,
            position: 'relative', cursor: 'pointer',
          }}>
            {it}
            {it === active && <div style={{
              position: 'absolute', bottom: -19, left: 12, right: 12, height: 1,
              background: editorialTokens.ink,
            }}/>}
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}/>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
          border: '1px solid ' + editorialTokens.rule, borderRadius: 6,
          fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink3,
        }}>
          <Icon.search style={{ width: 12, height: 12 }}/>
          <span>Search collection</span>
          <span style={{ color: editorialTokens.ink3, marginLeft: 24 }}>⌘K</span>
        </div>
        <button onClick={onCapture} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: editorialTokens.ink, color: editorialTokens.bg, border: 'none',
          padding: '8px 14px', borderRadius: 6, cursor: 'pointer',
          fontFamily: editorialTokens.sans, fontSize: 13, fontWeight: 500,
        }}>
          <Icon.camera style={{ width: 14, height: 14 }}/> Capture
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: editorialTokens.accent,
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: editorialTokens.sans, fontSize: 11, fontWeight: 600,
        }}>M</div>
      </div>
    </div>
  );
}

function AStatCell({ label, value, sub, delta, deltaPct, last = false, big = false }) {
  return (
    <div style={{
      flex: 1, padding: '20px 24px',
      borderRight: last ? 'none' : '1px solid ' + editorialTokens.rule,
    }}>
      <AEyebrow>{label}</AEyebrow>
      <div style={{
        fontFamily: editorialTokens.serif, fontSize: big ? 56 : 44, lineHeight: 1.0,
        marginTop: 12, color: editorialTokens.ink, fontWeight: 400, letterSpacing: -0.5,
      }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
        {delta !== undefined && (
          <div style={{
            fontFamily: editorialTokens.mono, fontSize: 11, color: delta >= 0 ? editorialTokens.pos : editorialTokens.neg,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            {delta >= 0 ? <Icon.arrowUp/> : <Icon.arrowDown/>}
            {money(delta)} {deltaPct !== undefined && <span style={{ color: editorialTokens.ink3 }}>· {pct(deltaPct)}</span>}
          </div>
        )}
        {sub && <div style={{ fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Holdings table
// ────────────────────────────────────────────────────────────────
function AHoldings() {
  const totalValue = TOP_HOLDINGS.reduce((s, h) => s + h.value, 0);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 0 14px' }}>
        <div style={{ fontFamily: editorialTokens.serif, fontSize: 28, fontStyle: 'italic', color: editorialTokens.ink }}>
          Top holdings
        </div>
        <AEyebrow>6 of 247 cards · By current value</AEyebrow>
      </div>
      <ARule/>
      <div style={{
        display: 'grid', gridTemplateColumns: '32px 1fr 110px 120px 150px 90px', gap: 16,
        padding: '10px 0', fontFamily: editorialTokens.mono, fontSize: 10,
        color: editorialTokens.ink3, letterSpacing: 1.4,
      }}>
        <div>#</div><div>CARD</div><div>GRADE</div><div>VALUE</div><div>WEIGHT</div><div style={{ textAlign: 'right' }}>1W Δ</div>
      </div>
      <ARule color={editorialTokens.ruleSoft}/>
      {TOP_HOLDINGS.map((h, i) => (
        <div key={h.id} style={{
          display: 'grid', gridTemplateColumns: '32px 1fr 110px 120px 150px 90px', gap: 16,
          padding: '18px 0', alignItems: 'center',
          borderBottom: '1px solid ' + editorialTokens.ruleSoft, cursor: 'pointer',
        }}>
          <div style={{ fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink3 }}>
            {String(i+1).padStart(2,'0')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Slab holding={h} width={36} height={54} flavor="light" showLabel={false}/>
            <div>
              <div style={{ fontFamily: editorialTokens.serif, fontSize: 18, color: editorialTokens.ink, lineHeight: 1.15 }}>
                {h.player}
              </div>
              <div style={{ fontFamily: editorialTokens.sans, fontSize: 12, color: editorialTokens.ink2, marginTop: 2 }}>
                {h.year} {h.set} {h.num}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: editorialTokens.mono, fontSize: 12, color: editorialTokens.ink, letterSpacing: 0.5 }}>
            {h.grade}
            {h.pop && <div style={{ color: editorialTokens.ink3, fontSize: 10, marginTop: 2 }}>POP {h.pop.toLocaleString()}</div>}
          </div>
          <div>
            <div style={{ fontFamily: editorialTokens.serif, fontSize: 22, color: editorialTokens.ink, fontStyle: 'italic' }}>
              {money(h.value)}
            </div>
            <div style={{ fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.ink3, marginTop: 2 }}>
              cost {money(h.cost)}
            </div>
          </div>
          <div>
            <div style={{ height: 4, background: editorialTokens.ruleSoft, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${(h.value / totalValue) * 100}%`, height: '100%',
                background: editorialTokens.ink,
              }}/>
            </div>
            <div style={{ fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.ink3, marginTop: 6 }}>
              {((h.value / totalValue) * 100).toFixed(1)}%
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontFamily: editorialTokens.mono, fontSize: 12,
              color: h.delta >= 0 ? editorialTokens.pos : editorialTokens.neg,
            }}>{h.delta >= 0 ? '+' : '−'}{money(Math.abs(h.delta))}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Sidebar: today / want / set
// ────────────────────────────────────────────────────────────────
function ATodayCard() {
  return (
    <div style={{
      background: editorialTokens.surface, border: '1px solid ' + editorialTokens.rule,
      borderRadius: 4, padding: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <AEyebrow>Today · 19 May</AEyebrow>
        <div style={{ fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.accent }}>2 NUDGES</div>
      </div>
      <div style={{
        fontFamily: editorialTokens.serif, fontStyle: 'italic', fontSize: 26, lineHeight: 1.2,
        color: editorialTokens.ink, marginTop: 12,
      }}>
        2 cards from your last <br/> import still need a review.
      </div>
      <div style={{ fontSize: 13, color: editorialTokens.ink2, marginTop: 12, lineHeight: 1.5 }}>
        GPT parsed the Fanatics PDF; two rows came back at medium confidence and will sit in
        the staging table until you confirm.
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button style={{
          background: editorialTokens.ink, color: editorialTokens.bg, border: 'none',
          padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
          fontFamily: editorialTokens.sans, fontSize: 12, fontWeight: 500,
        }}>Review now</button>
        <button style={{
          background: 'transparent', color: editorialTokens.ink2, border: '1px solid ' + editorialTokens.rule,
          padding: '8px 14px', borderRadius: 4, cursor: 'pointer',
          fontFamily: editorialTokens.sans, fontSize: 12,
        }}>Snooze</button>
      </div>
    </div>
  );
}

function AWantList() {
  const [found, setFound] = React.useState({});
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: editorialTokens.serif, fontSize: 22, fontStyle: 'italic', color: editorialTokens.ink }}>
          Hunting
        </div>
        <AEyebrow>4 active</AEyebrow>
      </div>
      <ARule/>
      {WANT.map(w => {
        const isFound = found[w.id];
        return (
          <div key={w.id}
            onClick={() => setFound({ ...found, [w.id]: !found[w.id] })}
            style={{
              padding: '14px 0', borderBottom: '1px solid ' + editorialTokens.ruleSoft,
              cursor: 'pointer', display: 'flex', gap: 12,
              opacity: isFound ? 0.4 : 1, transition: 'opacity .2s',
            }}>
            <div style={{
              width: 14, height: 14, borderRadius: 2, marginTop: 3,
              border: '1.5px solid ' + (isFound ? editorialTokens.accent : editorialTokens.ink3),
              background: isFound ? editorialTokens.accent : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isFound && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 5l2 2 4-5"/></svg>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: editorialTokens.sans, fontSize: 13, color: editorialTokens.ink,
                lineHeight: 1.3, textDecoration: isFound ? 'line-through' : 'none',
              }}>{w.card}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.ink3, letterSpacing: 1 }}>
                  {w.grade.toUpperCase()}
                </span>
                <span style={{ fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink }}>
                  ≤ ${w.target.toLocaleString()}
                </span>
                {w.last && (
                  <span style={{
                    fontFamily: editorialTokens.mono, fontSize: 11,
                    color: w.status === 'under' ? editorialTokens.pos : editorialTokens.neg,
                  }}>
                    last ${w.last.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ASetProgress() {
  const sp = SET_PROGRESS;
  const pct = (sp.owned / sp.total) * 100;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontFamily: editorialTokens.serif, fontSize: 22, fontStyle: 'italic', color: editorialTokens.ink }}>
          Building
        </div>
        <AEyebrow>1 active set</AEyebrow>
      </div>
      <ARule/>
      <div style={{ padding: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontFamily: editorialTokens.sans, fontSize: 14, fontWeight: 500, color: editorialTokens.ink }}>
            {sp.name}
          </div>
          <div style={{ fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink2 }}>
            {sp.owned}<span style={{ color: editorialTokens.ink3 }}>/{sp.total}</span> · {pct.toFixed(0)}%
          </div>
        </div>
        {/* Bit grid — every card slot as a small square */}
        <div style={{
          marginTop: 14,
          display: 'grid', gridTemplateColumns: 'repeat(22, 1fr)', gap: 2,
        }}>
          {sp.ownedMap.map((owned, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 1,
              background: owned ? editorialTokens.ink : editorialTokens.ruleSoft,
            }}/>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 12, color: editorialTokens.ink2, lineHeight: 1.5 }}>
          <span style={{ fontFamily: editorialTokens.mono, color: editorialTokens.accent }}>NEEDED:</span>{' '}
          #3, #7, #22, #41, #54, #61, #88, +29 more
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  Activity timeline
// ────────────────────────────────────────────────────────────────
function AActivity() {
  const typeLabel = { scan: 'SCAN', grade: 'GRADE', import: 'IMPORT', value: 'VALUE', set: 'SET' };
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 0 14px' }}>
        <div style={{ fontFamily: editorialTokens.serif, fontSize: 28, fontStyle: 'italic', color: editorialTokens.ink }}>
          Activity
        </div>
        <AEyebrow>Last 5 days</AEyebrow>
      </div>
      <ARule/>
      {ACTIVITY.map(a => (
        <div key={a.id} style={{
          display: 'grid', gridTemplateColumns: '80px 80px 1fr 200px', gap: 16,
          padding: '18px 0', borderBottom: '1px solid ' + editorialTokens.ruleSoft, alignItems: 'baseline',
        }}>
          <div style={{ fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink3, letterSpacing: 1 }}>
            {a.dt}
          </div>
          <div style={{
            fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.accent, letterSpacing: 1.4,
          }}>{typeLabel[a.type]}</div>
          <div>
            <div style={{ fontFamily: editorialTokens.sans, fontSize: 14, color: editorialTokens.ink, fontWeight: 500 }}>
              {a.title}
            </div>
            <div style={{ fontFamily: editorialTokens.sans, fontSize: 13, color: editorialTokens.ink2, marginTop: 2 }}>
              {a.detail}
            </div>
          </div>
          <div style={{
            fontFamily: editorialTokens.mono, fontSize: 11, color: editorialTokens.ink2, textAlign: 'right',
          }}>{a.meta}</div>
        </div>
      ))}
    </div>
  );
}

function AToolRail({ onCapture }) {
  const tools = [
    { icon: <Icon.scan/>,       label: 'Scan slab',    sub: 'PSA · BGS · SGC',      shortcut: 'S', onClick: onCapture },
    { icon: <Icon.grade/>,      label: 'Grade raw',    sub: 'GPT-4o vision · sub-grades', shortcut: 'G' },
    { icon: <Icon.add/>,        label: 'Add manually', sub: 'Player + grade · ~30s', shortcut: 'A' },
    { icon: <Icon.import/>,     label: 'Import',       sub: 'eBay · Fanatics · paste', shortcut: 'I' },
  ];
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0,
      border: '1px solid ' + editorialTokens.rule, borderRadius: 4, overflow: 'hidden',
      background: editorialTokens.surface,
    }}>
      {tools.map((t, i) => (
        <button key={i} onClick={t.onClick} style={{
          padding: '20px 22px', textAlign: 'left',
          borderRight: i < 3 ? '1px solid ' + editorialTokens.rule : 'none',
          background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            color: editorialTokens.ink,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {t.icon}
              <span style={{ fontFamily: editorialTokens.sans, fontSize: 14, fontWeight: 500 }}>{t.label}</span>
            </div>
            <span style={{
              fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.ink3,
              border: '1px solid ' + editorialTokens.rule, borderRadius: 3, padding: '1px 5px',
            }}>{t.shortcut}</span>
          </div>
          <div style={{ fontFamily: editorialTokens.mono, fontSize: 10, color: editorialTokens.ink3, letterSpacing: 0.5 }}>
            {t.sub.toUpperCase()}
          </div>
        </button>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  DESKTOP
// ────────────────────────────────────────────────────────────────
function VariationADesktop() {
  const [capture, setCapture] = React.useState(false);
  const t = editorialTokens;
  return (
    <div style={{
      width: '100%', height: '100%', overflow: 'hidden', position: 'relative',
      background: t.bg, color: t.ink, fontFamily: t.sans,
    }}>
      <ANavBar active="Home" onCapture={() => setCapture(true)}/>

      <div style={{ padding: '36px 36px 24px' }}>
        {/* Page header — newspaper masthead */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <AEyebrow>Volume IX · Monday 19 May 2026</AEyebrow>
            <div style={{
              fontFamily: t.serif, fontSize: 64, lineHeight: 1.0, marginTop: 4,
              color: t.ink, letterSpacing: -1.5,
            }}>
              <span>Good morning, </span>
              <span style={{ fontStyle: 'italic', color: t.accent }}>Marcus.</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <AEyebrow>The book today</AEyebrow>
            <div style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 17, color: t.ink2, marginTop: 6, lineHeight: 1.5, maxWidth: 320 }}>
              Up <span style={{ color: t.pos, fontStyle: 'normal', fontFamily: t.mono }}>+$312</span> on the
              week — mostly Wembanyama. The Doncic Prizm 10 is at a 12-month high.
            </div>
          </div>
        </div>

        {/* Stat strip */}
        <div style={{
          marginTop: 28, border: '1px solid ' + t.rule, borderRadius: 4,
          background: t.surface, display: 'flex',
        }}>
          <AStatCell label="Total value" value={money(PORTFOLIO.totalValue)}
                     delta={PORTFOLIO.weekDelta} deltaPct={PORTFOLIO.weekDeltaPct} big/>
          <AStatCell label="Unrealized P/L" value={money(PORTFOLIO.unrealized)}
                     sub={pct(PORTFOLIO.unrealizedPct) + ' vs cost'} delta={PORTFOLIO.monthDelta} deltaPct={PORTFOLIO.monthDeltaPct}/>
          <AStatCell label="Cost basis" value={money(PORTFOLIO.costBasis)}
                     sub={`${PORTFOLIO.cardCount} cards · avg ${money(PORTFOLIO.costBasis/PORTFOLIO.cardCount)}`}/>
          <AStatCell label="Distribution" value={`${PORTFOLIO.graded}/${PORTFOLIO.raw}`}
                     sub="GRADED / RAW" last/>
        </div>

        {/* Tools rail */}
        <div style={{ marginTop: 16 }}>
          <AToolRail onCapture={() => setCapture(true)}/>
        </div>

        {/* Main grid */}
        <div style={{
          marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 340px', gap: 36,
        }}>
          <div>
            <AHoldings/>
            <div style={{ marginTop: 36 }}>
              <AActivity/>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <ATodayCard/>
            <AWantList/>
            <ASetProgress/>
          </div>
        </div>

        {/* Footer rule */}
        <div style={{
          marginTop: 36, paddingTop: 18, borderTop: '1px solid ' + t.rule,
          display: 'flex', justifyContent: 'space-between',
          fontFamily: t.mono, fontSize: 10, color: t.ink3, letterSpacing: 1.4,
        }}>
          <span>COLLECTORS TOOLKIT · v1.0 · BUILT FOR THE HOBBY</span>
          <span>SCANS 1/10 · GRADES 0/10 · IMPORTS 1/100</span>
        </div>
      </div>

      <CaptureModal open={capture} onClose={() => setCapture(false)} theme="light"/>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
//  MOBILE — Variation A
// ────────────────────────────────────────────────────────────────
function VariationAMobile() {
  const [capture, setCapture] = React.useState(false);
  const t = editorialTokens;
  return (
    <IOSDevice width={390} height={844} dark={false}>
      <div style={{
        position: 'relative', width: '100%', height: '100%', overflow: 'hidden',
        background: t.bg, color: t.ink, fontFamily: t.sans,
        paddingTop: 50,
      }}>
        {/* App bar */}
        <div style={{
          padding: '0 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 4, background: t.ink,
              color: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.serif, fontStyle: 'italic', fontSize: 15,
            }}>c</div>
            <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: -0.2 }}>Toolkit</div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', color: t.ink2 }}>
            <Icon.search/>
            <Icon.bell/>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', background: t.accent,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
            }}>M</div>
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{
          height: 'calc(100% - 64px - 78px)', overflowY: 'auto', overflowX: 'hidden',
        }}>
          {/* Masthead */}
          <div style={{ padding: '8px 20px 20px', borderBottom: '1px solid ' + t.rule }}>
            <AEyebrow>Monday 19 May 2026</AEyebrow>
            <div style={{
              fontFamily: t.serif, fontSize: 44, lineHeight: 0.98, marginTop: 4, letterSpacing: -1,
            }}>
              Good morning,{' '}
              <span style={{ fontStyle: 'italic', color: t.accent }}>Marcus.</span>
            </div>
          </div>

          {/* Stat — hero */}
          <div style={{ padding: '24px 20px 20px' }}>
            <AEyebrow>Total value</AEyebrow>
            <div style={{
              fontFamily: t.serif, fontSize: 68, lineHeight: 1.0, marginTop: 8, letterSpacing: -1.5,
            }}>{money(PORTFOLIO.totalValue)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
              <span style={{
                fontFamily: t.mono, fontSize: 12, color: t.pos,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <Icon.arrowUp/> +{money(PORTFOLIO.weekDelta)} · {pct(PORTFOLIO.weekDeltaPct)}
              </span>
              <span style={{ fontFamily: t.mono, fontSize: 11, color: t.ink3 }}>1 WEEK</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: t.ink2, fontStyle: 'italic', fontFamily: t.serif, lineHeight: 1.4 }}>
              Mostly the Wembanyama. The Doncic Prizm 10 is at a 12-month high.
            </div>
          </div>

          <ARule color={t.rule}/>

          {/* Secondary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid ' + t.rule }}>
            <div style={{ padding: '16px 20px', borderRight: '1px solid ' + t.rule }}>
              <AEyebrow>Cards</AEyebrow>
              <div style={{ fontFamily: t.serif, fontSize: 30, marginTop: 6 }}>{PORTFOLIO.cardCount}</div>
              <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ink3, marginTop: 4 }}>
                {PORTFOLIO.graded} GRADED · {PORTFOLIO.raw} RAW
              </div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <AEyebrow>Unrealized P/L</AEyebrow>
              <div style={{ fontFamily: t.serif, fontSize: 30, marginTop: 6, color: t.pos }}>
                {money(PORTFOLIO.unrealized)}
              </div>
              <div style={{ fontFamily: t.mono, fontSize: 10, color: t.ink3, marginTop: 4 }}>
                {pct(PORTFOLIO.unrealizedPct)} VS COST
              </div>
            </div>
          </div>

          {/* Today nudge */}
          <div style={{ padding: '24px 20px', borderBottom: '1px solid ' + t.rule }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <AEyebrow>Today</AEyebrow>
              <div style={{ fontFamily: t.mono, fontSize: 10, color: t.accent }}>2 NUDGES</div>
            </div>
            <div style={{
              fontFamily: t.serif, fontStyle: 'italic', fontSize: 22, lineHeight: 1.2,
              marginTop: 10,
            }}>
              2 cards from your last import still need a review.
            </div>
            <button style={{
              marginTop: 14, padding: '10px 16px', background: t.ink, color: t.bg,
              border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>Review now →</button>
          </div>

          {/* Top holdings — mini */}
          <div style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontFamily: t.serif, fontSize: 24, fontStyle: 'italic' }}>Top holdings</div>
              <AEyebrow>6 of 247</AEyebrow>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {TOP_HOLDINGS.slice(0, 4).map((h, i) => (
                <div key={h.id} style={{
                  display: 'flex', gap: 14, alignItems: 'center',
                  paddingBottom: 14, borderBottom: i < 3 ? '1px solid ' + t.ruleSoft : 'none',
                }}>
                  <Slab holding={h} width={44} height={66} flavor="light"/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: t.serif, fontSize: 17, lineHeight: 1.1 }}>{h.player}</div>
                    <div style={{ fontSize: 11, color: t.ink2, marginTop: 2 }}>
                      {h.year} {h.set} · {h.grade}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 18 }}>{money(h.value)}</div>
                    <div style={{
                      fontFamily: t.mono, fontSize: 10,
                      color: h.delta >= 0 ? t.pos : t.neg,
                    }}>{h.delta >= 0 ? '+' : '−'}${Math.abs(h.delta)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Want strip */}
          <div style={{ padding: '6px 20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: t.serif, fontSize: 24, fontStyle: 'italic' }}>Hunting</div>
              <AEyebrow>4 active</AEyebrow>
            </div>
            {WANT.slice(0, 3).map((w, i) => (
              <div key={w.id} style={{
                padding: '12px 0', borderTop: '1px solid ' + t.ruleSoft,
              }}>
                <div style={{ fontSize: 13 }}>{w.card}</div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4, fontFamily: t.mono, fontSize: 11 }}>
                  <span style={{ color: t.ink3 }}>≤ ${w.target.toLocaleString()}</span>
                  {w.last && (
                    <span style={{ color: w.status === 'under' ? t.pos : t.neg }}>
                      last ${w.last.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{ height: 30 }}/>
        </div>

        {/* Bottom tab bar — editorial */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: t.bg, borderTop: '1px solid ' + t.rule,
          padding: '10px 16px 32px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {[
            { icon: <Icon.collection/>, label: 'Home', active: true },
            { icon: <Icon.portfolio/>,  label: 'Portfolio' },
            null, // spacer for capture
            { icon: <Icon.want/>, label: 'Wants' },
            { icon: <Icon.sets/>, label: 'Sets' },
          ].map((tab, i) => {
            if (!tab) {
              return (
                <button key="cap" onClick={() => setCapture(true)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  height: 52, background: t.ink, color: t.bg, border: 'none', borderRadius: 999,
                  cursor: 'pointer',
                }}>
                  <Icon.camera style={{ width: 22, height: 22 }}/>
                </button>
              );
            }
            return (
              <div key={i} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                color: tab.active ? t.ink : t.ink3,
              }}>
                {tab.icon}
                <div style={{ fontSize: 10, fontFamily: t.mono, letterSpacing: 1 }}>
                  {tab.label.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>

        <CaptureModal open={capture} onClose={() => setCapture(false)} theme="light"/>
      </div>
    </IOSDevice>
  );
}

Object.assign(window, { VariationADesktop, VariationAMobile });
