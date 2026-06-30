import { useState, useCallback } from 'react'
import './App.css'
import Menu from './components/Menu'
import MapGame from './components/MapGame'
import CapitalGame from './components/CapitalGame'
import { getRankIndex } from './utils/ranks'

const STATS_KEY = 'aprendeGeoAR_stats'

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    return {}
  }
  return {}
}

function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {
    // ignore
  }
}

function getProvinceStatsSafe(stats, provinceKey) {
  if (!stats[provinceKey]) {
    stats[provinceKey] = {}
  }
  const p = stats[provinceKey]
  if (!p.map) {
    p.map = { best: 0, last: 0, maxPossible: 0, lastMax: 0, bestRankIdx: -1 }
  }
  if (!p.capital) {
    p.capital = { best: 0, last: 0, maxPossible: 0, lastMax: 0, bestRankIdx: -1 }
  }
  return p
}

function saveRoundStats(provinceKey, mode, trophies, maxPossible) {
  const stats = loadStats()
  const p = getProvinceStatsSafe(stats, provinceKey)
  const key = mode
  p[key].last = trophies
  p[key].lastMax = maxPossible
  const rankIdx = getRankIndex(trophies, maxPossible)
  if (rankIdx > (p[key].bestRankIdx ?? -1)) {
    p[key].bestRankIdx = rankIdx
  }
  if (trophies > p[key].best) {
    p[key].best = trophies
    p[key].maxPossible = maxPossible
  }
  saveStats(stats)
}

function App() {
  const [gameMode, setGameMode] = useState(null)
  const [selectedProvince, setSelectedProvince] = useState(null)

  const handleSelectMode = (mode, provinceKey) => {
    setSelectedProvince(provinceKey)
    setGameMode(mode)
  }

  const handleBackToMenu = () => {
    setGameMode(null)
    setSelectedProvince(null)
  }

  const handleRoundEnd = useCallback((mode, trophies, maxPossible) => {
    if (selectedProvince) {
      saveRoundStats(selectedProvince, mode, trophies, maxPossible)
    }
  }, [selectedProvince])

  return (
    <div className="app">
      {!gameMode && (
        <Menu onSelectMode={handleSelectMode} />
      )}
      {gameMode === 'map' && selectedProvince && (
        <MapGame
          provinceKey={selectedProvince}
          onBack={handleBackToMenu}
          onRoundEnd={handleRoundEnd}
        />
      )}
      {gameMode === 'capital' && selectedProvince && (
        <CapitalGame
          provinceKey={selectedProvince}
          onBack={handleBackToMenu}
          onRoundEnd={handleRoundEnd}
        />
      )}
    </div>
  )
}

export default App
