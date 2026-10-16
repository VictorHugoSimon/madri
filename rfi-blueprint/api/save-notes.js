module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body || '{}');
    const notes = body && body.notes;
    if (!notes || typeof notes !== 'object' || Array.isArray(notes)) {
      return res.status(400).json({ error: 'invalid_notes' });
    }
    const key = process.env.MADRI_EDIT_KEY;
    const base = process.env.MADRI_SUPABASE_URL;
    if (!key || !base) return res.status(500).json({ error: 'server_not_configured' });
    const response = await fetch(base.replace(/\/$/, '') + '/functions/v1/madri-save-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, notes })
    });
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { detail: text }; }
    if (!response.ok) return res.status(response.status).json(data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('madri save-notes error', error);
    return res.status(500).json({ error: 'save_failed' });
  }
};
