# Yabancı Kitleye Özel 2 Kanal Kurulum + Otomatik Yayın Rehberi

Bu rehber, **ABD / Avrupa (İngilizce)** kitlesini hedefleyen **2 ayrı YouTube Shorts kanalı** açmanız ve GitHub Actions üzerinden **günde 2 video (ABD sabah & akşam prime time)** otomatik yayın akışını bağlamanız için hazırlanmıştır.

---

## 1. "Ring / Simülasyon Kanalları Ban veya Para Kazanma Engeli Yiyor" Meselesi

Önemli gerçek: Bu videolar **yapay zeka (AI) değil**, %100 deterministik fizik/algoritma koduyla üretilir. Dolayısıyla "sentetik medya / AI yasağı" değil, **YPP "Tekrarlayan / Seri Üretim İçerik" (Repetitious / Mass-Produced Content)** filtresi risk oluşturur.

Sadece sessiz, hep aynı neon halkayı döndüren ve kopyala-yapıştır başlık kullanan kanallar YPP incelemesinde reddedilebilir. Bunu önlemek için `shorts-factory` içine **4 koruma katmanı** ekledik:

1. **İngilizce Sesli Fizik/Bilim Anlatımı (`--narration`):** Her fizik simülasyonunda kinetik enerji, kaos teorisi, Big-O karmaşıklığı veya harmonik dalga gibi gerçek bilimsel yorum seslendirilir (yorum/eğitim değeri ekler).
2. **6 Farklı Mekanik Rotasyonu:** `physics-ring` → `duel-balls` → `sorting-race` → `marble-drop` → `pendulum-wave` → `ball-grow` sırasıyla döner; art arda iki video **asla** aynı şablon olmaz.
3. **Özgün Başlık & Açıklama:** Kopyala-yapıştır spam açıklama yerine her videoya özel İngilizce bilimsel açıklama ve en fazla 3–5 temiz hashtag üretilir.
4. **Ayrı `How It Works` Kanalı:** Özel çizimli, sesli mühendislik/bilim açıklayıcıları YPP açısından **en güvenli ve en yüksek RPM'li** formattır.

> **Önemli not:** Para kazanma (YPP) onayında nihai kararı YouTube'un insan incelemecileri verir. Kanalınız 1.000 abone / 10M Shorts izlenmesine yaklaştığında kanal açıklaması ve videoların eğitimsel/bilimsel tutarlılığı onay şansını ciddi şekilde artırır.

---

## 2. Hesap Açılışı & Yabancı Kitle (ABD/Global) Ayarları

Her iki kanal için aynı Google hesabında **2 ayrı Marka Hesabı (Brand Account)** açabilir veya ayrı Gmail'ler kullanabilirsiniz.

### Ortak Zorunlu Ayarlar (YouTube Studio → Settings)
- **Channel → Basic info → Country of residence:** `United States` (veya `United Kingdom`)
- **Channel → Feature eligibility:** Telefon numarası ile **Intermediate features** doğrulamasını mutlaka açın (15 dk+ / özel küçük resim / API kotası için kritik).
- **Channel → Advanced settings → Audience:** `No, set this channel as not made for kids`
- **Upload defaults → Advanced settings:**
  - **Video language:** `English (United States)`
  - **Title and description language:** `English (United States)`
  - **Comments:** `On` (etkileşim algoritmayı besler)
- **Yeni Kanal Isıtma (0-View Jail Koruması):**
  - Kanalı açtıktan hemen sonra ilk gün 5 video birden yüklemeyin.
  - İlk 24–48 saatte kanal hesabıyla ABD/İngilizce bilim & fizik Shorts'ları izleyip birkaç normal beğeni yapın, sonra otomasyonu başlatın.

---

## 3. Kanal 1: Fizik & Simülasyon (Kopyala-Yapıştır Paket)

- **İsim Önerileri:** `Kinetic Lab`, `Motion & Math`, `SimuPhysics`, `Axiom Motion`
- **Handle Önerileri:** `@kineticlabshorts`, `@motionandmath`, `@axiommotion`
- **Kategori:** `Science & Technology` (Category ID: `28`)
- **Hazır İngilizce Kanal Açıklaması (Bio):**

```text
Where physics, math, and algorithms come alive in 60fps. ⚡

Every Short on this channel is a custom-coded, deterministic simulation exploring real scientific concepts — from elastic collisions and chaos theory to sorting algorithms, Galton probability, and harmonic pendulum waves.

New simulations daily. Subscribe to watch math in motion.
```

