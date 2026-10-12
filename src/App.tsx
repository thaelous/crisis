/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';

interface MedicationSchedule {
  id: string;
  name: string;
  days: string[];
  time: string;
}

interface ProfileData {
  childName: string;
  birthDateOrAge: string;
  diagnosisNotes: string;
  medications: MedicationSchedule[];
}

interface Registro {
  id: string;
  fechaHora: string;
  duracion: string | number;
  chispa: string;
  lugar?: string;
  carga?: string;
  medicacionRelacionada?: string;
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

interface ToastState {
  message: string;
  type: 'success' | 'danger' | 'info';
}

const DEFAULT_SUGGESTIONS: SuggestionsCatalog = {
  chispa: [
    'Transición abrupta de actividad',
    'Apagar pantalla / tiempo fuera',
    'Sobrecarga de ruidos / lugar concurrido',
    'Frustración ante una tarea',
    'Cambio inesperado en la rutina',
    'Negación o límite verbal',
  ],
  lugar: [
    'Casa / Sala',
    'Escuela / Salón',
    'Auto / En trayecto',
    'Supermercado / Tienda',
    'Parque / Exterior',
    'Casa de familiares',
  ],
  carga: [
    'Sueño deficiente / mal descanso',
    'Hambre / glucosa baja (HALT)',
    'Sobrecarga sensorial acumulada',
    'Fatiga cognitiva / día largo',
    'Malestar físico o dolor',
  ],
  ayudo: [
    'Espacio en penumbra y silencio total',
    'Cobija de peso / presión propioceptiva',
    'Acompañamiento en calma sin hablar',
    'Ofrecer agua fría y tiempo a solas',
    'Música suave o audífonos de cancelación',
    'Validar emoción en voz muy baja',
  ],
  empeoro: [
    'Querer razonar durante la crisis',
    'Insistir en contacto visual',
    'Subir el volumen de voz o amenazar',
    'Hacer múltiples preguntas seguidas',
    'Contener físicamente con fuerza',
  ],
};

const DEFAULT_PROFILE: ProfileData = {
  childName: '',
  birthDateOrAge: '',
  diagnosisNotes: '',
  medications: [],
};

const DIAS_SEMANA_ABR = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function formatToDateTimeLocal(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function getInitialFechaHora(): string {
  return formatToDateTimeLocal(new Date());
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [vista, setVista] = useState<'registro' | 'analisis' | 'datos'>('registro');

  // Modales
  const [showRescueModal, setShowRescueModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pendingRestoreData, setPendingRestoreData] = useState<{
    logs?: Registro[];
    profile?: ProfileData;
    suggestions?: SuggestionsCatalog;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: 'success' | 'danger' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3600);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Perfil y Datos
  const [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE);
  const [logs, setLogs] = useState<Registro[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionsCatalog>(DEFAULT_SUGGESTIONS);

  // Filtros de fecha
  const [filterType, setFilterType] = useState<'all' | '7d' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Form states de Registro
  const [fechaHora, setFechaHora] = useState<string>(getInitialFechaHora());
  const [duracion, setDuracion] = useState<string>('');
  const [medicacionRelacionada, setMedicacionRelacionada] = useState<string>('');
  const [chispa, setChispa] = useState<string>('');
  const [lugar, setLugar] = useState<string>('');
  const [carga, setCarga] = useState<string>('');
  const [conducta, setConducta] = useState<string>('');
  const [ayudo, setAyudo] = useState<string>('');
  const [empeoro, setEmpeoro] = useState<string>('');

  // Form states de Medicación en Perfil
  const [newMedName, setNewMedName] = useState<string>('');
  const [newMedTime, setNewMedTime] = useState<string>('08:00');
  const [newMedDays, setNewMedDays] = useState<string[]>(['Lun', 'Mar', 'Mié', 'Jue', 'Vie']);

  // Cronómetro de Crisis
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerStartTimestamp, setTimerStartTimestamp] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timerAlertMessage, setTimerAlertMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Sincronizar Tema
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('app_theme') as 'dark' | 'light' | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('app_theme', nextTheme);
    } catch {
      // Ignore
    }
  };

