class Sound {
  constructor() {
    this.audioCtx = null
  }

  getCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this.audioCtx
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3) {
    try {
      const ctx = this.getCtx()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)
      
      gainNode.gain.setValueAtTime(volume, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + duration)
    } catch {
      // Silently fail if audio context is not available
    }
  }

  playCorrect() {
    this.playTone(523.25, 0.1, 'sine', 0.3)
    setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.3), 100)
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200)
  }

  playWrong() {
    this.playTone(200, 0.15, 'sawtooth', 0.2)
    setTimeout(() => this.playTone(180, 0.15, 'sawtooth', 0.2), 150)
    setTimeout(() => this.playTone(160, 0.2, 'sawtooth', 0.2), 300)
  }

  playVictory() {
    const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50]
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.25), i * 100)
    })
  }
}

const sound = new Sound()
export default sound
