import fs from 'fs';

const GITHUB_RAW_DB_URL =
  'https://github.com/Sanjay160805/Sentinel/raw/data/tweets.db';
const GITHUB_COMMITS_URL =
  'https://api.github.com/repos/Sanjay160805/Sentinel/commits?sha=data&per_page=1';

let cachedAt = 0;
let lastCommitSha = '';
const CACHE_TTL_MS = 60 * 1000; // Re-check GitHub at most once per minute

export async function getLocalDbPath(): Promise<string> {
  const tmpPath = '/tmp/tweets.db';

  // Rate-limit commit checks to once per minute
  if (Date.now() - cachedAt < CACHE_TTL_MS) return tmpPath;

  try {
    // Check the latest commit SHA on the data branch
    const commitRes = await fetch(GITHUB_COMMITS_URL, {
      headers: {
        'User-Agent': 'Sentinel-App',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (commitRes.ok) {
      const commits = await commitRes.json();
      const latestSha: string = commits?.[0]?.sha ?? '';

      // If commit hasn't changed and file already exists, skip re-download
      if (latestSha && latestSha === lastCommitSha && fs.existsSync(tmpPath)) {
        cachedAt = Date.now();
        return tmpPath;
      }

      lastCommitSha = latestSha;
    }
  } catch {
    // Commit check failed — fall through and re-download anyway
  }

  // Download the latest DB from the data branch
  const res = await fetch(GITHUB_RAW_DB_URL, {
    headers: { 'User-Agent': 'Sentinel-App' },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`Failed to download tweets.db: HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  fs.writeFileSync(tmpPath, Buffer.from(buffer));

  cachedAt = Date.now();
  return tmpPath;
}