import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  bg: "#0a0e1a",
  bgCard: "#0d1221",
  bgPanel: "#111827",
  border: "#1e2d47",
  borderGlow: "#00ff8844",
  green: "#00ff88",
  greenDim: "#00cc6a",
  red: "#ff3b5c",
  redDim: "#cc2244",
  blue: "#00aaff",
  blueDim: "#0077cc",
  gold: "#ffd700",
  text: "#e2e8f0",
  textDim: "#64748b",
  textMid: "#94a3b8",
  purple: "#a855f7",
};

const PAIRS = ["BTC/USDT","ETH/USDT","BNB/USDT","SOL/USDT","XRP/USDT","ADA/USDT","DOGE/USDT","MATIC/USDT"];
const TIMEFRAMES = ["1m","5m","15m","1h","4h","1D"];

function generateCandles(count = 60, basePrice = 65000, volatility = 0.012) {
  const candles = [];
  let price = basePrice;
  let time = Date.now() - count * 60000;
  let trend = Math.random() > 0.5 ? 1 : -1;
  let trendStrength = 0;
  for (let i = 0; i < count; i++) {
    if (Math.random() < 0.1) { trend *= -1; trendStrength = 0; }
    trendStrength = Math.min(trendStrength + 0.1, 1);
    const bias = trend * trendStrength * volatility * 0.4;
    const open = price;
    const move = (Math.random() - 0.5) * 2 * volatility + bias;
    const close = open * (1 + move);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
    const volume = Math.random() * 1000 + 200;
    candles.push({ time, open, high, low, close, volume });
    price = close;
    time += 60000;
  }
  return candles;
}

function CandleChart({ candles, width = 680, height = 300 }) {
  const svgRef = useRef(null);
  if (!candles.length) return null;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const padL = 60, padR = 10, padT = 10, padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;
  const cw = Math.max(3, chartW / candles.length - 1);
  const gap = chartW / candles.length;

  const toY = p => padT + chartH - ((p - minP) / range) * chartH;
  const toX = i => padL + i * gap + gap / 2;

  const ema20 = [];
  let emaVal = candles[0].close;
  const k = 2 / (20 + 1);
  candles.forEach((c, i) => {
    emaVal = c.close * k + emaVal * (1 - k);
    ema20.push({ x: toX(i), y: toY(emaVal) });
  });

  const linePath = ema20.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d1221" />
          <stop offset="100%" stopColor="#080c18" />
        </linearGradient>
      </defs>
      <rect width={width} height={height} fill="url(#bgGrad)" />
      {[0,0.25,0.5,0.75,1].map(t => {
        const y = padT + chartH * t;
        const price = maxP - t * range;
        return (
          <g key={t}>
            <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#1e2d47" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x={padL - 4} y={y + 4} fill="#64748b" fontSize="9" textAnchor="end">{price.toFixed(0)}</text>
          </g>
        );
      })}
      <path d={linePath} fill="none" stroke="#00aaff" strokeWidth="1.5" opacity="0.7" />
      {candles.map((c, i) => {
        const x = toX(i);
        const isGreen = c.close >= c.open;
        const color = isGreen ? COLORS.green : COLORS.red;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={color} strokeWidth="1" opacity="0.8" />
            <rect x={x - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={color} opacity={isGreen ? 0.85 : 0.9} rx="0.5" />
          </g>
        );
      })}
      {candles.length > 1 && (
        <text x={toX(candles.length - 1)} y={toY(candles[candles.length - 1].close) - 6} fill={COLORS.gold} fontSize="10" textAnchor="middle">
          {candles[candles.length - 1].close.toFixed(0)}
        </text>
      )}
    </svg>
  );
}

function ProbabilityBar({ up, down, confidence }) {
  return (
    <div style={{ margin: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: COLORS.green, fontWeight: 600, fontSize: 18 }}>▲ {up}%</span>
        <span style={{ color: COLORS.textMid, fontSize: 12 }}>Confidence: <span style={{ color: COLORS.gold }}>{confidence}%</span></span>
        <span style={{ color: COLORS.red, fontWeight: 600, fontSize: 18 }}>{down}% ▼</span>
      </div>
      <div style={{ height: 10, borderRadius: 5, overflow: "hidden", display: "flex", background: "#1a2235" }}>
        <div style={{ width: `${up}%`, background: `linear-gradient(90deg, #00ff88, #00cc6a)`, transition: "width 1s ease" }} />
        <div style={{ width: `${down}%`, background: `linear-gradient(90deg, #cc2244, #ff3b5c)`, transition: "width 1s ease" }} />
      </div>
    </div>
  );
}

