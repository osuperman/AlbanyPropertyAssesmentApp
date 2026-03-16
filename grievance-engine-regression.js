"use strict";

const assert = require("assert");
const engine = require("./grievance-engine.js");

function makeParcel(overrides = {}) {
  return {
    parcelId: overrides.parcelId || "parcel",
    parcelIdNorm: overrides.parcelIdNorm || overrides.parcelId || "parcel",
    address: overrides.address || "1 Main St",
    neighborhood: overrides.neighborhood || "Pine Hills",
    zip: overrides.zip || "12208",
    propClass: overrides.propClass || "210",
    propClassDesc: overrides.propClassDesc || "1 Family Res",
    livingAreaSqft: overrides.livingAreaSqft ?? 2000,
    yearBuilt: overrides.yearBuilt ?? 1920,
    bedrooms: overrides.bedrooms ?? 4,
    baths: overrides.baths ?? 2,
    styleDesc: overrides.styleDesc || "Style code 8 - Colonial",
    assessedValue: overrides.assessedValue ?? 400000,
    fullMarketValue: overrides.fullMarketValue ?? 416667,
    eastCoord: overrides.eastCoord ?? 1000,
    nrthCoord: overrides.nrthCoord ?? 1000,
    owner1: overrides.owner1 || "Owner",
  };
}

function makeProfile(parcel, overrides = {}) {
  const has = key => Object.prototype.hasOwnProperty.call(overrides, key);
  const livingArea = has("livingArea") ? overrides.livingArea : (parcel.livingAreaSqft ?? null);
  const fullBaths = has("fullBaths") ? overrides.fullBaths : (parcel.baths ?? null);
  const halfBaths = has("halfBaths") ? overrides.halfBaths : 0;
  const assessedValue = has("assessedValue") ? overrides.assessedValue : (parcel.assessedValue ?? null);
  const fullMarketValue = has("fullMarketValue") ? overrides.fullMarketValue : (parcel.fullMarketValue ?? null);
  const style = has("style") ? overrides.style : (parcel.styleDesc ?? "");
  const styleFamily = overrides.styleFamily || engine.normalizeStyleFamily(style);
  return {
    neighborhood: has("neighborhood") ? overrides.neighborhood : (parcel.neighborhood || ""),
    zipCode: has("zipCode") ? overrides.zipCode : (parcel.zip || ""),
    normalizedStreetName: has("normalizedStreetName") ? overrides.normalizedStreetName : engine.streetNameKeyForComp(parcel.address),
    livingArea,
    yearBuilt: has("yearBuilt") ? overrides.yearBuilt : (parcel.yearBuilt ?? null),
    bedrooms: has("bedrooms") ? overrides.bedrooms : (parcel.bedrooms ?? null),
    bathCount: has("bathCount") ? overrides.bathCount : ((Number(fullBaths) || 0) + ((Number(halfBaths) || 0) * 0.5)),
    fullBaths,
    halfBaths,
    style,
    styleFamily,
    assessedPerSqft: livingArea ? assessedValue / livingArea : null,
    equityRatio: fullMarketValue ? assessedValue / fullMarketValue : null,
  };
}

function analyze(subject, comp, options = {}) {
  const subjectProfile = makeProfile(subject, options.subjectProfile);
  const compProfile = makeProfile(comp, options.compProfile);
  return engine.analyzeComparableCandidate({
    subject,
    comp,
    subjectProfile,
    compProfile,
    salesByParcelId: options.salesByParcelId || new Map(),
    allowBroadClass: !!options.allowBroadClass,
    cityStrictGeoMode: options.cityStrictGeoMode ?? true,
    currentDate: options.currentDate || new Date("2026-03-15T00:00:00Z"),
    sharedSnapshotMode: !!options.sharedSnapshotMode,
  });
}

function makeSalesMap(entries) {
  const map = new Map();
  entries.forEach(({ parcel, sales }) => {
    map.set(engine.normalizeParcelId(parcel.parcelIdNorm || parcel.parcelId), sales);
  });
  return map;
}

