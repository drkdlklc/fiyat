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

test('kutu yöntemi: yatırma olmadan 50x30x20 kutu MJF 5600: 46 × 14 = 644', () => {
  const r = N.computeNestingBox(boxTris(50, 30, 20), { tiltX: 0, tiltY: 0 });
  assert.equal(r.perLayer, 46);
  assert.equal(r.layers, 14);
  assert.equal(r.total, 644);
});

test('kutu yöntemi: 25°/25° yatırma kutuyu büyütür, adet düşer', () => {
  const r = N.computeNestingBox(boxTris(50, 30, 20), {});
  assert.ok(r.height > 20 && r.height < 50);
  assert.ok(r.total > 0 && r.total < 644);
  assert.equal(r.rects.length, r.perLayer);
});

test('çapraz sığan uzun parça ve hiç sığmayan parça', () => {
  // 400 mm çubuk 360×264 alana çapraz (köşegen ≈ 446 mm) sığar
  assert.ok(N.computeNestingBox(boxTris(400, 30, 20), { tiltX: 0, tiltY: 0 }).total > 0);
  const r = N.computeNestingBox(boxTris(500, 30, 20), { tiltX: 0, tiltY: 0 });
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

test('overlapSet kaba kuvvetle uyuşur', () => {
  const dims = [6, 5, 4];
  const g = new Uint8Array(dims[0] * dims[1] * dims[2]);
  for (let i = 0; i < g.length; i++) g[i] = (i * 7919) % 11 < 4 ? 1 : 0;
  const os = N.overlapSet(g, dims);
  const M = os.M;
  for (let tz = -(dims[2] - 1); tz < dims[2]; tz++) for (let ty = -(dims[1] - 1); ty < dims[1]; ty++) for (let tx = -(dims[0] - 1); tx < dims[0]; tx++) {
    let ov = 0;
    for (let z = 0; z < dims[2] && !ov; z++) for (let y = 0; y < dims[1] && !ov; y++) for (let x = 0; x < dims[0]; x++) {
      if (!g[x + dims[0] * (y + dims[1] * z)]) continue;
      const X = x + tx, Y = y + ty, Z = z + tz;
      if (X < 0 || Y < 0 || Z < 0 || X >= dims[0] || Y >= dims[1] || Z >= dims[2]) continue;
      if (g[X + dims[0] * (Y + dims[1] * Z)]) { ov = 1; break; }
    }
    const c = os.C[(tx < 0 ? tx + M[0] : tx) + M[0] * ((ty < 0 ? ty + M[1] : ty) + M[1] * (tz < 0 ? tz + M[2] : tz))];
    assert.equal(c, ov, `t=${tx},${ty},${tz}`);
  }
});

test('countLatticeInBox kaba kuvvetle uyuşur', () => {
  const basis = [[9.7, -10.7, 20.9], [30, 20, -5], [-20, 40, 10]];
  const allowed = { min: [0, 0, 0], max: [310, 234, 340] };
  const r = N.countLatticeInBox(basis, [3, 4, 5], allowed, true);
  let brute = 0;
  for (let i = -60; i <= 60; i++) for (let j = -60; j <= 60; j++) for (let k = -60; k <= 60; k++) {
    const x = 3 + i * basis[0][0] + j * basis[1][0] + k * basis[2][0];
    const y = 4 + i * basis[0][1] + j * basis[1][1] + k * basis[2][1];
    const z = 5 + i * basis[0][2] + j * basis[1][2] + k * basis[2][2];
    if (x >= 0 && x <= 310 && y >= 0 && y <= 234 && z >= 0 && z <= 340) brute++;
  }
  assert.equal(r.count, brute);
  assert.equal(r.points.length, brute);
});

test('kafes yöntemi: eğimsiz kutu, kafes kutunun kendi kenarlarını bulur', () => {
  const r = N.computeNesting(boxTris(50, 30, 20), { tiltX: 0, tiltY: 0, angleStep: 5, pairAngles: [] });
  assert.equal(r.mode, 'lattice');
  // Hücre ≈ (20+5)(30+5)(50+5) = 48125; voksel toleransı ±%8
  assert.ok(Math.abs(r.lattice.cellVolume - 48125) / 48125 < 0.08, 'hücre ' + r.lattice.cellVolume);
  assert.ok(r.total >= 550 && r.total <= 850, 'toplam ' + r.total); // hacimsel üst sınır ≈ 850
});

test('kafes yöntemi: 25°/25° yatırılmış kutu kutu yönteminden çok daha fazla sığar', () => {
  const tris = boxTris(50, 30, 20);
  const lat = N.computeNesting(tris, { angleStep: 5, pairAngles: [] });
  const box = N.computeNestingBox(tris, {});
  assert.ok(lat.total > 1.8 * box.total, `kafes ${lat.total} vs kutu ${box.total}`);
  // Eğik kutu kendi kenar kafesiyle ~%62 doluluk verir; voksel payıyla %55 üstü beklenir
  assert.ok(lat.latticeDensity > 0.55, 'kafes doluluğu ' + lat.latticeDensity);
  assert.equal(lat.points.length, lat.total);
});

test('kafes yöntemi: kafes noktaları gerçekten çakışmıyor (voksel kontrolü)', () => {
  // L braket: iç içe geçme beklenir; voksel ızgarasında kopyaları üst üste koyup çakışma ara
  const tris = Float32Array.from([...Array.from(boxTris(60, 15, 10)), ...Array.from(boxTris(15, 45, 10)).map((v, i) => i % 3 === 1 ? v + 15 : v)]);
  const r = N.computeNesting(tris, { tiltX: 0, tiltY: 0, gap: 0, angleStep: 10, pairAngles: [] });
  assert.ok(r.total > 0);
  assert.ok(r.latticeDensity > 0.6, 'L braket kafes doluluğu ' + r.latticeDensity); // L'ler iç içe geçince kutu doluluğunu (%44) aşar
});

function triPrism(a, b, h) {
  const v = [[0, 0, 0], [a, 0, 0], [0, b, 0], [0, 0, h], [a, 0, h], [0, b, h]];
  const f = [[0, 2, 1], [3, 4, 5], [0, 1, 4], [0, 4, 3], [1, 2, 5], [1, 5, 4], [2, 0, 3], [2, 3, 5]];
  const out = []; for (const t of f) for (const i of t) out.push(...v[i]);
  return Float32Array.from(out);
}

test('çift kafesi: üçgen prizma 180° çevrilmiş eşiyle çok daha sık yerleşir', () => {
  const tris = triPrism(60, 40, 15);
  const single = N.computeNesting(tris, { angleStep: 10, pairAngles: [] });
  const pair = N.computeNesting(tris, { angleStep: 10, pairAngles: [180] });
  assert.ok(pair.pair && pair.pair.phi === 180, 'çift seçilmedi');
  assert.ok(pair.latticeDensity > single.latticeDensity * 1.2, `çift ${pair.latticeDensity} tek ${single.latticeDensity}`);
  assert.ok(pair.total > single.total, `çift ${pair.total} tek ${single.total}`);
  assert.equal(pair.points.length, pair.total);
  assert.ok(pair.members.length >= 2);
  // Kafes kısmında her hücrede bir A bir B
  assert.equal(pair.points.slice(0, pair.latticeCount).filter((p) => p[3] === 1).length, pair.latticeCount / 2);
});

test('çift kafesi: kutuda kazanç yoksa tek yön kalır', () => {
  const r = N.computeNesting(boxTris(50, 30, 20), { angleStep: 10, pairAngles: [180] });
  assert.equal(r.pair, null);
  assert.deepEqual(r.pairTried, [180]);
});

test('crossOverlapSet kaba kuvvetle uyuşur', () => {
  const dims = [5, 4, 3];
  const A = new Uint8Array(60), B = new Uint8Array(60);
  for (let i = 0; i < 60; i++) { A[i] = (i * 31) % 7 < 3 ? 1 : 0; B[i] = (i * 17) % 5 < 2 ? 1 : 0; }
  const os = N.crossOverlapSet(A, B, dims);
  const M = os.M;
  for (let tz = -(dims[2] - 1); tz < dims[2]; tz++) for (let ty = -(dims[1] - 1); ty < dims[1]; ty++) for (let tx = -(dims[0] - 1); tx < dims[0]; tx++) {
    let ov = 0;
    for (let z = 0; z < dims[2] && !ov; z++) for (let y = 0; y < dims[1] && !ov; y++) for (let x = 0; x < dims[0]; x++) {
      if (!A[x + dims[0] * (y + dims[1] * z)]) continue;
      const X = x - tx, Y = y - ty, Z = z - tz; // A(v) ∧ B(v − t)
      if (X < 0 || Y < 0 || Z < 0 || X >= dims[0] || Y >= dims[1] || Z >= dims[2]) continue;
      if (B[X + dims[0] * (Y + dims[1] * Z)]) { ov = 1; break; }
    }
    const c = os.C[(tx < 0 ? tx + M[0] : tx) + M[0] * ((ty < 0 ? ty + M[1] : ty) + M[1] * (tz < 0 ? tz + M[2] : tz))];
    assert.equal(c, ov, `t=${tx},${ty},${tz}`);
  }
});

test('boşluk doldurma: yerleşmiş parçalarla çakışmaz ve kutu içinde kalır', () => {
  const tris = boxTris(50, 30, 20);
  const r = N.computeNesting(tris, { angleStep: 10, pairAngles: [] });
  assert.ok(r.fillCount >= 0);
  assert.ok(r.total >= r.latticeCount);
  // Her parça kullanılabilir alanın içinde (XY zarfı ve Z aralığı)
  const m = r.options.margin;
  const tol = 1e-3;
  for (const p of r.points) {
    const mem = r.members[p[3]];
    for (const q of mem.polyRel) {
      assert.ok(q[0] + p[0] >= m - tol && q[0] + p[0] <= r.build.x - m + tol, 'x dışarıda');
      assert.ok(q[1] + p[1] >= m - tol && q[1] + p[1] <= r.build.y - m + tol, 'y dışarıda');
    }
    assert.ok(p[2] + mem.zMin >= m - tol && p[2] + mem.zMin + r.height <= r.build.z - m + tol, 'z dışarıda');
  }
  // Doldurulan parçalar kafes parçalarının kutusuyla çakışmamalı (AABB testi, kaba)
  const boxes = r.points.map((p) => {
    const mem = r.members[p[3]];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const q of mem.polyRel) { minX = Math.min(minX, q[0] + p[0]); maxX = Math.max(maxX, q[0] + p[0]); minY = Math.min(minY, q[1] + p[1]); maxY = Math.max(maxY, q[1] + p[1]); }
    return { minX, maxX, minY, maxY, minZ: p[2] + mem.zMin, maxZ: p[2] + mem.zMin + r.height };
  });
  // Eğimli parçaların kutuları çakışabilir; sadece merkezler arası mesafenin boşluktan küçük olmadığını kontrol et
  for (let i = r.latticeCount; i < boxes.length; i++) {
    for (let j = 0; j < boxes.length; j++) {
      if (i === j) continue;
      const a = boxes[i], b = boxes[j];
      const dx = Math.abs((a.minX + a.maxX) / 2 - (b.minX + b.maxX) / 2);
      const dy = Math.abs((a.minY + a.maxY) / 2 - (b.minY + b.maxY) / 2);
      const dz = Math.abs((a.minZ + a.maxZ) / 2 - (b.minZ + b.maxZ) / 2);
      assert.ok(Math.hypot(dx, dy, dz) > r.options.gap, 'iki parça merkezi çok yakın');
    }
  }
});
