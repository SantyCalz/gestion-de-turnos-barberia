'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

type TurnoEncontrado = {
  fecha_hora: string
  nombre_cliente: string
}

export default function HomePage() {
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [fecha, setFecha] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [turnosOcupados, setTurnosOcupados] = useState<string[]>([])
  const [enviado, setEnviado] = useState(false)
  const [busquedaTel, setBusquedaTel] = useState('')
  const [turnoEncontrado, setTurnoEncontrado] = useState<TurnoEncontrado | null>(null)
  const [turnoAEliminar, setTurnoAEliminar] = useState<TurnoEncontrado | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // ... (Lógica de horarios y useEffect igual a la anterior)
  const esHorarioPasado = (fechaIso: string, hora: string) => {
    const ahora = new Date()
    const [anio, mes, dia] = fechaIso.split('-').map(Number)
    const hoy = ahora.getFullYear() === anio && ahora.getMonth() + 1 === mes && ahora.getDate() === dia
    if (!hoy) return false
    const [h, m] = hora.split(':').map(Number)
    return (h * 60 + m) <= (ahora.getHours() * 60 + ahora.getMinutes())
  }

  const generarHorarios = () => {
    const horarios = []
    const franjas = [{ inicio: 8, fin: 12, mf: 0 }, { inicio: 16, fin: 20, mf: 40 }]
    franjas.forEach(f => {
      let act = f.inicio * 60
      while (act <= (f.fin * 60 + f.mf)) {
        horarios.push(`${Math.floor(act/60).toString().padStart(2,'0')}:${(act%60).toString().padStart(2,'0')}`)
        act += 40
      }
    })
    return horarios
  }

  useEffect(() => {
    if (!fecha) return
    const cargar = async () => {
      const { data } = await supabase.from('turnos').select('fecha_hora')
        .gte('fecha_hora', `${fecha}T00:00:00-03:00`).lte('fecha_hora', `${fecha}T23:59:59-03:00`)
      const h = (data || []).map(t => new Date(t.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' }))
      setTurnosOcupados(h)
    }
    cargar()
  }, [fecha])

  const consultarMiTurno = async () => {
    if (!busquedaTel) return toast.error('Ingresá tu WhatsApp')
    const { data } = await supabase.from('turnos').select('*')
      .ilike('telefono_cliente', `%${busquedaTel.replace(/\D/g, '')}%`)
      .gte('fecha_hora', new Date().toISOString()).order('fecha_hora', { ascending: true }).limit(1)
    if (data?.length) {
      setTurnoEncontrado(data[0] as TurnoEncontrado)
      toast.success('¡Turno encontrado!')
    } else toast.error('No hay turnos pendientes')
  }

  const guardarTurno = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!horaSeleccionada) return toast.error('Seleccioná un horario')
    const fFinal = `${fecha}T${horaSeleccionada}:00-03:00`
    const { data: oc } = await supabase.from('turnos').select('id').eq('fecha_hora', fFinal).maybeSingle()
    if (oc) return toast.error('Horario ocupado')

    const { error } = await supabase.from('turnos').insert([{ 
      nombre_cliente: nombre, 
      telefono_cliente: telefono.startsWith('+') ? telefono : `+549${telefono.replace(/\s/g, '')}`,
      servicio: 'Barbería', 
      fecha_hora: fFinal 
    }])
    if (!error) { setEnviado(true); toast.success('Cita agendada') }
    else toast.error('Error al agendar')
  }

  const cancelarTurno = async () => {
    if (!turnoAEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('turnos').delete().eq('fecha_hora', turnoAEliminar.fecha_hora)
    if (error) toast.error('No se pudo cancelar')
    else {
      toast.success('Turno cancelado')
      setTurnoEncontrado(null)
      setTurnoAEliminar(null)
    }
    setEliminando(false)
  }

  if (enviado) {
    return (
      <main className="studio-shell min-h-screen flex items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="studio-panel p-10 max-w-sm">
          <span className="studio-border" />
          <div className="text-6xl mb-6">✂️</div>
          <h2 className="studio-title text-2xl font-black">¡LISTO!</h2>
          <p className="mt-4 text-sm opacity-60 uppercase tracking-widest">Te esperamos en el Studio</p>
          <button onClick={() => window.location.reload()} 
            className="w-full py-4 text-xs rounded-full font-black tracking-widest bg-[#111111] text-white hover:bg-[#222222] transition-all">
            VOLVER
          </button>
        </motion.div>
      </main>
    )
  }

  return (
    <main className="studio-shell min-h-screen px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto w-full max-w-lg space-y-8">
        <header className="text-center">
          <h1 className="studio-title text-4xl font-black tracking-[0.2em] italic">Reserva tu Turno</h1>
          <div className="h-1 w-12 bg-current mx-auto mt-2 opacity-20 rounded-full" />
        </header>

        <section className="studio-panel trail-on-hover p-8">
          <span className="studio-border" />
          <form onSubmit={guardarTurno} className="space-y-6">
            <div className="space-y-3">
              <input type="text" placeholder="NOMBRE" required className="studio-input" value={nombre} onChange={e => setNombre(e.target.value)} />
              <input type="tel" placeholder="WHATSAPP" required className="studio-input" value={telefono} onChange={e => setTelefono(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="tiny-label">Seleccionar Fecha</label>
              <input type="date" required className="studio-input invert-calendar" value={fecha} onChange={e => { setFecha(e.target.value); setHoraSeleccionada('') }} min={new Date().toISOString().split('T')[0]} />
            </div>

            <AnimatePresence>
              {fecha && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
                  <label className="tiny-label">Horarios Disponibles</label>
                  <div className="grid grid-cols-4 gap-2">
                    {generarHorarios().map(h => {
                      const oc = turnosOcupados.includes(h)
                      const pas = esHorarioPasado(fecha, h)
                      const dis = oc || pas
                      return (
                        <button key={h} type="button" disabled={dis} onClick={() => setHoraSeleccionada(h)}
                          className={`studio-chip py-3 text-[10px] font-black ${dis ? 'opacity-20 cursor-not-allowed' : horaSeleccionada === h ? 'active' : ''}`}>
                          {h}
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button type="submit" 
              className="w-full py-5 text-sm uppercase tracking-[0.1em] font-black rounded-full studio-button">
              Agendar Ahora
            </button>
          </form>
        </section>

        <section className="studio-panel p-8">
          <span className="studio-border" />
          <p className="tiny-label mb-4 text-center tracking-[0.15em]">¿Tenés un turno?</p>
          <div className="flex gap-2">
            <input type="tel" placeholder="WhatsApp..." className="studio-input text-xs" value={busquedaTel} onChange={e => setBusquedaTel(e.target.value)} />
            <button onClick={consultarMiTurno} 
          className="px-6 py-2 text-[10px] font-black rounded-full bg-[var(--accent-main)] text-[var(--bg-surface)] hover:opacity-90 transition-all">
           VER
          </button>
          </div>
          <AnimatePresence>
            {turnoEncontrado && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 pt-6 border-t border-white/5 text-center">
                <p className="tiny-label">Cita Confirmada</p>
                <p className="text-3xl font-black mt-2">
                  {new Date(turnoEncontrado.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' })} HS
                </p>
                <p className="text-xs opacity-50 mt-1 uppercase tracking-tighter">
                  {new Date(turnoEncontrado.fecha_hora).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <button onClick={() => setTurnoAEliminar(turnoEncontrado)} className="studio-button btn-delete w-full mt-4 py-3 text-[10px] font-black uppercase">
                  Cancelar Turno
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </motion.div>

      <AnimatePresence>
        {turnoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="studio-panel max-w-sm p-10 text-center shadow-2xl">
              <span className="studio-border" />
              <h3 className="studio-title text-base font-black italic">¿Cancelar Turno?</h3>
              <p className="text-[10px] opacity-50 mt-4 tracking-widest uppercase">Esta acción no se puede deshacer</p>
              <div className="mt-8 flex gap-3">
                <button onClick={() => setTurnoAEliminar(null)} className="studio-button secondary flex-1 py-4 text-[10px] font-black" disabled={eliminando}>VOLVER</button>
                <button onClick={cancelarTurno} className="studio-button btn-delete flex-1 py-4 text-[10px] font-black" disabled={eliminando}>{eliminando ? '...' : 'CANCELAR'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}