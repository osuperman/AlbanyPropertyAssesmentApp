"use strict";

const engine = require("./grievance-engine.js");
const rollData = require("./albany-roll.json");
const salesData = require("./albany-sales.json");

const DEFAULT_SAMPLE_SIZE = 500;
const DEFAULT_EXAMPLE_LIMIT = 10;
const CURRENT_DATE = new Date("2026-03-16T00:00:00Z");
const ROLL_EQUALIZATION_RATE = Number.isFinite(Number(rollData?.meta?.uniformPercentOfValue))
  ? Number(rollData.meta.uniformPercentOfValue) / 100
  : null;

function parseArgs(argv) {
  const options = {
    sample: DEFAULT_SAMPLE_SIZE,
    examples: DEFAULT_EXAMPLE_LIMIT,
    parcel: "",
    compareGeo: true,
  };
  argv.forEach(arg => {
    if (arg.startsWith("--sample=")) {
      const value = Number(arg.slice("--sample=".length));
      if (Number.isFinite(value) && value > 0) options.sample = Math.round(value);
    } else if (arg.startsWith("--examples=")) {
      const value = Number(arg.slice("--examples=".length));
      if (Number.isFinite(value) && value > 0) options.examples = Math.round(value);
    } else if (arg.startsWith("--parcel=")) {
      options.parcel = arg.slice("--parcel=".length).trim();
    } else if (arg === "--no-geo-compare") {
      options.compareGeo = false;
    }
  });
  return options;
}

function inventoryOf(parcel) {
  return parcel && parcel.inventory && typeof parcel.inventory === "object" ? parcel.inventory : null;
}

function inventoryStyle(parcel) {
  const raw = (((inventoryOf(parcel) || {}).buildingStyle || "") + "").trim();
  return raw || "";
}

function inventoryYearBuilt(parcel) {
  const inventoryYear = Number((inventoryOf(parcel) || {}).yearBuilt);
  if (Number.isFinite(inventoryYear) && inventoryYear > 0) return inventoryYear;
  const rollYear = Number(parcel?.yearBuilt);
  return Number.isFinite(rollYear) && rollYear > 0 ? rollYear : null;
}

function inventorySqft(parcel) {
  const value = Number((inventoryOf(parcel) || {}).sqftLivingArea);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
}

