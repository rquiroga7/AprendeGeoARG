export const RANKS = [
  { name: 'Bronce I', icon: '🥉', color: '#CD7F32' },
  { name: 'Bronce II', icon: '🥉', color: '#CD7F32' },
  { name: 'Bronce III', icon: '🥉', color: '#CD7F32' },
  { name: 'Plata I', icon: '🥈', color: '#C0C0C0' },
  { name: 'Plata II', icon: '🥈', color: '#C0C0C0' },
  { name: 'Plata III', icon: '🥈', color: '#C0C0C0' },
  { name: 'Oro I', icon: '🥇', color: '#FFD700' },
  { name: 'Oro II', icon: '🥇', color: '#FFD700' },
  { name: 'Oro III', icon: '🥇', color: '#FFD700' },
  { name: 'Diamante', icon: '🔷', color: '#448AFF' },
  { name: 'Campeón', icon: '🏆', color: '#FF6F00' },
  { name: 'Gran Campeón', icon: '👑', color: '#D500F9' },
  { name: 'Leyenda Supersónica', icon: '🌟', color: '#FF6D00' },
]

const PCT = [0.05, 0.20, 0.35, 0.47, 0.57, 0.67, 0.75, 0.81, 0.86, 0.90, 0.93, 0.96]

export function getRankIndex(score, maxScore) {
  if (maxScore <= 0) return -1
  const pct = score / maxScore
  for (let i = PCT.length - 1; i >= 0; i--) {
    if (pct >= PCT[i]) return i + 1
  }
  return 0
}

export function getRank(score, maxScore) {
  const idx = getRankIndex(score, maxScore)
  return idx >= 0 ? RANKS[idx] : null
}
