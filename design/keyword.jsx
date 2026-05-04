// trendzip — Keyword Detail page

const KW_TWEAKS = /*EDITMODE-BEGIN*/{
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
};

const ROUND = '"Quicksand", "Pretendard", system-ui';
const KOR = 'Pretendard, system-ui';

const TICKER_TEEN = ['뉴진스 직캠', '챌린지', 'RIIZE 리액션', '신조어', 'Y2K', '아이브 무대', '편의점 디저트', '지락실3', '플레이브'];
const TICKER_TWENTY = ['주식초보', '도쿄 vlog', '자취 인테리어', '아침 루틴', '재테크', '취준', '플레이리스트', 'KBO', '스우파2'];

const KEYWORD = {
  name: '뉴진스 슈퍼내추럴',
  category: '음악',
  rank: 1,
  why: [
    '신곡 "Supernatural" 뮤직비디오 공개 후 안무 챌린지가 틱톡·릴스에서 폭발적으로 확산.',
    '댄스팀 라치카 안무 영상이 24시간 만에 조회수 800만을 돌파하며 2차 콘텐츠가 급증.',
    '국내외 K-POP 커뮤니티에서 멤버별 직캠 클립 검색량이 평소 대비 4.2배 증가.',
  ],
  source: '출처: 유튜브 트렌드 분석 · 4월 28일 기준',
  graph: [
    { label: '4주전', value: 28 },
    { label: '3주전', value: 36 },
    { label: '2주전', value: 54 },
    { label: '이번주', value: 92 },
  ],
  related: [
    { title: '뉴진스 Supernatural 안무 챌린지', channel: '플레이리스트 PICK', thumb: 'linear-gradient(135deg, #ff2d9b 0%, #7b2dff 60%, #00e5ff 100%)' },
    { title: '하니 직캠 4K 풀버전', channel: 'KPOP STAGE', thumb: 'linear-gradient(135deg, #ff8ad4 0%, #ffd86b 100%)' },
    { title: '라치카 안무 분석 리액션', channel: '댄서 TV', thumb: 'linear-gradient(135deg, #00e5ff 0%, #5b6dff 100%)' },
  ],
  tags: ['챌린지', '케이팝', '안무', '뉴진스', '직캠', '라치카', '하이틴'],
};

