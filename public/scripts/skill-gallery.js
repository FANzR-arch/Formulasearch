(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const randomFor = (seed) => {
    let value = seed >>> 0
    return () => {
      value += 0x6D2B79F5
      let result = value
      result = Math.imul(result ^ (result >>> 15), result | 1)
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296
    }
  }

  const shuffle = (items, random) => {
    const result = [...items]
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1))
      ;[result[index], result[target]] = [result[target], result[index]]
    }
    return result
  }

  const initialize = () => {
    document.querySelectorAll('[data-skill-gallery]').forEach((gallery) => {
      if (gallery.dataset.skillGalleryBound === 'true') return
      gallery.dataset.skillGalleryBound = 'true'

      const cards = [...gallery.querySelectorAll('[data-skill-card]')]
      const section = gallery.closest('.skill-feature')
      const button = section?.querySelector('[data-skill-shuffle]')
      const current = section?.querySelector('[data-skill-current]')
      const status = section?.querySelector('[data-skill-shuffle-status]')
      if (cards.length < 2 || !button) return

      let order = [...cards]
      let round = 0
      let locked = false

      const announce = (prefix = '') => {
        const title = order[0]?.dataset.skillTitle || ''
        if (current) current.textContent = String(cards.indexOf(order[0]) + 1).padStart(2, '0')
        if (status) status.textContent = [prefix, title].filter(Boolean).join('：')
      }

      const applyStack = ({ animate = true } = {}) => {
        gallery.classList.toggle('is-static', !animate || reduceMotion.matches)
        const desktopSpread = gallery.clientWidth >= 760
        const desktopLayout = [
          { x: 0, y: 0, rotation: -0.35 },
          { x: 22, y: 16, rotation: 2.6 },
          { x: -34, y: -14, rotation: -3.5 },
          { x: 42, y: 28, rotation: 4.5 },
          { x: -50, y: -26, rotation: -5.4 }
        ]

        order.forEach((card, depth) => {
          const visibleDepth = Math.min(depth, 4)
          const direction = visibleDepth % 2 === 0 ? -1 : 1
          const desktopLayer = desktopLayout[visibleDepth]
          const rotation = desktopSpread
            ? desktopLayer.rotation
            : visibleDepth === 0 ? -0.35 : direction * (1.25 + visibleDepth * 0.72)
          const offsetX = desktopSpread
            ? desktopLayer.x
            : visibleDepth === 0 ? 0 : direction * (4 + visibleDepth * 3)
          const offsetY = desktopSpread ? desktopLayer.y : visibleDepth * 6
          const scale = 1 - visibleDepth * 0.022

          card.style.setProperty('--skill-stack-x', `${offsetX}px`)
          card.style.setProperty('--skill-stack-y', `${offsetY}px`)
          card.style.setProperty('--skill-stack-rotate', `${rotation.toFixed(2)}deg`)
          card.style.setProperty('--skill-stack-scale', scale.toFixed(3))
          card.style.setProperty('--skill-card-opacity', depth < 5 ? '1' : '0')
          card.style.setProperty('--skill-card-z', String(cards.length - depth))
          card.style.removeProperty('--skill-drag-x')
          card.style.removeProperty('--skill-drag-y')
          card.style.removeProperty('--skill-drag-rotate')
          card.classList.remove('is-dragging', 'is-leaving')
          card.dataset.skillActive = depth === 0 ? 'true' : 'false'

          const dragSurface = card.querySelector('[data-skill-drag]')
          const openLink = card.querySelector('[data-skill-open]')
          const active = depth === 0
          if (dragSurface) {
            dragSurface.tabIndex = active ? 0 : -1
            dragSurface.setAttribute('aria-hidden', active ? 'false' : 'true')
          }
          if (openLink) {
            openLink.tabIndex = active ? 0 : -1
            openLink.setAttribute('aria-hidden', active ? 'false' : 'true')
          }
        })

        requestAnimationFrame(() => gallery.classList.remove('is-static'))
        announce()
      }

      const sendTopToBack = (dragX = 1, dragY = 0) => {
        if (locked) return
        locked = true
        const top = order[0]
        const magnitude = Math.hypot(dragX, dragY) || 1
        const unitX = dragX / magnitude
        const unitY = dragY / magnitude
        const distance = Math.max(gallery.clientWidth * 0.6, 260)
        top.classList.add('is-leaving')
        top.style.setProperty('--skill-drag-x', `${unitX * distance}px`)
        top.style.setProperty('--skill-drag-y', `${unitY * distance}px`)
        top.style.setProperty('--skill-drag-rotate', `${unitX * 7}deg`)

        window.setTimeout(() => {
          order = [...order.slice(1), top]
          applyStack({ animate: !reduceMotion.matches })
          locked = false
        }, reduceMotion.matches ? 0 : 220)
      }

      cards.forEach((card) => {
        const dragSurface = card.querySelector('[data-skill-drag]')
        if (!dragSurface) return

        dragSurface.addEventListener('dragstart', (event) => event.preventDefault())

        let startX = 0
        let startY = 0
        let dragX = 0
        let dragY = 0
        let dragging = false
        let suppressClick = false

        dragSurface.addEventListener('pointerdown', (event) => {
          if (card.dataset.skillActive !== 'true' || event.button !== 0 || locked) return
          startX = event.clientX
          startY = event.clientY
          dragX = 0
          dragY = 0
          dragging = false
          suppressClick = false
          dragSurface.setPointerCapture(event.pointerId)
          card.classList.add('is-dragging')
        })

        dragSurface.addEventListener('pointermove', (event) => {
          if (!dragSurface.hasPointerCapture(event.pointerId)) return
          dragX = event.clientX - startX
          dragY = event.clientY - startY
          if (!dragging && Math.hypot(dragX, dragY) < 6) return
          dragging = true
          suppressClick = true
          card.style.setProperty('--skill-drag-x', `${dragX}px`)
          card.style.setProperty('--skill-drag-y', `${dragY}px`)
          card.style.setProperty('--skill-drag-rotate', `${dragX * 0.018}deg`)
        })

        const finishDrag = (event) => {
          if (!dragSurface.hasPointerCapture(event.pointerId)) return
          dragSurface.releasePointerCapture(event.pointerId)
          card.classList.remove('is-dragging')
          const distance = Math.hypot(dragX, dragY)
          const threshold = Math.min(42, gallery.clientWidth * 0.1)
          if (event.type === 'pointerup' && dragging && distance >= threshold) {
            sendTopToBack(dragX, dragY)
          } else {
            card.style.removeProperty('--skill-drag-x')
            card.style.removeProperty('--skill-drag-y')
            card.style.removeProperty('--skill-drag-rotate')
          }
        }

        dragSurface.addEventListener('pointerup', finishDrag)
        dragSurface.addEventListener('pointercancel', finishDrag)
        dragSurface.addEventListener('click', (event) => {
          event.preventDefault()
          if (suppressClick) {
            suppressClick = false
            return
          }
          if (card.dataset.skillActive === 'true') sendTopToBack(1, 0)
        })
        dragSurface.addEventListener('keydown', (event) => {
          const directions = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1]
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            sendTopToBack(1, 0)
            return
          }
          const direction = directions[event.key]
          if (!direction) return
          event.preventDefault()
          sendTopToBack(direction[0], direction[1])
        })
      })

      button.addEventListener('click', () => {
        if (locked) return
        round += 1
        order = shuffle(order, randomFor(4813 + round * 7919))
        button.classList.remove('is-shuffling')
        void button.offsetWidth
        button.classList.add('is-shuffling')
        applyStack({ animate: true })

        const template = document.documentElement.lang === 'en' ? button.dataset.statusEn : button.dataset.statusZh
        announce((template || '').replace('{count}', String(round)))
        window.setTimeout(() => button.classList.remove('is-shuffling'), reduceMotion.matches ? 0 : 520)
      })

      applyStack({ animate: false })
    })
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initialize) : initialize()
  document.addEventListener('astro:page-load', initialize)
})()
