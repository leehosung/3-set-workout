const {
  uid, todayStr, todayDisplay, logKey, dateNDaysAgo,
  getUnitSuffix, setResultClass, getNextTargets, findNextGroupId,
} = require('../lib');

// ==================== uid ====================
describe('uid', () => {
  it('returns a non-empty string', () => {
    expect(typeof uid()).toBe('string');
    expect(uid().length).toBeGreaterThan(0);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});

// ==================== todayStr ====================
describe('todayStr', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('matches the current date', () => {
    const d = new Date();
    const expected =
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
    expect(todayStr()).toBe(expected);
  });
});

// ==================== todayDisplay ====================
describe('todayDisplay', () => {
  it('returns YYYY.MM.DD (요일) format', () => {
    expect(todayDisplay()).toMatch(/^\d{4}\.\d{2}\.\d{2} \([일월화수목금토]\)$/);
  });

  it('has the correct day-of-week', () => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const expected = days[new Date().getDay()];
    expect(todayDisplay()).toContain(`(${expected})`);
  });
});

// ==================== logKey ====================
describe('logKey', () => {
  it('combines date and groupId', () => {
    expect(logKey('g1', '2026-04-27')).toBe('2026-04-27:g1');
  });

  it('uses todayStr() when date is omitted', () => {
    expect(logKey('g2')).toBe(todayStr() + ':g2');
  });
});

// ==================== dateNDaysAgo ====================
describe('dateNDaysAgo', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(dateNDaysAgo(30)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns a date in the past', () => {
    expect(dateNDaysAgo(1) < todayStr()).toBe(true);
  });

  it('returns today when n=0', () => {
    expect(dateNDaysAgo(0)).toBe(todayStr());
  });
});

// ==================== getUnitSuffix ====================
describe('getUnitSuffix', () => {
  it('returns 초 for seconds', () => {
    expect(getUnitSuffix('seconds')).toBe('초');
  });

  it('returns empty string for reps', () => {
    expect(getUnitSuffix('reps')).toBe('');
  });
});

// ==================== setResultClass ====================
describe('setResultClass', () => {
  it('returns exceed when actual > target', () => {
    expect(setResultClass(11, 10)).toBe('exceed');
  });

  it('returns done when actual === target', () => {
    expect(setResultClass(10, 10)).toBe('done');
  });

  it('returns partial when actual < target', () => {
    expect(setResultClass(9, 10)).toBe('partial');
  });
});

// ==================== getNextTargets ====================
describe('getNextTargets', () => {
  const GAP = 5;
  const STEP = 1;

  it('raises set2 when set1-set2 gap exceeds setGap', () => {
    expect(getNextTargets([20, 10, 8], GAP, STEP)).toEqual([20, 11, 8]);
  });

  it('raises set3 when set2-set3 gap exceeds setGap (and set1-set2 gap is fine)', () => {
    expect(getNextTargets([20, 15, 5], GAP, STEP)).toEqual([20, 15, 6]);
  });

  it('raises set1 when both gaps are within setGap', () => {
    expect(getNextTargets([20, 15, 10], GAP, STEP)).toEqual([21, 15, 10]);
  });

  it('applies custom progressStep', () => {
    expect(getNextTargets([20, 15, 10], GAP, 5)).toEqual([25, 15, 10]);
  });

  it('handles seconds progression (setGap=10, step=5)', () => {
    expect(getNextTargets([60, 50, 30], 10, 5)).toEqual([60, 50, 35]);
  });

  it('handles seconds where both gaps are fine → raise set1', () => {
    expect(getNextTargets([60, 50, 40], 10, 5)).toEqual([65, 50, 40]);
  });

  it('priority: raises set2 before set3 when both gaps exceed setGap', () => {
    expect(getNextTargets([30, 10, 5], GAP, STEP)).toEqual([30, 11, 5]);
  });
});

// ==================== findNextGroupId ====================
describe('findNextGroupId', () => {
  const groups = [
    { id: 'g1', name: 'Group 1' },
    { id: 'g2', name: 'Group 2' },
    { id: 'g3', name: 'Group 3' },
  ];

  it('returns first group when logs are empty', () => {
    expect(findNextGroupId([], groups)).toBe('g1');
  });

  it('returns next group after the last worked-out group', () => {
    const logs = [
      { date: '2026-04-26', groupId: 'g1' },
      { date: '2026-04-27', groupId: 'g2' },
    ];
    expect(findNextGroupId(logs, groups)).toBe('g3');
  });

  it('wraps around to first group after the last group', () => {
    const logs = [{ date: '2026-04-27', groupId: 'g3' }];
    expect(findNextGroupId(logs, groups)).toBe('g1');
  });

  it('ignores older dates and uses only the latest date', () => {
    const logs = [
      { date: '2026-04-25', groupId: 'g3' },
      { date: '2026-04-27', groupId: 'g1' },
    ];
    expect(findNextGroupId(logs, groups)).toBe('g2');
  });

  it('returns first group when latest date logs have no matching group', () => {
    const logs = [{ date: '2026-04-27', groupId: 'unknown-group' }];
    expect(findNextGroupId(logs, groups)).toBe('g1');
  });

  it('handles multiple groups worked on the same day, picks last in routine order', () => {
    const logs = [
      { date: '2026-04-27', groupId: 'g1' },
      { date: '2026-04-27', groupId: 'g2' },
    ];
    expect(findNextGroupId(logs, groups)).toBe('g3');
  });

  it('returns null when groups array is empty', () => {
    const logs = [{ date: '2026-04-27', groupId: 'g1' }];
    expect(findNextGroupId(logs, [])).toBeNull();
  });
});
