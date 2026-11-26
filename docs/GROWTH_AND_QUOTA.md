# Abone/Takipçi Büyümesi ve YouTube Kota Rehberi (26 Kasım 2026)

## 1. "Run failed" mesajlarının gerçek sebebi (loglardan)

| Çalışma | Sebep | Durum |
|---|---|---|
| 25 Kas 17:26 — 4 workflow anında "failed" | Workflow YAML söz dizimi hatası (`run:` satırları) | ✅ `2504f0f` ile düzeltildi |
| 25 Kas 17:51 — Physics + Explainer "failed" | Videolar YouTube'a **yüklendi**, ama state push'u `workflows` izni hatasıyla reddedildi | ✅ `9f8b34e` ile düzeltildi |

Loglarda **kota hatası görülmedi**. Ancak kota riski matematiksel olarak gerçek (aşağıda).
Ayrıca: **25 Kasım 18:27'den beri hiçbir zamanlanmış (cron) çalışma tetiklenmemiş.** Bugüne kadarki tüm yayınlar
elle (`workflow_dispatch`) başlatılmış. GitHub → Actions sekmesinde workflow'ların "disabled" olmadığını kontrol edin.

## 2. YouTube kotası

- Varsayılan kota: Google Cloud projesi başına **günde 10.000 birim**, sıfırlanma **gece yarısı Pasifik saati** (TR 11:00, yaz saatinde 10:00).
- Video yükleme kotanın en pahalı işlemidir. Günde **6 short + 2 uzun video = 8 yükleme**, iki kanal **aynı OAuth client'ı**
  (aynı Google projesini) kullandığı için tek kotayı paylaşıyor.

### Bu sürümde eklenen otomatik koruma
1. Yükleme `quotaExceeded` / `uploadLimitExceeded` dönerse:
   - workflow **"failed" olmaz** (watchdog boşuna yeniden denemez),
   - `state/youtube-quota.json`'a sıfırlanma saati yazılır,
   - Telegram'a **🚨 HATA yerine ℹ️ bilgi** gider: "kota doldu, TR saatiyle HH:MM'de otomatik devam".
2. Kota sıfırlanana kadarki sonraki slotlar **render bile yapmadan** atlanır (CI dakikası harcanmaz).
3. Gerçek hatalarda Telegram mesajı artık **hatanın sebebini** de içerir.
4. OAuth token düşerse (`invalid_grant`) ne yapılacağını söyleyen açık mesaj verilir.

### Kalıcı çözüm (sizin yapmanız gereken — 15 dk)
**Her kanala ayrı Google Cloud projesi** → kota 2 katına çıkar:
1. console.cloud.google.com → yeni proje (ör. "kinetic-lab-uploader") → YouTube Data API v3'ü etkinleştir.
2. OAuth consent screen → **"In production"** yap (Testing modunda refresh token **7 günde** düşer → "run failed" sebebi olur).
3. OAuth client (Desktop) oluştur → yeni client ile token al:

```bash
YOUTUBE_CLIENT_ID="yeni-id" YOUTUBE_CLIENT_SECRET="yeni-secret" npm run youtube:auth -- --channel physics
```

4. GitHub → Settings → Secrets → ekle: `YOUTUBE_CLIENT_ID_PHYSICS`, `YOUTUBE_CLIENT_SECRET_PHYSICS`,
   ve `YOUTUBE_REFRESH_TOKEN_PHYSICS`'i yeni tokenla güncelle. (Explainer ortak projede kalabilir.)
5. Daha fazlası gerekirse: Google'ın "YouTube API Services — Audit and Quota Extension" formu ile kota artışı istenebilir.

## 3. Abone / takipçi büyümesi

### Kodda yapılanlar (bu sürüm)
- **Kanıtlanmış viral formatlar kuyruğun başında:** Kinetic Lab'ın sonraki 6 short'u = 3 × "Reverse the spin" (22.2M formatı)
  + 3 × "How many folds…" (~16M formatı). Sonra her iki niş kalıcı rotasyonda.
