# Page Tint

Göz alan bembeyaz sayfaları kısmak, fazla karanlık sayfaları açmak için küçük bir tarayıcı uzantısı. Ayarı sadece o anki **sekmeye** ya da **pencereye** uygular, diğer sayfalara dokunmaz.

Ayarlar kalıcı değildir: sekme ya da pencere kapanınca (veya tarayıcı kapanınca) silinir. Aynı sekmede başka bir sayfaya geçersen ayar o sekmede kalır.

## Özellikler

- **Parlaklık, kontrast, sıcaklık** (mavi ışığı azaltır) ve **doygunluk** kaydırıcıları
- **Koyu mod:** Sayfanın renklerini ters çevirir, resim ve videoları olduğu gibi bırakır
- **Renk katmanı:** Sayfanın üstüne istediğin renkte, istediğin yoğunlukta bir ton. Üç seçenek var:
  - *Açık alanlar*: Beyazlar seçtiğin renge döner, yazılar koyu kalır (bembeyaz sayfalar için)
  - *Koyu alanlar*: Siyahlar seçtiğin renge açılır (çok karanlık sayfalar için)
  - *Hepsi*: Düz renk perdesi
- **Hazır ayarlar:** Loş, Kağıt, Gece, Aydınlat
- **Bu sekme / Bu pencere** seçimi. Aralarında geçiş yapınca ayar da beraberinde taşınır.
- **Kısayol:** `Alt+Shift+L` bu sekmede aç/kapat yapar. Hiç ayar yoksa "Loş"u uygular. Kısayolu `chrome://extensions/shortcuts` sayfasından değiştirebilirsin.
- Bir kaydırıcının üstüne çift tıklarsan o değer sıfırlanır.

## Kurulum (Chrome, Edge, Brave, Opera)

1. [Releases](https://github.com/ak1nttr/page-tint/releases) sayfasından `page-tint-x.y.z-chrome.zip` dosyasını indirip bir klasöre çıkar. Klasörü silme, uzantı oradan çalışır.
2. `chrome://extensions` sayfasını aç ve sağ üstten **Geliştirici modu**nu aç.
3. **Paketlenmemiş öğe yükle** butonuna bas ve çıkardığın klasörü seç.
4. Araç çubuğundaki yapboz simgesinden Page Tint'i sabitle.

## Sınırlar

- Chrome kendi sayfalarında (`chrome://…`, yeni sekme, Chrome Web Store) uzantıların çalışmasına izin vermez.
- Chrome'un PDF görüntüleyicisinde çalışmaz.
- Koyu mod sayfaların çoğunda iyi çalışır. Kendi renklerini çok özel kuran bazı sitelerde sonuç kusurlu olabilir. Böyle durumlarda "Loş" ya da "Kağıt" ayarı daha temiz sonuç verir.

## Nasıl çalışıyor

- Parlaklık, kontrast ve benzeri ayarlar `<html>` öğesine CSS `filter` olarak uygulanır. Kök öğedeki filtre, sitelerin sabit (fixed) menülerini bozmaz.
- Renk katmanı, tıklamaları engellemeyen ve `mix-blend-mode` ile karışan tam ekran bir katmandır.
- Ayarlar `storage.session` içinde tutulur. Bu alan bellekte durur ve tarayıcı kapanınca temizlenir.

## Geliştirme

Gereken: Node.js 20+.

```sh
npm install
npm run dev            # Chrome'u uzantı yüklü olarak açar, değişiklikte yeniler
npm run build          # .output/chrome-mv3
npm run zip            # yayın için zip
npm run build:firefox  # Firefox paketi (.output/firefox-mv3)
```

[WXT](https://wxt.dev) ve TypeScript ile yazıldı. İkonlar `node scripts/make-icons.mjs` komutuyla üretilir.