function makeCandidate(overrides = {}) {
  return {
    parcelId: overrides.parcelId || "candidate",
    parcelIdNorm: overrides.parcelIdNorm || overrides.parcelId || "candidate",
    address: overrides.address || "1 Test St",
    neighborhood: overrides.neighborhood || "Pine Hills",
    normalizedStreetName: overrides.normalizedStreetName || "test st",
    assessedValue: overrides.assessedValue ?? 300000,
    qualityScore: overrides.qualityScore ?? 70,
    confidenceScore: overrides.confidenceScore ?? 80,
    grievanceSupport: overrides.grievanceSupport ?? 20,
    supportLabel: overrides.supportLabel || engine.supportKindForScore(overrides.grievanceSupport ?? 20),
    _compProfile: {
      livingArea: overrides.livingArea ?? 2000,
      yearBuilt: overrides.yearBuilt ?? 1920,
      equityRatio: overrides.equityRatio ?? 0.94,
    },
    _selectionDiagnostics: {
      normalizedMetricsSummary: overrides.normalizedMetricsSummary || {},
    },
    _marginalSupport: !!overrides.marginalSupport,
  };
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("strict geography excludes comps beyond 2 miles in Albany mode", () => {
  const subject = makeParcel({ parcelId: "s1", address: "1 Main St", eastCoord: 1000, nrthCoord: 1000 });
  const comp = makeParcel({ parcelId: "c1", address: "2 Main St", eastCoord: 12000, nrthCoord: 1000 });
  assert.strictEqual(analyze(subject, comp, { cityStrictGeoMode: true }), null);
  assert.ok(analyze(subject, comp, { cityStrictGeoMode: false }));
});

test("perfect physical match tops out at quality score 98", () => {
  const subject = makeParcel({ parcelId: "s2", address: "1 Main St" });
  const comp = makeParcel({
    parcelId: "c2",
    address: "2 Main St",
    eastCoord: 1200,
    nrthCoord: 1000,
    assessedValue: 390000,
    fullMarketValue: 406250,
  });
  const result = analyze(subject, comp);
  assert.ok(result);
  assert.strictEqual(result.qualityScore, 98);
});

test("size-direction modifier rewards larger lower-AV comps more than smaller ones", () => {
  const subject = makeParcel({ parcelId: "s3", livingAreaSqft: 2000, assessedValue: 400000, fullMarketValue: 416667 });
  const largerComp = makeParcel({ parcelId: "c3a", livingAreaSqft: 2200, assessedValue: 330000, fullMarketValue: 360000, eastCoord: 1200 });
  const smallerComp = makeParcel({ parcelId: "c3b", livingAreaSqft: 1800, assessedValue: 330000, fullMarketValue: 360000, eastCoord: 1400 });
  const larger = analyze(subject, largerComp);
  const smaller = analyze(subject, smallerComp);
  assert.ok(larger && smaller);
  assert.ok(larger.grievanceSupport > smaller.grievanceSupport);
  assert.ok(larger.normalizedMetricsSummary.sizeDirectionModifier > smaller.normalizedMetricsSummary.sizeDirectionModifier);
});

test("tied normalized metrics trigger the lower-value-home penalty", () => {
  const subject = makeParcel({ parcelId: "s4", livingAreaSqft: 2000, assessedValue: 400000, fullMarketValue: 416667 });
  const comp = makeParcel({
    parcelId: "c4",
    livingAreaSqft: 1800,
    assessedValue: 360000,
    fullMarketValue: 375000,
    eastCoord: 1200,
  });
  const result = analyze(subject, comp);
  assert.ok(result);
  assert.strictEqual(result.normalizedMetricsSummary.tiedNormalizedMetrics, true);
  assert.strictEqual(result.normalizedMetricsSummary.normalizationPenalty, -8);
  assert.ok(result.grievanceSupport > 0 && result.grievanceSupport < 12);
});

test("recent supporting comp sale evidence adds the expected bonus", () => {
  const subject = makeParcel({ parcelId: "s5", assessedValue: 400000, fullMarketValue: 420000 });
  const comp = makeParcel({ parcelId: "c5", assessedValue: 350000, fullMarketValue: 340000, eastCoord: 1200 });
  const salesByParcelId = makeSalesMap([
    {
      parcel: comp,
      sales: [{
        sale_price: 380000,
        sale_dte: "2025-05-01",
        arms_length_flag: "Y",
      }],
    },
  ]);
  const result = analyze(subject, comp, { salesByParcelId });
  assert.ok(result);
  assert.strictEqual(result.saleEvidence.points, 9);
  assert.strictEqual(result.saleEvidence.status, "supports");
});

test("shared snapshot mode suppresses weak-quality and weak-confidence penalties", () => {
  const subject = makeParcel({ parcelId: "s6", assessedValue: 400000, fullMarketValue: 420000 });
  const comp = makeParcel({ parcelId: "c6", assessedValue: 395000, fullMarketValue: 380000, eastCoord: 1200 });
  const sparseProfile = {
    neighborhood: "Buckingham",
    normalizedStreetName: "other st",
    livingArea: null,
    yearBuilt: null,
    bedrooms: null,
    bathCount: null,
    fullBaths: null,
    halfBaths: 0,
    style: "",
    styleFamily: "unknown",
    assessedPerSqft: null,
    equityRatio: 395000 / 380000,
  };
  const regular = analyze(subject, comp, { sharedSnapshotMode: false, compProfile: sparseProfile });
  const snapshot = analyze(subject, comp, { sharedSnapshotMode: true, compProfile: sparseProfile });
  assert.ok(regular && snapshot);
  assert.ok(snapshot.grievanceSupport > regular.grievanceSupport);
});

test("strong corroborating comps survive duplicate suppression", () => {
  const selected = engine.selectGrievancePackage([
    makeCandidate({ parcelId: "a", normalizedStreetName: "elm st", neighborhood: "Pine Hills", grievanceSupport: 30, qualityScore: 84, confidenceScore: 92 }),
    makeCandidate({ parcelId: "b", normalizedStreetName: "oak st", neighborhood: "Pine Hills", grievanceSupport: 28, qualityScore: 82, confidenceScore: 90 }),
    makeCandidate({ parcelId: "c", normalizedStreetName: "maple st", neighborhood: "Pine Hills", grievanceSupport: 26, qualityScore: 80, confidenceScore: 88 }),
  ], { livingArea: 2000, yearBuilt: 1920 });
  assert.strictEqual(selected.selected.length, 3);
});

test("same-street cap still limits third strong comp", () => {
  const result = engine.selectGrievancePackage([
    makeCandidate({ parcelId: "a1", normalizedStreetName: "elm st", neighborhood: "Pine Hills", grievanceSupport: 30 }),
    makeCandidate({ parcelId: "a2", normalizedStreetName: "elm st", neighborhood: "Pine Hills", grievanceSupport: 29 }),
    makeCandidate({ parcelId: "a3", normalizedStreetName: "elm st", neighborhood: "Pine Hills", grievanceSupport: 28 }),
  ], { livingArea: 2000, yearBuilt: 1920 });
  assert.strictEqual(result.selected.length, 2);
  assert.strictEqual(result.decisionById.get("a3").reasonCode, "same_street_cap");
});

test("dominated non-strong comp is excluded", () => {
  const result = engine.selectGrievancePackage([
    makeCandidate({ parcelId: "d1", normalizedStreetName: "elm st", neighborhood: "Pine Hills", grievanceSupport: 20, qualityScore: 80, confidenceScore: 90 }),
    makeCandidate({ parcelId: "d2", normalizedStreetName: "oak st", neighborhood: "Pine Hills", grievanceSupport: 18, qualityScore: 78, confidenceScore: 88 }),
    makeCandidate({ parcelId: "d3", normalizedStreetName: "oak st", neighborhood: "Pine Hills", grievanceSupport: 12, qualityScore: 70, confidenceScore: 70 }),
  ], { livingArea: 2000, yearBuilt: 1920 });
  assert.strictEqual(result.decisionById.get("d3").reasonCode, "dominated_similar");
});

test("suggested value uses the lower of method A and method B", () => {
  const subject = makeParcel({ parcelId: "s7", assessedValue: 406000, fullMarketValue: 422917 });
  const result = engine.computeSuggestedRequestedValue({
    subject,
    selectedComps: [
      makeCandidate({ parcelId: "v1", assessedValue: 330000, grievanceSupport: 25, qualityScore: 80, confidenceScore: 90, equityRatio: 0.94, normalizedMetricsSummary: { equityRatioDeltaPoints: 2.1 } }),
      makeCandidate({ parcelId: "v2", assessedValue: 320000, grievanceSupport: 22, qualityScore: 78, confidenceScore: 88, equityRatio: 0.90, normalizedMetricsSummary: { equityRatioDeltaPoints: 6.1 } }),
      makeCandidate({ parcelId: "v3", assessedValue: 340000, grievanceSupport: 18, qualityScore: 76, confidenceScore: 86, equityRatio: 0.92, normalizedMetricsSummary: { equityRatioDeltaPoints: 4.1 } }),
    ],
  });
  assert.strictEqual(result.reviewManually, false);
  assert.ok(result.methodA != null && result.methodB != null);
  assert.strictEqual(result.value, Math.min(result.methodA, result.methodB));
});

test("manual review triggers when qualifying comp equity ratios are all tied", () => {
  const subject = makeParcel({ parcelId: "s8", assessedValue: 406000, fullMarketValue: 422917 });
  const result = engine.computeSuggestedRequestedValue({
    subject,
    selectedComps: [
      makeCandidate({ parcelId: "m1", assessedValue: 330000, grievanceSupport: 25, qualityScore: 80, confidenceScore: 90, equityRatio: 0.96, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.4 } }),
      makeCandidate({ parcelId: "m2", assessedValue: 332000, grievanceSupport: 20, qualityScore: 78, confidenceScore: 88, equityRatio: 0.955, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.2 } }),
    ],
  });
  assert.strictEqual(result.reviewManually, true);
  assert.strictEqual(result.method, "manual_review");
});

