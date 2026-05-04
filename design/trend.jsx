// trendzip — Trend Keyword Ranking page

const TREND_TWEAKS = /*EDITMODE-BEGIN*/{
  "generation": "teen"
}/*EDITMODE-END*/;

const TOKENS = {
  bg: '#0a0a0a',
  card: '#1a1a1a',
  border: '#222222',
  text: '#ffffff',
  textDim: '#888888',
  cyan: '#00e5ff',
  pink: '#ff2d9b',
  red: '#ff3b3b',
  green: '#3ddc97',
};

const ROUND = '"Quicksand", "Pretendard", system-ui';
const KOR   = 'Pretendard, system-ui';

// Mock rankings
const TEEN_TRENDS = [
  { rank: 1,  keyword: '뉴진스 슈퍼내추럴', category: '음악',     change: 'up',   delta: 4,    score: '1.2M' },
  { rank: 2,  keyword: '신조어 챌린지',     category: '엔터',     change: 'new',                score: '982K' },
  { rank: 3,  keyword: 'RIIZE 콘서트',      category: '음악',     change: 'up',   delta: 1,    score: '871K' },
  { rank: 4,  keyword: 'Y2K 후드',          category: '패션',     change: 'down', delta: 2,    score: '624K' },
  { rank: 5,  keyword: '편의점 신상',       category: '먹방',     change: 'up',   delta: 6,    score: '512K' },
  { rank: 6,  keyword: '지락실3',           category: '예능',     change: 'down', delta: 1,    score: '487K' },
  { rank: 7,  keyword: '아이브 무대',       category: '음악',     change: 'new',                score: '402K' },
  { rank: 8,  keyword: '플레이브 라이브',   category: '음악',     change: 'up',   delta: 3,    score: '361K' },
];

const TWENTY_TRENDS = [
  { rank: 1,  keyword: '월급 통장 쪼개기', category: '재테크',   change: 'up',   delta: 2,    score: '1.5M' },
  { rank: 2,  keyword: '도쿄 vlog',        category: '여행',     change: 'up',   delta: 5,    score: '1.1M' },
  { rank: 3,  keyword: '출근길 플리',      category: '음악',     change: 'down', delta: 1,    score: '893K' },
  { rank: 4,  keyword: '자취방 인테리어',  category: '라이프',   change: 'new',                score: '744K' },
  { rank: 5,  keyword: '자소서 첨삭',      category: '교육',     change: 'up',   delta: 3,    score: '612K' },
  { rank: 6,  keyword: '스우파2 비하인드', category: '예능',     change: 'down', delta: 4,    score: '538K' },
  { rank: 7,  keyword: 'KBO 끝내기',       category: '스포츠',   change: 'up',   delta: 1,    score: '491K' },
  { rank: 8,  keyword: '아침 루틴',        category: '라이프',   change: 'new',                score: '422K' },
];

const TICKER_TEEN = ['뉴진스 직캠', '챌린지', 'RIIZE 리액션', '신조어', 'Y2K', '아이브 무대', '편의점 디저트', '지락실3', '플레이브'];
const TICKER_TWENTY = ['주식초보', '도쿄 vlog', '자취 인테리어', '아침 루틴', '재테크', '취준', '플레이리스트', 'KBO', '스우파2'];

