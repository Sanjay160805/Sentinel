"use client";
import { useEffect, useState } from "react";

interface Tweet {
  id: number;
  username: string;
  content: string;
  timestamp: string;
  likes?: number;
  retweets?: number;
}

export default function TweetFeed() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const load = () => fetch("/api/tweets?limit=6").then(r => r.json())
      .then(d => { setTweets(d.tweets ?? []); setTotal(d.total ?? 0); }).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "—";
    // Handle both "2026-03-14 15:19:00" and "2026-03-14T15:19:00" formats
    const d = new Date(timestamp.replace(" ", "T"));
    if (isNaN(d.getTime())) {
      // Last resort: just slice the date portion directly from string
      return timestamp.slice(0, 10);
    }
    return d.toLocaleDateString();
  };

  return (
    <div className="card">
      <div className="card-accent" style={{ background: "linear-gradient(90deg, #0ea5e9, #06b6d4)" }} />
      <div className="card-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
          <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"/>
        </svg>
        Recent Signals
        <span className="mono" style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
          {total.toLocaleString()} total
        </span>
      </div>

      <div style={{ maxHeight: 280, overflowY: "auto" }}>
        {tweets.length === 0 ? (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.78rem" }}>No tweets loaded.</p>
        ) : tweets.map((t, i) => (
          <div key={t.id ?? i} className="tweet-item">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0ea5e9" }}>
                @{t.username}
              </span>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>
                {formatDate(t.timestamp)}
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
              {t.content?.slice(0, 120)}{(t.content?.length ?? 0) > 120 ? "..." : ""}
            </p>
            {(t.likes !== undefined || t.retweets !== undefined) && (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.3rem" }}>
                {t.likes !== undefined && (
                  <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>♥ {t.likes}</span>
                )}
                {t.retweets !== undefined && (
                  <span style={{ fontSize: "0.68rem", color: "var(--text-secondary)" }}>⟲ {t.retweets}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}