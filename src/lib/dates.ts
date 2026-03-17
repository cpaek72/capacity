import {
  format,
  formatDistanceToNow,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isToday as fnsIsToday,
  isSameDay as fnsIsSameDay,
  differenceInDays,
  parseISO,
  subDays,
} from 'date-fns';

export const formatDate = (date: string | Date, fmt: string = 'MMM d, yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, fmt);
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'h:mm a');
};

export const formatRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
};

export const getWeekRange = (date: Date = new Date()) => ({
  start: startOfWeek(date, { weekStartsOn: 1 }),
  end: endOfWeek(date, { weekStartsOn: 1 }),
});

export const getMonthRange = (date: Date = new Date()) => ({
  start: startOfMonth(date),
  end: endOfMonth(date),
});

export const isToday = (date: string | Date): boolean => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return fnsIsToday(d);
};

export const isSameDay = (a: string | Date, b: string | Date): boolean => {
  const da = typeof a === 'string' ? parseISO(a) : a;
  const db = typeof b === 'string' ? parseISO(b) : b;
  return fnsIsSameDay(da, db);
};

export const getDaysBetween = (start: string | Date, end: string | Date): number => {
  const s = typeof start === 'string' ? parseISO(start) : start;
  const e = typeof end === 'string' ? parseISO(end) : end;
  return differenceInDays(e, s);
};

export const getDateNDaysAgo = (n: number): Date => subDays(new Date(), n);

export const toISODateString = (date: Date = new Date()): string => format(date, 'yyyy-MM-dd');
