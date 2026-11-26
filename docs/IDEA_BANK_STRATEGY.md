# Fikir Bankası & Rakip Format Analizi (25 Kasım 2026)

## 0. GÜNCELLEME (26 Kasım) — İki hesabın ekran kayıtları analiz edildi

Kullanıcının paylaştığı ekran kayıtlarından kare kare okundu (izlenme sayıları profil ızgarasından).

### @biologistmichael — "Zihnin güçlü, dönüşü tersine çevir"
| Video | İzlenme |
|---|---|
| Gri silindir, sarı oklar ("reverse the spin of the gray cylinder") | **22.2M** |
| Renkli doku stereogramı ("Adjust eyes correctly to see in 3-D") | **9.5M** / **8.8M** |
| Mor küre | 6.1M · 3.1M |
| Altın koni yüzeyi | 5.7M |
| Gökkuşağı 3D şerit | 5.1M |
| Pembe kase | 4M |

- **Format:** siyah zemin, **gürültü noktalarından** oluşan 3D şekil, **ortografik** (perspektifsiz) dönüş, ince kontur + sarı yön okları.
  Derinlik ipucu olmadığı için beyin dönüş yönünü iki şekilde de yorumlayabiliyor (*kinetik derinlik etkisi / bistabil algı*).
- **Asıl viral motor caption'da:** izleyiciye **görev** veriliyor → *"Your mind is powerful, reverse the spin of the gray cylinder."*
  Yorumlar övünme ve meydan okuma: *"Easiest one yet"* (53.8K beğeni), *"I reached the point where I can have it spin both ways"*.
  İzleyici başarana kadar **tekrar tekrar izliyor** → çok yüksek izlenme oranı (APV).
- Anlatım yok, sadece trend müzik; 10–20 sn; kusursuz loop.
- Pembe video: aynı koni önce **üçgen**, sonra **daire**, sonra **koni** olarak görünüyor (projeksiyon açılımı, referans matematik reel'iyle aynı fikir).

### @pixiomstudio — "How Many Folds To Reach Mars?" (~16M)
- **227K beğeni · 1.144 yorum · 4.362 paylaşım**, 36 sn.
- **Format:** 0.1 mm kâğıt her adımda ikiye katlanır; üstte büyük **sayaç** ("28 folds = 26.8 km") + hedefe **ilerleme çubuğu**;
  kamera geri çekilirken **gerçek ölçekli karşılaştırmalar**: zar → kedi → sen → ev → Burj Khalifa → Everest → uçak → uzay → ISS → … → Samanyolu → evren.
- Her kilometre taşında altyazı: *"Taller than you"*, *"Higher than Everest"*, *"83 folds: across the Milky Way"*.
- **Caption'ın sonu yorum tetikleyici:** *"Guess before it lands: how many folds for Mars?"* → izleyici tahminini yazıyor (1.1K yorum).

### Ortak ders
Her ikisi de **tamamen kodla üretilmiş prosedürel animasyon**: kamera, 3D model ya da seslendirme yok. Bu, bizim HTML canvas + Playwright motorumuzun tam olarak yaptığı şey.

### Bu oturumda üretilen hazır sahneler (render + QC geçti)
| Niş | Format | Varyant (`--seed`) |
|---|---|---|
| `niches/spin-illusion` | biologistmichael dönüş illüzyonu | 8 şekil × 5 renk = 40 (seed 1–40) |
| `niches/doubling-ladder` | pixiomstudio ikiye katlama merdiveni | 8 senaryo (kâğıt→Ay, para→Ay, $1→uzay, bakteri→Güneş, karınca→Everest, kâğıt→evren, nilüfer→ISS, mikro→Burj) |

```bash
npx tsx src/render.ts --niche spin-illusion --seed 1 --seconds 16 --hook "REVERSE THE SPIN WITH YOUR MIND"
```

```bash
npx tsx src/render.ts --niche doubling-ladder --seed 1 --seconds 30 --hook "HOW MANY FOLDS TO REACH THE MOON?"
```

Bu nişler `PhysicsNiche` tipine eklendi ama **otomatik yayın rotasyonuna (`PHYSICS_ROTATION`) eklenmedi**. Kanala girmeleri için onay bekleniyor.

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
