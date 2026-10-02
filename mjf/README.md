# MJF Yerleşim Hesabı

HP Jet Fusion 5600 (380 × 284 × 380 mm) baskı hacmine bir parçadan kaç adet
sığdığını hesaplayan, tamamen tarayıcıda çalışan araç. Fiyat verirken hızlı
adet tahmini için tasarlanmıştır.

- **Girdi:** STL (binary/ASCII), STEP, IGES, BREP. STEP ailesi dosyalar
  `vendor/occt-import-js` (OpenCascade WebAssembly) ile üçgenlere çevrilir.
- **Yönelim:** Parça önce X, sonra Y ekseninde 25° yatırılır (ayarlanabilir).
- **Yerleşim:** Yalnızca Z ekseninde döndürme serbesttir. 0–180° taranır,
  her açı için parçanın XY sınırlayıcı kutusu hesaplanır ve en çok adet
  veren açı seçilir. İstenirse aynı katmanda 90° çevrilmiş parçalarla artan
  şerit doldurulur. Katman sayısı Z yüksekliğinden gelir.
- **Çıktı:** Toplam adet, katman başına adet × katman, en iyi Z açısı,
  boyutlar, parça hacmi/yüzey alanı, doluluk oranı ve üstten yerleşim çizimi.

Hesap sınırlayıcı kutu tabanlıdır (fiziksel/çarpışma simülasyonu yoktur),
bu yüzden hızlıdır ve gerçek yerleştirmeye göre muhafazakâr bir sayı verir.

## Kullanım

- GitHub Pages: `https://<kullanıcı>.github.io/fiyat/mjf/`
- Yerel: `python3 -m http.server --directory mjf 8000` → `http://localhost:8000`
- `index.html` dosyasını doğrudan çift tıklayarak açmak STL için çalışır;
  STEP okuyucu (wasm) tarayıcı kısıtı nedeniyle bir sunucu gerektirir.

## Test

```
node mjf/nesting.test.js
```
