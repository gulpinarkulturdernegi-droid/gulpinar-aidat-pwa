GÜLPINAR AİDAT PWA — YAYINLAMA DOSYALARI

İçerik:
- index.html: bağımsız tam ekran aidat uygulaması
- manifest.webmanifest: PWA uygulama tanımı
- sw.js: uygulama kabuğu önbelleği (API/kişisel yanıtlar önbelleğe alınmaz)
- icons/: uygulama simgeleri

Yayınlama:
1) Bu klasörün içeriğini HTTPS destekleyen statik barındırma alanına yükleyin (GitHub Pages veya Cloudflare Pages).
2) index.html, manifest.webmanifest, sw.js ve icons klasörü aynı yayın kökünde olmalı.
3) Yayınlanan HTTPS bağlantısını Android Chrome ve iPhone Safari'de test edin.
4) Test başarılı olmadan Blogger'daki eski aidat bağlantısını kaldırmayın.

Üye kurulumu:
- Android: bağlantıyı Chrome'da açın; “Uygulamayı yükle” seçeneğini kullanın (veya Chrome menüsü > Uygulamayı yükle).
- iPhone: bağlantıyı Safari'de açın > Paylaş > Ana Ekrana Ekle.

Güvenlik notu:
Service worker yalnızca uygulama kabuğunu ve statik simgeleri önbelleğe alır. Google Apps Script istekleri ve üye sorgu sonuçları önbelleğe alınmaz.
