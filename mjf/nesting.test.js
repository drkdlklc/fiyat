// Çalıştırma: node mjf/nesting.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('./nesting.js');

function boxTris(sx, sy, sz) {
  const v = [[0,0,0],[sx,0,0],[sx,sy,0],[0,sy,0],[0,0,sz],[sx,0,sz],[sx,sy,sz],[0,sy,sz]];
  const f = [[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]];
  const out = []; for (const t of f) for (const i of t) out.push(...v[i]);
  return Float32Array.from(out);
}
function binarySTL(tris) {
  const n = tris.length / 9;
  const buf = Buffer.alloc(84 + 50 * n); buf.writeUInt32LE(n, 80);
  let off = 84;
  for (let i = 0; i < n; i++) { off += 12; for (let k = 0; k < 9; k++) { buf.writeFloatLE(tris[i * 9 + k], off); off += 4; } off += 2; }
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}
function asciiSTL(tris) {
  let s = 'solid t\n';
  for (let i = 0; i < tris.length; i += 9) {
    s += ' facet normal 0 0 0\n  outer loop\n';
    for (let k = 0; k < 3; k++) s += `   vertex ${tris[i + k * 3]} ${tris[i + k * 3 + 1]} ${tris[i + k * 3 + 2]}\n`;
    s += '  endloop\n endfacet\n';
  }
  const b = Buffer.from(s + 'endsolid t\n');
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

test('binary ve ASCII STL aynı üçgenleri verir', () => {
  const box = boxTris(50, 30, 20);
  assert.deepEqual(Array.from(N.parseSTL(binarySTL(box))), Array.from(box));
  assert.deepEqual(Array.from(N.parseSTL(asciiSTL(box))), Array.from(box));
});

test('hacim ve yüzey alanı', () => {
  const s = N.meshStats(boxTris(50, 30, 20));
  assert.ok(Math.abs(s.volume - 30000) < 1e-6);
  assert.ok(Math.abs(s.area - 6200) < 1e-6);
});

test('fitCount boşluk hesabı', () => {
  assert.equal(N.fitCount(50, 360, 5), 6);   // 6*50 + 5*5 = 325 <= 360, 7 sığmaz
  assert.equal(N.fitCount(30, 264, 5), 7);
  assert.equal(N.fitCount(400, 360, 5), 0);
  assert.equal(N.fitCount(360, 360, 5), 1);
});

test('pack2D: düz ızgara ve karışık şerit', () => {
  const plain = N.pack2D(50, 30, 360, 264, 5, false);
  assert.equal(plain.count, 42);
  const mixed = N.pack2D(50, 30, 360, 264, 5, true);
  assert.equal(mixed.count, 46); // sağdaki 30 mm şeride 4 adet 90° çevrilmiş
  assert.equal(mixed.rects.filter((r) => r.rot).length, 4);
  // dikdörtgenler alan içinde ve çakışmıyor
  for (const a of mixed.rects) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 360 + 1e-9 && a.y + a.l <= 264 + 1e-9);
    for (const b of mixed.rects) {
      if (a === b) continue;
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.l && b.y < a.y + a.l;
      assert.ok(!overlap);
    }
  }
});

test('yatırma olmadan 50x30x20 kutu MJF 5600: 46 × 14 = 644', () => {
  const r = N.computeNesting(boxTris(50, 30, 20), { tiltX: 0, tiltY: 0 });
  assert.equal(r.perLayer, 46);
  assert.equal(r.layers, 14);
  assert.equal(r.total, 644);
});

test('25°/25° yatırma kutuyu büyütür, adet düşer', () => {
  const r = N.computeNesting(boxTris(50, 30, 20), {});
  assert.ok(r.height > 20 && r.height < 50);
  assert.ok(r.total > 0 && r.total < 644);
  assert.equal(r.rects.length, r.perLayer);
});

test('çapraz sığan uzun parça ve hiç sığmayan parça', () => {
  // 400 mm çubuk 360×264 alana çapraz (köşegen ≈ 446 mm) sığar
  assert.ok(N.computeNesting(boxTris(400, 30, 20), { tiltX: 0, tiltY: 0 }).total > 0);
  const r = N.computeNesting(boxTris(500, 30, 20), { tiltX: 0, tiltY: 0 });
  assert.equal(r.total, 0);
});

test('büyük mesh: ızgara zarf kaba kuvvetle uyuşur ve hızlıdır', () => {
  const M = 200000;
  const pts = new Float32Array(M * 9);
  for (let i = 0; i < pts.length; i += 3) {
    const u = Math.random() * Math.PI * 2, v = Math.acos(2 * Math.random() - 1);
    pts[i] = 40 * Math.sin(v) * Math.cos(u); pts[i + 1] = 25 * Math.sin(v) * Math.sin(u); pts[i + 2] = 15 * Math.cos(v);
  }
  const tilted = N.tiltPoints(pts, 25, 25);
  const t0 = Date.now();
  const { hull, tolerance } = N.convexHullXY(tilted);
  assert.ok(Date.now() - t0 < 2000);
  for (const th of [0, 33, 90, 141]) {
    const c = Math.cos(th * Math.PI / 180), s = Math.sin(th * Math.PI / 180);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < tilted.length; i += 3) {
      const x = tilted[i] * c - tilted[i + 1] * s, y = tilted[i] * s + tilted[i + 1] * c;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const e = N.hullExtentAt(hull, th);
    assert.ok(maxX - minX - e.w <= tolerance + 1e-6);
    assert.ok(maxY - minY - e.l <= tolerance + 1e-6);
  }
});