- **Kanal Anahtar Kelimeleri (Channel Keywords):**
```text
physics simulation, math visualization, science shorts, kinetic energy, chaos theory, sorting algorithms, pendulum wave, marble race, satisfying physics, stem
```

---

## 4. Kanal 2: How It Works / Nasıl Çalışır (Kopyala-Yapıştır Paket)

- **İsim Önerileri:** `How It Actually Works`, `60 Second Engineering`, `Inside The Machine`, `Clear Mechanics`
- **Handle Önerileri:** `@clearmechanics`, `@60secengineering`, `@insidethemachineshorts`
- **Kategori:** `Education` (Category ID: `27`)
- **Hazır İngilizce Kanal Açıklaması (Bio):**

```text
Everyday engineering and invisible science — explained in under 60 seconds. ⚙️

Ever wondered how noise-canceling headphones erase sound, why only your key opens your door, or how 400-ton airplanes stay in the air? We break down the real mechanics behind modern technology with clean animated cross-sections.

Subscribe for daily bite-sized engineering breakdowns.
```

- **Kanal Anahtar Kelimeleri (Channel Keywords):**
```text
how it works, engineering explained, science shorts, technology explained, mechanical engineering, physics explained, how things work, stem education, animated explainer
```

---

## 5. 10 Dakikada Otomatik Yayın Bağlantısı (GitHub Actions)

Otomasyon dosyaları repoda hazır:
- `.github/workflows/auto-publish-physics.yml` → Her gün **14:00 UTC** ve **23:00 UTC** (ABD sabah & akşam prime time)
- `.github/workflows/auto-publish-explainer.yml` → Her gün **14:30 UTC** ve **23:30 UTC**

### Adım 1: Google Cloud'da YouTube Data API v3 Açma (1 kez)
1. [Google Cloud Console](https://console.cloud.google.com/) → Yeni proje oluşturun (örn. `shorts-factory-auto`).
2. **APIs & Services → Library** → `YouTube Data API v3` aratıp **Enable** yapın.
3. **APIs & Services → OAuth consent screen**:
   - User Type: **External**
   - App name: `Shorts Factory`
   - **Test users** kısmına YouTube kanallarınızın bağlı olduğu Gmail adres(ler)ini ekleyin.
   - *(Not: Uygulama "Testing" modundayken refresh token 7 günde bir sıfırlanabilir; kalıcı olması için OAuth consent screen ekranında **Publish App** butonuna basabilirsiniz — sadece kendi kanalınız için `youtube.upload` kullandığınızda ek doğrulama ekranında "Advanced → Go to Shorts Factory" diyerek geçebilirsiniz.)*
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized redirect URIs: `http://localhost:4319/oauth2callback`
   - Oluşan **Client ID** ve **Client Secret** değerlerini kopyalayın.

### Adım 2: İki Kanal İçin Refresh Token Alma
Kendi bilgisayarınızda repo klasöründe şu iki komutu çalıştırın:

```bash
# Kanal 1 (Physics) için — açılan tarayıcıda Physics kanalını seçin:
YOUTUBE_CLIENT_ID="BURAYA_CLIENT_ID" YOUTUBE_CLIENT_SECRET="BURAYA_CLIENT_SECRET" npm run youtube:auth -- --channel physics

# Kanal 2 (How It Works) için — açılan tarayıcıda Explainer kanalını seçin:
YOUTUBE_CLIENT_ID="BURAYA_CLIENT_ID" YOUTUBE_CLIENT_SECRET="BURAYA_CLIENT_SECRET" npm run youtube:auth -- --channel explainer
```

### Adım 3: GitHub Secrets Ekleme
GitHub deponuzda **Settings → Secrets and variables → Actions → New repository secret** kısmına şu 4 değeri ekleyin:

| Secret Adı | Açıklama |
|---|---|
| `YOUTUBE_CLIENT_ID` | Google Cloud OAuth Client ID |
| `YOUTUBE_CLIENT_SECRET` | Google Cloud OAuth Client Secret |
| `YOUTUBE_REFRESH_TOKEN_PHYSICS` | Kanal 1 (Physics) refresh token |
| `YOUTUBE_REFRESH_TOKEN_EXPLAINER` | Kanal 2 (How It Works) refresh token |

### Adım 4: İlk Test (Dry-Run)
Secret'ları eklemeden önce bile GitHub → **Actions** sekmesinden `Auto-Publish Physics Shorts` workflow'unu seçip **Run workflow → dry_run: true** diyerek bulutta 60fps render alındığını doğrulayabilirsiniz. Secret'lar eklendikten sonra sistem günde 2 kez otomatik olarak render alıp yayınlayacak ve yayınlanan videoları `state/published.json` dosyasına işleyecektir.
