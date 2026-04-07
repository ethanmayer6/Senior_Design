import type { ClassScheduleEntry } from '../api/classScheduleApi';

export type WeekdayCode = 'M' | 'T' | 'W' | 'R' | 'F' | 'S' | 'U';

export const WEEKDAY_COLUMNS: Array<{ code: WeekdayCode; label: string; fullLabel: string }> = [
  { code: 'M', label: 'Mon', fullLabel: 'Monday' },
  { code: 'T', label: 'Tue', fullLabel: 'Tuesday' },
  { code: 'W', label: 'Wed', fullLabel: 'Wednesday' },
  { code: 'R', label: 'Thu', fullLabel: 'Thursday' },
  { code: 'F', label: 'Fri', fullLabel: 'Friday' },
  { code: 'S', label: 'Sat', fullLabel: 'Saturday' },
  { code: 'U', label: 'Sun', fullLabel: 'Sunday' },
];

export function getCurrentTerm(date: Date): 'SPRING' | 'SUMMER' | 'FALL' {
  const month = date.getMonth() + 1;
  if (month <= 5) return 'SPRING';
  if (month <= 8) return 'SUMMER';
  return 'FALL';
}

export function getCurrentDayCode(date: Date): WeekdayCode {
  const codeByDayIndex: WeekdayCode[] = ['U', 'M', 'T', 'W', 'R', 'F', 'S'];
  return codeByDayIndex[date.getDay()] ?? 'M';
}

export function parseScheduleDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dayOfMonth = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || !Number.isInteger(dayOfMonth)) {
    return null;
  }

  const parsed = new Date(year, monthIndex, dayOfMonth, 12, 0, 0, 0);
  if (
    parsed.getFullYear() !== year
    || parsed.getMonth() !== monthIndex
    || parsed.getDate() !== dayOfMonth
  ) {
    return null;
  }

  return parsed;
}

export function getScheduleWeekStart(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(12, 0, 0, 0);
  const dayIndex = normalized.getDay();
  const offsetToMonday = dayIndex === 0 ? -6 : 1 - dayIndex;
  normalized.setDate(normalized.getDate() + offsetToMonday);
  return normalized;
}

export function parseScheduleMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) return null;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3];
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
    return null;
  }

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0;
  } else if (meridiem === 'PM') {
    if (hours < 12) hours += 12;
  }

  if (hours < 0 || hours >= 24) return null;
  return hours * 60 + minutes;
}

export function formatScheduleTime(minutes: number): string {
  const normalizedHours = Math.floor(minutes / 60);
  const normalizedMinutes = minutes % 60;
  const suffix = normalizedHours >= 12 ? 'PM' : 'AM';
  const displayHours = normalizedHours % 12 === 0 ? 12 : normalizedHours % 12;
  return `${displayHours}:${String(normalizedMinutes).padStart(2, '0')} ${suffix}`;
}

export function parseMeetingDays(raw: string | null | undefined): WeekdayCode[] {
  if (!raw) return [];
  const compact = raw.toUpperCase().replace(/[^A-Z]/g, '');
  if (!compact || /(TBA|ARR|ONLINE|ASYNCHRONOUS)/.test(compact)) {
    return [];
  }

  const normalized = compact
    .replace(/SUNDAY|SUN/g, 'U')
    .replace(/SATURDAY|SAT/g, 'S')
    .replace(/THURSDAY|THURS|THUR|TH/g, 'R')
    .replace(/TUESDAY|TUES|TUE/g, 'T')
    .replace(/MONDAY|MON/g, 'M')
    .replace(/WEDNESDAY|WEDS|WED/g, 'W')
    .replace(/FRIDAY|FRI/g, 'F');

  const seen = new Set<WeekdayCode>();
  const result: WeekdayCode[] = [];
  normalized.split('').forEach((character) => {
    const code = character as WeekdayCode;
    if (!WEEKDAY_COLUMNS.some((day) => day.code === code) || seen.has(code)) {
      return;
    }
    seen.add(code);
    result.push(code);
  });
  return result;
}

export function isCustomScheduleEntry(entry: ClassScheduleEntry | null | undefined): boolean {
  return entry?.entryType === 'CUSTOM_EVENT';
}

function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function entryOccursOnDate(entry: ClassScheduleEntry, date: Date): boolean {
  if (isCustomScheduleEntry(entry)) {
    if (!entry.customEventDate) {
      return false;
    }
    return entry.customEventDate === formatLocalDateKey(date);
  }
  return parseMeetingDays(entry.meetingDays).includes(getCurrentDayCode(date));
}

export function getScheduleEntryPrimaryLabel(entry: ClassScheduleEntry): string {
  if (isCustomScheduleEntry(entry) && entry.customEventTitle) {
    return entry.customEventTitle;
  }
  return entry.courseIdent || entry.sectionCode || 'Course';
}

export function getScheduleEntrySecondaryLabel(entry: ClassScheduleEntry): string {
  if (isCustomScheduleEntry(entry)) {
    return entry.locations || entry.customEventNotes || 'Personal calendar event';
  }
  return entry.courseTitle || entry.catalogName || 'Untitled course';
}
