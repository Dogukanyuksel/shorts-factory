# Shorts Factory

Kodla %100 deterministik, sıfır telifli ve yüksek tutma oranlı (60 fps, 1080×1920) YouTube Shorts / Reels / TikTok üretim motoru.

## Temel İlkeler (54 Dk Viral Playbook)
- **İlk 1 saniye kancası:** Sessizde bile akışı durduran canlı görsel + kısa merak başlığı.
- **Hedef metrikler:** %80+ kaydırmama (Stayed to Watch) ve %100–130 ortalama izlenme (APV).
- **Odak kuralı:** Tek niş ayda \$1.000'ı geçmeden ikinci nişe dağılma.
- **0-View Jail kuralı:** 0 izlenmede 1 gün ara → yine 0 ise 2 gün ara → açılmazsa yeni kanal.

## Hızlı Başlangıç

```bash
npm install
npm run render -- --niche physics-ring --seed 1 --seconds 20
```

Çıktı: `out/physics-ring-seed1.mp4` (1080×1920, 60 fps, ses efektli H.264/AAC).

## Niş Modülleri (`niches/`)
1. **`physics-ring` (Hazır):** Neon dönen halkalardan kaçan top simülasyonu + çarpışmaya tam senkronlu pentatonik ses efektleri (sıfır telif, küresel izlenme, yüksek APV).
2. **`how-it-works` (Planlı):** 45 saniyelik "Aslında nasıl çalışır?" SVG/Canvas kesit animasyonları.
3. **`esports-tactics` (Planlı):** CS2/Valorant mini-harita taktik kırılımları.
4. **`history-maps` (Planlı):** 60 saniyede animasyonlu tarih/harita savaşları.
5. **`data-race` (Planlı):** Finans & ekonomi veri yarışı grafikleri.