// ──────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────
function Header({ generation }) {
  return (
    <div style={{
      position: 'sticky', top: 60, zIndex: 10,
      marginTop: 60,
      background: TOKENS.bg,
      borderBottom: `1px solid ${TOKENS.border}`,
    }}>
      <div style={{
        height: 56,
        display: 'grid', gridTemplateColumns: 'auto 1fr auto',
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

        <button style={{
          justifySelf: 'start',
          marginLeft: 14,
          border: `1px solid ${TOKENS.border}`,
          background: TOKENS.card,
          color: TOKENS.text,
          fontFamily: KOR, fontSize: 12.5, fontWeight: 700,
          padding: '7px 12px',
          borderRadius: 999,
          cursor: 'pointer',
          letterSpacing: '-0.01em',
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ fontSize: 13 }}>←</span>
          뒤로
        </button>

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
              animation: 'kw-pulse 1.6s ease-out infinite',
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
        animation: 'kw-ticker 42s linear infinite',
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
// Keyword hero
// ──────────────────────────────────────────────
function KeywordHero({ keyword, generation }) {
  const genGradient = generation === 'teen'
    ? 'linear-gradient(155deg, #ff8ad4 0%, #b6ffce 100%)'
    : 'linear-gradient(155deg, #ffb86b 0%, #ffe16b 100%)';
  const genEmoji = generation === 'teen' ? '🎀' : '🍑';
  const genLabel = generation === 'teen' ? '10대' : '20대';

  return (
    <div style={{
      background: TOKENS.card,
      borderRadius: 16,
      padding: '20px 18px 22px',
      border: `1px solid ${TOKENS.border}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* faint glow accent */}
      <div style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160, borderRadius: '50%',
        background: TOKENS.cyan, opacity: 0.06, filter: 'blur(40px)',
      }} />

      <div style={{
        fontFamily: KOR,
        fontSize: 11, fontWeight: 700,
        color: TOKENS.cyan,
        letterSpacing: '0.08em',
        marginBottom: 10,
      }}>
        TRENDING KEYWORD
      </div>

      <div style={{
        fontFamily: KOR,
        fontSize: 28, fontWeight: 800,
        color: TOKENS.text,
        letterSpacing: '-0.03em',
        lineHeight: 1.18,
        textWrap: 'balance',
        position: 'relative',
      }}>
        #{keyword.name}
      </div>

      <div style={{
        marginTop: 14,
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          padding: '5px 11px',
          background: 'rgba(255,255,255,0.04)',
          border: `1px solid ${TOKENS.border}`,
          borderRadius: 999,
          fontFamily: KOR,
          fontSize: 11.5, fontWeight: 600,
          color: TOKENS.textDim,
        }}>
          {keyword.category}
        </span>
        <span style={{
          padding: '5px 12px',
          background: genGradient,
          borderRadius: 999,
          fontFamily: KOR,
          fontSize: 12, fontWeight: 800,
          color: '#0a0a0a',
          letterSpacing: '-0.01em',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          boxShadow: '0 4px 14px -4px rgba(255,138,212,0.5)',
        }}>
          <span style={{ fontSize: 12 }}>{genEmoji}</span>
          {genLabel} {keyword.rank}위
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Section title (cyan)
// ──────────────────────────────────────────────
function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: KOR,
      fontSize: 15.5, fontWeight: 800,
      color: TOKENS.cyan,
      letterSpacing: '-0.015em',
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────
// Why card
// ──────────────────────────────────────────────
function WhyCard({ keyword }) {
  return (
    <div style={{
      background: TOKENS.card,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 16,
      padding: '16px 18px 14px',
    }}>
      {keyword.why.map((line, i) => (
        <div key={i} style={{
          display: 'flex', gap: 8,
          marginBottom: i === keyword.why.length - 1 ? 0 : 10,
          fontFamily: KOR,
          fontSize: 13.5, fontWeight: 500,
          color: TOKENS.text,
          letterSpacing: '-0.01em',
          lineHeight: 1.55,
          textWrap: 'pretty',
        }}>
          <span style={{ color: TOKENS.cyan, fontWeight: 800, flexShrink: 0 }}>·</span>
          <span>{line}</span>
        </div>
      ))}
      <div style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: `1px dashed ${TOKENS.border}`,
        fontFamily: KOR,
        fontSize: 11, fontWeight: 500,
        color: TOKENS.textDim,
        letterSpacing: '-0.005em',
      }}>
        {keyword.source}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Trend chart (svg line chart)
// ──────────────────────────────────────────────
function TrendChart({ data }) {
  const W = 320, H = 140;
  const PAD = { l: 14, r: 14, t: 14, b: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const max = Math.max(...data.map(d => d.value));
  const min = Math.min(...data.map(d => d.value));
  const range = Math.max(1, max - min);

  const points = data.map((d, i) => {
    const x = PAD.l + (i / (data.length - 1)) * innerW;
    const y = PAD.t + innerH - ((d.value - min) / range) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD.t + innerH} L ${points[0].x} ${PAD.t + innerH} Z`;

  return (
    <div style={{
      background: TOKENS.card,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 16,
      padding: '14px 12px 8px',
    }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="kw-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={TOKENS.cyan} stopOpacity="0.28" />
            <stop offset="100%" stopColor={TOKENS.cyan} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* horizontal gridlines */}
        {[0, 0.5, 1].map((t, i) => (
          <line key={i}
            x1={PAD.l} x2={W - PAD.r}
            y1={PAD.t + innerH * t} y2={PAD.t + innerH * t}
            stroke="#222" strokeWidth="1" strokeDasharray={t === 1 ? '0' : '3 4'} />
        ))}

        {/* area */}
        <path d={areaPath} fill="url(#kw-area)" />
        {/* line */}
        <path d={linePath} fill="none" stroke={TOKENS.cyan} strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: `drop-shadow(0 0 6px ${TOKENS.cyan}88)` }} />

        {/* points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 5 : 3.5}
                    fill={TOKENS.bg} stroke={TOKENS.cyan} strokeWidth="2" />
            {i === points.length - 1 && (
              <circle cx={p.x} cy={p.y} r="9" fill="none" stroke={TOKENS.cyan}
                      strokeWidth="1.5" opacity="0.4">
                <animate attributeName="r" from="5" to="14" dur="1.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={p.x} y={H - 8}
              textAnchor="middle"
              fontFamily="Pretendard, system-ui"
              fontSize="10"
              fontWeight="600"
              fill={i === points.length - 1 ? TOKENS.cyan : TOKENS.textDim}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────
// Related video card (horizontal scroll)
// ──────────────────────────────────────────────
function VideoMiniCard({ video }) {
  return (
    <div style={{
      flexShrink: 0,
      width: 188,
      background: TOKENS.card,
      border: `1px solid ${TOKENS.border}`,
      borderRadius: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        aspectRatio: '16 / 9',
        background: video.thumb,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 30% 70%, rgba(255,255,255,0.18), transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(0,0,0,0.25), transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 36, height: 36, borderRadius: 999,
          background: 'rgba(10,10,10,0.55)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 0, height: 0,
            borderLeft: '9px solid #fff',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            marginLeft: 3,
          }} />
        </div>
      </div>
      <div style={{ padding: '10px 12px 12px' }}>
        <div style={{
          fontFamily: KOR,
          fontSize: 12.5, fontWeight: 700,
          color: TOKENS.text,
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {video.title}
        </div>
        <div style={{
          marginTop: 4,
          fontFamily: KOR,
          fontSize: 10.5, fontWeight: 500,
          color: TOKENS.textDim,
        }}>
          {video.channel}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Watermark
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
// Page
// ──────────────────────────────────────────────
function KeywordPage({ tweaks }) {
  const generation = tweaks.generation || 'teen';

  return (
    <div style={{
      width: '100%', height: '100%',
      background: TOKENS.bg,
      overflowY: 'auto', overflowX: 'hidden',
      fontFamily: KOR, color: TOKENS.text,
    }}>
      <Header generation={generation} />

      <div style={{ padding: '20px 16px 0' }}>
        <KeywordHero keyword={KEYWORD} generation={generation} />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <SectionTitle>왜 뜨고 있나? 🔥</SectionTitle>
        <WhyCard keyword={KEYWORD} />
      </div>

      <div style={{ padding: '24px 16px 0' }}>
        <SectionTitle>트렌드 그래프 📈</SectionTitle>
        <TrendChart data={KEYWORD.graph} />
      </div>

      <div style={{ padding: '24px 0 0' }}>
        <div style={{ padding: '0 16px' }}>
          <SectionTitle>관련 영상 🎬</SectionTitle>
        </div>
        <div style={{
          display: 'flex', gap: 12,
          padding: '0 16px 4px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}>
          {KEYWORD.related.map((v, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <VideoMiniCard video={v} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 0 0' }}>
        <div style={{ padding: '0 16px' }}>
          <SectionTitle>관련 키워드</SectionTitle>
        </div>
        <div style={{
          display: 'flex', gap: 8,
          padding: '0 16px 4px',
          overflowX: 'auto',
        }}>
          {KEYWORD.tags.map((tag, i) => (
            <span key={i} style={{
              flexShrink: 0,
              padding: '8px 14px',
              border: `1px solid ${TOKENS.cyan}`,
              background: 'rgba(0,229,255,0.06)',
              borderRadius: 999,
              fontFamily: KOR,
              fontSize: 12.5, fontWeight: 700,
              color: TOKENS.text,
              letterSpacing: '-0.01em',
            }}>
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <Watermark />

      <style>{`
        @keyframes kw-pulse {
          0% { transform: scale(1); opacity: 0.85; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes kw-ticker {
          from { transform: translateX(0); }
          to { transform: translateX(-33.333%); }
        }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}

function KwTweaks({ tweaks, setTweak }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Generation" />
      <TweakRadio
        label="Variant"
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

function KwApp() {
  const [tweaks, setTweak] = useTweaks(KW_TWEAKS);
  return (
    <div style={{
      minHeight: '100vh',
      background: '#070708',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      fontFamily: KOR,
    }}>
      <IOSDevice width={390} height={844} dark={true}>
        <KeywordPage tweaks={tweaks} />
      </IOSDevice>
      <KwTweaks tweaks={tweaks} setTweak={setTweak} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<KwApp />);
