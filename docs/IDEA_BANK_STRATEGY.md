# Fikir Bankası & Rakip Format Analizi (25 Kasım 2026)

## 1. İncelenen hesaplar: ne görülebildi, ne görülemedi

| Kaynak | Durum | Görülen |
|---|---|---|
| `instagram.com/pixiomstudio` | ❌ Instagram `429 Too Many Requests` (oturumsuz istek engellendi) | — |
| `instagram.com/biologistmichael` | ❌ Instagram `429 Too Many Requests` | — |
| `instagram.com/reel/DesHMaaIaRc` | ✅ Okundu | @seymur.matematik ("Seymur Hoca"), **24.6K beğeni, 92 yorum**, 19 Ekim 2026 |

> İki profilin videoları **görülemedi**; o hesaplar için bu dokümanda tahmin yürütülmedi.
> Biyoloji serisi ("Inside Your Body") yalnızca hesap adının işaret ettiği alana göre eklendi;
> o hesabın gerçek formatını görmek için en çok izlenen 3–5 videonun ekran görüntüsü gerekiyor.

### Referans reel'in anatomisi (24.6K beğeni)
- **Konu:** iki nokta önden bakınca çakışıyor gibi görünüyor → **kamera dönünce 3. boyut çıkıyor**, aralarında 3 birim mesafe var.
- **Açılış cümlesi (caption):** şiirsel, felsefi tek satır — *"Her kesişme, bir kavuşma değildir…"*
- **Kapanış:** izleyiciye soru — *"Bizi yanıltan mesafe mi, bakış açısı mı?"* (yorum tetikleyici)
- **Görsel:** karanlık/uzay temalı minimal 3D sahne, tek nesne, yavaş kamera orbit'i.
- **Neden çalışıyor:** (1) ilk karede yanlış bir "kesinlik" verir, (2) kamera dönüşü bir **bilgi boşluğunu** tek hamlede kapatır,
  (3) cümle hayata dair bir metafor olduğu için **paylaşılır** (matematik dışı izleyiciye de ulaşır), (4) döngü: geri dönen kamera = loop.

Bu yapı mevcut playbook'umuzla (`docs/VIEWER_PSYCHOLOGY_PLAYBOOK.md`) birebir örtüşüyor:
Zeigarnik açılışı → bilgi boşluğu → tatmin edici açılım → kusursuz loop.

## 2. Üretilen fikir bankası

```bash
npm run ideas
```

- **2.558 benzersiz fikir**, 25 seri: `ideas/IDEA_BANK.csv` (Excel/Sheets'te açılır) ve `ideas/IDEA_BANK.json`
- **En iyi 200** (her seriden dengeli): `ideas/TOP_200.md`
- Her fikirde: kanal, seri, **başlık**, **ilk 1.5 sn hook**, **görsel plan**, **loop kapanışı**, **A/B yorum sorusu**, öncelik puanı.
- Konular `src/ideas/data.ts` içinde **somut ve gerçek** listelerdir; her format yalnızca uyumlu konularla eşleşir
  (ör. fizik kanalına biyoloji miti düşmez). Listeye yeni bir satır eklemek otomatik olarak 2–5 yeni fikir üretir.

| Seri | Kanal | Adet | Not |
|---|---|---|---|
| Gravity Showdown | Kinetic Lab | 1400 | En iyi performans gösteren `gravity-compare` formatının 12 gök cismi × 25 aktivite genişlemesi |
| How It Actually Works / Hidden Engineering | Clear Mechanics | 125 + 125 | 125 somut makine/organ/hayvan/doğa olayı |
| 1000x Slow Motion | ikisi | 70 | Yalnızca hareket içeren konular |
| **Change Your Angle / Guess The Shape / Perspective Poems / Two Cameras** | Clear Mechanics | 4 × 43 | **Referans reel'in birebir formatı** |
| Inside Your Body / Body Timeline / Body Myth or Fact | Clear Mechanics | 3 × 50 | Biyoloji ayağı |
| What If? / Second by Second | Clear Mechanics | 2 × 50 | Pazar araştırmasındaki 3.5M+ "What If" nişi |
| Physics Arena / 3-Way Split / Level Up | Kinetic Lab | 3 × 40 | Mevcut simülasyon motoruyla uyumlu |
| Proof Without Words / Math in 3D / Math Simulation | ikisi | 40 + 40 + 10 | Matematik ayağı (referans hesabın alanı) |
| Scale Ladder / Size Shock | Clear Mechanics | 30 + 30 | |
| You Were Taught Wrong / Physics Myth Test | ikisi | 30 + 16 | |
| Build It From Zero / What If It Failed? | Clear Mechanics | 50 + 50 | Yalnızca makineler |

## 3. Bugün üretilebilir mi?

| Seri | Durum | Gereken iş |
|---|---|---|
| Physics Arena, 3-Way Split, Level Up | ✅ Büyük kısmı mevcut niş'lerle (`niches/*/scene.html`) | Seed/hook varyasyonu |
| Gravity Showdown | 🟡 `gravity-compare` sahnesi **Moon/Earth/Jupiter ve zıplayan top olarak sabit kodlu** | Sahneyi `bodies` + `activity` parametresi alacak şekilde genelleştirmek → 1400 fikir tek şablondan |
| **Change Your Angle** (referans format) | 🔴 Şablon yok | **Tek bir veri güdümlü `perspective-reveal` 3D sahnesi** (ön görünüm → kamera orbit → etiketli gerçek). 43 × 4 = 172 fikir tek şablondan |
| How It Works / Body / What If / Proof | 🟡 Her biri için yeni `episodes/*.html` bölümü gerekiyor (mevcut 38 bölüm gibi) | Bölüm başına senaryo + animasyon |

## 4. Öneri: ilk adımlar
1. **`perspective-reveal` şablonu** — referans formatın kendisi, en yüksek puanlı seri; tek şablon 172 video üretir.
2. **`gravity-compare` parametrizasyonu** — kanıtlanmış en iyi formatımızı 1400 varyasyona açar (Kinetic Lab için aylarca içerik).
3. **Biyoloji serisi için örnek** — `biologistmichael` hesabının en çok izlenen 3–5 videosunun ekran görüntüsü gelince
   "Inside Your Body" görsel dili ona göre ayarlanmalı.
4. Fikirler A/B anket sistemiyle (`src/auto-publish.ts`) test edilip kazanan seriler katalogda öne alınmalı.