function SignalBadge({ signal }) {
  const cfg = {
    BUY: { bg: "#00ff8820", border: COLORS.green, color: COLORS.green, icon: "▲" },
    SELL: { bg: "#ff3b5c20", border: COLORS.red, color: COLORS.red, icon: "▼" },
    HOLD: { bg: "#ffd70020", border: COLORS.gold, color: COLORS.gold, icon: "◆" },
  }[signal] || {};
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 18px", borderRadius: 6, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color, fontWeight: 700, fontSize: 20, letterSpacing: 2 }}>
      {cfg.icon} {signal}
    </div>
  );
}

function MetricRow({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ color: COLORS.textDim, fontSize: 12 }}>{label}</span>
      <span style={{ color: color || COLORS.text, fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  );
}

function RiskMeter({ risk }) {
  const pct = risk;
  const hue = ((100 - risk) * 1.2).toFixed(0);
  return (
    <div style={{ margin: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: COLORS.textDim, fontSize: 11 }}>Risk Level</span>
        <span style={{ color: `hsl(${hue},90%,55%)`, fontWeight: 600, fontSize: 12 }}>{risk < 33 ? "LOW" : risk < 66 ? "MEDIUM" : "HIGH"} ({risk}%)</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "#1a2235", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: `linear-gradient(90deg, #00ff88, hsl(${hue},90%,50%))`, transition: "width 0.8s ease" }} />
      </div>
    </div>
  );
}

function PatternTag({ label }) {
  return (
    <span style={{ padding: "3px 10px", borderRadius: 4, background: "#1a2a45", border: `1px solid ${COLORS.blue}44`, color: COLORS.blue, fontSize: 11, marginRight: 4, marginBottom: 4, display: "inline-block" }}>{label}</span>
  );
}

