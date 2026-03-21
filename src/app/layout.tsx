import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sentinel — Intelligent Keeper Agent",
  description: "Autonomous DeFi keeper agent on Hedera + Bonzo Finance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Animated background */}
        <div className="bg-animated">
          {[...Array(8)].map((_, i) => (
            <svg
              key={i}
              className="hex-particle"
              width="40" height="46"
              viewBox="0 0 40 46"
              style={{
                left: `${10 + i * 12}%`,
                animationDuration: `${14 + i * 3}s`,
                animationDelay: `${i * 2}s`,
                width: `${24 + i * 8}px`,
              }}
            >
              <polygon
                points="20,2 38,12 38,34 20,44 2,34 2,12"
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
            </svg>
          ))}
        </div>
        {children}
      </body>
    </html>
  );
}