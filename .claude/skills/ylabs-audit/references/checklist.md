# Y-LABS OS v2.1 — Denetim Kontrol Listesi (tek doğruluk kaynağı)

Her madde: **Kural · Nasıl doğrulanır · Önem · Kanıt düzeyi**.
Önem: 🔴 KRİTİK (yanlış kanala yükleme, çift yayın, YPP reddi, veri kaybı) · 🟠 YÜKSEK · 🟡 ORTA · ⚪ DÜŞÜK.
Kanıt: RESMİ (YouTube/Meta resmi) · AKADEMİK · VERİ · GÖRÜŞ. Kaynaklar: `reports/` veya `docs/` altındaki strateji raporu.

> Denetçi bir maddeyi doğrulayamıyorsa "DOĞRULANAMADI + neden" yazar; asla "geçti" varsaymaz.

---

## A. Yayın hattı doğruluğu (pipeline-auditor)

| # | Kural | Nasıl doğrulanır | Önem |
|---|---|---|---|
| A1 | `npm run typecheck` ve `npm test` temiz | İkisini çalıştır; başarısız test sayısını ve adını raporla | 🔴 |
| A2 | Her yükleme yolunda **kanal kilidi** var (render'dan ÖNCE) | `rg -n "uploadVideoToYouTube\|videos\\?uploadType" src/` → her çağıranda `assertUploadChannel`/`getMyChannel` + beklenen ad kontrolü var mı (`src/channel-guard.ts`, `publish-expansion.ts`, `publish-longform-expansion.ts`) | 🔴 |
| A3 | Her yayın script'i yayından önce **`syncPublishedStateFromRemote`** + **`MIN_PUBLISH_GAP_HOURS`** koruması uygular | `auto-publish.ts`, `publish-longform.ts`, `publish-expansion.ts`, `publish-longform-expansion.ts` + ilgili workflow env'lerinde değer (short 2, uzun ≥ uygun aralık) | 🔴 |
| A4 | Uzun video tespiti doğru: `longform-*` ve `narrative-*` (ama `-short-` içermeyen) uzun sayılır | `src/devops.ts` `hoursSinceLastPublish`; yeni id öneki eklendiyse burada da var mı | 🔴 |
| A5 | `published.json` VE `published-expansion.json` birleştirmesi silinenler listesini (`removedVideoIds`) korur | `src/safe-git-push.ts` `isPublishedJson` + `mergePublishedFiles`; `state-sync.ts` aynı mantık | 🔴 |
| A6 | **Zamanlayıcı ↔ cron uyumu**: her yayın workflow'unun cron saatleri `src/scheduler.ts` `SLOTS` ile birebir; tek/çift gün (`days`) cron gün alanıyla aynı | Her `.github/workflows/*.yml` `cron:` satırını SLOTS ile tablo halinde karşılaştır | 🔴 |
| A7 | `watchdog.yml` `workflow_run.workflows` listesi tüm yayın workflow'larının **tam `name:`** değerlerini içerir | İsimleri birebir karşılaştır (tek karakter farkı zinciri koparır) | 🟠 |
| A8 | `titleFilter` kullanan slotların workflow'unda eşleşen **`run-name`** var | `auto-publish-longform.yml`, `publish-longform-expansion.yml` | 🟠 |
| A9 | **Kota bütçesi**: proje başına günlük tahmini birim ≤ 10.000 (yükleme 1600, captions.insert 400, thumbnails.set 50, commentThreads.insert 50, playlistItems.insert 50, list ~1) | Kanal→OAuth projesi eşlemesini çıkar (`YOUTUBE_CLIENT_ID_*`), günlük yükleme sayısı × maliyet tablosu yap | 🟠 |
| A10 | Kota dolunca `YouTubeQuotaError` → bilgi notu + atlama (fail değil) tüm yükleme yollarında | `rg -n "YouTubeQuotaError" src/` | 🟠 |
| A11 | Yeni workflow'larda secret kontrolü, `always()` ile state push, Telegram hata adımı | Workflow adımları | 🟡 |
| A12 | Sır sızıntısı yok: token/API anahtarı log'a, URL'ye, repoya yazılmıyor | `rg -n "console.log\(.*(token\|secret\|key)" src/`, yeni dosyalarda sabit anahtar araması | 🔴 |

## B. YPP politika & marka güvenliği (policy-auditor)

| # | Kural | Nasıl doğrulanır | Önem | Kanıt |
|---|---|---|---|---|
| B1 | **4 kanal 4 farklı ses** kullanır (birincil API + Kokoro yedek de kanala özel); espeak-ng/Edge TTS üretimde kullanılmaz | `src/voice.ts` ses seçimi kanal parametresi alıyor mu; tüm `synthesizeVoice(` çağrıları kanal geçiriyor mu; workflow'larda `espeak` kurulumu sadece güvenlik yedeği mi | 🔴 | RESMİ (inauthentic) + AKADEMİK |
| B2 | **QC benzerlik kapısı** var ve çalışıyor: kanal içi + kanallar arası başlık/hook/senaryo benzerliği eşik üstünde yayını durdurur | Kapının kodunu ve testini bul; eşik değeri ve hangi alanları karşılaştırdığı; kanallar arası karşılaştırma var mı | 🔴 | RESMİ (Help 1311392) |
| B3 | Kanallar aynı **giriş/çıkış kalıbını** paylaşmıyor | Intro/outro metinleri ve hook kalıplarını kanal kataloglarından topla, tekrar eden şablonları listele | 🟠 | RESMİ |
| B4 | `wealth` ve `bio`: **AI doktor/danışman/uzman karakteri yok**; "educational simulation — not financial/medical advice" ibaresi açıklamada VE QC'de zorunlu | `catalog-expansion.ts` metinlerinde "doctor/advisor/I'm your/expert" kalıpları; QC kontrolü ve testi | 🔴 | RESMİ (AI persona kuralı) |
| B5 | Finans/sağlık iddiaları kesin vaat içermiyor ("guaranteed", "cure", "get rich") | Katalog metinlerinde regex taraması | 🟠 | RESMİ (YMYL/yanıltıcı) |
| B6 | Türetilmiş showcase Short'lar uzun videodan **kesit değil**, yeni anlatım + yeni kadraj | `derive-shorts.ts` / render yolu: kaynak ham karelerin yeniden kullanımı mı, yeni sahne mi | 🟠 | RESMİ (reused content) |
| B7 | Başlık/küçük resim/açıklama **yanıltıcı değil** (kapaktaki vaat videoda var) | Örnek 3 uzun videonun başlık+kapak metni ↔ ilk 10 sn içerik | 🟡 | RESMİ |
| B8 | Facebook Reels yalnız `ENABLE_FACEBOOK_REELS=true` iken; IG'de `@` sadece gerçek kardeş IG hesaplarına | `src/facebook.ts`, `src/network-links.ts` | 🟡 | — |
| B9 | AI ifşa politikası tutarlı (animasyonda zorunlu değil; gerçekçi sentetik insan/ses varsa zorunlu) | Kodda `containsSyntheticMedia`/ifşa alanı kullanımı | ⚪ | RESMİ |

## C. İzleyici tutma & kurgu zanaati (craft-auditor)

| # | Kural | Nasıl doğrulanır | Önem | Kanıt |
|---|---|---|---|---|
| C1 | **Bağımsız Short**: kesintisiz döngü (son kare ≈ ilk kare) | Render edilen örnek MP4'te ilk ve son kare farkı (ffmpeg ile kare çıkar, ortalama piksel farkı) | 🟡 | GÖRÜŞ |
| C2 | **Türetilmiş vitrin Short**: döngü YOK; son 5 sn sözlü + görsel "Related video" çağrısı | Kod yolu + örnek render'ın son 5 sn karesi | 🟠 | RESMİ |
| C3 | Uzun videonun ilk 5–10 sn'si kapak/başlık vaadini karşılar | Uzun video planı/senaryosunun ilk sahnesi | 🟠 | RESMİ |
| C4 | Uzun video süresi **6–8 dk** bandında (CLAUDE.md'deki değerle tutarlı) | `qc.ts` süre sınırları + plan üretici + örnek render süresi | 🟠 | VERİ/GÖRÜŞ |
| C5 | Short süresi A/B: 20–30 sn ve 30–42 sn kolları gerçekten üretiliyor ve kayda etiketleniyor | Katalog/kuyruk alanı + state kaydı | 🟡 | VERİ (zayıf) |
| C6 | "Tahmin et: A mı B mi?" ön sorusu bağımsız Short'larda ilk ~2 sn'de; cevap videonun %70–85'inde | Sahne overlay kodu + örnek kareler | 🟡 | AKADEMİK (g=0,54) |
| C7 | Anlatım–görsel senkronu (zamansal bitişiklik): adı geçen öğe ±100 ms içinde vurgulanıyor | Altyazı/vurgu zamanlamasının ses zaman damgalarından türetilmesi | 🟡 | AKADEMİK (d=1,31) |
| C8 | Gereksiz süs yok (coherence): dekoratif hareketli öğeler içerikle ilgisiz değil | Örnek kareler | ⚪ | AKADEMİK (d=0,86) |
| C9 | Ses −14 LUFS (±2), tepe ≤ −1 dBTP; müzik konuşmanın altında | `ffmpeg -af ebur128` ile örnek çıktıda ölç | 🟡 | Platform standardı |
| C10 | Uzun videolarda `.srt` kapalı altyazı üretilip yükleniyor (ekranda tam metin yok) | `captions.insert` çağrısı + srt üretici + zaman damgası doğruluğu | 🟡 | RESMİ (erişilebilirlik) |
| C11 | Her uzun videoya **3 kapak varyantı** üretiliyor (1280×720, okunur 2–3 kelime, başlığı tekrar etmiyor) | Üretici + çıktı dosyaları; Test & Compare elle yapılır (API yok) | 🟡 | RESMİ |
| C12 | Altyazı güvenli alanı: x ∈ [6%W, 84%W], y ∈ [14%H, 74%H] | Overlay koordinatları + örnek kare | ⚪ | Platform UI |

## D. Canlı operasyon (live-ops-auditor)

| # | Kural | Nasıl doğrulanır | Önem |
|---|---|---|---|
| D1 | Son 48 saatteki tüm yüklemeler **doğru kanalda** | `state/published*.json` son kayıtlar → `https://www.youtube.com/oembed?url=...` `author_name` beklenen kanal mı | 🔴 |
| D2 | Kanal başına günlük yayın sayısı plana uygun (short ≤ 2/gün, uzun ≤ plan) ve aynı konu aynı gün tekrar etmiyor | State kayıtlarını kanal+gün bazında say | 🟠 |
| D3 | Son 48 saatte başarısız workflow yok (cancelled zamanlayıcı kuyruk değişimi normaldir) | GitHub Actions run listesi; failure olanların logu ve sebebi | 🟠 |
| D4 | Zamanlayıcı canlı: son 24 saatte her slot için ilgili workflow çalışmış | SLOTS × run listesi eşleştirmesi | 🟠 |
| D5 | Kota bloğu / kanal kilidi / izin uyarısı notları | `state/youtube-quota.json`, son run'larda `publish-notice` içerikleri | 🟡 |
| D6 | Instagram yüklemeleri: son short'ların `instagramMediaId` alanı dolu mu; doluysa geçerli formatta mı | State kayıtları | 🟡 |
| D7 | State dosyaları tutarlı: geçersiz JSON yok, `removedVideoIds` içindeki id'ler yayın listesinde yok, tekrar eden id yok | JSON doğrulama + kontrol | 🟠 |
