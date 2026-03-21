"use client";
import { useEffect, useState } from "react";

interface Tweet {
  id: number;
  username: string;
  text: string;
  time: string;
  scraped_at: string;
  likes?: number;
  retweets?: number;
  is_crypto?: number;
}

export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);
  const [cryptoTotal, setCryptoTotal] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    const load = () => fetch("/api/tweets?limit=10").then(r => r.json())
      .then(d => {
        setTweets(d.tweets ?? []);
        setTotal(d.total ?? 0);
        setCryptoTotal(d.cryptoTotal ?? 0);
      }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const fmt = (ts: string) => {
    if (!ts) return "—";
    const d = new Date(ts.replace(" ", "T"));
    if (isNaN(d.getTime())) return ts.slice(0, 16);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="card">
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
        Recent Signals
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {cryptoTotal > 0 && (
            <span className="badge badge-tighten" style={{ fontSize: "0.6rem" }}>
              {cryptoTotal.toLocaleString()} crypto
            </span>
          )}
          <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            {total > 0 ? `${total.toLocaleString()} total` : "loading..."}
          </span>
        </div>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {tweets.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>No tweets loaded.</p>
        ) : tweets.map((t, i) => (
          <div key={t.id ?? i} className="tweet-item">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0ea5e9" }}>
                  @{t.username}
                </span>
                {t.is_crypto === 1 && (
                  <span className="badge badge-tighten" style={{ fontSize: "0.58rem", padding: "0.1rem 0.3rem" }}>
                    crypto
                  </span>
                )}
              </div>
              <span className="mono" style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>
                {fmt(t.scraped_at || t.time)}
              </span>
            </div>

            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {expanded === t.id
                ? t.text
                : `${t.text?.slice(0, 100)}${(t.text?.length ?? 0) > 100 ? "..." : ""}`
              }
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.3rem" }}>
              {t.likes !== undefined && (
                <span style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>♥ {t.likes}</span>
              )}
              {t.retweets !== undefined && (
                <span style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>⟲ {t.retweets}</span>
              )}
              {(t.text?.length ?? 0) > 100 && (
                <span
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  style={{
                    fontSize: "0.66rem", color: "var(--accent)",
                    cursor: "pointer", marginLeft: "auto", fontWeight: 600,
                  }}
                >
                  {expanded === t.id ? "Show less ↑" : "Read more ↓"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}