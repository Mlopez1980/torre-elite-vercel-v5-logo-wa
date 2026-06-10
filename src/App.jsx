import React, { useEffect, useMemo, useState } from 'react'

const STATUS_CONFIG = {
  disponible: {
    label: 'Disponible',
    cardBg: '#ecfdf5',
    cardBorder: '#22c55e',
    badgeBg: '#22c55e',
    badgeText: '#ffffff',
    showBlink: false,
  },
  reservado: {
    label: 'Reservado',
    cardBg: '#fdf2f8',
    cardBorder: '#f472b6',
    badgeBg: '#f472b6',
    badgeText: '#ffffff',
    showBlink: true,
  },
  entregado: {
    label: 'Entregado',
    cardBg: '#f8fafc',
    cardBorder: '#64748b',
    badgeBg: '#64748b',
    badgeText: '#ffffff',
    showBlink: false,
  },
  consulta_disponibilidad: {
    label: 'En proceso de reserva',
    cardBg: '#fffbeb',
    cardBorder: '#f59e0b',
    badgeBg: '#f59e0b',
    badgeText: '#111827',
    showBlink: false,
  },
}

function normalizeStatus(apartment) {
  const raw = apartment?.estado ?? apartment?.status ?? apartment?.estado_comercial

  if (typeof raw === 'string' && raw.trim()) {
    const normalized = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_')

    if (normalized === 'disponible') return 'disponible'
    if (normalized === 'reservado') return 'reservado'
    if (normalized === 'entregado') return 'entregado'
    if (normalized === 'consulta_disponibilidad') return 'consulta_disponibilidad'
    if (normalized === 'consulta') return 'consulta_disponibilidad'
  }

  return apartment?.disponible ? 'disponible' : 'reservado'
}

