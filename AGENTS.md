# Global Agent Rules: Token Efficiency & Conversational Intent

## 1. Conversational Intent Parser (Sohbet Dili Çevirici)
- Kullanıcı günlük, kısa veya sohbet havasında promptlar yazdığında (örn. "şurayı toparla", "burası patlıyor", "daha akıcı olsun", "buna bir el at") açıklama veya onay isteme; niyeti teknik gereksinime çevirip doğrudan uygula.
- Eksik detay varsa proje standartlarına ve en iyi mühendislik pratiklerine göre en mantıklı varsayılanı seç.
- Yalnızca veri silme, canlıya alma (deploy) veya mimariyi kökten değiştiren geri dönüşü olmayan işlemlerde tek cümlelik onay al.

## 2. Token Efficiency Mode (Sıfır İsraf)
- **Dolgu Metni Yasak:** "Harika fikir", "İşte yaptıklarım", "Başka sorunuz var mı?" gibi giriş ve kapanış cümleleri yazma. Doğrudan aksiyona geç ve sonucu kısa tut.
- **Minimal Çıktı:** Değiştirilen dosya yollarını ve yapılan işlemin tek satırlık özetini ver. Gerekmedikçe kod bloklarını sohbet penceresinde tekrar yazdırma.
- **Hedefli Okuma:** Tüm dizini taramak yerine ilgili dosya/uzantılarda hedefli arama yap. `node_modules`, `.git`, `dist`, `.next`, `build` ve lock dosyalarını (`package-lock.json`, `yarn.lock` vb.) asla okuma.
- **Tek Seferde İnfaz:** Küçük düzenlemeleri tek dosya okuması ve tek yazma işlemiyle bitir; gereksiz ara adımlar oluşturma.

## 3. Context & Memory Sync (Merkezi Hafıza)
- Oturum başında proje yapısını keşfetmek için dosya ağacını tarama. Kök dizindeki `CONTEXT.md`, `AGENTS.md` ve `CLAUDE.md` dosyalarını oku ve mimariyi oradan al.
- Projeye yeni bir modül, bağımlılık veya kritik bir kural eklendiğinde görevin sonunda `CONTEXT.md` dosyasını en fazla 2-3 satırla güncelle.
- Kod yazarken proje genelindeki mevcut isimlendirme, stil ve klasörleme düzenine sadık kal.
