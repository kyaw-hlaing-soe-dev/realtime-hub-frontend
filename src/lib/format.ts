export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateKey(now: Date = new Date()): string {
  return toLocalDateKey(now);
}

export function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const parsed = parseDateKey(dateKey) ?? new Date();
  const shifted = new Date(parsed.getTime());
  shifted.setDate(shifted.getDate() + deltaDays);
  return toLocalDateKey(shifted);
}

export function extractDateKey(isoOrDate: string): string | null {
  if (!isoOrDate) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    return isoOrDate;
  }
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return null;
  return toLocalDateKey(date);
}

export function formatDateLabel(
  dateKey: string,
  todayKey: string = getTodayDateKey(),
): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  const formatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parsed);

  if (dateKey === todayKey) {
    return `Today · ${formatted}`;
  }
  if (dateKey === shiftDateKey(todayKey, -1)) {
    return `Yesterday · ${formatted}`;
  }
  if (dateKey === shiftDateKey(todayKey, 1)) {
    return `Tomorrow · ${formatted}`;
  }
  return formatted;
}

export function formatShortDateLabel(
  dateKey: string,
  todayKey: string = getTodayDateKey(),
): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;
  if (dateKey === todayKey) return 'Today';
  if (dateKey === shiftDateKey(todayKey, -1)) return 'Yesterday';
  if (dateKey === shiftDateKey(todayKey, 1)) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

export function formatKickoffTime(isoOrDate: string): string {
  if (!isoOrDate) return 'TBD';
  if (/^\d{2}:\d{2}$/.test(isoOrDate)) return isoOrDate;
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return 'TBD';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatDataUpdated(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return 'Data updated —';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Data updated —';

  const sameDay = toLocalDateKey(date) === toLocalDateKey(now);
  if (sameDay) {
    const time = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return `Data updated ${time}`;
  }

  const full = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
  return `Data updated ${full}`;
}

export function formatMatchMinute(
  minute: number | null,
  extraTime?: number | null,
): string {
  if (minute === null || Number.isNaN(minute)) return '—';
  if (extraTime && extraTime > 0) {
    return `${minute}+${extraTime}'`;
  }
  return `${minute}'`;
}

export function formatMatchdayLabel(matchday: string | number | undefined): string {
  if (matchday === undefined || matchday === null || matchday === '') {
    return '';
  }
  const text = String(matchday).trim();
  if (/^\d+$/.test(text)) {
    return `Matchday ${text}`;
  }
  return text;
}
