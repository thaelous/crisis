/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

interface Registro {
  fechaHora: string;
  duracion: string | number;
  chispa: string;
  lugar?: string;
  carga?: string;
  conducta?: string;
  ayudo?: string;
  empeoro?: string;
}

interface SuggestionsCatalog {
  chispa: string[];
  lugar: string[];
  carga: string[];
  ayudo: string[];
  empeoro: string[];
}

const DEFAULT_SUGGESTIONS: SuggestionsCatalog = {
  chispa: [
    'Transición abrupta de actividad',
    'Apagar pantalla / tiempo fuera',
    'Sobrecarga de ruidos / lugar concurrido',
    'Frustración académica o motriz',
    'Cambio inesperado en la rutina',
    'Negación ante una petición o límite',
  ],
  lugar: [
    'Casa / Sala',
    'Escuela / Salón de clases',
    'Auto / En trayecto',
    'Supermercado / Centro comercial',
    'Parque / Exterior',
    'Casa de familiares',
  ],
  carga: [
    'Sueño deficiente / mal descanso',
    'Hambre / glucosa baja (HALT)',
    'Sobrecarga sensorial acumulada',
    'Exceso de demandas cognitivas',
    'Dolor físico o malestar estomacal',
  ],
  ayudo: [
    'Espacio en penumbra y silencio total',
    'Cobija de peso / presión propioceptiva',
    'Acompañamiento en calma sin hablar',
    'Ofrecer agua fría y tiempo a solas',
    'Música suave o audífonos con cancelación',
    'Validar emoción en voz muy baja',
  ],
  empeoro: [
    'Querer razonar con él durante la crisis',
    'Insistir en contacto visual',
    'Subir el volumen de voz o amenazar',
    'Hacer múltiples preguntas seguidas',
    'Contener físicamente con fuerza',
  ],
};

