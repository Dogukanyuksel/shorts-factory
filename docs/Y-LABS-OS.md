# Y-LABS OS v2.2 — Otonom 4 Kanallı Medya İşletim Sistemi

> **Yaşayan İşletim Sistemi:** Her araştırma, her canlı yayın verisi ve her politika güncellemesi bu dokümanı ve kaynak kodu doğrudan evrimleştirir. Her kural kanıt düzeyine göre etiketlenir: **`[RESMİ]`** (YouTube / platform belgesi), **`[VERİ]`** (ölçülmüş araştırma/analitik), **`[GÖRÜŞ]`** (stüdyo uzlaşısı / deney).

---

## 1. Stratejik Hedef ve YPP Eşikleri `[RESMİ]`

- **Ağ Yapısı:** 4 İngilizce (ABD Prime Time / Tier-1 RPM) kanal **eşzamanlı** büyütülür; kanal kapatılmaz, render ve üretim odağı haftalık performansa göre dinamik kaydırılır.
- **Faz 1 — 1 Şubat 2027 Sprinti `[RESMİ]`:** 1 Şubat 2027 öncesinde **1.000 abone + 4.000 saat genel izlenme** eşiğini yakalayan her kanal, eşiği geçtiği gün YPP başvurusu yapar.
- **Faz 2 — 1 Şubat 2027 Sonrası Bileşik Motor `[RESMİ]`:** YouTube 1 Şubat 2027'de YPP giriş eşiğini **8.000 saat / 20M Shorts izlenmesine** çıkarır. Kurduğumuz 6–8 dakikalık 4-Perdeli derin videolar her iki eşiğe de doğrudan hizmet eder.

---

## 2. 4 Kanallı Marka ve Kokoro-82M (\$0/ay) Ses Mimarisi

YouTube'un **"tekrarlayan / şablon seri üretim" (`Help 1311392`) `[RESMİ]`** ret riskini kırmak ve kanal bazlı marka hafızası (brand recall) oluşturmak için 4 kanal **2 Erkek + 2 Kadın** dengesinde 4 benzersiz ABD İngilizcesi nöral ses kullanır (`src/voice.ts`):

| Kanal | YouTube / Instagram | İmza Ses (Shorts + Perde 1/3/4) | Kalite Notu | Uzun Video Perde-2 Co-Host |
| :--- | :--- | :--- | :---: | :--- |
| **1. Kinetic Lab HQ** (`physics`) | `@kineticlabshorts` / `@kineticlab.motion` | `am_fenrir` (Erkek · 1.04x) | C+ | `af_bella` (Kadın) |
| **2. Clear Mechanics** (`explainer`) | `@clearmechanicsshorts` / `@clearmechanics.lab` | `am_michael` (Erkek · 1.00x) | C+ | `af_heart` (Kadın) |
| **3. Wealth Mechanics** (`wealth`) | `@wealthmechanicsshorts` / `@wealthmechanics.hq` | `af_bella` (Kadın · 0.98x) | **A-** | `am_michael` (Erkek) |
| **4. Bio Mechanics** (`bio`) | `@biomechanicshq` / `@biomechanics.hq` | `af_heart` (Kadın · 1.00x) | **A** | `am_fenrir` (Erkek) |

### Ses Motoru Kuralları
1. **Birincil (\$0/ay, Apache-2.0):** `kokoro-js` (`onnx-community/Kokoro-82M-v1.0-ONNX`, `q8`, CPU). Ağırlıklar (~92 MB) `~/.cache/kokoro-82m` altında tutulur ve 6 GitHub Actions yayın iş akışında `actions/cache@v4` ile önbelleklenir.
2. **Uzun Video Co-Host Kuralı `[GÖRÜŞ]`:** Shorts'larda kanalın tek imza sesi sabit kalır (marka hafızası). 6–8 dakikalık 4-Perdeli uzun videolarda **Perde 2** karşı cinsiyette Co-Host tarafından seslendirilerek 2. dakikadaki kulak yorgunluğu kırılır; Perde 1, 3 ve 4 ana imza seste kalır.
3. **Üretim Yasağı:** Robotik `espeak-ng` üretimde kesinlikle yasaktır (`DRY_RUN=true` hariç). Microsoft'un resmî olmayan `Edge TTS` uç noktası kullanılmaz.