test("overvaluation flag and claim recommendation follow the spec", () => {
  const subject = makeParcel({ parcelId: "s9", assessedValue: 406000, fullMarketValue: 422917 });
  const overvaluation = engine.computeOvervaluationFlag(subject, 0.90);
  assert.ok(overvaluation.active);
  const excessive = engine.computeClaimRecommendation([
    makeCandidate({ parcelId: "e1", grievanceSupport: 25, equityRatio: 0.96 }),
    makeCandidate({ parcelId: "e2", grievanceSupport: 20, equityRatio: 0.955 }),
  ], overvaluation);
  assert.strictEqual(excessive.code, "EXCESSIVE");
  const unequal = engine.computeClaimRecommendation([
    makeCandidate({ parcelId: "u1", grievanceSupport: 25, equityRatio: 0.90 }),
    makeCandidate({ parcelId: "u2", grievanceSupport: 18, equityRatio: 0.96 }),
  ], overvaluation);
  assert.strictEqual(unequal.code, "UNEQUAL");
});

test("market sale model expands radius to reach minimum sample", () => {
  const subject = makeParcel({ parcelId: "s10", livingAreaSqft: 2000, yearBuilt: 1920, assessedValue: 406000, fullMarketValue: 422917, eastCoord: 1000, nrthCoord: 1000 });
  const p1 = makeParcel({ parcelId: "p1", address: "1 A St", livingAreaSqft: 1950, yearBuilt: 1918, eastCoord: 1500, nrthCoord: 1000 });
  const p2 = makeParcel({ parcelId: "p2", address: "2 A St", livingAreaSqft: 2050, yearBuilt: 1925, eastCoord: 3500, nrthCoord: 1000 });
  const p3 = makeParcel({ parcelId: "p3", address: "3 A St", livingAreaSqft: 2100, yearBuilt: 1930, eastCoord: 7000, nrthCoord: 1000 });
  const salesByParcelId = makeSalesMap([
    { parcel: p1, sales: [{ sale_price: 410000, sale_dte: "2025-04-01", arms_length_flag: "Y" }] },
    { parcel: p2, sales: [{ sale_price: 420000, sale_dte: "2025-06-01", arms_length_flag: "Y" }] },
    { parcel: p3, sales: [{ sale_price: 430000, sale_dte: "2025-08-01", arms_length_flag: "Y" }] },
  ]);
  const model = engine.computeMarketSaleModel({
    subject,
    subjectProfile: makeProfile(subject),
    parcels: [subject, p1, p2, p3],
    salesByParcelId,
    currentDate: new Date("2026-03-15T00:00:00Z"),
  });
  assert.ok(model.available);
  assert.strictEqual(model.expandedRadius, true);
  assert.strictEqual(model.saleCount, 3);
});

