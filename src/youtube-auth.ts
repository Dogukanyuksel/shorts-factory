import { createServer } from "node:http";

/**
 * Tek seferlik YouTube OAuth2 Refresh Token alma aracı.
 *
 * Kullanım:
 *   YOUTUBE_CLIENT_ID="..." YOUTUBE_CLIENT_SECRET="..." npm run youtube:auth -- --channel physics
 *   YOUTUBE_CLIENT_ID="..." YOUTUBE_CLIENT_SECRET="..." npm run youtube:auth -- --channel explainer
 */
const PORT = 4319;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
// upload: video yükleme · force-ssl: kendi videolarındaki yorumlara yanıt, ilk yorum, oynatma listeleri
const SCOPE = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

function parseArg(name: string, fallback: string): string {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
}

async function main() {
  const channel = parseArg("channel", "physics");
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();

  if (!clientId || !clientSecret) {
    console.error("HATA: YOUTUBE_CLIENT_ID ve YOUTUBE_CLIENT_SECRET ortam değişkenleri gerekli.");
    console.error("Örnek:");
    console.error('  YOUTUBE_CLIENT_ID="xxx" YOUTUBE_CLIENT_SECRET="yyy" npm run youtube:auth -- --channel physics');
    process.exit(1);
  }

  const secretName =
    channel === "explainer" ? "YOUTUBE_REFRESH_TOKEN_EXPLAINER" : "YOUTUBE_REFRESH_TOKEN_PHYSICS";

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  console.log("\n========================================================");
  console.log(`YouTube OAuth Yetkilendirme (${channel.toUpperCase()} kanalı)`);
  console.log("========================================================");
  console.log("1. Aşağıdaki linki tarayıcıda açın ve DOĞRU YouTube kanalını seçin:\n");
  console.log(authUrl.toString());
  console.log("\n2. İzin verdikten sonra bu pencere otomatik olarak Refresh Token'ı yazdıracak...\n");

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://localhost:${PORT}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404).end("Not found");
        return;
      }
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      if (error || !code) {
        res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Yetkilendirme başarısız: ${error || "code eksik"}`);
        server.close();
        process.exit(1);
      }

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      const tokenJson = (await tokenRes.json()) as {
        refresh_token?: string;
        error?: string;
        error_description?: string;
      };

      if (!tokenRes.ok || !tokenJson.refresh_token) {
        res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Token alınamadı: ${JSON.stringify(tokenJson)}`);
        console.error("Token hatası:", tokenJson);
        server.close();
        process.exit(1);
      }

      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<h2>Başarılı! Terminale dönüp GitHub Secret değerini kopyalayabilirsiniz.</h2>");

      console.log("\n✅ REFRESH TOKEN ALINDI!");
      console.log("GitHub Repo → Settings → Secrets and variables → Actions → New repository secret:\n");
      console.log(`Secret Adı   : ${secretName}`);
      console.log(`Secret Değeri: ${tokenJson.refresh_token}\n`);
      server.close();
    } catch (e) {
      res.writeHead(500).end("Internal error");
      console.error(e);
      server.close();
      process.exit(1);
    }
  });

  server.listen(PORT, "127.0.0.1");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
