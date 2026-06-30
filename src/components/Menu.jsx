import { useState, useEffect } from 'react'
import { RANKS } from '../utils/ranks'
import { getProvinces, getDeptTerm } from '../data/index'
import './Menu.css'

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

function getProvinceModeStats(stats, provinceKey, mode) {
  return stats[provinceKey]?.[mode] || { best: 0, last: 0, maxPossible: 0, lastMax: 0, bestRankIdx: -1 }
}

const provinces = getProvinces()

function Menu({ onSelectMode }) {
  const [stats, setStats] = useState(loadStats)
  const [selectedProvince, setSelectedProvince] = useState(provinces[0]?.key || '')

  useEffect(() => {
    const handler = () => setStats(loadStats())
    window.addEventListener('storage', handler)
    const interval = setInterval(handler, 500)
    return () => { window.removeEventListener('storage', handler); clearInterval(interval) }
  }, [])

  const renderRank = (rankIdx) => {
    if (rankIdx < 0 || rankIdx >= RANKS.length) return '—'
    const rank = RANKS[rankIdx]
    return `${rank.icon} ${rank.name}`
  }

  const provStats = getProvinceModeStats(stats, selectedProvince, 'map')
  const provCapStats = getProvinceModeStats(stats, selectedProvince, 'capital')

  return (
    <div className="menu">
      <div className="menu-logo">🗺️</div>
      <h1 className="menu-title">
        <span style={{ color: '#4FC3F7', WebkitTextFillColor: '#4FC3F7', WebkitTextStroke: '0.5px rgba(255,255,255,0.5)' }}>Aprende</span>
        <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', WebkitTextStroke: '0.5px rgba(255,255,255,0.5)' }}>G</span>
        <span style={{ color: '#FFD700', WebkitTextFillColor: '#FFD700', WebkitTextStroke: '0.5px rgba(255,255,255,0.5)' }}>e</span>
        <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF', WebkitTextStroke: '0.5px rgba(255,255,255,0.5)' }}>o</span>
        <span style={{ color: '#4FC3F7', WebkitTextFillColor: '#4FC3F7', WebkitTextStroke: '0.5px rgba(255,255,255,0.5)' }}>ARG</span>
      </h1>
      <p className="menu-subtitle">Aprendé los departamentos, provincias, cabeceras y capitales de toda la Argentina</p>

      <div className="menu-province-selector">
        <label htmlFor="province-select">Provincia:</label>
        <select
          id="province-select"
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
        >
          {provinces.map((p) => (
            <option key={p.key} value={p.key}>{p.name} ({p.count} {getDeptTerm(p.key, true)})</option>
          ))}
        </select>
      </div>

      <p className="menu-levels-info">
        {selectedProvince === 'argentina'
          ? 'Cada modo tiene niveles de dificultad que aumentan la cantidad de provincias incluidas, ordenadas de norte a sur.'
          : `Cada provincia tiene niveles de dificultad que aumentan la cantidad de ${getDeptTerm(selectedProvince, true)} incluidos, ordenados de norte a sur.`}
      </p>

      <div className="mode-cards">
        <div className="mode-card" onClick={() => onSelectMode('map', selectedProvince)}>
          <div className="icon">📍</div>
          <h3>Ubicá {selectedProvince === 'argentina' ? 'la' : 'el'} {getDeptTerm(selectedProvince, false, true)}</h3>
          <p>Se te nombra {selectedProvince === 'argentina' ? 'una' : 'un'} {getDeptTerm(selectedProvince)} y deberás encontrarla{selectedProvince === 'argentina' ? '' : 'o'} en el mapa.</p>
          {provStats.best > 0 && (
            <div className="mode-stats">
              <div className="mode-stat">
                <span className="stat-label">Mejor actuación</span>
                <span className="stat-value">{renderRank(provStats.bestRankIdx)}</span>
              </div>
              <div className="mode-stat">
                <span className="stat-label">Última partida</span>
                <span className="stat-value">{provStats.last > 0 ? `${provStats.last}/${provStats.lastMax} pts` : '—'}</span>
              </div>
            </div>
          )}
        </div>

        <div className="mode-card" onClick={() => onSelectMode('capital', selectedProvince)}>
          <div className="icon">🏙️</div>
          <h3>¿Cuál es la Cabecera?</h3>
          <p>Se te muestra {selectedProvince === 'argentina' ? 'una' : 'un'} {getDeptTerm(selectedProvince)} y deberás elegir su ciudad cabecera.</p>
          {provCapStats.best > 0 && (
            <div className="mode-stats">
              <div className="mode-stat">
                <span className="stat-label">Mejor actuación</span>
                <span className="stat-value">{renderRank(provCapStats.bestRankIdx)}</span>
              </div>
              <div className="mode-stat">
                <span className="stat-label">Última partida</span>
                <span className="stat-value">{provCapStats.last > 0 ? `${provCapStats.last}/${provCapStats.lastMax} pts` : '—'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Menu