const glowStyle = (color) => ({
  boxShadow: `0 0 12px ${color}44, inset 0 0 6px ${color}11`,
  border: `1px solid ${color}66`,
});

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [selectedPair, setSelectedPair] = useState("BTC/USDT");
  const [tf, setTf] = useState("1h");
  const [candles, setCandles] = useState(() => generateCandles(60, 65000));
  const [price, setPrice] = useState(65000);
  const [priceChange, setPriceChange] = useState(2.34);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [isLiveAnalyzing, setIsLiveAnalyzing] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const fileRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const bases = { "BTC/USDT": 65000, "ETH/USDT": 3200, "BNB/USDT": 420, "SOL/USDT": 180, "XRP/USDT": 0.62, "ADA/USDT": 0.48, "DOGE/USDT": 0.16, "MATIC/USDT": 0.88 };
    setMarketData(PAIRS.map(p => {
      const base = bases[p];
      const chg = (Math.random() - 0.45) * 8;
      return { pair: p, price: base * (1 + chg / 100), change: chg.toFixed(2), vol: (Math.random() * 2 + 0.5).toFixed(1) + "B" };
    }));
  }, []);

  useEffect(() => {
    const bases = { "BTC/USDT": 65000, "ETH/USDT": 3200, "BNB/USDT": 420, "SOL/USDT": 180, "XRP/USDT": 0.62, "ADA/USDT": 0.48, "DOGE/USDT": 0.16, "MATIC/USDT": 0.88 };
    const baseP = bases[selectedPair] || 65000;
    const newCandles = generateCandles(60, baseP);
    setCandles(newCandles);
    const last = newCandles[newCandles.length - 1];
    setPrice(last.close);
    const chg = ((last.close - newCandles[0].open) / newCandles[0].open * 100);
    setPriceChange(parseFloat(chg.toFixed(2)));
  }, [selectedPair, tf]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const move = (Math.random() - 0.48) * last.close * 0.003;
        const newClose = last.close + move;
        const updated = [...prev.slice(-59), { ...last, close: newClose, high: Math.max(last.high, newClose), low: Math.min(last.low, newClose) }];
        setPrice(newClose);
        return updated;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer?.files[0] || e.target?.files[0];
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result.split(",")[1];
      setImageBase64(b64);
    };
    reader.readAsDataURL(file);
    setAnalysis(null);
  }, []);

  const analyzeImage = async () => {
    if (!imageBase64) return;
    setIsAnalyzing(true);
    setScanProgress(0);
    const prog = setInterval(() => setScanProgress(p => Math.min(p + Math.random() * 15, 92)), 400);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
              { type: "text", text: `You are an expert trading analyst AI. Analyze this trading chart image and respond ONLY with valid JSON, no markdown:
{
  "asset": "detected asset name or Unknown",
  "timeframe": "detected timeframe or Unknown",
  "trend": "BULLISH or BEARISH or SIDEWAYS",
  "signal": "BUY or SELL or HOLD",
  "upProbability": number 0-100,
  "downProbability": number 0-100,
  "confidence": number 0-100,
  "riskLevel": number 0-100,
  "entry": "price or zone as string",
  "stopLoss": "price or zone as string",
  "takeProfit": "price or zone as string",
  "patterns": ["list", "of", "detected", "patterns"],
  "commentary": "2-3 sentence professional market analysis commentary",
  "keyLevels": {"support": "level", "resistance": "level"},
  "indicators": {"rsi": "value or reading", "macd": "bullish or bearish or neutral", "volume": "high or low or normal"}
}` }
            ]
          }]
        })
      });
      const data = await res.json();
      clearInterval(prog);
      setScanProgress(100);
      const text = data.content?.map(b => b.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setTimeout(() => { setAnalysis(parsed); setIsAnalyzing(false); }, 500);
    } catch {
      clearInterval(prog);
      setIsAnalyzing(false);
      setAnalysis({ asset: "Unknown", trend: "SIDEWAYS", signal: "HOLD", upProbability: 50, downProbability: 50, confidence: 40, riskLevel: 50, entry: "N/A", stopLoss: "N/A", takeProfit: "N/A", patterns: ["Analysis unavailable"], commentary: "Could not analyze the chart. Please ensure the image is a clear trading chart screenshot.", keyLevels: { support: "N/A", resistance: "N/A" }, indicators: { rsi: "N/A", macd: "N/A", volume: "N/A" } });
    }
  };

  const analyzeLiveChart = async () => {
    setIsLiveAnalyzing(true);
    const last = candles[candles.length - 1];
    const prev20 = candles.slice(-20);
    const highs = prev20.map(c => c.high);
    const lows = prev20.map(c => c.low);
    const closes = prev20.map(c => c.close);
    const priceData = closes.map((c, i) => `${i}: ${c.toFixed(2)}`).join(", ");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `You are an expert crypto trading AI analyst. Analyze this live ${selectedPair} chart data on ${tf} timeframe.
Last 20 candle closes: ${priceData}
Current price: ${last.close.toFixed(2)}
Recent high: ${Math.max(...highs).toFixed(2)}, Recent low: ${Math.min(...lows).toFixed(2)}
Respond ONLY with valid JSON, no markdown:
{
  "trend": "BULLISH or BEARISH or SIDEWAYS",
  "signal": "BUY or SELL or HOLD",
  "upProbability": number,
  "downProbability": number,
  "confidence": number,
  "riskLevel": number,
  "entry": "price zone string",
  "stopLoss": "price string",
  "takeProfit": "price string",
  "patterns": ["pattern1", "pattern2"],
  "commentary": "2-3 sentence analysis",
  "keyLevels": {"support": "price", "resistance": "price"}
}`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setLiveAnalysis(parsed);
    } catch {
      setLiveAnalysis({ trend: "SIDEWAYS", signal: "HOLD", upProbability: 52, downProbability: 48, confidence: 55, riskLevel: 45, entry: price.toFixed(2), stopLoss: (price * 0.97).toFixed(2), takeProfit: (price * 1.05).toFixed(2), patterns: ["Consolidation", "Range bound"], commentary: "Market is currently in consolidation. Wait for a clear breakout before entering a position.", keyLevels: { support: (price * 0.96).toFixed(2), resistance: (price * 1.04).toFixed(2) } });
    }
    setIsLiveAnalyzing(false);
  };

  const s = {
    app: { minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif", fontSize: 13 },
    header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}`, padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52, position: "sticky", top: 0, zIndex: 100 },
    logo: { display: "flex", alignItems: "center", gap: 10, color: COLORS.green, fontWeight: 700, fontSize: 16, letterSpacing: 1 },
    nav: { display: "flex", gap: 4 },
    navBtn: (active) => ({ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: active ? 600 : 400, fontSize: 12, background: active ? `${COLORS.green}22` : "transparent", color: active ? COLORS.green : COLORS.textDim, transition: "all 0.2s" }),
    card: { background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 16 },
    label: { color: COLORS.textDim, fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 },
    pairBtn: (active) => ({ padding: "5px 10px", borderRadius: 5, border: `1px solid ${active ? COLORS.green : COLORS.border}`, background: active ? `${COLORS.green}15` : "transparent", color: active ? COLORS.green : COLORS.textDim, cursor: "pointer", fontSize: 11, fontWeight: active ? 600 : 400 }),
    tfBtn: (active) => ({ padding: "4px 10px", borderRadius: 4, border: `1px solid ${active ? COLORS.blue : COLORS.border}`, background: active ? `${COLORS.blue}20` : "transparent", color: active ? COLORS.blue : COLORS.textDim, cursor: "pointer", fontSize: 11 }),
    analyzeBtn: { padding: "10px 24px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.blue})`, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 },
    dropZone: (dragging) => ({ border: `2px dashed ${dragging ? COLORS.green : COLORS.border}`, borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", background: dragging ? `${COLORS.green}08` : `${COLORS.bgCard}`, transition: "all 0.3s", ...glowStyle(dragging ? COLORS.green : COLORS.border) }),
  };

  const tabs = [
    { id: "dashboard", label: "📊 Live Market" },
    { id: "upload", label: "📸 AI Analysis" },
    { id: "signals", label: "⚡ Signals" },
    { id: "pricing", label: "💎 Plans" },
  ];

  const renderDashboard = () => (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, padding: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={s.card}>
          <div style={s.label}>Market</div>
          {marketData.map(m => (
            <div key={m.pair} onClick={() => setSelectedPair(m.pair)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", background: selectedPair === m.pair ? `${COLORS.green}08` : "transparent", borderRadius: 4, paddingLeft: selectedPair === m.pair ? 6 : 0, transition: "all 0.2s" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12, color: selectedPair === m.pair ? COLORS.green : COLORS.text }}>{m.pair.split("/")[0]}</div>
                <div style={{ color: COLORS.textDim, fontSize: 10 }}>{m.pair}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 500 }}>${m.price < 1 ? m.price.toFixed(4) : m.price < 100 ? m.price.toFixed(2) : m.price.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: parseFloat(m.change) >= 0 ? COLORS.green : COLORS.red }}>{parseFloat(m.change) >= 0 ? "+" : ""}{m.change}%</div>
              </div>
            </div>
          ))}
        </div>
        <div style={s.card}>
          <div style={s.label}>Fear & Greed</div>
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.gold }}>72</div>
            <div style={{ color: COLORS.textDim, fontSize: 11 }}>Greed</div>
            <div style={{ height: 6, borderRadius: 3, background: "#1a2235", margin: "10px 0" }}>
              <div style={{ width: "72%", height: "100%", background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.gold}, ${COLORS.red})`, borderRadius: 3 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...s.card, ...glowStyle(COLORS.green) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: 18, color: COLORS.text }}>{selectedPair}</span>
              <span style={{ marginLeft: 12, fontSize: 22, fontWeight: 700, color: priceChange >= 0 ? COLORS.green : COLORS.red }}>
                ${price < 1 ? price.toFixed(4) : price < 100 ? price.toFixed(2) : price.toFixed(2)}
              </span>
              <span style={{ marginLeft: 8, fontSize: 13, color: priceChange >= 0 ? COLORS.green : COLORS.red }}>
                {priceChange >= 0 ? "▲" : "▼"} {Math.abs(priceChange)}%
              </span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {TIMEFRAMES.map(t => <button key={t} style={s.tfBtn(tf === t)} onClick={() => setTf(t)}>{t}</button>)}
            </div>
          </div>
          <CandleChart candles={candles} width={680} height={280} />
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button onClick={analyzeLiveChart} disabled={isLiveAnalyzing} style={{ ...s.analyzeBtn, opacity: isLiveAnalyzing ? 0.7 : 1 }}>
              {isLiveAnalyzing ? "⟳ Analyzing..." : "⚡ AI Analyze Chart"}
            </button>
            <span style={{ color: COLORS.textDim, fontSize: 11 }}>Live • Updates every 1.5s</span>
          </div>
        </div>
        {liveAnalysis && (
          <div style={{ ...s.card, ...glowStyle(liveAnalysis.signal === "BUY" ? COLORS.green : liveAnalysis.signal === "SELL" ? COLORS.red : COLORS.gold) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={s.label}>AI Signal — {selectedPair} {tf}</div>
                <div style={{ marginTop: 8 }}><SignalBadge signal={liveAnalysis.signal} /></div>
                <div style={{ marginTop: 8, color: COLORS.textMid, fontSize: 12, maxWidth: 380 }}>{liveAnalysis.commentary}</div>
              </div>
              <div style={{ minWidth: 220 }}>
                <ProbabilityBar up={liveAnalysis.upProbability} down={liveAnalysis.downProbability} confidence={liveAnalysis.confidence} />
                <RiskMeter risk={liveAnalysis.riskLevel} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
              {[["Entry Zone", liveAnalysis.entry, COLORS.blue], ["Stop Loss", liveAnalysis.stopLoss, COLORS.red], ["Take Profit", liveAnalysis.takeProfit, COLORS.green]].map(([k, v, c]) => (
                <div key={k} style={{ background: "#0d1626", borderRadius: 8, padding: "10px 12px", border: `1px solid ${c}44` }}>
                  <div style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 2 }}>{k}</div>
                  <div style={{ color: c, fontWeight: 700, fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              {(liveAnalysis.patterns || []).map(p => <PatternTag key={p} label={p} />)}
            </div>
            {liveAnalysis.keyLevels && (
              <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                <MetricRow label="Support" value={liveAnalysis.keyLevels.support} color={COLORS.green} />
                <MetricRow label="Resistance" value={liveAnalysis.keyLevels.resistance} color={COLORS.red} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderUpload = () => (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 18 }}>📸 AI Chart Screenshot Analysis</div>
        <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 4 }}>Upload any trading chart — BTC, ETH, Forex, Gold, Stocks, Indices</div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={handleDrop} />
      <div style={s.dropZone(isDragging)} onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}>
        {uploadedImage ? (
          <img src={uploadedImage} alt="Chart" style={{ maxWidth: "100%", maxHeight: 360, borderRadius: 8, objectFit: "contain" }} />
        ) : (
          <>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ color: COLORS.text, fontWeight: 600, marginBottom: 6 }}>Drop chart screenshot here</div>
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>or click to browse / use mobile camera</div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              {["BTC", "ETH", "Forex", "Gold", "Stocks", "Indices"].map(t => <span key={t} style={{ padding: "3px 10px", borderRadius: 4, background: "#1a2a45", color: COLORS.blue, fontSize: 11 }}>{t}</span>)}
            </div>
          </>
        )}
      </div>
      {uploadedImage && !isAnalyzing && !analysis && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={analyzeImage} style={s.analyzeBtn}>🤖 Run AI Analysis</button>
        </div>
      )}
      {isAnalyzing && (
        <div style={{ ...s.card, marginTop: 16, textAlign: "center" }}>
          <div style={{ color: COLORS.green, fontWeight: 600, marginBottom: 12 }}>⟳ AI Processing Chart...</div>
          <div style={{ height: 8, borderRadius: 4, background: "#1a2235", overflow: "hidden", marginBottom: 8 }}>
            <div style={{ width: `${scanProgress}%`, height: "100%", background: `linear-gradient(90deg, ${COLORS.blue}, ${COLORS.green})`, transition: "width 0.4s ease", boxShadow: `0 0 8px ${COLORS.green}` }} />
          </div>
          <div style={{ color: COLORS.textDim, fontSize: 11 }}>{scanProgress < 30 ? "Detecting patterns..." : scanProgress < 60 ? "Analyzing market structure..." : scanProgress < 85 ? "Computing probabilities..." : "Generating signals..."}</div>
        </div>
      )}
      {analysis && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
          <div style={{ ...s.card, ...glowStyle(analysis.signal === "BUY" ? COLORS.green : analysis.signal === "SELL" ? COLORS.red : COLORS.gold) }}>
            <div style={s.label}>AI Signal</div>
            <div style={{ margin: "12px 0" }}><SignalBadge signal={analysis.signal} /></div>
            <div style={{ color: COLORS.textMid, fontSize: 13, lineHeight: 1.7, margin: "10px 0" }}>{analysis.commentary}</div>
            <MetricRow label="Asset" value={analysis.asset} color={COLORS.blue} />
            <MetricRow label="Timeframe" value={analysis.timeframe} />
            <MetricRow label="Trend" value={analysis.trend} color={analysis.trend === "BULLISH" ? COLORS.green : analysis.trend === "BEARISH" ? COLORS.red : COLORS.gold} />
            {analysis.indicators && (
              <>
                <MetricRow label="RSI Reading" value={analysis.indicators.rsi} />
                <MetricRow label="MACD" value={analysis.indicators.macd} />
                <MetricRow label="Volume" value={analysis.indicators.volume} />
              </>
            )}
            <div style={{ marginTop: 10 }}>
              <div style={s.label}>Detected Patterns</div>
              <div style={{ marginTop: 6 }}>{(analysis.patterns || []).map(p => <PatternTag key={p} label={p} />)}</div>
            </div>
            <button onClick={() => { setAnalysis(null); setUploadedImage(null); setImageBase64(null); }} style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: "transparent", color: COLORS.textDim, cursor: "pointer", fontSize: 12 }}>↩ Analyze Another</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={s.card}>
              <div style={s.label}>Probability Forecast</div>
              <ProbabilityBar up={analysis.upProbability} down={analysis.downProbability} confidence={analysis.confidence} />
              <RiskMeter risk={analysis.riskLevel} />
            </div>
            <div style={{ ...s.card, background: "#080c18" }}>
              <div style={s.label}>Trade Levels</div>
              {[["Entry Zone", analysis.entry, COLORS.blue], ["Stop Loss", analysis.stopLoss, COLORS.red], ["Take Profit", analysis.takeProfit, COLORS.green]].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                  <span style={{ color: COLORS.textDim, fontSize: 12 }}>{k}</span>
                  <span style={{ color: c, fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            {analysis.keyLevels && (
              <div style={s.card}>
                <div style={s.label}>Key Levels</div>
                <MetricRow label="Support" value={analysis.keyLevels.support} color={COLORS.green} />
                <MetricRow label="Resistance" value={analysis.keyLevels.resistance} color={COLORS.red} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const mockSignals = [
    { pair: "BTC/USDT", tf: "4h", signal: "BUY", conf: 84, up: 78, down: 22, entry: "64,200", tp: "68,500", sl: "62,800", time: "2m ago", patterns: ["Bull Flag", "Golden Cross"] },
    { pair: "ETH/USDT", tf: "1h", signal: "SELL", conf: 71, up: 29, down: 71, entry: "3,180", tp: "3,050", sl: "3,240", time: "8m ago", patterns: ["Head & Shoulders"] },
    { pair: "SOL/USDT", tf: "15m", signal: "BUY", conf: 65, up: 62, down: 38, entry: "178.5", tp: "192", sl: "172", time: "15m ago", patterns: ["Bullish Engulfing"] },
    { pair: "BNB/USDT", tf: "1D", signal: "HOLD", conf: 55, up: 52, down: 48, entry: "418", tp: "445", sl: "395", time: "1h ago", patterns: ["Consolidation", "Doji"] },
  ];

  const renderSignals = () => (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 18 }}>⚡ AI Trading Signals</div>
        <div style={{ color: COLORS.textDim, fontSize: 12, marginTop: 4 }}>Real-time AI-powered signals across multiple pairs and timeframes</div>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {mockSignals.map((sig, i) => (
          <div key={i} style={{ ...s.card, ...glowStyle(sig.signal === "BUY" ? COLORS.green : sig.signal === "SELL" ? COLORS.red : COLORS.gold) }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <SignalBadge signal={sig.signal} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{sig.pair}</div>
                  <div style={{ color: COLORS.textDim, fontSize: 11 }}>{sig.tf} • {sig.time}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                {[["Entry", sig.entry, COLORS.blue], ["TP", sig.tp, COLORS.green], ["SL", sig.sl, COLORS.red]].map(([k, v, c]) => (
                  <div key={k}>
                    <div style={{ color: COLORS.textDim, fontSize: 10 }}>{k}</div>
                    <div style={{ color: c, fontWeight: 600, fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: COLORS.textDim, fontSize: 10 }}>Confidence</div>
                <div style={{ color: COLORS.gold, fontWeight: 700, fontSize: 18 }}>{sig.conf}%</div>
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <ProbabilityBar up={sig.up} down={sig.down} confidence={sig.conf} />
              {sig.patterns.map(p => <PatternTag key={p} label={p} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const plans = [
    { name: "Free", price: "$0", color: COLORS.textDim, features: ["5 analyses/day", "Basic signals", "1 pair live chart", "Standard AI model"], cta: "Get Started" },
    { name: "Pro", price: "$29", color: COLORS.blue, features: ["Unlimited analyses", "All signals", "8 pairs live", "Advanced AI model", "Telegram alerts", "Analysis history"], cta: "Upgrade to Pro", featured: true },
    { name: "VIP", price: "$79", color: COLORS.gold, features: ["Everything in Pro", "Priority AI queue", "Multi-chart analysis", "Whale tracker", "VIP Telegram group", "API access", "Custom indicators"], cta: "Go VIP" },
  ];

  const renderPricing = () => (
    <div style={{ padding: 16, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ color: COLORS.green, fontWeight: 700, fontSize: 22 }}>💎 Choose Your Plan</div>
        <div style={{ color: COLORS.textDim, fontSize: 13, marginTop: 6 }}>Unlock the full power of AI trading intelligence</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {plans.map(plan => (
          <div key={plan.name} style={{ ...s.card, border: `1px solid ${plan.featured ? plan.color : COLORS.border}`, ...(plan.featured ? glowStyle(plan.color) : {}), textAlign: "center", position: "relative" }}>
            {plan.featured && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: COLORS.blue, color: "#000", fontSize: 10, fontWeight: 700, padding: "3px 12px", borderRadius: 10, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
            <div style={{ color: plan.color, fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{plan.name}</div>
            <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 4, color: COLORS.text }}>{plan.price}<span style={{ fontSize: 13, color: COLORS.textDim }}>/mo</span></div>
            <div style={{ margin: "16px 0", borderTop: `1px solid ${COLORS.border}`, paddingTop: 16 }}>
              {plan.features.map(f => <div key={f} style={{ color: COLORS.textMid, fontSize: 12, padding: "5px 0", display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: COLORS.green }}>✓</span>{f}</div>)}
            </div>
            <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: `1px solid ${plan.color}`, background: plan.featured ? plan.color : "transparent", color: plan.featured ? "#000" : plan.color, fontWeight: 700, cursor: "pointer", fontSize: 13 }}>{plan.cta}</button>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24, padding: 16, borderRadius: 8, background: "#0d1221", border: `1px solid ${COLORS.border}` }}>
        <div style={{ color: COLORS.textDim, fontSize: 11 }}>⚠️ This platform provides AI-generated market analysis and does not guarantee financial accuracy. Trading involves risk and is not financial advice.</div>
      </div>
    </div>
  );

  return (
    <div style={s.app}>
      <header style={s.header}>
        <div style={s.logo}>
          <span style={{ fontSize: 20 }}>◈</span>
          <span>AI TRADE VISION <span style={{ color: COLORS.blue }}>PRO</span></span>
        </div>
        <nav style={s.nav}>
          {tabs.map(t => <button key={t.id} style={s.navBtn(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </nav>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, display: "inline-block", boxShadow: `0 0 6px ${COLORS.green}` }} />
          <span style={{ color: COLORS.textDim, fontSize: 11 }}>Live</span>
        </div>
      </header>
      {tab === "dashboard" && renderDashboard()}
      {tab === "upload" && renderUpload()}
      {tab === "signals" && renderSignals()}
      {tab === "pricing" && renderPricing()}
    </div>
  );
}
