/**
 * DateUtils — FUENTE ÚNICA DE VERDAD para fechas/semanas en el frontend.
 *
 * Todos los módulos (menú, lista de compra, tareas, calendario, dashboard)
 * deben usar estas funciones para calcular "hoy", "el lunes de la semana" y
 * para formatear claves de fecha. Así no hay desincronización entre módulos.
 *
 * Reglas:
 * - La semana SIEMPRE empieza en lunes.
 * - Las claves de fecha (YYYY-MM-DD) se generan con getters LOCALES, nunca con
 *   toISOString() (que usa UTC y retrocede un día por la noche en España).
 */
(function (global) {
    'use strict';

    const DIA_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

    /** Lunes de la semana que contiene `date`. Devuelve una fecha nueva a medianoche local (no muta el argumento). */
    function getMonday(date) {
        const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const day = d.getDay(); // 0=domingo, 1=lunes, ... 6=sábado
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.getFullYear(), d.getMonth(), diff);
    }

    /** Lunes de la semana ACTUAL (según la fecha del dispositivo). */
    function currentMonday() {
        return getMonday(new Date());
    }

    /** Lunes de la PRÓXIMA semana. */
    function nextMonday() {
        const m = currentMonday();
        return new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7);
    }

    /** Formatea una fecha como 'YYYY-MM-DD' usando getters LOCALES (sin drift de UTC). */
    function localISO(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /** Parsea 'YYYY-MM-DD' a una fecha local a mediodía (evita el rollback de UTC). */
    function parseWeek(str) {
        if (str instanceof Date) return str;
        return new Date(str + 'T12:00:00');
    }

    /** Clave del día de hoy en minúsculas sin acentos: 'lunes'..'domingo'. */
    function todayKey() {
        const dow = new Date().getDay(); // 0=domingo
        return DIA_KEYS[dow === 0 ? 6 : dow - 1];
    }

    /** True si `weekStart` (Date o string) es el lunes de la semana actual. */
    function isCurrentWeek(weekStart) {
        const ws = parseWeek(weekStart);
        return localISO(getMonday(ws)) === localISO(currentMonday());
    }

    /** Domingo de la semana que empieza en `weekStart`. */
    function weekEnd(weekStart) {
        const ws = parseWeek(weekStart);
        return new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
    }

    global.DateUtils = {
        DIA_KEYS,
        getMonday,
        currentMonday,
        nextMonday,
        localISO,
        parseWeek,
        todayKey,
        isCurrentWeek,
        weekEnd,
    };
})(window);
