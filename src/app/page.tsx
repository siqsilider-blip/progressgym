'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#07070a] text-white overflow-x-hidden">
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.18; transform: scale(1); }
          50% { opacity: 0.28; transform: scale(1.08); }
        }
        @keyframes float1 {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes float2 {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
        }
        @keyframes float3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(167,139,250,0.5); }
          50% { opacity: 0.6; box-shadow: 0 0 0 4px rgba(167,139,250,0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .anim-fadein { animation: fadeUp 0.7s ease forwards; }
        .anim-fadein-2 { animation: fadeUp 0.7s 0.15s ease both; }
        .anim-fadein-3 { animation: fadeUp 0.7s 0.3s ease both; }
        .anim-fadein-4 { animation: fadeUp 0.7s 0.45s ease both; }
        .float-card-1 { animation: float1 5s ease-in-out infinite; }
        .float-card-2 { animation: float2 6s ease-in-out infinite; }
        .float-card-3 { animation: float3 4.5s ease-in-out infinite; }
        .glow-breathe { animation: breathe 4s ease-in-out infinite; }
        .glow-breathe-2 { animation: breathe 5s 1s ease-in-out infinite; }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 border-b border-white/[0.05] bg-[#07070a]/90 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 20px rgba(124,58,237,0.5)' }}>
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-tight">Progrezzia</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="text-xs font-medium text-white/40 hover:text-white/80 transition-colors px-3 py-2">
            Entrar
          </Link>
          <Link href="/signup" className="text-xs font-bold px-4 py-2.5 rounded-xl text-white transition-all hover:scale-[1.03]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
            Gratis →
          </Link>
        </div>
      </nav>

      {/* ── Hero comprimido ── */}
      <section className="relative pt-[4.5rem] pb-4 px-5 overflow-hidden">

        {/* Glows animados */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="glow-breathe absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] rounded-full bg-violet-700/20 blur-[100px]" />
          <div className="glow-breathe-2 absolute top-10 right-0 w-[250px] h-[250px] rounded-full bg-indigo-600/15 blur-[80px]" />
          <svg className="absolute inset-0 w-full h-full opacity-[0.025]">
            <defs>
              <pattern id="g" width="45" height="45" patternUnits="userSpaceOnUse">
                <path d="M 45 0 L 0 0 0 45" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>

        {/* Badge */}
        <div className="anim-fadein relative pt-4 mb-3 flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/8 px-3 py-1 text-[10px] font-semibold text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" style={{ animation: 'pulse-dot 2s infinite' }} />
            Para entrenadores personales
          </div>
        </div>

        {/* Headline compacto */}
        <div className="anim-fadein-2 relative text-center mb-3">
          <h1 className="text-[2.1rem] font-black tracking-[-0.03em] leading-[1.08]">
            El sistema para
            <br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8, #67e8f9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              entrenadores
            </span>
            <br />
            modernos.
          </h1>
          <p className="mt-2 text-[12px] text-white/55 max-w-[230px] mx-auto leading-relaxed">
            Gestioná alumnos, diseñá rutinas y registrá sesiones. Todo desde el celular.
          </p>
        </div>

        {/* CTAs compactos */}
        <div className="anim-fadein-3 relative flex flex-col gap-2 max-w-[260px] mx-auto mb-5">
          <Link href="/signup"
            className="w-full rounded-2xl py-3.5 text-sm font-black text-white text-center transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 8px 28px rgba(124,58,237,0.4)' }}>
            Crear mi cuenta gratis →
          </Link>
          <Link href="/login"
            className="w-full rounded-2xl border py-3.5 text-sm font-semibold text-white/70 hover:text-white text-center transition-all"
            style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)' }}>
            Ya tengo cuenta
          </Link>
        </div>

        {/* Social proof */}
        <div className="anim-fadein-4 relative flex justify-center gap-5 mb-5">
          {[
            { n: '+120', label: 'entrenadores' },
            { n: '+3.800', label: 'sesiones' },
            { n: '+940', label: 'PRs registrados' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-sm font-black text-white">{s.n}</p>
              <p className="text-[9px] text-white/25">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Mockup del producto ── */}
        <div className="relative w-full max-w-[320px] mx-auto">

          {/* Glow principal detrás del phone */}
          <div className="absolute inset-x-4 top-6 bottom-0 blur-3xl rounded-3xl" style={{ background: 'radial-gradient(ellipse, rgba(124,58,237,0.3) 0%, transparent 70%)' }} />

          {/* Phone frame */}
          <div className="relative rounded-[2.2rem] border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)', background: '#0f0f15', boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

            {/* Notch */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1.5 w-20 rounded-full bg-white/10" />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pb-2">
              <span className="text-[10px] text-white/25 font-medium">9:41</span>
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5 items-end h-3">
                  {[1, 1.5, 2, 2.5].map((h, i) => <div key={i} className="w-0.5 rounded-sm bg-white/25" style={{ height: `${h * 4}px` }} />)}
                </div>
                <div className="w-5 h-2.5 rounded-sm border border-white/25 flex items-center px-0.5">
                  <div className="w-3 h-1.5 bg-white/30 rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* App header */}
            <div className="px-4 pt-1 pb-3 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-400">Progrezzia</p>
                <h2 className="text-[15px] font-black text-white mt-0.5">Dashboard</h2>
              </div>
              <div className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-black text-violet-300 border" style={{ background: 'rgba(124,58,237,0.2)', borderColor: 'rgba(124,58,237,0.3)' }}>JP</div>
            </div>

            {/* Stats */}
            <div className="px-4 pb-3 grid grid-cols-3 gap-1.5">
              {[
                { v: '12', l: 'Alumnos', c: 'text-white' },
                { v: '9', l: 'Activos', c: 'text-emerald-400' },
                { v: '4', l: 'PRs hoy', c: 'text-amber-400' },
              ].map((s) => (
                <div key={s.l} className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <p className={`text-base font-black ${s.c}`}>{s.v}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Alumnos */}
            <div className="px-4 pb-2">
              <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/20 mb-2">Alumnos</p>
              <div className="space-y-1.5">
                {[
                  { name: 'Lucas M.', ex: 'Sentadilla', prog: '+15kg', dot: 'bg-emerald-400', pr: true },
                  { name: 'Valentina R.', ex: 'Press banca', prog: '+8kg', dot: 'bg-emerald-400', pr: false },
                  { name: 'Matías G.', ex: 'Sin actividad', prog: '12d', dot: 'bg-amber-400', pr: false },
                ].map((s) => (
                  <div key={s.name} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <div className="relative shrink-0">
                      <div className="h-7 w-7 rounded-full flex items-center justify-center text-[9px] font-black text-indigo-300" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ${s.dot} border-2`} style={{ borderColor: '#0f0f15' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white truncate">{s.name}</p>
                      <p className="text-[9px] text-white/30 truncate">{s.ex}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.pr && <span className="text-[8px] font-black text-amber-400 rounded-md px-1.5 py-0.5" style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)' }}>PR</span>}
                      <span className={`text-[11px] font-bold ${s.pr ? 'text-emerald-400' : 'text-white/30'}`}>{s.prog}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sesión activa */}
            <div className="mx-4 mt-2 mb-3 rounded-2xl p-3 border" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18), rgba(79,70,229,0.12))', borderColor: 'rgba(124,58,237,0.25)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-violet-400">Sesión en curso</p>
                  <p className="text-[13px] font-black text-white mt-0.5">Lucas M.</p>
                  <p className="text-[9px] text-white/35">Press banca · Serie 3/4</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-white/25">Carga actual</p>
                  <p className="text-[22px] font-black text-emerald-400 leading-none">80kg</p>
                  <p className="text-[9px] text-emerald-400/70 mt-0.5">🏆 Nuevo PR</p>
                </div>
              </div>
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-around px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {[
                { icon: '⊞', l: 'Inicio', a: true },
                { icon: '👥', l: 'Alumnos', a: false },
                { icon: '📋', l: 'Rutinas', a: false },
                { icon: '📈', l: 'Stats', a: false },
              ].map((n) => (
                <div key={n.l} className={`flex flex-col items-center gap-0.5 ${n.a ? 'text-violet-400' : 'text-white/20'}`}>
                  <span className="text-sm leading-none">{n.icon}</span>
                  <span className="text-[8px] font-medium">{n.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Cards flotantes ── */}

          {/* Card PR */}
          <div className="float-card-1 absolute -right-2 top-12 w-32 rounded-2xl p-3 border" style={{ background: 'rgba(15,15,21,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">🏆</span>
              <p className="text-[8px] font-black text-amber-400 uppercase tracking-wide">Nuevo PR</p>
            </div>
            <p className="text-[10px] font-bold text-white">Press banca</p>
            <p className="text-lg font-black text-emerald-400 leading-tight">80 kg</p>
            <p className="text-[8px] text-white/25 mt-0.5">hace 2 min</p>
          </div>

          {/* Card adherencia */}
          <div className="float-card-2 absolute -left-2 top-28 w-28 rounded-2xl p-3 border" style={{ background: 'rgba(15,15,21,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-wide mb-1">Adherencia</p>
            <p className="text-xl font-black text-white">87%</p>
            <div className="mt-1.5 h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: '87%' }} />
            </div>
            <p className="text-[8px] text-emerald-400 mt-1">↑ vs mes ant.</p>
          </div>

          {/* Card racha */}
          <div className="float-card-3 absolute -right-2 bottom-28 w-28 rounded-2xl p-3 border" style={{ background: 'rgba(15,15,21,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-wide mb-1">Racha</p>
            <p className="text-xl font-black text-white">🔥 14</p>
            <p className="text-[8px] text-white/30 mt-0.5">días seguidos</p>
          </div>

          {/* Card volumen */}
          <div className="float-card-2 absolute -left-2 bottom-20 w-30 rounded-2xl p-3 border" style={{ background: 'rgba(15,15,21,0.95)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', width: '7rem' }}>
            <p className="text-[8px] font-bold text-white/25 uppercase tracking-wide mb-1">Tonelaje</p>
            <p className="text-lg font-black text-indigo-400">2.4 t</p>
            <p className="text-[8px] text-white/30 mt-0.5">esta semana</p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-5 pt-8 pb-12">
        <div className="max-w-sm mx-auto">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-white/20 text-center mb-5">Todo en un lugar</p>
          <div className="space-y-2">
            {[
              { e: '👥', t: 'Gestión de alumnos', d: 'Perfil, rutina asignada y alertas de inactividad.' },
              { e: '📋', t: 'Rutinas profesionales', d: 'Mesociclos, semanas y días con ejercicios.' },
              { e: '⚡', t: 'Registro de sesiones', d: 'Sets, RPE, descanso automático y PRs en tiempo real.' },
              { e: '📈', t: 'Progreso con datos', d: 'Carga, tonelaje y adherencia por alumno.' },
              { e: '📱', t: 'App para el alumno', d: 'Tu alumno registra sus propias sesiones.' },
            ].map((f) => (
              <div key={f.t} className="flex items-start gap-3 rounded-2xl p-3.5 border transition-all hover:border-white/10" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {f.e}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{f.t}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)' }}>{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="px-5 pb-16">
        <div className="max-w-sm mx-auto">
          <div className="relative overflow-hidden rounded-3xl p-7 text-center border" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.22), rgba(79,70,229,0.16))', borderColor: 'rgba(124,58,237,0.2)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 20% 80%, rgba(167,139,250,0.15) 0%, transparent 60%)' }} />
            <h2 className="relative text-2xl font-black tracking-tight mb-1">Empezá hoy.</h2>
            <p className="relative text-sm mb-5" style={{ color: 'rgba(255,255,255,0.45)' }}>Gratis para siempre hasta 1 alumno.</p>
            <Link href="/signup"
              className="relative inline-block w-full rounded-2xl bg-white py-4 text-sm font-black text-violet-700 hover:bg-white/95 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
              Crear cuenta gratis →
            </Link>
            <p className="relative mt-3 text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>Sin tarjeta de crédito · Cancalá cuando quieras</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 pb-8 text-center border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-center gap-2 py-5">
          <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span className="text-xs font-black" style={{ color: 'rgba(255,255,255,0.25)' }}>Progrezzia</span>
        </div>
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.12)' }}>© 2026 Progrezzia · Hecho para entrenadores</p>
      </footer>
    </main>
  )
}