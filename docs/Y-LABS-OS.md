# 🏭 Y-LABS OS — Otonom 4-Kanal Medya & Büyüme İşletim Sistemi (v2.0 Spec)

> **Amaç:** *Kinetic Lab*, *Clear Mechanics*, *Wealth Mechanics* ve *Bio Mechanics* kanallarının her birini **1 Şubat 2027** öncesi **1.000 Abone + 4.000 Geçerli İzlenme Saati (YPP)** eşiğine ulaştırmak ve yüksek RPM'li global (ABD/İngilizce) sürdürülebilir gelir motoruna dönüştürmek.
> **Tasarım Felsefesi:** Akademik süsleme yok; her kural kodda denetlenebilir **sayısal kısıtlarla** tanımlanır.

---

## 1. AKTİF 4 KANAL & MARKA KİTLERİ (ABD Prime Time)

| Kanal | YouTube / Instagram | Renk Paleti (BG / Primary / Accent) | Görsel Motor & RPM Hedefi |
| :--- | :--- | :--- | :--- |
| **Kinetic Lab HQ** | `@kineticlabshorts` / `@kineticlab.motion` | `#0B0F19` / `#00F0FF` / `#FF3B30` | 60fps 2D/3D Fizik Simülasyonu (`$3–$6 RPM`) |
| **Clear Mechanics** | `@clearmechanicsshorts` / `@clearmechanics.lab` | `#141414` / `#FF9500` / `#FFFFFF` | Three.js 3B PBR X-Ray & Mühendislik (`$5–$9 RPM`) |
| **Wealth Mechanics** | `@wealthmechanicsshorts` / `@wealthmechanics.hq` | `#090D16` / `#FFD60A` / `#30D158` | Bileşik Matematik & Finans Data-Viz (`$12–$22 RPM`) |
| **Bio Mechanics** | `@biomechanicshq` / `@biomechanics.hq` | `#0D1117` / `#34C759` / `#FF2D55` | Biyolüminesans Anatomi & Kuvvet Vektörü (`$8–$14 RPM`) |

---

## 2. SAYISAL ÜRETİM KURALLARI (Her Karede Zorunlu)

| Parametre | Shorts (9:16 — 1080×1920, 60fps) | Pillar Uzun Video (16:9 — 1920×1080, 60fps) |
| :--- | :--- | :--- |
| **Süre Bandı** | `30–42 sn` | `5–6 dk` (monotonlaşma olmadan max saat getirisi) |
| **İlk Kanca (Hook)** | `0.0–1.75 sn` sessiz görsel kırılma + Prediction Error | `0.0–5.0 sn` kapak vaadini anında görselle doğrulama (sıfır intro) |
| **Görsel Ritim** | Her `3.5–5.0 sn` yeni aksiyon / veri katmanı | Her `15–25 sn` faz değişimi + her `60 sn` bölüm ödülü |
| **Geçiş Süresi** | `transitionMs >= 350` (sert 1-2 sn sıçrama yasak) | `transitionMs >= 350` cross-dissolve + kamera easing |
| **Odak Sınırı** | `maxFocalElements <= 2` (merkez %40 güvenli alan) | `maxFocalElements <= 2` + Spotlight (%100 aktif / %35 pasif) |
| **Altyazı Kuralı** | `2–3 kelime/parça` Word-Pop + aktif kelime Accent glow | **Tam metin altyazı YASAK** — yalnızca 2–3 kelimelik vurgu etiketi |
| **Ses & Akustik** | `acousticLeadMs = 50` (SFX görselden 50 ms önce), `-14 LUFS`, auto-ducking | `acousticLeadMs = 50`, `-14 LUFS`, konuşma aralarında BGM swell |
| **Döngü / Çıkış** | Seamless Loop (`t=0 === t=DUR`) + İkili Seçim Yorum Kancası | Son 15 sn **Oturum Köprüsü (Session Bridge)** → kanalın 2. videosu |
| **Yayın Ritmi** | Günde **2 Short / kanal** (`UTC 14:xx` & `19:xx`) | **2 günde 1 Uzun Video / kanal** (`MIN_PUBLISH_GAP_HOURS = 40`) |

---

## 3. ✅ MEVCUT SİSTEMDE CANLI OLANLAR (`origin/main`)

1. **Tam Otonom 4-Kanal Yayın Hattı (GitHub Actions — 0 Sunucu Maliyeti):**
   - 2 ayrı Google Cloud projesi (her kanal çifti için ayrı 10.000 YouTube API kotası) + `Channel Guard` yanlış kanal kilidi.
   - 4 kanalın tamamında **YouTube Shorts + Instagram Reels** paralel yayını + 4'lü kardeş ağ çapraz linkleri (`src/network-links.ts` — IG'de `@` yalnızca gerçek IG hesaplarında).
   - **Altın Ritim (v1.5):** Tüm kanallarda günde 2 Short + 2 günde 1 16:9 Uzun Video + `40 saat` `narrative-*` uzun video aralık koruması (`src/devops.ts`).
