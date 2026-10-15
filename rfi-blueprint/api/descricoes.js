const { neon } = require('@neondatabase/serverless');

function getAuthor(req) {
  const raw = req.headers['x-autor'] || '';
  try { return decodeURIComponent(String(raw)).trim().slice(0,120); }
  catch (_) { return String(raw).trim().slice(0,120); }
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body) && req.body.length) return JSON.parse(req.body.toString('utf8'));
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'database_not_configured' });
  const sql = neon(process.env.DATABASE_URL);
  try {
    if (req.method === 'GET') {
      const rows = await sql`select item_id, text_content, author, updated_at from descriptions order by item_id`;
      const out = {};
      for (const r of rows) out[r.item_id] = { t: r.text_content, a: r.author || 'Sem nome', c: r.updated_at };
      return res.status(200).json(out);
    }

    if (req.method === 'POST') {
      let body;
      try { body = await readJsonBody(req); }
      catch (_) { return res.status(400).json({ error: 'invalid_json' }); }

      const item = String(body.item ?? body.item_id ?? body.id ?? '').trim();
      const texto = String(body.texto ?? body.text_content ?? body.text ?? '').trim();
      const autor = getAuthor(req) || String(body.autor ?? body.author ?? '').trim().slice(0,120) || 'Sem nome';

      if (!item || item.length > 64 || !texto || texto.length > 20000) {
        console.warn('descricoes_invalid_payload', { hasItem: !!item, itemLength: item.length, hasTexto: !!texto, textoLength: texto.length });
        return res.status(400).json({ error: 'invalid_payload' });
      }

      const rows = await sql`
        insert into descriptions (item_id, text_content, author, created_at, updated_at)
        values (${item}, ${texto}, ${autor}, now(), now())
        on conflict (item_id) do update
          set text_content = excluded.text_content,
              author = excluded.author,
              updated_at = now()
        returning item_id, text_content, author, updated_at
      `;
      const r = rows[0];
      return res.status(200).json({ ok: true, t: r.text_content, a: r.author || 'Sem nome', c: r.updated_at });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('descricoes_api_error', err);
    return res.status(500).json({ error: 'database_error', detail: String(err && err.message || err).slice(0,300) });
  }
};
