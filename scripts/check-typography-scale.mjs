// Read the production clamp tokens and verify the heading hierarchy at any width.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = ['global.css', 'typography.css'].map(name => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8')).join('\n');
const root = [...css.matchAll(/:root\s*\{([^}]+)\}/g)].map(match => match[1]).join('\n');
assert(root, 'The production :root tokens must exist.');
const tokens = ['--text-page-title', '--text-2xl', '--text-xl', '--text-lg'];
const rootSize = 16;
const minimumRatio = 1.25;
const widths = [375, 768, 1024, 1280, 1440, 1920];

function parseClamp(token) {
  const value = [...root.matchAll(new RegExp(`${token}:\\s*([^;]+);`, 'g'))].at(-1)?.[1];
  const match = value?.match(/^clamp\((\d*\.?\d+)rem,\s*(\d*\.?\d+)vw,\s*(\d*\.?\d+)rem\)$/);
  assert(match, `${token} must be a rem/vw/rem clamp; received ${value}.`);
  return { token, expression: value, min: Number(match[1]) * rootSize, fluid: Number(match[2]) / 100, max: Number(match[3]) * rootSize };
}

const scale = tokens.map(parseClamp);
for (let index = 0; index < scale.length - 1; index += 1) {
  const larger = scale[index];
  const smaller = scale[index + 1];
  // min/max are monotonic: satisfying each argument proves the full clamp ratio.
  for (const argument of ['min', 'fluid', 'max']) {
    assert(larger[argument] / smaller[argument] >= minimumRatio, `${larger.token}/${smaller.token} ${argument} must be at least ${minimumRatio}.`);
  }
}

const rounded = (value) => Number(value.toFixed(2));
const rows = widths.map((width) => {
  const values = scale.map(({ min, fluid, max }) => Math.max(min, Math.min(width * fluid, max)));
  const ratios = values.slice(0, -1).map((value, index) => value / values[index + 1]);
  assert(ratios.every((ratio) => ratio >= minimumRatio), `Heading tiers collide at ${width}px.`);
  return { width, pageTitle: rounded(values[0]), h2: rounded(values[1]), h3: rounded(values[2]), lg: rounded(values[3]), 'title/h2': rounded(ratios[0]), 'h2/h3': rounded(ratios[1]), 'h3/lg': rounded(ratios[2]) };
});

console.log(`Production heading scale in CSS px (1rem = ${rootSize}px)`);
console.table(rows);
console.log(`PASS: all adjacent tiers stay >= ${minimumRatio} at every viewport width.`);
