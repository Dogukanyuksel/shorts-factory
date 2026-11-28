# Y-LABS ENGINE V4.0 — Otonom Video Fabrikası Mimari & Migrasyon Rehberi

> **Amaç:** Bu belge, `Dogukanyuksel/shorts-factory` projesinde doğrulanan tüm 3D PBR render, nöral seslendirme, retention mühendisliği, politika/güvenlik zırhı ve V4.0 büyüme protokolünü **başka bir Git projesine eksiksiz taşımak ve o projeyi sıfır hatayla revize etmek** için tek kaynak (Single Source of Truth) olarak hazırlanmıştır.

---

## 0. Ajana Doğrudan Verilecek Başlangıç Komutu (Yeni Projede Kullan)

Yeni projenin sohbetinde bu dosyayı ekleyip şu komutu ver:

```text
Bu Y-LABS-ENGINE-V4-BLUEPRINT.md belgesini incele. Mevcut projeyi adım adım bu standartlara göre denetle, eksikleri tespit et ve Bölüm 8'deki Migrasyon Kontrol Listesi sırasıyla revize et. Her adımda typecheck, unit test ve Playwright WebGL QA doğrulamasını çalıştır.
```

---

## 1. Çekirdek Mimari & Modül Haritası

Her otonom video fabrikası aşağıdaki modüler ayrımı korumalıdır:

