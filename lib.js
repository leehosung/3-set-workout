// Pure utility functions extracted for testability.
// Loaded by index.html as a plain script (no module syntax) so functions
// become globals in the browser.  In Node/Jest they are exported via the
// CommonJS conditional at the bottom.

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
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return (
    `${d.getFullYear()}.` +
    `${String(d.getMonth() + 1).padStart(2, '0')}.` +
    `${String(d.getDate()).padStart(2, '0')} (${days[d.getDay()]})`
  );
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
  const latestLogs = logs.filter(l => l.date === latestDate);

  let latestGroupIdx = -1;
  groups.forEach((g, i) => {
    if (latestLogs.some(l => l.groupId === g.id)) latestGroupIdx = i;
  });

  if (latestGroupIdx === -1) return groups[0]?.id || null;
  return groups[(latestGroupIdx + 1) % groups.length].id;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { uid, todayStr, todayDisplay, getNextTargets, findNextGroupId };
}
