import { chromium } from 'playwright';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const framesDir = path.join(root, 'tmp-frames');
const output = path.join(root, 'memory-scrapbook-demo.mp4');
const fps = 30;
const seconds = 8;

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });

const mime = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json',
};
const server = createServer(async (req, res) => {
  const requested = req.url === '/' ? 'index.html' : req.url.slice(1).split('?')[0];
  const file = path.join(root, requested);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const { port } = server.address();

const browser = await chromium.launch({ headless: true });
// Capture at the authoring size; FFmpeg performs the final 2x upscale.
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__scrapbook));
await page.evaluate(() => window.__scrapbook.paletteReady);
await page.evaluate(() => window.__scrapbook.setCaptureMode());
await page.evaluate(() => document.getAnimations().forEach((animation) => animation.pause()));

for (let frame = 0; frame < fps * seconds; frame += 1) {
  await page.evaluate((timeMs) => {
    document.getAnimations().forEach((animation) => { animation.currentTime = timeMs; });
  }, (frame * 1000) / fps);
  await page.screenshot({ path: path.join(framesDir, `frame-${String(frame).padStart(4, '0')}.png`) });
}

await browser.close();
server.close();
execFileSync('ffmpeg', [
  '-y', '-framerate', String(fps), '-i', path.join(framesDir, 'frame-%04d.png'),
  '-vf', 'scale=1080:1920:flags=lanczos',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output,
], { stdio: 'inherit' });

console.log(`Rendered ${output}`);
