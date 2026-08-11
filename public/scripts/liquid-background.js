(() => {
  const canvas = document.querySelector('#ambient-flow')
  const cycleButton = document.querySelector('#background-cycle')
  if (!(canvas instanceof HTMLCanvasElement)) return

  const variantIndex = Object.freeze({ dither: 1, molten: 2, contour: 3 })
  let backgroundNames = {}
  try { backgroundNames = JSON.parse(decodeURIComponent(cycleButton?.dataset.backgroundNames || '%7B%7D')) } catch {}
  const configuredVariants = Object.keys(backgroundNames).filter((name) => Object.hasOwn(variantIndex, name))
  const variants = configuredVariants.length ? configuredVariants : Object.keys(variantIndex)
  const randomHistoryKey = 'formulasearch-background-last-random'
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let previousVariant = ''

  try { previousVariant = sessionStorage.getItem(randomHistoryKey) || '' } catch {}
  const randomPool = variants.filter((name) => name !== previousVariant)
  const randomValues = new Uint32Array(1)
  window.crypto?.getRandomValues?.(randomValues)
  const randomUnit = randomValues[0] ? randomValues[0] / 4294967296 : Math.random()
  let variant = randomPool[Math.floor(randomUnit * randomPool.length)] || variants[0]

  try { sessionStorage.setItem(randomHistoryKey, variant) } catch {}

  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    premultipliedAlpha: true,
  })

  if (!gl) {
    canvas.classList.add('ambient-flow--fallback')
    return
  }

  const vertexSource = `
    attribute vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `

  const fragmentSource = `
    precision highp float;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uSeed;
    uniform float uTheme;
    uniform float uVariant;

    float hash(vec2 point) {
      point = fract(point * vec2(123.34, 456.21));
      point += dot(point, point + 45.32 + uSeed * 0.001);
      return fract(point.x * point.y);
    }

    float noise(vec2 point) {
      vec2 cell = floor(point);
      vec2 local = fract(point);
      local = local * local * (3.0 - 2.0 * local);

      float a = hash(cell);
      float b = hash(cell + vec2(1.0, 0.0));
      float c = hash(cell + vec2(0.0, 1.0));
      float d = hash(cell + vec2(1.0, 1.0));

      return mix(mix(a, b, local.x), mix(c, d, local.x), local.y);
    }

    float fbm(vec2 point) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rotation = mat2(0.80, -0.60, 0.60, 0.80);

      for (int octave = 0; octave < 4; octave++) {
        value += amplitude * noise(point);
        point = rotation * point * 2.03 + 7.13;
        amplitude *= 0.5;
      }

      return value;
    }

    float bayer4(vec2 coordinate) {
      vec2 p = mod(floor(coordinate), 4.0);
      float index = p.x + p.y * 4.0;
      if (index < 0.5) return 0.0 / 16.0;
      if (index < 1.5) return 8.0 / 16.0;
      if (index < 2.5) return 2.0 / 16.0;
      if (index < 3.5) return 10.0 / 16.0;
      if (index < 4.5) return 12.0 / 16.0;
      if (index < 5.5) return 4.0 / 16.0;
      if (index < 6.5) return 14.0 / 16.0;
      if (index < 7.5) return 6.0 / 16.0;
      if (index < 8.5) return 3.0 / 16.0;
      if (index < 9.5) return 11.0 / 16.0;
      if (index < 10.5) return 1.0 / 16.0;
      if (index < 11.5) return 9.0 / 16.0;
      if (index < 12.5) return 15.0 / 16.0;
      if (index < 13.5) return 7.0 / 16.0;
      if (index < 14.5) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }

    float previewZones(vec2 point, float time) {
      vec2 drift = vec2(sin(time * 0.11), cos(time * 0.09)) * 0.08;
      vec2 topLeft = (point - vec2(-0.88, 0.46) - drift) * vec2(0.84, 1.38);
      vec2 bottomRight = (point - vec2(0.90, -0.42) + drift) * vec2(0.88, 1.34);
      float first = exp(-dot(topLeft, topLeft) * 4.0);
      float second = exp(-dot(bottomRight, bottomRight) * 3.8);
      return clamp(first + second, 0.0, 1.0);
    }

    vec4 renderDither(vec2 point) {
      float time = uTime * 0.028;
      vec2 p = point * 1.18;
      vec2 firstWarp = vec2(
        fbm(p * 2.1 + vec2(time, -time * 0.7)),
        fbm(p * 2.0 + vec2(-time * 0.6, time) + 9.4)
      );
      float field = fbm(p * 4.8 + firstWarp * 1.08);
      float primaryWave = 1.0 - smoothstep(0.045, 0.30, abs(sin((field + p.y * 0.16) * 7.2)));
      float secondaryWave = 1.0 - smoothstep(0.04, 0.22, abs(sin((field * 0.72 + firstWarp.y * 0.28 - p.x * 0.14) * 10.4)));
      float wave = clamp(primaryWave + secondaryWave * 0.34, 0.0, 1.0);
      float zones = previewZones(point, uTime);
      float value = wave * pow(zones, 0.78);
      float threshold = bayer4(gl_FragCoord.xy / 2.55);
      float dithered = step(threshold, clamp(value * 1.28, 0.0, 1.0));
      float alpha = dithered * (0.07 + value * mix(0.29, 0.42, uTheme));
      float colorPhase = 0.5 + 0.5 * sin(field * 8.0 + p.x * 3.4 - p.y * 2.2 + uTime * 0.13);
      float mineralPhase = 0.5 + 0.5 * cos(field * 5.2 - p.x * 2.0 + uTime * 0.08);
      vec3 lightCool = mix(vec3(0.04, 0.40, 0.42), vec3(0.12, 0.24, 0.62), mineralPhase);
      vec3 lightWarm = mix(vec3(0.70, 0.25, 0.12), vec3(0.82, 0.55, 0.15), mineralPhase);
      vec3 darkCool = mix(vec3(0.16, 0.78, 0.75), vec3(0.30, 0.42, 0.96), mineralPhase);
      vec3 darkWarm = mix(vec3(0.97, 0.38, 0.20), vec3(1.00, 0.70, 0.28), mineralPhase);
      vec3 color = mix(mix(lightCool, lightWarm, colorPhase), mix(darkCool, darkWarm, colorPhase), uTheme);
      return vec4(color * alpha, alpha);
    }

    vec4 renderMolten(vec2 point) {
      float time = uTime * 0.17;
      vec2 p = 4.0 * point - 0.5;
      vec2 i = p;
      float c = 0.0;
      float r = length(p + vec2(sin(time), sin(time * 0.3 + 5.0)) * 0.5);
      float distanceFromCenter = length(p);
      float rotation = distanceFromCenter + time + p.x;
      float cosRotation = cos(rotation);
      mat2 warp = mat2(
        cos(rotation - sin(time / 5.0)), sin(rotation),
        -sin(cosRotation - time), cosRotation
      ) * -0.19;

      for (int layer = 0; layer < 3; layer++) {
        p *= warp;
        float layerNumber = float(layer);
        float t = r - time / (layerNumber + 3.0);
        i -= p + vec2(
          cos(t - i.x - r) + sin(t + i.y),
          sin(t - i.y) + cos(t + i.x) + r
        );
        c += 0.14 / max(length(vec2(sin(i.x + t), cos(i.y + t))), 0.001);
      }

      c /= 5.7;
      float intensity = max(c - 0.028, 0.0) * 1.48;
      float perimeter = smoothstep(0.20, 0.66, length(point * vec2(0.78, 1.0)));
      intensity *= mix(0.24, 1.0, perimeter);
      float glow = pow(clamp(intensity, 0.0, 1.0), 0.82);

      float phaseA = 0.5 + 0.5 * sin(point.x * 4.2 - point.y * 3.1 + time * 1.7 + glow * 9.0);
      float phaseB = 0.5 + 0.5 * cos(point.x * 2.8 + point.y * 4.6 - time * 1.2);
      vec3 lightCobalt = vec3(0.08, 0.20, 0.62);
      vec3 lightPeacock = vec3(0.04, 0.46, 0.48);
      vec3 lightAmber = vec3(0.84, 0.52, 0.13);
      vec3 lightCopper = vec3(0.73, 0.25, 0.10);
      vec3 darkCobalt = vec3(0.20, 0.34, 1.00);
      vec3 darkPeacock = vec3(0.10, 0.82, 0.79);
      vec3 darkAmber = vec3(1.00, 0.72, 0.27);
      vec3 darkCopper = vec3(1.00, 0.38, 0.14);
      vec3 cool = mix(mix(lightCobalt, lightPeacock, phaseA), mix(darkCobalt, darkPeacock, phaseA), uTheme);
      vec3 warm = mix(mix(lightCopper, lightAmber, phaseB), mix(darkCopper, darkAmber, phaseB), uTheme);
      float warmShift = smoothstep(0.18, 0.82, 0.58 * phaseB + 0.42 * glow);
      vec3 color = mix(cool, warm, warmShift);
      vec3 pearl = mix(vec3(0.90, 0.72, 0.47), vec3(1.00, 0.94, 0.78), uTheme);
      color = mix(color, pearl, smoothstep(0.70, 1.0, glow));
      float alpha = glow * mix(0.58, 0.74, uTheme);
      return vec4(color * alpha, alpha);
    }

    vec4 renderContour(vec2 point) {
      float slowTime = uTime * 0.07;

      vec2 firstWarp = vec2(
        fbm(point * 1.65 + vec2(slowTime, -slowTime * 0.62)),
        fbm(point * 1.58 + vec2(-slowTime * 0.48, slowTime * 0.78) + 12.7)
      );
      vec2 secondWarp = vec2(
        fbm(point * 2.05 + firstWarp * 1.55 + 4.1),
        fbm(point * 1.96 - firstWarp * 1.36 + 19.3)
      );

      float field = fbm(point * 1.48 + secondWarp * 1.74 + slowTime * 0.25);
      float signedContour = sin((field + firstWarp.x * 0.34 - firstWarp.y * 0.18) * 8.6);
      float contour = abs(signedContour);
      float halo = 1.0 - smoothstep(0.09, 0.50, contour);
      float core = 1.0 - smoothstep(0.018, 0.14, contour);
      float echo = 1.0 - smoothstep(0.035, 0.20, abs(contour - 0.52));
      float zones = pow(previewZones(point, uTime + 8.0), 0.72);
      float ribbon = (halo * 0.62 + core * 0.30 + echo * 0.16) * zones;
      float side = smoothstep(-0.10, 0.10, signedContour);

      float colorDrift = 0.5 + 0.5 * sin(field * 6.5 + slowTime * 3.0 + point.x * 2.0);
      vec3 lightColor = mix(mix(vec3(0.10, 0.32, 0.30), vec3(0.64, 0.36, 0.20), colorDrift), vec3(0.30, 0.23, 0.36), side * 0.36);
      vec3 darkColor = mix(mix(vec3(0.43, 0.76, 0.68), vec3(0.93, 0.61, 0.35), colorDrift), vec3(0.76, 0.68, 0.92), side * 0.34);
      float alpha = ribbon * mix(0.32, 0.38, uTheme);
      vec3 color = mix(lightColor, darkColor, uTheme);
      return vec4(color * alpha, alpha);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 point = uv - 0.5;
      point.x *= uResolution.x / max(uResolution.y, 1.0);

      if (uVariant < 0.5) {
        gl_FragColor = vec4(0.0);
      } else if (uVariant < 1.5) {
        gl_FragColor = renderDither(point);
      } else if (uVariant < 2.5) {
        gl_FragColor = renderMolten(point);
      } else {
        gl_FragColor = renderContour(point);
      }
    }
  `

  const compileShader = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Background shader could not compile.', gl.getShaderInfoLog(shader))
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource)
  const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertexShader || !fragmentShader) {
    canvas.classList.add('ambient-flow--fallback')
    return
  }

  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Background program could not link.', gl.getProgramInfoLog(program))
    canvas.classList.add('ambient-flow--fallback')
    return
  }

  const positions = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positions)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  const position = gl.getAttribLocation(program, 'aPosition')
  const uniforms = {
    resolution: gl.getUniformLocation(program, 'uResolution'),
    time: gl.getUniformLocation(program, 'uTime'),
    seed: gl.getUniformLocation(program, 'uSeed'),
    theme: gl.getUniformLocation(program, 'uTheme'),
    variant: gl.getUniformLocation(program, 'uVariant'),
  }

  gl.useProgram(program)
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.disable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

  let width = 0
  let height = 0
  let frame = 0
  let lastFrame = 0
  let contextLost = false
  let theme = document.documentElement.dataset.theme === 'dark' ? 1 : 0
  const seed = 937
  const start = performance.now()

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    const dpr = Math.min(window.devicePixelRatio || 1, 1.15)
    const nextWidth = Math.max(1, Math.round(width * dpr))
    const nextHeight = Math.max(1, Math.round(height * dpr))

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth
      canvas.height = nextHeight
      if (!contextLost) gl.viewport(0, 0, nextWidth, nextHeight)
    }
  }

  const stopAnimation = () => {
    if (frame) window.cancelAnimationFrame(frame)
    frame = 0
  }

  const draw = (now = performance.now()) => {
    if (contextLost) return
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.time, reduceMotion.matches ? 0 : (now - start) / 1000)
    gl.uniform1f(uniforms.seed, seed)
    gl.uniform1f(uniforms.theme, theme)
    gl.uniform1f(uniforms.variant, variantIndex[variant])
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const animate = (now) => {
    if (document.hidden || contextLost) {
      frame = 0
      return
    }
    if (now - lastFrame >= 28) {
      lastFrame = now
      draw(now)
    }
    frame = window.requestAnimationFrame(animate)
  }

  const syncMotion = () => {
    stopAnimation()
    if (contextLost) return
    draw()
    if (!reduceMotion.matches && variant !== 'off') frame = window.requestAnimationFrame(animate)
  }

  // A lost WebGL context must not leave a hot animation loop throwing errors.
  // Recreating the full shader pipeline would be more work than the ambient
  // layer is worth, so keep the CSS fallback for the rest of this page view.
  canvas.addEventListener('webglcontextlost', () => {
    contextLost = true
    stopAnimation()
    canvas.classList.add('ambient-flow--fallback')
  })

  const updateCycleLabel = () => {
    if (!(cycleButton instanceof HTMLButtonElement)) return
    const currentIndex = variants.indexOf(variant)
    const nextVariant = variants[(currentIndex + 1) % variants.length]
    const locale = document.documentElement.dataset.locale === 'en' ? 'en' : 'zh'
    const suffix = locale === 'en' ? 'En' : 'Zh'
    const currentName = backgroundNames[variant]?.[locale] || variant
    const nextName = backgroundNames[nextVariant]?.[locale] || nextVariant
    const template = cycleButton.dataset[`backgroundCycle${suffix}`] || ''
    const label = template
      .replace('{current}', currentName)
      .replace('{next}', nextName)
    cycleButton.setAttribute('aria-label', label)
    cycleButton.title = label
  }

  const setVariant = (nextVariant) => {
    if (!variants.includes(nextVariant)) return
    variant = nextVariant
    canvas.dataset.background = variant
    updateCycleLabel()
    syncMotion()
  }

  let switchTimer = 0
  cycleButton?.addEventListener('click', () => {
    if (switchTimer) return
    const currentIndex = variants.indexOf(variant)
    const nextVariant = variants[(currentIndex + 1) % variants.length]

    if (reduceMotion.matches) {
      setVariant(nextVariant)
      return
    }

    canvas.classList.add('is-switching')
    cycleButton.classList.add('is-cycling')
    switchTimer = window.setTimeout(() => {
      setVariant(nextVariant)
      window.requestAnimationFrame(() => {
        canvas.classList.remove('is-switching')
        cycleButton.classList.remove('is-cycling')
        switchTimer = 0
      })
    }, 140)
  })

  window.addEventListener('resize', () => {
    resize()
    draw()
  }, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAnimation()
    else syncMotion()
  })

  window.addEventListener('formulasearch:theme', (event) => {
    theme = event.detail?.theme === 'dark' ? 1 : 0
    draw()
  })

  window.addEventListener('formulasearch:locale', updateCycleLabel)

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', syncMotion)
  }

  resize()
  setVariant(variant)
})()
