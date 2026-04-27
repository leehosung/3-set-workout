// Pure utility functions extracted for testability.
// Loaded by index.html as a plain script (no module syntax) so functions
// become globals in the browser.  In Node/Jest they are exported via the
// CommonJS conditional at the bottom.

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    '-' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(d.getDate()).padStart(2, '0')
  );
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

// Returns the ISO date string for N days ago (YYYY-MM-DD).
function dateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
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

// Pure version of getDefaultGroupId: given logs array and groups array,
// returns the id of the group that should be shown next.
function findNextGroupId(logs, groups) {
  if (!logs.length) return groups[0]?.id || null;

  const latestDate = logs.reduce((max, l) => (l.date > max ? l.date : max), '');
  const latestGroupIds = new Set(
    logs.filter(l => l.date === latestDate).map(l => l.groupId)
  );

  let latestGroupIdx = -1;
  groups.forEach((g, i) => {
    if (latestGroupIds.has(g.id)) latestGroupIdx = i;
  });

  if (latestGroupIdx === -1) return groups[0]?.id || null;
  return groups[(latestGroupIdx + 1) % groups.length].id;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uid, todayStr, todayDisplay, logKey, dateNDaysAgo,
    getUnitSuffix, setResultClass, getNextTargets, findNextGroupId,
  };
}
