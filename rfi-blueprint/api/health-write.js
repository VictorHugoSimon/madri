const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  if (!process.env.DATABASE_URL) return res.status(500).json({ ok: false, error: 'database_not_configured' });
  const sql = neon(process.env.DATABASE_URL);
  const id = '__healthcheck__';
  try {
    await sql`insert into descriptions (item_id, text_content, author, created_at, updated_at) values (${id}, 'healthcheck', 'system', now(), now()) on conflict (item_id) do update set text_content='healthcheck', author='system', updated_at=now()`;
    const rows = await sql`select item_id, text_content from descriptions where item_id=${id}`;
    await sql`delete from descriptions where item_id=${id}`;
    return res.status(200).json({ ok: rows.length === 1 && rows[0].text_content === 'healthcheck', write: true, read: rows.length === 1, cleanup: true });
  } catch (err) {
    console.error('health_write_error', err);
    return res.status(500).json({ ok: false, error: String(err && err.message || err).slice(0,300) });
  }
};
