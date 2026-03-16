'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

type Turno = {
  id: string
  nombre_cliente: string
  telefono_cliente: string
  servicio: string
  fecha_hora: string
}

export default function AdminPage() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [password, setPassword] = useState('')
  const [autorizado, setAutorizado] = useState(false)
  const [turnoAEliminar, setTurnoAEliminar] = useState<Turno | null>(null)
  const [historialALimpiar, setHistorialALimpiar] = useState(false)
  const [bloqueoFecha, setBloqueoFecha] = useState('')
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFin, setHoraFin] = useState('12:00')
  const [cargandoBloqueo, setCargandoBloqueo] = useState(false)

  const esBloqueado = (turno: Pick<Turno, 'nombre_cliente'>) => turno.nombre_cliente.includes('BLOQUEADO')

  const login = () => {
    if (password === '1234') setAutorizado(true)
    else toast.error('PIN Incorrecto')
  }

  const consultarTurnos = async () => {
    const ahora = new Date().toISOString()
    const { data } = await supabase
      .from('turnos')
      .select('*')
      .gte('fecha_hora', ahora)
      .order('fecha_hora', { ascending: true })
    setTurnos((data as Turno[]) || [])
  }

  useEffect(() => {
    if (autorizado) {
      consultarTurnos()
      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'turnos' }, () => consultarTurnos())
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    }
  }, [autorizado])

  const borrarTurno = async () => {
    if (!turnoAEliminar) return
    const { error } = await supabase.from('turnos').delete().eq('id', turnoAEliminar.id)
    if (error) toast.error('No se pudo eliminar')
    else {
      toast.success('Eliminado correctamente')
      consultarTurnos()
    }
    setTurnoAEliminar(null)
  }

  const limpiarTurnosViejos = async () => {
    const ahora = new Date().toISOString()
    const { error } = await supabase.from('turnos').delete().lt('fecha_hora', ahora)
    if (error) toast.error('No se pudo limpiar')
    else {
      toast.success('Historial limpio')
      consultarTurnos()
    }
    setHistorialALimpiar(false)
  }

  const bloquearRangoHorario = async () => {
    if (!bloqueoFecha) return toast.error('Elegí fecha')
    setCargandoBloqueo(true)
    const bloqueos = []
    const [hI, mI] = horaInicio.split(':').map(Number)
    const [hF, mF] = horaFin.split(':').map(Number)
    let actual = hI * 60 + mI
    const fin = hF * 60 + mF

    while (actual < fin) {
      const h = Math.floor(actual / 60).toString().padStart(2, '0')
      const m = (actual % 60).toString().padStart(2, '0')
      bloqueos.push({
        nombre_cliente: '🚫 BLOQUEADO',
        telefono_cliente: '0',
        servicio: 'MANUAL',
        fecha_hora: `${bloqueoFecha}T${h}:${m}:00-03:00`
      })
      actual += 40
    }

    const { error } = await supabase.from('turnos').insert(bloqueos)
    if (error) toast.error('Error al bloquear')
    else {
      toast.success('Horarios bloqueados')
      setBloqueoFecha('')
      consultarTurnos()
    }
    setCargandoBloqueo(false)
  }

  if (!autorizado) {
    return (
      <div className="studio-shell min-h-screen flex flex-col items-center justify-center p-6">
        <h1 className="studio-title mb-8 text-2xl font-black italic tracking-widest text-center">Admin Access</h1>
        <div className="studio-panel w-full max-w-sm p-10">
          <span className="studio-border" />
          <input type="password" placeholder="PIN" className="studio-input text-center text-3xl font-black"
            value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
          <button onClick={login} className="w-full mt-6 py-4 rounded-full bg-[#111111] text-white font-black uppercase text-xs tracking-widest hover:bg-[#222222] transition-all">
            Entrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="studio-shell min-h-screen pb-20">
      <div className="mx-auto max-w-5xl px-4 pt-10 space-y-8">
        <section className="studio-panel p-8">
          <span className="studio-border" />
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="studio-title text-3xl font-black italic">Gestión</h1>
              <p className="tiny-label mt-1">Panel Profesional</p>
            </div>
            <button onClick={() => setHistorialALimpiar(true)} className="studio-button btn-delete px-6 py-3 text-[10px] font-black uppercase">
              Limpiar Historial
            </button>
          </div>
        </section>

        <section className="studio-panel p-8">
          <span className="studio-border" />
          <h2 className="tiny-label mb-6 tracking-widest">Bloqueo por Rango</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <input type="date" className="studio-input" value={bloqueoFecha} onChange={e => setBloqueoFecha(e.target.value)} />
            <input type="time" className="studio-input" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} />
            <input type="time" className="studio-input" value={horaFin} onChange={e => setHoraFin(e.target.value)} />
            <button onClick={bloquearRangoHorario} disabled={cargandoBloqueo} className="studio-button py-4 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
              {cargandoBloqueo ? '...' : 'Bloquear'}
            </button>
          </div>
        </section>

        <div className="space-y-4">
          <h2 className="studio-title text-sm px-2 opacity-50">Próximas Citas</h2>
          <AnimatePresence mode="popLayout">
            {turnos.map((turno) => {
              const f = new Date(turno.fecha_hora)
              const bloqueado = esBloqueado(turno)
              
              return (
                <motion.div layout key={turno.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={`studio-panel p-6 ${bloqueado ? 'opacity-50' : ''}`}>
                  <span className="studio-border" />
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                      {/* RECUADRO DE FECHA: Invertido (Fondo variable acento, Texto variable superficie) */}
                      <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center border border-current/10 bg-[var(--accent-main)] text-[var(--bg-surface)]">
                        <span className="text-[11px] font-black">{f.getDate()}</span>
                        <span className="text-[8px] uppercase font-black">{f.toLocaleDateString('es-AR', { month: 'short' })}</span>
                      </div>
                      <div>
                        <h3 className="font-black text-xl tracking-tight uppercase">{turno.nombre_cliente}</h3>
                        <p className="tiny-label text-blue-500 font-bold">{f.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })} HS</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 w-full sm:w-auto">
                      {!bloqueado && (
                        <a href={`https://wa.me/${turno.telefono_cliente.replace(/\D/g, '')}`} target="_blank" 
                           className="studio-button btn-whatsapp flex-1 sm:flex-none p-3 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.886-.59-.446-.985-1.001-1.1-1.198-.112-.197-.012-.304.086-.403.089-.089.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                          </svg>
                        </a>
                      )}
                      <button onClick={() => setTurnoAEliminar(turno)} 
                              className="studio-button btn-delete flex-1 sm:flex-none px-5 py-3 text-[10px] font-black rounded-full uppercase">
                        {bloqueado ? 'Liberar' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {turnoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="studio-panel max-w-sm p-10 text-center shadow-2xl">
              <span className="studio-border" />
              <h3 className="studio-title text-base font-black italic">¿Confirmar Acción?</h3>
              <p className="text-[10px] opacity-50 mt-4 tracking-widest uppercase">Esta acción es permanente</p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setTurnoAEliminar(null)} className="studio-button secondary flex-1 py-4 text-[10px] font-black">CANCELAR</button>
                <button onClick={borrarTurno} className="studio-button btn-delete flex-1 py-4 text-[10px] font-black">ELIMINAR</button>
              </div>
            </motion.div>
          </div>
        )}
        {historialALimpiar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="studio-panel max-w-sm p-10 text-center shadow-2xl">
              <span className="studio-border" />
              <h3 className="studio-title text-base font-black italic">Limpiar Historial</h3>
              <p className="text-[11px] opacity-60 mt-4 tracking-widest uppercase">¿Eliminar todos los turnos pasados?<br/><span className="text-[10px] opacity-40">Esta acción no se puede deshacer</span></p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setHistorialALimpiar(false)} className="studio-button secondary flex-1 py-4 text-[10px] font-black">CANCELAR</button>
                <button onClick={limpiarTurnosViejos} className="studio-button btn-delete flex-1 py-4 text-[10px] font-black">LIMPIAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}