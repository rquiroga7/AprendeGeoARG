const FIREWORK_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF6348', '#7bed9f', '#70a1ff', '#ffa502']

function detectQuality() {
  try {
    if (typeof window === 'undefined') return 'off'
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'off'
    const cores = navigator.hardwareConcurrency || 8
    const memory = navigator.deviceMemory || 8
    const dpr = window.devicePixelRatio || 1
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
    let score = 0
    if (cores <= 4) score += 2
    if (cores <= 2) score += 2
    if (memory <= 4) score += 2
    if (memory <= 2) score += 2
    if (dpr >= 3) score += 1
    if (isMobile) score += 1
    if (score >= 5) return 'off'
    if (score >= 3) return 'low'
    if (score >= 2) return 'medium'
    return 'high'
  } catch {
    return 'medium'
  }
}

const QUALITY_CONFIG = {
  high: { dpr: 2, burst: 60, cores: 8, minSize: 3, maxSize: 6, minSpeed: 2, maxSpeed: 6, slowMs: 45, maxParticles: 1100 },
  medium: { dpr: 1.5, burst: 30, cores: 5, minSize: 2.5, maxSize: 5, minSpeed: 2, maxSpeed: 5, slowMs: 40, maxParticles: 650 },
  low: { dpr: 1, burst: 15, cores: 3, minSize: 2, maxSize: 4, minSpeed: 2, maxSpeed: 4, slowMs: 36, maxParticles: 320 },
}

class Fireworks {
  constructor() {
    this.particles = []
    this.canvas = null
    this.ctx = null
    this.animating = false
    this.quality = 'high'
    this.dpr = 1
    this.sprites = new Map()
    this.frameTimes = []
    this.lastFrame = null
    this.loopInterval = null
  }

  init() {
    this.quality = detectQuality()
    if (this.quality === 'off' || this.canvas) return
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'fireworks-canvas'
    this.canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:300;'
    document.body.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')
    this.applyQuality()
    window.addEventListener('resize', () => this.resize())
  }

  applyQuality() {
    const config = QUALITY_CONFIG[this.quality]
    if (!config) return
    this.dpr = Math.min(window.devicePixelRatio || 1, config.dpr)
    this.resize()
    this.buildSprites()
  }

  resize() {
    if (!this.canvas) return
    this.canvas.width = Math.round(window.innerWidth * this.dpr)
    this.canvas.height = Math.round(window.innerHeight * this.dpr)
  }

  buildSprites() {
    this.sprites.clear()
    const colors = [...FIREWORK_COLORS, '#ffffff']
    const size = 64
    for (const color of colors) {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const g = c.getContext('2d')
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
      grad.addColorStop(0, color)
      grad.addColorStop(0.6, color + '88')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      g.fillStyle = grad
      g.fillRect(0, 0, size, size)
      this.sprites.set(color, c)
    }
  }

