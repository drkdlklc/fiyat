# MJF Yerleşim Hesabı

HP Jet Fusion 5600 (380 × 284 × 380 mm) baskı hacmine bir parçadan kaç adet
sığdığını hesaplayan, tamamen tarayıcıda çalışan araç. Fiyat verirken hızlı
adet tahmini için tasarlanmıştır.

- **Girdi:** STL (binary/ASCII), STEP, IGES, BREP. STEP ailesi dosyalar
  `vendor/occt-import-js` (OpenCascade WebAssembly) ile üçgenlere çevrilir.
- **Yönelim:** Parça önce X, sonra Y ekseninde 25° yatırılır (ayarlanabilir).
- **Yerleşim (varsayılan, "gerçek şekil"):** Parça vokselleştirilir ve
  parçalar arası boşluğun yarısı kadar şişirilir. İki kopyanın çakıştığı
  öteleme kümesi FFT otokorelasyonla bulunur; kopyaların hiç çakışmadığı en
  sık kafes (üç öteleme vektörü) açgözlü aramayla seçilir. Parçalar böylece
  hem XY'de hem Z'de birbirinin içine girer. Yalnızca Z ekseninde döndürme
  serbesttir: 0–180° taranır, kafes ve parça birlikte döndürülür, baskı
  alanına en çok parça sığdıran açı ve kafes kaydırması seçilir.
- **Yerleşim ("sınırlayıcı kutu"):** Her parça eksenlere hizalı kutusu
  kadar yer kaplar; katman katman dizilir. Muhafazakâr karşılaştırma için.
- **Çıktı:** Toplam adet, alt katmandaki adet, kafes adımları ve doluluğu,
  en iyi Z açısı, boyutlar, parça hacmi/yüzey alanı, baskı doluluğu ve
  üstten yerleşim çizimi. İsteğe bağlı "maks. doluluk" sınırı (MJF'de
  pratikte %10–15) adedi hacimsel olarak sınırlar.

Fiziksel/çarpışma simülasyonu yoktur; voksel çözünürlüğü (~1/58 parça
boyu) nedeniyle sonuç ±%5 civarında sapabilir. Hesap bir Web Worker'da
çalışır, tipik parçada ~1–3 s sürer.

## Kullanım

- GitHub Pages: `https://<kullanıcı>.github.io/fiyat/mjf/`
- Yerel: `python3 -m http.server --directory mjf 8000` → `http://localhost:8000`
- `index.html` dosyasını doğrudan çift tıklayarak açmak STL için çalışır;
  STEP okuyucu (wasm) tarayıcı kısıtı nedeniyle bir sunucu gerektirir.

## Test

```
node mjf/nesting.test.js
```
