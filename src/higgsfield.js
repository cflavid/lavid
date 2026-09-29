// Cliente mínimo para la API de Higgsfield (solo servidor: nunca expongas las credenciales en el navegador).
const BASE_URL = process.env.HF_BASE_URL || 'https://api.higgsfield.ai';
const FINAL_STATUSES = new Set(['completed', 'failed', 'nsfw']);

function authHeader() {
  const creds =
    process.env.HF_CREDENTIALS ||
    (process.env.HF_API_KEY && process.env.HF_API_SECRET
      ? `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}`
      : null);
  if (!creds || !creds.includes(':')) {
    throw new Error('Falta HF_CREDENTIALS (formato KEY_ID:KEY_SECRET). Revisa tu archivo .env');
  }
  return `Key ${creds}`;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const messages = {
      401: 'Credenciales de Higgsfield inválidas',
      403: 'Créditos insuficientes en Higgsfield',
      422: 'Parámetros inválidos',
    };
    const err = new Error(`${messages[res.status] || 'Error de Higgsfield'} (HTTP ${res.status})`);
    err.status = res.status;
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * Envía una solicitud de generación. Devuelve { request_id, status, status_url, ... }.
 * @param {object} input  Parámetros del modelo, p. ej. { prompt, aspect_ratio, seed }
 * @param {object} [opts] { model, webhookUrl }
 */
export async function submitImage(input, { model = process.env.HF_MODEL, webhookUrl } = {}) {
  if (!input?.prompt) throw Object.assign(new Error('El campo "prompt" es obligatorio'), { status: 400 });
  const endpoint = `/${(model || 'flux-pro/kontext/max/text-to-image').replace(/^\/+/, '')}`;
  const query = webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : '';
  return request(`${endpoint}${query}`, { method: 'POST', body: JSON.stringify(input) });
}

/** Consulta el estado: queued | in_progress | completed | failed | nsfw */
export function getStatus(requestId) {
  return request(`/requests/${encodeURIComponent(requestId)}/status`);
}

/** Cancela una solicitud en cola. */
export function cancelRequest(requestId) {
  return request(`/requests/${encodeURIComponent(requestId)}/cancel`, { method: 'POST' });
}

/** Extrae las URLs de imagen de una respuesta completada. */
export function imageUrls(result) {
  return (result?.images || []).map((img) => img.url).filter(Boolean);
}

/** Envía y espera hasta que termine. Devuelve la respuesta final. */
export async function generateImage(input, { intervalMs = 2000, timeoutMs = 5 * 60_000, ...opts } = {}) {
  const submitted = await submitImage(input, opts);
  if (FINAL_STATUSES.has(submitted.status)) return submitted;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, intervalMs));
    try {
      const status = await getStatus(submitted.request_id);
      if (FINAL_STATUSES.has(status.status)) return status;
    } catch (err) {
      if (!(err.status >= 500)) throw err; // reintenta solo errores del servidor
    }
  }
  throw new Error(`Tiempo de espera agotado (request_id: ${submitted.request_id})`);
}
