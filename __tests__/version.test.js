const fs = require('fs');
const path = require('path');

// index.html은 lib.js를 '?v=' 쿼리와 함께 불러온다. 두 파일은 브라우저에서
// 따로 캐시되므로, 이 값이 APP_VERSION과 어긋나면 새 index.html이 오래된
// lib.js를 계속 쓰게 된다. 손으로 맞추면 언젠가 어긋나므로 여기서 검사한다.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

describe('version consistency', () => {
  const appVersionMatch = html.match(/const APP_VERSION = '([^']+)'/);
  const libSrcMatch = html.match(/src="lib\.js\?v=([^"]+)"/);

  it('declares APP_VERSION', () => {
    expect(appVersionMatch).not.toBeNull();
  });

  it('uses the vMAJOR.MINOR format from CLAUDE.md', () => {
    expect(appVersionMatch[1]).toMatch(/^v\d+\.\d+$/);
  });

  it('cache-busts lib.js', () => {
    expect(libSrcMatch).not.toBeNull();
  });

  it('cache-busts lib.js with the current APP_VERSION', () => {
    expect(`v${libSrcMatch[1]}`).toBe(appVersionMatch[1]);
  });

  it('leaves no un-versioned lib.js reference behind', () => {
    expect(html).not.toMatch(/src="lib\.js"/);
  });
});