  createParticle(x, y, color, size, speed) {
    const angle = Math.random() * Math.PI * 2
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: Math.random() * 0.012 + 0.006,
      color,
      size,
      gravity: 0.06
    }
  }

  createBurst(x, y) {
    const config = QUALITY_CONFIG[this.quality]
    if (!config || this.particles.length >= config.maxParticles) return
    const count = Math.min(config.burst, config.maxParticles - this.particles.length)
    for (let i = 0; i < count; i++) {
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
      const size = Math.random() * (config.maxSize - config.minSize) + config.minSize
      const speed = Math.random() * (config.maxSpeed - config.minSpeed) + config.minSpeed
      this.particles.push(this.createParticle(x, y, color, size, speed))
    }
    for (let i = 0; i < config.cores; i++) {
      this.particles.push(this.createParticle(x, y, '#ffffff', 2, Math.random() * 2 + 1))
    }
  }

  burstAt(clientX, clientY) {
    this.init()
    if (this.quality === 'off' || !this.ctx) return
    this.createBurst(clientX * this.dpr, clientY * this.dpr)
    if (!this.animating) {
      this.animating = true
      this.animate()
    }
  }

  animate() {
    if (!this.ctx) return
    const now = performance.now()
    const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 16.667, 3) : 1
    this.trackFrame(now)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.ctx.globalCompositeOperation = 'lighter'
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += p.gravity * dt
      p.vx *= Math.pow(0.99, dt)
      p.life -= p.decay * dt

      if (p.life <= 0) {
        this.particles.splice(i, 1)
        continue
      }

      const sprite = this.sprites.get(p.color)
      if (!sprite) continue
      const drawSize = p.size * p.life * 4 * this.dpr
      this.ctx.globalAlpha = Math.min(1, p.life * 1.4)
      this.ctx.drawImage(sprite, p.x - drawSize / 2, p.y - drawSize / 2, drawSize, drawSize)
    }
    this.ctx.globalCompositeOperation = 'source-over'
    this.ctx.globalAlpha = 1

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.animate())
    } else {
      this.animating = false
      this.lastFrame = null
      this.frameTimes = []
    }
  }

  trackFrame(now) {
    if (this.lastFrame === null) {
      this.lastFrame = now
      return
    }
    const dt = now - this.lastFrame
    this.lastFrame = now
    if (this.quality === 'off') return
    this.frameTimes.push(dt)
    if (this.frameTimes.length > 60) this.frameTimes.shift()
    if (this.frameTimes.length < 30) return
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    const config = QUALITY_CONFIG[this.quality]
    if (config && avg > config.slowMs) this.downgrade()
  }

  getStats() {
    const frames = this.frameTimes
    const avg = frames.length ? frames.reduce((a, b) => a + b, 0) / frames.length : 0
    return {
      quality: this.quality,
      dpr: this.dpr,
      particles: this.particles.length,
      animating: this.animating,
      avgFrameMs: Math.round(avg * 10) / 10,
      fps: avg > 0 ? Math.round(1000 / avg) : null,
      slowThresholdMs: QUALITY_CONFIG[this.quality]?.slowMs ?? null,
    }
  }

  downgrade() {
    if (this.quality === 'off') return
    if (this.quality === 'low') {
      this.quality = 'off'
      this.stopLoop()
      for (const p of this.particles) {
        p.life = Math.min(p.life, 0.4)
        p.decay = Math.max(p.decay, 0.06)
      }
      this.frameTimes = []
      this.lastFrame = null
      return
    }
    this.quality = this.quality === 'high' ? 'medium' : 'low'
    const config = QUALITY_CONFIG[this.quality]
    this.dpr = Math.min(window.devicePixelRatio || 1, config.dpr)
    if (this.particles.length > config.maxParticles) {
      this.particles.length = config.maxParticles
    }
    this.resize()
    this.frameTimes = []
    this.lastFrame = null
  }

  launch() {
    this.init()
    if (this.quality === 'off' || !this.ctx) return
    const burstCount = 5
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        if (this.quality === 'off') return
        const x = Math.random() * this.canvas.width * 0.6 + this.canvas.width * 0.2
        const y = Math.random() * this.canvas.height * 0.4 + this.canvas.height * 0.1
        this.createBurst(x, y)
        if (!this.animating) {
          this.animating = true
          this.animate()
        }
      }, i * 300)
    }
  }

  launchLoop(count = 5) {
    this.init()
    if (this.quality === 'off' || !this.ctx) return
    let remaining = count
    this.stopLoop()
    this.loopInterval = setInterval(() => {
      if (this.quality === 'off' || !this.canvas || remaining <= 0) {
        this.stopLoop()
        return
      }
      remaining--
      const x = Math.random() * this.canvas.width * 0.8 + this.canvas.width * 0.1
      const y = Math.random() * this.canvas.height * 0.5 + this.canvas.height * 0.1
      this.createBurst(x, y)
      if (!this.animating) {
        this.animating = true
        this.animate()
      }
    }, 500)
  }

  stopLoop() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval)
      this.loopInterval = null
    }
  }
}

const fireworks = new Fireworks()
export default fireworks

// Debug instrumentation. Load the app with ?fwdebug in the URL to log the
// detected quality tier and measured FPS to the console every second, and
// expose the singleton on window for manual probing:
//   window.__fireworks.getStats()
if (typeof window !== 'undefined' && typeof URLSearchParams !== 'undefined' &&
    new URLSearchParams(window.location.search).has('fwdebug')) {
  window.__fireworks = fireworks
  setInterval(() => {
    console.log('[fireworks]', JSON.stringify(fireworks.getStats()))
  }, 1000)
}