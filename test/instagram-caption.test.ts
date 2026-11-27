import assert from "node:assert/strict";
import test from "node:test";
import { buildInstagramCaption, IG_PREVIEW_CHARS } from "../src/instagram.js";

test("buildInstagramCaption: ilk 125 karakterde başlık + merak cümlesi görünür", () => {
  const cap = buildInstagramCaption(
    "How Many Paper Folds to Reach the Moon? #shorts",
    "Fold a 0.1 mm sheet of paper in half. Again. And again. Past a dice, a cat, you, the Burj Khalifa… Guess before it lands 👇\n\n✨ Follow for a new one every day\n\n#shorts #math",
  );
  const preview = cap.slice(0, IG_PREVIEW_CHARS);
  assert.ok(preview.startsWith("How Many Paper Folds to Reach the Moon?\nFold a 0.1 mm sheet of paper in half."), preview);
  assert.ok(!/#shorts/.test(cap) && /#reels/.test(cap));
  // Cümle kaybolmaz / tekrar etmez
  assert.equal((cap.match(/Fold a 0\.1 mm/g) || []).length, 1);
  assert.ok(cap.includes("Guess before it lands"));
  assert.equal((cap.match(/Follow for a new one/g) || []).length, 1);
});

test("buildInstagramCaption: açıklama yoksa sadece başlık + takip çağrısı", () => {
  const cap = buildInstagramCaption("Title #shorts", "");
  assert.equal(cap, "Title\n\n✨ Follow for a new one every day");
});
