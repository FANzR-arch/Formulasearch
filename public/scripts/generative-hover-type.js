// Position-specific hover typography, adapted from the standalone export.
// Assets and visible bounds are prepared at build time; no editor or image generation runs here.
(() => {
  function initialize() {
    document.querySelectorAll('[data-hover-type]').forEach((host) => {
      if (host.dataset.bound) return;
      host.dataset.bound = 'true';
      const manifest = JSON.parse(host.dataset.manifest);
      const active = manifest.settings, activeAssets = manifest.characters;
      const titleElement = host.querySelector('[data-type-title]');
      const avoidInput = {value:18}, queues = new Map();
      const metrics = new Map(Object.values(activeAssets).flat().map(v => [v.src, v.metrics]));
      const segmenter = new Intl.Segmenter(undefined, {granularity:'grapheme'});
  function graphemes(text) {
    return segmenter ? [...segmenter.segment(text)].map((item) => item.segment) : Array.from(text);
  }

  function chosenGlyphs() {
    return new Set(active.targets.map((target) => target.id));
  }

  function positions(text) {
    let ordinal = 0;
    return graphemes(text).map((character, index) => ({ character, index, id: /\s/u.test(character) ? null : `g${ordinal++}` }));
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function nextVariant(character) {
    const available = activeAssets[character] || [];
    const count = Math.min(active.count, available.length);
    const pool = available.slice(0, count);
    let queue = queues.get(character) || [];
    if (!queue.length || queue.some((item) => !pool.includes(item))) queue = shuffle(pool);
    const next = queue.shift();
    queues.set(character, queue);
    return next;
  }

  async function alphaMetrics(src) {
    const image = new Image(); image.src = src; await image.decode();
    return metrics.get(src);
  }

  function resetShifts() {
    titleElement.querySelectorAll(".glyph").forEach((glyph) => {
      glyph.style.setProperty("--shift-x", "0px");
      glyph.style.setProperty("--shift-y", "0px");
    });
  }

  function tiltFor(id) {
    const total = [...id].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return `${(total % 7) - 3}deg`;
  }

  async function activate(glyph) {
    clearTimeout(glyph.leaveTimer);
    glyph.leaveTimer = null;
    titleElement.querySelectorAll(".glyph--interactive").forEach((other) => {
      if (other !== glyph && (other.activationRequest || other.leaveTimer || other.classList.contains("glyph--active"))) deactivate(other);
    });
    if (glyph.classList.contains("glyph--active")) return;
    const request = Symbol();
    glyph.activationRequest = request;
    const variant = nextVariant(glyph.dataset.targetId);
    if (!variant) return;
    resetShifts();
    const image = glyph.querySelector(".glyph__image");
    image.src = variant.src;
    image.alt = "";
    let alpha;
    try { alpha = await alphaMetrics(variant.src); } catch { return; }
    if (!glyph.isConnected || glyph.activationRequest !== request || image.src !== new URL(variant.src, document.baseURI).href) return;

    const fontSize = parseFloat(getComputedStyle(glyph).fontSize);
    const glyphWidth = glyph.getBoundingClientRect().width;
    const targetAlphaHeight = fontSize * 1.16;
    const imageHeight = Math.min(fontSize * 1.72, targetAlphaHeight / Math.max(alpha.heightRatio, .25));
    const visibleWidth = imageHeight * alpha.widthRatio;
    const overflow = Math.max(0, visibleWidth - glyphWidth) / 2 + Number(avoidInput.value);
    const centerCorrection = (.5 - alpha.centerX) * imageHeight;

    image.style.height = `${imageHeight}px`;
    glyph.style.setProperty("--asset-offset-x", `${centerCorrection}px`);
    image.style.setProperty("--asset-tilt", tiltFor(variant.id));
    glyph.classList.add("glyph--active");
    glyph.dataset.variant = variant.id;

    const activeTop = glyph.getBoundingClientRect().top;
    const siblings = [...titleElement.querySelectorAll(".glyph")].filter((item) =>
      Math.abs(item.getBoundingClientRect().top - activeTop) < fontSize * .5
    );
    const index = siblings.indexOf(glyph);
    const shift = Math.min(overflow * .42, fontSize * .14);
    siblings.forEach((sibling, siblingIndex) => {
      if (siblingIndex < index) sibling.style.setProperty("--shift-x", `${-shift}px`);
      if (siblingIndex > index) sibling.style.setProperty("--shift-x", `${shift}px`);
    });
    siblings[index - 1]?.style.setProperty("--shift-y", `${Math.min(3, fontSize * .025)}px`);
    siblings[index + 1]?.style.setProperty("--shift-y", `${-Math.min(3, fontSize * .025)}px`);
  }

  function deactivate(glyph) {
    clearTimeout(glyph.leaveTimer);
    glyph.leaveTimer = null;
    glyph.activationRequest = null;
    glyph.classList.remove("glyph--active");
    const image = glyph.querySelector(".glyph__image");
    image?.style.setProperty("--pointer-x", "0px");
    image?.style.setProperty("--pointer-y", "0px");
    delete glyph.dataset.variant;
    resetShifts();
  }

  function scheduleDeactivate(glyph) {
    // Cancel pending image decoding immediately; retain the visible variant briefly.
    glyph.activationRequest = null;
    clearTimeout(glyph.leaveTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      deactivate(glyph);
      return;
    }
    glyph.leaveTimer = setTimeout(() => {
      glyph.leaveTimer = null;
      if (glyph.isConnected) deactivate(glyph);
    }, 180);
  }

  function followPointer(glyph, event) {
    if (!glyph.classList.contains("glyph--active")) return;
    const bounds = glyph.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1) - .5;
    const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1) - .5;
    const image = glyph.querySelector(".glyph__image");
    image.style.setProperty("--pointer-x", `${x * 5}px`);
    image.style.setProperty("--pointer-y", `${y * 3}px`);
  }

  function renderTitle() {
    titleElement.querySelectorAll(".glyph--interactive").forEach(deactivate);
    const selected = chosenGlyphs();
    titleElement.replaceChildren();
    positions(active.text).forEach(({character, id}) => {
      if (character === "\n") { titleElement.append(document.createElement("br")); return; }
      const glyph = document.createElement("span");
      glyph.className = "glyph";
      glyph.dataset.character = character;
      glyph.dataset.targetId = id || "";
      const text = document.createElement("span");
      text.className = "glyph__text";
      text.textContent = character === " " ? "\u00a0" : character;
      glyph.append(text);

      if (selected.has(id) && activeAssets[id]?.length) {
        glyph.classList.add("glyph--interactive");
        glyph.tabIndex = 0;
        glyph.setAttribute("role", "img");
        glyph.setAttribute("aria-label", host.dataset.locale === 'en' ? `${character}, hover or focus to change style` : `${character}，悬浮或聚焦查看生成变体`);
        const image = document.createElement("img");
        image.className = "glyph__image";
        image.alt = "";
        glyph.append(image);
        glyph.addEventListener("pointerenter", () => activate(glyph));
        glyph.addEventListener("pointermove", (event) => followPointer(glyph, event));
        glyph.addEventListener("pointerleave", () => scheduleDeactivate(glyph));
        glyph.addEventListener("focus", () => activate(glyph));
        glyph.addEventListener("blur", () => deactivate(glyph));
      }
      titleElement.append(glyph);
    });
  }


      renderTitle();
      const card = host.closest('.hover-type');
      const glyphs = [...titleElement.querySelectorAll('.glyph--interactive')];
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      let visible = false, ready = false, disposed = false, pointerInside = false;
      let timer = null, autoGlyph = null, direction = 1;
      const reset = () => glyphs.forEach(deactivate);
      const canPlay = () => ready && visible && !disposed && !document.hidden && !reducedMotion.matches && !pointerInside && !card.contains(document.activeElement);
      function stopAuto() {
        clearTimeout(timer);
        timer = null;
        if (autoGlyph) deactivate(autoGlyph);
        autoGlyph = null;
        host.dataset.autoplay = 'paused';
      }
      function playRound() {
        timer = null;
        if (!canPlay()) return;
        const order = direction === 1 ? glyphs : [...glyphs].reverse();
        host.dataset.direction = direction === 1 ? 'forward' : 'reverse';
        host.dataset.autoplay = 'playing';
        const started = performance.now();
        let index = 0;
        function step() {
          if (!canPlay()) { stopAuto(); return; }
          if (index === order.length) {
            if (autoGlyph) deactivate(autoGlyph);
            autoGlyph = null;
            direction *= -1;
            host.dataset.autoplay = 'resting';
            timer = setTimeout(playRound, 2000);
            return;
          }
          autoGlyph = order[index++];
          activate(autoGlyph);
          // Fixed two-second traversal, independent of image decode and timer drift.
          timer = setTimeout(step, Math.max(0, started + index * 2000 / order.length - performance.now()));
        }
        step();
      }
      function resumeAuto() {
        if (timer !== null || !canPlay()) return;
        host.dataset.autoplay = 'resting';
        timer = setTimeout(playRound, 2000);
      }
      function syncPlayback() {
        if (canPlay()) resumeAuto();
        else stopAuto();
      }
      const enter = () => { pointerInside = true; stopAuto(); };
      const leave = () => { pointerInside = false; resumeAuto(); };
      const focusOut = () => queueMicrotask(syncPlayback);
      card.addEventListener('pointerenter', enter);
      card.addEventListener('pointerleave', leave);
      card.addEventListener('focusin', stopAuto, true);
      card.addEventListener('focusout', focusOut);
      document.addEventListener('visibilitychange', syncPlayback);
      reducedMotion.addEventListener('change', syncPlayback);
      const visibilityObserver = new IntersectionObserver((entries) => {
        visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25);
        syncPlayback();
      }, {threshold: [0, .25]});
      visibilityObserver.observe(card);
      const observer = new IntersectionObserver((entries) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        Promise.allSettled(Object.values(activeAssets).flat().map(v => {
          const image = new Image(); image.src = v.src; return image.decode();
        })).then(() => { ready = true; resumeAuto(); });
        observer.disconnect();
      }, {rootMargin:'250px'});
      observer.observe(host);
      const resize = () => { stopAuto(); reset(); resumeAuto(); };
      window.addEventListener('resize', resize);
      document.addEventListener('astro:before-swap', () => {
        disposed = true; stopAuto(); observer.disconnect(); visibilityObserver.disconnect(); reset();
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', syncPlayback);
        reducedMotion.removeEventListener('change', syncPlayback);
        card.removeEventListener('pointerenter', enter);
        card.removeEventListener('pointerleave', leave);
        card.removeEventListener('focusin', stopAuto, true);
        card.removeEventListener('focusout', focusOut);
      }, {once:true});
    });
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize();
  document.addEventListener('astro:page-load', initialize);
})();
