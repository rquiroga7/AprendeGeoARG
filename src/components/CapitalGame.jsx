import { useState, useEffect, useCallback, useRef } from 'react'
import { loadProvinceData, computeLevelSizes, getProvinceName, getDeptTerm } from '../data/index'
import fireworks from '../utils/fireworks'
import sound from '../utils/sound'
import { getRank } from '../utils/ranks'
import ZoomableMap from './ZoomableMap'

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const ATTEMPT_COLORS = ['#00C853', '#FFD600', '#FF9100']
const LEVEL_ICONS = ['🌱', '🌿', '🌳', '🏔️', '🎓', '👑']

function getOptions(correctCapital, allCapitals) {
  const otherCapitals = allCapitals.filter(c => c !== correctCapital)
  const shuffledOthers = shuffleArray(otherCapitals).slice(0, 3)
  return shuffleArray([correctCapital, ...shuffledOthers])
}

function CapitalGame({ provinceKey, onBack, onRoundEnd }) {
  const [provinceData, setProvinceData] = useState(null)
  const [levelSizes, setLevelSizes] = useState([])
  const [roundDepts, setRoundDepts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [options, setOptions] = useState([])
  const [selectedOption, setSelectedOption] = useState(null)
  const [showResult, setShowResult] = useState(false)
  const [roundTrophies, setRoundTrophies] = useState(0)
  const [levelIndex, setLevelIndex] = useState(0)
  const [isAnswered, setIsAnswered] = useState(false)
  const [attemptsThisQuestion, setAttemptsThisQuestion] = useState(0)
  const [resultData, setResultData] = useState(null)
  const [scorePopup, setScorePopup] = useState(null)
  const [deptAttempts, setDeptAttempts] = useState({})
  const trophiesRef = useRef(0)
  const streakRef = useRef(0)
  const previousStreakRef = useRef(0)
  const provinceName = provinceData ? provinceData.name : getProvinceName(provinceKey)

  const allCapitalsRef = useRef([])
  useEffect(() => {
    if (provinceData) {
      allCapitalsRef.current = provinceData.departments.map(d => d.capital)
    }
  }, [provinceData])

  const initGame = useCallback((data, streak = 0) => {
    const sizes = computeLevelSizes(data.departments.length)
    const idx = Math.min(streak, sizes.length - 1)
    const size = sizes[idx]
    const selected = shuffleArray(data.departments.slice(0, size))
    setProvinceData(data)
    setLevelSizes(sizes)
    setRoundDepts(selected)
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongCount(0)
    setSelectedOption(null)
    setShowResult(false)
    setRoundTrophies(0)
    trophiesRef.current = 0
    setIsAnswered(false)
    setAttemptsThisQuestion(0)
    setResultData(null)
    setScorePopup(null)
    setDeptAttempts({})
    if (selected.length > 0) {
      allCapitalsRef.current = data.departments.map(d => d.capital)
      setOptions(getOptions(selected[0].capital, allCapitalsRef.current))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    loadProvinceData(provinceKey).then((data) => {
      if (cancelled) return
      initGame(data, 0)
    })
    return () => { cancelled = true }
  }, [provinceKey, initGame])

  const startNewRound = useCallback((currentStreak) => {
    if (!provinceData) return
    const sizes = levelSizes.length > 0 ? levelSizes : computeLevelSizes(provinceData.departments.length)
    const idx = Math.min(currentStreak, sizes.length - 1)
    const size = sizes[idx]
    const selected = shuffleArray(provinceData.departments.slice(0, size))
    setRoundDepts(selected)
    setCurrentIndex(0)
    setCorrectCount(0)
    setWrongCount(0)
    setSelectedOption(null)
    setShowResult(false)
    setRoundTrophies(0)
    trophiesRef.current = 0
    setIsAnswered(false)
    setAttemptsThisQuestion(0)
    setResultData(null)
    setScorePopup(null)
    setDeptAttempts({})
    if (selected.length > 0) {
      setOptions(getOptions(selected[0].capital, allCapitalsRef.current))
    }
  }, [provinceData, levelSizes])



  const getPointsForAttempt = (attempt) => {
    if (attempt === 0) return 10
    if (attempt === 1) return 5
    if (attempt === 2) return 2
    return 0
  }

  const handleOptionClick = (capital) => {
    if (isAnswered) return

    const currentDept = roundDepts[currentIndex]
    const isCorrect = capital === currentDept.capital

    if (isCorrect) {
      sound.playCorrect()
      setIsAnswered(true)
      setSelectedOption(capital)
      setDeptAttempts(prev => ({ ...prev, [currentDept.name]: attemptsThisQuestion }))
      const newCorrect = correctCount + 1
      setCorrectCount(newCorrect)

      const points = getPointsForAttempt(attemptsThisQuestion)
      trophiesRef.current += points
      setRoundTrophies(trophiesRef.current)

      setScorePopup({ type: 'correct', text: `${currentDept.name} → ${capital}` })

      setTimeout(() => {
        setScorePopup(null)
        moveToNext(newCorrect)
      }, 2400)
    } else {
      sound.playWrong()
      setSelectedOption(capital)
      setAttemptsThisQuestion(prev => prev + 1)
      setWrongCount(prev => prev + 1)

      setTimeout(() => {
        setSelectedOption(null)
      }, 600)
    }
  }

  const moveToNext = (correct) => {
    if (currentIndex + 1 >= roundDepts.length) {
      finishRound(correct)
    } else {
      const nextIdx = currentIndex + 1
      const nextDept = roundDepts[nextIdx]
      if (nextDept) {
        setOptions(getOptions(nextDept.capital, allCapitalsRef.current))
      }
      setCurrentIndex(nextIdx)
      setIsAnswered(false)
    }
  }

  const finishRound = (correct) => {
    const total = roundDepts.length
    const maxScore = total * 10
    const score = trophiesRef.current
    const currentLevel = streakRef.current + 1
    const maxLevelIdx = levelSizes.length - 1
    const isMaxLevel = streakRef.current >= maxLevelIdx

    previousStreakRef.current = streakRef.current

    let levelResult = 'fail'
    if (score >= maxScore * 0.8) {
      levelResult = 'pass'
      if (!isMaxLevel) {
        streakRef.current = streakRef.current + 1
      }
      fireworks.launchLoop()
      sound.playVictory()
    } else if (score >= maxScore * 0.5) {
      levelResult = 'good'
    }

    setLevelIndex(streakRef.current)
    onRoundEnd('capital', score, maxScore)
    setResultData({ correct, total, maxScore, score, currentLevel, levelResult, isMaxLevel })
    setShowResult(true)
  }

  const handlePlayAgain = () => {
    fireworks.stopLoop()
    startNewRound(streakRef.current)
  }

  const handleRepeatLevel = () => {
    fireworks.stopLoop()
    startNewRound(previousStreakRef.current)
  }

  const handleBack = () => {
    fireworks.stopLoop()
    onBack()
  }

  const handleLevelChange = (e) => {
    const newStreak = parseInt(e.target.value, 10)
    fireworks.stopLoop()
    streakRef.current = newStreak
    setLevelIndex(newStreak)
    startNewRound(newStreak)
  }

  if (!provinceData) {
    return (
      <div className="game-container">
        <div className="game-loading">Cargando datos de {provinceName}...</div>
      </div>
    )
  }

  const currentDept = roundDepts[currentIndex]
  const progress = roundDepts.length > 0 ? ((currentIndex) / roundDepts.length) * 100 : 0

  return (
    <div className="game-container">
      <header className="game-header">
        <button className="back-btn" onClick={handleBack}>← Menú</button>
        <div className="game-header-title">{provinceName}</div>
        <div className="game-info">
          <select className="level-select" value={levelIndex} onChange={handleLevelChange}>
            {levelSizes.map((size, i) => (
              <option key={i} value={i}>{LEVEL_ICONS[i] || '⭐'} Nivel {i+1} ({size} {getDeptTerm(provinceKey, true)})</option>
            ))}
          </select>
          <div className="round-badge">🎯 {roundDepts.length} {getDeptTerm(provinceKey, true)}</div>
          <div className="game-stat">
            <span className="label">Pregunta</span>
            <span className="value">{currentIndex + (showResult ? roundDepts.length : 1)}/{roundDepts.length}</span>
          </div>
          <div className="game-stat">
            <span className="label">Correctas</span>
            <span className="value correct">{correctCount}</span>
          </div>
          <div className="game-stat">
            <span className="label">Incorrectas</span>
            <span className="value wrong">{wrongCount}</span>
          </div>
          <div className="trophies-earned">🏆 {roundTrophies}</div>
        </div>
      </header>

      <div className="game-content">
        {!showResult && currentDept && (
          <div className="capital-game-area">
            <div className="capital-map-col">
              <div className="question-bar" style={{ marginBottom: '12px' }}>
                <h2>¿Cabecera de <span className="highlight">{currentDept.name}</span>?</h2>
              </div>
              <div className="progress-container" style={{ marginBottom: '12px' }}>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="progress-text">{currentIndex + 1} de {roundDepts.length}</div>
              </div>
              <div className="mini-map-container">
                <svg className="mini-map-svg" viewBox={provinceData.viewBox} xmlns="http://www.w3.org/2000/svg">
                  {provinceData.departments.map((dept) => (
                    <path key={dept.name} d={dept.path}
                      fill={dept.name === currentDept.name ? '#FFD700' : '#3a3a5c'}
                      stroke={dept.name === currentDept.name ? '#FFA500' : '#1a1a2e'}
                      strokeWidth={dept.name === currentDept.name ? 2.5 : 1}
                      strokeLinejoin="round"
                    />
                  ))}
                  <text x={currentDept.cx} y={currentDept.cy}
                    style={{ fontSize: '11px', fill: '#1a1a2e', fontWeight: '900', textAnchor: 'middle', pointerEvents: 'none',
                      paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: '3px', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                    {currentDept.name}
                  </text>
                </svg>
              </div>
            </div>
            <div className="capital-options-col">
              {options.map((capital) => {
                let className = 'option-btn'
                if (isAnswered) {
                  if (capital === currentDept.capital) className += ' correct'
                  else if (capital === selectedOption) className += ' wrong'
                  else className += ' disabled'
                } else if (capital === selectedOption) {
                  className += ' wrong'
                }
                return (
                  <button key={capital} className={className} onClick={() => handleOptionClick(capital)} disabled={isAnswered}>
                    {capital}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {scorePopup && <div className={`score-popup ${scorePopup.type}`}>{scorePopup.text}</div>}

        {showResult && resultData && (
          <div className="game-round-area with-results">
            <ZoomableMap
              viewBox={provinceData.mainViewBox || provinceData.viewBox}
              offshorePips={provinceData.departments.filter(d => d.offshore).map(dept => ({
                name: dept.name,
                d: dept.path,
                vb: dept.insetViewBox,
                fill: deptAttempts[dept.name] !== undefined ? ATTEMPT_COLORS[Math.min(deptAttempts[dept.name], 2)] : '#3a3a5c'
              }))}
            >
              {provinceData.departments.filter(d => !d.offshore).map((dept) => (
                <path key={dept.name} d={dept.path}
                  fill={
                    deptAttempts[dept.name] !== undefined
                      ? ATTEMPT_COLORS[Math.min(deptAttempts[dept.name], 2)]
                      : '#3a3a5c'
                  }
                  stroke="#1a1a2e"
                  strokeWidth={1}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
              {provinceData.departments.filter(d => !d.offshore && deptAttempts[d.name] !== undefined).map((dept) => (
                <text key={`label-${dept.name}`} x={dept.cx} y={dept.cy}
                  style={{ fontSize: '7px', fill: 'white', textAnchor: 'middle', pointerEvents: 'none',
                    paintOrder: 'stroke', stroke: '#1a1a2e', strokeWidth: '2px', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                  {dept.name.length > 16 ? dept.name.substring(0, 16) + '…' : dept.name}
                </text>
              ))}
            </ZoomableMap>
            <div className="result-panel-wrapper">
              <div className="result-panel">
                <div className="round-results">
                  <div className="result-icon">
                    {resultData.levelResult === 'pass' ? '🎉' : resultData.levelResult === 'good' ? '😊' : '😅'}
                  </div>
                  <h2>
                    {resultData.levelResult === 'pass' && '¡Felicitaciones!'}
                    {resultData.levelResult === 'good' && '¡Bien hecho!'}
                    {resultData.levelResult === 'fail' && '¡Seguí intentando!'}
                  </h2>
                  {resultData.levelResult === 'pass' && !resultData.isMaxLevel && (
                    <p className="level-up-text">¡Excelentes respuestas! Pasando a nivel {resultData.currentLevel + 1} de dificultad</p>
                  )}
                  {resultData.levelResult === 'pass' && resultData.isMaxLevel && (() => {
                    const rank = getRank(resultData.score, resultData.maxScore)
                    const isLegend = rank?.name === 'Leyenda Supersónica'
                    return isLegend ? (
                      <p className="level-up-text" style={{ color: '#FFD700', fontSize: '1.2rem' }}>🌟 ¡Leyenda Supersónica! 🌟 Completaste todas las cabeceras de {provinceName} con una puntuación perfecta.</p>
                    ) : (
                      <p className="level-up-text" style={{ color: '#6C63FF' }}>¡Completaste todos los niveles de {provinceName}! Sos un verdadero experto en cabeceras.</p>
                    )
                  })()}
                  {resultData.levelResult === 'good' && (
                    <p className="level-up-text" style={{ color: '#FFD600' }}>¡Muy bien! Pero podés mejorar, intentá de nuevo</p>
                  )}
                  {resultData.levelResult === 'fail' && (
                    <p className="level-up-text" style={{ color: '#FF6584' }}>No te preocupes, ¡practicando vas a mejorar!</p>
                  )}
                  <p className="score-text">{Object.values(deptAttempts).filter(v => v === 0).length} de {resultData.total} correctas en el primer intento</p>
                  <div className="trophies-earned">🏆 {resultData.score} de {resultData.maxScore} puntos posibles</div>
                  {(() => {
                    const r = getRank(resultData.score, resultData.maxScore)
                    return r ? <p className="rank-text">{r.icon} Rango: {r.name}</p> : null
                  })()}
                  {Object.values(deptAttempts).some(v => v > 0) && (
                    <p className="review-text">Deberías repasar las cabeceras de los {getDeptTerm(provinceKey, true)} que no están en verde!</p>
                  )}
                  <div className="color-legend">
                    <span><span className="legend-dot" style={{ background: '#00C853' }}></span> Excelente</span>
                    <span><span className="legend-dot" style={{ background: '#FFD600' }}></span> Repasar</span>
                    <span><span className="legend-dot" style={{ background: '#FF9100' }}></span> Estudiar</span>
                  </div>
                  <div className="buttons">
                    <button className="btn btn-secondary" onClick={handleBack}>Salir al menú</button>
                    <button className="btn" onClick={handleRepeatLevel}>Repetir nivel</button>
                    {resultData.levelResult === 'pass' && !resultData.isMaxLevel && (
                      <button className="btn" onClick={handlePlayAgain}>Siguiente nivel</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CapitalGame
