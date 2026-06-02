import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle,
  Loader2, ArrowRight, Search, Globe,
  Terminal, Wifi, Eye, Activity,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   FONT + GLOBAL STYLES INJECTION
───────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body { background: #02060f; }

  ::selection { background: rgba(56,189,248,0.18); color: #e2e8f0; }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: #02060f; }
  ::-webkit-scrollbar-thumb { background: #1a3a5c; border-radius: 4px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes radarRing {
    0%   { transform: scale(1);   opacity: 0.55; }
    100% { transform: scale(2.8); opacity: 0;    }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  @keyframes barGrow {
    from { width: 0%; }
  }
  @keyframes ringFill {
    from { stroke-dashoffset: 338; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 6px rgba(56,189,248,0.3); }
    50%      { box-shadow: 0 0 14px rgba(56,189,248,0.6); }
  }

  .input-row:focus-within .input-icon { color: #38bdf8 !important; }

  .signal-card {
    background: rgba(6,16,34,0.9);
    border: 1px solid rgba(26,58,92,0.55);
    border-radius: 14px;
    padding: 20px;
    backdrop-filter: blur(14px);
    transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
  }
  .signal-card:hover { transform: translateY(-2px); }

  .feed-pill {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(16,185,129,0.06);
    border: 1px solid rgba(16,185,129,0.2);
    border-radius: 99px; padding: 5px 13px;
    transition: border-color 0.2s, background 0.2s;
  }
  .feed-pill:hover {
    background: rgba(16,185,129,0.1);
    border-color: rgba(16,185,129,0.35);
  }

  .analyze-btn {
    background: linear-gradient(135deg, #0ea5e9, #38bdf8);
    color: #fff; border: none; border-radius: 10px;
    padding: 10px 22px; cursor: pointer;
    font-family: 'Syne', sans-serif;
    font-size: 12px; font-weight: 700;
    letter-spacing: 0.04em;
    display: flex; align-items: center; gap: 7px;
    flex-shrink: 0; transition: opacity 0.2s, transform 0.15s;
    box-shadow: 0 0 18px rgba(56,189,248,0.25);
  }
  .analyze-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
  .analyze-btn:disabled {
    background: rgba(26,58,92,0.5);
    color: #334155; cursor: not-allowed;
    box-shadow: none;
  }
`;

function GlobalStyles() {
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────────
   SEVERITY CONFIG
───────────────────────────────────────────────────────────── */
const SEV = {
  Dangerous: {
    color:  '#f43f5e',
    bg:     'rgba(244,63,94,0.07)',
    border: 'rgba(244,63,94,0.22)',
    glow:   '0 0 45px rgba(244,63,94,0.13)',
    cardAccent: '#f43f5e',
    Icon:   ShieldAlert,
    label:  'DANGEROUS',
  },
  Suspicious: {
    color:  '#f59e0b',
    bg:     'rgba(245,158,11,0.07)',
    border: 'rgba(245,158,11,0.22)',
    glow:   '0 0 45px rgba(245,158,11,0.11)',
    cardAccent: '#f59e0b',
    Icon:   AlertTriangle,
    label:  'SUSPICIOUS',
  },
  Safe: {
    color:  '#10b981',
    bg:     'rgba(16,185,129,0.07)',
    border: 'rgba(16,185,129,0.22)',
    glow:   '0 0 45px rgba(16,185,129,0.11)',
    cardAccent: '#10b981',
    Icon:   ShieldCheck,
    label:  'SAFE',
  },
};
const getSev = (s) => SEV[s] ?? SEV.Safe;

/* ─────────────────────────────────────────────────────────────
   ANIMATED SCORE RING
───────────────────────────────────────────────────────────── */
function ScoreRing({ score, color }) {
  const r    = 52;
  const circ = +(2 * Math.PI * r).toFixed(2);   // 326.73
  // Defensive typing to ensure math operations don't fail
  const safeScore = Number(score) || 0; 
  const offset = circ - (safeScore / 100) * circ;

  return (
    <svg width="136" height="136" viewBox="0 0 136 136" style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track */}
      <circle cx="68" cy="68" r={r} fill="none"
        stroke="rgba(26,58,92,0.8)" strokeWidth="7" />

      {/* Progress arc */}
      <circle cx="68" cy="68" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 68 68)"
        filter="url(#glow)"
        style={{ animation: 'ringFill 1.2s cubic-bezier(0.34,1.56,0.64,1) both' }}
      />

      {/* Score number */}
      <text x="68" y="63" textAnchor="middle" fill="#f8fafc"
        fontSize="32" fontWeight="800" fontFamily="'Syne', sans-serif">
        {safeScore}
      </text>
      <text x="68" y="82" textAnchor="middle" fill="#334155"
        fontSize="10" letterSpacing="2" fontFamily="'IBM Plex Mono', monospace">
        /100
      </text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   SCANNING ANIMATION
───────────────────────────────────────────────────────────── */
const SCAN_STEPS = [
  'Running heuristic analysis...',
  'Querying threat intelligence feeds...',
  'Inspecting domain & WHOIS metadata...',
];

function ScanningState() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActive(p => (p + 1) % SCAN_STEPS.length), 950);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', padding: '44px 0', animation: 'fadeIn 0.4s ease both' }}>
      {/* Radar rings */}
      <div style={{ position: 'relative', width: '88px', height: '88px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(56,189,248,0.35)',
            animation: `radarRing 2s ease-out ${i * 0.55}s infinite`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: '28px', borderRadius: '50%',
          background: 'rgba(56,189,248,0.1)',
          border: '1.5px solid rgba(56,189,248,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulseGlow 2s ease-in-out infinite',
        }}>
          <Activity size={16} color="#38bdf8" />
        </div>
      </div>

      {/* Step list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
        {SCAN_STEPS.map((step, i) => {
          const done    = active > i;
          const current = active === i;
          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
              color: current ? '#38bdf8' : done ? '#10b981' : '#2d4a6a',
              transition: 'color 0.35s',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: current ? '#38bdf8' : done ? '#10b981' : '#1a3a5c',
                boxShadow: current ? '0 0 8px #38bdf8' : done ? '0 0 6px #10b981' : 'none',
                transition: 'all 0.35s',
              }} />
              {step}
              {current && (
                <span style={{ marginLeft: 'auto', color: '#38bdf8', animation: 'blink 1s step-end infinite' }}>▌</span>
              )}
              {done && (
                <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: '12px' }}>✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SIGNAL BREAKDOWN CARD
───────────────────────────────────────────────────────────── */
function SignalCard({ icon: Icon, title, score, findings, accent }) {
  return (
    <div
      className="signal-card"
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent + '44';
        e.currentTarget.style.boxShadow   = `0 0 24px ${accent}18`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(26,58,92,0.55)';
        e.currentTarget.style.boxShadow   = 'none';
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: '12px', marginBottom: '14px',
        borderBottom: '1px solid rgba(26,58,92,0.45)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Icon size={13} color={accent} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
            fontWeight: 600, letterSpacing: '0.12em',
            color: '#64748b', textTransform: 'uppercase',
          }}>
            {title}
          </span>
        </div>
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
          fontWeight: 600, color: accent,
          background: `${accent}12`, border: `1px solid ${accent}28`,
          borderRadius: '6px', padding: '2px 8px',
        }}>
          {score} pts
        </span>
      </div>

      {/* Findings */}
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {findings.length > 0
          ? findings.map((f, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: accent, marginTop: '3px', flexShrink: 0, fontSize: '9px' }}>▸</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#7a92aa', lineHeight: 1.6 }}>
                {f}
              </span>
            </li>
          ))
          : (
            <li style={{
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
              color: '#2d4a6a', fontStyle: 'italic',
            }}>
              No signals detected.
            </li>
          )
        }
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '20px', padding: '44px 0',
      animation: 'fadeIn 0.5s ease both',
    }}>
      <div style={{
        width: '64px', height: '64px',
        background: 'rgba(22,42,72,0.5)',
        border: '1px solid rgba(26,58,92,0.5)',
        borderRadius: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Eye size={24} color="#1e3a5c" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px',
          color: '#2d4a6a', marginBottom: '6px',
        }}>
          No URL submitted yet
        </p>
        <p style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
          color: '#1a3a5c', maxWidth: '260px', lineHeight: 1.7,
        }}>
          Paste any URL above to run a multi-layer threat assessment
        </p>
      </div>

      {/* Live feed status */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Google Safe Browsing', 'URLhaus', 'PhishTank'].map(feed => (
          <div key={feed} className="feed-pill">
            <span style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: '#10b981', boxShadow: '0 0 6px #10b981',
            }} />
            <span style={{
              fontSize: '10px', color: '#4b6a7a',
              fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.04em',
            }}>
              {feed}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [result,   setResult]   = useState(null);
  const [focused,  setFocused]  = useState(false);

  /* ── API call — integrated environment variables ── */
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Pulls from Vite's .env file in production, falls back to local host in dev
      const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/analyze';
      
      const response = await axios.post(GATEWAY_URL, { 
        url: urlInput.trim() // Defensive sanitization 
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to the analysis gateway.');
    } finally {
      setLoading(false);
    }
  };

  const sev = result ? getSev(result.severity) : null;

  /* ── Page background ─────────────────────────────────────── */
  const PAGE_STYLE = {
    minHeight: '100vh',
    background: '#02060f',
    backgroundImage: `
      radial-gradient(ellipse at 18% 12%, rgba(56,189,248,0.045) 0%, transparent 48%),
      radial-gradient(ellipse at 82% 78%, rgba(16,185,129,0.03)  0%, transparent 48%),
      linear-gradient(rgba(26,58,92,0.1)    1px, transparent 1px),
      linear-gradient(90deg, rgba(26,58,92,0.1) 1px, transparent 1px)
    `,
    backgroundSize: '100% 100%, 100% 100%, 38px 38px, 38px 38px',
    fontFamily: "'IBM Plex Mono', monospace",
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <>
      <GlobalStyles />
      <div style={PAGE_STYLE}>

        {/* ── Header ───────────────────────────────────────── */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 50,
          borderBottom: '1px solid rgba(26,58,92,0.55)',
          background: 'rgba(2,6,15,0.75)',
          backdropFilter: 'blur(18px)',
          padding: '13px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'rgba(56,189,248,0.1)',
              border: '1px solid rgba(56,189,248,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={15} color="#38bdf8" />
            </div>
            <span style={{
              fontFamily: "'Syne', sans-serif", fontSize: '15px',
              fontWeight: 800, letterSpacing: '0.04em', color: '#f1f5f9',
            }}>
              URL<span style={{ color: '#38bdf8' }}>HOUND</span>
            </span>
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: '#10b981', boxShadow: '0 0 7px #10b981',
              }} />
              <span style={{ fontSize: '10px', color: '#334155', letterSpacing: '0.1em' }}>
                FEEDS ONLINE
              </span>
            </div>
            <span style={{ fontSize: '10px', color: '#1e3a5c', letterSpacing: '0.1em' }}>
              v1.0.0
            </span>
          </div>
        </header>

        {/* ── Main ─────────────────────────────────────────── */}
        <main style={{ flex: 1, maxWidth: '880px', width: '100%', margin: '0 auto', padding: '52px 24px 48px' }}>

          {/* Hero */}
          <section style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 0.55s ease both' }}>
            {/* Tag pill */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'rgba(56,189,248,0.06)',
              border: '1px solid rgba(56,189,248,0.18)',
              borderRadius: '99px', padding: '5px 15px', marginBottom: '22px',
            }}>
              <span style={{
                width: '5px', height: '5px', borderRadius: '50%',
                background: '#38bdf8', boxShadow: '0 0 6px #38bdf8',
              }} />
              <span style={{ fontSize: '10px', color: '#38bdf8', letterSpacing: '0.14em', fontWeight: 500 }}>
                MULTI-LAYER THREAT DETECTION
              </span>
            </div>

            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 'clamp(30px, 5vw, 50px)',
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.025em', color: '#f8fafc',
              marginBottom: '14px',
            }}>
              URL Threat Analysis
            </h1>
            <p style={{
              fontSize: '13px', color: '#3a5470',
              maxWidth: '400px', margin: '0 auto', lineHeight: 1.75,
            }}>
              Heuristic analysis, domain telemetry & live threat intelligence feeds — combined into a single risk verdict.
            </p>
          </section>

          {/* Input form */}
          <form onSubmit={handleAnalyze} style={{ marginBottom: '32px', animation: 'fadeUp 0.55s 0.08s ease both' }}>
            <div
              className="input-row"
              style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(6,16,34,0.92)',
                border: `1px solid ${focused ? 'rgba(56,189,248,0.42)' : 'rgba(26,58,92,0.6)'}`,
                borderRadius: '14px', padding: '6px 6px 6px 16px',
                backdropFilter: 'blur(14px)',
                boxShadow: focused
                  ? '0 0 0 3px rgba(56,189,248,0.07), 0 0 24px rgba(56,189,248,0.06)'
                  : '0 4px 24px rgba(0,0,0,0.3)',
                transition: 'border-color 0.22s, box-shadow 0.22s',
              }}
            >
              <Search
                className="input-icon"
                size={15}
                color={focused ? '#38bdf8' : '#2d4a6a'}
                style={{ marginRight: '10px', flexShrink: 0, transition: 'color 0.22s' }}
              />
              <input
                type="text"
                placeholder="Paste a URL to inspect  (e.g. login.paypa1-secure.xyz)"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                disabled={loading}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: '#e2e8f0', fontSize: '13px',
                  fontFamily: "'IBM Plex Mono', monospace",
                  padding: '10px 0', caretColor: '#38bdf8',
                }}
              />
              <button
                type="submit"
                disabled={loading || !urlInput.trim()}
                className="analyze-btn"
              >
                {loading
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />Scanning</>
                  : <>Analyze <ArrowRight size={13} /></>
                }
              </button>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '14px 18px', marginBottom: '24px',
              background: 'rgba(244,63,94,0.07)',
              border: '1px solid rgba(244,63,94,0.22)',
              borderRadius: '12px', color: '#f43f5e',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
              animation: 'fadeUp 0.3s ease both',
            }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {/* Scanning state */}
          {loading && <ScanningState />}

          {/* Results */}
          {result && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeUp 0.5s ease both' }}>

              {/* Verdict card */}
              <div style={{
                background: sev.bg,
                border: `1px solid ${sev.border}`,
                borderRadius: '18px', padding: '28px 30px',
                boxShadow: sev.glow,
                display: 'flex', alignItems: 'flex-start',
                gap: '28px', flexWrap: 'wrap',
              }}>
                {/* Score ring + severity badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <ScoreRing score={result.overall_risk_score} color={sev.color} />
                  <span style={{
                    fontFamily: "'Syne', sans-serif", fontSize: '10px', fontWeight: 700,
                    letterSpacing: '0.16em', color: sev.color,
                    background: `${sev.color}14`, border: `1px solid ${sev.color}30`,
                    borderRadius: '99px', padding: '4px 16px',
                  }}>
                    {sev.label}
                  </span>
                </div>

                {/* Verdict detail */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                    <sev.Icon size={16} color={sev.color} />
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '17px', color: '#f8fafc' }}>
                      Threat Assessment
                    </span>
                  </div>

                  {/* AI explanation */}
                  <div style={{
                    background: 'rgba(2,6,15,0.55)',
                    border: '1px solid rgba(26,58,92,0.45)',
                    borderRadius: '10px', padding: '14px 16px', marginBottom: '14px',
                  }}>
                    <p style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px',
                      color: '#94a3b8', lineHeight: 1.8,
                    }}>
                      {result.ai_explanation}
                    </p>
                  </div>

                  {/* Analyzed URL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Globe size={11} color="#2d4a6a" />
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                      color: '#2d4a6a', wordBreak: 'break-all',
                    }}>
                      {urlInput}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk score progress bar */}
              <div style={{
                background: 'rgba(6,16,34,0.9)',
                border: '1px solid rgba(26,58,92,0.5)',
                borderRadius: '14px', padding: '18px 22px',
                backdropFilter: 'blur(12px)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '10px', color: '#3a5470', letterSpacing: '0.12em', fontWeight: 600 }}>
                    COMPOSITE RISK SCORE
                  </span>
                  <span style={{ fontSize: '11px', color: sev.color, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>
                    {result.overall_risk_score} / 100
                  </span>
                </div>
                <div style={{ height: '5px', background: 'rgba(26,58,92,0.5)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '99px',
                    width: `${result.overall_risk_score}%`,
                    background: `linear-gradient(90deg, ${sev.color}88, ${sev.color})`,
                    boxShadow: `0 0 10px ${sev.color}66`,
                    animation: 'barGrow 1.2s cubic-bezier(0.34,1.56,0.64,1) both',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '7px' }}>
                  {['0', '25', '50', '75', '100'].map(v => (
                    <span key={v} style={{ fontSize: '9px', color: '#1e3a5c', fontFamily: "'IBM Plex Mono', monospace" }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>

              {/* Signal breakdown grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <SignalCard
                  icon={Terminal}
                  title="Static Heuristics"
                  score={result.heuristics.risk_score}
                  findings={result.heuristics.findings}
                  accent="#38bdf8"
                />
                <SignalCard
                  icon={Wifi}
                  title="Threat Intel Feeds"
                  score={result.threat_feeds.risk_score}
                  findings={result.threat_feeds.findings}
                  accent="#f43f5e"
                />
                <SignalCard
                  icon={Globe}
                  title="Domain Telemetry"
                  score={result.domain_metadata.risk_score}
                  findings={result.domain_metadata.findings}
                  accent="#f59e0b"
                />
              </div>

            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && <EmptyState />}

        </main>

        {/* ── Footer ───────────────────────────────────────── */}
        <footer style={{
          borderTop: '1px solid rgba(26,58,92,0.35)',
          padding: '14px 32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '10px', color: '#1a3a5c', letterSpacing: '0.08em' }}>
            URLHOUND © 2026
          </span>
          <span style={{ fontSize: '10px', color: '#1a3a5c', letterSpacing: '0.08em' }}>
            MULTI-LAYER THREAT INTELLIGENCE
          </span>
        </footer>

      </div>
    </>
  );
}