import { useState, useEffect, useCallback, useRef } from 'react'
import { loadProvinceData, computeLevelSizes, getProvinceName, getDeptTerm } from '../data/index'
import sound from '../utils/sound'
import fireworks from '../utils/fireworks'
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

function MapGame({ provinceKey, onBack, onRoundEnd }) {
  const [provinceData, setProvinceData] = useState(null)
  const [levelSizes, setLevelSizes] = useState([])
  const [roundDepts, setRoundDepts] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)
  const [departmentStates, setDepartmentStates] = useState({})
  const [revealedNames, setRevealedNames] = useState({})
  const [deptAttempts, setDeptAttempts] = useState({})
  const [showResult, setShowResult] = useState(false)
  const [roundTrophies, setRoundTrophies] = useState(0)
  const [scorePopup, setScorePopup] = useState(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [attemptsThisQuestion, setAttemptsThisQuestion] = useState(0)
  const [resultData, setResultData] = useState(null)
  const [levelIndex, setLevelIndex] = useState(0)
  const trophiesRef = useRef(0)
  const streakRef = useRef(0)
  const previousStreakRef = useRef(0)
  const mapRef = useRef(null)
  const provinceName = provinceData ? provinceData.name : getProvinceName(provinceKey)

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
    setDepartmentStates({})
    setRevealedNames({})
    setDeptAttempts({})
    setShowResult(false)
    setRoundTrophies(0)
    trophiesRef.current = 0
    setIsTransitioning(false)
    setAttemptsThisQuestion(0)
    setResultData(null)
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
    setDepartmentStates({})
    setRevealedNames({})
    setDeptAttempts({})
    setShowResult(false)
    setRoundTrophies(0)
    trophiesRef.current = 0
    setIsTransitioning(false)
    setAttemptsThisQuestion(0)
    setResultData(null)
  }, [provinceData, levelSizes])

  const getPointsForAttempt = (attempt) => {
    if (attempt === 0) return 10
    if (attempt === 1) return 5
    if (attempt === 2) return 2
    return 0
  }

  const spawnFireworks = (cx, cy) => {
    if (mapRef.current) {
      const rect = mapRef.current.getBoundingClientRect()
      const vbox = provinceData.viewBox.split(' ').map(Number)
      const screenX = rect.left + ((cx - vbox[0]) / vbox[2]) * rect.width
      const screenY = rect.top + ((cy - vbox[1]) / vbox[3]) * rect.height
      fireworks.burstAt(screenX, screenY)
    }
  }

  const handleDepartmentClick = (deptName) => {
    if (isTransitioning || showResult) return
    if (deptAttempts[deptName] !== undefined) return
    if (mapRef.current?.wasDragging) return

    const currentDept = roundDepts[currentIndex]
    if (!currentDept) return

    if (deptName === currentDept.name) {
      sound.playCorrect()
      setDeptAttempts(prev => ({ ...prev, [deptName]: attemptsThisQuestion }))
      setRevealedNames(prev => ({ ...prev, [deptName]: true }))

      const deptData = provinceData.departments.find(d => d.name === deptName)
      if (deptData) spawnFireworks(deptData.cx, deptData.cy)

      const newCorrect = correctCount + 1
      setCorrectCount(newCorrect)

      const points = getPointsForAttempt(attemptsThisQuestion)
      trophiesRef.current += points
      setRoundTrophies(trophiesRef.current)

      setScorePopup({ type: 'correct', text: deptName })

      setTimeout(() => {
        setScorePopup(null)
        moveToNext(newCorrect)
      }, 1100)
    } else {
      sound.playWrong()
      setDepartmentStates(prev => ({ ...prev, [deptName]: 'wrong' }))
      setWrongCount(prev => prev + 1)
      setAttemptsThisQuestion(prev => prev + 1)
      setScorePopup({ type: 'wrong', text: '¡Incorrecto!' })

      setTimeout(() => {
        setScorePopup(null)
        setDepartmentStates(prev => {
          const next = { ...prev }
          delete next[deptName]
          return next
        })
      }, 600)
    }
  }

  const moveToNext = (correct) => {
    if (currentIndex + 1 >= roundDepts.length) {
      finishRound(correct)
    } else {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1)
        setAttemptsThisQuestion(0)
        setIsTransitioning(false)
      }, 300)
    }
  }

  const finishRound = (correct) => {
    const total = roundDepts.length
    const levelMaxScore = total * 10
    const totalMaxScore = provinceData.departments.length * 10
    const score = trophiesRef.current
    const currentLevel = streakRef.current + 1
    const maxLevelIdx = levelSizes.length - 1
    const isMaxLevel = streakRef.current >= maxLevelIdx

    previousStreakRef.current = streakRef.current

    let levelResult = 'fail'
    if (score >= levelMaxScore * 0.8) {
      levelResult = 'pass'
      if (!isMaxLevel) {
        streakRef.current = streakRef.current + 1
      }
      fireworks.launchLoop()
      sound.playVictory()
    } else if (score >= levelMaxScore * 0.5) {
      levelResult = 'good'
    }

    setLevelIndex(streakRef.current)
    onRoundEnd('map', score, totalMaxScore)
    setResultData({ correct, total, maxScore: totalMaxScore, levelMaxScore, score, currentLevel, levelResult, isMaxLevel })
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

  const currentDept = roundDepts[currentIndex]
  const progress = roundDepts.length > 0 ? ((currentIndex) / roundDepts.length) * 100 : 0

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
            <span className="value">{showResult ? roundDepts.length : currentIndex + 1}/{roundDepts.length}</span>
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
          <>
            <div className="question-bar">
              <h2>Hacé click en: <span className="highlight">{currentDept.name}</span></h2>
            </div>
            <div className="progress-container">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <div className="progress-text">{currentIndex + 1} de {roundDepts.length} {getDeptTerm(provinceKey, true)}</div>
            </div>
          </>
        )}
        <div className={`game-round-area ${showResult ? 'with-results' : ''}`}>
          <ZoomableMap
            viewBox={provinceData.mainViewBox || provinceData.viewBox}
            containerRef={mapRef}
            offshorePips={provinceData.departments.filter(d => d.offshore).map(dept => ({
              name: dept.name,
              d: dept.path,
              vb: dept.insetViewBox,
              fill: deptAttempts[dept.name] !== undefined
                ? ATTEMPT_COLORS[Math.min(deptAttempts[dept.name], 2)]
                : departmentStates[dept.name] === 'wrong' ? '#FF1744' :
                '#3a3a5c'
            }))}
            onOffshoreClick={handleDepartmentClick}
          >
            {provinceData.departments.filter(d => !d.offshore).map((dept) => (
              <path
                key={dept.name}
                d={dept.path}
                fill={
                  deptAttempts[dept.name] !== undefined
                    ? ATTEMPT_COLORS[Math.min(deptAttempts[dept.name], 2)]
                    : departmentStates[dept.name] === 'wrong' ? '#FF1744' :
                    '#3a3a5c'
                }
                onClick={() => handleDepartmentClick(dept.name)}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {provinceData.departments.filter(d => !d.offshore && revealedNames[d.name]).map((dept) => (
              <text key={`label-${dept.name}`} x={dept.cx} y={dept.cy} className="dept-label" style={{ fontSize: '7px' }}>
                {dept.name.length > 16 ? dept.name.substring(0, 16) + '…' : dept.name}
              </text>
            ))}
          </ZoomableMap>

          {showResult && resultData && (
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
                      <p className="level-up-text" style={{ color: '#FFD700', fontSize: '1.2rem' }}>🌟 ¡Leyenda Supersónica! 🌟 Completaste todos los {getDeptTerm(provinceKey, true)} de {provinceName} con una puntuación perfecta.</p>
                    ) : (
                      <p className="level-up-text" style={{ color: '#6C63FF' }}>¡Completaste todos los niveles de {provinceName}! Sos un verdadero experto.</p>
                    )
                  })()}
                  {resultData.levelResult === 'good' && (
                    <p className="level-up-text" style={{ color: '#FFD600' }}>¡Muy bien! Pero podés mejorar, intentá de nuevo</p>
                  )}
                  {resultData.levelResult === 'fail' && (
                    <p className="level-up-text" style={{ color: '#FF6584' }}>No te preocupes, ¡practicando vas a mejorar!</p>
                  )}
                  <p className="score-text">{Object.values(deptAttempts).filter(v => v === 0).length} de {resultData.total} correctas en el primer intento</p>
                  <div className="trophies-earned">🏆 {resultData.score} de {resultData.levelMaxScore} puntos posibles</div>
                  {(() => {
                    const r = getRank(resultData.score, resultData.maxScore)
                    return r ? <p className="rank-text">{r.icon} Rango: {r.name}</p> : null
                  })()}
                  {Object.values(deptAttempts).some(v => v > 0) && (
                    <p className="review-text">Deberías repasar los {getDeptTerm(provinceKey, true)} que no están en verde!</p>
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
          )}
        </div>

        {scorePopup && <div className={`score-popup ${scorePopup.type}`}>{scorePopup.text}</div>}
      </div>
    </div>
  )
}

export default MapGame
