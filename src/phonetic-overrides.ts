/**
 * Y-LABS OS — TTS Phonetic Override Dictionary
 *
 * Kokoro-82M ve nöral TTS motorlarının yanlış telaffuz ettiği tıbbi, biyolojik ve fizik
 * terimlerini yalnızca seslendirme aşamasında fonetik karşılıklarına dönüştürür.
 * Ekrandaki Word-Pop altyazıları ve .srt dosyaları orijinal bilimsel yazımı korur.
 */
export const PHONETIC_OVERRIDES: ReadonlyArray<readonly [RegExp, string]> = [
  // Bio Mechanics — medical & anatomical terms
  [/\bbeta[-\s]amyloid\b/gi, "bay-ta am-uh-loyd"],
  [/\bcerebrospinal\b/gi, "seh-ree-bro-spy-nal"],
  [/\bmacrophages\b/gi, "mak-ro-fay-jiz"],
  [/\bmacrophage\b/gi, "mak-ro-fayj"],
  [/\bvagus\b/gi, "Vay-gus"],
  [/\balveoli\b/gi, "al-vee-oh-lye"],
  [/\bmyofibrils\b/gi, "my-oh-fy-brilz"],
  [/\bmyofibril\b/gi, "my-oh-fy-bril"],
  [/\bamygdala\b/gi, "uh-mig-duh-luh"],
  [/\bhypertrophy\b/gi, "hy-per-truh-fee"],
  [/\bpsoas\b/gi, "soh-as"],
  [/\badenosine\b/gi, "uh-den-oh-seen"],
  [/\bglymphatic\b/gi, "glim-fat-ik"],
  [/\bcortisol\b/gi, "kor-tih-sol"],
  [/\bmitochondria\b/gi, "my-toh-kon-dree-uh"],
  [/\bdopamine\b/gi, "doh-puh-meen"],
  [/\bnorepinephrine\b/gi, "nor-ep-ih-nef-rin"],
  [/\bepinephrine\b/gi, "ep-ih-nef-rin"],
  [/\bsarcomeres\b/gi, "sar-koh-meerz"],
  [/\bsarcomere\b/gi, "sar-koh-meer"],

  // Kinetic Lab & Clear Mechanics — physics & engineering terms
  [/\bprecession\b/gi, "pree-sesh-un"],
  [/\bbrachistochrone\b/gi, "bra-kis-to-krone"],
  [/\bchladni\b/gi, "Klad-nee"],
  [/\bcoriolis\b/gi, "kor-ee-oh-liss"],
  [/\bfourier\b/gi, "foo-ree-ay"],
  [/\bbernoulli\b/gi, "ber-noo-lee"],
  [/\bgyroscopic\b/gi, "jy-roh-skop-ik"],
  [/\bstoichiometric\b/gi, "stoy-kee-oh-met-rik"],
  [/\b60fps\b/gi, "sixty frames per second"],
];

/**
 * Applies phonetic pronunciation overrides to narration text right before TTS synthesis.
 * Never call this on on-screen caption or SRT text.
 */
export function applyPhoneticOverrides(text: string): string {
  let out = text;
  for (const [pattern, replacement] of PHONETIC_OVERRIDES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
