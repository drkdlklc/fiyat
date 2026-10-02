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
    mode: 'lattice',  // 'lattice': gerçek şekil (voksel kafes), 'box': sınırlayıcı kutu
    pairAngles: [180], // eş parçanın Z'de çevrilme açıları; [] ise çift aranmaz
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
  // Voksel tabanlı kafes (lattice) yerleşimi
  //
  // Fikir: Parça vokselleştirilir ve parçalar arası boşluğun yarısı kadar
  // şişirilir (K'). İki kopyanın çakıştığı öteleme kümesi C = K' − K'
  // otokorelasyonla (FFT) bulunur. Üç öteleme vektörü a, b, c seçilir; tüm
  // tamsayı kombinasyonları i·a + j·b + k·c (sıfır hariç) C dışında kalırsa
  // kopyalar hiç çakışmaz. En küçük hacimli hücre (|det|) en sık yerleşimi
  // verir. Parçalar böylece hem XY'de hem Z'de birbirinin içine girer;
  // "katman" kavramı kalkar. Z döndürmesi kafesi ve parçayı birlikte
  // döndürür; yalnızca baskı alanının sınırlarına ne kadar sığdığını etkiler.
  // ---------------------------------------------------------------------

  const VOX_N = 58;    // en uzun eksendeki voksel sayısı hedefi (şişirme dahil ≤ 64)
  const VOX_ASPECT = 4; // voksel kenar oranı üst sınırı

  /**
   * Üçgen çorbasını dolu (solid) voksel ızgarasına çevirir.
   * Yüzeyler örneklenerek işaretlenir (muhafazakâr), iç hacim Z boyunca
   * parite kuralıyla doldurulur. Anizotropik voksel desteklenir.
   * @returns {Uint8Array} dims.x*dims.y*dims.z, x en hızlı değişen
   */
  function voxelize(tris, origin, vox, dims) {
    const nx = dims[0], ny = dims[1], nz = dims[2];
    const grid = new Uint8Array(nx * ny * nz);
    const idx = (x, y, z) => x + nx * (y + ny * z);
    const mark = (x, y, z) => {
      const ix = Math.min(nx - 1, Math.max(0, Math.floor(x)));
      const iy = Math.min(ny - 1, Math.max(0, Math.floor(y)));
      const iz = Math.min(nz - 1, Math.max(0, Math.floor(z)));
      grid[idx(ix, iy, iz)] = 1;
    };

    // Sütun merkezlerini kenarlara tam denk gelmesin diye irrasyonel kaydır
    const EPSX = 0.5 + 1e-3 * (Math.SQRT2 - 1), EPSY = 0.5 + 1e-3 * (Math.sqrt(3) - 1);

    // Parite geçişleri: sütun -> z listesi (düz diziler, sonra sayma sıralaması)
    let crossCol = new Int32Array(1 << 16), crossZ = new Float32Array(1 << 16), nCross = 0;
    const pushCross = (col, z) => {
      if (nCross === crossCol.length) {
        const c2 = new Int32Array(nCross * 2); c2.set(crossCol); crossCol = c2;
        const z2 = new Float32Array(nCross * 2); z2.set(crossZ); crossZ = z2;
      }
      crossCol[nCross] = col; crossZ[nCross] = z; nCross++;
    };

    for (let t = 0; t < tris.length; t += 9) {
      const ax = (tris[t] - origin[0]) / vox[0], ay = (tris[t + 1] - origin[1]) / vox[1], az = (tris[t + 2] - origin[2]) / vox[2];
      const bx = (tris[t + 3] - origin[0]) / vox[0], by = (tris[t + 4] - origin[1]) / vox[1], bz = (tris[t + 5] - origin[2]) / vox[2];
      const cx = (tris[t + 6] - origin[0]) / vox[0], cy = (tris[t + 7] - origin[1]) / vox[1], cz = (tris[t + 8] - origin[2]) / vox[2];

      // Yüzey örnekleme (≤ 0,5 voksel aralık)
      const e1 = Math.hypot(bx - ax, by - ay, bz - az);
      const e2 = Math.hypot(cx - ax, cy - ay, cz - az);
      const e3 = Math.hypot(cx - bx, cy - by, cz - bz);
      const steps = Math.min(400, Math.ceil(Math.max(e1, e2, e3) / 0.5) + 1);
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        for (let j = 0; j <= steps - i; j++) {
          const v = j / steps, w = 1 - u - v;
          mark(w * ax + u * bx + v * cx, w * ay + u * by + v * cy, w * az + u * bz + v * cz);
        }
      }

      // Parite geçişleri (XY izdüşümü dejenere değilse)
      const det = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
      if (Math.abs(det) < 1e-12) continue;
      const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(nx - 1, Math.ceil(Math.max(ax, bx, cx)));
      const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(ny - 1, Math.ceil(Math.max(ay, by, cy)));
      for (let iy = minY; iy <= maxY; iy++) {
        const py = iy + EPSY;
        for (let ix = minX; ix <= maxX; ix++) {
          const px = ix + EPSX;
          // barycentric
          const l1 = ((bx - px) * (cy - py) - (by - py) * (cx - px)) / det;
          const l2 = ((cx - px) * (ay - py) - (cy - py) * (ax - px)) / det;
          const l3 = 1 - l1 - l2;
          if (l1 < 0 || l2 < 0 || l3 < 0) continue;
          pushCross(ix + nx * iy, l1 * az + l2 * bz + l3 * cz);
        }
      }
    }

    // Sütunlara göre sırala (sayma sıralaması) ve parite ile doldur
    const nCol = nx * ny;
    const counts = new Int32Array(nCol + 1);
    for (let i = 0; i < nCross; i++) counts[crossCol[i] + 1]++;
    for (let c = 0; c < nCol; c++) counts[c + 1] += counts[c];
    const sortedZ = new Float32Array(nCross);
    const fill = counts.slice();
    for (let i = 0; i < nCross; i++) sortedZ[fill[crossCol[i]]++] = crossZ[i];
    for (let c = 0; c < nCol; c++) {
      const s = counts[c], e = counts[c + 1];
      if (e - s < 2) continue;
      const zs = Array.from(sortedZ.subarray(s, e)).sort((p, q) => p - q);
      const ix = c % nx, iy = (c - ix) / nx;
      for (let k = 0; k + 1 < zs.length; k += 2) {
        const z0 = Math.max(0, Math.floor(zs[k])), z1 = Math.min(nz - 1, Math.floor(zs[k + 1]));
        for (let z = z0; z <= z1; z++) grid[idx(ix, iy, z)] = 1;
      }
    }
    return grid;
  }

  /**
   * Küresel genişletme: yarıçapı (mm) `radius` olan küre, voksel birimlerinde
   * elipsoit olarak uygulanır. Sadece yüzey vokselleri (boş 6-komşusu olan)
   * genişletilir.
   */
  function dilate(grid, dims, vox, radius) {
    if (!(radius > 0)) return grid;
    const nx = dims[0], ny = dims[1], nz = dims[2];
    const rv = vox.map((v) => Math.ceil(radius / v));
    const offsets = [];
    for (let dz = -rv[2]; dz <= rv[2]; dz++) for (let dy = -rv[1]; dy <= rv[1]; dy++) for (let dx = -rv[0]; dx <= rv[0]; dx++) {
      if (dx === 0 && dy === 0 && dz === 0) continue;
      const d = Math.hypot(dx * vox[0], dy * vox[1], dz * vox[2]);
      if (d <= radius + 1e-9) offsets.push([dx, dy, dz]);
    }
    const out = new Uint8Array(grid);
    const idx = (x, y, z) => x + nx * (y + ny * z);
    for (let z = 0; z < nz; z++) for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const i = idx(x, y, z);
      if (!grid[i]) continue;
      const surface = x === 0 || y === 0 || z === 0 || x === nx - 1 || y === ny - 1 || z === nz - 1 ||
        !grid[i - 1] || !grid[i + 1] || !grid[i - nx] || !grid[i + nx] || !grid[i - nx * ny] || !grid[i + nx * ny];
      if (!surface) continue;
      for (const o of offsets) {
        const X = x + o[0], Y = y + o[1], Z = z + o[2];
        if (X < 0 || Y < 0 || Z < 0 || X >= nx || Y >= ny || Z >= nz) continue;
        out[idx(X, Y, Z)] = 1;
      }
    }
    return out;
  }

  function nextPow2(n) { let p = 1; while (p < n) p <<= 1; return p; }

  /** Yerinde, radix-2, karmaşık FFT (n ikinin kuvveti). */
  function fftInPlace(re, im, n, inverse) {
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = 2 * Math.PI / len * (inverse ? 1 : -1);
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        const half = len >> 1;
        for (let k = 0; k < half; k++) {
          const p = i + k, q = p + half;
          const tr = re[q] * cr - im[q] * ci;
          const ti = re[q] * ci + im[q] * cr;
          re[q] = re[p] - tr; im[q] = im[p] - ti;
          re[p] += tr; im[p] += ti;
          const ncr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr; cr = ncr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  function fft3d(re, im, M, inverse) {
    const Mx = M[0], My = M[1], Mz = M[2];
    const maxN = Math.max(Mx, My, Mz);
    const br = new Float32Array(maxN), bi = new Float32Array(maxN);
    const strides = [1, Mx, Mx * My];
    for (let axis = 0; axis < 3; axis++) {
      const n = M[axis], st = strides[axis];
      if (n < 2) continue;
      const total = Mx * My * Mz;
      const lineCount = total / n;
      for (let line = 0; line < lineCount; line++) {
        // satır başlangıç indeksi: axis dışındaki koordinatları çöz
        let rem = line, base = 0;
        for (let a = 0; a < 3; a++) {
          if (a === axis) continue;
          const na = M[a];
          base += (rem % na) * strides[a];
          rem = Math.floor(rem / na);
        }
        for (let k = 0; k < n; k++) { br[k] = re[base + k * st]; bi[k] = im[base + k * st]; }
        fftInPlace(br, bi, n, inverse);
        for (let k = 0; k < n; k++) { re[base + k * st] = br[k]; im[base + k * st] = bi[k]; }
      }
    }
  }

  /**
   * Çakışma kümesi C(t) = [K ∩ (K + t) ≠ ∅], t ∈ [-(n-1), n-1]^3.
   * @returns {{C: Uint8Array, M:number[], n:number[]}} C, M ızgarasında döngüsel indeksle
   */
  function overlapSet(grid, dims) {
    const M = dims.map((n) => nextPow2(2 * n - 1));
    const size = M[0] * M[1] * M[2];
    const re = new Float32Array(size), im = new Float32Array(size);
    for (let z = 0; z < dims[2]; z++) for (let y = 0; y < dims[1]; y++) for (let x = 0; x < dims[0]; x++) {
      re[x + M[0] * (y + M[1] * z)] = grid[x + dims[0] * (y + dims[1] * z)];
    }
    fft3d(re, im, M, false);
    for (let i = 0; i < size; i++) { re[i] = re[i] * re[i] + im[i] * im[i]; im[i] = 0; }
    fft3d(re, im, M, true);
    const C = new Uint8Array(size);
    for (let i = 0; i < size; i++) C[i] = re[i] > 0.5 ? 1 : 0;
    return { C, M, n: dims.slice() };
  }

  /**
   * Çapraz çakışma kümesi C_AB(t) = [A ∩ (B + t) ≠ ∅]; A ve B aynı boyutlu ızgara.
   * Σ_v A(v)·B(v − t) = IFFT(F_A · conj(F_B)).
   */
  function crossOverlapSet(gridA, gridB, dims) {
    const M = dims.map((n) => nextPow2(2 * n - 1));
    const size = M[0] * M[1] * M[2];
    const reA = new Float32Array(size), imA = new Float32Array(size);
    const reB = new Float32Array(size), imB = new Float32Array(size);
    for (let z = 0; z < dims[2]; z++) for (let y = 0; y < dims[1]; y++) for (let x = 0; x < dims[0]; x++) {
      const src = x + dims[0] * (y + dims[1] * z), dst = x + M[0] * (y + M[1] * z);
      reA[dst] = gridA[src]; reB[dst] = gridB[src];
    }
    fft3d(reA, imA, M, false);
    fft3d(reB, imB, M, false);
    for (let i = 0; i < size; i++) {
      // F_A · conj(F_B)
      const r = reA[i] * reB[i] + imA[i] * imB[i];
      const im = imA[i] * reB[i] - reA[i] * imB[i];
      reA[i] = r; imA[i] = im;
    }
    fft3d(reA, imA, M, true);
    const C = new Uint8Array(size);
    for (let i = 0; i < size; i++) C[i] = reA[i] > 0.5 ? 1 : 0;
    return { C, M, n: dims.slice() };
  }

  /**
   * Çift (dimer) D = A ∪ (B + d) için çakışma kümesi:
   * C_DD(t) = C_AA(t) ∨ C_BB(t) ∨ C_AB(t + d) ∨ C_AB(d − t). Kutu n + |d| büyür.
   */
  function dimerOverlapSet(osAA, osBB, osAB, d) {
    const qAA = makeOverlapQuery(osAA), qBB = makeOverlapQuery(osBB), qAB = makeOverlapQuery(osAB);
    const n = [0, 1, 2].map((i) => Math.max(osAA.n[i], osBB.n[i]) + Math.abs(d[i]));
    const M = n.map((v) => nextPow2(2 * v - 1));
    const C = new Uint8Array(M[0] * M[1] * M[2]);
    for (let tz = -(n[2] - 1); tz < n[2]; tz++) for (let ty = -(n[1] - 1); ty < n[1]; ty++) for (let tx = -(n[0] - 1); tx < n[0]; tx++) {
      if (qAA(tx, ty, tz) || qBB(tx, ty, tz) || qAB(tx + d[0], ty + d[1], tz + d[2]) || qAB(d[0] - tx, d[1] - ty, d[2] - tz)) {
        const ix = tx < 0 ? tx + M[0] : tx, iy = ty < 0 ? ty + M[1] : ty, iz = tz < 0 ? tz + M[2] : tz;
        C[ix + M[0] * (iy + M[1] * iz)] = 1;
      }
    }
    return { C, M, n };
  }

  /** Üçgenleri Z ekseninde φ derece döndürür (orijin etrafında). */
  function rotateTrisZ(tris, phiDeg) {
    const c = Math.cos(phiDeg * DEG), s = Math.sin(phiDeg * DEG);
    const out = new Float32Array(tris.length);
    for (let i = 0; i < tris.length; i += 3) {
      out[i] = tris[i] * c - tris[i + 1] * s;
      out[i + 1] = tris[i] * s + tris[i + 1] * c;
      out[i + 2] = tris[i + 2];
    }
    return out;
  }

  /**
   * Bir şekli (yatırılmış üçgenler) vokselleştirir ve boşluk kadar şişirir.
   * vox verilmezse şeklin kendi uzunluklarından VOX_N'e göre seçilir.
   */
  function prepareShape(tris, gap, voxN, voxGiven) {
    const box = bbox3(tris);
    const ext = box.size;
    const maxExt = Math.max(ext[0], ext[1], ext[2]);
    const vox = voxGiven || [0, 1, 2].map((i) => Math.max((ext[i] + gap) / voxN, (maxExt + gap) / voxN / VOX_ASPECT));
    const vMean = (vox[0] + vox[1] + vox[2]) / 3;
    const radius = Math.max(0, gap / 2 - 0.5 * vMean);
    const r = vox.map((v) => Math.ceil(radius / v));
    const partDims = [0, 1, 2].map((i) => Math.ceil(ext[i] / vox[i]) + 1);
    const dims = [0, 1, 2].map((i) => partDims[i] + 2 * r[i]);
    const origin = [0, 1, 2].map((i) => box.min[i] - r[i] * vox[i]);
    let grid = voxelize(tris, origin, vox, dims);
    let filled = 0; for (let i = 0; i < grid.length; i++) filled += grid[i];
    grid = dilate(grid, dims, vox, radius);
    let filledDilated = 0; for (let i = 0; i < grid.length; i++) filledDilated += grid[i];
    return { box, vox, radius, r, dims, origin, grid, filled, filledDilated };
  }

  /** Izgarayı daha büyük `dims` içine (sol-alt hizalı) kopyalar. */
  function padGrid(grid, dims, newDims) {
    if (dims[0] === newDims[0] && dims[1] === newDims[1] && dims[2] === newDims[2]) return grid;
    const out = new Uint8Array(newDims[0] * newDims[1] * newDims[2]);
    for (let z = 0; z < dims[2]; z++) for (let y = 0; y < dims[1]; y++) for (let x = 0; x < dims[0]; x++) {
      out[x + newDims[0] * (y + newDims[1] * z)] = grid[x + dims[0] * (y + dims[1] * z)];
    }
    return out;
  }

  const PAIR_VOX_N = 30;      // çift aramasında parça başına voksel
  const PAIR_CANDIDATES = 6;  // denenecek eş konumu sayısı (φ başına)

  /**
   * Verilen φ için A ve eşinin voksel/çakışma kümelerini hazırlar.
   */
  function preparePair(tiltedTris, gap, phi, voxN) {
    const prepA = prepareShape(tiltedTris, gap, voxN);
    const trisB = rotateTrisZ(tiltedTris, phi);
    const prepB = prepareShape(trisB, gap, voxN, prepA.vox);
    const dims = [0, 1, 2].map((i) => Math.max(prepA.dims[i], prepB.dims[i]));
    const gA = padGrid(prepA.grid, prepA.dims, dims), gB = padGrid(prepB.grid, prepB.dims, dims);
    return {
      phi, trisB, prepA, prepB, dims, vox: prepA.vox,
      osAA: overlapSet(gA, dims), osBB: overlapSet(gB, dims), osAB: crossOverlapSet(gA, gB, dims),
    };
  }

  /** Çakışmasız eş konumu adayları, çiftin sınırlayıcı kutusuna göre artan. near verilirse o voksel konumunun ±rad komşuluğu. */
  function pairCandidates(pp, count, near, rad) {
    const qAB = makeOverlapQuery(pp.osAB);
    const { dims, vox } = pp;
    const eA = pp.prepA.dims, eB = pp.prepB.dims;
    const lo = [0, 1, 2].map((i) => near ? Math.max(-(dims[i] - 1), near[i] - rad) : -(dims[i] - 1));
    const hi = [0, 1, 2].map((i) => near ? Math.min(dims[i] - 1, near[i] + rad) : dims[i] - 1);
    const cands = [];
    for (let tz = lo[2]; tz <= hi[2]; tz++) for (let ty = lo[1]; ty <= hi[1]; ty++) for (let tx = lo[0]; tx <= hi[0]; tx++) {
      if (qAB(tx, ty, tz)) continue;
      const ux = Math.max(eA[0], eB[0] + tx) - Math.min(0, tx);
      const uy = Math.max(eA[1], eB[1] + ty) - Math.min(0, ty);
      const uz = Math.max(eA[2], eB[2] + tz) - Math.min(0, tz);
      cands.push({ t: [tx, ty, tz], vol: ux * vox[0] * uy * vox[1] * uz * vox[2], len: Math.hypot(tx * vox[0], ty * vox[1], tz * vox[2]) });
    }
    cands.sort((p, q) => (p.vol - q.vol) || (p.len - q.len));
    const chosen = [];
    for (const c of cands) {
      if (chosen.some((k) => Math.abs(k.t[0] - c.t[0]) + Math.abs(k.t[1] - c.t[1]) + Math.abs(k.t[2] - c.t[2]) < 3)) continue;
      chosen.push(c);
      if (chosen.length >= count) break;
    }
    return chosen;
  }

  /** Eş konumu t için çift kafesini bulur ve doluluğu hesaplar. */
  function evaluatePair(pp, t, partVolume) {
    const osDD = dimerOverlapSet(pp.osAA, pp.osBB, pp.osAB, t);
    // Hacim alt sınırı yok: A ve B'nin şişirme bölgeleri çakıştığından toplam voksel sayısı çiftin hacmini aşar
    const lat = findLattice(osDD, pp.vox, 0);
    if (!lat) return null;
    const delta = [0, 1, 2].map((i) => t[i] * pp.vox[i] + pp.prepA.origin[i] - pp.prepB.origin[i]);
    return { phi: pp.phi, t, delta, lat, density: 2 * partVolume / lat.cellVolume, trisB: pp.trisB };
  }

  /**
   * Parça + Z'de φ çevrilmiş eşinden oluşan çiftin kafes yerleşimini arar.
   * Her φ için eş konumu adayları (çiftin kutusunu en küçük yapan çakışmasız
   * ötelemeler) denenir; parça/hücre doluluğu en yüksek çift döner.
   * Kaba voksel (PAIR_VOX_N) kullanılır: daha ince voksel denemelerde daha
   * iyi sonuç vermedi ve 3 kat yavaştı.
   * @returns {null|{phi, delta:number[], lat, density, trisB}}
   */
  function pairSearch(tiltedTris, gap, phis, partVolume) {
    let best = null;
    for (const phi of phis) {
      const pp = preparePair(tiltedTris, gap, phi, PAIR_VOX_N);
      for (const c of pairCandidates(pp, PAIR_CANDIDATES)) {
        const ev = evaluatePair(pp, c.t, partVolume);
        if (ev && (!best || ev.density > best.density)) best = ev;
      }
    }
    return best;
  }

  /** C(t) sorgusu; aralık dışı her zaman "çakışmaz". */
  function makeOverlapQuery(os) {
    const { C, M, n } = os;
    return (tx, ty, tz) => {
      if (tx >= n[0] || tx <= -n[0] || ty >= n[1] || ty <= -n[1] || tz >= n[2] || tz <= -n[2]) return false;
      const ix = tx < 0 ? tx + M[0] : tx, iy = ty < 0 ? ty + M[1] : ty, iz = tz < 0 ? tz + M[2] : tz;
      return C[ix + M[0] * (iy + M[1] * iz)] === 1;
    };
  }

  /**
   * Verilen taban vektörleri (voksel birimi, tamsayı) için kafesin C'den
   * kaçınıp kaçınmadığını kontrol eder. Önce küçük kombinasyonlar, sonra
   * C kutusunu kapsayan tam tarama.
   */
  /** v'nin tüm pozitif katları (k·v, kutu içinde kaldıkça) C dışında mı? */
  function multiplesAvoid(C, M, n, v) {
    for (let k = 1; ; k++) {
      const tx = k * v[0], ty = k * v[1], tz = k * v[2];
      if (Math.abs(tx) >= n[0] || Math.abs(ty) >= n[1] || Math.abs(tz) >= n[2]) return true;
      const ix = tx < 0 ? tx + M[0] : tx, iy = ty < 0 ? ty + M[1] : ty, iz = tz < 0 ? tz + M[2] : tz;
      if (C[ix + M[0] * (iy + M[1] * iz)]) return false;
    }
  }

  /** w yönünde kutunun izdüşüm yarı genişliği: Σ box_d·|w_d| */
  function boxSupport(w, box) { return box[0] * Math.abs(w[0]) + box[1] * Math.abs(w[1]) + box[2] * Math.abs(w[2]); }

  const RANGE_CAP = 20000;

  /**
   * base + i·a doğrusu üzerindeki kutu-içi tamsayı i'ler için C sorgusu.
   * Çakışma varsa true döner.
   */
  function lineHits(overlap, bx, by, bz, a, box) {
    let lo = -Infinity, hi = Infinity;
    for (let d = 0; d < 3; d++) {
      const ad = a[d], bd = d === 0 ? bx : d === 1 ? by : bz;
      if (ad === 0) { if (Math.abs(bd) > box[d]) return false; continue; }
      let l = (-box[d] - bd) / ad, h = (box[d] - bd) / ad;
      if (l > h) { const t = l; l = h; h = t; }
      if (l > lo) lo = l;
      if (h < hi) hi = h;
    }
    const il = Math.ceil(lo - 1e-9), ih = Math.floor(hi + 1e-9);
    for (let i = il; i <= ih; i++) {
      if (overlap(bx + i * a[0], by + i * a[1], bz + i * a[2])) return true;
    }
    return false;
  }

  /** 2B kafes {i·a + j·b}: j ≠ 0 olan tüm kutu-içi noktalar C dışında mı? (j = 0: a aşamasında bakıldı) */
  function lattice2DAvoids(overlap, a, b, n) {
    const box = [n[0] - 1, n[1] - 1, n[2] - 1];
    const ab = dot3(a, b), aa = dot3(a, a);
    const w = [b[0] - ab / aa * a[0], b[1] - ab / aa * a[1], b[2] - ab / aa * a[2]]; // b'nin a'ya dik bileşeni
    const ww = dot3(w, w);
    if (ww < 1e-9) return false; // a'ya paralel
    const J = Math.floor(boxSupport(w, box) / ww + 1e-9); // |j|·ww = |dot(p, w)| ≤ support
    if (J > RANGE_CAP) return false;
    for (let j = 1; j <= J; j++) {
      if (lineHits(overlap, j * b[0], j * b[1], j * b[2], a, box)) return false;
    }
    return true;
  }

  /** 3B kafes: k ≠ 0 olan tüm kutu-içi noktalar C dışında mı? (k = 0: 2B aşamasında bakıldı) */
  function lattice3DAvoids(overlap, a, b, c, n, pre) {
    const box = [n[0] - 1, n[1] - 1, n[2] - 1];
    const cn = dot3(c, pre.nrm);
    if (Math.abs(cn) < 1e-9) return false; // a-b düzleminde
    const K = Math.floor(pre.supN / Math.abs(cn) + 1e-9);
    if (K > RANGE_CAP) return false;
    const w = pre.w, ww = pre.ww, sup = pre.supW;
    for (let k = 1; k <= K; k++) {
      const kx = k * c[0], ky = k * c[1], kz = k * c[2];
      // j·ww + dot(kc, w) = dot(p, w) ∈ [-sup, sup]
      const d = kx * w[0] + ky * w[1] + kz * w[2];
      const jLo = Math.ceil((-sup - d) / ww - 1e-9), jHi = Math.floor((sup - d) / ww + 1e-9);
      if (jHi - jLo > RANGE_CAP) return false;
      for (let j = jLo; j <= jHi; j++) {
        if (lineHits(overlap, kx + j * b[0], ky + j * b[1], kz + j * b[2], a, box)) return false;
      }
    }
    return true;
  }

  /**
   * Sütunları a, b, c olan matrisin tersi (satır listesi). p = i·a + j·b + k·c
   * için [i, j, k] = inv · p. Satırlar: (b×c)/det, (c×a)/det, (a×b)/det.
   */
  function invert3(a, b, c) {
    const bc = cross3(b, c);
    const det = dot3(a, bc);
    if (Math.abs(det) < 1e-12) return null;
    const ca = cross3(c, a), ab = cross3(a, b);
    return [
      [bc[0] / det, bc[1] / det, bc[2] / det],
      [ca[0] / det, ca[1] / det, ca[2] / det],
      [ab[0] / det, ab[1] / det, ab[2] / det],
    ];
  }

  function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

  /**
   * Açgözlü kafes arama: a = tüm katları C dışında kalan en kısa vektör,
   * b = |a×b| en küçük geçerli 2B kafes, c = |det| en küçük geçerli 3B kafes.
   * Geçerlilik, kutu içindeki tüm kafes noktaları eksen aralıklarıyla
   * sayılarak kesin kontrol edilir. Vektörler voksel biriminde tamsayı;
   * uzunluk/alan/hacim mm ile ölçülür.
   */
  function findLattice(os, vox, minCellVoxels, beam) {
    const { C, M, n } = os;
    const t0 = now();
    const R = [n[0], n[1], n[2]];
    const mm = (t) => [t[0] * vox[0], t[1] * vox[1], t[2] * vox[2]];
    const stats = { candidates: 0, checksA: 0, checksB: 0, checksC: 0 };

    // Yarı uzay adayları (t ve -t eşdeğer), C dışında olanlar — tipli diziler
    const maxC = (2 * R[0] + 1) * (2 * R[1] + 1) * (R[2] + 1);
    const cx = new Int16Array(maxC), cy = new Int16Array(maxC), cz = new Int16Array(maxC);
    let nc = 0;
    for (let tz = 0; tz <= R[2]; tz++) for (let ty = -R[1]; ty <= R[1]; ty++) for (let tx = -R[0]; tx <= R[0]; tx++) {
      if (tz === 0 && (ty < 0 || (ty === 0 && tx <= 0))) continue;
      if (tx < n[0] && tx > -n[0] && ty < n[1] && ty > -n[1] && tz < n[2] && tz > -n[2]) {
        const ix = tx < 0 ? tx + M[0] : tx, iy = ty < 0 ? ty + M[1] : ty, iz = tz < 0 ? tz + M[2] : tz;
        if (C[ix + M[0] * (iy + M[1] * iz)]) continue;
      }
      cx[nc] = tx; cy[nc] = ty; cz[nc] = tz; nc++;
    }
    stats.candidates = nc;
    stats.msCands = now() - t0;
    if (nc === 0) return null;
    const cand = (i) => [cx[i], cy[i], cz[i]];

    // Anahtara göre artan sırada (kovalı sayma sıralaması) geçerli adaylar.
    // keyFn(tx, ty, tz) mm cinsinden; kova genişliği aralığın 1/4096'sı.
    // En fazla `want` aday döner; `diverse` verilirse yön olarak birbirine
    // yakın adaylar elenir (beam araması için çeşitlilik).
    const NB = 4096;
    const keys = new Float64Array(nc);
    const bucketOf = new Int32Array(nc);
    const hist = new Int32Array(NB + 1);
    const order = new Int32Array(nc);
    const topValid = (keyFn, validFn, minKey, want, diverse) => {
      let kmax = -Infinity;
      for (let i = 0; i < nc; i++) { keys[i] = keyFn(cx[i], cy[i], cz[i]); if (keys[i] > kmax) kmax = keys[i]; }
      const span = Math.max(1e-9, kmax - minKey);
      hist.fill(0);
      for (let i = 0; i < nc; i++) {
        const k = keys[i];
        bucketOf[i] = (k >= minKey && k > 0) ? Math.min(NB - 1, Math.floor((k - minKey) / span * (NB - 1))) : NB; // NB: elenmiş
        hist[bucketOf[i]]++;
      }
      const startIdx = new Int32Array(NB + 2);
      for (let b = 0; b <= NB; b++) startIdx[b + 1] = startIdx[b] + hist[b];
      const fillPos = startIdx.slice();
      for (let i = 0; i < nc; i++) order[fillPos[bucketOf[i]]++] = i;
      const found = [];
      let firstKey = -1;
      for (let b = 0; b < NB; b++) {
        if (firstKey >= 0 && minKey + (b / (NB - 1)) * span > firstKey * 1.6) break; // ilk bulgunun 1,6 katına kadar ara
        // Kova içinde anahtara göre sırala (küçük kovalar)
        const list = [];
        for (let p = startIdx[b]; p < startIdx[b + 1]; p++) list.push(order[p]);
        if (list.length === 0) continue;
        list.sort((i, j) => keys[i] - keys[j]);
        for (const i of list) {
          const v = [cx[i], cy[i], cz[i]];
          if (diverse && found.some((f) => diverse(f, v))) continue;
          if (!validFn(v[0], v[1], v[2])) continue;
          found.push(v);
          if (firstKey < 0) firstKey = keys[i];
          if (found.length >= want) return found;
        }
      }
      return found;
    };
    const firstValid = (keyFn, validFn, minKey) => { const f = topValid(keyFn, validFn, minKey, 1); return f.length ? f[0] : null; };

    // Yön benzerliği (mm uzayında, cos > 0.9 ≈ 25°)
    const similarDir = (u, v) => {
      const a = mm(u), b = mm(v);
      const d = Math.abs(dot3(a, b)) / (Math.hypot(a[0], a[1], a[2]) * Math.hypot(b[0], b[1], b[2]) + 1e-12);
      return d > 0.9;
    };

    const overlap = makeOverlapQuery(os);
    const beamA = Math.max(1, beam && beam.a || 1), beamB = Math.max(1, beam && beam.b || 1);

    // a: tüm katları C dışında olan en kısa vektörler (yön çeşitliliğiyle)
    const aList = topValid(
      (tx, ty, tz) => Math.hypot(tx * vox[0], ty * vox[1], tz * vox[2]),
      (tx, ty, tz) => { stats.checksA++; return multiplesAvoid(C, M, n, [tx, ty, tz]); },
      0, beamA, beamA > 1 ? similarDir : null,
    );
    if (aList.length === 0) return null;
    stats.msA = now() - t0;

    const box = [n[0] - 1, n[1] - 1, n[2] - 1];
    const minVol = (minCellVoxels || 0) * vox[0] * vox[1] * vox[2] * 0.95;
    let best = null;
    const alternatives = [];
    for (const a of aList) {
      const amm = mm(a);
      // b: |a×b| en küçük, 2B kafesi C'den kaçınan vektörler
      const bList = topValid(
        (tx, ty, tz) => {
          const x = tx * vox[0], y = ty * vox[1], z = tz * vox[2];
          const c0 = amm[1] * z - amm[2] * y, c1 = amm[2] * x - amm[0] * z, c2 = amm[0] * y - amm[1] * x;
          return Math.hypot(c0, c1, c2);
        },
        (tx, ty, tz) => { stats.checksB++; return lattice2DAvoids(overlap, a, [tx, ty, tz], n); },
        0, beamB, beamB > 1 ? similarDir : null,
      );
      for (const b of bList) {
        const bmm = mm(b);
        const nrm = cross3(amm, bmm);
        // c: |det| en küçük, 3B kafesi C'den kaçınan vektör.
        // Hücre hacmi şişirilmiş parçanın voksel hacminden küçük olamaz (alt sınır).
        const ab = dot3(a, b), aa = dot3(a, a);
        const w = [b[0] - ab / aa * a[0], b[1] - ab / aa * a[1], b[2] - ab / aa * a[2]];
        const nrmVox = cross3(a, b);
        const pre = { nrm: nrmVox, supN: boxSupport(nrmVox, box), w, ww: dot3(w, w), supW: boxSupport(w, box) };
        const keyC = (tx, ty, tz) => Math.abs(nrm[0] * tx * vox[0] + nrm[1] * ty * vox[1] + nrm[2] * tz * vox[2]);
        const validC = (tx, ty, tz) => { stats.checksC++; return lattice3DAvoids(overlap, a, b, [tx, ty, tz], n, pre); };
        let c = firstValid(keyC, validC, minVol);
        if (!c && minVol > 0) c = firstValid(keyC, validC, 0);
        if (!c) continue;
        const cmm = mm(c);
        const vol = Math.abs(dot3(nrm, cmm));
        const cand = { a: amm, b: bmm, c: cmm, cellVolume: vol, aVox: a, bVox: b, cVox: c };
        alternatives.push(cand);
        if (!best || vol < best.cellVolume) best = cand;
      }
    }
    stats.ms = now() - t0;
    if (!best) return null;
    best.stats = stats;
    best.alternatives = alternatives;
    return best;
  }

  /** Vektörü Z ekseninde θ derece döndürür. */
  function rotZ(v, thetaDeg) {
    const cs = Math.cos(thetaDeg * DEG), sn = Math.sin(thetaDeg * DEG);
    return [v[0] * cs - v[1] * sn, v[0] * sn + v[1] * cs, v[2]];
  }

  /**
   * Kafes noktalarından, parça kutusu "allowed" kutusunun içinde kalanları sayar.
   * allowed: parça orijininin bulunabileceği eksen hizalı kutu {min:[..], max:[..]}.
   * @returns {{count:number, points:Array<[number,number,number]>|null}}
   */
  function countLatticeInBox(basis, offset, allowed, collect) {
    const size = [allowed.max[0] - allowed.min[0], allowed.max[1] - allowed.min[1], allowed.max[2] - allowed.min[2]];
    if (size[0] < 0 || size[1] < 0 || size[2] < 0) return { count: 0, points: collect ? [] : null };
    // Kutu merkezine göre kafes koordinat aralıkları
    const center = [allowed.min[0] + size[0] / 2 - offset[0], allowed.min[1] + size[1] / 2 - offset[1], allowed.min[2] + size[2] / 2 - offset[2]];
    const half = [size[0] / 2, size[1] / 2, size[2] / 2];
    // p = offset + i a + j b + k c ∈ allowed  <=>  i a + j b + k c ∈ [center-half, center+half]
    const ranges = latticeRangesShifted(basis, center, half);
    if (!ranges) return { count: 0, points: collect ? [] : null };
    let count = 0;
    const points = collect ? [] : null;
    const [a, b, c] = basis;
    for (let k = ranges[2][0]; k <= ranges[2][1]; k++) for (let j = ranges[1][0]; j <= ranges[1][1]; j++) for (let i = ranges[0][0]; i <= ranges[0][1]; i++) {
      const x = i * a[0] + j * b[0] + k * c[0], y = i * a[1] + j * b[1] + k * c[1], z = i * a[2] + j * b[2] + k * c[2];
      if (Math.abs(x - center[0]) <= half[0] + 1e-9 && Math.abs(y - center[1]) <= half[1] + 1e-9 && Math.abs(z - center[2]) <= half[2] + 1e-9) {
        count++;
        if (points) points.push([x + offset[0], y + offset[1], z + offset[2], k]);
      }
    }
    return { count, points };
  }

  function latticeRangesShifted(basis, center, half) {
    const inv = invert3(basis[0], basis[1], basis[2]);
    if (!inv) return null;
    const ranges = [[Infinity, -Infinity], [Infinity, -Infinity], [Infinity, -Infinity]];
    for (let s = 0; s < 8; s++) {
      const p = [center[0] + (s & 1 ? 1 : -1) * half[0], center[1] + (s & 2 ? 1 : -1) * half[1], center[2] + (s & 4 ? 1 : -1) * half[2]];
      for (let d = 0; d < 3; d++) {
        const q = inv[d][0] * p[0] + inv[d][1] * p[1] + inv[d][2] * p[2];
        if (q < ranges[d][0]) ranges[d][0] = q;
        if (q > ranges[d][1]) ranges[d][1] = q;
      }
    }
    return ranges.map((r) => [Math.floor(r[0]), Math.ceil(r[1])]);
  }

  /**
   * Kafes yerleşiminden sonra kalan boşluklara tek tek parça sığdırır.
   * Baskı hacmi vokselleştirilir, yerleşmiş parçalar (boşluğun yarısı kadar
   * şişirilmiş) işaretlenir; alttan yukarı taranarak her boş konumda parça
   * θ+{0, 90, 180, 270}° Z açılarıyla denenir, ilk sığan yerleştirilir.
   *
   * @param {Float32Array} tilted yatırılmış üçgenler (θ'sız)
   * @param {number} theta kafesin Z açısı
   * @param {Array} points [x, y, z, memberIndex] (mesh ötelemesi)
   * @param {Array} members {phi, zMin} — phi: θ'ya eklenen Z açısı
   * @returns {{points:Array, members:Array, voxel:number, ms:number}}
   */
  function fillRemaining(tilted, theta, gap, margin, build, points, members, fillAngles) {
    const t0 = now();
    const ext = bbox3(tilted).size;
    const maxExt = Math.max(ext[0], ext[1], ext[2]);
    const vb = Math.min(4, Math.max(1.5, maxExt / 24));
    const voxV = [vb, vb, vb];

    // Üye listesi: mevcut üyeler + doldurma açıları
    const mem = members.map((m) => Object.assign({}, m));
    const memberFor = (phi) => {
      const norm = ((phi % 360) + 360) % 360;
      let idx = mem.findIndex((m) => (((m.phi % 360) + 360) % 360) === norm);
      if (idx < 0) { mem.push({ phi: norm, zMin: null, polyRel: null }); idx = mem.length - 1; }
      return idx;
    };
    const variantIdx = fillAngles.map(memberFor);

    // Şablonlar (üye başına): döndürülmüş parça, vb vokselde, şişirilmiş
    const usable = [build.x - 2 * margin, build.y - 2 * margin, build.z - 2 * margin];
    const templates = mem.map((m) => {
      const tris = rotateTrisZ(tilted, theta + m.phi);
      const prep = prepareShape(tris, gap, 0, voxV);
      if (m.zMin == null) m.zMin = prep.box.min[2];
      if (!m.polyRel) m.polyRel = convexHullXY(tris).hull;
      return { prep, r: prep.r[0] };
    });
    const R = Math.max(...templates.map((t) => t.r));
    const O = [margin - R * vb, margin - R * vb, margin - R * vb];
    const dims = [0, 1, 2].map((i) => Math.ceil((usable[i] + 2 * R * vb) / vb) + 1);
    const occ = new Uint8Array(dims[0] * dims[1] * dims[2]);
    const lin = (x, y, z) => x + dims[0] * (y + dims[1] * z);

    for (const t of templates) {
      const g = t.prep.grid, d = t.prep.dims;
      const deltas = [];
      let minI = [Infinity, Infinity, Infinity], maxI = [-Infinity, -Infinity, -Infinity];
      for (let z = 0; z < d[2]; z++) for (let y = 0; y < d[1]; y++) for (let x = 0; x < d[0]; x++) {
        if (!g[x + d[0] * (y + d[1] * z)]) continue;
        deltas.push([x, y, z]);
        if (x < minI[0]) minI[0] = x; if (y < minI[1]) minI[1] = y; if (z < minI[2]) minI[2] = z;
        if (x > maxI[0]) maxI[0] = x; if (y > maxI[1]) maxI[1] = y; if (z > maxI[2]) maxI[2] = z;
      }
      // Erken çıkış için deterministik karıştırma
      for (let i = deltas.length - 1; i > 0; i--) { const j = (i * 7919 + 13) % (i + 1); const tmp = deltas[i]; deltas[i] = deltas[j]; deltas[j] = tmp; }
      t.lin = Int32Array.from(deltas.map((v) => lin(v[0], v[1], v[2])));
      t.minI = minI; t.maxI = maxI;
      t.base = [0, 1, 2].map((i) => t.prep.origin[i] - O[i]); // p + base → voksel konumu
      // Parçanın (şişirilmemiş) gövdesi kullanılabilir alan içinde kalsın: s aralığı (mm'den türetilir)
      // parça min = O + (s + r)·vb ≥ margin ; parça max = O + (s + r)·vb + ext ≤ margin + usable
      const ext = t.prep.box.size;
      t.sMin = [0, 1, 2].map(() => Math.ceil(R - t.r - 1e-9));
      t.sMax = [0, 1, 2].map((i) => Math.floor((usable[i] + R * vb - ext[i]) / vb - t.r + 1e-9));
    }

    const toS = (t, p) => [0, 1, 2].map((i) => Math.round((p[i] + t.base[i]) / vb));
    const stamp = (t, sidx) => {
      const s0 = lin(sidx[0], sidx[1], sidx[2]);
      const inside = sidx[0] + t.minI[0] >= 0 && sidx[1] + t.minI[1] >= 0 && sidx[2] + t.minI[2] >= 0 &&
        sidx[0] + t.maxI[0] < dims[0] && sidx[1] + t.maxI[1] < dims[1] && sidx[2] + t.maxI[2] < dims[2];
      if (inside) { for (let i = 0; i < t.lin.length; i++) occ[s0 + t.lin[i]] = 1; return; }
      // Kenar taşması: tek tek sınırla
      const g = t.prep.grid, d = t.prep.dims;
      for (let z = 0; z < d[2]; z++) for (let y = 0; y < d[1]; y++) for (let x = 0; x < d[0]; x++) {
        if (!g[x + d[0] * (y + d[1] * z)]) continue;
        const X = sidx[0] + x, Y = sidx[1] + y, Z = sidx[2] + z;
        if (X < 0 || Y < 0 || Z < 0 || X >= dims[0] || Y >= dims[1] || Z >= dims[2]) continue;
        occ[lin(X, Y, Z)] = 1;
      }
    };

    // Yerleşmiş parçaları işaretle
    for (const p of points) stamp(templates[p[3]], toS(templates[p[3]], p));

    // Tarama: alttan yukarı, ilk sığan açı
    const added = [];
    const vt = variantIdx.map((k) => templates[k]);
    for (let sz = 0; sz < dims[2]; sz++) for (let sy = 0; sy < dims[1]; sy++) for (let sx = 0; sx < dims[0]; sx++) {
      for (let v = 0; v < vt.length; v++) {
        const t = vt[v];
        if (sx < t.sMin[0] || sy < t.sMin[1] || sz < t.sMin[2] || sx > t.sMax[0] || sy > t.sMax[1] || sz > t.sMax[2]) continue;
        if (sx + t.minI[0] < 0 || sy + t.minI[1] < 0 || sz + t.minI[2] < 0 ||
            sx + t.maxI[0] >= dims[0] || sy + t.maxI[1] >= dims[1] || sz + t.maxI[2] >= dims[2]) continue;
        const s0 = lin(sx, sy, sz);
        let free = true;
        const L = t.lin;
        for (let i = 0; i < L.length; i++) { if (occ[s0 + L[i]]) { free = false; break; } }
        if (!free) continue;
        for (let i = 0; i < L.length; i++) occ[s0 + L[i]] = 1;
        const k = variantIdx[v];
        added.push([sx * vb - t.base[0], sy * vb - t.base[1], sz * vb - t.base[2], k]);
        break;
      }
    }
    return { points: added, members: mem, voxel: vb, ms: now() - t0 };

  }

  /** 2B zarfların birleşiminin dışbükey zarfı (nokta listesi girer). */
  function hullOfPoints2D(points) {
    const pts = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) { pts[i * 3] = points[i][0]; pts[i * 3 + 1] = points[i][1]; }
    return convexHullXY(pts).hull;
  }

  /**
   * Kafes tabanlı yerleşim hesabı.
   * @param {Float32Array} tris üçgen çorbası (mm)
   * @param {object} opts DEFAULTS alanları; opts.pairAngles: eş için Z açıları
   *   (örn. [180] veya [90,180,270]); boş/yok ise çift aranmaz.
   */
  function computeNestingLattice(tris, opts) {
    const o = Object.assign({}, DEFAULTS, opts || {});
    const build = Object.assign({}, MJF_5600, o.build || {});
    const t0 = now();

    const stats = meshStats(tris);
    const original = bbox3(tris);
    const tilted = tiltPoints(tris, o.tiltX, o.tiltY);
    const tiltedBox = bbox3(tilted);
    const height = tiltedBox.size[2];
    const hullResult = convexHullXY(tilted);
    const hullA = hullResult.hull;
    const tol = hullResult.tolerance;

    // Tek parça kafesi (ince voksel); beam ile birkaç alternatif kafes
    const tVox0 = now();
    const prep = prepareShape(tilted, o.gap, VOX_N);
    const voxelMs = now() - tVox0;
    const tFft0 = now();
    const os = overlapSet(prep.grid, prep.dims);
    const fftMs = now() - tFft0;
    const tLat0 = now();
    const latSingle = findLattice(os, prep.vox, prep.filledDilated, { a: 3, b: 2 });
    const latticeMs = now() - tLat0;
    if (!latSingle) {
      return Object.assign(computeNestingBox(tris, opts), { mode: 'box', note: 'Kafes bulunamadı, kutu yöntemi kullanıldı.' });
    }

    const usable = { x: build.x - 2 * o.margin, y: build.y - 2 * o.margin, z: build.z - 2 * o.margin };
    const singleConfig = (lat) => ({ kind: 'single', basis0: [lat.a, lat.b, lat.c], cellVolume: lat.cellVolume, perCell: 1,
      hull: hullA, zMin: tiltedBox.min[2], zMax: tiltedBox.max[2], members: [{ hull: hullA, delta: [0, 0, 0], zMin: tiltedBox.min[2], phi: 0 }] });

    // Bir kafes yapılandırmasını baskı alanında sayar: θ taraması × ofset denemeleri
    const fr = [0, 0.25, 0.5, 0.75];
    const sweepConfig = (config, step) => {
      let bestT = null;
      const sweep = [];
      for (let theta = 0; theta < 180; theta += step) {
        const raw = hullExtentAt(config.hull, theta);
        const extXY = hullMinMaxAt(config.hull, theta);
        const basis = config.basis0.map((v) => rotZ(v, theta));
        // Motif orijini (A parçasının θ ile döndürülmüş mesh koordinat sistemi) için izinli kutu
        const allowed = {
          min: [o.margin - extXY.minX + tol / 2, o.margin - extXY.minY + tol / 2, o.margin - config.zMin],
          max: [build.x - o.margin - extXY.maxX - tol / 2, build.y - o.margin - extXY.maxY - tol / 2, build.z - o.margin - config.zMax],
        };
        let bestTheta = null;
        for (const u of fr) for (const v of fr) for (const w of fr) {
          const offset = [
            allowed.min[0] + u * basis[0][0] + v * basis[1][0] + w * basis[2][0],
            allowed.min[1] + u * basis[0][1] + v * basis[1][1] + w * basis[2][1],
            allowed.min[2] + u * basis[0][2] + v * basis[1][2] + w * basis[2][2],
          ];
          const res = countLatticeInBox(basis, offset, allowed, false);
          if (!bestTheta || res.count > bestTheta.count) bestTheta = { count: res.count, offset, basis, allowed, theta, w: raw.w + tol, l: raw.l + tol };
        }
        sweep.push({ theta, total: bestTheta.count * config.perCell });
        if (!bestT || bestTheta.count > bestT.count) bestT = bestTheta;
      }
      return { best: bestT, sweep, total: bestT.count * config.perCell };
    };

    // Adaylar: tek kafes alternatifleri + çift kafesi; kutuya sığan adede göre seç
    const step = Math.max(0.5, o.angleStep);
    const coarseStep = Math.max(step, 4);
    const candidates = (latSingle.alternatives || [latSingle]).map(singleConfig);
    let pair = null, pairMs = 0;
    const phis = (o.pairAngles || []).filter((a) => Number.isFinite(a) && a % 360 !== 0);
    if (phis.length) {
      const tPair0 = now();
      pair = pairSearch(tilted, o.gap, phis, stats.volume);
      pairMs = now() - tPair0;
      if (pair) {
        const boxB = bbox3(pair.trisB);
        const hullB = convexHullXY(pair.trisB).hull;
        const hullBShift = hullB.map((p) => [p[0] + pair.delta[0], p[1] + pair.delta[1]]);
        candidates.push({
          kind: 'pair', phi: pair.phi, delta: pair.delta,
          basis0: [pair.lat.a, pair.lat.b, pair.lat.c], cellVolume: pair.lat.cellVolume, perCell: 2,
          hull: hullOfPoints2D(hullA.concat(hullBShift)),
          zMin: Math.min(tiltedBox.min[2], boxB.min[2] + pair.delta[2]),
          zMax: Math.max(tiltedBox.max[2], boxB.max[2] + pair.delta[2]),
          members: [
            { hull: hullA, delta: [0, 0, 0], zMin: tiltedBox.min[2], phi: 0 },
            { hull: hullB, delta: pair.delta, zMin: boxB.min[2] + pair.delta[2], phi: pair.phi },
          ],
        });
      }
    }
    const tSweep0 = now();
    let config = null, chosen = null;
    for (const cfg of candidates) {
      const r = sweepConfig(cfg, coarseStep);
      if (!chosen || r.total > chosen.total) { chosen = r; config = cfg; }
    }
    const fine = coarseStep > step ? sweepConfig(config, step) : chosen;
    const best = fine.best;
    const sweep = fine.sweep;
    const sweepMs = now() - tSweep0;

    const placedCells = countLatticeInBox(best.basis, best.offset, best.allowed, true).points;
    // Parça konumları: her hücrede motif üyeleri (θ ile döndürülmüş delta)
    const cs = Math.cos(best.theta * DEG), sn = Math.sin(best.theta * DEG);
    const members = config.members.map((m) => ({
      polyRel: m.hull.map((p) => [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs]),
      delta: [m.delta[0] * cs - m.delta[1] * sn, m.delta[0] * sn + m.delta[1] * cs, m.delta[2]],
      zMin: m.zMin, phi: m.phi,
    }));
    let points = [];
    for (const p of placedCells) {
      for (let k = 0; k < members.length; k++) {
        const m = members[k];
        points.push([p[0] + m.delta[0], p[1] + m.delta[1], p[2] + m.delta[2], k]);
      }
    }
    const latticeCount = points.length;

    // Kalan boşlukları tek tek parçayla doldur (Z'de 0/90/180/270°); ayrıca
    // kafessiz, sıfırdan açgözlü voksel yerleşimini birkaç θ için dene ve
    // en çok parça vereni kullan.
    let fillCount = 0, fillMs = 0, finalMembers = members, strategy = 'lattice', finalTheta = best.theta;
    let latticeCountFinal = latticeCount;
    if (o.fill !== false) {
      const tFill0 = now();
      const angles = o.fillAngles || [0, 180, 90, 270];
      const fillRes = fillRemaining(tilted, best.theta, o.gap, o.margin, build, points, members, angles);
      points = points.concat(fillRes.points);
      finalMembers = fillRes.members;
      fillCount = fillRes.points.length;
      if (fillCount > 0) strategy = 'lattice+fill';
      const thetas = [best.theta, 0, 90].filter((v, i, arr) => arr.indexOf(v) === i);
      for (const th of thetas) {
        const blf = fillRemaining(tilted, th, o.gap, o.margin, build, [], [{ phi: 0, zMin: tiltedBox.min[2], polyRel: null }], angles);
        if (blf.points.length > points.length) {
          points = blf.points;
          finalMembers = blf.members;
          strategy = 'greedy';
          finalTheta = th;
          latticeCountFinal = 0;
          fillCount = blf.points.length;
        }
      }
      fillMs = now() - tFill0;
    }
    const total = points.length;
    let zMin = Infinity, zMax = -Infinity;
    for (const p of points) { const zs = p[2] + finalMembers[p[3]].zMin; if (zs < zMin) zMin = zs; if (zs > zMax) zMax = zs; }
    const bandH = height + o.gap;
    const bottomCount = points.filter((p) => p[2] + finalMembers[p[3]].zMin < zMin + bandH).length;
    const zLevels = points.length ? Math.ceil((zMax - zMin) / bandH + 1e-9) + 1 : 0;

    const buildVolume = build.x * build.y * build.z;
    return {
      mode: 'lattice',
      build,
      options: o,
      mesh: stats,
      originalSize: original.size,
      tiltedSize: [best.w, best.l, height],
      tiltedBoxSize: tiltedBox.size,
      usable,
      bestAngle: finalTheta,
      footprint: { w: best.w, l: best.l },
      height,
      lattice: { a: best.basis[0], b: best.basis[1], c: best.basis[2], cellVolume: config.cellVolume, perCell: config.perCell },
      latticeDensity: config.perCell * stats.volume / config.cellVolume,
      singleDensity: stats.volume / latSingle.cellVolume,
      pair: config.kind === 'pair' ? { phi: config.phi, delta: config.delta } : null,
      pairTried: phis.length ? phis : null,
      strategy,
      latticeCount: latticeCountFinal,
      fillCount,
      fillVoxel: Math.min(4, Math.max(1.5, Math.max(tiltedBox.size[0], tiltedBox.size[1], tiltedBox.size[2]) / 24)),
      perLayer: bottomCount,
      layers: zLevels,
      bandHeight: bandH,
      total,
      points,
      members: finalMembers.map((m) => ({ polyRel: m.polyRel, zMin: m.zMin, phi: m.phi })),
      zRange: [zMin, zMax],
      sweep,
      densityByPart: total * stats.volume / buildVolume,
      densityByBox: total * (best.w * best.l * height) / buildVolume,
      voxel: { size: prep.vox, dims: prep.dims, filled: prep.filled, filledDilated: prep.filledDilated, ms: voxelMs, fftMs, latticeMs, pairMs, sweepMs, fillMs, latticeStats: latSingle.stats },
      elapsedMs: now() - t0,
    };
  }

  /** Zarfın θ döndürmesinden sonraki min/max XY değerleri. */
  function hullMinMaxAt(hull, thetaDeg) {
    const c = Math.cos(thetaDeg * DEG), s = Math.sin(thetaDeg * DEG);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of hull) {
      const x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  }

  // ---------------------------------------------------------------------
  // Ana hesap
  // ---------------------------------------------------------------------

  /**
   * @param {Float32Array} tris üçgen çorbası (mm)
   * @param {object} opts DEFAULTS ile aynı alanlar
   */
  function computeNestingBox(tris, opts) {
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
      mode: 'box',
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

  /**
   * Ana giriş. opts.mode: 'lattice' (varsayılan, gerçek şekil) veya 'box'.
   */
  function computeNesting(tris, opts) {
    const mode = (opts && opts.mode) || DEFAULTS.mode;
    return mode === 'box' ? computeNestingBox(tris, opts) : computeNestingLattice(tris, opts);
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
    voxelize,
    dilate,
    overlapSet,
    findLattice,
    crossOverlapSet,
    dimerOverlapSet,
    prepareShape,
    pairSearch,
    fillRemaining,
    rotateTrisZ,
    countLatticeInBox,
    computeNestingBox,
    computeNestingLattice,
    computeNesting,
  };
});
