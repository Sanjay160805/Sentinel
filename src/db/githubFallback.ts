import https from 'https';
import fs from 'fs';

const GITHUB_RAW_DB_URL =
  'https://github.com/Sanjay160805/Sentinel/raw/data/tweets.db';

let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getLocalDbPath(): Promise<string> {
  const tmpPath = '/tmp/crypto_tweets.db';

  if (Date.now() - cachedAt < CACHE_TTL_MS) return tmpPath;

  await new Promise<void>((resolve, reject) => {
    const file = fs.createWriteStream(tmpPath);
    
    const request = (url: string) => {
      https.get(url, { headers: { 'User-Agent': 'Sentinel-App' } }, (res) => {
        // Follow redirects (GitHub raw URLs redirect)
        if (res.statusCode === 302 || res.statusCode === 301) {
          file.destroy();
          request(res.headers.location!);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(); });
        file.on('error', reject);
      }).on('error', reject);
    };

    request(GITHUB_RAW_DB_URL);
  });

  cachedAt = Date.now();
  return tmpPath;
}