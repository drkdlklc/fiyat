/*
 * MJF 5600 yerleşim (nesting) hesaplayıcı — çekirdek mantık.
 *
 * Tarayıcıda ve Node'da çalışır, DOM'a bağımlı değildir.
 *
 * Akış:
 *   1. STL (binary/ASCII) dosyası üçgen çorbası (triangle soup) olarak okunur.
 *      STEP/IGES/BREP dosyaları index.html içinde occt-import-js ile üçgenlere
 *      çevrilir ve buradaki aynı fonksiyonlara verilir.
 *   2. Parça önce X ekseninde, sonra Y ekseninde sabit açıyla (varsayılan 25°)
 *      yatırılır. Bu "baskı yönelimi"dir ve yerleşim sırasında değişmez.
 *   3. Yerleşimde parça sadece Z ekseninde döndürülebilir. 0–180° arası tüm
 *      Z açıları taranır, her açı için parçanın XY'deki sınırlayıcı kutusu
 *      (bounding box) hesaplanır ve baskı alanına kaç adet sığdığı bulunur.
 *      En çok adet veren açı seçilir.
 *
 * Yerleşim hesabı fiziksel/çarpışma tabanlı değildir; her parça kendi
 * sınırlayıcı kutusu kadar yer kaplar kabul edilir. Bu, hızlı ve
 * fiyatlandırma için güvenli (muhafazakâr) bir tahmin verir.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MjfNesting = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // HP Jet Fusion 5600 serisi baskı hacmi (mm)
  const MJF_5600 = { x: 380, y: 284, z: 380 };

  const DEFAULTS = {
    build: MJF_5600,
    tiltX: 25,        // derece, X ekseni etrafında
    tiltY: 25,        // derece, Y ekseni etrafında
    gap: 5,           // parçalar arası boşluk (mm), XY ve Z için
    margin: 10,       // baskı alanı duvarlarından pay (mm)
    angleStep: 1,     // Z taraması adımı (derece)
    allowMixed: true, // aynı katmanda θ ve θ+90° karışık yerleşime izin ver
  };

  // ---------------------------------------------------------------------
  // STL okuma
  // ---------------------------------------------------------------------

  /**
   * STL dosyasını okur. Binary veya ASCII olduğunu kendisi anlar.
   * @param {ArrayBuffer} buffer
   * @returns {Float32Array} üçgen çorbası: her üçgen için 9 sayı (3 köşe × xyz)
   */
  function parseSTL(buffer) {
    if (isBinarySTL(buffer)) return parseBinarySTL(buffer);
    return parseAsciiSTL(decodeText(buffer));
  }

  function decodeText(buffer) {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(new Uint8Array(buffer));
    }
    return Buffer.from(buffer).toString('utf8');
  }

  function isBinarySTL(buffer) {
    if (buffer.byteLength < 84) return false;
    const view = new DataView(buffer);
    const nTri = view.getUint32(80, true);
    const expected = 84 + nTri * 50;
    if (expected === buffer.byteLength) return true;
    // Bazı yazılımlar binary dosyaya ek byte ekler; başlık "solid" ile
    // başlamıyorsa ve boyut tutarlıysa binary say.
    const head = new Uint8Array(buffer, 0, 5);
    const headStr = String.fromCharCode.apply(null, head).toLowerCase();
    if (headStr !== 'solid') return true;
    // "solid" ile başlıyor ama ASCII'de "facet" kelimesi geçmeli
    const sample = decodeText(buffer.slice(0, Math.min(buffer.byteLength, 1024)));
    return !/facet/i.test(sample);
  }

  function parseBinarySTL(buffer) {
    const view = new DataView(buffer);
    const nTri = Math.min(view.getUint32(80, true), Math.floor((buffer.byteLength - 84) / 50));
    const out = new Float32Array(nTri * 9);
    let off = 84;
    let k = 0;
    for (let i = 0; i < nTri; i++) {
      off += 12; // normal atla
      for (let v = 0; v < 9; v++) {
        out[k++] = view.getFloat32(off, true);
        off += 4;
      }
      off += 2; // attribute byte count
    }
    return out;
  }

  function parseAsciiSTL(text) {
    const re = /vertex\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)\s+([-+]?[\d.]+(?:[eE][-+]?\d+)?)/g;
    const vals = [];
    let m;
    while ((m = re.exec(text)) !== null) {
      vals.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
    }
    const nTri = Math.floor(vals.length / 9);
    return Float32Array.from(vals.slice(0, nTri * 9));
  }

  /**
   * three.js uyumlu (position + index) mesh listesini üçgen çorbasına çevirir.
   * occt-import-js çıktısı için kullanılır.
   */
  function meshesToTriangles(meshes) {
    let total = 0;
    for (const m of meshes) {
      const idx = m.index && m.index.array;
      total += idx ? idx.length : m.attributes.position.array.length / 3;
    }
    const out = new Float32Array(total * 3);
    let k = 0;
    for (const m of meshes) {
      const pos = m.attributes.position.array;
      const idx = m.index && m.index.array;
      if (idx) {
        for (let i = 0; i < idx.length; i++) {
          const p = idx[i] * 3;
          out[k++] = pos[p]; out[k++] = pos[p + 1]; out[k++] = pos[p + 2];
        }
      } else {
        out.set(pos, k);
        k += pos.length;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------
  // Geometri yardımcıları
  // ---------------------------------------------------------------------

  function scaleTriangles(tris, factor) {
    if (factor === 1) return tris;
    const out = new Float32Array(tris.length);
    for (let i = 0; i < tris.length; i++) out[i] = tris[i] * factor;
    return out;
  }

  /** Kapalı mesh hacmi (mm³) ve yüzey alanı (mm²). */
  function meshStats(tris) {
    let vol = 0;
    let area = 0;
    for (let i = 0; i < tris.length; i += 9) {
      const ax = tris[i], ay = tris[i + 1], az = tris[i + 2];
      const bx = tris[i + 3], by = tris[i + 4], bz = tris[i + 5];
      const cx = tris[i + 6], cy = tris[i + 7], cz = tris[i + 8];
      // (b-a) x (c-a)
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      area += Math.sqrt(nx * nx + ny * ny + nz * nz) * 0.5;
      vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    }
    return { volume: Math.abs(vol), area: area, triangles: tris.length / 9 };
  }

  function bbox3(tris) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < tris.length; i += 3) {
      const x = tris[i], y = tris[i + 1], z = tris[i + 2];
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ],
      size: [maxX - minX, maxY - minY, maxZ - minZ] };
  }

  const DEG = Math.PI / 180;

  /**
   * Noktaları önce X sonra Y ekseni etrafında döndürür (derece).
   * Yeni bir Float32Array döner.
   */
  function tiltPoints(pts, tiltXDeg, tiltYDeg) {
    const cx = Math.cos(tiltXDeg * DEG), sx = Math.sin(tiltXDeg * DEG);
    const cy = Math.cos(tiltYDeg * DEG), sy = Math.sin(tiltYDeg * DEG);
    const out = new Float32Array(pts.length);
    for (let i = 0; i < pts.length; i += 3) {
      const x = pts[i], y = pts[i + 1], z = pts[i + 2];
      // Rx
      const y1 = y * cx - z * sx;
      const z1 = y * sx + z * cx;
      // Ry
      const x2 = x * cy + z1 * sy;
      const z2 = -x * sy + z1 * cy;
      out[i] = x2; out[i + 1] = y1; out[i + 2] = z2;
    }
    return out;
  }

  /**
   * XY düzlemine izdüşümün dışbükey zarfı (convex hull). Monotone chain.
   *
   * Büyük meshlerde önce ızgara tabanlı O(N) ön eleme yapılır: XY düzlemi
   * GRID×GRID hücreye bölünür, her sütun için en düşük/en yüksek y'li, her
   * satır için en düşük/en yüksek x'li GERÇEK nokta tutulur. Zarf yalnızca
   * bu adaylardan kurulur. Hata payı bir hücre genişliğini geçmez (380 mm
   * parça için ~0,05 mm) ve computeNesting bunu güvenlik payı olarak ekler.
   *
   * @returns {{hull:Array<[number,number]>, tolerance:number}}
   */
  const HULL_GRID = 8192;
  const HULL_EXACT_LIMIT = 50000; // bu kadar noktaya kadar tam hesap

  function convexHullXY(pts) {
    const n = pts.length / 3;
    if (n === 0) return { hull: [], tolerance: 0 };

    let candidates;
    let tolerance = 0;
    if (n <= HULL_EXACT_LIMIT) {
      candidates = new Array(n);
      for (let i = 0; i < n; i++) candidates[i] = [pts[i * 3], pts[i * 3 + 1]];
    } else {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3], y = pts[i * 3 + 1];
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const spanX = Math.max(maxX - minX, 1e-9);
      const spanY = Math.max(maxY - minY, 1e-9);
      const cellX = spanX / HULL_GRID;
      const cellY = spanY / HULL_GRID;
      tolerance = Math.max(cellX, cellY);

      const colMin = new Int32Array(HULL_GRID + 1).fill(-1);
      const colMax = new Int32Array(HULL_GRID + 1).fill(-1);
      const rowMin = new Int32Array(HULL_GRID + 1).fill(-1);
      const rowMax = new Int32Array(HULL_GRID + 1).fill(-1);
      for (let i = 0; i < n; i++) {
        const x = pts[i * 3], y = pts[i * 3 + 1];
        const cx = Math.floor((x - minX) / cellX);
        const cy = Math.floor((y - minY) / cellY);
        if (colMin[cx] < 0 || y < pts[colMin[cx] * 3 + 1]) colMin[cx] = i;
        if (colMax[cx] < 0 || y > pts[colMax[cx] * 3 + 1]) colMax[cx] = i;
        if (rowMin[cy] < 0 || x < pts[rowMin[cy] * 3]) rowMin[cy] = i;
        if (rowMax[cy] < 0 || x > pts[rowMax[cy] * 3]) rowMax[cy] = i;
      }
      candidates = [];
      for (const arr of [colMin, colMax, rowMin, rowMax]) {
        for (let k = 0; k <= HULL_GRID; k++) {
          const i = arr[k];
          if (i >= 0) candidates.push([pts[i * 3], pts[i * 3 + 1]]);
        }
      }
    }

    candidates.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
    const uniq = [];
    for (const p of candidates) {
      const last = uniq[uniq.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) uniq.push(p);
    }
    if (uniq.length < 3) return { hull: uniq, tolerance };

    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const p of uniq) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = uniq.length - 1; i >= 0; i--) {
      const p = uniq[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return { hull: lower.concat(upper), tolerance };
  }

  /** Zarfın θ derece Z döndürmesinden sonraki XY sınırlayıcı kutusu. */
  function hullExtentAt(hull, thetaDeg) {
    const c = Math.cos(thetaDeg * DEG), s = Math.sin(thetaDeg * DEG);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of hull) {
      const x = p[0] * c - p[1] * s;
      const y = p[0] * s + p[1] * c;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { w: maxX - minX, l: maxY - minY };
  }

  // ---------------------------------------------------------------------
  // 2B dikdörtgen yerleşimi
  // ---------------------------------------------------------------------

  /** `a` boyutlu parçalardan `A` uzunluğuna, aralarında `g` boşlukla kaç tane sığar. */
  function fitCount(a, A, g) {
    if (a <= 0 || A <= 0 || a > A + 1e-9) return 0;
    return Math.floor((A + g) / (a + g) + 1e-9);
  }

  /**
   * w×l kutuyu W×L alana yerleştirir. Parça aynı katmanda θ ve θ+90° olarak
   * (yani l×w) da kullanılabilir; artan şerit diğer yönelimle doldurulur.
   * @returns {{count:number, rects:Array<{x:number,y:number,w:number,l:number,rot:boolean}>}}
   */
  function pack2D(w, l, W, L, g, allowMixed) {
    const options = [];

    const grid = (pw, pl, ox, oy, areaW, areaL, rot) => {
      const nx = fitCount(pw, areaW, g);
      const ny = fitCount(pl, areaL, g);
      const rects = [];
      for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
          rects.push({ x: ox + i * (pw + g), y: oy + j * (pl + g), w: pw, l: pl, rot: rot });
        }
      }
      return { nx, ny, rects, usedW: nx > 0 ? nx * pw + (nx - 1) * g : 0, usedL: ny > 0 ? ny * pl + (ny - 1) * g : 0 };
    };

    for (const [pw, pl, rot] of [[w, l, false], [l, w, true]]) {
      const base = grid(pw, pl, 0, 0, W, L, rot);
      options.push({ count: base.rects.length, rects: base.rects });
      if (!allowMixed) continue;

      // Sağda kalan şerit: diğer yönelimle doldur
      const remW = W - base.usedW - (base.nx > 0 ? g : 0);
      if (remW > 0) {
        const extra = grid(pl, pw, base.usedW + (base.nx > 0 ? g : 0), 0, remW, L, !rot);
        options.push({ count: base.rects.length + extra.rects.length, rects: base.rects.concat(extra.rects) });
      }
      // Üstte kalan şerit: diğer yönelimle doldur
      const remL = L - base.usedL - (base.ny > 0 ? g : 0);
      if (remL > 0) {
        const extra = grid(pl, pw, 0, base.usedL + (base.ny > 0 ? g : 0), W, remL, !rot);
        options.push({ count: base.rects.length + extra.rects.length, rects: base.rects.concat(extra.rects) });
      }
    }

    let best = options[0];
    for (const o of options) if (o.count > best.count) best = o;
    return best;
  }

  // ---------------------------------------------------------------------
  // Ana hesap
  // ---------------------------------------------------------------------

  /**
   * @param {Float32Array} tris üçgen çorbası (mm)
   * @param {object} opts DEFAULTS ile aynı alanlar
   */
  function computeNesting(tris, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const build = Object.assign({}, MJF_5600, o.build || {});
    const t0 = now();

    const stats = meshStats(tris);
    const original = bbox3(tris);

    const tilted = tiltPoints(tris, o.tiltX, o.tiltY);
    const tiltedBox = bbox3(tilted);
    const height = tiltedBox.size[2];
    const hullResult = convexHullXY(tilted);
    const hull = hullResult.hull;
    const tol = hullResult.tolerance; // ızgara ön elemesinin güvenlik payı

    const usableX = build.x - 2 * o.margin;
    const usableY = build.y - 2 * o.margin;
    const usableZ = build.z - 2 * o.margin;
    const layers = fitCount(height, usableZ, o.gap);

    let best = null;
    const step = Math.max(0.1, o.angleStep);
    const sweep = [];
    for (let theta = 0; theta < 180; theta += step) {
      const raw = hullExtentAt(hull, theta);
      const ext = { w: raw.w + tol, l: raw.l + tol };
      const packed = pack2D(ext.w, ext.l, usableX, usableY, o.gap, o.allowMixed);
      const total = packed.count * layers;
      sweep.push({ theta, w: ext.w, l: ext.l, perLayer: packed.count, total });
      const area = ext.w * ext.l;
      if (!best || total > best.total || (total === best.total && area < best.area - 1e-9)) {
        best = { theta, w: ext.w, l: ext.l, area, perLayer: packed.count, total, rects: packed.rects };
      }
    }

    const buildVolume = build.x * build.y * build.z;
    const partBoxVolume = best.w * best.l * height;
    return {
      build,
      options: o,
      mesh: stats,
      originalSize: original.size,
      tiltedSize: [best.w, best.l, height],
      tiltedBoxSize: tiltedBox.size,
      usable: { x: usableX, y: usableY, z: usableZ },
      bestAngle: best.theta,
      footprint: { w: best.w, l: best.l },
      height,
      perLayer: best.perLayer,
      layers,
      total: best.total,
      rects: best.rects,
      sweep,
      densityByPart: best.total * stats.volume / buildVolume,
      densityByBox: best.total * partBoxVolume / buildVolume,
      elapsedMs: now() - t0,
    };
  }

  function now() {
    return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }

  return {
    MJF_5600,
    DEFAULTS,
    parseSTL,
    meshesToTriangles,
    scaleTriangles,
    meshStats,
    bbox3,
    tiltPoints,
    convexHullXY,
    hullExtentAt,
    fitCount,
    pack2D,
    computeNesting,
  };
});
