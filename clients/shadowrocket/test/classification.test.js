import assert from "node:assert/strict";
import test from "node:test";

import { CONTINENT, SOURCE_KIND } from "../../../shared/contracts.js";
import { CONTINENT_FLAGS, COUNTRY_CODE_COUNT, continentForFlag } from "../../../shared/nodes/country-regions.js";
import { classifySource, sourceName } from "../../../shared/nodes/source-labels.js";
import { classifyRegion, removeFlags } from "../../../shared/nodes/regions.js";

test("classifies leading source labels using provenance priority", () => {
  for (const [name, kind, label] of [
    ["[机场] X", SOURCE_KIND.airport, "机场"],
    ["[自建] X", SOURCE_KIND.selfHosted, "自建"],
    ["[REALM] X", SOURCE_KIND.realm, "Realm"],
    ["[链式代理] X", SOURCE_KIND.serverChain, "链式代理"],
    ["[落地] X", SOURCE_KIND.landing, "落地"],
  ]) {
    assert.deepEqual(classifySource({ _subName: name }), { kind, label, warning: null });
  }
  assert.equal(sourceName({ _subName: "[链式代理] X" }), "[链式代理] X");
  assert.equal(classifySource({ _subName: "[链式代理] X" }).kind, SOURCE_KIND.serverChain);
  assert.equal(classifySource({ _subName: "[落地] X" }).kind, SOURCE_KIND.landing);
  assert.deepEqual(classifySource({ _subName: "Unlabelled" }), {
    kind: SOURCE_KIND.unknown,
    label: "未知",
    warning: "missing-source-label",
  });
});

test("prefers a recognized source when an unknown display field appears first", () => {
  assert.deepEqual(classifySource({
    _subDisplayName: "[未标记] upstream",
    _subName: "[自建] private collection",
  }), { kind: SOURCE_KIND.selfHosted, label: "自建", warning: null });
});

test("falls back to a recognized source marker in the node name", () => {
  assert.deepEqual(classifySource({
    name: "🇭🇰 [未标记] [自建] Boil-HKT",
    _subDisplayName: "[未标记] upstream",
    _subName: "[未标记] private",
  }), { kind: SOURCE_KIND.selfHosted, label: "自建", warning: null });
});

test("uses the same missing-source warning for unknown markers and unlabeled provenance", () => {
  assert.equal(classifySource({ _subName: "[未标记] upstream" }).warning, "missing-source-label");
  assert.equal(classifySource({ _subName: "upstream" }).warning, "missing-source-label");
});

test("preserves existing regional flags and reports flag warnings", () => {
  const multiple = classifyRegion("🇯🇵 🇺🇸 US Tokyo");
  assert.equal(multiple.flag, "🇯🇵");
  assert.equal(multiple.continent, CONTINENT.asiaPacific);
  assert.equal(multiple.warning, "multiple-flags");
  assert.equal(classifyRegion("🇿🇦 Private 01").flag, "🇿🇦");
  assert.equal(classifyRegion("🇿🇦 Private 01").continent, CONTINENT.other);
  assert.equal(classifyRegion("🇿🇦 US-LAX").warning, "flag-text-conflict");
  assert.equal(classifyRegion("🇯🇵 US-LAX").warning, "flag-text-conflict");
  assert.equal(removeFlags(" 🇯🇵  Tokyo  🇺🇸 "), "Tokyo");
});

test("matches Latin region terms at boundaries while accepting compact codes", () => {
  for (const name of ["Indianapolis", "Chinatown LA"]) {
    assert.deepEqual(classifyRegion(name), {
      flag: "🌐",
      continent: CONTINENT.other,
      warning: null,
    });
  }
  for (const name of ["HK01", "HKG01", "JP01", "NRT01", "HongKong"]) {
    assert.equal(classifyRegion(name).continent, CONTINENT.asiaPacific);
  }
});

test("infers regions from common city and airport terms", () => {
  assert.deepEqual(classifyRegion("US-LAX"), {
    flag: "🇺🇸",
    continent: CONTINENT.americas,
    warning: null,
  });
  assert.equal(classifyRegion("Frankfurt").flag, "🇩🇪");
  assert.deepEqual(classifyRegion("Private Premium 01"), {
    flag: "🌐",
    continent: CONTINENT.other,
    warning: null,
  });
});

test("maps all ISO 3166-1 country and territory flags into fixed continent groups", () => {
  assert.equal(COUNTRY_CODE_COUNT, 249);
  assert.equal(new Set(Object.values(CONTINENT_FLAGS).flat()).size, 249);

  for (const [flag, continent] of [
    ["🇦🇪", CONTINENT.asiaPacific],
    ["🇳🇿", CONTINENT.asiaPacific],
    ["🇷🇺", CONTINENT.europe],
    ["🇵🇱", CONTINENT.europe],
    ["🇲🇽", CONTINENT.americas],
    ["🇦🇷", CONTINENT.americas],
    ["🇿🇦", CONTINENT.other],
    ["🇦🇶", CONTINENT.other],
  ]) {
    assert.equal(continentForFlag(flag), continent, flag);
    assert.equal(classifyRegion(`${flag} arbitrary-name`).continent, continent, flag);
  }

  assert.equal(continentForFlag("🇽🇰"), null);
  assert.deepEqual(classifyRegion("🇽🇰 custom"), {
    flag: "🇽🇰",
    continent: CONTINENT.other,
    warning: null,
  });
});
