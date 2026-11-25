# DEVAM.md — Shorts Factory Canlı Durum & Yol Haritası

> **Son Güncelleme:** 2026-11-25 21:10 TRT  
> **Repo:** `Dogukanyuksel/shorts-factory` (`main`) · **Çalışma Modu:** %100 Bulut (GitHub Actions, PC kapalıyken 7/24 aktif)

---

## 1. Canlı Otomatik Yayın Takvimi (TRT / Türkiye Saati)

| Saat (TRT) | Kanal | Format | Workflow |
| :--- | :--- | :--- | :--- |
| **14:07, 20:07, 02:07** | Kinetic Lab (Physics) | Shorts + Reels (3/gün) | `.github/workflows/auto-publish-physics.yml` |
| **14:37, 20:37, 02:37** | Clear Mechanics (Explainer) | Shorts + Reels (3/gün) | `.github/workflows/auto-publish-explainer.yml` |
| **17:15** | Clear Mechanics (Explainer) | **16:9 Uzun Belgesel (1/gün)** | `.github/workflows/auto-publish-longform.yml` |
| **18:15** | Kinetic Lab (Physics) | **16:9 Fizik Turnuvası (1/gün)** | `.github/workflows/auto-publish-longform.yml` |
| **14:25, 14:55, 17:45, 18:45, 20:25, 20:55, 02:25, 02:55** | 2 Kanal Tümü | **7/24 Bulut Watchdog (Oto-Yenile + Telegram)** | `.github/workflows/watchdog.yml` |

---

## 2. Tamamlananlar (Canlıda)

### DevOps & Kendi Kendini İyileştirme (Self-Healing)
- [x] `src/devops.ts`: `fetchWithRetry` (ağ/API 4x retry), token maskeleme, geçersiz Instagram ID filtresi, çakışmasız `mergePublishedRecords`.
- [x] `src/safe-git-push.ts`: `git reset --mixed origin/main` + JSON birleştirme ile sıfır çakışmalı `state/published.json` kaydı (`9f8b34e`).
- [x] `.github/workflows/watchdog.yml`: Hata veren veya GitHub cron’un atladığı yayını bulutta yakalayıp **1 kez otomatik yeniden başlatma** + Telegram bildirimi (`b350550`).
- [x] Cron dakikaları yoğun olmayan `:07` / `:37` / `:15` dakikalarına alındı.
- [x] Tüm 7 workflow YAML doğrulandı, `npm run typecheck` ve `12/12` birim testi yeşil.

### İzleyici Psikolojisi, Tutunma (Retention) & Pazar Araştırması
- [x] `docs/MARKET_RESEARCH_2026_11_25.md`: İlk pazar araştırması ve viral niş haritası.
- [x] `docs/VIEWER_PSYCHOLOGY_PLAYBOOK.md`: 4 aşamalı merak mimarisi (*Zeigarnik "Ne oldu?" → Bilgi Boşluğu "Nasıl yani?" → Taraf Tutma "Ne olacak?" → Tatmin + Loop*).
- [x] `src/audio.ts` + `src/render.ts` + `src/render-explainer.ts`: İlk 0.02 sn sub-bass darbesi + A/B tahmin/oy kartı son 3 sn yerine %66–%85 peak merak penceresine taşındı.
- [x] 5 yeni viral bölüm üretildi ve kuyruğun en başına alındı:
  - NASA / Uzay (Clear Mechanics): `earth-to-marble`, `sun-black-hole`, `light-speed-mars`
  - 3’lü Karşılaştırma & Sürü Fizik (Kinetic Lab): `gravity-compare`, `giant-vs-swarm`

### 16:9 Uzun Video Stüdyosu (2 Kanal, Günlük Otomatik)
- [x] `src/render-longform.ts`:
  - **5.5 sn Cold-Open Hook + Animasyonlu Logo Intro Sting** (Clear Mechanics & Kinetic Lab ayrı marka dili)
  - **3. bölümde orta-video kırmızı `🔔 SUBSCRIBE` hapı**
  - **8 sn YouTube End-Screen Outro** (sol `SUBSCRIBE 🔔` dairesi + sağ `▶ WATCH NEXT DEEP DIVE` 16:9 çerçevesi)
  - Clear Mechanics için temalı 8–10 bölümlük belgesel + 38 bölümden sonsuz rotasyon
  - Kinetic Lab için günlük taze seed’li 6 rauntluk sonsuz fizik turnuvası
- [x] `src/publish-longform.ts`: Otomatik `00:00` YouTube chapter’ları + `state/published.json`’dan çekilen **son 6 gerçek YouTube Shorts linki** (`🔥 Watch the Viral Shorts Versions`) + YouTube yükleme.
- [x] İlk iki kanal uzun videosu buluttan tetiklendi (`034d5f6`).

---

## 3. Yapılacaklar (Sıradaki Adımlar)

### Kısa Vade (Bu Hafta)
- [ ] **YouTube Studio End-Screen şablonu:** İlk yüklenen 16:9 videolara YouTube Studio’dan 1 kez "En son yüklenen + Abone ol" bitiş ekranı kartı oturtulacak (8 sn outro çerçevesi birebir hazır).
- [ ] **Haftalık Pazar & Performans Turu:** 7 gün sonra `weekly-analytics.yml` verilerine bakıp en yüksek izlenme/APV alan 2 nişi tespit et, o nişlerden 5’er yeni bölüm ekle.
- [ ] **YouTube Özel Thumbnail (1280×720) Otomasyonu:** Uzun videoların CTR’ını artırmak için yüksek kontrastlı otomatik 16:9 kapak görseli üretip `thumbnails.set` API ile yükle.

### Orta Vade (YPP / Para Kazanma Yolunda)
- [ ] **Clear Mechanics 38+ bölüm genişletme:** Kuyruk 10 bölümün altına inmeden 10 yeni NASA / Mega-Mühendislik bölümü ekle.
- [ ] **Instagram → YouTube köprüsü (sonra aktif edilecek):** Mevcut Instagram kitlesi büyüdükten sonra profil linki ve Reels sabit yorumlarıyla uzun videolara trafik çek (*kurucu kararı: şimdilik mevcut IG akışına dokunulmayacak*).
- [ ] **4.000 saat uzun video / 10M Shorts + 1.000 abone takibi:** Haftalık Telegram raporuna YPP ilerleme yüzdesi ekle.

---

## 4. Kurucu Kuralları (Asla Unutma)
1. **%100 Bulut:** Hiçbir kritik görev yerel PC’ye bağlı olmayacak.
2. **İnsan Psikolojisi:** Her video *"Ne oldu? → Nasıl yani? → Ne olacak?"* merak döngüsüyle kurgulanacak; kuru ders anlatımı yasak.
3. **Instagram Akışını Bozma:** Mevcut Instagram otomatik Reels paylaşım akışı korunacak.
4. **Bu Dosyayı Güncel Tut:** Her büyük geliştirme veya yayın değişikliğinde `DEVAM.md` güncellenecek.
