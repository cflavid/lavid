// Uso: npm run generate -- "un gato astronauta" [aspect_ratio]
import { generateImage, imageUrls } from '../src/higgsfield.js';

const [prompt, aspectRatio = '1:1'] = process.argv.slice(2);
if (!prompt) {
  console.error('Uso: npm run generate -- "tu prompt" [aspect_ratio]');
  process.exit(1);
}

try {
  console.log('Generando imagen...');
  const result = await generateImage({ prompt, aspect_ratio: aspectRatio });
  if (result.status !== 'completed') {
    console.error(`La generación terminó con estado: ${result.status}`);
    process.exit(1);
  }
  for (const url of imageUrls(result)) console.log(url);
} catch (err) {
  console.error(err.message, err.details ? JSON.stringify(err.details) : '');
  process.exit(1);
}
