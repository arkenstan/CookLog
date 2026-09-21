import { eventPhase, formatAmount, stepFor } from '@cooklog/data-access';

const at = (h: number, dayOffset = 0) => {
  const d = new Date(2026, 8, 22 + dayOffset, h, 0, 0); // 22 Sep 2026, local time
  return d.toISOString();
};
const now = new Date(2026, 8, 22, 12, 0, 0);

describe('eventPhase', () => {
  it('is active for any not-cooked event later or earlier today', () => {
    expect(eventPhase({ starts_at: at(0), status: 'pending' }, now)).toBe('active');
    expect(eventPhase({ starts_at: at(23), status: 'locked' }, now)).toBe('active');
  });

  it('is upcoming from tomorrow 00:00 onwards', () => {
    expect(eventPhase({ starts_at: at(0, 1), status: 'pending' }, now)).toBe('upcoming');
    expect(eventPhase({ starts_at: at(9, 5), status: 'pending' }, now)).toBe('upcoming');
  });

  it('is completed for earlier days, or when cooked', () => {
    expect(eventPhase({ starts_at: at(23, -1), status: 'pending' }, now)).toBe('completed');
    expect(eventPhase({ starts_at: at(13), status: 'cooked' }, now)).toBe('completed');
    expect(eventPhase({ starts_at: at(9, 3), status: 'cooked' }, now)).toBe('completed');
  });
});

describe('item amounts', () => {
  it('steps by 1 for count and 0.5 for portion', () => {
    expect(stepFor('count')).toBe(1);
    expect(stepFor('portion')).toBe(0.5);
  });

  it('formats with singular/plural units', () => {
    expect(formatAmount('count', 1)).toBe('1 pc');
    expect(formatAmount('count', 4)).toBe('4 pcs');
    expect(formatAmount('portion', 1)).toBe('1 portion');
    expect(formatAmount('portion', 1.5)).toBe('1.5 portions');
    expect(formatAmount('portion', 2)).toBe('2 portions');
  });
});