2. **Çift Motorlu Deterministik 60fps Render Hattı:**
   - Saf HTML5 Canvas (30 Kinetic Lab nişi, 44 Clear Mechanics bölümü, 9 Wealth + 10 Bio bölümü, 8 adet 4-perdeli 16:9 Deep Dive).
   - Offline **Three.js 3B WebGL PBR** motoru (`src/webgl-helper.ts`, SwiftShader, `gyroscope-3d` & `car-differential-3d`).
3. **Retention & Büyüme Modülleri:**
   - 60fps **Word-Pop Dinamik Altyazı** (`src/word-captions.ts` — 2–3 kelime, yay animasyonu, sıfır GPU).
   - İlk `1.75 sn` sessiz Scroll-Stop kanca + kesintisiz Loop yüzer rozet + 2026 DM paylaşım tetikleyicisi.
   - Prosedürel SFX + konuşmada otomatik ducking'li telifsiz synth BGM + `-14 LUFS` (`src/audio.ts`).
   - 1 Pillar 16:9 → 3 Vitrin Short otomatik huni kuyruğu (`src/derive-shorts.ts`) + Telegram 1-dokunuş Studio Related Video linki.
   - `1280×720` otomatik kapak yükleme (`thumbnails.set` — `src/youtube.ts`).
4. **Otonom Yönetim & Koruma:**
   - **6 Saatlik 4-Kanallı Direktör (`src/channel-director.ts`):** YT + IG metrikleri, toplam izlenme ağırlıklı `viralScore`, kazanan formatı her 2 slotta 1 otomatik öne alma + Telegram strateji kartı.
   - **Watchdog (`src/scheduler.ts` — her 10 dk)**, **Organik Yorum Yanıtı (her 2 saat)**, **QC Gate (`src/qc.ts`)**, kayıpsız paralel state birleştirme (`src/safe-git-push.ts`) ve **47/47 unit test**.

---

## 4. 🚀 YENİ EKLENECEK MODÜLLER (Y-LABS OS v2.0 Yol Haritası)

1. **Gerçek Sinematik 16:9 Kapak Stüdyosu (`assets/thumbnails/*.jpg`):**
   - Canvas "slayt" kapağı yerine her 16:9 amiral video için **AI görüntü üretim modeli (`generate_image`) + keskin 2–3 kelimelik (başlığı tekrar etmeyen) 3-Öğe Göz-Takibi kapağı** → hedef `%7–12 CTR`.
2. **Sıfır Robotik Ses Kilidi (`src/voice.ts`):**
   - Birincil Yüksel Medya Nöral TTS API + yedek olarak **`espeak-ng` yasağı** yerine ücretsiz **Microsoft Edge Neural TTS (`en-US-AndrewMultilingualNeural`)** emniyet ağı.
3. **50 ms Akustik Öncelik (`src/audio.ts`):**
   - Tüm çarpışma/kırılma/geçiş SFX olaylarının görsel kareden **50 ms önce (`Math.max(0, ev.t - 0.05)`)** tetiklenmesi.
4. **Sinematik `350 ms` Cross-Dissolve + Spotlight Yönetmenliği:**
   - Sert 1–2 sn sahne sıçramalarını bitirmek için tüm yeni uzun/kısa sahnelerde `350 ms` yumuşak geçiş + aktif parça `%100` parlak / pasif arka plan `%35` karartma.
5. **5–6 Dakikalık "Midpoint Twist + Session Bridge" Pillar Motoru:**
   - Monotonlaşmadan yüksek AVD tutan, ortasında ters köşe barındıran ve son 15 sn'de kanalın 2. videosuna bağlanan 5–6 dakikalık amiral videolar (10–12 tutarlı videoyla kümülatif 4.000 saat).
6. **Render Sonrası Görsel/Ses QA + Veri-Güdümlü Eleme Döngüsü:**
   - `src/qc.ts` içine otomatik kare taşma/donuk kare/ses-senkron denetimi.
   - Haftalık YouTube Studio *"Stayed to Watch"* verisiyle `< %60` formatları kuyruktan eleme ve `> %70` kanıtlanmış kazananları 5–6 dakikalık Pillar videoya yükseltme.
7. **Opsiyonel Offline `matter-js` 2D Fizik Köprüsü:**
   - `three.module.js` gibi `matter.min.js`'yi `webgl-helper.ts`'ye bağlayıp gelecek Kinetic Lab sahnelerinde gerçek rigid-body fizik motoru kullanımı.

---

## 5. ❌ BİLİNÇLİ OLARAK REDDEDİLENLER (Neden Almıyoruz?)

- **`Remotion` + `WhisperX` + `fal.ai` / `ChatCut`:** GPU/lisans maliyeti ve 3× yavaş render yaratır; mevcut saf Canvas + Three.js + `word-captions.ts` motorumuz ücretsiz CPU runner'da çok daha hızlı ve deterministiktir.
- **8+ Dakikalık Saf Prosedürel Video:** 5–6 dakikadan sonra prosedürel grafikte görsel monotonluk ve TTS tonlama düzleşmesi başlar; ideal nokta **5–6 dk**dır.
- **Varsayılan Facebook Reels:** `ENABLE_FACEBOOK_REELS=true` verilmedikçe kapalı (`src/facebook.ts`).
- **Aynı Gün 4–6 Video Basmak:** Spam/cannibalization riskini sıfırlamak için günde 2 Short + 2 günde 1 Uzun **Altın Ritim** kilitlidir.