test("neighborhood equity model falls back to ZIP sample when neighborhood sample is thin", () => {
  const subject = makeParcel({ parcelId: "s11", neighborhood: "Pine Hills", zip: "12208", assessedValue: 406000, fullMarketValue: 422917 });
  const neighborhoodParcels = [1, 2, 3, 4].map(i => makeParcel({ parcelId: `n${i}`, neighborhood: "Pine Hills", zip: "12208", assessedValue: 300000 + (i * 1000), fullMarketValue: 320000 + (i * 1000), eastCoord: 1200 + i }));
  const zipParcels = [1, 2, 3, 4, 5].map(i => makeParcel({ parcelId: `z${i}`, neighborhood: "Buckingham", zip: "12208", assessedValue: 310000 + (i * 1000), fullMarketValue: 330000 + (i * 1000), eastCoord: 1300 + i }));
  const salesByParcelId = makeSalesMap(
    neighborhoodParcels.concat(zipParcels).map(parcel => ({
      parcel,
      sales: [{ sale_price: parcel.fullMarketValue, sale_dte: "2025-07-01", arms_length_flag: "Y" }],
    }))
  );
  const model = engine.computeNeighborhoodEquityModel({
    subject,
    subjectProfile: makeProfile(subject),
    parcels: [subject].concat(neighborhoodParcels, zipParcels),
    salesByParcelId,
    currentDate: new Date("2026-03-15T00:00:00Z"),
  });
  assert.ok(model.available);
  assert.strictEqual(model.scope, "zip");
});

