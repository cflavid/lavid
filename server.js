import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { submitImage, getStatus, imageUrls } from './src/higgsfield.js';

const PORT = process.env.PORT || 3000;

function sendJson(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 1e6) throw new Error('Solicitud demasiado grande');
  }
  return body ? JSON.parse(body) : {};
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(await readFile(new URL('./public/index.html', import.meta.url)));
    }

    // Crea una generación y devuelve el request_id para consultar el estado
    if (req.method === 'POST' && url.pathname === '/api/generate') {
      const { prompt, aspect_ratio = '1:1', seed } = await readBody(req);
      const input = { prompt, aspect_ratio };
      if (seed !== undefined && seed !== '') input.seed = Number(seed);
      const result = await submitImage(input);
      return sendJson(res, 202, { request_id: result.request_id, status: result.status });
    }

    const match = url.pathname.match(/^\/api\/status\/([\w-]+)$/);
    if (req.method === 'GET' && match) {
      const result = await getStatus(match[1]);
      return sendJson(res, 200, { status: result.status, images: imageUrls(result) });
    }

    sendJson(res, 404, { error: 'No encontrado' });
  } catch (err) {
    console.error(err.message, err.details ?? '');
    sendJson(res, err.status && err.status < 500 ? err.status : 500, { error: err.message, details: err.details });
  }
});

server.listen(PORT, () => console.log(`Servidor listo en http://localhost:${PORT}`));