| Modül / Dosya | Sorumluluk | Kritik Kural |
| :--- | :--- | :--- |
| `src/ylabs-3d-kit.js` | Paylaşılan Three.js 3D PBR stüdyo motoru (3-nokta ışık, `bufferScale: 1.0`, `antialias: true`, PBR materyal preset'leri, Safe-Zone HUD) | Sıfır harici CDN; offline `https://local.shorts/ylabs-3d-kit.js` üzerinden servis edilir. |
| `src/webgl-helper.ts` | Headless Chrome SwiftShader argümanları (`CHROMIUM_RENDER_ARGS`), offline route interceptor (`attachLocalEngines`), **3D-Only Publish Gate** (`assertThreeJsScene`, `isThreeJsSceneFileSync`), boş kuyruk Telegram uyarısı | Tüm `chromium.launch()` çağrıları `CHROMIUM_RENDER_ARGS` kullanmak zorundadır. |
| `src/voice.ts` + `src/phonetic-overrides.ts` | Çoklu nöral TTS (birincil Kokoro-82M `$0/ay`, opsiyonel OpenAI, cinsiyet uyumlu yedek API) + telaffuz sözlüğü | Üretimde `espeak-ng` **KESİNLİKLE YASAK** (`DRY_RUN=true` hariç). Fonetik dönüşüm sadece TTS'e gider; altyazı/SRT bozulmaz. |
| `src/word-captions.ts` | Konuşulan kelimeyle milisaniye senkronlu 2–3 kelimelik yaylı Word-Pop Canvas altyazısı | Safe-Zone (`H * 0.768`), son `2.4 sn`'de otomatik gizlenir (bitiş kartıyla sıfır overlap). |
| `src/policy-guard.ts` | Yayından önce çalışan politika, kopya başlık (Jaccard `>= 0.78`), AI doktor/danışman persona ve feragatname denetimi | Hassas nişlerde (finans/sağlık) kendi feragatnamesini yanlışlıkla reddetmemesi için negatif lookbehind (`/(?<!not\s)\bfinancial\s+advice\b/i`) zorunludur. |
| `src/render*.ts` / `src/publish*.ts` | Native `1080×1920` (Shorts) ve `1920×1080` (16:9 Long-Form) render, FFmpeg master kodlama, YT + IG dağıtım | `page.evaluate()` içine iç içe arrow function **ASLA** yazma (`tsx` `__name` hatası). |
| `src/instagram.ts` | Meta Reels yükleyici | Geçici `400 ProcessingFailedError` için taze container ile **3 denemeli otomatik retry** zorunludur. |
| `src/derive-shorts.ts` | Uzun videodan 3 adet Feeder Short üretme + Related Video hunisi + sabitlenen ilk yorum | V4.0 yüksek dönüşümlü yorum ve açıklama şablonu kullanılır. |
| `test/release-audit.test.ts` | Kalıcı mimari regresyon testleri (WebGL args, 3D-Only seçici, `findBeat` boşluk koruması, Telegram env, `.npmrc` CUDA koruması, 0 false-positive policy guard) | Her push öncesi `npm run typecheck && npm test` zorunludur. |

---

## 2. 3D PBR Sinema Motoru & Master Görsel Kalite

### A. 3D-Only Publish Gate (2D Sızıntı Engeli)
- Seçici fonksiyonlar (`pickNextJob` / `pickNextExpansionJob`) `isEligible` filtresi alır; 2D veya politika-redli işler **seçici içinde atlanır** (seçim sonrası throw atmak sonsuz kilitlenme / deadlock yaratır).
- Kuyrukta uygun 3D sahne kalmadıysa sistem 2D yayınlamaz; Telegram'a *"3D kuyruğu bitti"* uyarısı atıp `exit 0` ile temiz kapanır.
- `ALLOW_LEGACY_2D=true` yalnızca açık kullanıcı onayıyla açılabilir.

### B. Sahne Kontratı (Deterministik 60fps)
Her 3D sahne (`.html`) şu kontratı sağlamak zorundadır:
- `<script type="module" data-engine="three">`
- `import * as THREE from 'https://local.shorts/three.module.js';`
- `import { createStudioStage, createMaterials, addXrayEdges, drawStudioHud, clamp, lerp, smooth, easeOutCubic } from 'https://local.shorts/ylabs-3d-kit.js';`
- `window.initScene({ width, height, fps, duration, lines, seed })`
- `window.renderFrame(t)` (sıfır `Math.random()`, tam deterministik)
- `window.getEvents()` (görsel kırılmalardan **35–40 ms önce** `bounce` / `break` / `win` SFX tetikleyicileri)
- `window.getScript()` (anlatımlı sahnelerde beat dizisi)

### C. Ultra-Keskin Master Çıktı (4K Algısı / Sıfır Bulanıklık)
- Canvas render çözünürlüğü doğrudan native **`1080×1920`** (Shorts) / **`1920×1080`** (Long-Form).
- WebGL `bufferScale: 1.0`, `antialias: true`, `ACESFilmicToneMapping`.
- FFmpeg master profili: `libx264`, `-profile:v high`, `-level 4.2`, `-crf 15`, `-maxrate 16M`, `-bufsize 24M`, `-pix_fmt yuv420p`, ses `192k AAC @ 48kHz`.

---

## 3. Ses, Fonetik & Psikoakustik Mühendislik

1. **8 Benzersiz Nöral Ses Matrisi (`$0/ay` Kokoro-82M):**
   - Her kanalın kendine özgü birincil sesi (Erkek/Kadın dengeli) + 16:9 uzun videolarda 2. Perdede kulak yorgunluğunu kıran **karşı cinsiyet Co-Host** sesi bulunur.
   - Yedek nöral API çağrılarında cinsiyet uyumu (`af_*` → kadın, `am_*` → erkek) korunur.
   - Sessiz Shorts üretimi **yasaktır** (ilk `0.1 sn`'de dinamik dış ses başlar).
2. **TTS Fonetik Sözlük (`src/phonetic-overrides.ts`):**
   - Tıbbi, bilimsel ve teknik terimler (`Vagus` → `Vay-gus`, `beta-amyloid` → `bay-ta am-uh-loyd`, `cerebrospinal`, `macrophages`, `alveoli`, `precession`, `Chladni` vb.) yalnızca `synthesizeVoice()` içinde TTS'e gitmeden hemen önce dönüştürülür.
   - Ekrandaki Word-Pop altyazıları ve `.srt` dosyaları orijinal doğru yazımı korur.
3. **Psikoakustik Miks:**
   - Konuşma aralarına **180–200 ms mikro-sessizlik**, Shorts sonuna **400–450 ms loop nefesi**.
   - Görsel vuruşlardan **35–40 ms önce** SFX tetikleme.
   - Konuşma varken BGM otomatik baskılama (auto-ducking).
   - Final mastering: **`-14 LUFS`** entegre ses yüksekliği, **`-1.5 dBTP`** true peak.

---

## 4. Senaryo, Retention & Safe-Zone Kuralları

1. **Bilişsel Yanılgı Kancası (0–2 sn Scroll-Stop):**
   - Ders kitabı başlıkları (`"How X Works"`, `"Facts About Y"`) **YASAK**.
   - Doğrudan izleyiciye hitap eden **"You / Your" kayıp çerçevesi** veya yaygın yanlış sezgiyi ilk 1.5 saniyede yıkan kanca zorunludur.
   - Frame 0'da anında hareket (fade-in veya boş karanlık giriş yasak).
   - Aşırı büyük (`>= 100,000`, milyon, milyar) veya mikroskobik (mikron, milisaniye) sayı geçiyorsa ekranda **fiziksel ölçek kıyaslaması** (Visual Metaphor Scaler) gösterilir.
2. **Tempo & Cümle Ekonomisi:**
   - Shorts ideal süresi: **28–38 saniye** (50 sn+ sarkma yasak).
   - Her konuşma cümlesi maksimum **12–15 kelime**.
   - Her **3–5 saniyede bir** görsel durum değişimi + senkronize SFX.
3. **Safe-Zone & Sıfır Overlap Kuralı:**
   - Tüm HUD elemanları `x ∈ [6.5%W, 84%W]`, `y ∈ [12.5%H, 74%H]` içinde kalır.
   - Son `2.4 sn`'de bitiş/CTA rozeti girerken:
     - Word-Pop altyazı (`tSec < durVal - 2.4`) gizlenir.
     - 3D kit alt başlığı (`progress >= 0.88`) gizlenir.
     - Rozet arka planı `rgba(6, 10, 20, 0.96)` opak cam olur → **sıfır çakışma**.
   - Anket/etkileşim seçenekleri kesinlikle kanal ID'sine göre izole edilir (cross-channel sızıntı yasak).

---

## 5. 8–10 Dakikalık Yatay Deep-Dive & V4.0 Büyüme Hunisi

1. **Tek Konulu 8–10 Dakika Kuralı (Stitching Yasağı):**
   - 4 ayrı Shorts senaryosunu uç uca yapıştırıp `2:27`'lik yatay video yapmak **YASAK**.
   - Her 16:9 Pillar Deep Dive tek bir mekanizmayı 4 perdede (30+ beat, ~1,150–1,350 kelime, **8–10 dk**) derinlemesine öğretir:
     1. *Act 1:* Gizli Tuzak / Kanca
     2. *Act 2 (Co-Host Ses Geçişi):* Çekirdek Mekanizma & Sayısal Simülasyon
     3. *Act 3:* Kırılma Noktası / Hata Modu (Midpoint Twist)
     4. *Act 4:* Adım Adım Çözüm & Eylem Planı + Sonraki Bölüm Köprüsü
2. **16:9 Bug Korumaları:**
   - `findBeat()` fonksiyonu beat aralarındaki boşluklarda aktif beat'i tutar; asla son `SUBSCRIBE` beat'ine düşmez.
   - Sağ telemetri panelinde yalnızca kısa metrikler gösterilir; **tüm senaryoyu paragraf olarak basmak yasaktır**.
   - Her uzun video için otomatik **3 farklı `1280×720` thumbnail** (A: Kayıp/Tehlike, B: Bölünmüş Merak/Karşılaştırma, C: Alternatif) + `.srt` üretilir.
3. **Ölü CTA Yasağı & Related Video Hunisi:**
   - `"Subscribe for daily 60fps"` / `"FOLLOW FOR DAILY 60FPS"` gibi teknik jargonlu CTA'lar **YASAK**.
   - Shorts son `2.4 sn` rozeti: `👇 FULL BREAKDOWN IN LINK BELOW • [MARKA]`.
   - Sabitlenen ilk yorum (`src/derive-shorts.ts`): `"Want to see what happens at extreme limits? Watch the full 3D breakdown here 👉 [PILLAR_URL] — Which stage surprised you most?"`
4. **1-3-7 Dalga Yayın & 80/20 Lider Kanal Kuralı:**
   - **Day 0 (18:00 EST):** 8–10 dk Pillar Video + stratejik chapter zaman damgaları (`00:00`, `02:15`, `04:30`, `06:50`).
   - **Day 0 (+2h), Day 2, Day 4:** 3 adet Feeder Short, Studio `Related Video` ile Pillar videoya bağlanır.
   - İlk 12 saatte CTR `< %4.5` ise Variant B kapağa geçilir.
   - 14 gün sonunda `Stayed-to-Watch > %72` ve `AVD > %50` yakalayan 2 lider kanala kapasitenin %70'i aktarılır.

---

## 6. CI/CD, Güvenlik & Hata Korumaları

- **CPU CI 404 Koruması (`.npmrc`):** `onnxruntime-node-install-cuda=skip` mutlaka kök `.npmrc` dosyasında olmalı (aksi halde GPU'suz GitHub Actions runner'da `npm ci` 404 ile patlar).
- **Telegram Anlık İzleme:** Tüm publish workflow'larında `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` tanımlı olmalı; `if: failure()` bloğu ile başarısız run anında Telegram'a bildirilmeli.
- **Zorunlu Playwright WebGL QA:** Her yeni 3D sahne commit öncesi gerçek Headless Chrome + SwiftShader WebGL'de test edilir (`errs === 0`, merkez kare `nonZero > 100`, `t=1.5s` vs `t=14s` `diff > 10`).
- **Git Güvenliği:** Push öncesi daima `npm run typecheck && npm test` ve `git pull --rebase origin main`.

---

## 7. 9 Y-LABS Skill Çalışma Sırası

Yeni projede üretim yaparken şu skill zinciri sırayla uygulanır:
1. `ylabs-cognitive-misconception-miner` → Kanca & "You/Your" kayıp çerçevesi
2. `ylabs-visual-metaphor-scaler` → Büyük/mikro sayılar için fiziksel ölçek kıyaslaması
3. `ylabs-3d-cinema-engine` → Offline Three.js PBR 3D sahne üretimi
4. `ylabs-pro-motion-graphics` → Yaylı animasyonlar, kamera sarsıntısı, 2 renkli tipografi
5. `ylabs-psychoacoustic-mixer` → Kokoro-82M, fonetik sözlük, 35–40ms SFX, `-14 LUFS`
6. `ylabs-thumbnail-director` → 1280×720 Dual-Framing A/B/C kapaklar
7. `ylabs-retention-visual-qa` → Safe-Zone, sıfır overlap, Playwright çoklu kare görsel QA
8. `ylabs-analytics-feedback-loop` → 1-3-7 dalga yayın, Related Video hunisi, 80/20 optimizasyon
9. `ylabs-release-audit-gate` → Push öncesi adversarial bug, deadlock, güvenlik ve test kapısı

---

## 8. Yeni Projeye Uygulama (Migrasyon) Kontrol Listesi

Ajana bu belgeyi verdiğinde aşağıdaki sırayla ilerlemesini sağla:

- [ ] **Faz 1 — Altyapı & Zırh:** `.npmrc` (`onnxruntime-node-install-cuda=skip`), `src/webgl-helper.ts` (`CHROMIUM_RENDER_ARGS`, `attachLocalEngines`, 3D-Only Gate), `src/ylabs-3d-kit.js` ve workflow Telegram uyarılarını kur.
- [ ] **Faz 2 — Ses & Fonetik:** `src/voice.ts` (nöral ses matrisi + `espeak-ng` yasağı) ve `src/phonetic-overrides.ts` + `test/voice.test.ts` ekle.
- [ ] **Faz 3 — Kalite & Safe-Zone:** Render hatlarını native `1080×1920`, `CRF 15 / 16Mbps / 192k` master kaliteye çıkar; Word-Pop altyazıyı ve son `2.4 sn` sıfır-overlap Related Video rozetini bağla; tüm `"60fps"` CTA'larını temizle.
- [ ] **Faz 4 — Politika & IG Retry:** `src/policy-guard.ts` (negatif lookbehind + Jaccard + persona kontrolü) ve `src/instagram.ts` (3 denemeli retry) ekle.
- [ ] **Faz 5 — 3D PBR Stok & 8–10 Dk Pillar:** Her kanala en az 4–8 adet 3D PBR sahne + 30 beat'lik tek konulu 8–10 dk 16:9 Pillar Deep Dive (`findBeat` gap-safe, zero-paragraph sağ panel) üret.
- [ ] **Faz 6 — Doğrulama:** `test/release-audit.test.ts` ekle, tüm yeni sahneleri Headless Chrome Playwright WebGL QA'dan geçir, `npm run typecheck && npm test` ile %100 PASS al ve push et.