export default function App() {
  const [data, setData] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [nivelSelect, setNivelSelect] = useState('')
  const [habs, setHabs] = useState('')
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [estado, setEstado] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [modal, setModal] = useState({ open: false, id: '', src: '', zoom: 1, x: 0, y: 0 })
  const [lastTap, setLastTap] = useState(0)

  useEffect(() => {
    async function load() {
      const base = import.meta.env.BASE_URL || '/'
      const candidates = [base + 'apartments.json', '/apartments.json', 'apartments.json']
      let lastErr = null

      for (const url of candidates) {
        try {
          const res = await fetch(url, { cache: 'no-cache' })

          if (!res.ok) {
            lastErr = new Error(`HTTP ${res.status} on ${url}`)
            continue
          }

          const json = await res.json()

          if (Array.isArray(json)) {
            setData(json)
            setError('')
            return
          } else {
            lastErr = new Error(`Formato invalido en ${url}`)
          }
        } catch (e) {
          lastErr = e
        }
      }

      setError(lastErr ? String(lastErr) : 'No se pudo cargar apartments.json')
    }

    load()
  }, [])

  const niveles = useMemo(
    () => Array.from(new Set(data.map(a => a.nivel))).sort((a, b) => a - b),
    [data]
  )

  const items = useMemo(() => data.filter(a => {
    const q = search.trim().toLowerCase()
    const statusKey = normalizeStatus(a)

    if (q) {
      const hay = (a.id + ' ' + (a.descripcion || '')).toLowerCase()
      if (!hay.includes(q)) return false
    }

    if (nivelSelect && String(a.nivel) !== String(nivelSelect)) return false
    if (selectedLevel && String(a.nivel) !== String(selectedLevel)) return false
    if (habs && String(a.habitaciones) !== String(habs)) return false

    const amin = parseFloat(areaMin)
    if (!Number.isNaN(amin) && a.area_m2 < amin) return false

    const amax = parseFloat(areaMax)
    if (!Number.isNaN(amax) && a.area_m2 > amax) return false

    if (estado && statusKey !== estado) return false

    return true
  }), [data, search, nivelSelect, selectedLevel, habs, areaMin, areaMax, estado])

  function formatUSD(v) {
    if (v === null || v === undefined || Number.isNaN(v)) return '—'

    try {
      return new Intl.NumberFormat('es-HN', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(v)
    } catch {
      return `$${v}`
    }
  }

  function openPlano(a) {
    const src = a.plano ? ('/' + a.plano) : ('/planos/' + a.id + '.png')
    setModal({ open: true, id: a.id, src, zoom: 1, x: 0, y: 0 })
  }

  function closePlano() {
    setModal(m => ({ ...m, open: false }))
  }

  function zoomIn() {
    setModal(m => ({ ...m, zoom: Math.min(m.zoom + 0.1, 3) }))
  }

  function zoomOut() {
    setModal(m => ({ ...m, zoom: Math.max(m.zoom - 0.1, 0.5) }))
  }

  function onPointerDown(e) {
    const startX = e.clientX - modal.x
    const startY = e.clientY - modal.y

    function move(ev) {
      setModal(m => ({
        ...m,
        x: ev.clientX - startX,
        y: ev.clientY - startY
      }))
    }

    function up() {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  function onClickImg() {
    const now = Date.now()

    if (now - lastTap < 300) {
      setModal(m => ({
        ...m,
        zoom: m.zoom >= 2 ? 1 : Math.min(m.zoom + 0.5, 3),
        x: 0,
        y: 0
      }))
    }

    setLastTap(now)
  }

  return (
    <>
      <style>{`
        .te-apartment-card {
          border-radius: 18px;
          padding: 18px;
          min-height: 180px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
        }

        .te-apartment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .te-apartment-id {
          font-weight: 800;
          font-size: 18px;
          text-decoration: underline;
          cursor: pointer;
        }

        .te-apartment-details {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px 16px;
          font-size: 15px;
          line-height: 1.2;
        }

        .te-detail-label {
          display: block;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .te-price-box {
          margin-top: 14px;
          padding-top: 10px;
          border-top: 1px solid rgba(15, 23, 42, 0.12);
          font-size: 16px;
          line-height: 1.25;
        }

        .te-price-label {
          font-weight: 800;
          margin-right: 6px;
        }

        .te-price-value {
          white-space: nowrap;
          font-weight: 500;
        }

        .te-apartment-actions {
          margin-top: 16px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .te-apartment-actions .button {
          white-space: nowrap;
        }

        .te-consulta-note {
          margin-top: 10px;
          font-size: 13px;
          color: #92400e;
          line-height: 1.35;
        }

        @media (max-width: 900px) {
          .te-apartment-details {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .te-apartment-card {
            min-height: auto;
          }

          .te-apartment-details {
            grid-template-columns: 1fr;
          }

          .te-apartment-actions {
            justify-content: flex-start;
          }

          .te-price-value {
            white-space: normal;
          }
        }
      `}</style>

      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img
              src="/logo-honduras-constructores.png"
              alt="Honduras Constructores"
              style={{ height: 40 }}
            />
            <h1 style={{ margin: 0 }}>Torre Élite · Disponibilidad de apartamentos</h1>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="card" style={{ borderColor: '#fecaca', background: '#fff1f2' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>No se pudieron cargar los datos</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>{error}</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Verifica que el archivo <code>public/apartments.json</code> exista en tu repo. En Vercel, configura:
                <ul>
                  <li>Build: <code>npm run build</code></li>
                  <li>Output: <code>dist</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}
<div className="te-availability-banner">
  <div>
    <div className="te-banner-kicker">
      Disponibilidad limitada
    </div>

    <h2 className="te-banner-title">
      Torre Élite cuenta con solo 32 apartamentos.
    </h2>

    <p className="te-banner-text">
      Las unidades disponibles pueden cambiar según reservas en proceso.
      Seleccioná el apartamento de tu interés y consultá disponibilidad actual con un asesor.
    </p>
  </div>

  <div className="te-banner-summary">
    <span className="te-banner-pill">Últimas unidades disponibles</span>
    <span className="te-banner-pill">Visitas con cita previa</span>
    <span className="te-banner-pill">Precios sujetos a confirmación</span>
  </div>
</div>
        <div className="level-tabs" role="tablist">
          <button
            className={'level-tab' + (selectedLevel === '' ? ' active' : '')}
            onClick={() => setSelectedLevel('')}
            role="tab"
          >
            Todos
          </button>

          {niveles.map(n => (
            <button
              key={n}
              className={'level-tab' + (String(selectedLevel) === String(n) ? ' active' : '')}
              onClick={() => {
                setSelectedLevel(n)
                setNivelSelect('')
              }}
              role="tab"
            >
              Nivel {n}
            </button>
          ))}
        </div>

        <div className="card">
          <div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <span
                  key={key}
                  className={'badge' + (cfg.showBlink ? ' blink' : '')}
                  style={{
                    background: cfg.badgeBg,
                    color: cfg.badgeText,
                    border: `1px solid ${cfg.badgeBg}`
                  }}
                >
                  {cfg.label}
                </span>
              ))}
            </div>

            <div className="filters">
              <input
                className="input"
                placeholder="Buscar por ID o descripción..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              <select
                className="select"
                value={nivelSelect}
                onChange={e => setNivelSelect(e.target.value)}
              >
                <option value="">Nivel</option>
                {niveles.map(n => <option key={n} value={n}>{n}</option>)}
              </select>

              <select
                className="select"
                value={habs}
                onChange={e => setHabs(e.target.value)}
              >
                <option value="">Habitaciones</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>

              <input
                className="input"
                type="number"
                step="0.001"
                placeholder="Área mín. m²"
                value={areaMin}
                onChange={e => setAreaMin(e.target.value)}
              />

              <input
                className="input"
                type="number"
                step="0.001"
                placeholder="Área máx. m²"
                value={areaMax}
                onChange={e => setAreaMax(e.target.value)}
              />

              <select
                className="select"
                value={estado}
                onChange={e => setEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="disponible">Solo disponibles</option>
                <option value="consulta_disponibilidad">Solo consulta disponibilidad</option>
                <option value="reservado">Solo reservados</option>
                <option value="entregado">Solo entregados</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="button"
              onClick={() => {
                setSearch('')
                setNivelSelect('')
                setHabs('')
                setAreaMin('')
                setAreaMax('')
                setEstado('')
                setSelectedLevel('')
              }}
            >
              Limpiar
            </button>
          </div>
        </div>

        <div className="grid" style={{ marginTop: 14 }}>
          {items.length ? items.map(a => {
            const statusKey = normalizeStatus(a)
            const status = STATUS_CONFIG[statusKey]
            const canInquire =
              statusKey === 'disponible' || statusKey === 'consulta_disponibilidad'

            const whatsappText =
              statusKey === 'consulta_disponibilidad'
                ? `Hola, me interesa consultar la disponibilidad actual del apartamento ${a.id}`
                : `Hola, me interesa el apartamento ${a.id}`
const commercialTags = []

if (
  statusKey === 'disponible' &&
  Number(a.nivel) === 5 &&
  Number(a.habitaciones) === 1
) {
  commercialTags.push('Último 1 hab. en nivel alto')
  commercialTags.push('Vista superior')
}
  const highlightedInvestmentUnits = ['1E', '2E']

const isHighlightedInvestmentUnit =
  statusKey === 'disponible' &&
  highlightedInvestmentUnits.includes(String(a.id).toUpperCase())

if (isHighlightedInvestmentUnit) {
  commercialTags.push('Relación área/precio destacada')
  commercialTags.push('Ideal para inversión')
}  
  return (
              <div
                key={a.id}
                className="te-apartment-card"
                style={{
                  background: status.cardBg,
                  border: `1px solid ${status.cardBorder}`,
                  opacity: 1
                }}
              >
                <div>
                  <div className="te-apartment-header">
                    <div
                      className="te-apartment-id title-tap"
                      onClick={() => openPlano(a)}
                    >
                      {a.id}
                    </div>

                    <span
                      className={'badge' + (status.showBlink ? ' blink' : '')}
                      style={{
                        background: status.badgeBg,
                        color: status.badgeText,
                        border: `1px solid ${status.badgeBg}`,
                        flexShrink: 0
                      }}
                    >
                      {status.label}
                    </span>
                  </div>

                  <div className="te-apartment-details">
                    <div>
                      <span className="te-detail-label">Nivel:</span>
                      <span>{a.nivel}</span>
                    </div>

                    <div>
                      <span className="te-detail-label">Habitaciones:</span>
                      <span>{a.habitaciones}</span>
                    </div>

                    <div>
                      <span className="te-detail-label">Área:</span>
                      <span>{Number(a.area_m2).toFixed(2)} m²</span>
                    </div>
                  </div>

                  <div className="te-price-box">
  <div>
    <span className="te-price-label">Precio:</span>
    <span className="te-price-value">{formatUSD(a.precio_usd)}</span>
  </div>

  {isHighlightedInvestmentUnit && a.precio_usd && a.area_m2 && (
    <div style={{ marginTop: 6, fontSize: 13, color: '#4b5563' }}>
      Referencia: {formatUSD(a.precio_usd / a.area_m2)} / m² aprox.
    </div>
  )}
</div>
{commercialTags.length > 0 && (
  <div className="te-commercial-tags">
    {commercialTags.map((tag, index) => (
      <span
        key={tag}
        className={`te-commercial-tag ${index === 0 ? 'dark' : 'gold'}`}
      >
        {tag}
      </span>
    ))}
  </div>
)}
                  
                  
                  {statusKey === 'consulta_disponibilidad' && (
                    <div className="te-consulta-note">
                      Unidad con reserva en seguimiento. Consulte disponibilidad actual.
                    </div>
                  )}
                </div>

                <div className="te-apartment-actions">
                  {canInquire ? (
                    <>
                      <button className="button" onClick={() => openPlano(a)}>
                        Ver plano
                      </button>

                      <a
                        className="button"
                        href={`https://wa.me/50492513691?text=${encodeURIComponent(whatsappText)}`}
                        target="_blank"
                        rel="noopener"
                      >
                        {statusKey === 'consulta_disponibilidad' ? 'Consultar' : 'Quiero este'}
                      </a>
                    </>
                  ) : (
                    <button className="button" onClick={() => openPlano(a)}>
                      Ver plano
                    </button>
                  )}
                </div>
              </div>
            )
          }) : !error && (
            <div style={{ opacity: .7 }}>No hay resultados con esos filtros.</div>
          )}
        </div>

        <div className="footer">© Torre Élite — Datos reales. Reemplaza /planos/ con tus imágenes.</div>
      </div>

      <div className={'modal' + (modal.open ? ' open' : '')} aria-hidden={!modal.open}>
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="planoTitulo">
          <div className="modal-head">
            <div id="planoTitulo" className="modal-title">Plano · {modal.id}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="iconbtn" title="Acercar" onClick={zoomIn}>＋</button>
              <button className="iconbtn" title="Alejar" onClick={zoomOut}>－</button>
              <button className="iconbtn" title="Cerrar" onClick={closePlano}>✕</button>
            </div>
          </div>

          <div className="modal-body">
            {modal.open && (
              <img
                src={modal.src}
                alt="Plano del apartamento"
                onPointerDown={onPointerDown}
                onClick={onClickImg}
                style={{ transform: `translate(${modal.x}px, ${modal.y}px) scale(${modal.zoom})` }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
