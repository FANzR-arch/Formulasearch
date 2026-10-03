(() => {
  const starCanvas = document.querySelector('#starfield')
  const holeCanvas = document.querySelector('#blackhole')
  if (!(starCanvas instanceof HTMLCanvasElement) || !(holeCanvas instanceof HTMLCanvasElement)) return
  const holeCtx = holeCanvas.getContext('2d')
  if (!holeCtx) return

  const root = document.documentElement
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const holdDelay = 240
  const moveTolerance = 10
  const growSeconds = 2.4
  const collapseSeconds = 0.9
  // After opening, the hole keeps swelling toward this share of the short screen side.
  const capShare = 0.2
  const swellSeconds = 25
  // The hole is seen a little above its equator: the sky's swirl turns in a plane foreshortened to half
  // its height and rolled slightly off the horizontal, so the vortex reads in perspective, not from above.
  const swirlTilt = 0.5
  const swirlRoll = -0.14
  const interactiveSelector = 'a, button, input, textarea, select, summary, dialog, label, [role="button"], [contenteditable], img, video'

  // Thin-lens approximation of a Schwarzschild black hole: every pixel samples the procedural sky at
  // beta = theta * (1 - E^2 / |theta|^2), which yields the Einstein ring, mirrored inner images and
  // stretched arcs with no hard boundary. A differential twist, steeply stronger toward the horizon,
  // stands in for frame dragging and keeps turning for as long as the press lasts.
  const vertexSource = `
    attribute vec2 aPosition;
    void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
  `

  const fragmentSource = `
    precision highp float;
    uniform vec2 uSize;
    uniform float uScale;
    uniform float uTime;
    uniform float uDark;
    uniform vec2 uHole;
    uniform float uShadow;
    uniform float uTwist;
    uniform float uStrength;
    uniform float uPresence;
    uniform float uSpinShadow;
    uniform vec2 uParallax;
    uniform vec2 uScroll;
    uniform vec3 uPaper;
    uniform vec3 uInk;
    uniform float uTilt;
    uniform float uRoll;


    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    vec2 starLayer(vec2 p, float cell, float density, float size, float seed) {
      vec2 g = floor(p / cell);
      vec2 f = p / cell - g;
      float h = hash(g + seed);
      if (h > density) return vec2(0.0);
      vec2 at = vec2(hash(g * 1.7 + seed + 3.1), hash(g * 2.3 + seed + 7.7)) * 0.6 + 0.2;
      float d = length(f - at) * cell;
      float rad = size * (0.7 + 0.9 * hash(g + seed + 11.0));
      float twinkle = 0.72 + 0.28 * sin(uTime * (0.5 + 1.8 * hash(g + seed + 5.0)) + h * 60.0);
      float spark = exp(-d * d / (rad * rad)) * twinkle;
      return vec2(spark * (0.45 + 0.55 * hash(g + seed + 9.0)), hash(g + seed + 13.0));
    }

    // Star field in screen pixels. Returns premultiplied rgb in xyz and coverage in w. 'focus' lets more
    // faint stars cross the visibility threshold, cell by cell, so they surface without a boundary.
    vec4 starField(vec2 pixel, float focus) {
      float stars = 0.0;
      float warm = 0.0;
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 p = pixel + uParallax * 6.0 * (0.4 + fi * 0.6);
        vec2 layer = starLayer(p, 34.0 + fi * 24.0, 0.5 - fi * 0.1 + focus * 0.4, 0.85 + fi * 0.3, 17.0 * fi + 3.0);
        stars += layer.x * (0.5 + 0.28 * fi);
        warm += layer.x * step(0.72, layer.y);
      }
      vec3 starColor = mix(vec3(0.16, 0.13, 0.1), vec3(0.93, 0.95, 1.0), uDark);
      vec3 warmColor = mix(vec3(0.42, 0.26, 0.1), vec3(1.0, 0.86, 0.66), uDark);
      float alpha = clamp(stars, 0.0, 1.0) * mix(0.62, 1.0, uDark);
      vec3 color = mix(starColor, warmColor, clamp(warm / max(stars, 0.001), 0.0, 1.0));
      return vec4(color * alpha, alpha);
    }

    void main() {
      vec2 pixel = vec2(gl_FragCoord.x, uSize.y * uScale - gl_FragCoord.y) / uScale;
      vec2 off = pixel - uHole;
      float r = length(off);

      // Keep the reading column calm until the lens pulls the field into focus.
      vec2 q = (pixel - vec2(uSize.x * 0.5, uSize.y * 0.46)) / vec2(380.0, 330.0);
      float quiet = 0.3 + 0.7 * smoothstep(0.5, 1.15, length(q));
      float near = uStrength * (1.0 - smoothstep(uShadow * 4.0, uShadow * 11.0, r));

      vec2 source = pixel;
      float absorbed = 0.0;

      if (uStrength > 0.001) {
        // Point-mass lens: the pixel at offset theta sees the sky at theta * (1 - E^2 / |theta|^2).
        // For a Schwarzschild hole seen from this distance the Einstein radius is about twice the shadow.
        float einstein = uShadow * 2.4;
        float r2 = max(dot(off, off), 1.0);
        vec2 lensed = off * (1.0 - einstein * einstein / r2);
        // Keplerian shear: angular speed falls off like r^-1.5. Near the horizon the sky turns about once
        // a second and winds into star trails; a few radii out it barely drifts.
        // The swirl lives in an inclined plane: measure and turn in that plane, so the sky moves
        // along foreshortened ellipses rather than in circles facing the screen.
        mat2 toDisk = mat2(cos(uRoll), -sin(uRoll), sin(uRoll), cos(uRoll));
        mat2 fromDisk = mat2(cos(uRoll), sin(uRoll), -sin(uRoll), cos(uRoll));
        vec2 inPlane = toDisk * off;
        float rPlane = length(vec2(inPlane.x, inPlane.y / uTilt));
        float falloff = pow(uSpinShadow / max(rPlane, uSpinShadow), 1.5) * (1.0 - smoothstep(uSpinShadow * 8.0, uSpinShadow * 14.0, rPlane));
        // On paper the grid would wind into a fingerprint, so it only takes a settled quarter turn of shear.
        float turn = mix(min(uTwist, 0.25), uTwist, uDark) * 6.2832 * falloff;
        vec2 turned = toDisk * lensed;
        turned.y /= uTilt;
        turned = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * turned;
        turned.y *= uTilt;
        lensed = fromDisk * turned;
        // While the hole evaporates the sky glides back to rest instead of unwinding backwards.
        source = mix(pixel, uHole + lensed, uPresence);
        absorbed = 1.0 - smoothstep(uShadow * 0.96, uShadow * 1.04, r);
      }

      // A star directly behind the hole would be smeared into a full, drawn-looking circle; leave that spot empty.
      vec4 starsOut = starField(source, near) * mix(1.0, smoothstep(uShadow * 0.5, uShadow * 1.4, length(source - uHole)), step(0.001, uStrength));
      starsOut *= mix(quiet, 1.0, near);
      if (uStrength > 0.001) {
        // Lens magnification of a point source, 1 / |1 - (E / r)^4|: stars crossing the Einstein ring flare up,
        // the mirrored images inside it stay faint.
        float ratio = (uShadow * 2.4) / max(r, 1.0);
        float magnification = 1.0 / max(abs(1.0 - ratio * ratio * ratio * ratio), 0.16);
        starsOut = min(starsOut * mix(1.0, magnification, uStrength), vec4(1.0));
      }
      starsOut *= (1.0 - absorbed);

      vec4 color = starsOut;
      if (uDark < 0.5) {
        // Light theme: no stars on paper. Near the hole the canvas paints the paper itself. The page's
        // 13px dot grid (same pitch and phase as the body background) thins out toward the hole while a
        // sparse 44px line grid surfaces and is bent by the lens, like a diagram of curved spacetime.
        // Away from the hole the canvas is transparent and the real dot grid shows.
        float sheet = uStrength * (1.0 - smoothstep(uShadow * 5.0, uShadow * 10.0, r));
        vec2 page = source + uScroll;
        vec2 dotCell = mod(page, 13.0) - 6.5;
        float dots = (1.0 - smoothstep(0.25, 1.0, length(dotCell))) * 0.08 * (1.0 - near);
        vec2 toLine = abs(fract(page / 44.0 - 0.5) - 0.5) * 44.0;
        #ifdef HAS_DERIVATIVES
        vec2 footprint = max(fwidth(page), vec2(0.0001));
        vec2 lineDistance = toLine / footprint;
        // Where the lens packs lines closer than a few pixels they would only read as grey moire; let them go.
        float crowding = 1.0 - smoothstep(2.0, 5.0, max(footprint.x, footprint.y));
        #else
        vec2 lineDistance = toLine;
        float crowding = 1.0;
        #endif
        float lines = (1.0 - smoothstep(0.3, 1.2, min(lineDistance.x, lineDistance.y))) * (0.03 + 0.15 * near) * crowding;
        float ink = clamp(max(dots, lines), 0.0, 0.5) * (1.0 - absorbed);
        vec3 paper = mix(uPaper, uInk, ink);
        color = vec4(paper * sheet, sheet);
      }
      gl_FragColor = vec4(color.rgb, clamp(color.a, 0.0, 1.0));
    }
  `

  let gl = null
  let program = null
  const uniforms = {}
  let contextLost = false
  const glAttributes = { alpha: true, antialias: false, depth: false, powerPreference: 'low-power', premultipliedAlpha: true }

  const compile = (type, source) => {
    const shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
    console.warn('Starfield shader could not compile.', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }

  const setupGl = () => {
    gl = starCanvas.getContext('webgl', glAttributes)
    if (!gl) return false
    const vertex = compile(gl.VERTEX_SHADER, vertexSource)
    const derivatives = gl.getExtension('OES_standard_derivatives')
    const fragment = compile(gl.FRAGMENT_SHADER, (derivatives ? '#extension GL_OES_standard_derivatives : enable\n#define HAS_DERIVATIVES\n' : '') + fragmentSource)
    if (!vertex || !fragment) return false
    program = gl.createProgram()
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('Starfield program could not link.', gl.getProgramInfoLog(program))
      return false
    }
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    for (const name of ['uSize', 'uScale', 'uTime', 'uDark', 'uHole', 'uShadow', 'uTwist', 'uStrength', 'uPresence', 'uSpinShadow', 'uParallax', 'uScroll', 'uPaper', 'uInk', 'uTilt', 'uRoll']) {
      uniforms[name] = gl.getUniformLocation(program, name)
    }
    return true
  }

  const hasGl = setupGl()
  const fallbackCtx = hasGl ? null : starCanvas.getContext('2d')
  if (!hasGl && !fallbackCtx) return

  let width = 0
  let height = 0
  let pixelScale = 1
  let dark = root.dataset.theme === 'dark'
  const palette = { paper: [0.97, 0.96, 0.94], ink: [0.12, 0.1, 0.08] }
  const swatch = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
  const resolveColour = (value, fallback) => {
    if (!swatch || !value) return fallback
    swatch.clearRect(0, 0, 1, 1)
    swatch.fillStyle = '#000'
    swatch.fillStyle = value
    swatch.fillRect(0, 0, 1, 1)
    const [r, g, b] = swatch.getImageData(0, 0, 1, 1).data
    return [r / 255, g / 255, b / 255]
  }
  const readPalette = () => {
    const style = getComputedStyle(root)
    palette.paper = resolveColour(style.getPropertyValue('--paper').trim(), palette.paper)
    palette.ink = resolveColour(style.getPropertyValue('--ink').trim(), palette.ink)
  }
  let running = false
  let lastFrame = 0
  let frameCount = 0
  let parallaxX = 0
  let parallaxY = 0
  let parallaxTargetX = 0
  let parallaxTargetY = 0
  let pending = null
  // A faint ring released when the hole finishes collapsing.
  let flash = null
  let fallbackStars = []

  const hole = {
    active: false,
    pointerId: -1,
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    held: 0,
    size: 0,
    maxSize: 80,
    spinRate: 0,
    spin: 0,
    twist: 0,
    collapse: 0,
    collapseFrom: 0,
    capSize: 200,
    releaseSpin: 0,
    spinShadow: 0,
  }

  const shadowRadius = () => hole.size
  // 1 while the hole is held; eases to 0 through the collapse.
  const presence = () => {
    if (hole.active) return 1
    if (hole.size <= 0.5 || hole.collapseFrom <= 0) return 0
    const t = hole.size / hole.collapseFrom
    return t * t * (3 - 2 * t)
  }

  // The molten canvas is drawn at scale(1.035) about its centre; convert screen points into its own box.
  const ambientScale = 1.035
  const toAmbient = (x, y) => ({
    x: width / 2 + (x - width / 2) / ambientScale,
    y: height / 2 + (y - height / 2) / ambientScale,
  })

  const publishLens = () => {
    // The molten background reads this to bend its own light around the same lens.
    const local = toAmbient(hole.x, hole.y)
    const grown = Math.min(1, hole.size / hole.maxSize)
    window.__formulasearchLens = hole.size > 0.5
      ? {
        x: (local.x / Math.max(width, 1) - 0.5) * (width / Math.max(height, 1)),
        y: 0.5 - local.y / Math.max(height, 1),
        einstein: (hole.size * 3.0) / ambientScale / Math.max(height, 1),
        twist: Math.min(9, 1.5 + 0.6 * hole.twist) * grown,
        // The home page dims the molten layer behind the copy; the hole lifts that veil around itself.
        veil: [local.x, local.y, hole.size * (dark ? 7 : 4) / ambientScale],
      }
      : null
  }

  const resize = () => {
    width = window.innerWidth
    height = window.innerHeight
    pixelScale = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(2000000 / Math.max(width * height, 1)))
    starCanvas.width = Math.max(1, Math.round(width * pixelScale))
    starCanvas.height = Math.max(1, Math.round(height * pixelScale))
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
    holeCanvas.width = Math.round(width * ratio)
    holeCanvas.height = Math.round(height * ratio)
    holeCtx.setTransform(ratio, 0, 0, ratio, 0, 0)
    hole.maxSize = Math.min(64, Math.max(36, Math.min(width, height) * 0.06))
    hole.capSize = Math.max(hole.maxSize * 1.6, Math.min(width, height) * capShare)
    if (gl && !contextLost) gl.viewport(0, 0, starCanvas.width, starCanvas.height)
  }

  const drawFallbackStars = () => {
    if (!fallbackCtx) return
    if (!fallbackStars.length) {
      fallbackStars = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.1, a: 0.3 + Math.random() * 0.6 }))
    }
    fallbackCtx.setTransform(1, 0, 0, 1, 0, 0)
    fallbackCtx.clearRect(0, 0, starCanvas.width, starCanvas.height)
    fallbackCtx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0)
    for (const star of fallbackStars) {
      fallbackCtx.fillStyle = dark ? `rgba(236, 240, 255, ${star.a})` : `rgba(48, 42, 36, ${star.a * 0.6})`
      fallbackCtx.beginPath()
      fallbackCtx.arc(star.x * width, star.y * height, star.r, 0, Math.PI * 2)
      fallbackCtx.fill()
    }
  }

  const drawStars = (time) => {
    if (!gl) return drawFallbackStars()
    if (contextLost) return
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform2f(uniforms.uSize, width, height)
    gl.uniform1f(uniforms.uScale, pixelScale)
    gl.uniform1f(uniforms.uTime, reduceMotion.matches ? 0 : time)
    gl.uniform1f(uniforms.uDark, dark ? 1 : 0)
    gl.uniform2f(uniforms.uHole, hole.x, hole.y)
    gl.uniform1f(uniforms.uShadow, Math.max(shadowRadius(), 0.001))
    gl.uniform1f(uniforms.uPresence, presence())
    gl.uniform1f(uniforms.uSpinShadow, Math.max(hole.active ? hole.size : hole.spinShadow, 0.001))
    gl.uniform1f(uniforms.uTwist, hole.twist)
    gl.uniform1f(uniforms.uStrength, hole.size > 0.5 ? Math.min(1, hole.size / hole.maxSize) : 0)
    gl.uniform2f(uniforms.uParallax, parallaxX, parallaxY)
    gl.uniform2f(uniforms.uScroll, window.scrollX, window.scrollY)
    gl.uniform3f(uniforms.uPaper, ...palette.paper)
    gl.uniform3f(uniforms.uInk, ...palette.ink)
    gl.uniform1f(uniforms.uTilt, swirlTilt)
    gl.uniform1f(uniforms.uRoll, swirlRoll)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const drawFlash = () => {
    if (!flash) return
    const progress = Math.min(1, flash.t / 0.75)
    const eased = 1 - (1 - progress) ** 3
    const fade = (1 - progress) ** 2
    // The last light the hole gives off: a brief point of light, then a ring running outward.
    const glow = holeCtx.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, 10 + flash.size * 1.4 * eased)
    glow.addColorStop(0, dark ? `rgba(255, 246, 232, ${0.55 * fade})` : `rgba(40, 32, 24, ${0.2 * fade})`)
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
    holeCtx.fillStyle = glow
    holeCtx.beginPath()
    holeCtx.arc(flash.x, flash.y, 10 + flash.size * 1.4 * eased, 0, Math.PI * 2)
    holeCtx.fill()
    holeCtx.strokeStyle = dark ? `rgba(255, 244, 228, ${0.42 * fade})` : `rgba(40, 32, 24, ${0.32 * fade})`
    holeCtx.lineWidth = 1.2
    holeCtx.beginPath()
    holeCtx.arc(flash.x, flash.y, 8 + flash.size * 4.5 * eased, 0, Math.PI * 2)
    holeCtx.stroke()
  }

  const drawHole = () => {
    holeCtx.clearRect(0, 0, width, height)
    drawFlash()
    if (hole.size <= 0.5) return
    // The shader renders the lensed sky; this layer lets the horizon cover the page copy, with a soft
    // falloff into the light it swallows instead of a hard cut-out edge.
    const radius = shadowRadius()
    if (!dark) {
      // Paper: the horizon is drawn like a diagram, an empty disc ruled with a fine ink line, and a
      // fainter dashed photon sphere at 1.5x that turns with the hole.
      const [pr, pg, pb] = palette.paper.map((value) => Math.round(value * 255))
      const [ir, ig, ib] = palette.ink.map((value) => Math.round(value * 255))
      const strength = Math.min(1, hole.size / hole.maxSize)
      holeCtx.fillStyle = `rgb(${pr}, ${pg}, ${pb})`
      holeCtx.beginPath()
      holeCtx.arc(hole.x, hole.y, radius, 0, Math.PI * 2)
      holeCtx.fill()
      holeCtx.strokeStyle = `rgba(${ir}, ${ig}, ${ib}, ${0.7 * strength})`
      holeCtx.lineWidth = 1.2
      holeCtx.beginPath()
      holeCtx.arc(hole.x, hole.y, radius, 0, Math.PI * 2)
      holeCtx.stroke()
      holeCtx.save()
      holeCtx.setLineDash([2, 6])
      holeCtx.lineDashOffset = -hole.twist * radius * 1.5 * Math.PI * 2 / 2.25
      holeCtx.strokeStyle = `rgba(${ir}, ${ig}, ${ib}, ${0.32 * strength})`
      holeCtx.lineWidth = 1
      holeCtx.beginPath()
      holeCtx.arc(hole.x, hole.y, radius * 1.5, 0, Math.PI * 2)
      holeCtx.stroke()
      holeCtx.restore()
      return
    }
    // Night: a deep halo that sinks into the sky.
    const shade = holeCtx.createRadialGradient(hole.x, hole.y, radius, hole.x, hole.y, radius * 2.1)
    shade.addColorStop(0, 'rgba(0, 0, 0, 1)')
    shade.addColorStop(0.08, 'rgba(0, 0, 0, 0.96)')
    shade.addColorStop(0.2, 'rgba(0, 0, 0, 0.42)')
    shade.addColorStop(0.55, 'rgba(0, 0, 0, 0.12)')
    shade.addColorStop(1, 'rgba(0, 0, 0, 0)')
    holeCtx.fillStyle = shade
    holeCtx.beginPath()
    holeCtx.arc(hole.x, hole.y, radius * 2.1, 0, Math.PI * 2)
    holeCtx.fill()
    holeCtx.fillStyle = '#000'
    holeCtx.beginPath()
    holeCtx.arc(hole.x, hole.y, radius * 1.01, 0, Math.PI * 2)
    holeCtx.fill()
  }

  // Text warp (desktop only). While the hole is open the page copy is painted on one canvas, so each
  // character can be moved on its own. Out to the tidal radius the space around the hole is bent: each
  // character stays rigid and follows the local bend of its line (a rotation plus a stretch along the
  // line, never a shear), and keyword pills are drawn as soft capsules threaded through their own
  // characters, so they bend with the text and tear apart when pulled too far. Past the capture radius
  // things spiral in, shrinking as they turn, and stay gone, even along the path the hole is dragged.
  // The portrait and icons are moved as whole bodies with the same field. After the collapse the
  // swallowed characters are typed back in reading order behind a caret (pills grow back with them),
  // then the original text takes over. The originals never change layout.
  const warpCapable = window.matchMedia('(hover: hover) and (pointer: fine)')
  const warpSource = document.querySelector('#main-content')
  const warpHost = document.querySelector('#site-page')
  const textWarp = { canvas: null, ctx: null, ratio: 1, glyphs: [], pills: [], bodies: [], icons: [], phase: 'idle', queue: [], printClock: 0, printInterval: 20, tail: 0, caret: null }

  const smooth = (edge0, edge1, value) => {
    const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  const rgbaString = (value) => {
    if (!swatch || !value) return 'rgba(0, 0, 0, 0)'
    swatch.clearRect(0, 0, 1, 1)
    swatch.fillStyle = 'rgba(0, 0, 0, 0)'
    swatch.fillStyle = value
    swatch.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = swatch.getImageData(0, 0, 1, 1).data
    return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`
  }

  // One movable thing: a character, an invisible capsule end, or a DOM body (portrait, icon).
  const makeItem = (props) => ({
    captured: false, consumed: false, px: 0, py: 0, rot: 0, sx: 1, sy: 1, alpha: 1,
    ...props,
  })

  const buildTextWarp = () => {
    if (textWarp.canvas || !warpCapable.matches || !(warpSource instanceof HTMLElement) || !(warpHost instanceof HTMLElement)) return
    const origin = warpHost.getBoundingClientRect()
    const styles = new Map()
    const clips = new Map()
    const pills = new Map()
    const glyphs = []
    const meter = document.createElement('canvas').getContext('2d')
    const range = document.createRange()
    const local = (x, y) => ({ x: x - origin.left, y: y - origin.top })
    const pillFor = (element) => {
      let pill = pills.get(element)
      if (pill) return pill
      const bounds = element.getBoundingClientRect()
      const computed = getComputedStyle(element)
      const h = bounds.height
      const mid = local(0, bounds.top + h / 2).y
      pill = {
        element,
        height: h,
        borderWidth: parseFloat(computed.borderTopWidth) || 0,
        background: rgbaString(computed.backgroundColor),
        border: rgbaString(computed.borderTopColor),
        start: makeItem({ proxy: true, x: local(bounds.left + h / 2, 0).x, y: mid }),
        end: makeItem({ proxy: true, x: local(bounds.right - h / 2, 0).x, y: mid }),
        members: [],
      }
      pills.set(element, pill)
      return pill
    }
    const walker = document.createTreeWalker(warpSource, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue
      const parent = node.parentElement
      if (!text || !text.trim() || !parent || parent.closest('svg, script, style, dialog')) continue
      let clip = clips.get(parent)
      if (clip === undefined) {
        // Text clipped away by an ancestor (such as a pill's hover clone) is not on screen; skip it.
        clip = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }
        for (let element = parent; element && element !== warpSource.parentElement; element = element.parentElement) {
          const overflow = getComputedStyle(element)
          if (overflow.overflowX === 'visible' && overflow.overflowY === 'visible') continue
          const bounds = element.getBoundingClientRect()
          clip = { left: Math.max(clip.left, bounds.left), top: Math.max(clip.top, bounds.top), right: Math.min(clip.right, bounds.right), bottom: Math.min(clip.bottom, bounds.bottom) }
        }
        clips.set(parent, clip)
      }
      let style = styles.get(parent)
      if (style === undefined) {
        const computed = getComputedStyle(parent)
        if (computed.visibility !== 'visible' || !meter) {
          style = null
        } else {
          const font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`
          meter.font = font
          const metrics = meter.measureText('国Hg')
          const ascent = metrics.fontBoundingBoxAscent || parseFloat(computed.fontSize) * 0.9
          const descent = metrics.fontBoundingBoxDescent || parseFloat(computed.fontSize) * 0.25
          style = { element: parent, font, color: rgbaString(computed.color), ascentShare: ascent / (ascent + descent) }
        }
        styles.set(parent, style)
      }
      if (!style) continue
      const pillElement = parent.closest('[data-highlight-label]')
      const pill = pillElement instanceof HTMLElement ? pillFor(pillElement) : null
      let offset = 0
      for (const char of text) {
        if (char.trim()) {
          range.setStart(node, offset)
          range.setEnd(node, offset + char.length)
          const rect = range.getClientRects()[0]
          const centreX = rect ? rect.left + rect.width / 2 : 0
          const centreY = rect ? rect.top + rect.height / 2 : 0
          const shown = rect && centreX > clip.left && centreX < clip.right && centreY > clip.top && centreY < clip.bottom
          if (shown && rect.width > 0 && rect.bottom > -40 && rect.top < height + 40) {
            const point = local(centreX, centreY)
            const glyph = makeItem({
              char, style, pill, x: point.x, y: point.y, width: rect.width, height: rect.height,
              // Baseline relative to the glyph centre, so it can be drawn about its middle.
              baseline: rect.height * style.ascentShare - rect.height / 2,
            })
            glyphs.push(glyph)
            pill?.members.push(glyph)
          }
        }
        offset += char.length
      }
    }
    if (!glyphs.length) return
    // The terminal pill's prompt icon is redrawn as a character so it travels with its capsule.
    for (const pill of pills.values()) {
      const prompt = pill.element.querySelector('.home-terminal__prompt svg')
      const first = pill.members[0]
      if (!prompt || !first) continue
      const bounds = prompt.getBoundingClientRect()
      const point = local(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      const glyph = makeItem({ char: '›', style: first.style, pill, x: point.x, y: point.y, width: bounds.width, height: first.height, baseline: first.baseline })
      glyphs.splice(glyphs.indexOf(first), 0, glyph)
      pill.members.unshift(glyph)
    }
    // The portrait and the icons are swallowed as whole bodies; icons drawn with currentColor keep the
    // colour pinned on their <svg>, because the hidden text would otherwise take their strokes with it.
    const icons = [...warpSource.querySelectorAll('svg')]
    for (const icon of icons) icon.style.setProperty('color', getComputedStyle(icon).color, 'important')
    const bodies = []
    for (const atom of warpSource.querySelectorAll('.home-avatar, svg, img')) {
      if (!atom.matches('.home-avatar') && atom.closest('.home-avatar, [data-highlight-label]')) continue
      const bounds = atom.getBoundingClientRect()
      if (!bounds.width) continue
      const point = local(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)
      atom.style.setProperty('will-change', 'transform, opacity')
      bodies.push(makeItem({ element: atom, x: point.x, y: point.y }))
    }
    const canvas = document.createElement('canvas')
    canvas.className = 'text-warp'
    canvas.setAttribute('aria-hidden', 'true')
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    warpHost.append(canvas)
    Object.assign(textWarp, { canvas, ctx, glyphs, pills: [...pills.values()], bodies, icons, phase: 'hold', queue: [], printClock: 0, tail: 0, caret: null })
    sizeWarpCanvas()
    rest(origin)
    drawGlyphs()
    // The canvas copy and the hidden originals swap within one frame, so nothing flickers.
    root.setAttribute('data-text-warp', '')
    window.dispatchEvent(new Event('formulasearch:text-warp'))
  }

  // A theme switch while the canvas copy is showing: read the new colours from the originals in the same
  // frame (briefly un-hiding them, with transitions held off), so the copy never keeps the old theme.
  const refreshWarpColours = () => {
    if (!textWarp.canvas) return
    root.setAttribute('data-text-warp-settling', '')
    root.removeAttribute('data-text-warp')
    for (const icon of textWarp.icons) icon.style.removeProperty('color')
    for (const style of new Set(textWarp.glyphs.map((glyph) => glyph.style))) style.color = rgbaString(getComputedStyle(style.element).color)
    for (const pill of textWarp.pills) {
      const computed = getComputedStyle(pill.element)
      pill.background = rgbaString(computed.backgroundColor)
      pill.border = rgbaString(computed.borderTopColor)
    }
    for (const icon of textWarp.icons) icon.style.setProperty('color', getComputedStyle(icon).color, 'important')
    root.setAttribute('data-text-warp', '')
    root.removeAttribute('data-text-warp-settling')
    drawGlyphs()
  }

  const pillItems = (pill) => [pill.start, ...pill.members, pill.end]
  const everyItem = () => [...textWarp.glyphs, ...textWarp.pills.flatMap((pill) => [pill.start, pill.end]), ...textWarp.bodies]

  // Put every item at rest on its home position.
  const rest = (origin) => {
    for (const item of everyItem()) {
      item.px = origin.left + item.x
      item.py = origin.top + item.y
      item.rot = 0
      item.sx = 1
      item.sy = 1
    }
  }

  const sizeWarpCanvas = () => {
    const { canvas } = textWarp
    if (!canvas) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.round(width * ratio)
    const h = Math.round(height * ratio)
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    textWarp.ratio = ratio
  }

  const clearTextWarp = () => {
    if (!textWarp.canvas) return
    const canvas = textWarp.canvas
    for (const body of textWarp.bodies) {
      for (const name of ['transform', 'opacity', 'will-change']) body.element.style.removeProperty(name)
    }
    for (const icon of textWarp.icons) icon.style.removeProperty('color')
    Object.assign(textWarp, { canvas: null, ctx: null, glyphs: [], pills: [], bodies: [], icons: [], phase: 'idle', queue: [], caret: null })
    // Restore the originals without their own colour transitions, then drop the canvas a frame later.
    root.setAttribute('data-text-warp-settling', '')
    root.removeAttribute('data-text-warp')
    requestAnimationFrame(() => {
      canvas.remove()
      requestAnimationFrame(() => root.removeAttribute('data-text-warp-settling'))
    })
  }

  // A pill is a capsule threaded through its own characters. Where neighbours are pulled far apart it
  // tears, and each surviving run is drawn as one stroke so translucent fills do not double up at joints.
  const drawPill = (ctx, pill, ratio) => {
    const items = pillItems(pill)
    const runs = []
    let run = []
    for (let index = 0; index < items.length; index++) {
      const item = items[index]
      const previous = items[index - 1]
      const gap = previous ? Math.hypot(item.x - previous.x, item.y - previous.y) : 0
      const joined = previous && run.length && Math.hypot(item.px - previous.px, item.py - previous.py) < gap * 2.2 + 6
      if (item.alpha <= 0.02 || (run.length && !joined)) {
        if (run.length > 1) runs.push(run)
        run = []
      }
      if (item.alpha > 0.02) run.push(item)
    }
    if (run.length > 1) runs.push(run)
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const segment of runs) {
      const alpha = Math.min(...segment.map((item) => item.alpha))
      const scale = segment.reduce((sum, item) => sum + item.sy, 0) / segment.length
      const trace = () => {
        ctx.beginPath()
        segment.forEach((item, index) => (index ? ctx.lineTo(item.px, item.py) : ctx.moveTo(item.px, item.py)))
      }
      ctx.globalAlpha = alpha
      if (pill.borderWidth > 0) {
        trace()
        ctx.strokeStyle = pill.border
        ctx.lineWidth = pill.height * scale
        ctx.stroke()
        // Clear the inside so the fill sits on paper, not on top of the border colour.
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = Math.max(0, (pill.height - pill.borderWidth * 2) * scale)
        ctx.strokeStyle = '#000'
        ctx.stroke()
        ctx.globalCompositeOperation = 'source-over'
      }
      trace()
      ctx.strokeStyle = pill.background
      ctx.lineWidth = Math.max(0, (pill.height - pill.borderWidth * 2) * scale)
      ctx.stroke()
    }
  }

  const drawGlyphs = () => {
    const { canvas, ctx, ratio } = textWarp
    if (!canvas || !ctx) return
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const pill of textWarp.pills) drawPill(ctx, pill, ratio)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    let font = ''
    let colour = ''
    for (const glyph of textWarp.glyphs) {
      if (glyph.alpha <= 0.003) continue
      const cos = Math.cos(glyph.rot)
      const sin = Math.sin(glyph.rot)
      ctx.setTransform(cos * glyph.sx * ratio, sin * glyph.sx * ratio, -sin * glyph.sy * ratio, cos * glyph.sy * ratio, glyph.px * ratio, glyph.py * ratio)
      if (font !== glyph.style.font) { font = glyph.style.font; ctx.font = font }
      if (colour !== glyph.style.color) { colour = glyph.style.color; ctx.fillStyle = colour }
      ctx.globalAlpha = glyph.alpha
      ctx.fillText(glyph.char, 0, glyph.baseline)
    }
    const caret = textWarp.caret
    if (caret && caret.alpha > 0) {
      const glyph = caret.glyph
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.globalAlpha = 0.85 * caret.alpha
      ctx.fillStyle = glyph.style.color
      ctx.fillRect(glyph.px + glyph.width / 2 + 1, glyph.py - glyph.height * 0.38, Math.max(2, glyph.height * 0.34), glyph.height * 0.76)
    }
    ctx.globalAlpha = 1
  }

  const startReprint = (origin) => {
    const swallowed = textWarp.glyphs.filter((glyph) => glyph.captured)
    for (const glyph of swallowed) glyph.consumed = true
    rest(origin)
    for (const glyph of textWarp.glyphs) glyph.alpha = glyph.consumed ? 0 : 1
    // Capsule ends return at rest; a capsule reappears segment by segment as its characters are typed.
    for (const pill of textWarp.pills) {
      for (const end of [pill.start, pill.end]) Object.assign(end, { captured: false, consumed: false, alpha: 1 })
    }
    textWarp.queue = swallowed
    textWarp.printInterval = Math.min(32, Math.max(12, 1100 / Math.max(swallowed.length, 1)))
    textWarp.printClock = 0
    textWarp.tail = 0
    textWarp.phase = 'reprint'
    // The portrait and icons come back first.
    for (const body of textWarp.bodies) {
      body.element.style.removeProperty('transform')
      if (body.captured || body.consumed) {
        Object.assign(body, { captured: false, consumed: false, restoring: true, alpha: 0 })
        body.element.style.opacity = '0'
      }
    }
  }

  // Tidal pull for something at distance r from the hole (0 far away, 1 at the capture radius).
  const tide = (r, capture, tidal, hold) => (r < tidal ? Math.min(1, (capture / r) ** 2) * (1 - smooth(tidal * 0.55, tidal, r)) * hold : 0)

  // Where the bent space carries a point: drawn in toward the hole and dragged a little round it.
  const bend = (x, y, field) => {
    const dx = x - hole.x
    const dy = y - hole.y
    const r = Math.max(Math.hypot(dx, dy), 0.001)
    const pull = tide(r, field.capture, field.tidal, field.hold)
    if (pull < 0.002) return [x, y]
    const radius = r * (1 - 0.28 * pull)
    const angle = Math.atan2(dy, dx) + 0.2 * pull
    return [hole.x + Math.cos(angle) * radius, hole.y + Math.sin(angle) * radius]
  }

  // Place an uncaptured item: map its centre, and read the local bend from two nearby points, so the
  // item turns and stretches with the space around it without being sheared.
  const placeInField = (item, homeX, homeY, field) => {
    const [x, y] = bend(homeX, homeY, field)
    const [xx, xy] = bend(homeX + 3, homeY, field)
    const [yx, yy] = bend(homeX, homeY + 3, field)
    const rot = Math.atan2(xy - y, xx - x)
    item.px = x
    item.py = y
    item.rot = rot
    item.sx = Math.hypot(xx - x, xy - y) / 3
    item.sy = Math.max(0.2, ((yx - x) * -Math.sin(rot) + (yy - y) * Math.cos(rot)) / 3)
  }

  // Advance a captured item one step along its infall; returns false once it has crossed the horizon.
  const fall = (item, size, capture, dt, hold) => {
    const depth = size / Math.max(item.radius, size * 0.5)
    item.radius -= size * (0.45 + 1.6 * depth ** 2) * dt
    item.angle += (0.3 + Math.PI * 2 * depth ** 1.5) * dt
    if (item.radius <= size * 0.92) return false
    const inward = 1 - smooth(size, capture * 0.72, item.radius)
    const shrink = 1 - 0.7 * inward
    item.px = hole.x + Math.cos(item.angle) * item.radius
    item.py = hole.y + Math.sin(item.angle) * item.radius
    // It keeps the bend it had when captured, then turns with its orbit and shrinks evenly as it falls.
    item.rot = item.capturedRot + (item.angle - item.startAngle)
    item.sx = (item.capturedSx * (1 - inward) + inward) * shrink
    item.sy = (item.capturedSy * (1 - inward) + inward) * shrink
    item.alpha = smooth(size * 0.95, size * 1.9, item.radius) * hold
    return true
  }

  const step = (item, origin, field, dt) => {
    if (item.consumed) return
    const homeX = origin.left + item.x
    const homeY = origin.top + item.y
    if (!item.captured) {
      const r = Math.hypot(homeX - hole.x, homeY - hole.y)
      if (hole.active && r < field.capture) {
        // Start the fall exactly where the bent space had already carried it.
        placeInField(item, homeX, homeY, field)
        item.captured = true
        item.radius = Math.hypot(item.px - hole.x, item.py - hole.y)
        item.angle = Math.atan2(item.py - hole.y, item.px - hole.x)
        item.startAngle = item.angle
        item.capturedRot = item.rot
        item.capturedSx = item.sx
        item.capturedSy = item.sy
      } else {
        placeInField(item, homeX, homeY, field)
        return
      }
    }
    if (!fall(item, field.size, field.capture, dt, field.hold)) {
      item.consumed = true
      item.alpha = 0
    }
  }

  const updateTextWarp = (dt) => {
    if (!textWarp.canvas) return
    sizeWarpCanvas()
    const origin = warpHost.getBoundingClientRect()
    if (textWarp.phase === 'reprint') {
      textWarp.printClock += dt * 1000
      while (textWarp.queue.length && textWarp.printClock >= textWarp.printInterval) {
        textWarp.printClock -= textWarp.printInterval
        const glyph = textWarp.queue.shift()
        glyph.alpha = 1
        textWarp.caret = { glyph, alpha: 1 }
      }
      for (const body of textWarp.bodies) {
        if (!body.restoring) continue
        body.alpha = Math.min(1, body.alpha + dt * 5)
        body.element.style.opacity = body.alpha.toFixed(3)
        if (body.alpha >= 1) { body.restoring = false; body.element.style.removeProperty('opacity') }
      }
      if (!textWarp.queue.length) {
        // Let the caret rest for a beat at the end of the line, then hand back to the real text.
        textWarp.tail += dt
        if (textWarp.caret) textWarp.caret.alpha = textWarp.tail % 0.5 < 0.25 ? 1 : 0
        if (textWarp.tail > 0.45) return clearTextWarp()
      }
      drawGlyphs()
      return
    }
    if (!hole.active && hole.size <= 0.5) {
      startReprint(origin)
      drawGlyphs()
      return
    }

    const size = Math.max(hole.size, 0.001)
    const field = { size, capture: size * 3, tidal: size * 8, hold: presence() }
    for (const glyph of textWarp.glyphs) step(glyph, origin, field, dt)
    for (const pill of textWarp.pills) {
      step(pill.start, origin, field, dt)
      step(pill.end, origin, field, dt)
    }
    for (const body of textWarp.bodies) {
      step(body, origin, field, dt)
      const style = body.element.style
      if (body.consumed) { style.opacity = '0'; continue }
      const moved = body.captured || Math.abs(body.px - origin.left - body.x) > 0.05 || Math.abs(body.py - origin.top - body.y) > 0.05 || Math.abs(body.rot) > 0.0005
      if (!moved) {
        style.removeProperty('transform')
        continue
      }
      style.transform = `translate(${(body.px - origin.left - body.x).toFixed(2)}px, ${(body.py - origin.top - body.y).toFixed(2)}px) rotate(${body.rot.toFixed(4)}rad) scale(${body.sx.toFixed(3)}, ${body.sy.toFixed(3)})`
      if (body.captured) style.opacity = body.alpha.toFixed(3)
    }
    drawGlyphs()
  }

  const aiOverlayActive = () => {
    const state = root.dataset.aiState
    return !!state && state !== 'intro' && state !== 'exiting'
  }

  const frame = (now) => {
    if (!running) return
    const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000 || 0.016))
    lastFrame = now
    frameCount++
    const lensing = hole.active || hole.size > 0.5 || !!flash || textWarp.phase === 'reprint'
    // The idle twinkle is gentle, so it renders at half rate; the lens runs at full rate.
    if (!lensing && frameCount % 2) { requestAnimationFrame(frame); return }

    parallaxX += (parallaxTargetX - parallaxX) * Math.min(1, dt * 3)
    parallaxY += (parallaxTargetY - parallaxY) * Math.min(1, dt * 3)

    if (hole.active) {
      hole.held += dt
      // Opens promptly (ease-out cubic), then keeps swelling slowly toward its cap for as long as it is held.
      const growth = Math.min(1, hole.held / growSeconds)
      const swell = Math.max(0, hole.held - growSeconds * 0.6)
      hole.size = hole.maxSize * (1 - (1 - growth) ** 3) + (hole.capSize - hole.maxSize) * (1 - Math.exp(-swell / swellSeconds))
      // Turns per second at the horizon; the shader shears it outward as r^-1.5.
      hole.spinRate = 1.0 * (Math.min(1, hole.size / hole.maxSize))
      hole.x += (hole.targetX - hole.x) * Math.min(1, dt * 9)
      hole.y += (hole.targetY - hole.y) * Math.min(1, dt * 9)
    } else if (hole.size > 0) {
      // Evaporation: slow at first, then running away at the end, like Hawking radiation. Angular
      // momentum is kept, so it spins faster as it shrinks, and it vanishes in a brief flash.
      hole.collapse += dt
      const t = Math.min(1, hole.collapse / collapseSeconds)
      hole.size = hole.collapseFrom * (1 - t ** 2.2)
      hole.spinRate = hole.releaseSpin * Math.min(3, Math.sqrt(hole.collapseFrom / Math.max(hole.size, hole.collapseFrom * 0.1)))
      if (t >= 1) { hole.size = 0; hole.spinRate = 0; flash = { t: 0, x: hole.x, y: hole.y, size: hole.collapseFrom } }
    }
    // Spin is in turns per second; the shader wraps it, so it keeps turning for as long as the press lasts.
    hole.twist += hole.spinRate * dt
    if (flash) { flash.t += dt; if (flash.t > 0.75) flash = null }

    if (!aiOverlayActive()) {
      drawStars(now / 1000)
      drawHole()
      publishLens()
      updateTextWarp(dt)
    }
    requestAnimationFrame(frame)
  }

  const start = () => {
    if (running || document.hidden) return
    running = true
    lastFrame = performance.now()
    requestAnimationFrame(frame)
  }

  const stop = () => { running = false }

  const clearSelection = () => window.getSelection?.()?.removeAllRanges()

  const clearPending = () => {
    if (pending) window.clearTimeout(pending.timer)
    pending = null
  }

  const release = () => {
    clearPending()
    if (!hole.active) return
    hole.active = false
    hole.pointerId = -1
    hole.collapse = 0
    hole.collapseFrom = hole.size
    hole.releaseSpin = hole.spinRate
    hole.spinShadow = hole.size
    root.removeAttribute('data-blackhole')
  }

  const activate = () => {
    if (!pending) return
    const { pointerId, x, y } = pending
    pending = null
    hole.active = true
    hole.pointerId = pointerId
    // A press during a collapse picks the hole up at its current size instead of restarting from nothing.
    const resumed = hole.size > 0.5 ? Math.min(1, hole.size / hole.maxSize) : 0
    hole.held = resumed ? (1 - Math.cbrt(1 - Math.min(resumed, 0.999))) * growSeconds : 0
    if (hole.size > hole.maxSize) {
      const swollen = Math.min(0.99, (hole.size - hole.maxSize) / (hole.capSize - hole.maxSize))
      hole.held = growSeconds * 0.6 - swellSeconds * Math.log(1 - swollen)
    }
    if (!resumed) {
      hole.x = x
      hole.y = y
      hole.twist = 0
    }
    hole.targetX = x
    hole.targetY = y
    root.setAttribute('data-blackhole', 'active')
    if (textWarp.phase === 'reprint') clearTextWarp()
    buildTextWarp()
    clearSelection()
  }

  const onPointerDown = (event) => {
    if (reduceMotion.matches || aiOverlayActive()) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (!event.isPrimary || hole.active) return
    if (event.target instanceof Element && event.target.closest(interactiveSelector)) return
    clearPending()
    pending = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(activate, holdDelay),
    }
  }

  const onPointerMove = (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      parallaxTargetX = (event.clientX / Math.max(width, 1) - 0.5) * 2
      parallaxTargetY = (event.clientY / Math.max(height, 1) - 0.5) * 2
    }
    if (hole.active && event.pointerId === hole.pointerId) {
      hole.targetX = event.clientX
      hole.targetY = event.clientY
      clearSelection()
      return
    }
    if (pending && event.pointerId === pending.pointerId) {
      if (Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > moveTolerance) clearPending()
    }
  }

  const onPointerEnd = (event) => {
    if (pending && event.pointerId === pending.pointerId) clearPending()
    if (hole.active && event.pointerId === hole.pointerId) release()
  }

  const onContextMenu = (event) => {
    // A held touch would otherwise open the browser callout instead of the singularity.
    if (hole.active || pending) event.preventDefault()
  }

  const onThemeChange = () => {
    dark = root.dataset.theme === 'dark'
    readPalette()
    refreshWarpColours()
    if (!running) drawStars(0)
  }

  const applyMotionPreference = () => {
    if (reduceMotion.matches) {
      stop()
      release()
      hole.size = 0
      window.__formulasearchLens = null
      clearTextWarp()
      drawStars(0)
      holeCtx.clearRect(0, 0, width, height)
    } else {
      start()
    }
  }

  resize()
  readPalette()
  starCanvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    contextLost = true
    window.__formulasearchLens = null
  })
  window.addEventListener('resize', () => { resize(); if (!running) drawStars(0) }, { passive: true })
  window.addEventListener('formulasearch:theme', onThemeChange)
  new MutationObserver(onThemeChange).observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  reduceMotion.addEventListener?.('change', applyMotionPreference)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { stop(); release() } else if (!reduceMotion.matches) start()
  })
  window.addEventListener('pointerdown', onPointerDown, { passive: true })
  window.addEventListener('pointermove', onPointerMove, { passive: true })
  window.addEventListener('pointerup', onPointerEnd, { passive: true })
  window.addEventListener('pointercancel', onPointerEnd, { passive: true })
  window.addEventListener('blur', release)
  window.addEventListener('contextmenu', onContextMenu)
  window.addEventListener('pageshow', (event) => { if (event.persisted) applyMotionPreference() })
  applyMotionPreference()
})()