---

## 3. Yayın Ritmi ve Çoklu Platform Dağıtımı

- **Altın Ritim `[VERİ]`:** Kanal başına **günde 2 Short** (ABD Prime Time `UTC 14:xx` ve `19:xx`) + **2 günde 1 Uzun Video (16:9)** (tek/çift günlere dağıtılmış, `MIN_PUBLISH_GAP_HOURS=40`).
- **Platformlar:** Her Short **YouTube Shorts + Instagram Reels** olarak yayınlanır. Facebook Reels varsayılan olarak kapalıdır (`ENABLE_FACEBOOK_REELS=true` verilmedikçe çalışmaz).
- **Çapraz Ağ Linkleri (`src/network-links.ts`):** Instagram açıklamalarında YouTube kanal adının başına asla `@` konmaz; `@` yalnız 4 gerçek kardeş Instagram hesabımız için kullanılır.

---

## 4. İçerik, Tutma (Retention) ve Politika Kalkanları

1. **Shorts (`1080×1920`, 60fps, 28–42 sn) `[GÖRÜŞ/VERİ]`:**
   - İlk 2 saniyede görsel kırılma + üst Safe-Zone sessiz kanca rozeti (`0–1.75 sn`).
   - 2–3 kelimelik dinamik Canvas Word-Pop altyazı (`src/word-captions.ts`) + kanal vurgu rengi.
   - Bağımsız Shorts kesintisiz döngüyle (loop) biter; uzun videodan türetilen Vitrin Shorts'lar son bölümde ilgili uzun videoya yönlendirir `[RESMİ]`.
2. **4-Perdeli Uzun Videolar (`1920×1080`, hedef 6–8 dk) `[GÖRÜŞ]`:**
   - Tek konu üzerinde 4 bütünlüklü perde: Kanca → Çekirdek Mekanizma (Co-Host) → Limit/Arıza Durumu → Sentez.
   - İlk 5 saniyede kapaktaki vaat doğrudan gösterilir `[RESMİ]`.
   - Her uzun video için **3 farklı `1280×720` kapak varyantı** (`-thumb.jpg`, `-thumb-B.jpg`, `-thumb-C.jpg` — Studio `Test & Compare` için) + yerel `.srt` kapalı altyazı dosyası otomatik üretilir.
3. **Politika & Benzerlik Kapısı (`src/policy-guard.ts`) `[RESMİ]`:**
   - Tüm 4 kanalda (Shorts + Uzun Video) yüklemeden önce çalışır.
   - Son 60 başlıkla Jaccard n-gram benzerliği `>= 0.78` ise yayını durdurur, `>= 0.62` ise uyarır.
   - `wealth` ve `bio` kanallarında "yapay zekâ doktor/yatırım danışmanı" kimliğini engeller ve `"For educational purposes only"` ibaresini otomatik garanti eder.
4. **Ses & Teknik Kalite (`src/audio.ts`, `src/qc.ts`):**
   - `-14 LUFS` ses normalizasyonu, `50 ms` kırılma / `25 ms` sekme akustik öncelik, H.264 `yuv420p` 60fps/30fps deterministik render.
   - `src/channel-director.ts` 4 kanalın tamamını izler; 10K+ patlama yapan konuları `boostedNiches[0]` olarak kilitleyip klon frekansını artırır.

---

## 5. Gelişim Günlüğü (Living Changelog)
- **v2.0:** 4 kanallı ağ + 4-Perdeli 16:9 derin videolar + Altın Ritim zamanlayıcısı.
- **v2.1:** Word-Pop altyazılar, `policy-guard.ts`, 3 kapak varyantı, yerel `.srt` üretimi, 4-kanal Channel Director, robotik TTS yasağı.
- **v2.2 (Aktif):** **Kokoro-82M (\$0/ay)** entegrasyonu, **2 Erkek + 2 Kadın** imza ses dengesi (`am_fenrir`, `am_michael`, `af_bella` A-, `af_heart` A), uzun videolarda **Perde-2 Co-Host** karşı cinsiyet ses değişimi, tüm 4 kanalda zorunlu `runPolicyGuard` kapısı, GitHub Actions model önbellekleme.