  // 2. Registro de Service Worker limpio y monitoreo de conectividad
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('[PWA] Registro SW:', err);
      });
    }

    // Monitoreo de conectividad para avisar si la red se vuelve inestable
    const handleOffline = () => {
      showToast('📡 Red inestable o sin conexión. Usando caché instantánea.', 'info');
    };
    const handleOnline = () => {
      showToast('✓ Conexión a internet restablecida.', 'success');
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // 3. Cargar datos locales al iniciar
  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('meltdown_logs');
      if (storedLogs) setLogs(JSON.parse(storedLogs));
    } catch {}

    try {
      const storedProfile = localStorage.getItem('profile_data');
      if (storedProfile) setProfile(JSON.parse(storedProfile));
    } catch {}

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
    } catch {}

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
    } catch {}
  }, []);

  // 4. Temporizador activo
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
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
      } catch {}
      showToast('Cronómetro iniciado. Hora de inicio registrada.', 'info');
    } else {
      if (timerStartTimestamp) {
        const totalSecs = Math.max(1, Math.floor((Date.now() - timerStartTimestamp) / 1000));
        const calculatedMinutes = Math.max(1, Math.round(totalSecs / 60));
        setDuracion(String(calculatedMinutes));
        setTimerAlertMessage(`Conteo detenido: ${calculatedMinutes} min calculados e insertados.`);
        showToast(`Crisis detenida: ${calculatedMinutes} min calculados.`, 'success');
      }
      setIsTimerRunning(false);
      setTimerStartTimestamp(null);
      setElapsedSeconds(0);
      try {
        localStorage.removeItem('crisis_timer_start');
      } catch {}
    }
  };

  const handleCancelTimer = () => {
    setIsTimerRunning(false);
    setTimerStartTimestamp(null);
    setElapsedSeconds(0);
    try {
      localStorage.removeItem('crisis_timer_start');
    } catch {}
    showToast('Cronómetro cancelado sin guardar duración.', 'info');
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 5. Manejo de Perfil y Medicación
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('profile_data', JSON.stringify(profile));
    } catch {}
    setShowProfileModal(false);
    showToast('Perfil y ajustes guardados con éxito.', 'success');
  };

  const toggleMedDay = (day: string) => {
    if (newMedDays.includes(day)) {
      setNewMedDays(newMedDays.filter((d) => d !== day));
    } else {
      setNewMedDays([...newMedDays, day]);
    }
  };

  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const newMed: MedicationSchedule = {
      id: Date.now().toString(),
      name: newMedName.trim(),
      days: newMedDays.length > 0 ? newMedDays : ['Todos los días'],
      time: newMedTime || '08:00',
    };
    const updatedMeds = [...profile.medications, newMed];
    const updatedProfile = { ...profile, medications: updatedMeds };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('profile_data', JSON.stringify(updatedProfile));
    } catch {}
    setNewMedName('');
    showToast(`Medicación "${newMed.name}" programada.`, 'success');
  };

  const handleDeleteMedication = (medId: string) => {
    const updatedMeds = profile.medications.filter((m) => m.id !== medId);
    const updatedProfile = { ...profile, medications: updatedMeds };
    setProfile(updatedProfile);
    try {
      localStorage.setItem('profile_data', JSON.stringify(updatedProfile));
    } catch {}
    showToast('Medicación eliminada del cronograma.', 'info');
  };

  // 6. Guardar Registro
  const resetForm = () => {
    setFechaHora(getInitialFechaHora());
    setDuracion('');
    setMedicacionRelacionada('');
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
      id: Date.now().toString(),
      fechaHora,
      duracion,
      chispa,
      lugar,
      carga,
      medicacionRelacionada: medicacionRelacionada || undefined,
      conducta,
      ayudo,
      empeoro,
    };

    const updated = [nuevo, ...logs];
    setLogs(updated);
    try {
      localStorage.setItem('meltdown_logs', JSON.stringify(updated));
    } catch {}

    // Actualizar catálogo de sugerencias
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
    } catch {}

    setTimerAlertMessage(null);
    resetForm();
    showToast('Evento registrado correctamente.', 'success');
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmId) return;
    const updated = logs.filter((item) => item.id !== deleteConfirmId);
    setLogs(updated);
    try {
      localStorage.setItem('meltdown_logs', JSON.stringify(updated));
    } catch {}
    setDeleteConfirmId(null);
    showToast('Evento eliminado del registro.', 'info');
  };

  // 7. Filtrado Reactivo
  const filteredLogs = useMemo(() => {
    const now = new Date();
    return logs.filter((reg) => {
      const regDate = new Date(reg.fechaHora);
      if (isNaN(regDate.getTime())) return true;

      if (filterType === 'all') return true;

      if (filterType === '7d') {
        const limit = new Date();
        limit.setDate(now.getDate() - 7);
        return regDate >= limit;
      }

      if (filterType === 'month') {
        return (
          regDate.getMonth() === now.getMonth() &&
          regDate.getFullYear() === now.getFullYear()
        );
      }

      if (filterType === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate + 'T00:00:00');
          if (regDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate + 'T23:59:59');
          if (regDate > end) return false;
        }
        return true;
      }
      return true;
    });
  }, [logs, filterType, customStartDate, customEndDate]);

  // Métricas del Dashboard con logs filtrados
  const total = filteredLogs.length;
  const duracionProm =
    total > 0
      ? Math.round(
          filteredLogs.reduce((acc, cur) => acc + Number(cur.duracion || 0), 0) / total
        )
      : 0;

  const horasCount = Array(24).fill(0);
  const diasCount = Array(7).fill(0);
  const triggerCounts: Record<string, number> = {};

  filteredLogs.forEach((reg) => {
    const d = new Date(reg.fechaHora);
    if (!isNaN(d.getTime())) {
      horasCount[d.getHours()]++;
      diasCount[d.getDay()]++;
    }
    const trig = (reg.chispa || '').trim();
    if (trig) {
      triggerCounts[trig] = (triggerCounts[trig] || 0) + 1;
    }
  });

  const maxHora = Math.max(...horasCount);
  const horaPicoIdx = horasCount.indexOf(maxHora);
  const statPico = maxHora > 0 ? `${horaPicoIdx}:00` : '--';

  const diasNombresCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const maxDiaCount = Math.max(...diasCount);
  const diaPicoIdx = diasCount.indexOf(maxDiaCount);
  const diaPicoNombre = maxDiaCount > 0 ? diasNombresCompletos[diaPicoIdx] : '--';

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
  const diasRows = nombresDias.map((dia, idx) => {
    const count = diasCount[idx];
    const pct = maxDiaCount > 0 ? (count / maxDiaCount) * 100 : 0;
    return { dia, count, pct };
  });

  // Categorización de crisis por rango de duración para evaluar intensidad
  const rangosDef = [
    { key: '0-10', label: '0 - 10 min (Breve)', min: 0, max: 10, isSevere: false },
    { key: '11-30', label: '11 - 30 min (Moderada)', min: 11, max: 30, isSevere: false },
    { key: '30+', label: '30+ min (Prolongada)', min: 31, max: Infinity, isSevere: true },
  ];

  const duracionRangosData = rangosDef.map((r) => {
    const match = filteredLogs.filter((log) => {
      const dur = Number(log.duracion) || 0;
      return dur >= r.min && dur <= r.max;
    });
    const count = match.length;
    const sum = match.reduce((acc, log) => acc + (Number(log.duracion) || 0), 0);
    const avg = count > 0 ? Math.round(sum / count) : 0;
    return {
      ...r,
      count,
      avg,
    };
  });

  const maxRangoAvg = Math.max(...duracionRangosData.map((d) => d.avg), 1);
  const duracionRangosRows = duracionRangosData.map((d) => ({
    ...d,
    pct: d.avg > 0 ? Math.min((d.avg / maxRangoAvg) * 100, 100) : 0,
  }));

  const top3Triggers = Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // Verificación de proximidad con medicación programada
  const nearbyMedication = useMemo(() => {
    if (!fechaHora || !profile.medications || profile.medications.length === 0) return null;
    const eventDate = new Date(fechaHora);
    if (isNaN(eventDate.getTime())) return null;

    const dayIdx = eventDate.getDay();
    const daysMap = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayName = daysMap[dayIdx];

    const eventMinutes = eventDate.getHours() * 60 + eventDate.getMinutes();

    let closest: {
      medication: MedicationSchedule;
      diffMinutes: number;
      message: string;
    } | null = null;

    for (const med of profile.medications) {
      const appliesDay =
        med.days.includes(dayName) ||
        med.days.includes('Todos los días') ||
        med.days.length === 0;

      if (!appliesDay) continue;

      const [medH, medM] = med.time.split(':').map(Number);
      if (isNaN(medH) || isNaN(medM)) continue;
      const medMinutes = medH * 60 + medM;

      const diff = eventMinutes - medMinutes;
      // Ventana de proximidad: ±75 minutos
      if (Math.abs(diff) <= 75) {
        let msg = '';
        if (diff === 0) {
          msg = `Coincide exactamente con la toma programada de "${med.name}" (${med.time}).`;
        } else if (diff > 0) {
          msg = `Ocurrió ${diff} min después de la toma programada de "${med.name}" (${med.time}).`;
        } else {
          msg = `Ocurrió ${Math.abs(diff)} min antes de la toma programada de "${med.name}" (${med.time}).`;
        }

        if (!closest || Math.abs(diff) < Math.abs(closest.diffMinutes)) {
          closest = {
            medication: med,
            diffMinutes: diff,
            message: msg,
          };
        }
      }
    }

    return closest;
  }, [fechaHora, profile.medications]);

  // 8. Exportar CSV y Respaldo JSON
  const exportarCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('No hay eventos en el rango seleccionado para exportar.', 'danger');
      return;
    }

    const headers = [
      'Fecha y Hora',
      'Duracion (min)',
      'Medicacion Relacionada',
      'Detonante',
      'Lugar',
      'Carga Previa',
      'Conducta',
      'Que Ayudo',
      'Que Empeoro',
    ];
    const rows = filteredLogs.map((r) => [
      `"${r.fechaHora}"`,
      r.duracion,
      `"${(r.medicacionRelacionada || '').replace(/"/g, '""')}"`,
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
      `registro_eventos_${profile.childName ? profile.childName.replace(/\s+/g, '_') + '_' : ''}${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV generado y descargado.', 'success');
  };

  const hacerCopiaSeguridad = () => {
    if (logs.length === 0) {
      showToast('No hay datos guardados para respaldar.', 'danger');
      return;
    }
    const backupData = {
      app: 'Registro de eventos y crisis',
      version: 2,
      exportedAt: new Date().toISOString(),
      profile,
      logs,
      suggestions,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_eventos_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Copia de respaldo JSON descargada.', 'success');
  };

  const handleRestaurarClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed.logs)) {
          setPendingRestoreData(parsed);
        } else {
          showToast('El archivo no contiene un formato de respaldo válido.', 'danger');
        }
      } catch {
        showToast('Error al leer el archivo JSON.', 'danger');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = () => {
    if (!pendingRestoreData || !Array.isArray(pendingRestoreData.logs)) return;
    setLogs(pendingRestoreData.logs);
    localStorage.setItem('meltdown_logs', JSON.stringify(pendingRestoreData.logs));

    if (pendingRestoreData.profile) {
      setProfile(pendingRestoreData.profile);
      localStorage.setItem('profile_data', JSON.stringify(pendingRestoreData.profile));
    }
    if (pendingRestoreData.suggestions) {
      setSuggestions(pendingRestoreData.suggestions);
      localStorage.setItem('suggestions_catalog', JSON.stringify(pendingRestoreData.suggestions));
    }
    const count = pendingRestoreData.logs.length;
    setPendingRestoreData(null);
    showToast(`Copia de seguridad restaurada con éxito (${count} eventos).`, 'success');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="app-shell">
      {/* Input oculto para restaurar copia */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* Datalists de autocompletado */}
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

      {/* Cabecera Premium Fija */}
      <header className="app-header">
        <div className="brand-wrap">
          <h1>{profile.childName.trim() ? `Registro de ${profile.childName.trim()}` : 'Registro de eventos y crisis'}</h1>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-rescue"
            onClick={() => setShowRescueModal(true)}
            title="Guía rápida de rescate"
          >
            <span>🧰</span>
            <span>Guía</span>
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setShowProfileModal(true)}
            title="Ajustes y Perfil"
          >
            ⚙️
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Contenedor scrolleable autónomo para la vista actual (Zero Window Overflow) */}
      <main className="view-content">
        {/* VISTA 1: REGISTRO */}
        {vista === 'registro' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Cronómetro de Crisis */}
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
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Toque rápido</span>
                )}
              </div>

              {isTimerRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div className="timer-time-display">{formatTimerDigits(elapsedSeconds)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    Iniciado a las{' '}
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
                {isTimerRunning ? '⏹ Detener y Calcular' : '▶ Iniciar Registro'}
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

            {/* Formulario */}
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

              {/* Notificación de coincidencia / proximidad con medicación programada */}
              {nearbyMedication && (
                <div className="med-alert-box">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>💊</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--accent)' }}>
                        Toma de medicación cercana detectada
                      </div>
                      <div style={{ fontSize: '0.82rem', marginTop: '2px', color: 'var(--text)' }}>
                        {nearbyMedication.message}
                      </div>
                    </div>
                  </div>
                  {medicacionRelacionada !==
                    `${nearbyMedication.medication.name} (${nearbyMedication.medication.time})` && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{
                        fontSize: '0.76rem',
                        padding: '6px 10px',
                        minHeight: '32px',
                        whiteSpace: 'nowrap',
                      }}
                      onClick={() =>
                        setMedicacionRelacionada(
                          `${nearbyMedication.medication.name} (${nearbyMedication.medication.time})`
                        )
                      }
                    >
                      Vincular toma
                    </button>
                  )}
                </div>
              )}

              {/* Selector desplegable de Medicación Relacionada */}
              <div>
                <label htmlFor="medRelated">Toma de medicación relacionada</label>
                <select
                  id="medRelated"
                  value={medicacionRelacionada}
                  onChange={(e) => setMedicacionRelacionada(e.target.value)}
                >
                  <option value="">Ninguna / No relacionada</option>
                  {profile.medications.map((m) => (
                    <option key={m.id} value={`${m.name} (${m.time})`}>
                      {m.name} ({m.time} - {m.days.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="chispa">Detonante visible / Chispa</label>
                <input
                  type="text"
                  id="chispa"
                  list="dl-chispa"
                  placeholder="ej. Transición abrupta, apagar pantalla..."
                  value={chispa}
                  onChange={(e) => setChispa(e.target.value)}
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
                    placeholder="ej. Casa / Sala"
                    value={lugar}
                    onChange={(e) => setLugar(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="carga">Carga previa (HALT)</label>
                  <input
                    type="text"
                    id="carga"
                    list="dl-carga"
                    placeholder="ej. Sueño deficiente, hambre..."
                    value={carga}
                    onChange={(e) => setCarga(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="conducta">Conducta observada</label>
                <textarea
                  id="conducta"
                  placeholder="ej. Desconexión visual, llanto intenso, gritos, rechazo al tacto..."
                  value={conducta}
                  onChange={(e) => setConducta(e.target.value)}
                />
              </div>

              <div className="grid">
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="ayudo" style={{ margin: 0 }}>Qué ayudó a regularlo</label>
                  </div>
                  <textarea
                    id="ayudo"
                    placeholder="ej. Silencio, cobija de peso, acompañamiento sin hablar..."
                    value={ayudo}
                    onChange={(e) => setAyudo(e.target.value)}
                  />
                  {suggestions.ayudo.length > 0 && (
                    <select
                      style={{ marginTop: '4px', fontSize: '0.74rem', padding: '4px 8px', color: 'var(--muted)' }}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setAyudo((prev) => (prev ? `${prev}. ${e.target.value}` : e.target.value));
                        }
                      }}
                    >
                      <option value="">+ Insertar sugerencia rápida...</option>
                      {suggestions.ayudo.map((item, idx) => (
                        <option key={idx} value={item}>{item}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="empeoro" style={{ margin: 0 }}>Qué empeoró la situación</label>
                  </div>
                  <textarea
                    id="empeoro"
                    placeholder="ej. Querer razonar, subir la voz, insistir en contacto visual..."
                    value={empeoro}
                    onChange={(e) => setEmpeoro(e.target.value)}
                  />
                  {suggestions.empeoro.length > 0 && (
                    <select
                      style={{ marginTop: '4px', fontSize: '0.74rem', padding: '4px 8px', color: 'var(--muted)' }}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          setEmpeoro((prev) => (prev ? `${prev}. ${e.target.value}` : e.target.value));
                        }
                      }}
                    >
                      <option value="">+ Insertar sugerencia rápida...</option>
                      {suggestions.empeoro.map((item, idx) => (
                        <option key={idx} value={item}>{item}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <button type="submit" className="btn">
                💾 Guardar Evento
              </button>
            </form>

            {/* Filtro Reactivo para el Historial */}
            <div className="filter-bar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Filtrar historial
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {filteredLogs.length} eventos
                </span>
              </div>
              <div className="filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === '7d' ? 'active' : ''}`}
                  onClick={() => setFilterType('7d')}
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'month' ? 'active' : ''}`}
                  onClick={() => setFilterType('month')}
                >
                  Este mes
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'custom' ? 'active' : ''}`}
                  onClick={() => setFilterType('custom')}
                >
                  Personalizado
                </button>
              </div>

              {filterType === 'custom' && (
                <div className="grid" style={{ marginTop: '4px' }}>
                  <div>
                    <label htmlFor="cStart" style={{ fontSize: '0.68rem' }}>Desde:</label>
                    <input
                      type="date"
                      id="cStart"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="cEnd" style={{ fontSize: '0.68rem' }}>Hasta:</label>
                    <input
                      type="date"
                      id="cEnd"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Historial de eventos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLogs.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
                  <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>
                    No hay eventos registrados en este rango de fechas.
                  </p>
                </div>
              ) : (
                filteredLogs.map((reg) => (
                  <div key={reg.id} className="item">
                    <div className="item-header">
                      <span>
                        {formatDate(reg.fechaHora)} • {reg.duracion} min
                      </span>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => setDeleteConfirmId(reg.id)}
                      >
                        Borrar
                      </button>
                    </div>

                    <div className="item-title">Chispa: {reg.chispa}</div>

                    {reg.medicacionRelacionada && (
                      <div className="med-badge">
                        <span>💊</span>
                        <span>Medicación: {reg.medicacionRelacionada}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      {reg.lugar && <span>📍 {reg.lugar}</span>}
                      {reg.carga && <span>🔋 Carga: {reg.carga}</span>}
                    </div>

                    {reg.conducta && (
                      <div style={{ fontSize: '0.82rem', marginTop: '2px' }}>
                        <span style={{ color: 'var(--muted)', fontWeight: 600 }}>Conducta: </span>
                        {reg.conducta}
                      </div>
                    )}

                    {reg.ayudo && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--success)' }}>
                        <b>✓ Ayudó:</b> {reg.ayudo}
                      </div>
                    )}

                    {reg.empeoro && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--danger)' }}>
                        <b>✕ Empeoró:</b> {reg.empeoro}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: ANÁLISIS Y GRÁFICAS */}
        {vista === 'analisis' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Filtro Reactivo de Análisis */}
            <div className="filter-bar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Período de análisis
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                  {filteredLogs.length} eventos evaluados
                </span>
              </div>
              <div className="filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  Histórico completo
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === '7d' ? 'active' : ''}`}
                  onClick={() => setFilterType('7d')}
                >
                  Últimos 7 días
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'month' ? 'active' : ''}`}
                  onClick={() => setFilterType('month')}
                >
                  Este mes
                </button>
                <button
                  type="button"
                  className={`filter-pill ${filterType === 'custom' ? 'active' : ''}`}
                  onClick={() => setFilterType('custom')}
                >
                  Personalizado
                </button>
              </div>

              {filterType === 'custom' && (
                <div className="grid" style={{ marginTop: '4px' }}>
                  <div>
                    <label htmlFor="aStart" style={{ fontSize: '0.68rem' }}>Desde:</label>
                    <input
                      type="date"
                      id="aStart"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="aEnd" style={{ fontSize: '0.68rem' }}>Hasta:</label>
                    <input
                      type="date"
                      id="aEnd"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Métricas Principales */}
            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-num">{total}</div>
                <div className="stat-desc">Crisis Registradas</div>
              </div>
              <div className="stat-box">
                <div className="stat-num">{duracionProm} <span style={{ fontSize: '0.8rem' }}>min</span></div>
                <div className="stat-desc">Duración Media</div>
              </div>
              <div className="stat-box">
                <div className="stat-num" style={{ color: 'var(--accent-peak)' }}>{statPico}</div>
                <div className="stat-desc">Hora Pico</div>
              </div>
              <div className="stat-box">
                <div className="stat-num" style={{ fontSize: '1.05rem' }}>{diaPicoNombre}</div>
                <div className="stat-desc">Día más frecuente</div>
              </div>
            </div>

            {/* Top 3 Detonantes Más Frecuentes */}
            <div className="card">
              <label>Top detonantes más frecuentes</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {top3Triggers.length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Sin registros suficientes en este período.
                  </p>
                ) : (
                  top3Triggers.map(([trigger, count], idx) => {
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={idx} className="top-trigger-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>#{idx + 1}</span>
                          <span style={{ fontWeight: 600 }}>{trigger}</span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>
                          {count} veces ({pct}%)
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Gráfico de Duración por Rango de Intensidad */}
            <div className="card">
              <label>Duración promedio por rango de intensidad</label>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '-4px' }}>
                Categorización de episodios para identificar tendencias de severidad y persistencia.
              </p>
              <div className="bar-chart">
                {total === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                    Sin datos suficientes.
                  </p>
                ) : (
                  duracionRangosRows.map((row) => (
                    <div
                      key={row.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        marginBottom: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.78rem',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            color: row.isSevere && row.count > 0 ? 'var(--accent-peak)' : 'var(--text)',
                          }}
                        >
                          {row.label}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>
                          {row.count} {row.count === 1 ? 'crisis' : 'crisis'}{' '}
                          {row.count > 0 ? `(${row.avg} min prom.)` : '(sin registros)'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="bar-track" style={{ flex: 1 }}>
                          <div
                            className={`bar-fill ${row.isSevere && row.count > 0 ? 'peak' : ''}`}
                            style={{ width: `${row.pct}%` }}
                          />
                        </div>
                        <span
                          className="bar-val"
                          style={{
                            width: '45px',
                            textAlign: 'right',
                            fontSize: '0.76rem',
                            color: row.isSevere && row.count > 0 ? 'var(--accent-peak)' : 'inherit',
                          }}
                        >
                          {row.avg > 0 ? `${row.avg}m` : '--'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Gráfico Horario */}
            <div className="card">
              <label>Distribución por franja horaria (Hora del día)</label>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '-4px' }}>
                Identifica bajadas de glucosa o picos de fatiga ejecutiva.
              </p>
              <div className="bar-chart">
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
              <div className="bar-chart">
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

        {/* VISTA 3: DATOS Y PRIVACIDAD */}
        {vista === 'datos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Tarjeta de Tutorial */}
            <div className="card" style={{ background: 'linear-gradient(180deg, var(--card) 0%, var(--card-subtle) 100%)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 800 }}>Guía de Uso y Privacidad</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '2px' }}>
                    Tus datos se guardan exclusivamente en la memoria local de tu dispositivo.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTutorialModal(true)}
                >
                  Tutorial
                </button>
              </div>
            </div>

            {/* Acciones de exportación y respaldo */}
            <div className="data-card-grid">
              <div className="action-card">
                <div className="action-card-text">
                  <span className="action-card-title">Exportar para el médico (CSV)</span>
                  <span className="action-card-desc">
                    Genera una hoja de cálculo limpia con los filtros actuales para Microsoft Excel o consulta clínica.
                  </span>
                </div>
                <button type="button" className="btn-secondary" onClick={exportarCSV}>
                  Descargar CSV
                </button>
              </div>

              <div className="action-card">
                <div className="action-card-text">
                  <span className="action-card-title">Crear Copia de Respaldo (JSON)</span>
                  <span className="action-card-desc">
                    Guarda un archivo de seguridad completo con todos los eventos, perfil y catálogo de sugerencias.
                  </span>
                </div>
                <button type="button" className="btn-secondary" onClick={hacerCopiaSeguridad}>
                  Crear Copia
                </button>
              </div>

              <div className="action-card">
                <div className="action-card-text">
                  <span className="action-card-title">Restaurar Copia (JSON)</span>
                  <span className="action-card-desc">
                    Importa un archivo previo para recuperar todos los registros al cambiar de teléfono o navegador.
                  </span>
                </div>
                <button type="button" className="btn-secondary" onClick={handleRestaurarClick}>
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Barra de Navegación Inferior Fija (Bottom Nav Bar) */}
      <nav className="bottom-nav">
        <button
          type="button"
          className={`nav-item ${vista === 'registro' ? 'active' : ''}`}
          onClick={() => setVista('registro')}
        >
          <span className="nav-icon">📝</span>
          <span>Registro</span>
        </button>
        <button
          type="button"
          className={`nav-item ${vista === 'analisis' ? 'active' : ''}`}
          onClick={() => setVista('analisis')}
        >
          <span className="nav-icon">📊</span>
          <span>Análisis</span>
        </button>
        <button
          type="button"
          className={`nav-item ${vista === 'datos' ? 'active' : ''}`}
          onClick={() => setVista('datos')}
        >
          <span className="nav-icon">💾</span>
          <span>Datos</span>
        </button>
      </nav>

      {/* Toast Notification Flotante */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontSize: '1.1rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Modal de Ajustes y Perfil (Bottom Sheet) */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>⚙️</span> Ajustes y Perfil
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="childName">Nombre del niño</label>
                <input
                  type="text"
                  id="childName"
                  placeholder="ej. Mateo"
                  value={profile.childName}
                  onChange={(e) => setProfile({ ...profile, childName: e.target.value })}
                />
              </div>

              <div className="grid">
                <div>
                  <label htmlFor="birthDateOrAge">Edad o fecha de nacimiento</label>
                  <input
                    type="text"
                    id="birthDateOrAge"
                    placeholder="ej. 8 años"
                    value={profile.birthDateOrAge}
                    onChange={(e) => setProfile({ ...profile, birthDateOrAge: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="diagnosisNotes">Notas del perfil</label>
                  <input
                    type="text"
                    id="diagnosisNotes"
                    placeholder="ej. Sensibilidad auditiva, notas..."
                    value={profile.diagnosisNotes}
                    onChange={(e) => setProfile({ ...profile, diagnosisNotes: e.target.value })}
                  />
                </div>
              </div>

              {/* Programador de Medicación */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px' }}>
                  💊 Programador de Medicación (Horario semanal)
                </label>

                {/* Formulario para agregar dosis */}
                <div style={{ background: 'var(--card-subtle)', padding: '12px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div className="grid">
                    <div>
                      <label htmlFor="medName" style={{ fontSize: '0.72rem' }}>Medicamento</label>
                      <input
                        type="text"
                        id="medName"
                        placeholder="ej. Metilfenidato 10mg"
                        value={newMedName}
                        onChange={(e) => setNewMedName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="medTime" style={{ fontSize: '0.72rem' }}>Hora programada</label>
                      <input
                        type="time"
                        id="medTime"
                        value={newMedTime}
                        onChange={(e) => setNewMedTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.72rem' }}>Días de toma:</label>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                      {DIAS_SEMANA_ABR.map((day) => {
                        const isSelected = newMedDays.includes(day);
                        return (
                          <button
                            type="button"
                            key={day}
                            onClick={() => toggleMedDay(day)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--accent)' : 'var(--card)',
                              color: isSelected ? '#0f172a' : 'var(--text)',
                              cursor: 'pointer',
                              fontWeight: 600,
                            }}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ alignSelf: 'flex-start' }}
                    onClick={handleAddMedication}
                  >
                    + Agregar toma al horario
                  </button>
                </div>

                {/* Lista de tomas configuradas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '10px' }}>
                  {profile.medications.length === 0 ? (
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                      No hay tomas configuradas aún.
                    </span>
                  ) : (
                    profile.medications.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: 'var(--card-subtle)',
                          borderRadius: '8px',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{m.name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
                            ⏰ {m.time} • Días: {m.days.join(', ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-danger"
                          onClick={() => handleDeleteMedication(m.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="btn" style={{ marginTop: '8px' }}>
                Guardar Ajustes
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Guía Rápida de Rescate */}
      {showRescueModal && (
        <div className="modal-overlay" onClick={() => setShowRescueModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>🧰</span> Protocolo de Rescate en Crisis
              </div>
              <button
                type="button"
                onClick={() => setShowRescueModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="rescue-step">
                <b>1. Reduce estímulos:</b> apaga ruidos, baja luces, retira objetos cercanos.
              </div>
              <div className="rescue-step">
                <b>2. Postura y tono neutro:</b> habla con voz suave, pocas palabras y sin exigir explicaciones.
              </div>
              <div className="rescue-step">
                <b>3. Espacio seguro y contención:</b> ofrece presión profunda o cobija si lo tolera; no toques si lo irrita.
              </div>
              <div className="rescue-step critical">
                <b>4. No intentes razonar</b> ni poner consecuencias en este momento.
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginTop: '6px' }}
              onClick={() => setShowRescueModal(false)}
            >
              Entendido / Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Tutorial */}
      {showTutorialModal && (
        <div className="modal-overlay" onClick={() => setShowTutorialModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📘</span> ¿Cómo funciona esta app?
              </div>
              <button
                type="button"
                onClick={() => setShowTutorialModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div className="rescue-step">
                <b>⏱ Cronómetro de Crisis:</b> Al comenzar un episodio, presiona el botón superior. Registrará la hora exacta. Al finalizar, calcula los minutos automáticamente.
              </div>
              <div className="rescue-step">
                <b>💊 Alerta de Medicación:</b> Si programas horarios en tu Perfil (⚙️), la aplicación te alertará si un evento ocurrió cerca de la toma programada.
              </div>
              <div className="rescue-step">
                <b>💡 Autocompletado que aprende:</b> Los detonantes y estrategias que escribas se guardan para seleccionarse con un toque en próximos episodios.
              </div>
              <div className="rescue-step">
                <b>🔒 Privacidad Absoluta:</b> La app no envía datos a ningún servidor externo. Todo reside en tu teléfono. Usa la pestaña "Datos" para crear copias JSON o exportar a CSV para el médico.
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginTop: '8px' }}
              onClick={() => setShowTutorialModal(false)}
            >
              Cerrar Guía
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Borrado */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--danger)' }}>
                <span>⚠️</span> ¿Eliminar este registro?
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
              Esta acción borrará el evento seleccionado de tu historial permanente.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, background: 'var(--danger)', color: '#ffffff' }}
                onClick={handleConfirmDelete}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Restauración */}
      {pendingRestoreData && (
        <div className="modal-overlay" onClick={() => setPendingRestoreData(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <span>📥</span> Restaurar copia de seguridad
              </div>
              <button
                type="button"
                onClick={() => setPendingRestoreData(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1.4rem',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
              Se encontraron <b>{pendingRestoreData.logs?.length || 0} eventos</b> en el archivo de respaldo.
              ¿Deseas restaurar estos datos reemplazando los actuales?
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setPendingRestoreData(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn"
                style={{ flex: 1 }}
                onClick={handleApplyRestore}
              >
                Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
