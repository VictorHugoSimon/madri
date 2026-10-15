const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'database_not_configured' });
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  const item = String(req.query.item || '').trim();
  if (!item || item.length > 64) return res.status(400).json({ error: 'invalid_item' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql`delete from descriptions where item_id = ${item}`;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('descricao_delete_error', err);
    return res.status(500).json({ error: 'database_error' });
  }
};
