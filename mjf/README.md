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
- **Eş çevirme (çift kafesi):** Parçanın Z'de 180° (isteğe bağlı 90°/270°)
  çevrilmiş eşi, çiftin kutusunu en küçük yapan çakışmasız konumlara
  yerleştirilip çift tek bir motif olarak kafese sokulur. Üçgen, kama,
  kanca gibi asimetrik parçalar bu sayede birbirine geçer; kazanç yoksa
  tek yön kullanılır.
- **Yerleşim ("sınırlayıcı kutu"):** Her parça eksenlere hizalı kutusu
  kadar yer kaplar; katman katman dizilir. Muhafazakâr karşılaştırma için.
- **Çıktı:** Toplam adet, alt katmandaki adet, kafes adımları ve doluluğu,
  en iyi Z açısı, boyutlar, parça hacmi/yüzey alanı, baskı doluluğu ve
  üstten yerleşim çizimi. "Maks. doluluk" sınırı (varsayılan %9,5) adedi
  hacimsel olarak sınırlar: geometrik adet sınırı aşarsa sonuç o doluluğu
  dolduran adettir, geometrik adet ayrıca gösterilir. 0 girilirse sınır yok.

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
