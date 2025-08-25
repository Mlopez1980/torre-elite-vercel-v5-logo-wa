import React, { useEffect, useMemo, useState } from 'react'

export default function App(){
  const [data, setData] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [nivelSelect, setNivelSelect] = useState('')
  const [habs, setHabs] = useState('')
  const [areaMin, setAreaMin] = useState('')
  const [areaMax, setAreaMax] = useState('')
  const [estado, setEstado] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [modal, setModal] = useState({open:false, id:'', src:'', zoom:1, x:0, y:0})

  useEffect(()=>{
    async function load(){
      const base = (import.meta.env.BASE_URL || '/')
      const candidates = [base + 'apartments.json', '/apartments.json', 'apartments.json']
      let lastErr = null
      for(const url of candidates){
        try {
          const res = await fetch(url, {cache:'no-cache'})
          if(!res.ok) { lastErr = new Error(`HTTP ${res.status} on ${url}`); continue }
          const json = await res.json()
          if(Array.isArray(json)){
            setData(json); setError(''); return
          } else {
            lastErr = new Error(`Formato invalido en ${url}`)
          }
        } catch(e){
          lastErr = e
        }
      }
      setError(lastErr ? String(lastErr) : 'No se pudo cargar apartments.json')
    }
    load()
  }, [])

  const niveles = useMemo(()=> Array.from(new Set(data.map(a=>a.nivel))).sort((a,b)=>a-b), [data])

  const items = useMemo(()=> data.filter(a=>{
    const q = search.trim().toLowerCase()
    if(q){
      const hay = (a.id + ' ' + (a.descripcion||'')).toLowerCase()
      if(!hay.includes(q)) return false
    }
    if(nivelSelect && String(a.nivel)!==String(nivelSelect)) return false
    if(selectedLevel && a.nivel !== selectedLevel) return false
    if(habs && String(a.habitaciones)!==String(habs)) return false
    const amin = parseFloat(areaMin)
    if(!Number.isNaN(amin) && a.area_m2 < amin) return false
    const amax = parseFloat(areaMax)
    if(!Number.isNaN(amax) && a.area_m2 > amax) return false
    if(estado==='disponible' && !a.disponible) return false
    if(estado==='reservado' && a.disponible) return false
    return true
  }), [data, search, nivelSelect, selectedLevel, habs, areaMin, areaMax, estado])

  function formatUSD(v){
    if (v === null || v === undefined || Number.isNaN(v)) return '—'
    try { return new Intl.NumberFormat('es-HN',{style:'currency',currency:'USD', minimumFractionDigits:2}).format(v) }
    catch { return `$${v}` }
  }

  function openPlano(a){
    const src = a.plano ? ('/' + a.plano) : ('/planos/' + a.id + '.png')
    setModal({open:true, id:a.id, src, zoom:1, x:0, y:0})
  }
  function closePlano(){ setModal(m=>({...m, open:false})) }
  function zoomIn(){ setModal(m=>({...m, zoom: Math.min(m.zoom+0.1,3)})) }
  function zoomOut(){ setModal(m=>({...m, zoom: Math.max(m.zoom-0.1,0.5)})) }

  function onPointerDown(e){
    const startX = e.clientX - modal.x, startY = e.clientY - modal.y
    function move(ev){ setModal(m=>({...m, x: ev.clientX - startX, y: ev.clientY - startY})) }
    function up(){ window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const [lastTap, setLastTap] = useState(0)
  function onClickImg(){
    const now = Date.now()
    if(now - lastTap < 300){ setModal(m=>({...m, zoom: m.zoom>=2?1:Math.min(m.zoom+0.5,3), x:0, y:0})) }
    setLastTap(now)
  }

  return (
    <>
      <div className="header"><div className="container"><div style={{display:"flex",alignItems:"center",gap:12}}><img src="/logo-honduras-constructores.png" alt="Honduras Constructores" style={{height:40}} /><h1 style={{margin:0}}>Torre Élite · Disponibilidad de apartamentos</h1></div></div></div>
      <div className="container">

        {/* Mensaje de error si no carga apartments.json */}
        {error && (
          <div className="card" style={{borderColor:'#fecaca', background:'#fff1f2'}}>
            <div>
              <div style={{fontWeight:700, marginBottom:6}}>No se pudieron cargar los datos</div>
              <div style={{color:'#6b7280', fontSize:14}}>{error}</div>
              <div style={{marginTop:8, fontSize:13}}>
                Verifica que el archivo <code>public/apartments.json</code> exista en tu repo. En Vercel, configura:
                <ul>
                  <li>Build: <code>npm run build</code></li>
                  <li>Output: <code>dist</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tabs de niveles */}
        <div className="level-tabs" role="tablist">
          <button className={'level-tab' + (selectedLevel==='' ? ' active' : '')} onClick={()=>setSelectedLevel('')} role="tab">Todos</button>
          {niveles.map(n => (
            <button key={n} className={'level-tab' + (String(selectedLevel)===String(n) ? ' active' : '')} onClick={()=>{setSelectedLevel(n); setNivelSelect('')}} role="tab">Nivel {n}</button>
          ))}
        </div>

        {/* Filtros */}
        <div className="card">
          <div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <span className="badge ok">Disponible (verde)</span>
              <span className="badge no blink">Reservado (rosado)</span>
            </div>
            <div className="filters">
              <input className="input" placeholder="Buscar por ID o descripción..." value={search} onChange={e=>setSearch(e.target.value)} />
              <select className="select" value={nivelSelect} onChange={e=>setNivelSelect(e.target.value)}>
                <option value="">Nivel</option>
                {niveles.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="select" value={habs} onChange={e=>setHabs(e.target.value)}>
                <option value="">Habitaciones</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
              <input className="input" type="number" step="0.001" placeholder="Área mín. m²" value={areaMin} onChange={e=>setAreaMin(e.target.value)} />
              <input className="input" type="number" step="0.001" placeholder="Área máx. m²" value={areaMax} onChange={e=>setAreaMax(e.target.value)} />
              <select className="select" value={estado} onChange={e=>setEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="disponible">Solo disponibles</option>
                <option value="reservado">Solo reservados</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <button className="button" onClick={()=>{setSearch('');setNivelSelect('');setHabs('');setAreaMin('');setAreaMax('');setEstado(''); setSelectedLevel('')}}>Limpiar</button>
          </div>
        </div>

        {/* Grid */}
        <div className="grid" style={{marginTop:14}}>
          {items.length ? items.map(a => {
            const reservado = !a.disponible
            return (
              <div key={a.id} className={`card ${reservado ? "reserved" : "available"}`} style={{opacity: reservado ? .95 : 1}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
                    <div className="title-tap" style={{fontWeight:700,fontSize:16}} onClick={()=>openPlano(a)}>{a.id}</div>
                    <span className={'badge '+(reservado ? 'no blink':'ok')}>{reservado?'Reservado':'Disponible'}</span>
                  </div>
                  <div style={{marginTop:8,display:'grid',gridTemplateColumns:'repeat(2, minmax(0,1fr))',gap:6,fontSize:14}}>
                    <div><strong>Nivel:</strong> {a.nivel}</div>
                    <div><strong>Habitaciones:</strong> {a.habitaciones}</div>
                    <div><strong>Área:</strong> {Number(a.area_m2).toFixed(2)} m²</div>
                    <div><strong>Precio:</strong> {formatUSD(a.precio_usd)}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center'}}>
                  {a.disponible ? (
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <button className="button" onClick={()=>openPlano(a)}>Ver plano</button>
                     <a
  className="button"
  href={`https://wa.me/50492513691?text=${encodeURIComponent(`Hola, me interesa el apartamento ${a.id} de Torre Élite`)}`}
  target="_blank"
  rel="noopener"
>
  Quiero este
</a>

                    </div>
                  ) : null}
                </div>
              </div>
            )
          }) : !error && <div style={{opacity:.7}}>No hay resultados con esos filtros.</div>}
        </div>

        <div className="footer">© Torre Élite — Datos reales. Reemplaza /planos/ con tus imágenes.</div>
      </div>

      {/* Modal planos */}
      <div className={'modal'+(modal.open?' open':'')} aria-hidden={!modal.open}>
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="planoTitulo">
          <div className="modal-head">
            <div id="planoTitulo" className="modal-title">Plano · {modal.id}</div>
            <div style={{display:'flex',gap:8}}>
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
                style={{ transform:`translate(${modal.x}px, ${modal.y}px) scale(${modal.zoom})` }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
