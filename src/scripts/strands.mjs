// Adapted from React Bits Strands, David Haz (2026). See docs/licenses/Strands-LICENSE.md.
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;


// Same official Strands VERT/FRAG; React lifecycle replaced with an explicit Astro controller.
export function mountStrands(container) {
  let renderer, frame = 0, active = false, lost = false, last = 0, time = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  try {
    renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr: 1 });
    const gl = renderer.gl;
    if (!gl.getParameter(gl.VERSION).includes('WebGL 2')) throw new Error('WebGL2 unavailable');
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;
    const values = { uTime: 0, uResolution: [1, 1], uColors: [], uColorCount: 3, uStrandCount: 3,
      uSpeed: .18, uAmplitude: 1.2, uWaviness: 1, uThickness: .55, uGlow: 2.6, uTaper: 3,
      uSpread: 1, uHueShift: 0, uIntensity: .45, uOpacity: .7, uScale: 2.5, uSaturation: .65 };
    const uniforms = Object.fromEntries(Object.entries(values).map(([key,value]) => [key, { value }]));
    const program = new Program(gl, { vertex: VERT, fragment: FRAG, uniforms });
    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);
    container.dataset.renderer = 'react-bits-strands';
    const palette = () => {
      const colors = document.documentElement.dataset.theme === 'dark'
        ? ['#728CA5', '#9A8DB8', '#82A69A'] : ['#345C77', '#78658C', '#56776B'];
      program.uniforms.uColors.value = Array.from({length: MAX_COLORS}, (_,i) => new Color(colors[i % colors.length]));
    };
    const draw = () => { if (lost) return; palette(); program.uniforms.uTime.value = time; renderer.render({ scene: mesh }); };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; last = 0; container.dataset.running = 'false'; };
    const tick = now => {
      if (!active || document.hidden || reduced.matches || lost) { stop(); return; }
      if (last) time += Math.min((now - last) / 1000, .05);
      last = now; draw(); frame = requestAnimationFrame(tick);
    };
    const sync = () => { stop(); if (!active || document.hidden || lost) return; draw(); if (!reduced.matches) { container.dataset.running = 'true'; frame = requestAnimationFrame(tick); } };
    const resize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
      if (active) draw();
    };
    const loss = event => { event.preventDefault(); lost = true; stop(); gl.canvas.style.display = 'none'; container.dataset.fallback = 'true'; };
    gl.canvas.addEventListener('webglcontextlost', loss);
    const observer = new ResizeObserver(resize); observer.observe(container);
    const theme = new MutationObserver(() => { if (active) draw(); });
    theme.observe(document.documentElement, {attributes:true, attributeFilter:['data-theme']});
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    resize();
    return { setActive(value) { active = value; sync(); }, destroy() { stop(); observer.disconnect(); theme.disconnect(); reduced.removeEventListener('change',sync); document.removeEventListener('visibilitychange',sync); gl.canvas.remove(); gl.getExtension('WEBGL_lose_context')?.loseContext(); } };
  } catch {
    container.dataset.fallback = 'true';
    renderer?.gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return { setActive() {}, destroy() {} };
  }
}