- Her paylaşıma **görev/tahmin** cümlesi (yorum = algoritma sinyali) + **"✨ Follow for a new one every day"** çağrısı (Instagram caption'a otomatik).
- Çizimler gerçekçi hale getirildi (gölgeli 3D zar, silüetler, detaylı binalar, gezegenler, galaksiler, gökyüzü geçişi).

### Sizin yapmanız gerekenler (API ile yapılamıyor, ama büyümenin yarısı bunlar)
1. **Instagram'da trend müzik:** referans hesapların ikisi de trend şarkı kullanıyor ("Credits Song for My…"). Graph API lisanslı müzik ekleyemez →
   en iyi performans gösteren 1–2 Reels'i uygulamadan trend sesle **yeniden paylaşın** ya da Reels'e uygulamadan ses ekleyin.
2. **İlk 30 dakika:** her yeni videoya ilk yorumları cevaplayın (Telegram bot hazır yanıtı veriyor). Yanıtlanan yorumlar dağıtımı artırır.
3. **Profil:** bio'da tek cümlelik vaat ("Daily illusions your brain can't resist"), YouTube ↔ Instagram çapraz link, tutarlı avatar.
4. **YouTube Studio → Shorts → "Related video":** her short'u o günün 16:9 uzun videosuna bağlayın (izleyiciyi aboneye çevirir; API'de yok).
5. **Seri mantığı:** aynı formatta 5–10 video arka arkaya → izleyici "devamı" için takip eder. Kuyruk buna göre ayarlandı.

## 4. Organik etkileşim otomasyonu (26 Kasım)

| Otomasyon | Ne yapar | Sıklık |
|---|---|---|
| `engagement.yml` → `src/engage.ts` | **Kendi** YouTube ve Instagram videolarımızdaki yorumlara yanıt verir (son 7 gün). En çok beğenilen ve en yeni yorumlar önce; spam, link ve hakarete yanıt yok; Türkçeye Türkçe yanıt; yanıtlar arası 4–10 sn | 2 saatte bir |
| Yayın sonrası (YouTube) | İlk yorum (görev/anket sorusu) + videoyu seri oynatma listesine ekleme ("Reverse The Spin Illusion \| Kinetic Lab" gibi) | Her yeni short |

- Başka hesapları takip etme, başkalarına yorum atma veya sahte etkileşim **yok**. Hepsi platform kurallarına uygun, resmi API'ler üzerinden.
- YouTube'da kanal başına günde en fazla **25 yanıt** (`YT_DAILY_REPLY_CAP`). Her yanıt 50 kota birimi harcadığı için bu sınır video yükleme kotasını korur.

### ⚠️ Tek seferlik yapmanız gereken: YouTube'u yeniden yetkilendirme
Eski token yalnızca video yükleme iznine sahip. Yorum yanıtı, ilk yorum ve oynatma listesi için **her kanalda bir kez**:

```bash
YOUTUBE_CLIENT_ID="..." YOUTUBE_CLIENT_SECRET="..." npm run youtube:auth -- --channel physics
```

```bash
YOUTUBE_CLIENT_ID="..." YOUTUBE_CLIENT_SECRET="..." npm run youtube:auth -- --channel explainer
```

Çıkan yeni refresh token'ları GitHub → Settings → Secrets → Actions altında
`YOUTUBE_REFRESH_TOKEN_PHYSICS` ve `YOUTUBE_REFRESH_TOKEN_EXPLAINER` secret'larına yapıştırın.
Bu yapılana kadar sistem çalışmaya devam eder: Instagram yanıtları gider, YouTube kısmı atlanır ve Telegram'a günde bir uyarı gelir.

Instagram yanıtları için Meta token'ında `instagram_manage_comments` izni olmalı (Reels'e A/B anket yorumu atılabiliyorsa vardır).
