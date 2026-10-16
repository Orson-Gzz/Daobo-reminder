import { describe, expect, it } from 'vitest';
import { DUE_PRESETS, dueTimestamp, formatAge, formatDue, isDueToday, isOverdue, nextOccurrence } from './dates';

// Thursday, Oct 15 2026, 14:30 local time.
const NOW = new Date(2026, 9, 15, 14, 30).getTime();

describe('isOverdue', () => {
  it('treats all-day items as overdue only after their day ends', () => {
    expect(isOverdue({ dueDate: '2026-10-15', dueTime: null }, NOW)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-14', dueTime: null }, NOW)).toBe(true);
  });

  it('compares timed items to the minute', () => {
    expect(isOverdue({ dueDate: '2026-10-15', dueTime: '14:00' }, NOW)).toBe(true);
    expect(isOverdue({ dueDate: '2026-10-15', dueTime: '15:00' }, NOW)).toBe(false);
  });

  it('is never overdue without a date', () => {
    expect(isOverdue({ dueDate: null, dueTime: null }, NOW)).toBe(false);
  });
});

describe('isDueToday / dueTimestamp', () => {
  it('detects today', () => {
    expect(isDueToday({ dueDate: '2026-10-15' }, NOW)).toBe(true);
    expect(isDueToday({ dueDate: '2026-10-16' }, NOW)).toBe(false);
  });

  it('notifies all-day items at 09:00', () => {
    expect(dueTimestamp({ dueDate: '2026-10-16', dueTime: null })).toBe(new Date(2026, 9, 16, 9, 0).getTime());
    expect(dueTimestamp({ dueDate: '2026-10-16', dueTime: '17:45' })).toBe(new Date(2026, 9, 16, 17, 45).getTime());
  });
});

describe('formatDue', () => {
  it('uses relative words near today', () => {
    expect(formatDue({ dueDate: '2026-10-15', dueTime: null }, NOW)).toBe('Today');
    expect(formatDue({ dueDate: '2026-10-16', dueTime: null }, NOW)).toBe('Tomorrow');
    expect(formatDue({ dueDate: '2026-10-14', dueTime: null }, NOW)).toBe('Yesterday');
    expect(formatDue({ dueDate: '2026-10-19', dueTime: null }, NOW)).toBe('Mon');
    expect(formatDue({ dueDate: '2026-11-03', dueTime: null }, NOW)).toBe('Nov 3');
    expect(formatDue({ dueDate: '2027-01-05', dueTime: null }, NOW)).toBe('Jan 5, 2027');
  });

  it('appends the time when set', () => {
    expect(formatDue({ dueDate: '2026-10-16', dueTime: '15:00' }, NOW)).toBe('Tomorrow 3:00 PM');
  });
});

describe('formatAge', () => {
  it('compacts durations', () => {
    expect(formatAge(new Date(2026, 9, 15, 8).toISOString(), NOW)).toBe('today');
    expect(formatAge(new Date(2026, 9, 12).toISOString(), NOW)).toBe('3d');
    expect(formatAge(new Date(2026, 8, 20).toISOString(), NOW)).toBe('3w');
    expect(formatAge(new Date(2026, 5, 1).toISOString(), NOW)).toBe('4mo');
  });
});

describe('nextOccurrence', () => {
  it('returns null when not repeating', () => {
    expect(nextOccurrence('2026-10-15', 'none', NOW)).toBeNull();
  });

  it('advances from a due date of today', () => {
    expect(nextOccurrence('2026-10-15', 'daily', NOW)).toBe('2026-10-16');
    expect(nextOccurrence('2026-10-15', 'weekly', NOW)).toBe('2026-10-22');
    expect(nextOccurrence('2026-10-15', 'monthly', NOW)).toBe('2026-11-15');
    expect(nextOccurrence('2026-10-15', 'yearly', NOW)).toBe('2027-10-15');
  });

  it('skips past occurrences for overdue items', () => {
    expect(nextOccurrence('2026-10-01', 'daily', NOW)).toBe('2026-10-16');
    // Weekly on Mondays: Oct 5 → next Monday after today is Oct 19.
    expect(nextOccurrence('2026-10-05', 'weekly', NOW)).toBe('2026-10-19');
  });

  it('advances future items by one interval', () => {
    expect(nextOccurrence('2026-10-20', 'weekly', NOW)).toBe('2026-10-27');
  });

  it('clamps monthly repeats on the 31st to the month end', () => {
    const jan31 = new Date(2027, 0, 31, 10).getTime();
    expect(nextOccurrence('2027-01-31', 'monthly', jan31)).toBe('2027-02-28');
  });

  it('skips weekends for weekday repeats', () => {
    // Friday Oct 16 → Monday Oct 19.
    const friday = new Date(2026, 9, 16, 10).getTime();
    expect(nextOccurrence('2026-10-16', 'weekdays', friday)).toBe('2026-10-19');
    expect(nextOccurrence('2026-10-15', 'weekdays', NOW)).toBe('2026-10-16');
  });

  it('repeats from today when there is no due date', () => {
    expect(nextOccurrence(null, 'daily', NOW)).toBe('2026-10-16');
  });
});

describe('DUE_PRESETS', () => {
  it('next week means next Monday', () => {
    const preset = DUE_PRESETS.find((p) => p.label === 'Next week')!;
    expect(preset.get(new Date(NOW))).toEqual({ dueDate: '2026-10-19', dueTime: '09:00' });
    // From a Monday, go a full week ahead.
    expect(preset.get(new Date(2026, 9, 19, 8))).toEqual({ dueDate: '2026-10-26', dueTime: '09:00' });
  });

  it('in 1 hour rounds up to 5 minutes', () => {
    const preset = DUE_PRESETS.find((p) => p.label === 'In 1 hour')!;
    expect(preset.get(new Date(2026, 9, 15, 14, 32))).toEqual({ dueDate: '2026-10-15', dueTime: '15:35' });
  });
});