test("summary reports no_matches when no visible comps exist", () => {
  const subject = makeParcel({ parcelId: "s12", assessedValue: 406000, fullMarketValue: 422917 });
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile: makeProfile(subject),
    visibleComps: [],
    selectedComps: [],
    parcels: [subject],
    salesByParcelId: new Map(),
    equalizationRate: 0.90,
  });
  assert.strictEqual(summary.analysisState, "no_matches");
  assert.strictEqual(summary.noPackageReasonCode, "no_physical_matches");
  assert.strictEqual(summary.caseStatusLabel, "Weak evidence");
});

test("summary reports research_only when visible comps are neutral after normalization", () => {
  const subject = makeParcel({ parcelId: "s13", assessedValue: 406000, fullMarketValue: 422917 });
  const visible = [
    makeCandidate({ parcelId: "r1", grievanceSupport: -4, qualityScore: 78, confidenceScore: 92, equityRatio: 0.96, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.2, assessedPerSqftAdvantagePct: 0.01 } }),
    makeCandidate({ parcelId: "r2", grievanceSupport: -2, qualityScore: 74, confidenceScore: 88, equityRatio: 0.961, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.1, assessedPerSqftAdvantagePct: 0.00 } }),
  ];
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile: makeProfile(subject),
    visibleComps: visible,
    selectedComps: [],
    parcels: [subject],
    salesByParcelId: new Map(),
    equalizationRate: 0.90,
  });
  assert.strictEqual(summary.analysisState, "research_only");
  assert.strictEqual(summary.noPackageReasonCode, "neutral_after_normalization");
  assert.strictEqual(summary.researchComparables.length, 2);
});

test("summary reports failed_reliability_thresholds when supportive comps fail quality or confidence", () => {
  const subject = makeParcel({ parcelId: "s14", assessedValue: 406000, fullMarketValue: 422917 });
  const visible = [
    makeCandidate({ parcelId: "f1", grievanceSupport: 8, qualityScore: 72, confidenceScore: 50, equityRatio: 0.93 }),
    makeCandidate({ parcelId: "f2", grievanceSupport: 6, qualityScore: 48, confidenceScore: 88, equityRatio: 0.92 }),
  ];
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile: makeProfile(subject),
    visibleComps: visible,
    selectedComps: [],
    parcels: [subject],
    salesByParcelId: new Map(),
    equalizationRate: 0.90,
  });
  assert.strictEqual(summary.analysisState, "research_only");
  assert.strictEqual(summary.noPackageReasonCode, "failed_reliability_thresholds");
});