// ──────────────────────────────────────────────
// Header (matches feed page)
// ──────────────────────────────────────────────
function Header({ generation, onChange }) {
  return (
    <div style={{
      position: 'sticky', top: 60, zIndex: 10,
      marginTop: 60,
      background: TOKENS.bg,
      borderBottom: `1px solid ${TOKENS.border}`,
    }}>
      <div style={{
        height: 56,
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 16px', gap: 12,
      }}>
        <div style={{
          fontFamily: ROUND, fontSize: 18, fontWeight: 700,
          letterSpacing: '-0.02em', color: TOKENS.text,
          display: 'flex', alignItems: 'baseline', gap: 1,
        }}>
          tz<span style={{ color: TOKENS.cyan }}>♡</span>
        </div>

        <div style={{
          display: 'inline-flex',
          background: TOKENS.card,
          borderRadius: 24, padding: 4,
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.4)',
        }}>
          {[
            { id: 'teen', emoji: '🎀', label: '10대',
              gradient: 'linear-gradient(155deg, #ff8ad4 0%, #b6ffce 100%)',
              glow: '0 0 0 1px rgba(255,138,212,0.5), 0 6px 18px -6px rgba(255,138,212,0.55)' },
            { id: 'twenty', emoji: '🍑', label: '20대',
              gradient: 'linear-gradient(155deg, #ffb86b 0%, #ffe16b 100%)',
              glow: '0 0 0 1px rgba(255,184,107,0.5), 0 6px 18px -6px rgba(255,184,107,0.55)' },
          ].map((t) => {
            const active = generation === t.id;
            return (
              <button key={t.id} onClick={() => onChange(t.id)}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: active ? '8px 16px' : '8px 14px',
                  borderRadius: 20,
                  background: active ? t.gradient : 'transparent',
                  color: active ? '#0a0a0a' : TOKENS.textDim,
                  fontFamily: KOR, fontSize: 13.5, fontWeight: 800,
                  letterSpacing: '-0.01em',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  transition: 'all 220ms cubic-bezier(.2,.9,.3,1.2)',
                  boxShadow: active ? t.glow : 'none',
                  textShadow: active ? '0 1px 0 rgba(255,255,255,0.3)' : 'none',
                }}>
                <span style={{ fontSize: 13 }}>{t.emoji}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 10px',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 999,
            fontFamily: ROUND, fontSize: 10.5, fontWeight: 700,
            color: TOKENS.text, letterSpacing: '0.04em',
          }}>
            <span style={{ position: 'relative', width: 6, height: 6 }}>
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 99,
                background: TOKENS.red,
                animation: 'tzr-pulse 1.6s ease-out infinite',
              }} />
              <span style={{
                position: 'absolute', inset: 0, borderRadius: 99,
                background: TOKENS.red,
                boxShadow: `0 0 8px ${TOKENS.red}`,
              }} />
            </span>
            LIVE
          </div>
        </div>
      </div>

      <Ticker generation={generation} />
    </div>
  );
}

function Ticker({ generation }) {
  const items = generation === 'teen' ? TICKER_TEEN : TICKER_TWENTY;
  const doubled = [...items, ...items, ...items];
  return (
    <div style={{
      height: 34,
      background: TOKENS.bg,
      borderTop: '1px solid #1a1a1a',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center',
      maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
    }}>
      <div style={{
        display: 'flex', gap: 22, whiteSpace: 'nowrap',
        animation: 'tzr-ticker 42s linear infinite',
        fontFamily: KOR, fontSize: 11.5, fontWeight: 500,
        color: 'rgba(255,255,255,0.55)',
        paddingLeft: 16,
      }}>
        {doubled.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{
              width: 5, height: 5, borderRadius: 99,
              background: i % 2 === 0 ? TOKENS.cyan : TOKENS.pink,
              boxShadow: `0 0 8px ${i % 2 === 0 ? TOKENS.cyan : TOKENS.pink}`,
            }} />
            #{t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Trend indicator (right-side: ↑/↓/NEW)
// ──────────────────────────────────────────────
function TrendIndicator({ change, delta }) {
  if (change === 'new') {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '4px 9px',
        borderRadius: 6,
        background: TOKENS.pink,
        color: '#fff',
        fontFamily: ROUND,
        fontSize: 10.5, fontWeight: 800,
        letterSpacing: '0.06em',
        boxShadow: `0 0 14px -2px ${TOKENS.pink}`,
      }}>
        NEW
      </div>
    );
  }
  const isUp = change === 'up';
  const color = isUp ? TOKENS.green : TOKENS.red;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      color,
      fontFamily: ROUND,
      fontSize: 13, fontWeight: 800,
      letterSpacing: '-0.01em',
    }}>
      <span style={{ fontSize: 14, lineHeight: 1 }}>{isUp ? '↑' : '↓'}</span>
      {delta}
    </div>
  );
}

// ──────────────────────────────────────────────
// Category pill
// ──────────────────────────────────────────────
function CategoryBadge({ label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px',
      background: TOKENS.card,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 999,
      color: TOKENS.textDim,
      fontFamily: KOR,
      fontSize: 10.5, fontWeight: 600,
      letterSpacing: '-0.005em',
    }}>
      {label}
    </span>
  );
}

