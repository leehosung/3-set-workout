const { remainingSeconds, elapsedSeconds, beepSecond } = require('../lib');

// A fixed epoch so the tests never depend on the real clock.
const T0 = 1_000_000;

// ==================== remainingSeconds ====================
describe('remainingSeconds', () => {
  it('returns the full target at the moment it starts', () => {
    expect(remainingSeconds(T0, T0, 70)).toBe(70);
  });

  it('counts down as time passes', () => {
    expect(remainingSeconds(T0, T0 + 10_000, 70)).toBe(60);
  });

  it('returns a fractional remainder mid-second', () => {
    expect(remainingSeconds(T0, T0 + 10_500, 70)).toBe(59.5);
  });

  it('clamps to 0 once the target is reached', () => {
    expect(remainingSeconds(T0, T0 + 70_000, 70)).toBe(0);
  });

  it('never goes negative when overshooting', () => {
    expect(remainingSeconds(T0, T0 + 200_000, 70)).toBe(0);
  });
});

// ==================== elapsedSeconds ====================
describe('elapsedSeconds', () => {
  it('returns 0 when stopped immediately', () => {
    expect(elapsedSeconds(T0, T0, 70)).toBe(0);
  });

  it('returns 0 when stopped within the first half second', () => {
    expect(elapsedSeconds(T0, T0 + 400, 70)).toBe(0);
  });

  it('rounds to the nearest second', () => {
    expect(elapsedSeconds(T0, T0 + 12_400, 70)).toBe(12);
    expect(elapsedSeconds(T0, T0 + 12_600, 70)).toBe(13);
  });

  it('caps at the target so a late stop cannot exceed it', () => {
    expect(elapsedSeconds(T0, T0 + 90_000, 70)).toBe(70);
  });

  it('never returns a negative value', () => {
    expect(elapsedSeconds(T0, T0 - 5_000, 70)).toBe(0);
  });
});

// ==================== beepSecond ====================
describe('beepSecond', () => {
  const LAST_N = 10;

  it('stays silent while more than lastN seconds remain', () => {
    expect(beepSecond(30, null, LAST_N)).toBeNull();
    expect(beepSecond(10.4, null, LAST_N)).toBeNull();  // ceil 11
  });

  it('announces the second the countdown enters the window', () => {
    expect(beepSecond(10, null, LAST_N)).toBe(10);
    expect(beepSecond(9.6, null, LAST_N)).toBe(10);
  });

  it('does not repeat a second already announced', () => {
    expect(beepSecond(9.9, 10, LAST_N)).toBeNull();
    expect(beepSecond(9.1, 10, LAST_N)).toBeNull();
  });

  it('announces the next second once it is reached', () => {
    expect(beepSecond(8.9, 10, LAST_N)).toBe(9);
  });

  it('announces every second down to 1', () => {
    let last = null;
    const fired = [];
    // 10.0초부터 0까지 0.1초 간격으로 흘려보낸다.
    for (let t = 100; t >= 0; t--) {
      const sec = beepSecond(t / 10, last, LAST_N);
      if (sec !== null) { fired.push(sec); last = sec; }
    }
    expect(fired).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('stays silent at and past zero (completion has its own cue)', () => {
    expect(beepSecond(0, 1, LAST_N)).toBeNull();
    expect(beepSecond(-3, 1, LAST_N)).toBeNull();
  });

  it('honours a different window size', () => {
    expect(beepSecond(5, null, 3)).toBeNull();
    expect(beepSecond(3, null, 3)).toBe(3);
  });
});
