import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const [inputDirectory] = process.argv.slice(2);
if (!inputDirectory) {
  console.error('Usage: npm run photos:prepare -- /path/to/approved-source-photos');
  process.exit(1);
}

const outputDirectory = resolve('public/images');
await mkdir(outputDirectory, { recursive: true });
for (const name of ['kitchen', 'bathroom', 'basement', 'stair']) {
  const source = join(resolve(inputDirectory), `${name}.jpg`);
  for (const [width, quality, suffix] of [[768, 88, ''], [480, 83, '-480']]) {
    const height = width * 2 / 3;
    const result = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
      '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(quality),
      join(outputDirectory, `${name}${suffix}.webp`),
    ], { stdio: 'inherit' });
    if (result.status !== 0) throw new Error(`Could not prepare ${source}. Check the input file and FFmpeg installation.`);
  }
}
