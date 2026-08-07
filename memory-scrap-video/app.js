const input = document.querySelector('#assetInput');
const replay = document.querySelector('#replayButton');
const status = document.querySelector('#assetStatus');
const rootStyle = document.documentElement.style;
const photoSlots = [
  document.querySelector('.photo-main'),
  document.querySelector('.photo-cafe'),
  document.querySelector('.photo-sky'),
  document.querySelector('.film-photo-1'),
  document.querySelector('.film-photo-2'),
  document.querySelector('.film-photo-3'),
];
const initialAssets = [
  './inputs/IMG_4750.JPG',
  './inputs/dji_export_20260726_photo_0009.jpg',
  './inputs/IMG_4766.JPG',
  './inputs/IMG_4769.JPG',
  './inputs/dji_export_20260726_photo_0012.jpg',
  './inputs/IMG_4750.JPG',
];
const cutout = document.querySelector('.cutout');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (!delta) return { h: 0, s: 0, l: lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  return { h: hue, s: saturation, l: lightness };
}

function hsl(h, s, l) {
  return `hsl(${Math.round((h + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function hsla(h, s, l, a) {
  return `hsla(${Math.round((h + 360) % 360)} ${Math.round(s)}% ${Math.round(l)}% / ${a})`;
}

function readPalette(url) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 36;
        canvas.height = 36;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, 36, 36);
        const pixels = context.getImageData(0, 0, 36, 36).data;
        const bins = Array.from({ length: 24 }, () => ({ weight: 0, h: 0, s: 0 }));
        let totalWeight = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        let count = 0;

        for (let index = 0; index < pixels.length; index += 16) {
          const alpha = pixels[index + 3] / 255;
          if (alpha < 0.5) continue;
          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const color = rgbToHsl(r, g, b);
          const weight = 0.3 + color.s * 0.7;
          red += r; green += g; blue += b; count += 1;
          totalWeight += weight;
          if (color.s > 0.16 && color.l > 0.08 && color.l < 0.92) {
            const bin = bins[Math.floor(color.h / 15) % 24];
            bin.weight += weight;
            bin.h += color.h * weight;
            bin.s += color.s * weight;
          }
        }

        if (!count) return resolve(null);
        const average = rgbToHsl(red / count, green / count, blue / count);
        const accentBin = bins.reduce((best, current) => current.weight > best.weight ? current : best, bins[0]);
        const accent = accentBin.weight
          ? { h: accentBin.h / accentBin.weight, s: accentBin.s / accentBin.weight }
          : { h: average.h, s: Math.max(average.s, 0.35) };
        resolve({ average, accent, weight: totalWeight });
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

async function applyAdaptivePalette(urls) {
  const palettes = (await Promise.all(urls.map(readPalette))).filter(Boolean);
  if (!palettes.length) return;
  const total = palettes.reduce((sum, palette) => sum + palette.weight, 0);
  const averageHue = palettes.reduce((sum, palette) => sum + palette.average.h * palette.weight, 0) / total;
  const averageLightness = palettes.reduce((sum, palette) => sum + palette.average.l * palette.weight, 0) / total;
  const accent = palettes.reduce((best, palette) => palette.accent.s > best.accent.s ? palette : best, palettes[0]).accent;
  const accentHue = accent.h;
  const accentSaturation = clamp(accent.s * 100, 45, 78);
  const night = averageLightness < 0.43;

  rootStyle.setProperty('--bg', hsl(averageHue, 20, night ? 8 : 14));
  rootStyle.setProperty('--glow-a', hsla(accentHue + 38, 72, 54, 0.11));
  rootStyle.setProperty('--glow-b', hsla(accentHue, 66, 55, 0.14));
  rootStyle.setProperty('--paper', hsl(accentHue + 24, night ? 38 : 46, night ? 84 : 88));
  rootStyle.setProperty('--paper-2', hsl(accentHue + 8, night ? 28 : 38, night ? 88 : 91));
  rootStyle.setProperty('--frame', hsl(accentHue + 18, 24, 95));
  rootStyle.setProperty('--film', hsl(averageHue, 17, night ? 10 : 16));
  rootStyle.setProperty('--pink', hsl(accentHue, accentSaturation, 69));
  rootStyle.setProperty('--yellow', hsl(accentHue + 42, 78, 74));
  rootStyle.setProperty('--cyan', hsl(accentHue + 160, 42, 76));
  rootStyle.setProperty('--ink', hsl(accentHue + 22, 25, 93));
}

function setAssetBackground(slot, url) {
  slot.style.backgroundImage = `url("${url}")`;
  slot.style.backgroundSize = 'cover';
  slot.style.backgroundPosition = 'center';
}

function replayMotion() {
  document.body.classList.remove('capture-mode');
  document.querySelectorAll('.stage *').forEach((element) => {
    element.style.animation = 'none';
    void element.offsetHeight;
    element.style.animation = '';
  });
}

photoSlots.forEach((slot, index) => setAssetBackground(slot, initialAssets[index]));
setAssetBackground(cutout, './inputs/IMG_4769.JPG');
cutout.classList.add('photo-fallback');
applyAdaptivePalette(initialAssets);

input?.addEventListener('change', async () => {
  const files = [...input.files].slice(0, photoSlots.length);
  const urls = files.map((file) => URL.createObjectURL(file));
  urls.forEach((url, index) => setAssetBackground(photoSlots[index], url));
  if (urls[2]) setAssetBackground(cutout, urls[2]);
  await applyAdaptivePalette(urls);
  if (status) status.textContent = `已载入 ${files.length} 张照片，并根据照片色调更新边框和贴纸配色。`;
  replayMotion();
});

replay?.addEventListener('click', replayMotion);

window.__scrapbook = {
  replay: replayMotion,
  setCaptureMode: () => document.body.classList.add('capture-mode'),
};
