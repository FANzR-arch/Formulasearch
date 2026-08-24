const glassSurfaces = document.querySelectorAll('[data-glass-surface]')

const numberValue = (element, name, fallback) => {
  const value = Number(element.dataset[name])
  return Number.isFinite(value) ? value : fallback
}

const supportsSVGFilters = (filterId) => {
  const isWebkit = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
  const isFirefox = /Firefox/.test(navigator.userAgent)
  if (isWebkit || isFirefox) return false

  const probe = document.createElement('div')
  probe.style.backdropFilter = `url(#${filterId})`
  return probe.style.backdropFilter !== ''
}

const initializeGlassSurface = (container) => {
  const filterId = container.dataset.filterKey
  const redGradId = container.dataset.redGradKey
  const blueGradId = container.dataset.blueGradKey
  const filter = container.querySelector(`#${CSS.escape(filterId)}`)
  const feImage = filter?.querySelector('feImage')
  const displacementMaps = filter?.querySelectorAll('feDisplacementMap')
  const gaussianBlur = filter?.querySelector('feGaussianBlur')
  if (!filter || !feImage || !displacementMaps?.length) return

  const [redChannel, greenChannel, blueChannel] = displacementMaps
  const borderRadius = numberValue(container, 'borderRadius', 20)
  const borderWidth = numberValue(container, 'borderWidth', 0.07)
  const brightness = numberValue(container, 'brightness', 50)
  const opacity = numberValue(container, 'opacity', 0.93)
  const blur = numberValue(container, 'blur', 11)
  const displace = numberValue(container, 'displace', 0)
  const distortionScale = numberValue(container, 'distortionScale', -180)
  const redOffset = numberValue(container, 'redOffset', 0)
  const greenOffset = numberValue(container, 'greenOffset', 10)
  const blueOffset = numberValue(container, 'blueOffset', 20)
  const xChannel = container.dataset.xChannel || 'R'
  const yChannel = container.dataset.yChannel || 'G'
  const mixBlendMode = container.dataset.mixBlendMode || 'difference'

  const generateDisplacementMap = () => {
    const rect = container.getBoundingClientRect()
    const actualWidth = rect.width || 400
    const actualHeight = rect.height || 200
    const edgeSize = Math.min(actualWidth, actualHeight) * (borderWidth * 0.5)
    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="red"/>
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000"/>
            <stop offset="100%" stop-color="blue"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black"></rect>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${borderRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="${edgeSize}" y="${edgeSize}" width="${actualWidth - edgeSize * 2}" height="${actualHeight - edgeSize * 2}" rx="${borderRadius}" fill="hsl(0 0% ${brightness}% / ${opacity})" style="filter:blur(${blur}px)" />
      </svg>
    `
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`
  }

  const updateDisplacementMap = () => {
    feImage.setAttribute('href', generateDisplacementMap())
    ;[
      { element: redChannel, offset: redOffset },
      { element: greenChannel, offset: greenOffset },
      { element: blueChannel, offset: blueOffset },
    ].forEach(({ element, offset }) => {
      element.setAttribute('scale', String(distortionScale + offset))
      element.setAttribute('xChannelSelector', xChannel)
      element.setAttribute('yChannelSelector', yChannel)
    })
    gaussianBlur?.setAttribute('stdDeviation', String(displace))
  }

  updateDisplacementMap()
  const useSvgFilter = container.dataset.useSvgFilter !== 'false'
  container.classList.toggle('glass-surface--svg', useSvgFilter && supportsSVGFilters(filterId))
  container.classList.toggle('glass-surface--fallback', !container.classList.contains('glass-surface--svg'))

  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => window.setTimeout(updateDisplacementMap, 0))
    resizeObserver.observe(container)
  }

  const lightTarget = container.closest('.site-header') || container
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    lightTarget.addEventListener('pointermove', (event) => {
      const rect = container.getBoundingClientRect()
      const x = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))
      container.style.setProperty('--glass-light-x', `${x.toFixed(2)}%`)
      container.style.setProperty('--glass-light-y', `${y.toFixed(2)}%`)
      container.classList.add('is-glass-active')
    })
    lightTarget.addEventListener('pointerleave', () => {
      container.style.setProperty('--glass-light-x', '22%')
      container.style.setProperty('--glass-light-y', '0%')
      container.classList.remove('is-glass-active')
    })
  }
}

glassSurfaces.forEach(initializeGlassSurface)
