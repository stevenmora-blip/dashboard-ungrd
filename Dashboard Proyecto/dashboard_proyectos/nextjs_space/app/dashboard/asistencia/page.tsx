'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Check,
  Users,
  Building2,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';

interface AttendanceEntry {
  id: string;
  userId: string;
  fecha: string;
  manana: boolean;
  tarde: boolean;
  nota: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    responsable: { name: string } | null;
  };
}

interface WeekDay {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const DAY_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getWeekDays(monday: Date): WeekDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: WeekDay[] = [];
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    date.setHours(0, 0, 0, 0);
    days.push({
      date,
      dateStr: formatDateStr(date),
      dayName: DAY_NAMES[i],
      dayNum: date.getDate(),
      isToday: formatDateStr(date) === formatDateStr(today),
      isPast: date < today,
      isWeekend: false,
    });
  }
  return days;
}

export default function AsistenciaPage() {
  const { data: session } = useSession() || {};
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMonday(new Date()));
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWeekDays(getWeekDays(currentMonday));
  }, [currentMonday]);

  const fetchEntries = useCallback(async () => {
    if (!mounted) return;
    setLoading(true);
    try {
      const friday = new Date(currentMonday);
      friday.setDate(currentMonday.getDate() + 4);
      const res = await fetch(
        `/api/attendance?startDate=${formatDateStr(currentMonday)}&endDate=${formatDateStr(friday)}`
      );
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (e) {
      console.error('Error fetching attendance:', e);
    } finally {
      setLoading(false);
    }
  }, [currentMonday, mounted]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const toggleAttendance = async (dateStr: string, period: 'manana' | 'tarde') => {
    const userId = (session?.user as any)?.id;
    if (!userId) return;

    setSaving(dateStr + '-' + period);

    const existing = entries.find(
      (e) => e.userId === userId && e.fecha.split('T')[0] === dateStr
    );

    const currentManana = existing?.manana ?? false;
    const currentTarde = existing?.tarde ?? false;

    const newData = {
      fecha: dateStr,
      manana: period === 'manana' ? !currentManana : currentManana,
      tarde: period === 'tarde' ? !currentTarde : currentTarde,
    };

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData),
      });
      if (res.ok) {
        await fetchEntries();
      }
    } catch (e) {
      console.error('Error saving:', e);
    } finally {
      setSaving(null);
    }
  };

  const navigateWeek = (direction: number) => {
    const newMonday = new Date(currentMonday);
    newMonday.setDate(currentMonday.getDate() + direction * 7);
    setCurrentMonday(newMonday);
  };

  const goToCurrentWeek = () => {
    setCurrentMonday(getMonday(new Date()));
  };

  const userId = (session?.user as any)?.id;

  const getMyEntry = (dateStr: string): AttendanceEntry | undefined => {
    return entries.find(
      (e) => e.userId === userId && e.fecha.split('T')[0] === dateStr
    );
  };

  const getPeopleForDay = (dateStr: string, period: 'manana' | 'tarde'): AttendanceEntry[] => {
    return entries.filter(
      (e) => e.fecha.split('T')[0] === dateStr && e[period]
    );
  };

  // Stats
  const totalPeopleThisWeek = new Set(entries.filter(e => e.manana || e.tarde).map(e => e.userId)).size;
  const morningCount = entries.filter(e => e.manana).length;
  const afternoonCount = entries.filter(e => e.tarde).length;

  const weekLabel = mounted && weekDays.length > 0
    ? `${weekDays[0].dayNum} - ${weekDays[4]?.dayNum || ''} de ${MONTH_NAMES[weekDays[0].date.getMonth()]} ${weekDays[0].date.getFullYear()}`
    : '';

  if (!mounted) return null;

  return (
    <div className="-m-4 sm:-m-6 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#1A365D] via-[#1e3a5f] to-[#234876] px-6 py-8">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-72 h-72 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <Building2 className="h-6 w-6 text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Calendario de Asistencia</h1>
              <p className="text-blue-200 text-sm">Registro de presencialidad semanal · UNGRD</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-yellow-400" />
                <span className="text-blue-200 text-xs font-medium">Personas esta semana</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalPeopleThisWeek}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Sun className="h-4 w-4 text-amber-400" />
                <span className="text-blue-200 text-xs font-medium">Registros mañana</span>
              </div>
              <p className="text-2xl font-bold text-white">{morningCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="h-4 w-4 text-indigo-300" />
                <span className="text-blue-200 text-xs font-medium">Registros tarde</span>
              </div>
              <p className="text-2xl font-bold text-white">{afternoonCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigateWeek(-1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-5 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200">
              <Calendar className="h-5 w-5 text-[#1A365D]" />
              <span className="font-semibold text-gray-800 text-lg">{weekLabel}</span>
            </div>
            <button
              onClick={goToCurrentWeek}
              className="px-4 py-2.5 bg-[#1A365D] text-white rounded-xl shadow-sm hover:bg-[#234876] transition-all text-sm font-medium"
            >
              Hoy
            </button>
          </div>

          <button
            onClick={() => navigateWeek(1)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all text-sm font-medium text-gray-700"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#1A365D]" />
          </div>
        ) : (
          <>
            {/* My Week - Interactive */}
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="h-5 w-5 text-[#1A365D]" />
                <h2 className="text-lg font-bold text-gray-800">Mi Asistencia</h2>
                <span className="text-sm text-gray-500 ml-1">— Selecciona los turnos que asistirás</span>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {weekDays.map((day, i) => {
                  const myEntry = getMyEntry(day.dateStr);
                  const isManana = myEntry?.manana ?? false;
                  const isTarde = myEntry?.tarde ?? false;
                  const hasAny = isManana || isTarde;

                  return (
                    <div
                      key={day.dateStr}
                      className={`relative rounded-2xl border-2 transition-all overflow-hidden ${
                        day.isToday
                          ? 'border-[#1A365D] shadow-lg shadow-blue-100 ring-2 ring-blue-100'
                          : hasAny
                          ? 'border-emerald-200 shadow-md'
                          : 'border-gray-200 shadow-sm'
                      } bg-white`}
                    >
                      {/* Day Header */}
                      <div
                        className={`px-4 py-3 text-center ${
                          day.isToday
                            ? 'bg-gradient-to-r from-[#1A365D] to-[#234876]'
                            : hasAny
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                            : 'bg-gray-100'
                        }`}
                      >
                        <p
                          className={`text-xs font-semibold tracking-wider uppercase ${
                            day.isToday || hasAny ? 'text-white/80' : 'text-gray-500'
                          }`}
                        >
                          {DAY_FULL[i]}
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            day.isToday || hasAny ? 'text-white' : 'text-gray-800'
                          }`}
                        >
                          {day.dayNum}
                        </p>
                      </div>

                      {/* Toggle Buttons */}
                      <div className="p-3 space-y-2">
                        <button
                          onClick={() => toggleAttendance(day.dateStr, 'manana')}
                          disabled={saving === day.dateStr + '-manana'}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isManana
                              ? 'bg-amber-50 border-2 border-amber-300 text-amber-800 shadow-inner'
                              : 'bg-gray-50 border-2 border-transparent text-gray-500 hover:bg-amber-50/50 hover:border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Sun className={`h-4 w-4 ${isManana ? 'text-amber-500' : 'text-gray-400'}`} />
                            <span>Mañana</span>
                          </div>
                          {saving === day.dateStr + '-manana' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isManana ? (
                            <Check className="h-4 w-4 text-amber-600" />
                          ) : null}
                        </button>

                        <button
                          onClick={() => toggleAttendance(day.dateStr, 'tarde')}
                          disabled={saving === day.dateStr + '-tarde'}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            isTarde
                              ? 'bg-indigo-50 border-2 border-indigo-300 text-indigo-800 shadow-inner'
                              : 'bg-gray-50 border-2 border-transparent text-gray-500 hover:bg-indigo-50/50 hover:border-indigo-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Moon className={`h-4 w-4 ${isTarde ? 'text-indigo-500' : 'text-gray-400'}`} />
                            <span>Tarde</span>
                          </div>
                          {saving === day.dateStr + '-tarde' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : isTarde ? (
                            <Check className="h-4 w-4 text-indigo-600" />
                          ) : null}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team View */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-[#1A365D]" />
                <h2 className="text-lg font-bold text-gray-800">Equipo en Oficina</h2>
                <span className="text-sm text-gray-500 ml-1">— Quién estará cada día</span>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                        <th className="px-5 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider w-1/5">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3.5 w-3.5" />
                            Turno
                          </div>
                        </th>
                        {weekDays.map((day, i) => (
                          <th
                            key={day.dateStr}
                            className={`px-4 py-4 text-center text-xs font-bold uppercase tracking-wider ${
                              day.isToday
                                ? 'text-[#1A365D] bg-blue-50/50'
                                : 'text-gray-600'
                            }`}
                          >
                            <div>{DAY_FULL[i]}</div>
                            <div className={`text-lg font-bold mt-0.5 ${day.isToday ? 'text-[#1A365D]' : 'text-gray-800'}`}>
                              {day.dayNum}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Morning Row */}
                      <tr className="border-b border-gray-100">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-100 rounded-lg">
                              <Sun className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Mañana</p>
                              <p className="text-xs text-gray-500">7:00 - 12:00</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const people = getPeopleForDay(day.dateStr, 'manana');
                          return (
                            <td key={day.dateStr + '-m'} className={`px-3 py-4 align-top ${day.isToday ? 'bg-blue-50/30' : ''}`}>
                              {people.length > 0 ? (
                                <div className="space-y-1.5">
                                  {people.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 rounded-lg border border-amber-100"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {(p.user.responsable?.name || p.user.name || '?')[0]}
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 truncate">
                                        {(p.user.responsable?.name || p.user.name || 'Sin nombre').split(' ').slice(0, 2).join(' ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-300 text-center italic">—</p>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Afternoon Row */}
                      <tr>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-indigo-100 rounded-lg">
                              <Moon className="h-4 w-4 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">Tarde</p>
                              <p className="text-xs text-gray-500">13:00 - 17:00</p>
                            </div>
                          </div>
                        </td>
                        {weekDays.map((day) => {
                          const people = getPeopleForDay(day.dateStr, 'tarde');
                          return (
                            <td key={day.dateStr + '-t'} className={`px-3 py-4 align-top ${day.isToday ? 'bg-blue-50/30' : ''}`}>
                              {people.length > 0 ? (
                                <div className="space-y-1.5">
                                  {people.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-center gap-2 px-2 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100"
                                    >
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                        {(p.user.responsable?.name || p.user.name || '?')[0]}
                                      </div>
                                      <span className="text-xs font-medium text-gray-700 truncate">
                                        {(p.user.responsable?.name || p.user.name || 'Sin nombre').split(' ').slice(0, 2).join(' ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-300 text-center italic">—</p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
