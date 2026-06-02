import React, { useState } from 'react';
import axios from 'axios';
import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, ArrowRight, ExternalLink } from 'lucide-react';

export default function App() {
  const [urlInput, setUrlInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Querying our FastAPI backend gateway
      const response = await axios.post('http://localhost:8000/api/v1/analyze', {
        url: urlInput
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to the analysis gateway.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine threat color schemes dynamically
  const getSeverityStyles = (severity) => {
    switch (severity) {
      case 'Dangerous':
        return {
          bg: 'bg-red-500/10 border-red-500/30 text-red-400',
          badge: 'bg-red-500 text-white',
          icon: <ShieldAlert className="w-8 h-8 text-red-500" />
        };
      case 'Suspicious':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
          badge: 'bg-yellow-500 text-black',
          icon: <AlertTriangle className="w-8 h-8 text-yellow-500" />
        };
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          badge: 'bg-emerald-500 text-white',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-indigo-500" />
          <span className="font-mono font-bold tracking-wider text-slate-200">ECHELON // PHISH_DETECTOR</span>
        </div>
        <div className="text-xs font-mono text-slate-500">VERSION 1.0.0</div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        <section className="text-center space-y-2 py-4">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Automated URL Threat Analysis</h1>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Inspect uniform resource locators against real-time static heuristics, domain metadata telemetry, and centralized threat feeds.
          </p>
        </section>

        {/* URL Input Form */}
        <form onSubmit={handleAnalyze} className="relative group">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-2 focus-within:border-indigo-500 transition-all shadow-xl">
            <input
              type="text"
              placeholder="Paste target URL here (e.g., login.verification-update.com)..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              disabled={loading}
              className="w-full bg-transparent px-4 py-3 text-slate-200 placeholder-slate-500 outline-none text-sm"
            />
            <button
              type="submit"
              disabled={loading || !urlInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-5 py-3 rounded-lg flex items-center gap-2 font-medium text-sm transition-all shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing
                </>
              ) : (
                <>
                  Scan URL
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-900/50 text-red-400 rounded-xl text-sm font-mono">
            [!] Error: {error}
          </div>
        )}

        {/* Analysis Results Layout */}
        {result && (
          <div className="space-y-6 animate-fade-in">
            {/* Verdict Card */}
            <div className={`p-6 border rounded-xl flex items-start gap-5 ${getSeverityStyles(result.severity).bg}`}>
              {getSeverityStyles(result.severity).icon}
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Verdict: {result.severity}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-mono uppercase font-bold ${getSeverityStyles(result.severity).badge}`}>
                    Score {result.overall_risk_score}/100
                  </span>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line font-medium pt-2">
                  {result.ai_explanation}
                </div>
              </div>
            </div>

            {/* Matrix Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Heuristics Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono tracking-wider font-bold text-slate-400 uppercase">Static Heuristics</span>
                  <span className="text-sm font-mono font-bold text-slate-300">{result.heuristics.risk_score} pts</span>
                </div>
                <ul className="text-xs space-y-2 text-slate-400 list-disc pl-4">
                  {result.heuristics.findings.length > 0 ? (
                    result.heuristics.findings.map((f, i) => <li key={i}>{f}</li>)
                  ) : (
                    <li className="list-none pl-0 text-slate-500 italic">No heuristic flags triggered.</li>
                  )}
                </ul>
              </div>

              {/* Threat Feeds Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono tracking-wider font-bold text-slate-400 uppercase">Threat Intel Feeds</span>
                  <span className="text-sm font-mono font-bold text-slate-300">{result.threat_feeds.risk_score} pts</span>
                </div>
                <ul className="text-xs space-y-2 text-slate-400 list-disc pl-4">
                  {result.threat_feeds.findings.length > 0 ? (
                    result.threat_feeds.findings.map((f, i) => <li key={i}>{f}</li>)
                  ) : (
                    <li className="list-none pl-0 text-slate-500 italic">Not found on any public blacklists.</li>
                  )}
                </ul>
              </div>

              {/* WHOIS Metadata Breakdown */}
              <div className="bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono tracking-wider font-bold text-slate-400 uppercase">Domain Telemetry</span>
                  <span className="text-sm font-mono font-bold text-slate-300">{result.domain_metadata.risk_score} pts</span>
                </div>
                <ul className="text-xs space-y-2 text-slate-400 list-disc pl-4">
                  {result.domain_metadata.findings.length > 0 ? (
                    result.domain_metadata.findings.map((f, i) => <li key={i}>{f}</li>)
                  ) : (
                    <li className="list-none pl-0 text-slate-500 italic">No registration anomalies observed.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}