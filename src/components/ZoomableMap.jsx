import { useState, useRef, useCallback, useEffect } from 'react'

const MIN_ZOOM = 1
const MAX_ZOOM = 15
const ZOOM_STEP = 0.15

function parseViewBox(vb) {
  const parts = vb.split(' ').map(Number)
  return { vx: parts[0], vy: parts[1], vw: parts[2], vh: parts[3] }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function ZoomableMap({ children, viewBox: baseViewBox, className = '', style = {}, containerRef: externalRef, offshorePips, onOffshoreClick }) {
  const base = useRef(parseViewBox(baseViewBox))
  const [viewBox, setViewBox] = useState(baseViewBox)
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [dragStart, setDragStart] = useState(null)
  const [panStartVB, setPanStartVB] = useState(null)
  const internalRef = useRef(null)
  const containerRef = externalRef || internalRef
  const currentVBRef = useRef(parseViewBox(baseViewBox))

  const updateZoomFromVB = useCallback((vb) => {
    setZoom(base.current.vw / vb.vw)
  }, [])

  const clampVB = useCallback((vb) => {
    const b = base.current
    const clamped = { ...vb }
    if (clamped.vw < b.vw / MAX_ZOOM) clamped.vw = b.vw / MAX_ZOOM
    if (clamped.vh < b.vh / MAX_ZOOM) clamped.vh = b.vh / MAX_ZOOM
    if (clamped.vw > b.vw) { clamped.vw = b.vw; clamped.vx = b.vx }
    if (clamped.vh > b.vh) { clamped.vh = b.vh; clamped.vy = b.vy }
    return clamped
  }, [])

  const applyVB = useCallback((vb) => {
    const clamped = clampVB(vb)
    currentVBRef.current = clamped
    updateZoomFromVB(clamped)
    setViewBox(`${clamped.vx} ${clamped.vy} ${clamped.vw} ${clamped.vh}`)
  }, [clampVB, updateZoomFromVB])

  const resetView = useCallback(() => {
    const b = base.current
    currentVBRef.current = b
    setZoom(1)
    setViewBox(baseViewBox)
  }, [baseViewBox])

  const zoomAtPoint = useCallback((clientX, clientY, newZoom) => {
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const cur = currentVBRef.current

    const svgX = cur.vx + ((clientX - rect.left) / rect.width) * cur.vw
    const svgY = cur.vy + ((clientY - rect.top) / rect.height) * cur.vh

    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
    const newVw = base.current.vw / clampedZoom
    const newVh = base.current.vh / clampedZoom
    const newVx = svgX - ((clientX - rect.left) / rect.width) * newVw
    const newVy = svgY - ((clientY - rect.top) / rect.height) * newVh

    applyVB({ vx: newVx, vy: newVy, vw: newVw, vh: newVh })
  }, [containerRef, applyVB])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const cur = currentVBRef.current
    const curZoom = base.current.vw / cur.vw
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP
    zoomAtPoint(e.clientX, e.clientY, curZoom + delta)
  }, [zoomAtPoint])

  const [touchState, setTouchState] = useState(null)

  const handleTouchStart = useCallback((e) => {
    if (containerRef.current) containerRef.current.wasDragging = false
    if (e.touches.length === 1) {
      const t = e.touches[0]
      setTouchState({ type: 'pan', startX: t.clientX, startY: t.clientY, panStartVB: { ...currentVBRef.current } })
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      setTouchState({
        type: 'pinch',
        startDist: distance(t1, t2),
        startZoom: base.current.vw / currentVBRef.current.vw,
        midX: (t1.clientX + t2.clientX) / 2,
        midY: (t1.clientY + t2.clientY) / 2,
      })
    }
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!touchState) return
    e.preventDefault()
    if (touchState.type === 'pan' && e.touches.length === 1) {
      const t = e.touches[0]
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const ps = touchState.panStartVB
      const dx = t.clientX - touchState.startX
      const dy = t.clientY - touchState.startY
      const newVx = ps.vx - (dx / rect.width) * ps.vw
      const newVy = ps.vy - (dy / rect.height) * ps.vh
      applyVB({ ...ps, vx: newVx, vy: newVy })
    } else if (touchState.type === 'pinch' && e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1]
      const newDist = distance(t1, t2)
      const ratio = newDist / touchState.startDist
      const newZoom = touchState.startZoom * ratio
      const midX = (t1.clientX + t2.clientX) / 2
      const midY = (t1.clientY + t2.clientY) / 2
      zoomAtPoint(midX, midY, newZoom)
    }
  }, [touchState, containerRef, applyVB, zoomAtPoint])

  const handleTouchEnd = useCallback(() => {
    setTouchState(null)
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button === 0 || e.button === 1) {
      if (containerRef.current) containerRef.current.wasDragging = false
      setIsPanning(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setPanStartVB({ ...currentVBRef.current })
    }
  }, [containerRef])

  const handleMouseMove = useCallback((e) => {
    if (!isPanning || !dragStart || !panStartVB) return
    const dx = e.clientX - dragStart.x
    const dy = e.clientY - dragStart.y
    if (Math.hypot(dx, dy) > 5 && containerRef.current) {
      containerRef.current.wasDragging = true
    }
    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newVx = panStartVB.vx - (dx / rect.width) * panStartVB.vw
    const newVy = panStartVB.vy - (dy / rect.height) * panStartVB.vh
    applyVB({ ...panStartVB, vx: newVx, vy: newVy })
  }, [isPanning, dragStart, panStartVB, containerRef, applyVB])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDragStart(null)
    setPanStartVB(null)
  }, [])

  useEffect(() => {
    if (!isPanning) return
    const handleUp = () => {
      setIsPanning(false)
      setDragStart(null)
      setPanStartVB(null)
    }
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('blur', handleUp)
    return () => {
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('blur', handleUp)
    }
  }, [isPanning])

  const isZoomed = zoom > 1

  return (
    <div className={`zoomable-map ${className}`} style={style}>
      <div
        ref={containerRef}
        className="zoomable-map-viewport"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isPanning ? 'grabbing' : isZoomed ? 'grab' : 'default' }}
      >
        <svg
          className="zoomable-map-svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {children}
        </svg>
      </div>
      {offshorePips && offshorePips.length > 0 && (
        <div className="zoomable-map-pips">
          {offshorePips.map(({ name, d, vb, fill }) => {
            if (!vb) return null
            return (
              <div key={name} className="zoomable-map-pip" onClick={() => {
                if (containerRef.current) containerRef.current.wasDragging = false
                onOffshoreClick?.(name)
              }}>
                <svg
                  className="zoomable-map-inset-svg"
                  viewBox={vb}
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d={d} fill={fill || '#3a3a5c'} stroke="#1a1a2e" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              </div>
            )
          })}
        </div>
      )}
      {isZoomed && (
        <button className="zoomable-map-reset" onClick={resetView} title="Restaurar zoom">
          ✕
        </button>
      )}
      <div className="zoomable-map-controls">
        <button className="zoom-btn" onClick={() => {
          const cur = currentVBRef.current
          const curZoom = base.current.vw / cur.vw
          zoomAtPoint(0, 0, curZoom + ZOOM_STEP * 2)
        }} title="Acercar">+</button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => {
          const cur = currentVBRef.current
          const curZoom = base.current.vw / cur.vw
          zoomAtPoint(0, 0, curZoom - ZOOM_STEP * 2)
        }} title="Alejar" disabled={zoom <= MIN_ZOOM}>−</button>
      </div>
    </div>
  )
}

export default ZoomableMap