// ──────────────────────────────────────────────
// Ranking row
// ──────────────────────────────────────────────
function RankingRow({ item, isLast }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '46px 1fr auto',
      alignItems: 'center',
      gap: 12,
      padding: '14px 4px',
      borderBottom: isLast ? 'none' : `1px solid ${TOKENS.border}`,
    }}>
      {/* rank number */}
      <div style={{
        fontFamily: ROUND,
        fontSize: 30, fontWeight: 700,
        color: TOKENS.cyan,
        textAlign: 'center',
        letterSpacing: '-0.04em',
        lineHeight: 1,
        textShadow: item.rank <= 3 ? `0 0 16px ${TOKENS.cyan}66` : 'none',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {String(item.rank).padStart(2, '0')}
      </div>

      {/* keyword + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontFamily: KOR,
          fontSize: 15.5, fontWeight: 700,
          color: TOKENS.text,
          letterSpacing: '-0.015em',
          marginBottom: 5,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          #{item.keyword}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: KOR,
          fontSize: 11.5, fontWeight: 500,
          color: TOKENS.textDim,
        }}>
          <CategoryBadge label={item.category} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <span style={{ fontSize: 11 }}>👁</span>
            {item.score}
          </span>
        </div>
      </div>

      {/* trend indicator */}
      <div style={{ paddingRight: 4 }}>
        <TrendIndicator change={item.change} delta={item.delta} />
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Section title
// ──────────────────────────────────────────────
function SectionTitle() {
  return (
    <div style={{ padding: '4px 4px 14px' }}>
      <div style={{
        fontFamily: KOR,
        fontSize: 20, fontWeight: 800,
        color: TOKENS.text,
        letterSpacing: '-0.02em',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        이번 주 급상승 키워드
        <span style={{ fontSize: 18 }}>✨</span>
      </div>
      <div style={{
        marginTop: 4,
        fontFamily: KOR,
        fontSize: 11.5, fontWeight: 500,
        color: TOKENS.textDim,
        letterSpacing: '-0.005em',
      }}>
        4월 28일 화요일 기준 · 지난 7일간 검색량 변화
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Watermark footer
// ──────────────────────────────────────────────
function Watermark() {
  return (
    <div style={{
      padding: '32px 0 36px',
      textAlign: 'center',
      fontFamily: ROUND, fontSize: 13, fontWeight: 700,
      letterSpacing: '-0.02em',
      color: 'rgba(255,255,255,0.18)',
    }}>
      trend<span style={{ color: 'rgba(0,229,255,0.4)' }}>zip</span><span style={{ color: 'rgba(255,45,155,0.4)' }}>♡</span>
      <div style={{
        marginTop: 4,
        fontFamily: KOR, fontSize: 10, fontWeight: 500,
        color: 'rgba(255,255,255,0.16)',
        letterSpacing: '0.04em',
      }}>
        매일 오전 9시 업데이트 · 한국 유튜브 펄스
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Trend page
// ──────────────────────────────────────────────
function TrendPage({ tweaks, setTweak }) {
  const [generation, setGeneration] = React.useState(tweaks.generation || 'teen');
  const onSwitch = (g) => { setGeneration(g); setTweak('generation', g); };
  const trends = generation === 'teen' ? TEEN_TRENDS : TWENTY_TRENDS;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: TOKENS.bg,
      overflowY: 'auto', overflowX: 'hidden',
      fontFamily: KOR, color: TOKENS.text,
    }}>
      <Header generation={generation} onChange={onSwitch} />

      <div style={{ padding: '22px 18px 6px' }}>
        <SectionTitle />
      </div>

      <div style={{ padding: '0 18px' }}>
        {trends.map((item, i) => (
          <RankingRow key={item.rank} item={item} isLast={i === trends.length - 1} />
        ))}
      </div>

      <Watermark />

      <style>{`
        @keyframes tzr-pulse {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes tzr-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}

function TrendTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Generation" />
      <TweakRadio
        label="Active list"
        value={tweaks.generation}
        onChange={(v) => setTweak('generation', v)}
        options={[
          { value: 'teen', label: '🎀 10대' },
          { value: 'twenty', label: '🍑 20대' },
        ]}
      />
    </TweaksPanel>
  );
}

function TrendApp() {
  const [tweaks, setTweak] = useTweaks(TREND_TWEAKS);
  return (
    <div style={{
      minHeight: '100vh',
      background: '#070708',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      fontFamily: KOR,
    }}>
      <IOSDevice width={390} height={844} dark={true}>
        <TrendPage tweaks={tweaks} setTweak={setTweak} />
      </IOSDevice>
      <TrendTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<TrendApp />);
