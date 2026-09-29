# Lavid — Generador de imágenes con Higgsfield

Integración mínima (sin dependencias) con la API de [Higgsfield](https://higgsfield.ai) para crear imágenes a partir de texto.

## Configuración

1. Crea tus API keys en el panel de Higgsfield (obtendrás un **Key ID** y un **Key Secret**).
2. Copia el archivo de ejemplo y completa tus credenciales:
   ```bash
   cp .env.example .env
   # HF_CREDENTIALS=KEY_ID:KEY_SECRET
   ```
3. Requiere Node.js 20.6 o superior.

## Uso

**Interfaz web**
```bash
npm start
# abre http://localhost:3000
```

**Línea de comandos**
```bash
npm run generate -- "retrato de una familia en un parque al atardecer" 16:9
```

**Desde tu código**
```js
import { generateImage, imageUrls } from './src/higgsfield.js';

const result = await generateImage({ prompt: 'un faro al amanecer', aspect_ratio: '9:16' });
console.log(imageUrls(result));
```

## Cómo funciona

- `POST https://api.higgsfield.ai/<modelo>` con cabecera `Authorization: Key KEY_ID:KEY_SECRET` → devuelve un `request_id`.
- `GET https://api.higgsfield.ai/requests/<request_id>/status` → `queued`, `in_progress`, `completed`, `failed` o `nsfw`.
- Cuando está `completed`, las URLs están en `images[].url`.

El modelo se cambia con la variable `HF_MODEL` (por defecto `flux-pro/kontext/max/text-to-image`). Cada modelo acepta parámetros distintos; consulta el catálogo en la documentación de Higgsfield.

> Las credenciales solo se usan en el servidor. Nunca las pongas en el HTML ni las subas al repositorio (`.env` está en `.gitignore`).