function formatToDateTimeLocal(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function getInitialFechaHora(): string {
  return formatToDateTimeLocal(new Date());
}

export default function App() {
  const [vista, setVista] = useState<'registro' | 'analisis'>('registro');
  const [logs, setLogs] = useState<Registro[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionsCatalog>(DEFAULT_SUGGESTIONS);

  // Form states
  const [fechaHora, setFechaHora] = useState<string>(getInitialFechaHora());
  const [duracion, setDuracion] = useState<string>('');
  const [chispa, setChispa] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [carga, setCarga] = useState<string>('');
  const [conducta, setConducta] = useState<string>('');
  const [ayudo, setAyudo] = useState<string>('');
  const [empeoro, setEmpeoro] = useState<string>('');

  // Crisis timer state
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerAlertMessage, setTimerAlertMessage] = useState<string | null>(null);

  // 1. Service Worker Registration via Blob for Native PWA compliance
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      try {
        const swCode = `
          const CACHE_NAME = 'regulacion-pwa-v1';
          self.addEventListener('install', (e) => {
            self.skipWaiting();
          });
          self.addEventListener('activate', (e) => {
            e.waitUntil(clients.claim());
          });
          self.addEventListener('fetch', (e) => {
            e.respondWith(
              fetch(e.request).catch(() => caches.match(e.request))
            );
          });
        `;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        navigator.serviceWorker.register(swUrl).catch(() => {
          // Fallback if browser restricts blob service worker
        });
      } catch {
        // Fallback
      }
    }
  }, []);

  // 2. Initialize logs, suggestions catalog, and persistent timer
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('meltdown_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch {
      // Ignore
    }

    try {
      const storedSugg = localStorage.getItem('suggestions_catalog');
      if (storedSugg) {
        const parsed = JSON.parse(storedSugg);
        setSuggestions({
          chispa: Array.from(new Set([...(parsed.chispa || []), ...DEFAULT_SUGGESTIONS.chispa])),
          lugar: Array.from(new Set([...(parsed.lugar || []), ...DEFAULT_SUGGESTIONS.lugar])),
          carga: Array.from(new Set([...(parsed.carga || []), ...DEFAULT_SUGGESTIONS.carga])),
          ayudo: Array.from(new Set([...(parsed.ayudo || []), ...DEFAULT_SUGGESTIONS.ayudo])),
          empeoro: Array.from(new Set([...(parsed.empeoro || []), ...DEFAULT_SUGGESTIONS.empeoro])),
        });
      }
    } catch {
      // Ignore
    }

    try {
      const savedTimer = localStorage.getItem('crisis_timer_start');
      if (savedTimer) {
        const startMs = parseInt(savedTimer, 10);
        if (!isNaN(startMs) && startMs > 0) {
          setTimerStartTimestamp(startMs);
          setIsTimerRunning(true);
          setFechaHora(formatToDateTimeLocal(new Date(startMs)));
          const currentElapsed = Math.floor((Date.now() - startMs) / 1000);
          setElapsedSeconds(Math.max(0, currentElapsed));
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerStartTimestamp) {
      interval = setInterval(() => {
        const secs = Math.floor((Date.now() - timerStartTimestamp) / 1000);
        setElapsedSeconds(Math.max(0, secs));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerStartTimestamp]);

  const handleToggleTimer = () => {
    if (!isTimerRunning) {
      const nowMs = Date.now();
      setTimerStartTimestamp(nowMs);
      setIsTimerRunning(true);
      setElapsedSeconds(0);
      setTimerAlertMessage(null);
      setFechaHora(formatToDateTimeLocal(new Date(nowMs)));
      try {
        localStorage.setItem('crisis_timer_start', String(nowMs));
      } catch {
        // Ignore
      }
    } else {
      if (timerStartTimestamp) {
        const totalSecs = Math.max(1, Math.floor((Date.now() - timerStartTimestamp) / 1000));
        const calculatedMinutes = Math.max(1, Math.round(totalSecs / 60));
        setDuracion(String(calculatedMinutes));
        setTimerAlertMessage(`Crisis detenida: ${calculatedMinutes} min calculados e insertados en el formulario.`);
      }
      setIsTimerRunning(false);
      setTimerStartTimestamp(null);
      setElapsedSeconds(0);
      try {
        localStorage.removeItem('crisis_timer_start');
      } catch {
        // Ignore
      }
    }
  };

  const handleCancelTimer = () => {
    setIsTimerRunning(false);
    setTimerStartTimestamp(null);
    setElapsedSeconds(0);
    try {
      localStorage.removeItem('crisis_timer_start');
    } catch {
      // Ignore
    }
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setFechaHora(getInitialFechaHora());
    setDuracion('');
    setChispa('');
    setLugar('');
    setCarga('');
    setConducta('');
    setAyudo('');
    setEmpeoro('');
  };

  const guardarRegistro = (e: React.FormEvent) => {
    e.preventDefault();
    const nuevo: Registro = {
      fechaHora,
      duracion,
      chispa,
      lugar,
      carga,
      conducta,
      ayudo,
      empeoro,
    };

    const updated = [nuevo, ...logs];
    setLogs(updated);
    try {
      localStorage.setItem('meltdown_logs', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // 2. Guardar textos en catálogo de sugerencias para autocompletado
    const updatedSugg: SuggestionsCatalog = {
      chispa: chispa.trim() && !suggestions.chispa.includes(chispa.trim())
        ? [chispa.trim(), ...suggestions.chispa]
        : suggestions.chispa,
      lugar: lugar.trim() && !suggestions.lugar.includes(lugar.trim())
        ? [lugar.trim(), ...suggestions.lugar]
        : suggestions.lugar,
      carga: carga.trim() && !suggestions.carga.includes(carga.trim())
        ? [carga.trim(), ...suggestions.carga]
        : suggestions.carga,
      ayudo: ayudo.trim() && !suggestions.ayudo.includes(ayudo.trim())
        ? [ayudo.trim(), ...suggestions.ayudo]
        : suggestions.ayudo,
      empeoro: empeoro.trim() && !suggestions.empeoro.includes(empeoro.trim())
        ? [empeoro.trim(), ...suggestions.empeoro]
        : suggestions.empeoro,
    };
    setSuggestions(updatedSugg);
    try {
      localStorage.setItem('suggestions_catalog', JSON.stringify(updatedSugg));
    } catch {
      // Ignore
    }

    setTimerAlertMessage(null);
    resetForm();
  };

  const eliminarRegistro = (index: number) => {
    let confirmed = false;
    try {
      confirmed = window.confirm('¿Eliminar este registro?');
    } catch {
      confirmed = true;
    }

    if (confirmed) {
      const updated = logs.filter((_, idx) => idx !== index);
      setLogs(updated);
      try {
        localStorage.setItem('meltdown_logs', JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const exportarCSV = () => {
    if (logs.length === 0) {
      try {
        window.alert('No hay datos para exportar.');
      } catch {
        // Fallback
      }
      return;
    }

    const headers = [
      'Fecha y Hora',
      'Duracion (min)',
      'Detonante',
      'Lugar',
      'Carga Previa',
      'Conducta',
      'Que Ayudo',
      'Que Empeoro',
    ];
    const rows = logs.map((r) => [
      `"${r.fechaHora}"`,
      r.duracion,
      `"${(r.chispa || '').replace(/"/g, '""')}"`,
      `"${(r.lugar || '').replace(/"/g, '""')}"`,
      `"${(r.carga || '').replace(/"/g, '""')}"`,
      `"${(r.conducta || '').replace(/"/g, '""')}"`,
      `"${(r.ayudo || '').replace(/"/g, '""')}"`,
      `"${(r.empeoro || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `bitacora_regulacion_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics computation for Analysis tab
  const total = logs.length;
  const duracionProm =
    total > 0
      ? Math.round(
          logs.reduce((acc, cur) => acc + Number(cur.duracion || 0), 0) / total
        )
      : 0;

  const horasCount = Array(24).fill(0);
  const diasCount = Array(7).fill(0);

  logs.forEach((reg) => {
    const d = new Date(reg.fechaHora);
    if (!isNaN(d.getTime())) {
      horasCount[d.getHours()]++;
      diasCount[d.getDay()]++;
    }
  });

  const maxHora = Math.max(...horasCount);
  const horaPicoIdx = horasCount.indexOf(maxHora);
  const statPico = maxHora > 0 ? `${horaPicoIdx}:00` : '--';

  const horasRows = [];
  for (let h = 6; h <= 22; h += 2) {
    const sum = horasCount[h] + (horasCount[h + 1] || 0);
    const pct = maxHora > 0 ? (sum / (maxHora * 1.5)) * 100 : 0;
    const isPeak = (h === horaPicoIdx || h + 1 === horaPicoIdx) && sum > 0;
    horasRows.push({
      label: `${h}:00`,
      sum,
      pct: Math.min(pct, 100),
      isPeak,
    });
  }

  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const maxDia = Math.max(...diasCount);
  const diasRows = nombresDias.map((dia, idx) => {
    const count = diasCount[idx];
    const pct = maxDia > 0 ? (count / maxDia) * 100 : 0;
    return { dia, count, pct };
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="container">
      {/* Catálogos de datalist para autocompletado inteligente */}
      <datalist id="dl-chispa">
        {suggestions.chispa.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>
      <datalist id="dl-lugar">
        {suggestions.lugar.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>
      <datalist id="dl-carga">
        {suggestions.carga.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>
      <datalist id="dl-ayudo">
        {suggestions.ayudo.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>
      <datalist id="dl-empeoro">
        {suggestions.empeoro.map((s, idx) => (
          <option key={idx} value={s} />
        ))}
      </datalist>

      {/* Cabecera limpia sin botones de instalación ni descarga */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Bitácora de Regulación</h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '2px' }}>
            Herramienta clínica TEA Nivel 1 & TDAH
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={exportarCSV}>
          Exportar CSV
        </button>
      </header>

      {/* 3. CRONÓMETRO DE CRISIS (Acceso rápido superior) */}
      <section className={`timer-box ${isTimerRunning ? 'active' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ margin: 0 }}>Cronómetro de Crisis</label>
          {isTimerRunning ? (
            <span className="timer-badge running">
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent-peak)',
                  display: 'inline-block',
                }}
              />
              En curso
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Acceso táctil rápido</span>
          )}
        </div>

        {isTimerRunning && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <div className="timer-time-display">{formatTimerDigits(elapsedSeconds)}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Iniciada a las{' '}
              {timerStartTimestamp
                ? new Date(timerStartTimestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })
                : ''}
            </div>
          </div>
        )}

        <button
          type="button"
          className={`timer-btn ${isTimerRunning ? 'timer-btn-stop' : 'timer-btn-start'}`}
          onClick={handleToggleTimer}
        >
          {isTimerRunning ? '⏹ Detener y Calcular' : '⏱ Iniciar Crisis'}
        </button>

        {isTimerRunning && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleCancelTimer}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '0.75rem',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Cancelar cronómetro sin calcular
            </button>
          </div>
        )}

        {timerAlertMessage && (
          <div className="timer-alert">
            <span>✓ {timerAlertMessage}</span>
            <button
              type="button"
              onClick={() => setTimerAlertMessage(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '1rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        )}
      </section>

      {/* PESTAÑAS */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${vista === 'registro' ? 'active' : ''}`}
          id="tabRegistroBtn"
          onClick={() => setVista('registro')}
        >
          Registro
        </button>
        <button
          type="button"
          className={`tab-btn ${vista === 'analisis' ? 'active' : ''}`}
          id="tabAnalisisBtn"
          onClick={() => setVista('analisis')}
        >
          Análisis y Gráficas
        </button>
      </div>

      {/* 4. SECCIÓN: REGISTRO */}
      {vista === 'registro' && (
        <div id="vistaRegistro" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <form id="logForm" className="card" onSubmit={guardarRegistro}>
            <div className="grid">
              <div>
                <label htmlFor="fechaHora">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  id="fechaHora"
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="duracion">Duración (min)</label>
                <input
                  type="number"
                  id="duracion"
                  placeholder="ej. 15"
                  min="1"
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="chispa">Detonante visible inmediato ("Chispa")</label>
              <input
                type="text"
                id="chispa"
                list="dl-chispa"
                placeholder="ej. Transición abrupta / apagar pantalla"
                value={chispa}
                onChange={(e) => setChispa(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="grid">
              <div>
                <label htmlFor="lugar">Lugar</label>
                <input
                  type="text"
                  id="lugar"
                  list="dl-lugar"
                  placeholder="ej. Escuela, sala, auto"
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="carga">Carga previa (HALT / Basal)</label>
                <input
                  type="text"
                  id="carga"
                  list="dl-carga"
                  placeholder="ej. Sueño deficiente, hambre, sobrecarga"
                  value={carga}
                  onChange={(e) => setCarga(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label htmlFor="conducta">Conducta observada</label>
              <textarea
                id="conducta"
                placeholder="ej. Desconexión, mirada fija, agresión reactiva o gritos"
                value={conducta}
                onChange={(e) => setConducta(e.target.value)}
              />
            </div>

            <div className="grid">
              <div>
                <label htmlFor="ayudo">Qué ayudó a regularlo</label>
                <input
                  type="text"
                  id="ayudo"
                  list="dl-ayudo"
                  placeholder="ej. Silencio, cuarto oscuro, cobija pesada"
                  value={ayudo}
                  onChange={(e) => setAyudo(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="empeoro">Qué lo empeoró</label>
                <input
                  type="text"
                  id="empeoro"
                  list="dl-empeoro"
                  placeholder="ej. Querer razonar con él, insistir verbalmente"
                  value={empeoro}
                  onChange={(e) => setEmpeoro(e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>

            <button type="submit" className="btn">
              Guardar Episodio
            </button>
          </form>

          {/* 5. Historial reciente con eliminación */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Historial reciente</label>
              <span id="contador" style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                {logs.length} eventos
              </span>
            </div>
            <div id="listaRegistros" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {logs.length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  No hay registros cargados aún.
                </p>
              ) : (
                logs.map((reg, index) => (
                  <div key={index} className="item">
                    <div className="item-header">
                      <span>
                        {formatDate(reg.fechaHora)} • {reg.duracion} min
                      </span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => eliminarRegistro(index)}
                      >
                        Borrar
                      </button>
                    </div>
                    <div className="item-title">Chispa: {reg.chispa}</div>
                    {(reg.lugar || reg.carga) && (
                      <div style={{ fontSize: '0.825rem', color: 'var(--muted)' }}>
                        {reg.lugar ? (
                          <>
                            <b>Lugar:</b> {reg.lugar}
                            {reg.carga ? ' | ' : ''}
                          </>
                        ) : null}
                        {reg.carga ? (
                          <>
                            <b>Carga previa:</b> {reg.carga}
                          </>
                        ) : null}
                      </div>
                    )}
                    {reg.conducta && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text)', opacity: 0.9 }}>
                        <b>Conducta:</b> {reg.conducta}
                      </div>
                    )}
                    {reg.ayudo && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                        <b>Ayudó:</b> {reg.ayudo}
                      </div>
                    )}
                    {reg.empeoro && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>
                        <b>Empeoró:</b> {reg.empeoro}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. SECCIÓN: ANÁLISIS DE PATRONES (DASHBOARD) */}
      {vista === 'analisis' && (
        <div id="vistaAnalisis" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Tarjetas de métricas */}
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-num" id="statTotal">
                {total}
              </div>
              <div className="stat-desc">Total crisis</div>
            </div>
            <div className="stat-box">
              <div className="stat-num" id="statPromedio">
                {total > 0 ? `${duracionProm} m` : '0 m'}
              </div>
              <div className="stat-desc">Prom. duración</div>
            </div>
            <div className="stat-box">
              <div className="stat-num" id="statPico">
                {statPico}
              </div>
              <div className="stat-desc">Hora crítica</div>
            </div>
          </div>

          {/* Gráfico Horario con resalte en rojo/coral */}
          <div className="card">
            <label>Distribución por franja horaria (Hora del día)</label>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Permite identificar bajadas de glucosa o picos de fatiga ejecutiva.
            </p>
            <div className="bar-chart" id="chartHoras">
              {total === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Sin datos suficientes.
                </p>
              ) : (
                horasRows.map((row) => (
                  <div key={row.label} className="bar-row">
                    <span className="bar-label">{row.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${row.isPeak ? 'peak' : ''}`}
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                    <span className="bar-val">{row.sum}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gráfico Días de la Semana */}
          <div className="card">
            <label>Distribución por día de la semana</label>
            <div className="bar-chart" id="chartDias">
              {total === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Sin datos suficientes.
                </p>
              ) : (
                diasRows.map((row) => (
                  <div key={row.dia} className="bar-row">
                    <span className="bar-label">{row.dia}</span>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${row.pct}%` }} />
                    </div>
                    <span className="bar-val">{row.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
