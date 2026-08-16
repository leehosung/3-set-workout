const { remainingSeconds, elapsedSeconds } = require('../lib');

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