function inventoryBedrooms(parcel) {
  const value = Number((inventoryOf(parcel) || {}).bedrooms);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function inventoryFullBaths(parcel) {
  const value = Number((inventoryOf(parcel) || {}).fullBaths);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function inventoryHalfBaths(parcel) {
  const value = Number((inventoryOf(parcel) || {}).halfBaths);
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function buildComparableProfile(parcel) {
  const livingArea = inventorySqft(parcel);
  const yearBuilt = inventoryYearBuilt(parcel);
  const bedrooms = inventoryBedrooms(parcel);
  const fullBaths = inventoryFullBaths(parcel);
  const halfBaths = inventoryHalfBaths(parcel);
  const bathCount = fullBaths == null && halfBaths == null ? null : (Number(fullBaths || 0) + (Number(halfBaths || 0) * 0.5));
  const style = inventoryStyle(parcel) || null;
  return {
    neighborhood: (parcel?.neighborhood || parcel?.neighborhoodLabel || "").toString().trim() || null,
    zipCode: (parcel?.zip || "").toString().trim() || null,
    normalizedStreetName: engine.streetNameKeyForComp(parcel?.address),
    livingArea,
    yearBuilt,
    bedrooms,
    fullBaths,
    halfBaths,
    bathCount,
    style,
    styleFamily: engine.normalizeStyleFamily(style),
    equityRatio: engine.safeDivide(engine.asNumber(parcel?.assessedValue), engine.asNumber(parcel?.fullMarketValue)),
    assessedPerSqft: engine.safeDivide(engine.asNumber(parcel?.assessedValue), livingArea),
  };
}

function saleDateValue(sale) {
  const parsed = engine.parseSalesDate(sale?.sale_dte) || engine.parseSalesDate(sale?.deed_dte);
  return parsed ? parsed.getTime() : 0;
}

function buildSalesMap(rows) {
  const grouped = new Map();
  (Array.isArray(rows) ? rows : []).forEach(row => {
    const key = engine.normalizeParcelId(row?.print_key || row?.printKey || row?.parcel_id || row?.parcelId);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  grouped.forEach((list, key) => {
    list.sort((a, b) => saleDateValue(b) - saleDateValue(a));
    grouped.set(key, list);
  });
  return grouped;
}

function buildDeterministicSample(parcels, sampleSize) {
  if (!Array.isArray(parcels) || !parcels.length) return [];
  if (sampleSize >= parcels.length) return parcels.slice();
  const step = Math.max(1, Math.floor(parcels.length / sampleSize));
  const sample = [];
  for (let index = 0; index < parcels.length && sample.length < sampleSize; index += step) {
    sample.push(parcels[index]);
  }
  return sample;
}

function summarizeCandidateForOutput(candidate) {
  const metrics = candidate?._selectionDiagnostics?.normalizedMetricsSummary || {};
  return {
    address: candidate?.address,
    parcelId: candidate?.parcelId,
    qualityScore: candidate?.qualityScore,
    confidenceScore: candidate?.confidenceScore,
    grievanceSupport: candidate?.grievanceSupport,
    supportLabel: candidate?.supportLabel,
    packageDecision: candidate?._packageDecision || null,
    selectionIndicator: candidate?._selectionIndicator || null,
    distanceMiles: candidate?._distanceMiles ?? null,
    assessedValue: candidate?.assessedValue,
    fullMarketValue: candidate?.fullMarketValue,
    normalizedMetrics: {
      assessedPctAdvantage: metrics.assessedPctAdvantage ?? null,
      assessedPerSqftAdvantagePct: metrics.assessedPerSqftAdvantagePct ?? null,
      equityRatioDeltaPoints: metrics.equityRatioDeltaPoints ?? null,
      supportScore: metrics.supportScore ?? null,
    },
  };
}

function createAuditContext() {
  const parcels = rollData?.parcels || [];
  const residential = parcels.filter(parcel => engine.isResidentialPropClass(parcel?.propClass));
  const profileMap = new Map(residential.map(parcel => [
    engine.normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl),
    buildComparableProfile(parcel),
  ]));
  return {
    parcels,
    residential,
    profileMap,
    salesByParcelId: buildSalesMap(salesData),
  };
}

function buildCandidate(subject, comp, context, options = {}) {
  const subjectId = engine.normalizeParcelId(subject?.parcelIdNorm || subject?.parcelId || subject?.printKey || subject?.pinSbl);
  const compId = engine.normalizeParcelId(comp?.parcelIdNorm || comp?.parcelId || comp?.printKey || comp?.pinSbl);
  const subjectProfile = context.profileMap.get(subjectId);
  const compProfile = context.profileMap.get(compId);
  const analysis = engine.analyzeComparableCandidate({
    subject,
    comp,
    subjectProfile,
    compProfile,
    salesByParcelId: context.salesByParcelId,
    allowBroadClass: !!options.allowBroadClass,
    cityStrictGeoMode: options.cityStrictGeoMode ?? true,
    currentDate: CURRENT_DATE,
  });
  if (!analysis) return null;
  return {
    parcelId: comp?.parcelId,
    parcelIdNorm: comp?.parcelIdNorm || comp?.parcelId,
    address: comp?.address,
    neighborhood: comp?.neighborhood,
    assessedValue: comp?.assessedValue,
    fullMarketValue: comp?.fullMarketValue,
    qualityScore: analysis.qualityScore,
    confidenceScore: analysis.confidenceScore,
    grievanceSupport: analysis.grievanceSupport,
    supportLabel: analysis.supportLabel,
    normalizedStreetName: compProfile?.normalizedStreetName || engine.streetNameKeyForComp(comp?.address),
    _distanceMiles: analysis.location?.distanceMiles ?? null,
    _compProfile: {
      livingArea: compProfile?.livingArea ?? null,
      yearBuilt: compProfile?.yearBuilt ?? null,
      equityRatio: compProfile?.equityRatio ?? null,
    },
    _selectionDiagnostics: {
      normalizedMetricsSummary: analysis.normalizedMetricsSummary,
      confidenceNotes: analysis.confidenceNotes,
      disqualifyingConcerns: analysis.disqualifyingConcerns,
    },
    _fmvPctDiff: analysis.fmvPctDiff,
    _saleEvidence: analysis.saleEvidence,
    _riskFlags: analysis.riskFlags,
    _marginalSupport: analysis.marginalSupport,
  };
}

function evaluateSubject(subject, context, options = {}) {
  const subjectId = engine.normalizeParcelId(subject?.parcelIdNorm || subject?.parcelId || subject?.printKey || subject?.pinSbl);
  const subjectProfile = context.profileMap.get(subjectId);
  function collectVisible(allowBroadClass) {
    return engine.sortVisibleComparableCandidates(
      context.residential
        .map(comp => buildCandidate(subject, comp, context, { allowBroadClass, cityStrictGeoMode: options.cityStrictGeoMode }))
        .filter(Boolean)
        .filter(candidate => Number(candidate?.qualityScore) >= 40)
    ).slice(0, 12);
  }
  let visible = collectVisible(false);
  let eligiblePool = engine.sortGrievanceCandidatePool(visible.filter(candidate =>
    Number(candidate?.qualityScore) >= 50 &&
    Number(candidate?.confidenceScore) >= 60 &&
    Number(candidate?.grievanceSupport) > 0
  ));
  let mode = "physical";
  if (eligiblePool.length < 3) {
    const fallbackVisible = collectVisible(true);
    const fallbackPool = engine.sortGrievanceCandidatePool(fallbackVisible.filter(candidate =>
      Number(candidate?.qualityScore) >= 50 &&
      Number(candidate?.confidenceScore) >= 60 &&
      Number(candidate?.grievanceSupport) > 0
    ));
    if (fallbackVisible.length > visible.length || fallbackPool.length > eligiblePool.length) {
      visible = fallbackVisible;
      eligiblePool = fallbackPool;
      mode = "fallback";
    }
  }
  const packageSelection = engine.selectGrievancePackage(eligiblePool, subjectProfile);
  const selected = packageSelection.selected || [];
  const annotatedVisible = engine.annotateComparablePackageDecisions(visible.map(candidate => ({ ...candidate })), eligiblePool, packageSelection.decisionById);
  const summary = engine.summarizeGrievancePackage({
    subject,
    subjectProfile,
    visibleComps: annotatedVisible,
    selectedComps: selected,
    parcels: context.parcels,
    salesByParcelId: context.salesByParcelId,
    equalizationRate: ROLL_EQUALIZATION_RATE,
    currentDate: CURRENT_DATE,
  });
  return {
    subject,
    subjectProfile,
    comparableMode: mode,
    visibleCount: annotatedVisible.length,
    eligiblePoolCount: eligiblePool.length,
    selectedCount: selected.length,
    analysisState: summary?.analysisState || null,
    noPackageReasonCode: summary?.noPackageReasonCode || null,
    selectionOutcomeCounts: summary?.selectionOutcomeCounts || null,
    visible: annotatedVisible,
    eligiblePool,
    selected,
  };
}

function summarizeResults(results, exampleLimit) {
  const zeroVisible = results.filter(result => result.visibleCount === 0);
  const zeroEligiblePool = results.filter(result => result.eligiblePoolCount === 0);
  const zeroSelected = results.filter(result => result.selectedCount === 0);
  const researchOnly = results.filter(result => result.analysisState === "research_only");
  const noMatches = results.filter(result => result.analysisState === "no_matches");
  const avgVisible = results.length ? results.reduce((sum, result) => sum + result.visibleCount, 0) / results.length : 0;
  const avgSelected = results.length ? results.reduce((sum, result) => sum + result.selectedCount, 0) / results.length : 0;
  const avgEligiblePool = results.length ? results.reduce((sum, result) => sum + result.eligiblePoolCount, 0) / results.length : 0;
  const reasonCounts = {};
  researchOnly.forEach(result => {
    const code = result.noPackageReasonCode || "unspecified";
    reasonCounts[code] = (reasonCounts[code] || 0) + 1;
  });
  return {
    subjects: results.length,
    zeroVisible: zeroVisible.length,
    zeroEligiblePool: zeroEligiblePool.length,
    zeroSelected: zeroSelected.length,
    researchOnly: researchOnly.length,
    noMatches: noMatches.length,
    avgVisible: Number(avgVisible.toFixed(2)),
    avgEligiblePool: Number(avgEligiblePool.toFixed(2)),
    avgSelected: Number(avgSelected.toFixed(2)),
    researchOnlyReasonCounts: reasonCounts,
    zeroVisibleExamples: zeroVisible.slice(0, exampleLimit).map(result => `${result.subject.address} (${result.subject.parcelId})`),
    zeroSelectedExamples: zeroSelected.slice(0, exampleLimit).map(result => `${result.subject.address} (${result.subject.parcelId})`),
    researchOnlyExamples: researchOnly.slice(0, exampleLimit).map(result => `${result.subject.address} (${result.subject.parcelId}) | ${result.noPackageReasonCode || "unspecified"}`),
  };
}

function runSampleAudit(context, options) {
  const sample = buildDeterministicSample(context.residential, options.sample);
  const strictResults = sample.map(subject => evaluateSubject(subject, context, { cityStrictGeoMode: true }));
  const output = {
    sampleSize: sample.length,
    strict: summarizeResults(strictResults, options.examples),
  };
  if (options.compareGeo) {
    const relaxedResults = sample.map(subject => evaluateSubject(subject, context, { cityStrictGeoMode: false }));
    output.relaxedGeoOnly = summarizeResults(relaxedResults, options.examples);
  }
  return output;
}

function runParcelAudit(context, parcelId, options) {
  const normalizedParcelId = engine.normalizeParcelId(parcelId);
  const subject = context.residential.find(parcel =>
    engine.normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl) === normalizedParcelId
  );
  if (!subject) {
    throw new Error(`Parcel not found in residential roll data: ${parcelId}`);
  }
  const strict = evaluateSubject(subject, context, { cityStrictGeoMode: true });
  const output = {
    subject: {
      address: subject.address,
      parcelId: subject.parcelId,
      assessedValue: subject.assessedValue,
      fullMarketValue: subject.fullMarketValue,
      profile: strict.subjectProfile,
    },
    strict: {
      comparableMode: strict.comparableMode,
      visibleCount: strict.visibleCount,
      eligiblePoolCount: strict.eligiblePoolCount,
      selectedCount: strict.selectedCount,
      analysisState: strict.analysisState,
      noPackageReasonCode: strict.noPackageReasonCode,
      selectionOutcomeCounts: strict.selectionOutcomeCounts,
      selected: strict.selected.map(summarizeCandidateForOutput),
      topVisible: strict.visible.slice(0, options.examples).map(summarizeCandidateForOutput),
    },
  };
  if (options.compareGeo) {
    const relaxed = evaluateSubject(subject, context, { cityStrictGeoMode: false });
    output.relaxedGeoOnly = {
      comparableMode: relaxed.comparableMode,
      visibleCount: relaxed.visibleCount,
      eligiblePoolCount: relaxed.eligiblePoolCount,
      selectedCount: relaxed.selectedCount,
      analysisState: relaxed.analysisState,
      noPackageReasonCode: relaxed.noPackageReasonCode,
      selectionOutcomeCounts: relaxed.selectionOutcomeCounts,
      selected: relaxed.selected.map(summarizeCandidateForOutput),
      topVisible: relaxed.visible.slice(0, options.examples).map(summarizeCandidateForOutput),
    };
  }
  return output;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const context = createAuditContext();
  const result = options.parcel
    ? runParcelAudit(context, options.parcel, options)
    : runSampleAudit(context, options);
  console.log(JSON.stringify(result, null, 2));
}

main();
