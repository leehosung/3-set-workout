const {
  uid, todayStr, todayDisplay, logKey, dateNDaysAgo,
  getUnitSuffix, setResultClass, getNextTargets, hasRecordedSet, findNextGroupId,
  dateStr, shiftDays, countRecordedSets, heatLevel, buildHeatmap,
  workoutStats, buildTargetTrends,
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

// ==================== hasRecordedSet ====================
describe('hasRecordedSet', () => {
  it('returns false for a log with no entries', () => {
    expect(hasRecordedSet({ date: '2026-04-27', groupId: 'g1' })).toBe(false);
    expect(hasRecordedSet({ date: '2026-04-27', groupId: 'g1', entries: [] })).toBe(false);
  });

  it('returns false when every actual is null', () => {
    const log = { entries: [{ actuals: [null, null, null] }, { actuals: [null, null, null] }] };
    expect(hasRecordedSet(log)).toBe(false);
  });

  it('returns true when at least one set is recorded', () => {
    const log = { entries: [{ actuals: [null, null, null] }, { actuals: [null, 8, null] }] };
    expect(hasRecordedSet(log)).toBe(true);
  });

  it('returns true for a recorded value of 0', () => {
    expect(hasRecordedSet({ entries: [{ actuals: [0, null, null] }] })).toBe(true);
  });
});

// ==================== findNextGroupId ====================
describe('findNextGroupId', () => {
  const groups = [
    { id: 'g1', name: 'Group 1' },
    { id: 'g2', name: 'Group 2' },
    { id: 'g3', name: 'Group 3' },
  ];

  // Builds a log that counts as an actual workout.
  const done = (date, groupId) => ({
    date, groupId, entries: [{ actuals: [10, 8, 6] }],
  });
  // Builds an untouched log, as created by merely opening a group.
  const opened = (date, groupId) => ({
    date, groupId, entries: [{ actuals: [null, null, null] }],
  });

  const TODAY = '2026-04-28';

  it('returns first group when logs are empty', () => {
    expect(findNextGroupId([], groups, TODAY)).toBe('g1');
  });

  it('returns next group after the last worked-out group', () => {
    const logs = [done('2026-04-26', 'g1'), done('2026-04-27', 'g2')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g3');
  });

  it('wraps around to first group after the last group', () => {
    expect(findNextGroupId([done('2026-04-27', 'g3')], groups, TODAY)).toBe('g1');
  });

  it('ignores older dates and uses only the latest date', () => {
    const logs = [done('2026-04-25', 'g3'), done('2026-04-27', 'g1')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g2');
  });

  it('returns first group when latest date logs have no matching group', () => {
    const logs = [done('2026-04-27', 'unknown-group')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g1');
  });

  it('handles multiple groups worked on the same day, picks last in routine order', () => {
    const logs = [done('2026-04-27', 'g1'), done('2026-04-27', 'g2')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g3');
  });

  it('returns null when groups array is empty', () => {
    expect(findNextGroupId([done('2026-04-27', 'g1')], [], TODAY)).toBeNull();
  });

  it('stays on the group already worked on today instead of advancing', () => {
    const logs = [done('2026-04-27', 'g1'), done(TODAY, 'g2')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g2');
  });

  it('stays on the last group of the day when several were worked today', () => {
    const logs = [done(TODAY, 'g1'), done(TODAY, 'g2')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g2');
  });

  it('does not wrap when the last group was worked today', () => {
    expect(findNextGroupId([done(TODAY, 'g3')], groups, TODAY)).toBe('g3');
  });

  it('ignores logs that were opened but never recorded', () => {
    const logs = [done('2026-04-27', 'g1'), opened(TODAY, 'g2')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g2');
  });

  it('returns first group when every log is untouched', () => {
    const logs = [opened(TODAY, 'g2'), opened(TODAY, 'g3')];
    expect(findNextGroupId(logs, groups, TODAY)).toBe('g1');
  });

  it('defaults to the real today when the date argument is omitted', () => {
    const logs = [done(todayStr(), 'g2')];
    expect(findNextGroupId(logs, groups)).toBe('g2');
  });
});

// ==================== dateStr / shiftDays ====================
describe('dateStr', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(dateStr(new Date(2026, 7, 16))).toBe('2026-08-16');
  });

  it('zero-pads month and day', () => {
    expect(dateStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('uses local time, not UTC', () => {
    // 23:30 local on the 16th is the 17th in UTC for anyone east of GMT.
    expect(dateStr(new Date(2026, 7, 16, 23, 30))).toBe('2026-08-16');
  });
});

describe('shiftDays', () => {
  it('moves forward', () => {
    expect(shiftDays('2026-08-16', 3)).toBe('2026-08-19');
  });

  it('moves backward', () => {
    expect(shiftDays('2026-08-16', -3)).toBe('2026-08-13');
  });

  it('crosses a month boundary', () => {
    expect(shiftDays('2026-08-01', -1)).toBe('2026-07-31');
  });

  it('crosses a year boundary', () => {
    expect(shiftDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('handles leap day', () => {
    expect(shiftDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

// ==================== countRecordedSets ====================
describe('countRecordedSets', () => {
  it('returns 0 for a log with no entries', () => {
    expect(countRecordedSets({})).toBe(0);
  });

  it('counts only non-null actuals', () => {
    const log = { entries: [{ actuals: [10, null, 6] }, { actuals: [null, null, null] }] };
    expect(countRecordedSets(log)).toBe(2);
  });

  it('counts a recorded 0 as a set', () => {
    expect(countRecordedSets({ entries: [{ actuals: [0, 0, null] }] })).toBe(2);
  });
});

// ==================== heatLevel ====================
describe('heatLevel', () => {
  it('returns 0 for no sets', () => {
    expect(heatLevel(0)).toBe(0);
  });

  it('scales up through four shades', () => {
    expect(heatLevel(1)).toBe(1);
    expect(heatLevel(2)).toBe(1);
    expect(heatLevel(3)).toBe(2);
    expect(heatLevel(4)).toBe(2);
    expect(heatLevel(5)).toBe(3);
    expect(heatLevel(6)).toBe(3);
    expect(heatLevel(7)).toBe(4);
    expect(heatLevel(30)).toBe(4);
  });
});

// ==================== buildHeatmap ====================
describe('buildHeatmap', () => {
  const done = (date, sets) => ({
    date, groupId: 'g1', entries: [{ actuals: sets }],
  });

  // 2026-08-16 is a Sunday, so its week runs 08-16 (Sun) .. 08-22 (Sat).
  const SUNDAY = '2026-08-16';

  it('returns one column per week, each 7 slots', () => {
    const grid = buildHeatmap([], 4, SUNDAY);
    expect(grid).toHaveLength(4);
    grid.forEach(col => expect(col).toHaveLength(7));
  });

  it('places today in the last column and nulls the rest of that week', () => {
    const grid = buildHeatmap([], 2, SUNDAY);
    const lastCol = grid[1];
    expect(lastCol[0].date).toBe(SUNDAY);
    expect(lastCol.slice(1).every(c => c === null)).toBe(true);
  });

  it('rows run Sunday to Saturday', () => {
    const grid = buildHeatmap([], 2, SUNDAY);
    const prevWeek = grid[0];
    expect(prevWeek[0].date).toBe('2026-08-09');
    expect(prevWeek[6].date).toBe('2026-08-15');
  });

  it('counts recorded sets onto the matching day', () => {
    const grid = buildHeatmap([done('2026-08-10', [10, 8, 6])], 2, SUNDAY);
    expect(grid[0][1]).toEqual({ date: '2026-08-10', sets: 3 });
  });

  it('sums multiple groups worked on the same day', () => {
    const logs = [done('2026-08-10', [10, 8, 6]), done('2026-08-10', [5, null, null])];
    expect(buildHeatmap(logs, 2, SUNDAY)[0][1].sets).toBe(4);
  });

  it('ignores logs with no recorded sets', () => {
    const grid = buildHeatmap([done('2026-08-10', [null, null, null])], 2, SUNDAY);
    expect(grid[0][1].sets).toBe(0);
  });

  it('ignores logs outside the window', () => {
    const grid = buildHeatmap([done('2020-01-01', [10, 8, 6])], 2, SUNDAY);
    const total = grid.flat().filter(Boolean).reduce((n, c) => n + c.sets, 0);
    expect(total).toBe(0);
  });

  it('keeps a full last column when today is a Saturday', () => {
    const grid = buildHeatmap([], 2, '2026-08-22');
    expect(grid[1].every(c => c !== null)).toBe(true);
    expect(grid[1][6].date).toBe('2026-08-22');
  });
});

// ==================== workoutStats ====================
describe('workoutStats', () => {
  const done = (date) => ({ date, entries: [{ actuals: [10, 8, 6] }] });
  const opened = (date) => ({ date, entries: [{ actuals: [null, null, null] }] });

  // 2026-08-19 is a Wednesday; its Monday is 2026-08-17.
  const WED = '2026-08-19';

  it('returns zeros for no logs', () => {
    expect(workoutStats([], WED)).toEqual({
      total: 0, thisWeek: 0, last30: 0, lastDate: null,
    });
  });

  it('counts a day once even if several groups were done', () => {
    const stats = workoutStats([done(WED), done(WED)], WED);
    expect(stats.total).toBe(1);
  });

  it('ignores logs with no recorded sets', () => {
    expect(workoutStats([opened(WED)], WED).total).toBe(0);
  });

  it('counts this week from Monday', () => {
    const logs = [done('2026-08-17'), done('2026-08-19'), done('2026-08-16')];
    expect(workoutStats(logs, WED).thisWeek).toBe(2);
  });

  it('treats Sunday as the end of the week, not the start', () => {
    // 2026-08-16 is a Sunday; its week starts Monday 2026-08-10.
    expect(workoutStats([done('2026-08-10')], '2026-08-16').thisWeek).toBe(1);
  });

  it('counts a 30-day window inclusive of both ends', () => {
    const logs = [done(shiftDays(WED, -29)), done(shiftDays(WED, -30))];
    expect(workoutStats(logs, WED).last30).toBe(1);
  });

  it('reports the most recent workout date', () => {
    const logs = [done('2026-08-10'), done('2026-08-17'), done('2026-08-12')];
    expect(workoutStats(logs, WED).lastDate).toBe('2026-08-17');
  });

  it('excludes days after the reference date', () => {
    expect(workoutStats([done('2026-09-01')], WED).total).toBe(1);
    expect(workoutStats([done('2026-09-01')], WED).thisWeek).toBe(0);
  });
});

// ==================== buildTargetTrends ====================
describe('buildTargetTrends', () => {
  const log = (date, targets, actuals, name) => ({
    date,
    entries: [{
      exerciseId: 'e1',
      exerciseName: name || '턱걸이',
      unit: 'reps',
      targets,
      actuals,
    }],
  });

  it('returns nothing when no sets were recorded', () => {
    const trends = buildTargetTrends([log('2026-08-10', [18, 12, 7], [null, null, null])]);
    expect(trends).toEqual([]);
  });

  it('builds one point per recorded day, oldest first', () => {
    const trends = buildTargetTrends([
      log('2026-08-12', [19, 12, 7], [19, 12, 7]),
      log('2026-08-10', [18, 12, 7], [18, 12, 7]),
    ]);
    expect(trends).toHaveLength(1);
    expect(trends[0].points.map(p => p.date)).toEqual(['2026-08-10', '2026-08-12']);
    expect(trends[0].points.map(p => p.sum)).toEqual([37, 38]);
  });

  it('reports the delta from first to last point', () => {
    const trends = buildTargetTrends([
      log('2026-08-10', [18, 12, 7], [18, 12, 7]),
      log('2026-08-12', [20, 12, 7], [20, 12, 7]),
    ]);
    expect(trends[0].delta).toBe(2);
  });

  it('reports a negative delta when targets were lowered', () => {
    const trends = buildTargetTrends([
      log('2026-08-10', [20, 12, 7], [20, 12, 7]),
      log('2026-08-12', [18, 12, 7], [18, 12, 7]),
    ]);
    expect(trends[0].delta).toBe(-2);
  });

  it('skips days with no recorded set but keeps the rest', () => {
    const trends = buildTargetTrends([
      log('2026-08-10', [18, 12, 7], [18, 12, 7]),
      log('2026-08-11', [19, 12, 7], [null, null, null]),
      log('2026-08-12', [19, 12, 7], [19, 12, 7]),
    ]);
    expect(trends[0].points).toHaveLength(2);
  });

  it('uses the most recent name when an exercise was renamed', () => {
    const trends = buildTargetTrends([
      log('2026-08-10', [18, 12, 7], [18, 12, 7], '턱걸이'),
      log('2026-08-12', [18, 12, 7], [18, 12, 7], '풀업'),
    ]);
    expect(trends[0].name).toBe('풀업');
  });

  it('tracks several exercises independently', () => {
    const trends = buildTargetTrends([{
      date: '2026-08-10',
      entries: [
        { exerciseId: 'a', exerciseName: 'A', unit: 'reps', targets: [10, 8, 6], actuals: [10, 8, 6] },
        { exerciseId: 'b', exerciseName: 'B', unit: 'seconds', targets: [60, 50, 40], actuals: [60, null, null] },
      ],
    }]);
    expect(trends).toHaveLength(2);
    expect(trends.find(t => t.exerciseId === 'b').unit).toBe('seconds');
  });
});
