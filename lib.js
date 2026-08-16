// Pure utility functions extracted for testability.
// Loaded by index.html as a plain script (no module syntax) so functions
// become globals in the browser.  In Node/Jest they are exported via the
// CommonJS conditional at the bottom.

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Formats a Date as YYYY-MM-DD in local time.  Deliberately not toISOString(),
// which formats in UTC and shifts the date for anyone east or west of GMT.
function dateStr(d) {
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
}

// Parses a YYYY-MM-DD string into a local-midnight Date.
function parseDate(s) {
  return new Date(s + 'T00:00:00');
}

// Returns the given date shifted by n days (negative = past), as YYYY-MM-DD.
function shiftDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function todayStr() {
  return dateStr(new Date());
}

function todayDisplay() {
  const d = new Date();
  return (
    `${d.getFullYear()}.` +
    `${String(d.getMonth() + 1).padStart(2, '0')}.` +
    `${String(d.getDate()).padStart(2, '0')} (${WEEK_DAYS[d.getDay()]})`
  );
}

// Returns the storage key for a given date + group.
function logKey(groupId, date) {
  return (date || todayStr()) + ':' + groupId;
}

// Returns the date string for N days ago (YYYY-MM-DD), in local time.
function dateNDaysAgo(n) {
  return shiftDays(todayStr(), -n);
}

// Returns the display suffix for a unit ('초' for seconds, '' otherwise).
function getUnitSuffix(unit) {
  return unit === 'seconds' ? '초' : '';
}

// Returns the CSS class for a set result based on actual vs target.
function setResultClass(actual, target) {
  if (actual > target) return 'exceed';
  if (actual === target) return 'done';
  return 'partial';
}

// Returns next 3-set targets following the rotation: raise set2 gap → set3 gap → set1.
function getNextTargets(targets, setGap, progressStep) {
  const [a, b, c] = targets;
  if (a - b > setGap) return [a, b + progressStep, c];
  if (b - c > setGap) return [a, b, c + progressStep];
  return [a + progressStep, b, c];
}

// Returns true when a log has at least one recorded set.  Merely opening a
// group creates a log with all-null actuals, which must not count as a workout.
function hasRecordedSet(log) {
  return !!log.entries && log.entries.some(e => e.actuals.some(a => a !== null));
}

// Pure version of getDefaultGroupId: given logs array and groups array,
// returns the id of the group that should be shown next.  If the most recent
// workout happened today the same group is returned, so an in-progress session
// is never switched away mid-workout.
function findNextGroupId(logs, groups, today) {
  const recorded = logs.filter(hasRecordedSet);
  if (!recorded.length) return groups[0]?.id || null;

  const latestDate = recorded.reduce((max, l) => (l.date > max ? l.date : max), '');
  const latestGroupIds = new Set(
    recorded.filter(l => l.date === latestDate).map(l => l.groupId)
  );

  let latestGroupIdx = -1;
  groups.forEach((g, i) => {
    if (latestGroupIds.has(g.id)) latestGroupIdx = i;
  });

  if (latestGroupIdx === -1) return groups[0]?.id || null;
  if (latestDate === (today || todayStr())) return groups[latestGroupIdx].id;
  return groups[(latestGroupIdx + 1) % groups.length].id;
}

// ==================== Statistics ====================

// Number of sets actually recorded in a log (nulls are untouched sets).
function countRecordedSets(log) {
  if (!log.entries) return 0;
  return log.entries.reduce(
    (n, e) => n + e.actuals.filter(a => a !== null).length, 0
  );
}

// Maps a day's recorded-set count to a heatmap shade (0 = none, 4 = darkest).
// A typical group is 2 exercises x 3 sets = 6, so 7+ is a heavy day.
function heatLevel(sets) {
  if (sets <= 0) return 0;
  if (sets <= 2) return 1;
  if (sets <= 4) return 2;
  if (sets <= 6) return 3;
  return 4;
}

// Builds a GitHub-style contribution grid: an array of week columns, each a
// 7-slot array running Sunday..Saturday.  Slots after `today` are null so the
// current week renders as a partial column.
function buildHeatmap(logs, weeks, today) {
  const end = today || todayStr();

  const byDate = new Map();
  logs.forEach(l => {
    const n = countRecordedSets(l);
    if (n > 0) byDate.set(l.date, (byDate.get(l.date) || 0) + n);
  });

  // Saturday of the week containing `end` — the grid's bottom-right corner.
  const lastSat = shiftDays(end, 6 - parseDate(end).getDay());

  const cols = [];
  for (let c = 0; c < weeks; c++) {
    const col = [];
    for (let r = 0; r < 7; r++) {
      const date = shiftDays(lastSat, -((weeks - 1 - c) * 7 + (6 - r)));
      col.push(date > end ? null : { date, sets: byDate.get(date) || 0 });
    }
    cols.push(col);
  }
  return cols;
}

// Workout-day counts.  A day counts once no matter how many groups were done.
function workoutStats(logs, today) {
  const end = today || todayStr();

  const days = new Set();
  logs.forEach(l => { if (hasRecordedSet(l)) days.add(l.date); });
  const sorted = [...days].sort();

  // Week starts Monday, so shift Sunday (getDay() 0) to the end.
  const monday = shiftDays(end, -((parseDate(end).getDay() + 6) % 7));
  const cutoff30 = shiftDays(end, -29);

  const inRange = (from) => sorted.filter(d => d >= from && d <= end).length;

  return {
    total: sorted.length,
    thisWeek: inRange(monday),
    last30: inRange(cutoff30),
    lastDate: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

// Target history per exercise.  Each log entry carries the targets that were in
// effect that day, so the progression curve can be rebuilt from the logs alone.
// Only days with a recorded set count — untouched logs would flat-line the chart.
function buildTargetTrends(logs) {
  const byId = new Map();

  logs
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(log => {
      (log.entries || []).forEach(e => {
        if (!e.actuals.some(a => a !== null)) return;
        if (!byId.has(e.exerciseId)) {
          byId.set(e.exerciseId, {
            exerciseId: e.exerciseId,
            name: e.exerciseName,
            unit: e.unit,
            points: [],
          });
        }
        const trend = byId.get(e.exerciseId);
        trend.name = e.exerciseName;  // keep the most recent name
        trend.points.push({
          date: log.date,
          sum: e.targets.reduce((a, b) => a + b, 0),
          targets: [...e.targets],
        });
      });
    });

  return [...byId.values()].map(t => ({
    ...t,
    delta: t.points[t.points.length - 1].sum - t.points[0].sum,
  }));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uid, dateStr, parseDate, shiftDays, todayStr, todayDisplay, logKey, dateNDaysAgo,
    getUnitSuffix, setResultClass, getNextTargets, hasRecordedSet, findNextGroupId,
    countRecordedSets, heatLevel, buildHeatmap, workoutStats, buildTargetTrends,
  };
}