test("summary reports mixed_research_only when neutral and reliability failures are both present", () => {
  const subject = makeParcel({ parcelId: "s15", assessedValue: 406000, fullMarketValue: 422917 });
  const visible = [
    makeCandidate({ parcelId: "m1", grievanceSupport: -3, qualityScore: 78, confidenceScore: 90, equityRatio: 0.96, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.1, assessedPerSqftAdvantagePct: 0.00 } }),
    makeCandidate({ parcelId: "m2", grievanceSupport: 6, qualityScore: 70, confidenceScore: 50, equityRatio: 0.92 }),
  ];
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile: makeProfile(subject),
    visibleComps: visible,
    selectedComps: [],
    parcels: [subject],
    salesByParcelId: new Map(),
    equalizationRate: 0.90,
  });
  assert.strictEqual(summary.analysisState, "research_only");
  assert.strictEqual(summary.noPackageReasonCode, "mixed_research_only");
});

test("research-only summary can pivot claim recommendation toward excessive assessment", () => {
  const subject = makeParcel({ parcelId: "s16", assessedValue: 406000, fullMarketValue: 422917, livingAreaSqft: 2000 });
  const visible = [
    makeCandidate({ parcelId: "x1", grievanceSupport: -4, qualityScore: 80, confidenceScore: 92, equityRatio: 0.960, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.2, assessedPerSqftAdvantagePct: 0.00 } }),
    makeCandidate({ parcelId: "x2", grievanceSupport: -3, qualityScore: 78, confidenceScore: 90, equityRatio: 0.956, normalizedMetricsSummary: { equityRatioDeltaPoints: 0.4, assessedPerSqftAdvantagePct: 0.01 } }),
  ];
  const salesByParcelId = makeSalesMap([
    { parcel: makeParcel({ parcelId: "sale1", livingAreaSqft: 1980, yearBuilt: 1921, eastCoord: 1200, nrthCoord: 1000, assessedValue: 360000, fullMarketValue: 360000 }), sales: [{ sale_price: 360000, sale_dte: "2025-06-01", arms_length_flag: "Y" }] },
    { parcel: makeParcel({ parcelId: "sale2", livingAreaSqft: 2020, yearBuilt: 1919, eastCoord: 1400, nrthCoord: 1000, assessedValue: 370000, fullMarketValue: 370000 }), sales: [{ sale_price: 370000, sale_dte: "2025-07-01", arms_length_flag: "Y" }] },
    { parcel: makeParcel({ parcelId: "sale3", livingAreaSqft: 2050, yearBuilt: 1924, eastCoord: 1600, nrthCoord: 1000, assessedValue: 380000, fullMarketValue: 380000 }), sales: [{ sale_price: 380000, sale_dte: "2025-08-01", arms_length_flag: "Y" }] },
  ]);
  const salesParcels = Array.from(["sale1", "sale2", "sale3"]).map((id, idx) => makeParcel({ parcelId: id, livingAreaSqft: 1980 + (idx * 20), yearBuilt: 1921 + idx, eastCoord: 1200 + (idx * 200), nrthCoord: 1000, assessedValue: 360000 + (idx * 10000), fullMarketValue: 360000 + (idx * 10000) }));
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile: makeProfile(subject),
    visibleComps: visible,
    selectedComps: [],
    parcels: [subject].concat(salesParcels),
    salesByParcelId,
    equalizationRate: 0.90,
    currentDate: new Date("2026-03-15T00:00:00Z"),
  });
  assert.strictEqual(summary.analysisState, "research_only");
  assert.strictEqual(summary.claimRecommendation.code, "EXCESSIVE");
});

test("normalized metric summary always returns a numeric score", () => {
  const neutral = engine.summarizeNormalizedMetricSupport([]);
  assert.strictEqual(neutral.score, 0);
  const supportive = engine.summarizeNormalizedMetricSupport([
    makeCandidate({ parcelId: "n1", normalizedMetricsSummary: { equityRatioDeltaPoints: 2.4, assessedPerSqftAdvantagePct: 0.08 } }),
    makeCandidate({ parcelId: "n2", normalizedMetricsSummary: { equityRatioDeltaPoints: 1.4, assessedPerSqftAdvantagePct: 0.04 } }),
  ]);
  assert.ok(Number.isFinite(supportive.score));
  assert.strictEqual(supportive.label, "supportive");
});

let passed = 0;
for (const entry of tests) {
  entry.fn();
  passed += 1;
}

console.log(`grievance-engine-regression: ${passed}/${tests.length} tests passed`);
