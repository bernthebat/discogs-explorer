export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter' });

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'YouTube API key not configured' });

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || 'YouTube API error' });
    }
    const data = await response.json();
    const videoId = data.items?.[0]?.id?.videoId || null;
    return res.status(200).json({ videoId, title: data.items?.[0]?.snippet?.title || null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to reach YouTube API' });
  }
}
