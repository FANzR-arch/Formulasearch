(() => {
  const canvas = document.querySelector('#ambient-flow')
  if (!(canvas instanceof HTMLCanvasElement)) return

  const interactionScale = 0.5
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  canvas.dataset.background = 'molten'
  // Palette transitions share one continuous flow; only the initial phase resets.
  const seed = Math.random() * Math.PI * 2
  let paletteFrom = Math.floor(Math.random() * 3)
  let paletteTo = (paletteFrom + 1 + Math.floor(Math.random() * 2)) % 3
  let paletteStartedAt = 0
  let paletteDuration = 18 + Math.random() * 10

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
    uniform float uTheme;
    uniform float uPaletteFrom;
    uniform float uPaletteTo;
    uniform float uPaletteMix;
    uniform float uSeed;
    uniform vec2 uImpulse;
    uniform float uImpulseAge;
    uniform vec2 uFlowMemory;
    uniform float uFlowPhase;
    uniform float uInteractionStrength;

    vec2 applyRipple(vec2 point) {
      if (uImpulseAge < 0.0 || uImpulseAge >= 1.1) return point;

      vec2 impulseDelta = point - uImpulse;
      float impulseDistance = length(impulseDelta);
      vec2 impulseDirection = impulseDelta / max(impulseDistance, 0.0001);
      float progress = clamp(uImpulseAge / 0.92, 0.0, 1.0);
      float easedProgress = 1.0 - pow(1.0 - progress, 1.65);
      float waveRadius = mix(0.014, 0.25, easedProgress);
      float waveEnvelope = exp(-pow((impulseDistance - waveRadius) * 16.0, 2.0));
      float rippleBirth = smoothstep(0.02, 0.14, uImpulseAge);
      float rippleFade = rippleBirth
        * (1.0 - smoothstep(0.66, 1.1, uImpulseAge))
        * uInteractionStrength
        * 0.5;
      float ripple = waveEnvelope * rippleFade;

      point += impulseDirection * ripple * 0.055;
      return point;
    }

    vec3 paletteColor(float palette, float colorPhase, float glow) {
      vec3 first = mix(vec3(0.12, 0.30, 0.62), vec3(0.32, 0.58, 0.92), uTheme);
      vec3 second = mix(vec3(0.37, 0.60, 0.68), vec3(0.64, 0.82, 0.88), uTheme);
      vec3 pearl = mix(vec3(0.74, 0.79, 0.83), vec3(0.88, 0.94, 1.0), uTheme);
      if (palette > 0.5 && palette < 1.5) {
        first = mix(vec3(0.05, 0.39, 0.35), vec3(0.18, 0.69, 0.56), uTheme);
        second = mix(vec3(0.67, 0.49, 0.23), vec3(0.86, 0.68, 0.38), uTheme);
        pearl = mix(vec3(0.84, 0.75, 0.55), vec3(0.96, 0.89, 0.72), uTheme);
      } else if (palette > 1.5) {
        first = mix(vec3(0.36, 0.28, 0.49), vec3(0.59, 0.48, 0.77), uTheme);
        second = mix(vec3(0.67, 0.36, 0.31), vec3(0.88, 0.57, 0.46), uTheme);
        pearl = mix(vec3(0.84, 0.68, 0.62), vec3(0.98, 0.84, 0.77), uTheme);
      }
      vec3 color = mix(first, second, smoothstep(0.15, 0.85, colorPhase));
      return mix(color, pearl, smoothstep(0.78, 1.0, glow) * 0.72);
    }

    vec4 renderMolten(vec2 point) {
      float time = uTime * 0.14 + uFlowPhase * 0.035 + uSeed;
      float slowTime = uTime * 0.035 + uSeed;
      vec2 drift = vec2(sin(slowTime), cos(slowTime * 0.73)) * 0.10;
      float scale = 3.15 + 0.25 * sin(slowTime * 0.6);
      vec2 p = scale * (point + drift) - 0.5 + uFlowMemory * 0.24;
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
        float layerSpeed = mix(0.48, 1.0, step(0.5, layerNumber));
        float t = r - time * layerSpeed / (layerNumber + 3.0);
        i -= p + vec2(
          cos(t - i.x - r) + sin(t + i.y),
          sin(t - i.y) + cos(t + i.x) + r
        );
        c += 0.14 / max(length(vec2(sin(i.x + t), cos(i.y + t))), 0.001);
      }

      c /= 5.7;
      float intensity = max(c - 0.022, 0.0) * 2.05;
      float perimeter = smoothstep(0.18, 0.60, length(point * vec2(0.78, 1.0)));
      intensity *= mix(0.22, 1.0, perimeter);
      float glow = pow(clamp(intensity, 0.0, 1.0), 0.72);

      float colorPhase = 0.5 + 0.5 * sin(point.x * 2.8 - point.y * 2.0 + uTime * 0.055 + uSeed);
      vec3 color = mix(
        paletteColor(uPaletteFrom, colorPhase, glow),
        paletteColor(uPaletteTo, colorPhase, glow),
        uPaletteMix
      );
      float breath = 0.96 + 0.04 * sin(uTime * 0.18 + uSeed);
      float alpha = glow * mix(0.74, 0.72, uTheme) * breath;
      return vec4(color * alpha, alpha);
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / uResolution.xy;
      vec2 point = uv - 0.5;
      point.x *= uResolution.x / max(uResolution.y, 1.0);
      point = applyRipple(point);

      gl_FragColor = renderMolten(point);
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
    theme: gl.getUniformLocation(program, 'uTheme'),
    paletteFrom: gl.getUniformLocation(program, 'uPaletteFrom'),
    paletteTo: gl.getUniformLocation(program, 'uPaletteTo'),
    paletteMix: gl.getUniformLocation(program, 'uPaletteMix'),
    seed: gl.getUniformLocation(program, 'uSeed'),
    impulse: gl.getUniformLocation(program, 'uImpulse'),
    impulseAge: gl.getUniformLocation(program, 'uImpulseAge'),
    flowMemory: gl.getUniformLocation(program, 'uFlowMemory'),
    flowPhase: gl.getUniformLocation(program, 'uFlowPhase'),
    interactionStrength: gl.getUniformLocation(program, 'uInteractionStrength'),
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
  const maxRenderPixels = 1600000
  const frameInterval = 1000 / 40
  let contextLost = false
  let theme = document.documentElement.dataset.theme === 'dark' ? 1 : 0
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')
  let pointerPrevious = { x: 99, y: 99 }
  let hasPointerPosition = false
  let impulse = { x: 99, y: 99 }
  let impulseStartedAt = -Infinity
  let flowMemoryTarget = { x: 0, y: 0 }
  let flowMemory = { x: 0, y: 0 }
  let flowPhaseTarget = 0
  let flowPhase = 0
  const start = performance.now()

  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum)
  const interactionEnabled = () => finePointer.matches && !reduceMotion.matches

  const resetRipple = () => {
    pointerPrevious = { x: 99, y: 99 }
    hasPointerPosition = false
    impulse = { x: 99, y: 99 }
    impulseStartedAt = -Infinity
  }

  const resetInteraction = () => {
    resetRipple()
    flowMemoryTarget = { x: 0, y: 0 }
    flowMemory = { x: 0, y: 0 }
    flowPhaseTarget = 0
    flowPhase = 0
  }

  const pointerToPoint = (clientX, clientY) => {
    const safeWidth = Math.max(width, 1)
    const safeHeight = Math.max(height, 1)
    return {
      x: (clientX / safeWidth - 0.5) * (safeWidth / safeHeight),
      y: 0.5 - clientY / safeHeight,
    }
  }

  const updatePointerTarget = (event) => {
    if (!interactionEnabled() || (event.pointerType && event.pointerType !== 'mouse')) return
    const point = pointerToPoint(event.clientX, event.clientY)
    if (!hasPointerPosition) {
      pointerPrevious = point
      hasPointerPosition = true
      return
    }

    const delta = {
      x: point.x - pointerPrevious.x,
      y: point.y - pointerPrevious.y,
    }
    const distance = Math.hypot(delta.x, delta.y)
    flowMemoryTarget = {
      x: clamp(flowMemoryTarget.x + delta.x * 0.16 * interactionScale, -0.12, 0.12),
      y: clamp(flowMemoryTarget.y + delta.y * 0.16 * interactionScale, -0.12, 0.12),
    }
    flowPhaseTarget += distance * 3.0 * interactionScale
    pointerPrevious = point
  }

  const triggerImpulse = (event) => {
    if (!interactionEnabled() || event.button !== 0 || (event.pointerType && event.pointerType !== 'mouse')) return
    const point = pointerToPoint(event.clientX, event.clientY)
    if (!hasPointerPosition) {
      pointerPrevious = point
      hasPointerPosition = true
    }
    impulse = point
    impulseStartedAt = performance.now()
  }

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    const preferredScale = Math.min(window.devicePixelRatio || 1, 1.15)
    const pixelScale = Math.min(preferredScale, Math.sqrt(maxRenderPixels / Math.max(width * height, 1)))
    const nextWidth = Math.max(1, Math.floor(width * pixelScale))
    const nextHeight = Math.max(1, Math.floor(height * pixelScale))

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

  const updateInteraction = () => {
    if (!interactionEnabled()) {
      resetInteraction()
      return
    }

    flowMemory.x += (flowMemoryTarget.x - flowMemory.x) * 0.08
    flowMemory.y += (flowMemoryTarget.y - flowMemory.y) * 0.08
    flowPhase += (flowPhaseTarget - flowPhase) * 0.18
  }

  const draw = (now = performance.now()) => {
    if (contextLost) return
    updateInteraction()
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniforms.time, reduceMotion.matches ? 0 : (now - start) / 1000)
    gl.uniform1f(uniforms.theme, theme)
    const paletteTime = reduceMotion.matches ? 0 : (now - start) / 1000
    while (paletteTime - paletteStartedAt >= paletteDuration) {
      paletteStartedAt += paletteDuration
      paletteFrom = paletteTo
      paletteTo = (paletteFrom + 1 + Math.floor(Math.random() * 2)) % 3
      paletteDuration = 18 + Math.random() * 10
    }
    const paletteProgress = clamp((paletteTime - paletteStartedAt) / paletteDuration, 0, 1)
    gl.uniform1f(uniforms.paletteFrom, paletteFrom)
    gl.uniform1f(uniforms.paletteTo, paletteTo)
    gl.uniform1f(uniforms.paletteMix, paletteProgress * paletteProgress * (3 - 2 * paletteProgress))
    gl.uniform1f(uniforms.seed, seed)
    gl.uniform2f(uniforms.impulse, impulse.x, impulse.y)
    const impulseAge = interactionEnabled() && impulseStartedAt > 0 ? Math.max(0, (now - impulseStartedAt) / 1000) : -1
    gl.uniform1f(uniforms.impulseAge, impulseAge)
    gl.uniform2f(uniforms.flowMemory, flowMemory.x, flowMemory.y)
    gl.uniform1f(uniforms.flowPhase, flowPhase)
    gl.uniform1f(uniforms.interactionStrength, interactionEnabled() ? 1 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const animate = (now) => {
    if (document.hidden || contextLost) {
      frame = 0
      return
    }
    if (now - lastFrame >= frameInterval) {
      lastFrame = now
      draw(now)
    }
    frame = window.requestAnimationFrame(animate)
  }

  const syncMotion = () => {
    stopAnimation()
    if (contextLost) return
    draw()
    if (!reduceMotion.matches) frame = window.requestAnimationFrame(animate)
  }

  // A lost WebGL context must not leave a hot animation loop throwing errors.
  // Recreating the full shader pipeline would be more work than the ambient
  // layer is worth, so keep the CSS fallback for the rest of this page view.
  canvas.addEventListener('webglcontextlost', () => {
    contextLost = true
    resetInteraction()
    stopAnimation()
    canvas.classList.add('ambient-flow--fallback')
  })

  window.addEventListener('pointermove', updatePointerTarget, { passive: true })
  window.addEventListener('pointerdown', triggerImpulse, { capture: true, passive: true })

  window.addEventListener('resize', () => {
    resize()
    draw()
  }, { passive: true })

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      resetRipple()
      stopAnimation()
    }
    else syncMotion()
  })

  window.addEventListener('formulasearch:theme', (event) => {
    theme = event.detail?.theme === 'dark' ? 1 : 0
    draw()
  })

  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', () => {
      resetInteraction()
      syncMotion()
    })
  }

  if (typeof finePointer.addEventListener === 'function') {
    finePointer.addEventListener('change', () => {
      resetInteraction()
      draw()
    })
  }

  resize()
  syncMotion()
})()
