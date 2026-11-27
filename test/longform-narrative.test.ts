import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  buildFunnelMetadata,
  enqueueDerivedShorts,
  loadDerivedShortsQueue,
  pickNextDerivedShort,
} from "../src/derive-shorts.js";
import { NARRATIVE_LONGFORM_SPECS, pickNarrativeLongform } from "../src/longform-narrative.js";

test("NARRATIVE_LONGFORM_SPECS: her 4-perdeli uzun video 4 perdeye, geçiş köprülerine ve 3 vitrin Short'a sahip", () => {
  assert.ok(NARRATIVE_LONGFORM_SPECS.length >= 4, "En az 4 amiral gemisi derin bölüm olmalı");
  for (const spec of NARRATIVE_LONGFORM_SPECS) {
    assert.ok(spec.title.length <= 100, `Başlık 100 karakteri aştı: ${spec.title}`);
    const acts = new Set(spec.beats.map((b) => b.actIndex));
    assert.equal(acts.size, 4, `${spec.id} tam 4 perde içermeli`);
    const bridges = spec.beats.filter((b) => b.isBridge);
    assert.ok(bridges.length >= 3, `${spec.id} en az 3 anlatı geçiş köprüsü içermeli`);
    const visualPhases = new Set(spec.beats.map((b) => b.visualPhase));
    assert.ok(visualPhases.size >= 6, `${spec.id} statik kalmamalı, en az 6 farklı görsel faz içermeli`);
    assert.equal(spec.derivedShorts.length, 3, `${spec.id} tam 3 türetilmiş Vitrin Short içermeli`);

    const beatIds = new Set(spec.beats.map((b) => b.id));
    for (const ds of spec.derivedShorts) {
      assert.ok(ds.title.length <= 100, `Vitrin Short başlığı 100 karakteri aştı: ${ds.title}`);
      assert.ok(ds.beatIds.length >= 3, `${ds.slugSuffix} en az 3 beat içermeli`);
      for (const bid of ds.beatIds) {
        assert.ok(beatIds.has(bid), `Eksik beat referansı: ${bid}`);
      }
    }

    const htmlPath = resolve("niches", "longform-deep-dive", `${spec.slug}.html`);
    assert.ok(existsSync(htmlPath), `4-perdeli HTML sahnesi eksik: ${htmlPath}`);
  }
});

test("pickNarrativeLongform & enqueueDerivedShorts: uzun videodan 3 Vitrin Short kuyruğa girer ve huni metadata'sı üretir", async () => {
  const spec = pickNarrativeLongform("explainer", new Set());
  assert.ok(spec, "Explainer için ilk 4-perdeli bölüm seçilmeli");

  const tmp = await mkdtemp(join(tmpdir(), "shorts-derive-test-"));
  const qPath = join(tmp, "derived-shorts-queue.json");
  try {
    const added = await enqueueDerivedShorts(spec, "VID_PARENT_123", "https://www.youtube.com/watch?v=VID_PARENT_123", qPath);
    assert.equal(added.length, 3);

    // Tekrar çağrıldığında mükerrer eklememeli
    const dup = await enqueueDerivedShorts(spec, "VID_PARENT_123", "https://www.youtube.com/watch?v=VID_PARENT_123", qPath);
    assert.equal(dup.length, 0);

    const queue = await loadDerivedShortsQueue(qPath);
    const next = pickNextDerivedShort(queue, "explainer", new Set());
    assert.ok(next, "İlk türetilmiş Vitrin Short kuyruktan çekilmeli");
    assert.equal(next.parentVideoId, "VID_PARENT_123");

    next.shortVideoId = "SHORT_999";
    const meta = buildFunnelMetadata(next);
    assert.ok(meta.description.includes("https://www.youtube.com/watch?v=VID_PARENT_123"));
    assert.ok(meta.pinnedComment.includes("https://www.youtube.com/watch?v=VID_PARENT_123"));
    assert.ok(meta.studioRelatedVideoAlert.includes("https://studio.youtube.com/video/SHORT_999/edit"));
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
