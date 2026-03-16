"use strict";

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function roundNumber(value, digits = 1) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  const factor = 10 ** digits;
  return Math.round(num * factor) / factor;
}

function asNumber(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function safeDivide(numerator, denominator) {
  const a = Number(numerator);
  const b = Number(denominator);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= 0) return null;
  return a / b;
}

function comparePctDelta(a, b) {
  if (!(Number.isFinite(a) && a > 0 && Number.isFinite(b) && b > 0)) return null;
  return Math.abs(a - b) / Math.max(a, b);
}

function meanValue(values) {
  const nums = (Array.isArray(values) ? values : []).map(asNumber).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function formatWholeDollar(value) {
  const num = asNumber(value);
  if (!Number.isFinite(num)) return "-";
  return `$${Math.round(num).toLocaleString("en-US")}`;
}

function medianValue(values) {
  const nums = (Array.isArray(values) ? values : []).map(asNumber).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  if (nums.length % 2) return nums[mid];
  return (nums[mid - 1] + nums[mid]) / 2;
}

function percentileRankValue(subjectValue, values) {
  const nums = (Array.isArray(values) ? values : []).map(asNumber).filter(Number.isFinite).sort((a, b) => a - b);
  const subjectNum = asNumber(subjectValue);
  if (!nums.length || !Number.isFinite(subjectNum)) return null;
  const count = nums.filter(value => value <= subjectNum).length;
  return (count / nums.length) * 100;
}

function normalizeParcelId(raw) {
  return (raw || "").toString().trim().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/\s+/g, "").replace(/^(?:sbl|pin|printkey)[:\s-]*/i, "");
}

function normalizeStreetKeyForCompare(raw) {
  if (!raw) return "";
  const DIR = { n: "n", north: "n", s: "s", south: "s", e: "e", east: "e", w: "w", west: "w", ne: "ne", northeast: "ne", nw: "nw", northwest: "nw", se: "se", southeast: "se", sw: "sw", southwest: "sw" };
  const SUF = { street: "st", st: "st", avenue: "ave", ave: "ave", road: "rd", rd: "rd", boulevard: "blvd", blvd: "blvd", drive: "dr", dr: "dr", lane: "ln", ln: "ln", court: "ct", ct: "ct", terrace: "ter", ter: "ter", place: "pl", pl: "pl", circle: "cir", cir: "cir", way: "way", highway: "hwy", hwy: "hwy", parkway: "pkwy", pkwy: "pkwy" };
  const STOP = new Set(["apt", "apartment", "unit", "ste", "suite", "fl", "floor", "rm", "room"]);
  const ROLL_NOISE = new Set(["frnt", "dpth", "taxable", "value", "county", "city", "school"]);
  const tokens = raw.toString().toLowerCase()
    .replace(/[\r\n,]+/g, " ")
    .replace(/[^\w\s#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const isNumTok = token => /^\d+[a-z]?$/i.test(token);
  const scoreCandidate = startIdx => {
    for (let j = startIdx + 1; j < Math.min(tokens.length, startIdx + 7); j += 1) {
      const token = tokens[j];
      if (/^\d{5}(?:-\d{4})?$/.test(token) || token === "ny") break;
      if (SUF[token]) {
        const middle = tokens.slice(startIdx + 1, j);
        const alphaCount = middle.filter(x => /[a-z]/.test(x) && !DIR[x] && !SUF[x]).length;
        const numNoise = middle.filter(x => /^\d+$/.test(x) || isNumTok(x)).length;
        if (alphaCount < 1) return null;
        return { score: (numNoise * 10) + (j - startIdx), j };
      }
    }
    return null;
  };
  let startIndex = -1;
  let best = null;
  for (let i = 0; i < tokens.length; i += 1) {
    if (!isNumTok(tokens[i])) continue;
    const candidate = scoreCandidate(i);
    if (!candidate) continue;
    if (!best || candidate.score < best.score || (candidate.score === best.score && i > startIndex)) {
      best = candidate;
      startIndex = i;
    }
  }
  if (startIndex < 0) startIndex = tokens.findIndex(isNumTok);
  const output = [];
  let started = startIndex >= 0;
  for (let i = started ? startIndex : 0; i < tokens.length; i += 1) {
    let token = tokens[i];
    if (!started) {
      if (isNumTok(token)) {
        started = true;
        output.push(token.replace(/^0+(?=\d)/, ""));
      }
      continue;
    }
    if (/^\d{5}(?:-\d{4})?$/.test(token) || token === "ny") break;
    if (token === "albany" && output.length >= 2) break;
    if (token === "new" && tokens[i + 1] === "york") break;
    if (/^east-?\d+$/i.test(token) || /^nrth-?\d+$/i.test(token) || ROLL_NOISE.has(token)) break;
    if (token.startsWith("#") || STOP.has(token)) break;
    token = DIR[token] || SUF[token] || token;
    output.push(token);
    if (output.length >= 5) break;
  }
  return output.join(" ");
}

function streetNameKeyForComp(address) {
  const normalized = normalizeStreetKeyForCompare(address || "");
  if (!normalized) return "";
  const parts = normalized.split(" ").filter(Boolean);
  return parts.length > 1 && /^\d+[a-z]?$/i.test(parts[0]) ? parts.slice(1).join(" ") : parts.join(" ");
}

function isResidentialPropClass(code) {
  return /^2\d\d$/.test((code || "").toString().trim());
}

const STYLE_FAMILY_KEYWORDS = [
  { family: "old_style", match: /(old style|mansion|victorian|row|town house|townhouse)/i },
  { family: "colonial", match: /colonial/i },
  { family: "cape", match: /cape/i },
  { family: "ranch", match: /(raised ranch|ranch)/i },
  { family: "bungalow", match: /(bungalow|cottage)/i },
  { family: "split_level", match: /(split level|split-level|split)/i },
  { family: "contemporary", match: /(contemporary|a-frame|log home|log)/i },
  { family: "two_family_converted", match: /(duplex|converted)/i },
];

function normalizeStyleFamily(rawStyle) {
  const normalized = (rawStyle || "").toString().trim();
  if (!normalized) return "unknown";
  const match = STYLE_FAMILY_KEYWORDS.find(entry => entry.match.test(normalized));
  return match ? match.family : "unknown";
}

const RESIDENTIAL_CLASS_CLOSE_PAIRS = new Set([
  "210|215",
  "215|210",
  "220|221",
  "221|220",
  "230|231",
  "231|230",
  "240|241",
  "241|240",
]);

function residentialUnitCountForClass(code, desc = "") {
  const raw = `${code || ""} ${desc || ""}`.trim();
  const familyMatch = raw.match(/(\d)\s*family/i);
  if (familyMatch) return Number(familyMatch[1]);
  const codeKey = String(code || "").trim();
  if (codeKey === "210" || codeKey === "215") return 1;
  if (codeKey === "220" || codeKey === "221") return 2;
  if (codeKey === "230" || codeKey === "231") return 3;
  if (codeKey === "240" || codeKey === "241") return 4;
  return null;
}

function residentialFamilyForClass(code, desc = "") {
  const unitCount = residentialUnitCountForClass(code, desc);
  if (unitCount === 1) return "single_family";
  if (unitCount === 2) return "two_family";
  if (unitCount === 3) return "three_family";
  if (unitCount === 4) return "four_family";
  if (isResidentialPropClass(code)) return "residential";
  return "non_residential";
}

function classCompatibilityTier(subject, comp, { allowBroadClass = false } = {}) {
  const subjectCode = String(subject?.propClass || "").trim();
  const compCode = String(comp?.propClass || "").trim();
  if (!subjectCode || !compCode) return { tier: "tier_3_incompatible", score: 0, label: "Class unavailable" };
  if (subjectCode === compCode) return { tier: "tier_0_exact", score: 18, label: "Exact class match" };
  if (!isResidentialPropClass(subjectCode) || !isResidentialPropClass(compCode)) return { tier: "tier_3_incompatible", score: 0, label: "Incompatible class" };
  if (RESIDENTIAL_CLASS_CLOSE_PAIRS.has(`${subjectCode}|${compCode}`)) {
    return { tier: "tier_1_close", score: 11, label: "Close residential class match" };
  }
  const subjectUnits = residentialUnitCountForClass(subjectCode, subject?.propClassDesc || "");
  const compUnits = residentialUnitCountForClass(compCode, comp?.propClassDesc || "");
  if (subjectUnits != null && compUnits != null && subjectUnits === compUnits) {
    return { tier: "tier_1_close", score: 11, label: "Close residential class match" };
  }
  if (allowBroadClass && residentialFamilyForClass(subjectCode, subject?.propClassDesc || "") === residentialFamilyForClass(compCode, comp?.propClassDesc || "")) {
    return { tier: "tier_2_broad", score: 4, label: "Broad residential class match" };
  }
  return { tier: "tier_3_incompatible", score: 0, label: "Incompatible class" };
}

function parseSalesDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isArmLengthSale(sale) {
  return (sale?.arms_length_flag || "").toString().trim().toUpperCase() === "Y";
}

function getParcelSales(parcel, salesByParcelId) {
  const key = normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl);
  return key && salesByParcelId instanceof Map ? (salesByParcelId.get(key) || []) : [];
}

function getMostRecentArmsLengthSale(parcel, salesByParcelId) {
  return getParcelSales(parcel, salesByParcelId).find(sale => isArmLengthSale(sale) && Number(sale?.sale_price) > 0) || null;
}

function isRecentArmsLengthSale(sale, currentDate, years = 3) {
  if (!sale || !isArmLengthSale(sale)) return false;
  const saleDate = parseSalesDate(sale?.sale_dte) || parseSalesDate(sale?.deed_dte);
  if (!saleDate) return false;
  const cutoff = new Date(currentDate.getTime());
  cutoff.setFullYear(cutoff.getFullYear() - years);
  return saleDate >= cutoff;
}

function parcelDistanceMiles(a, b) {
  const ax = Number(a?.eastCoord);
  const ay = Number(a?.nrthCoord);
  const bx = Number(b?.eastCoord);
  const by = Number(b?.nrthCoord);
  if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by) || ax <= 0 || ay <= 0 || bx <= 0 || by <= 0) return null;
  return roundNumber(Math.sqrt(((ax - bx) ** 2) + ((ay - by) ** 2)) / 5280, 2);
}

function parcelNeighborhoodName(parcel, profile) {
  return (profile?.neighborhood || parcel?.neighborhood || parcel?.neighborhoodLabel || "").toString().trim();
}

function comparableLocationContext(subject, comp, subjectProfile, compProfile) {
  const distanceMiles = parcelDistanceMiles(subject, comp);
  const sameNeighborhood = !!(parcelNeighborhoodName(subject, subjectProfile) && parcelNeighborhoodName(subject, subjectProfile) === parcelNeighborhoodName(comp, compProfile));
  const sameStreet = !!(subjectProfile?.normalizedStreetName && compProfile?.normalizedStreetName && subjectProfile.normalizedStreetName === compProfile.normalizedStreetName);
  const sameZip = !!(subjectProfile?.zipCode && compProfile?.zipCode && subjectProfile.zipCode === compProfile.zipCode);
  return { distanceMiles, sameNeighborhood, sameStreet, sameZip };
}

function locationSimilarityScore(location = {}) {
  const { sameNeighborhood = false, sameStreet = false, sameZip = false, distanceMiles = null } = location;
  if (sameNeighborhood && Number.isFinite(distanceMiles) && distanceMiles <= 0.5) return 22;
  if (sameNeighborhood && Number.isFinite(distanceMiles) && distanceMiles <= 1.0) return 20;
  if (sameNeighborhood) return 18;
  if (sameStreet) return 17;
  if (sameZip && Number.isFinite(distanceMiles) && distanceMiles <= 1.0) return 14;
  if (sameZip && Number.isFinite(distanceMiles) && distanceMiles <= 2.0) return 10;
  if (sameZip && distanceMiles == null) return 10;
  if (Number.isFinite(distanceMiles) && distanceMiles <= 4.0) return 5;
  return 0;
}

function supportKindForScore(score) {
  if (score >= 25) return "strong_support";
  if (score >= 12) return "moderate_support";
  if (score >= 1) return "weak_support";
  if (score >= -8) return "neutral";
  return "weakens_case";
}

function supportBadgeForKind(kind) {
  if (kind === "strong_support") return "Strong support";
  if (kind === "moderate_support") return "Moderate support";
  if (kind === "weak_support") return "Weak support";
  if (kind === "weakens_case") return "Weakens case";
  return "Neutral";
}

function qualityLabelForScore(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function candidateQualityValue(comp) {
  return asNumber(comp?.qualityScore ?? comp?._comparableQualityScore);
}

function candidateConfidenceValue(comp) {
  return asNumber(comp?.confidenceScore ?? comp?._dataConfidenceScore);
}

function candidateSupportValue(comp) {
  return asNumber(comp?.grievanceSupport ?? comp?._grievanceSupportScore);
}

function candidateKindValue(comp) {
  return comp?.supportLabel || comp?._grievanceSupportLabel || comp?._grievanceRelevance?.kind || supportKindForScore(candidateSupportValue(comp) || 0);
}

function candidateParcelId(comp) {
  return normalizeParcelId(comp?.parcelIdNorm || comp?.parcelId || comp?.printKey || comp?.pinSbl);
}

function candidateStreetKey(comp) {
  return comp?.normalizedStreetName || comp?._compProfile?.normalizedStreetName || streetNameKeyForComp(comp?.address);
}

function candidateNeighborhood(comp) {
  return comp?.neighborhood || comp?._compProfile?.neighborhood || parcelNeighborhoodName(comp, comp?._compProfile);
}

function candidateDistance(comp) {
  return asNumber(comp?.distanceMiles ?? comp?._distanceMiles);
}

function candidateAssessedValue(comp) {
  return asNumber(comp?.assessedValue);
}

function candidateLivingArea(comp) {
  return asNumber(comp?.livingAreaSqft ?? comp?._compProfile?.livingArea);
}

function candidateYearBuilt(comp) {
  return asNumber(comp?.yearBuilt ?? comp?._compProfile?.yearBuilt);
}

function candidateEquityRatio(comp) {
  const ratio = asNumber(comp?.equityRatio ?? comp?._compProfile?.equityRatio);
  if (Number.isFinite(ratio)) return ratio;
  const pct = asNumber(comp?.equityPct ?? comp?._compProfile?.equity);
  return Number.isFinite(pct) ? pct / 100 : null;
}

function candidateNormalizedSummary(comp) {
  return comp?.normalizedMetricsSummary || comp?._selectionDiagnostics?.normalizedMetricsSummary || {};
}

function buildPackageDecisionRecord(status, reasonCode, candidateKind = "neutral") {
  const labels = {
    support_gate: "Does not support grievance",
    confidence_gate: "Insufficient data confidence",
    quality_gate: "Insufficient physical similarity",
    same_street_cap: "Same-street limit reached",
    dominated_similar: "Superseded by stronger comparable",
    assessed_outlier: "Assessed value is an outlier",
    package_limit: "Package size limit reached",
  };
  let message = "Not included in the default package under the current rules.";
  if (reasonCode === "included_strong_corroboration") {
    message = "Included because another nearby strong comp makes a similar point, and corroborating strong evidence can strengthen an unequal-assessment claim.";
  } else if (reasonCode === "included_default") {
    message = candidateKind === "strong_support"
      ? "Included because it is one of the strongest pieces of grievance evidence in the current package."
      : "Included because it cleared the package support, quality, and confidence checks.";
  } else if (reasonCode === "included_replacement") {
    message = "Included because it out-ranked another comp on the same street.";
  } else if (reasonCode === "same_street_cap") {
    message = candidateKind === "strong_support"
      ? "This comp strongly supports the grievance, but the default package already includes two comps from the same street."
      : "This comp was left out because the default package already includes two comps from the same street.";
  } else if (reasonCode === "package_limit") {
    message = candidateKind === "strong_support"
      ? "This comp strongly supports the grievance, but the default package already reached its 3 to 5 comp target with other strong evidence."
      : "This comp was left out because the default package already reached its target size.";
  } else if (reasonCode === "dominated_similar") {
    message = "This comp was left out because a nearby comp was as strong or stronger on support, quality, and confidence.";
  } else if (reasonCode === "assessed_outlier") {
    message = "This comp was left out because its assessed value looks like a low outlier compared with the rest of the selected package.";
  } else if (reasonCode === "quality_gate") {
    message = "This comp was left out because it remained a research-only physical match rather than clearing the stronger physical-similarity gate for default inclusion.";
  } else if (reasonCode === "confidence_gate") {
    message = "This comp was left out because the underlying data were not complete enough for default inclusion.";
  } else if (reasonCode === "support_gate") {
    message = "This comp was left out because it stayed neutral after normalization instead of showing a favorable equity-ratio or assessed-value-per-square-foot gap.";
  } else if (reasonCode === "replaced_by_stronger_same_street") {
    message = "This comp was left out because a stronger comp on the same street replaced it.";
  }
  return {
    status,
    reasonCode,
    label: labels[reasonCode] || (status === "included" ? "Included in package" : "Not included"),
    message,
  };
}

function buildSelectionIndicatorRecord(comp, decision = null) {
  const packageDecision = decision || comp?._packageDecision || comp?.packageDecision || null;
  const reasonCode = packageDecision?.reasonCode || null;
  const support = candidateSupportValue(comp) || 0;
  const quality = candidateQualityValue(comp) || 0;
  const confidence = candidateConfidenceValue(comp) || 0;

  if (packageDecision?.status === "included") {
    if (reasonCode === "included_strong_corroboration") {
      return {
        code: "corroborating_strong_evidence",
        label: "Corroborating strong evidence",
        message: packageDecision.message,
      };
    }
    return {
      code: "included_in_default_package",
      label: "Included in default package",
      message: packageDecision?.message || "This home cleared the default package rules.",
    };
  }

  if ((reasonCode === "confidence_gate" || confidence < 60) && support > 0) {
    return {
      code: "supportive_but_failed_confidence",
      label: "Supportive but failed confidence",
      message: "This home pointed in a favorable direction, but the data confidence was below the default-package threshold.",
    };
  }

  if ((reasonCode === "quality_gate" || quality < 50) && support > 0) {
    return {
      code: "supportive_but_failed_quality",
      label: "Supportive but failed quality",
      message: "This home pointed in a favorable direction, but the physical-match score was below the default-package threshold.",
    };
  }

  if (support > 0 && [
    "same_street_cap",
    "dominated_similar",
    "assessed_outlier",
    "package_limit",
    "replaced_by_stronger_same_street",
  ].includes(reasonCode)) {
    return {
      code: "supportive_but_excluded_by_package_rules",
      label: "Supportive but excluded by package rules",
      message: packageDecision?.message || "This home was supportive, but it was excluded by the package assembly rules.",
    };
  }

  if (reasonCode === "support_gate" || (support <= 0 && quality >= 50 && confidence >= 60)) {
    return {
      code: "neutral_after_normalization",
      label: "Neutral after normalization",
      message: "This home looks physically similar, but its normalized value metrics did not show more favorable treatment than the subject.",
    };
  }

  if (quality < 50 || reasonCode === "quality_gate") {
    return {
      code: "physical_match_only",
      label: "Physical match only",
      message: "This home remains visible as a physical match, but it did not clear the stronger similarity threshold for the default package.",
    };
  }

  if (confidence < 60 || reasonCode === "confidence_gate") {
    return {
      code: "physical_match_only",
      label: "Physical match only",
      message: "This home remains visible as a physical match, but the underlying data were too incomplete for automatic package use.",
    };
  }

  return {
    code: "physical_match_only",
    label: "Physical match only",
    message: "This home remains visible for research, but it did not clear the default package rules.",
  };
}

function computeSelectionOutcomeCounts(visibleComps = [], selectedComps = []) {
  const counts = {
    visible: 0,
    supportive: 0,
    confidenceGated: 0,
    qualityGated: 0,
    packageLimited: 0,
    neutralAfterNormalization: 0,
    physicalMatchOnly: 0,
    selected: (Array.isArray(selectedComps) ? selectedComps : []).filter(Boolean).length,
  };
  for (const comp of Array.isArray(visibleComps) ? visibleComps : []) {
    if (!comp) continue;
    counts.visible += 1;
    if ((candidateSupportValue(comp) || 0) > 0) counts.supportive += 1;
    const indicator = buildSelectionIndicatorRecord(comp, comp?._packageDecision || comp?.packageDecision || null);
    if (indicator.code === "supportive_but_failed_confidence") counts.confidenceGated += 1;
    else if (indicator.code === "supportive_but_failed_quality") counts.qualityGated += 1;
    else if (indicator.code === "supportive_but_excluded_by_package_rules") counts.packageLimited += 1;
    else if (indicator.code === "neutral_after_normalization") counts.neutralAfterNormalization += 1;
    else if (indicator.code === "physical_match_only") counts.physicalMatchOnly += 1;
  }
  return counts;
}

function visibleEquityVariance(visibleComps = []) {
  const ratios = (Array.isArray(visibleComps) ? visibleComps : []).map(candidateEquityRatio).filter(Number.isFinite);
  if (ratios.length < 2) return null;
  return (Math.max(...ratios) - Math.min(...ratios)) * 100;
}

function summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, neighborhoodEquityModel) {
  const reasons = [];
  if (overvaluationFlag?.active) reasons.push("the equalization-rate benchmark still points to overvaluation");
  if (Number.isFinite(asNumber(marketSaleModel?.impliedDifference)) && asNumber(marketSaleModel?.impliedDifference) > 0) {
    reasons.push("recent arm's-length sales imply a lower market value than the current assessment");
  }
  if (Number.isFinite(asNumber(neighborhoodEquityModel?.subjectPercentile)) && asNumber(neighborhoodEquityModel?.subjectPercentile) >= 75) {
    reasons.push("your neighborhood equity percentile still runs high");
  }
  if (!reasons.length) return "";
  if (reasons.length === 1) return reasons[0];
  return `${reasons.slice(0, -1).join(", ")}, and ${reasons[reasons.length - 1]}`;
}

function buildExcessivePivotSentence(visibleComps = [], overvaluationFlag = null, marketSaleModel = null, neighborhoodEquityModel = null) {
  const variance = visibleEquityVariance(visibleComps);
  const signalSummary = summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, neighborhoodEquityModel);
  if (!Number.isFinite(variance) || variance >= 1 || !signalSummary) return "";
  return ` Nearby visible comps also show tightly clustered equity ratios (variance ${variance.toFixed(1)} points), which weakens an unequal-assessment claim. The remaining support leans more toward excessive assessment because ${signalSummary}.`;
}

function deriveNoPackageReasonCode(selectionOutcomeCounts = null) {
  const counts = selectionOutcomeCounts || {};
  if ((counts.visible || 0) <= 0) return "no_physical_matches";
  const supportiveGateFailures = (counts.confidenceGated || 0) + (counts.qualityGated || 0);
  if ((counts.supportive || 0) <= 0 && (counts.packageLimited || 0) <= 0) return "neutral_after_normalization";
  if (supportiveGateFailures > 0 && (counts.neutralAfterNormalization || 0) <= 0 && (counts.packageLimited || 0) <= 0) {
    return "failed_reliability_thresholds";
  }
  return "mixed_research_only";
}

function buildNoPackageReasonText(reasonCode, visibleComps = [], overvaluationFlag = null, marketSaleModel = null, neighborhoodEquityModel = null) {
  const excessivePivot = buildExcessivePivotSentence(visibleComps, overvaluationFlag, marketSaleModel, neighborhoodEquityModel);
  if (reasonCode === "no_physical_matches") {
    return "No comparable homes were found within the current search parameters, so the app could not build a grievance package.";
  }
  if (reasonCode === "neutral_after_normalization") {
    return `Comparable homes were found, but none showed a favorable normalized assessment difference after comparing equity ratio and assessed value per square foot. These homes remain visible as research comparables, not default grievance evidence.${excessivePivot}`;
  }
  if (reasonCode === "failed_reliability_thresholds") {
    return `Some homes pointed in a favorable direction, but they failed the minimum quality or data-confidence safeguards, so the app did not auto-build a grievance package.${excessivePivot}`;
  }
  return `Comparable homes were found, but the visible set was mixed: some stayed neutral after normalization and others fell short on quality, confidence, or package-assembly rules.${excessivePivot}`;
}

function recentCompSaleEvidence(subject, comp, salesByParcelId, currentDate) {
  const sale = getMostRecentArmsLengthSale(comp, salesByParcelId);
  if (!sale || !isRecentArmsLengthSale(sale, currentDate, 3)) {
    return { sale: null, qualifies: false, points: 0, status: "none", reasons: [] };
  }
  const points = [];
  const reasons = [];
  const salePrice = asNumber(sale?.sale_price);
  const subjectFmv = asNumber(subject?.fullMarketValue);
  const compFmv = asNumber(comp?.fullMarketValue);
  if (Number.isFinite(salePrice) && Number.isFinite(subjectFmv) && salePrice < subjectFmv) {
    points.push(6);
    reasons.push("Recent arm's-length sale price is below the subject FMV.");
  }
  if (Number.isFinite(salePrice) && Number.isFinite(compFmv) && salePrice > (compFmv * 1.05)) {
    points.push(3);
    reasons.push("Recent arm's-length sale price is above this comp's FMV.");
  }
  if (Number.isFinite(salePrice) && Number.isFinite(subjectFmv) && salePrice > subjectFmv) {
    points.push(-5);
    reasons.push("Recent arm's-length sale price is above the subject FMV.");
  }
  const total = points.reduce((sum, value) => sum + value, 0);
  return {
    sale,
    qualifies: true,
    points: total,
    status: total > 0 ? "supports" : total < 0 ? "weakens" : "neutral",
    reasons,
  };
}

function computeRiskFlags({ subject, comp, subjectProfile, compProfile, confidenceScore, livingAreaPctDiff, yearBuiltDiff, saleEvidence }) {
  const flags = [];
  const compSale = saleEvidence?.sale || null;
  const compSalePrice = asNumber(compSale?.sale_price);
  const compFmv = asNumber(comp?.fullMarketValue);
  if (compSale && Number.isFinite(compSalePrice) && Number.isFinite(compFmv) && compSalePrice > (compFmv * 1.05)) {
    flags.push("Recent arm's-length sale above FMV - assessor may argue this comp is correctly under-assessed, not a favorable comp.");
  }
  if (Number.isFinite(livingAreaPctDiff) && livingAreaPctDiff > 0.20) {
    const sqftGap = Math.abs((asNumber(subjectProfile?.livingArea) || 0) - (asNumber(compProfile?.livingArea) || 0));
    flags.push(`Large size difference (${Math.round(sqftGap)} sq ft) - assessor may apply a size adjustment that reduces the gap.`);
  }
  const fullBathDelta = Math.abs((asNumber(subjectProfile?.fullBaths) || 0) - (asNumber(compProfile?.fullBaths) || 0));
  if (Number.isFinite(fullBathDelta) && fullBathDelta > 1.0) {
    flags.push("Significant bath difference - bath adjustments may materially change the comparison.");
  }
  if (parcelNeighborhoodName(subject, subjectProfile) && parcelNeighborhoodName(comp, compProfile) && parcelNeighborhoodName(subject, subjectProfile) !== parcelNeighborhoodName(comp, compProfile)) {
    flags.push("Different neighborhood - assessor may challenge whether this property is truly comparable.");
  }
  if (Number.isFinite(confidenceScore) && confidenceScore < 70) {
    flags.push(`Lower data confidence (${Math.round(confidenceScore)}) - assessor may challenge the underlying data.`);
  }
  if (Number.isFinite(yearBuiltDiff) && yearBuiltDiff > 30) {
    flags.push(`Age gap of ${Math.round(yearBuiltDiff)} years - assessor may argue the homes compete in different market tiers.`);
  }
  return flags;
}

function analyzeComparableCandidate({
  subject,
  comp,
  subjectProfile,
  compProfile,
  salesByParcelId = null,
  allowBroadClass = false,
  cityStrictGeoMode = true,
  currentDate = new Date(),
  sharedSnapshotMode = false,
}) {
  const subjectId = candidateParcelId(subject);
  const compId = candidateParcelId(comp);
  if (!subject || !comp || !subjectId || !compId || subjectId === compId) return null;
  if (!isResidentialPropClass(subject?.propClass)) return null;
  const classCompatibility = classCompatibilityTier(subject, comp, { allowBroadClass });
  if (classCompatibility.tier === "tier_3_incompatible") return null;
  const compAssessedRaw = asNumber(comp?.assessedValue);
  const compFmvRaw = asNumber(comp?.fullMarketValue);
  const subjectAssessedRaw = asNumber(subject?.assessedValue);
  const subjectFmvRaw = asNumber(subject?.fullMarketValue);
  if (!Number.isFinite(compAssessedRaw) && !Number.isFinite(compFmvRaw)) return null;

  const location = comparableLocationContext(subject, comp, subjectProfile, compProfile);
  const maxDistanceMiles = cityStrictGeoMode ? 2 : 4;
  if (Number.isFinite(location.distanceMiles) && location.distanceMiles > maxDistanceMiles) return null;

  const subjectSqft = asNumber(subjectProfile?.livingArea);
  const compSqft = asNumber(compProfile?.livingArea);
  const livingAreaPctDiff = Number.isFinite(subjectSqft) && subjectSqft > 0 && Number.isFinite(compSqft)
    ? Math.abs(compSqft - subjectSqft) / subjectSqft
    : null;
  if (livingAreaPctDiff != null && livingAreaPctDiff > 0.45) return null;

  const subjectYear = asNumber(subjectProfile?.yearBuilt);
  const compYear = asNumber(compProfile?.yearBuilt);
  const yearBuiltDiff = Number.isFinite(subjectYear) && Number.isFinite(compYear) ? Math.abs(compYear - subjectYear) : null;
  if (yearBuiltDiff != null && yearBuiltDiff > 60) return null;

  const subjectBedrooms = asNumber(subjectProfile?.bedrooms);
  const compBedrooms = asNumber(compProfile?.bedrooms);
  const bedroomDiff = Number.isFinite(subjectBedrooms) && Number.isFinite(compBedrooms) ? Math.abs(compBedrooms - subjectBedrooms) : null;
  if (bedroomDiff != null && bedroomDiff > 2) return null;

  const subjectBaths = asNumber(subjectProfile?.bathCount);
  const compBaths = asNumber(compProfile?.bathCount);
  const bathDiff = Number.isFinite(subjectBaths) && Number.isFinite(compBaths) ? Math.abs(compBaths - subjectBaths) : null;
  if (bathDiff != null && bathDiff > 2.5) return null;

  const locationScore = locationSimilarityScore(location);
  let livingAreaPoints = 0;
  if (livingAreaPctDiff != null) {
    if (livingAreaPctDiff <= 0.05) livingAreaPoints = 18;
    else if (livingAreaPctDiff <= 0.10) livingAreaPoints = 16;
    else if (livingAreaPctDiff <= 0.15) livingAreaPoints = 13;
    else if (livingAreaPctDiff <= 0.25) livingAreaPoints = 9;
    else if (livingAreaPctDiff <= 0.40) livingAreaPoints = 4;
  }

  let yearBuiltPoints = 0;
  if (yearBuiltDiff != null) {
    if (yearBuiltDiff === 0) yearBuiltPoints = 10;
    else if (yearBuiltDiff <= 5) yearBuiltPoints = 9;
    else if (yearBuiltDiff <= 10) yearBuiltPoints = 7;
    else if (yearBuiltDiff <= 20) yearBuiltPoints = 5;
    else if (yearBuiltDiff <= 40) yearBuiltPoints = 2;
  }

  let bedroomPoints = 0;
  if (bedroomDiff != null) {
    if (bedroomDiff === 0) bedroomPoints = 8;
    else if (bedroomDiff === 1) bedroomPoints = 6;
    else if (bedroomDiff === 2) bedroomPoints = 3;
  }

  let bathPoints = 0;
  if (bathDiff != null) {
    if (bathDiff === 0) bathPoints = 8;
    else if (bathDiff === 0.5) bathPoints = 7;
    else if (bathDiff === 1.0) bathPoints = 5;
    else if (bathDiff === 1.5) bathPoints = 2;
    else if (bathDiff <= 2.5) bathPoints = 1;
  }

  const subjectStyle = subjectProfile?.style || "";
  const compStyle = compProfile?.style || "";
  const subjectStyleFamily = subjectProfile?.styleFamily || normalizeStyleFamily(subjectStyle);
  const compStyleFamily = compProfile?.styleFamily || normalizeStyleFamily(compStyle);
  let stylePoints = 0;
  if (subjectStyleFamily && compStyleFamily && subjectStyleFamily === compStyleFamily && subjectStyleFamily !== "unknown") stylePoints = 10;
  else if ((subjectStyle || compStyle) && (subjectStyleFamily === "unknown" || compStyleFamily === "unknown")) stylePoints = 3;

  const fmvPctDiff = comparePctDelta(asNumber(subject?.fullMarketValue), asNumber(comp?.fullMarketValue));
  let fmvAlignmentPoints = 0;
  if (fmvPctDiff != null) {
    if (fmvPctDiff <= 0.05) fmvAlignmentPoints = 4;
    else if (fmvPctDiff <= 0.10) fmvAlignmentPoints = 3;
    else if (fmvPctDiff <= 0.20) fmvAlignmentPoints = 2;
    else if (fmvPctDiff <= 0.35) fmvAlignmentPoints = 1;
  }

  const usablePhysicalFields = [];
  if (subjectSqft != null && compSqft != null) usablePhysicalFields.push("Living area");
  if (subjectYear != null && compYear != null) usablePhysicalFields.push("Year built");
  if (subjectBedrooms != null && compBedrooms != null) usablePhysicalFields.push("Bedrooms");
  if (subjectBaths != null && compBaths != null) usablePhysicalFields.push("Baths");
  if (subjectStyleFamily !== "unknown" && compStyleFamily !== "unknown" && subjectStyleFamily && compStyleFamily) usablePhysicalFields.push("Style");
  const usablePhysicalFieldCount = usablePhysicalFields.length;
  const confidenceNotes = [];
  const disqualifyingConcerns = [];
  let qualityPenalty = 0;
  if (usablePhysicalFieldCount < 2) qualityPenalty -= 20;
  else if (usablePhysicalFieldCount < 3) qualityPenalty -= 12;
  if (subjectSqft == null || compSqft == null) {
    qualityPenalty -= 6;
    confidenceNotes.push("Living area is missing on one side.");
  }
  if (subjectYear == null || compYear == null) {
    qualityPenalty -= 3;
    confidenceNotes.push("Year built is missing on one side.");
  }
  if ((subjectBedrooms == null && subjectBaths == null) || (compBedrooms == null && compBaths == null)) qualityPenalty -= 5;
  const missingHardChecks = [livingAreaPctDiff == null, yearBuiltDiff == null, bedroomDiff == null, bathDiff == null].filter(Boolean).length;
  if (missingHardChecks >= 2 && usablePhysicalFieldCount < 2) qualityPenalty -= 8;
  if (!location.sameNeighborhood && Number.isFinite(location.distanceMiles) && location.distanceMiles > 1.0) qualityPenalty -= 8;

  const qualityScore = clampNumber(Math.round(
    classCompatibility.score +
    locationScore +
    livingAreaPoints +
    yearBuiltPoints +
    bedroomPoints +
    bathPoints +
    stylePoints +
    fmvAlignmentPoints +
    qualityPenalty
  ), 0, 100);

  let confidenceScore = 100;
  if (subjectSqft == null || compSqft == null) confidenceScore -= 18;
  if (!Number.isFinite(subjectAssessedRaw) || !Number.isFinite(compAssessedRaw)) {
    confidenceScore -= 12;
    confidenceNotes.push("Assessed value is missing on one side.");
  }
  if (!Number.isFinite(subjectFmvRaw) || !Number.isFinite(compFmvRaw)) confidenceScore -= 8;
  if (subjectYear == null || compYear == null) confidenceScore -= 8;
  if (subjectBedrooms == null || compBedrooms == null) confidenceScore -= 6;
  if (asNumber(subjectProfile?.fullBaths) == null || asNumber(compProfile?.fullBaths) == null) confidenceScore -= 6;
  if (subjectStyleFamily === "unknown" || compStyleFamily === "unknown") {
    confidenceScore -= 5;
    confidenceNotes.push("Style normalization is uncertain.");
  }
  if (location.distanceMiles == null) {
    confidenceScore -= 5;
    confidenceNotes.push("Distance could not be calculated from parcel coordinates.");
  }
  if (usablePhysicalFieldCount < 3) confidenceScore -= 10;
  confidenceScore = clampNumber(Math.round(confidenceScore), 0, 100);
  const confidenceLabel = confidenceScore >= 80 ? "high" : confidenceScore >= 60 ? "medium" : "low";

  if (classCompatibility.tier !== "tier_0_exact") disqualifyingConcerns.push(classCompatibility.label + ".");
  if (Number.isFinite(location.distanceMiles) && location.distanceMiles > 1) disqualifyingConcerns.push(`Comp is ${location.distanceMiles.toFixed(2)} miles away.`);
  if (livingAreaPctDiff != null && livingAreaPctDiff > 0.25) disqualifyingConcerns.push("Living area gap is wider than ideal.");
  if (yearBuiltDiff != null && yearBuiltDiff > 20) disqualifyingConcerns.push("Year-built gap is wider than ideal.");
  if (!location.sameNeighborhood && Number.isFinite(location.distanceMiles) && location.distanceMiles > 1.0) disqualifyingConcerns.push("Outside the subject neighborhood and more than 1 mile away.");
  if (confidenceLabel === "low") disqualifyingConcerns.push("Data confidence is low.");

  const subjectAv = subjectAssessedRaw;
  const compAv = compAssessedRaw;
  const subjectFmv = subjectFmvRaw;
  const compFmv = compFmvRaw;
  const subjectEquityRatio = asNumber(subjectProfile?.equityRatio) ?? safeDivide(subjectAv, subjectFmv);
  const compEquityRatio = asNumber(compProfile?.equityRatio) ?? safeDivide(compAv, compFmv);
  const subjectAvPerSqft = asNumber(subjectProfile?.assessedPerSqft) ?? safeDivide(subjectAv, subjectSqft);
  const compAvPerSqft = asNumber(compProfile?.assessedPerSqft) ?? safeDivide(compAv, compSqft);

  const avPctDiff = Number.isFinite(subjectAv) && Number.isFinite(compAv) && Math.max(subjectAv, compAv) > 0
    ? (subjectAv - compAv) / Math.max(subjectAv, compAv)
    : null;
  let rawAvContribution = 0;
  if (avPctDiff != null) {
    if (avPctDiff >= 0.15) rawAvContribution = 25;
    else if (avPctDiff >= 0.08) rawAvContribution = 18;
    else if (avPctDiff >= 0.03) rawAvContribution = 10;
    else if (avPctDiff > 0) rawAvContribution = 3;
    else if (avPctDiff <= -0.08) rawAvContribution = -18;
    else if (avPctDiff <= -0.03) rawAvContribution = -10;
    else rawAvContribution = -4;
  }
  let sizeDirectionModifier = 1;
  const sizeRatio = Number.isFinite(compSqft) && Number.isFinite(subjectSqft) && subjectSqft > 0 ? compSqft / subjectSqft : null;
  if (Number.isFinite(avPctDiff) && avPctDiff > 0 && Number.isFinite(sizeRatio)) {
    if (sizeRatio > 1.05) sizeDirectionModifier = 1.35;
    else if (sizeRatio < 0.95) sizeDirectionModifier = 0.60;
  }
  rawAvContribution *= sizeDirectionModifier;

  const avPerSqftPctDiff = Number.isFinite(subjectAvPerSqft) && Number.isFinite(compAvPerSqft) && compAvPerSqft > 0
    ? (subjectAvPerSqft - compAvPerSqft) / compAvPerSqft
    : null;
  let avPerSqftContribution = 0;
  if (avPerSqftPctDiff != null) {
    if (avPerSqftPctDiff >= 0.12) avPerSqftContribution = 20;
    else if (avPerSqftPctDiff >= 0.06) avPerSqftContribution = 12;
    else if (avPerSqftPctDiff >= 0.02) avPerSqftContribution = 6;
    else if (avPerSqftPctDiff <= -0.02) avPerSqftContribution = -8;
  }

  const equityRatioDiff = Number.isFinite(subjectEquityRatio) && Number.isFinite(compEquityRatio)
    ? subjectEquityRatio - compEquityRatio
    : null;
  const equityRatioDeltaPoints = equityRatioDiff != null ? equityRatioDiff * 100 : null;
  let equityContribution = 0;
  if (equityRatioDeltaPoints != null) {
    if (equityRatioDeltaPoints >= 6) equityContribution = 18;
    else if (equityRatioDeltaPoints >= 3) equityContribution = 10;
    else if (equityRatioDeltaPoints >= 1) equityContribution = 4;
    else if (equityRatioDeltaPoints <= -1) equityContribution = -8;
  }

  const saleEvidence = recentCompSaleEvidence(subject, comp, salesByParcelId, currentDate);
  const perSqftTied = Number.isFinite(avPerSqftPctDiff) && Math.abs(avPerSqftPctDiff) < 0.02;
  const equityTied = Number.isFinite(equityRatioDeltaPoints) && Math.abs(equityRatioDeltaPoints) < 1;
  const normalizationPenalty = Number.isFinite(avPctDiff) && avPctDiff > 0 && perSqftTied && equityTied ? -8 : 0;
  const smallRawAdvantagePenalty = Number.isFinite(avPctDiff) && avPctDiff > 0 && avPctDiff < 0.03 ? -3 : 0;
  const weakConfidencePenalty = !sharedSnapshotMode && confidenceScore < 60 ? -8 : 0;
  const weakQualityPenalty = !sharedSnapshotMode && qualityScore < 55 ? -10 : 0;
  const grievanceSupport = clampNumber(Math.round(
    rawAvContribution +
    avPerSqftContribution +
    equityContribution +
    saleEvidence.points +
    normalizationPenalty +
    smallRawAdvantagePenalty +
    weakConfidencePenalty +
    weakQualityPenalty
  ), -100, 100);
  const supportLabel = supportKindForScore(grievanceSupport);
  const marginalSupport = Number.isFinite(compAv) && Number.isFinite(subjectAv) ? compAv > subjectAv * 0.93 : false;
  if (marginalSupport) disqualifyingConcerns.push("Small assessed value gap may disappear after adjustments.");

  const reasons = [classCompatibility.label];
  if (location.sameNeighborhood && Number.isFinite(location.distanceMiles)) reasons.push(`Same neighborhood within ${location.distanceMiles.toFixed(2)} mi`);
  else if (location.sameNeighborhood) reasons.push("Same neighborhood");
  else if (location.sameStreet) reasons.push("Same street");
  else if (location.sameZip && Number.isFinite(location.distanceMiles)) reasons.push(`Same ZIP within ${location.distanceMiles.toFixed(2)} mi`);
  else if (location.sameZip) reasons.push("Same ZIP");
  else if (Number.isFinite(location.distanceMiles)) reasons.push(`Within ${location.distanceMiles.toFixed(2)} mi`);
  if (livingAreaPctDiff != null) reasons.push(`Living area within ${Math.round(livingAreaPctDiff * 100)}%`);
  if (yearBuiltDiff != null) reasons.push(yearBuiltDiff === 0 ? `Same year built (${compYear})` : `Year built within ${Math.round(yearBuiltDiff)} years`);
  if (bedroomDiff != null) reasons.push(bedroomDiff === 0 ? "Same bedroom count" : `Bedroom count within ${Math.round(bedroomDiff)}`);
  if (bathDiff != null) reasons.push(bathDiff === 0 ? "Same bath count" : `Bath count within ${roundNumber(bathDiff, 1)}`);
  if (subjectStyleFamily === compStyleFamily && subjectStyleFamily !== "unknown") reasons.push(`Same style family (${subjectStyleFamily.replace(/_/g, " ")})`);
  if (fmvPctDiff != null && fmvPctDiff <= 0.35) reasons.push(`Market value within ${Math.round(fmvPctDiff * 100)}%`);

  const normalizedMetricsSummary = {
    assessedPctAdvantage: avPctDiff,
    assessedPerSqftAdvantagePct: avPerSqftPctDiff,
    equityRatioDeltaPoints,
    rawAvContribution: roundNumber(rawAvContribution, 1),
    sizeDirectionModifier: roundNumber(sizeDirectionModifier, 2),
    avPerSqftContribution,
    equityContribution,
    saleEvidenceContribution: saleEvidence.points,
    normalizationPenalty,
    smallRawAdvantagePenalty,
    weakConfidencePenalty,
    weakQualityPenalty,
    tiedNormalizedMetrics: perSqftTied && equityTied,
    supportScore: grievanceSupport,
  };

  const riskFlags = computeRiskFlags({
    subject,
    comp,
    subjectProfile,
    compProfile,
    confidenceScore,
    livingAreaPctDiff,
    yearBuiltDiff,
    saleEvidence,
  });

  return {
    classCompatibility,
    location,
    qualityScore,
    confidenceScore,
    confidenceLabel,
    grievanceSupport,
    supportLabel,
    supportBadge: supportBadgeForKind(supportLabel),
    marginalSupport,
    normalizedMetricsSummary,
    saleEvidence,
    riskFlags,
    reasons,
    signals: usablePhysicalFields.slice(),
    physicalFieldsUsed: usablePhysicalFields.slice(),
    confidenceNotes,
    disqualifyingConcerns,
    livingAreaPctDiff,
    yearBuiltDiff,
    bedroomDiff,
    bathDiff,
    fmvPctDiff,
  };
}

function comparableDominates(a, b) {
  if (!a || !b) return false;
  const qualityA = candidateQualityValue(a) || 0;
  const qualityB = candidateQualityValue(b) || 0;
  const confidenceA = candidateConfidenceValue(a) || 0;
  const confidenceB = candidateConfidenceValue(b) || 0;
  const supportA = candidateSupportValue(a) || 0;
  const supportB = candidateSupportValue(b) || 0;
  return qualityA >= qualityB && confidenceA >= confidenceB && supportA >= supportB && (qualityA > qualityB || confidenceA > confidenceB || supportA > supportB);
}

function selectedStreetCount(selected, streetKey) {
  if (!streetKey) return 0;
  return selected.filter(comp => candidateStreetKey(comp) === streetKey).length;
}

function sameAreaAsCandidate(a, b) {
  return candidateStreetKey(a) === candidateStreetKey(b) || candidateNeighborhood(a) === candidateNeighborhood(b);
}

function sortVisibleComparableCandidates(candidates = []) {
  return candidates.slice().sort((a, b) =>
    (candidateQualityValue(b) - candidateQualityValue(a)) ||
    (candidateConfidenceValue(b) - candidateConfidenceValue(a)) ||
    ((candidateDistance(a) ?? 999) - (candidateDistance(b) ?? 999)) ||
    ((asNumber(a?._fmvPctDiff ?? a?.fmvPctDiff) ?? 999) - (asNumber(b?._fmvPctDiff ?? b?.fmvPctDiff) ?? 999))
  );
}

function sortGrievanceCandidatePool(candidates = []) {
  return candidates.slice().sort((a, b) =>
    (candidateSupportValue(b) - candidateSupportValue(a)) ||
    (candidateQualityValue(b) - candidateQualityValue(a)) ||
    (candidateConfidenceValue(b) - candidateConfidenceValue(a)) ||
    ((candidateDistance(a) ?? 999) - (candidateDistance(b) ?? 999))
  );
}

function packageAverageSupport(selected) {
  return meanValue((selected || []).map(candidateSupportValue)) || 0;
}

function supportsLivingAreaBracket(selected, subjectLivingArea) {
  if (!Number.isFinite(subjectLivingArea)) return true;
  const values = selected.map(candidateLivingArea).filter(Number.isFinite);
  return values.some(value => value < subjectLivingArea) && values.some(value => value > subjectLivingArea);
}

function supportsYearBracket(selected, subjectYearBuilt) {
  if (!Number.isFinite(subjectYearBuilt)) return true;
  const values = selected.map(candidateYearBuilt).filter(Number.isFinite);
  return values.some(value => value < subjectYearBuilt) && values.some(value => value > subjectYearBuilt);
}

function completeBracket(currentSelected, candidate, subjectValue, valueGetter) {
  if (!Number.isFinite(subjectValue)) return false;
  const values = currentSelected.map(valueGetter).filter(Number.isFinite);
  const candidateValue = valueGetter(candidate);
  if (!Number.isFinite(candidateValue)) return false;
  const hasLower = values.some(value => value < subjectValue) || candidateValue < subjectValue;
  const hasHigher = values.some(value => value > subjectValue) || candidateValue > subjectValue;
  return hasLower && hasHigher;
}

function applyBracketSwap(selected, eligiblePool, decisionById, subjectProfile) {
  const livingArea = asNumber(subjectProfile?.livingArea);
  const yearBuilt = asNumber(subjectProfile?.yearBuilt);
  const selectedIds = new Set(selected.map(candidateParcelId).filter(Boolean));
  const baseAverage = packageAverageSupport(selected);

  const trySwap = (valueGetter, subjectValue, replacementReason) => {
    if (!Number.isFinite(subjectValue)) return;
    const bracketed = valueGetter === candidateLivingArea
      ? supportsLivingAreaBracket(selected, subjectValue)
      : supportsYearBracket(selected, subjectValue);
    if (bracketed) return;
    const candidates = eligiblePool.filter(candidate => {
      const id = candidateParcelId(candidate);
      if (!id || selectedIds.has(id)) return false;
      if ((candidateSupportValue(candidate) || 0) <= 0) return false;
      return completeBracket(selected, candidate, subjectValue, valueGetter);
    });
    for (const candidate of candidates) {
      const replacementIndex = selected.findIndex(current => sameAreaAsCandidate(candidate, current) && (candidateSupportValue(current) || 0) < 25);
      if (replacementIndex < 0) continue;
      const updated = selected.slice();
      updated.splice(replacementIndex, 1, candidate);
      if (baseAverage > 0 && packageAverageSupport(updated) < (baseAverage * 0.8)) continue;
      const replaced = selected[replacementIndex];
      const candidateId = candidateParcelId(candidate);
      const replacedId = candidateParcelId(replaced);
      selected.splice(replacementIndex, 1, candidate);
      selectedIds.delete(replacedId);
      selectedIds.add(candidateId);
      if (replacedId) decisionById.set(replacedId, buildPackageDecisionRecord("excluded", replacementReason, candidateKindValue(replaced)));
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("included", "included_replacement", candidateKindValue(candidate)));
      return;
    }
  };

  trySwap(candidateLivingArea, livingArea, "replaced_by_bracket_living_area");
  trySwap(candidateYearBuilt, yearBuilt, "replaced_by_bracket_year");
}

function selectGrievancePackage(candidatePool = [], subjectProfile = null) {
  const eligible = sortGrievanceCandidatePool(candidatePool);
  const strongOrModerate = eligible.filter(comp => (candidateSupportValue(comp) || 0) >= 12);
  const weakEligible = eligible.filter(comp => {
    const support = candidateSupportValue(comp) || 0;
    return support > 0 && support < 12;
  });
  const targetCount = strongOrModerate.length >= 3
    ? Math.min(5, strongOrModerate.length)
    : Math.min(5, strongOrModerate.length + Math.min(2, weakEligible.length));

  const pool = strongOrModerate.length >= 3 ? eligible : eligible.filter(comp => {
    const support = candidateSupportValue(comp) || 0;
    return support >= 12 || (support > 0 && support < 12);
  });

  const selected = [];
  const decisionById = new Map();

  for (const candidate of pool) {
    const candidateId = candidateParcelId(candidate);
    const candidateKind = candidateKindValue(candidate);
    const streetKey = candidateStreetKey(candidate);
    if (selected.length >= targetCount) {
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("excluded", "package_limit", candidateKind));
      continue;
    }
    if (selectedStreetCount(selected, streetKey) >= 2) {
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("excluded", "same_street_cap", candidateKind));
      continue;
    }
    const dominatedBySelected = candidateKind !== "strong_support" && selected.some(other => comparableDominates(other, candidate) && sameAreaAsCandidate(other, candidate));
    if (dominatedBySelected) {
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("excluded", "dominated_similar", candidateKind));
      continue;
    }
    const selectedAssessed = selected.map(candidateAssessedValue).filter(Number.isFinite);
    if (selectedAssessed.length >= 2 && Number.isFinite(candidateAssessedValue(candidate))) {
      const medianAssessed = medianValue(selectedAssessed);
      if (Number.isFinite(medianAssessed) && candidateAssessedValue(candidate) < (medianAssessed * 0.8)) {
        if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("excluded", "assessed_outlier", candidateKind));
        continue;
      }
    }
    const replaceIndex = candidateKind !== "strong_support"
      ? selected.findIndex(other => candidateStreetKey(other) === streetKey && comparableDominates(candidate, other))
      : -1;
    const corroboratingStrong = candidateKind === "strong_support" && selected.some(other => candidateKindValue(other) === "strong_support" && sameAreaAsCandidate(other, candidate));
    if (replaceIndex >= 0) {
      const replaced = selected[replaceIndex];
      const replacedId = candidateParcelId(replaced);
      selected.splice(replaceIndex, 1, candidate);
      if (replacedId) decisionById.set(replacedId, buildPackageDecisionRecord("excluded", "replaced_by_stronger_same_street", candidateKindValue(replaced)));
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("included", "included_replacement", candidateKind));
    } else {
      selected.push(candidate);
      if (candidateId) decisionById.set(candidateId, buildPackageDecisionRecord("included", corroboratingStrong ? "included_strong_corroboration" : "included_default", candidateKind));
    }
  }

  applyBracketSwap(selected, eligible, decisionById, subjectProfile);
  return { selected, decisionById, targetCount, eligible };
}

function annotateComparablePackageDecisions(visibleComps = [], grievanceCandidatePool = [], decisionById = new Map()) {
  const selectedIdSet = new Set();
  for (const [id, decision] of decisionById.entries()) {
    if (decision?.status === "included") selectedIdSet.add(id);
  }
  const gatePoolIdSet = new Set((grievanceCandidatePool || []).map(candidateParcelId).filter(Boolean));
  return (visibleComps || []).map(comp => {
    const id = candidateParcelId(comp);
    const decision = (id && decisionById.get(id)) || (!gatePoolIdSet.has(id)
      ? buildPackageDecisionRecord(
        selectedIdSet.has(id) ? "included" : "excluded",
        candidateSupportValue(comp) <= 0 ? "support_gate" : candidateConfidenceValue(comp) < 60 ? "confidence_gate" : candidateQualityValue(comp) < 50 ? "quality_gate" : "package_limit",
        candidateKindValue(comp)
      )
      : buildPackageDecisionRecord(selectedIdSet.has(id) ? "included" : "excluded", selectedIdSet.has(id) ? "included_default" : "package_limit", candidateKindValue(comp)));
    comp._packageDecision = decision;
    comp.packageDecision = decision;
    const selectionIndicator = buildSelectionIndicatorRecord(comp, decision);
    comp._selectionIndicator = selectionIndicator;
    comp.selectionIndicator = selectionIndicator;
    return comp;
  });
}

function weightedMedian(entries) {
  const filtered = (Array.isArray(entries) ? entries : [])
    .filter(entry => Number.isFinite(entry?.value) && Number.isFinite(entry?.weight) && entry.weight > 0)
    .sort((a, b) => a.value - b.value);
  if (!filtered.length) return null;
  const total = filtered.reduce((sum, entry) => sum + entry.weight, 0);
  let running = 0;
  for (const entry of filtered) {
    running += entry.weight;
    if (running >= total / 2) return Math.round(entry.value);
  }
  return Math.round(filtered[filtered.length - 1].value);
}

function summarizeNormalizedMetricSupport(selectedComps = []) {
  const comps = (Array.isArray(selectedComps) ? selectedComps : []).filter(Boolean);
  if (!comps.length) return { score: 0, label: "neutral", detail: "Normalized metrics are not available because no grievance comps are selected." };
  const supportive = comps.filter(comp => {
    const metrics = candidateNormalizedSummary(comp);
    return (asNumber(metrics.equityRatioDeltaPoints) || 0) >= 1 || (asNumber(metrics.assessedPerSqftAdvantagePct) || 0) >= 0.02;
  }).length;
  const tied = comps.filter(comp => {
    const metrics = candidateNormalizedSummary(comp);
    return Math.abs(asNumber(metrics.equityRatioDeltaPoints) || 0) < 1 && Math.abs(asNumber(metrics.assessedPerSqftAdvantagePct) || 0) < 0.02;
  }).length;
  if (supportive === comps.length) {
    return { score: 15, label: "supportive", detail: "Normalized metrics support the grievance across the selected package." };
  }
  if (supportive >= Math.max(1, Math.ceil(comps.length / 2))) {
    return { score: 8, label: "mixed_supportive", detail: "Normalized metrics are mixed, but they lean supportive overall." };
  }
  if (tied === comps.length) {
    return { score: 0, label: "neutral", detail: "Normalized metrics are broadly neutral across the selected comps." };
  }
  return { score: 0, label: "mixed", detail: "Normalized metrics are mixed and do not consistently support the grievance." };
}

function computeOvervaluationFlag(subject, equalizationRate) {
  const av = asNumber(subject?.assessedValue);
  const fmv = asNumber(subject?.fullMarketValue);
  const rate = asNumber(equalizationRate);
  if (!Number.isFinite(av) || !Number.isFinite(fmv) || !Number.isFinite(rate) || rate <= 0) return null;
  const expectedAssessedValue = fmv * rate;
  return {
    active: av > expectedAssessedValue,
    equalizationRate: rate,
    expectedAssessedValue: Math.round(expectedAssessedValue),
    overvaluationExcess: Math.max(Math.round(av - expectedAssessedValue), 0),
    message: av > expectedAssessedValue
      ? `The separate overassessment check is positive. Your assessed value is above the expected assessed value implied by the municipal equalization rate of ${(rate * 100).toFixed(1)}%.`
      : "The separate overassessment check does not show an overvaluation signal from the municipal equalization rate.",
  };
}

function computeClaimRecommendation(selectedComps, overvaluationFlag) {
  const equityRatios = (Array.isArray(selectedComps) ? selectedComps : []).map(candidateEquityRatio).filter(Number.isFinite);
  if (!equityRatios.length) {
    if (overvaluationFlag?.active) {
      return {
        code: "EXCESSIVE",
        label: "Excessive Assessment",
        selectionLabel: 'Check "Excessive assessment"',
        reason: "No selected grievance comps are available, but the equalization-rate benchmark still points to overvaluation.",
        variance: null,
      };
    }
    return {
      code: "MANUAL_REVIEW",
      label: "Manual Review Needed",
      selectionLabel: "Review RP-524 Part Three manually before choosing a complaint reason",
      reason: "No selected grievance comps are available to distinguish unequal assessment from excessive assessment.",
      variance: null,
    };
  }
  const variance = equityRatios.length ? (Math.max(...equityRatios) - Math.min(...equityRatios)) * 100 : null;
  if (Number.isFinite(variance) && variance < 1.0) {
    return {
      code: "EXCESSIVE",
      label: "Excessive Assessment",
      selectionLabel: 'Check "Excessive assessment"',
      reason: `Equity ratios are nearly uniform across the selected comps (variance ${variance.toFixed(1)} points), so unequal assessment is structurally weak for this roll.`,
      variance,
    };
  }
  if (overvaluationFlag?.active && Number.isFinite(variance) && variance < 2.0) {
    return {
      code: "EXCESSIVE_PRIMARY",
      label: "Excessive Assessment (Primary)",
      selectionLabel: 'Check "Excessive assessment" first; unequal assessment is secondary',
      reason: `Both overvaluation and some unequal-assessment evidence are present, but excessive assessment is stronger because equity-ratio variance is only ${variance.toFixed(1)} points.`,
      variance,
    };
  }
  return {
    code: "UNEQUAL",
    label: "Unequal Assessment",
    selectionLabel: 'Check "Unequal assessment"',
    reason: Number.isFinite(variance)
      ? `Comparable equity ratios show meaningful variation (${variance.toFixed(1)} points), so unequal assessment is the stronger primary argument.`
      : "Comparable equity ratios show enough variation to support unequal assessment as the stronger primary argument.",
    variance,
  };
}

function computeResearchClaimRecommendation(visibleComps, overvaluationFlag, marketSaleModel, neighborhoodEquityModel) {
  const variance = visibleEquityVariance(visibleComps);
  const signalSummary = summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, neighborhoodEquityModel);
  if (Number.isFinite(variance) && variance < 1.0 && signalSummary) {
    return {
      code: "EXCESSIVE",
      label: "Excessive Assessment",
      selectionLabel: 'Check "Excessive assessment"',
      reason: `Visible comps look physically similar, but their equity ratios are tightly clustered (variance ${variance.toFixed(1)} points), so unequal assessment is weak here. The remaining support leans more toward excessive assessment because ${signalSummary}.`,
      variance,
    };
  }
  if (overvaluationFlag?.active) {
    return {
      code: "EXCESSIVE",
      label: "Excessive Assessment",
      selectionLabel: 'Check "Excessive assessment"',
      reason: "Comparable homes were found, but none supported a grievance after normalization. The clearest remaining signal is the independent overvaluation benchmark.",
      variance,
    };
  }
  return {
    code: "MANUAL_REVIEW",
    label: "Manual Review Needed",
    selectionLabel: "Review RP-524 Part Three manually before choosing a complaint reason",
    reason: "Comparable homes were found, but none supported a grievance after normalization. The current evidence does not clearly establish unequal assessment or excessive assessment from the comparable package alone.",
    variance,
  };
}

function computeSubjectSaleSignal(subject, salesByParcelId, currentDate) {
  const sales = getParcelSales(subject, salesByParcelId);
  const latestSale = sales[0] || null;
  const armLengthSale = sales.find(sale => isArmLengthSale(sale) && Number(sale?.sale_price) > 0) || null;
  if (!armLengthSale || !isRecentArmsLengthSale(armLengthSale, currentDate, 3)) {
    return {
      status: "none",
      sale: armLengthSale,
      latestSale,
      note: latestSale && armLengthSale && latestSale !== armLengthSale
        ? "$/sq ft data uses the most recent arm's-length sale rather than the most recent transfer."
        : "",
    };
  }
  const ratio = safeDivide(asNumber(armLengthSale?.sale_price), asNumber(subject?.fullMarketValue));
  if (!Number.isFinite(ratio)) return { status: "neutral", sale: armLengthSale, latestSale, ratio: null, note: "" };
  if (ratio <= 0.90) {
    return { status: "supports", sale: armLengthSale, latestSale, ratio, note: "Your recent arm's-length sale price is materially below the current FMV estimate." };
  }
  if (ratio >= 1.05) {
    return { status: "weakens", sale: armLengthSale, latestSale, ratio, note: "Your recent arm's-length sale price is at or above the current FMV estimate." };
  }
  return { status: "neutral", sale: armLengthSale, latestSale, ratio, note: "" };
}

function computeMarketSaleModel({ subject, subjectProfile, parcels = [], salesByParcelId = null, currentDate = new Date() }) {
  if (!(salesByParcelId instanceof Map) || !subject) return null;
  const subjectSqft = asNumber(subjectProfile?.livingArea);
  const subjectYear = asNumber(subjectProfile?.yearBuilt);
  const collectEligible = radius => {
    const values = [];
    for (const parcel of parcels || []) {
      if (!parcel || candidateParcelId(parcel) === candidateParcelId(subject)) continue;
      const distance = parcelDistanceMiles(subject, parcel);
      if (!Number.isFinite(distance) || distance > radius) continue;
      const livingArea = candidateLivingArea(parcel);
      const yearBuilt = candidateYearBuilt(parcel);
      if (Number.isFinite(subjectSqft) && Number.isFinite(livingArea)) {
        const pctDiff = Math.abs(livingArea - subjectSqft) / subjectSqft;
        if (pctDiff > 0.20) continue;
      }
      if (Number.isFinite(subjectYear) && Number.isFinite(yearBuilt) && Math.abs(yearBuilt - subjectYear) > 25) continue;
      const sales = getParcelSales(parcel, salesByParcelId).filter(sale => isRecentArmsLengthSale(sale, currentDate, 3));
      for (const sale of sales) {
        const salePrice = asNumber(sale?.sale_price);
        if (!Number.isFinite(salePrice) || salePrice <= 0 || !Number.isFinite(livingArea) || livingArea <= 0) continue;
        values.push({ parcel, sale, distance, salePricePerSqft: salePrice / livingArea });
      }
    }
    return values;
  };
  let eligibleSales = collectEligible(1.0);
  let expanded = false;
  if (eligibleSales.length < 3) {
    eligibleSales = collectEligible(1.5);
    expanded = true;
  }
  if (eligibleSales.length < 3 || !Number.isFinite(subjectSqft)) {
    return {
      available: false,
      saleCount: eligibleSales.length,
      expandedRadius: expanded,
      note: "Insufficient recent sales for market estimate.",
      fallbackPricePerSqft: Number.isFinite(asNumber(subject?.fullMarketValue)) && Number.isFinite(subjectSqft) && subjectSqft > 0
        ? asNumber(subject?.fullMarketValue) / subjectSqft
        : null,
    };
  }
  const neighborhoodMedianPpsf = medianValue(eligibleSales.map(entry => entry.salePricePerSqft));
  const estimatedSubjectFmv = Number.isFinite(neighborhoodMedianPpsf) ? Math.round(neighborhoodMedianPpsf * subjectSqft) : null;
  const impliedDifference = Number.isFinite(asNumber(subject?.assessedValue)) && Number.isFinite(estimatedSubjectFmv)
    ? Math.round(asNumber(subject.assessedValue) - estimatedSubjectFmv)
    : null;
  const impliedDifferencePct = Number.isFinite(impliedDifference) && Number.isFinite(estimatedSubjectFmv) && estimatedSubjectFmv > 0
    ? impliedDifference / estimatedSubjectFmv
    : null;
  return {
    available: true,
    saleCount: eligibleSales.length,
    expandedRadius: expanded,
    neighborhoodMedianPpsf,
    estimatedSubjectFmv,
    impliedDifference,
    impliedDifferencePct,
    eligibleSales,
    note: expanded ? "Radius expanded to 1.5 miles to reach the minimum sale sample." : "",
  };
}

function computeNeighborhoodEquityModel({ subject, subjectProfile, parcels = [], salesByParcelId = null, currentDate = new Date() }) {
  if (!(salesByParcelId instanceof Map) || !subject) return null;
  const subjectNeighborhood = parcelNeighborhoodName(subject, subjectProfile);
  const subjectZip = subjectProfile?.zipCode || subject?.zip || "";
  const subjectFamily = residentialFamilyForClass(subject?.propClass, subject?.propClassDesc || "");
  const collectRatios = mode => {
    const ratios = [];
    for (const parcel of parcels || []) {
      if (!parcel || !isResidentialPropClass(parcel?.propClass)) continue;
      const sameArea = mode === "neighborhood"
        ? parcelNeighborhoodName(parcel, parcel?._compProfile) === subjectNeighborhood
        : (parcel?.zip || "") === subjectZip;
      if (!sameArea) continue;
      if (residentialFamilyForClass(parcel?.propClass, parcel?.propClassDesc || "") !== subjectFamily) continue;
      const sales = getParcelSales(parcel, salesByParcelId).filter(sale => isRecentArmsLengthSale(sale, currentDate, 3));
      const av = asNumber(parcel?.assessedValue);
      for (const sale of sales) {
        const salePrice = asNumber(sale?.sale_price);
        if (!Number.isFinite(av) || !Number.isFinite(salePrice) || salePrice <= 0) continue;
        ratios.push(av / salePrice);
      }
    }
    return ratios;
  };
  let scope = "neighborhood";
  let ratios = collectRatios("neighborhood");
  if (ratios.length < 5) {
    scope = "zip";
    ratios = collectRatios("zip");
  }
  if (ratios.length < 5) {
    return { available: false, sampleSize: ratios.length, scope, note: "Insufficient sales data for neighborhood equity analysis." };
  }
  const medianRatio = medianValue(ratios);
  const absoluteDeviations = ratios.map(value => Math.abs(value - medianRatio));
  const cod = Number.isFinite(medianRatio) && medianRatio !== 0 ? (medianValue(absoluteDeviations) / medianRatio) * 100 : null;
  const subjectRatio = safeDivide(asNumber(subject?.assessedValue), asNumber(subject?.fullMarketValue));
  const subjectPercentile = percentileRankValue(subjectRatio, ratios);
  return {
    available: true,
    sampleSize: ratios.length,
    scope,
    medianRatio,
    subjectRatio,
    subjectPercentile,
    cod,
    codWarning: Number.isFinite(cod) && cod > 15 ? `Systemic assessment inconsistency detected. COD ${cod.toFixed(1)} exceeds the IAAO single-family standard of 15.0.` : "",
    iaaoStandard: 15,
  };
}

function computeSuggestedRequestedValue({ subject, selectedComps = [] }) {
  const eligible = (Array.isArray(selectedComps) ? selectedComps : []).filter(comp =>
    (candidateQualityValue(comp) || 0) >= 60 &&
    (candidateConfidenceValue(comp) || 0) >= 70 &&
    (candidateSupportValue(comp) || 0) >= 12 &&
    Number.isFinite(candidateAssessedValue(comp)) &&
    !comp?._marginalSupport && !comp?.marginalSupport
  );
  if (eligible.length < 2) {
    return {
      value: null,
      method: "manual_review",
      reviewManually: true,
      note: eligible.length === 1
        ? "Only one comp qualifies for the suggested value calculation, so manual review is required."
        : "Fewer than two comps qualify for the suggested value calculation, so manual review is required.",
      eligibleCount: eligible.length,
      methodA: null,
      methodB: null,
      scarWarning: null,
    };
  }
  const assessedValues = eligible.map(candidateAssessedValue).filter(Number.isFinite);
  const medianAssessed = medianValue(assessedValues);
  const spread = Number.isFinite(medianAssessed) && medianAssessed > 0
    ? (Math.max(...assessedValues) - Math.min(...assessedValues)) / medianAssessed
    : 0;
  const allEquityTied = eligible.every(comp => Math.abs(asNumber(candidateNormalizedSummary(comp).equityRatioDeltaPoints) || 0) < 1.0);
  if (spread > 0.20 || allEquityTied) {
    return {
      value: null,
      method: "manual_review",
      reviewManually: true,
      note: spread > 0.20
        ? "Qualifying comp assessed values are spread more than 20%, so manual review is required."
        : "All qualifying comps have equity ratios within 1 point of the subject, so manual review is required.",
      eligibleCount: eligible.length,
      methodA: null,
      methodB: null,
      scarWarning: null,
    };
  }
  const weightedEntries = eligible.map(comp => ({
    value: candidateAssessedValue(comp),
    weight: ((candidateQualityValue(comp) || 0) * 0.35) + ((candidateSupportValue(comp) || 0) * 0.40) + ((candidateConfidenceValue(comp) || 0) * 0.25),
  }));
  let methodA = null;
  if (eligible.length === 2) {
    const totalWeight = weightedEntries.reduce((sum, entry) => sum + entry.weight, 0);
    const weightedAverage = totalWeight > 0
      ? weightedEntries.reduce((sum, entry) => sum + (entry.value * entry.weight), 0) / totalWeight
      : meanValue(weightedEntries.map(entry => entry.value));
    const simpleMidpoint = (weightedEntries[0].value + weightedEntries[1].value) / 2;
    methodA = Math.round(Math.min(weightedAverage, simpleMidpoint));
  } else {
    methodA = weightedMedian(weightedEntries);
  }
  const subjectFmv = asNumber(subject?.fullMarketValue);
  const equityRatios = eligible.map(candidateEquityRatio).filter(Number.isFinite);
  const medianCompEquityRatio = medianValue(equityRatios);
  const methodB = Number.isFinite(subjectFmv) && Number.isFinite(medianCompEquityRatio)
    ? Math.round(subjectFmv * medianCompEquityRatio)
    : null;
  let value = null;
  let method = "manual_review";
  if (Number.isFinite(methodA) && Number.isFinite(methodB)) {
    value = Math.min(methodA, methodB);
    method = value === methodA ? "method_a" : "method_b";
  } else if (Number.isFinite(methodA)) {
    value = methodA;
    method = "method_a";
  } else if (Number.isFinite(methodB)) {
    value = methodB;
    method = "method_b";
  }
  const subjectAv = asNumber(subject?.assessedValue);
  if (Number.isFinite(subjectAv) && Number.isFinite(value) && value > subjectAv) {
    return {
      value: null,
      method: "manual_review",
      reviewManually: true,
      note: "The suggested value is above the current assessed value, so manual review is required.",
      eligibleCount: eligible.length,
      methodA,
      methodB,
      scarWarning: null,
    };
  }
  let scarWarning = null;
  if (Number.isFinite(subjectAv) && Number.isFinite(value) && subjectAv > 0) {
    const reductionPct = (subjectAv - value) / subjectAv;
    if (reductionPct > 0.25) {
      scarWarning = `SCAR limit exceeded: this reduction (${(reductionPct * 100).toFixed(1)}%) exceeds the 25% maximum typically allowed in SCAR proceedings.`;
    }
  }
  return {
    value: Number.isFinite(value) ? Math.round(value) : null,
    method,
    reviewManually: false,
    note: method === "method_b" ? "The equity-ratio value estimate produced the lower filing recommendation." : "The comp-based value estimate produced the lower filing recommendation.",
    eligibleCount: eligible.length,
    methodA,
    methodB,
    scarWarning,
  };
}

function applyCompAdjustments({ subject, subjectProfile, comps = [], marketSaleModel = null, equalizationRate = null }) {
  const subjectSqft = asNumber(subjectProfile?.livingArea);
  const subjectFullBaths = asNumber(subjectProfile?.fullBaths) || 0;
  const subjectHalfBaths = asNumber(subjectProfile?.halfBaths) || 0;
  const subjectAv = asNumber(subject?.assessedValue);
  const fallbackPpsf = Number.isFinite(asNumber(subject?.fullMarketValue)) && Number.isFinite(subjectSqft) && subjectSqft > 0
    ? asNumber(subject?.fullMarketValue) / subjectSqft
    : null;
  const pricePerSqft = marketSaleModel?.available ? marketSaleModel.neighborhoodMedianPpsf : fallbackPpsf;
  const rate = asNumber(equalizationRate);
  return (Array.isArray(comps) ? comps : []).map(comp => {
    const compSqft = candidateLivingArea(comp);
    const compFullBaths = asNumber(comp?._compProfile?.fullBaths) || 0;
    const compHalfBaths = asNumber(comp?._compProfile?.halfBaths) || 0;
    const compAv = candidateAssessedValue(comp);
    let adjustedAv = compAv;
    let sqftAdjustment = null;
    let fullBathAdjustment = null;
    let halfBathAdjustment = null;
    if (Number.isFinite(adjustedAv) && Number.isFinite(pricePerSqft) && Number.isFinite(rate) && rate > 0) {
      const sqftDelta = (subjectSqft || 0) - (compSqft || 0);
      sqftAdjustment = sqftDelta * pricePerSqft * rate;
      fullBathAdjustment = (subjectFullBaths - compFullBaths) * 8000 * rate;
      halfBathAdjustment = (subjectHalfBaths - compHalfBaths) * 4000 * rate;
      adjustedAv += sqftAdjustment + fullBathAdjustment + halfBathAdjustment;
      adjustedAv = Math.round(adjustedAv / 100) * 100;
    } else {
      adjustedAv = null;
    }
    const adjustedSupportLabel = Number.isFinite(adjustedAv) && Number.isFinite(subjectAv)
      ? adjustedAv < subjectAv ? "Yes" : adjustedAv <= (subjectAv * 1.02) ? "Marginal" : "No"
      : null;
    comp._adjustedAssessedValue = adjustedAv;
    comp.adjustedAssessedValue = adjustedAv;
    comp._adjustmentBreakdown = {
      sqftAdjustment,
      fullBathAdjustment,
      halfBathAdjustment,
      adjustedSupportLabel,
    };
    comp._adjustmentNarrative = Number.isFinite(adjustedAv) && Number.isFinite(subjectAv)
      ? `After adjusting for size and bath differences, this comp has an effective assessed value of ${formatWholeDollar(adjustedAv)}.`
      : "";
    return comp;
  });
}

function summarizeGrievancePackage({
  subject,
  subjectProfile,
  visibleComps = [],
  selectedComps = [],
  parcels = [],
  salesByParcelId = null,
  equalizationRate = null,
  currentDate = new Date(),
}) {
  const selected = (Array.isArray(selectedComps) ? selectedComps : []).filter(Boolean);
  const visible = (Array.isArray(visibleComps) ? visibleComps : []).filter(Boolean);
  const marketSaleModel = computeMarketSaleModel({ subject, subjectProfile, parcels, salesByParcelId, currentDate });
  const neighborhoodEquityModel = computeNeighborhoodEquityModel({ subject, subjectProfile, parcels, salesByParcelId, currentDate });
  applyCompAdjustments({ subject, subjectProfile, comps: visible, marketSaleModel, equalizationRate });
  const grievanceAvgFMV = selected.length ? Math.round(meanValue(selected.map(comp => asNumber(comp?.fullMarketValue)).filter(Number.isFinite))) : null;
  const grievanceAvgAssessed = selected.length ? Math.round(meanValue(selected.map(candidateAssessedValue).filter(Number.isFinite))) : null;
  const grievanceAvgEquityRatio = selected.length ? meanValue(selected.map(candidateEquityRatio).filter(Number.isFinite)) : null;
  const grievanceAvgEquity = grievanceAvgEquityRatio != null ? roundNumber(grievanceAvgEquityRatio * 100, 1) : null;
  const grievanceDeltaFMV = Number.isFinite(asNumber(subject?.fullMarketValue)) && Number.isFinite(grievanceAvgFMV) ? Math.round(asNumber(subject.fullMarketValue) - grievanceAvgFMV) : null;
  const grievanceDeltaAssessed = Number.isFinite(asNumber(subject?.assessedValue)) && Number.isFinite(grievanceAvgAssessed) ? Math.round(asNumber(subject.assessedValue) - grievanceAvgAssessed) : null;
  const grievanceDeltaEquity = Number.isFinite(asNumber(subjectProfile?.equityRatio)) && Number.isFinite(grievanceAvgEquityRatio)
    ? roundNumber((subjectProfile.equityRatio - grievanceAvgEquityRatio) * 100, 1)
    : null;
  const grievanceSignal = grievanceDeltaEquity == null
    ? null
    : grievanceDeltaEquity >= 3
      ? "Selected grievance comps carry lower equity ratios than your home."
      : grievanceDeltaEquity <= -3
        ? "Selected grievance comps carry higher equity ratios than your home."
        : "Selected grievance comps show equity ratios in line with your home.";
  const grievanceSupportCount = selected.filter(comp => (candidateSupportValue(comp) || 0) > 0).length;
  const grievanceModerateOrBetterCount = selected.filter(comp => (candidateSupportValue(comp) || 0) >= 12).length;
  const grievanceAverageSupportScore = roundNumber(meanValue(selected.map(candidateSupportValue).filter(Number.isFinite)) || 0, 1);
  const grievanceAverageQualityScore = roundNumber(meanValue(selected.map(candidateQualityValue).filter(Number.isFinite)) || 0, 1);
  const grievanceAverageConfidenceScore = roundNumber(meanValue(selected.map(candidateConfidenceValue).filter(Number.isFinite)) || 0, 1);
  const normalizedMetricSupport = summarizeNormalizedMetricSupport(selected);
  const packageLimitations = [];
  if (selected.length < 3) packageLimitations.push("fewer than 3 comps are currently selected");
  if (selected.some(comp => (candidateConfidenceValue(comp) || 0) < 70)) packageLimitations.push("at least one selected comp has weaker data confidence");
  if (selected.some(comp => comp?._marginalSupport || comp?.marginalSupport)) packageLimitations.push("at least one selected comp is only marginal support");
  const suggestedRequestedValue = computeSuggestedRequestedValue({ subject, selectedComps: selected });
  const overvaluationFlag = computeOvervaluationFlag(subject, equalizationRate);
  const selectionOutcomeCounts = computeSelectionOutcomeCounts(visible, selected);
  const analysisState = selected.length > 0 ? "grievance_package" : visible.length > 0 ? "research_only" : "no_matches";
  const noPackageReasonCode = analysisState === "grievance_package" ? null : deriveNoPackageReasonCode(selectionOutcomeCounts);
  const noPackageReasonText = analysisState === "grievance_package"
    ? ""
    : buildNoPackageReasonText(noPackageReasonCode, visible, overvaluationFlag, marketSaleModel, neighborhoodEquityModel);
  const caseStatusLabel = analysisState === "research_only"
    ? "Research only"
    : grievanceModerateOrBetterCount >= 3 && grievanceAverageSupportScore >= 18 && grievanceAverageQualityScore >= 60 && grievanceAverageConfidenceScore >= 65
      ? "Strong evidence"
      : grievanceModerateOrBetterCount >= 2 && grievanceAverageSupportScore >= 10 && grievanceAverageQualityScore >= 50 && grievanceAverageConfidenceScore >= 60
        ? "Moderate evidence"
        : "Weak evidence";
  const claimRecommendation = selected.length
    ? computeClaimRecommendation(selected, overvaluationFlag)
    : computeResearchClaimRecommendation(visible, overvaluationFlag, marketSaleModel, neighborhoodEquityModel);
  const subjectSaleModel = computeSubjectSaleSignal(subject, salesByParcelId, currentDate);
  return {
    grievanceSupportPool: selected.filter(comp => (candidateSupportValue(comp) || 0) > 0),
    grievanceCandidatePool: selected.filter(comp => (candidateSupportValue(comp) || 0) > 0),
    grievanceCandidates: selected,
    grievancePackage: selected,
    analysisState,
    caseStatusLabel,
    noPackageReasonCode,
    noPackageReasonText,
    researchComparables: analysisState === "research_only" ? visible : [],
    selectionOutcomeCounts,
    grievanceAvgFMV,
    grievanceAvgAssessed,
    grievanceAvgEquity,
    grievanceAvgEquityRatio,
    grievanceDeltaFMV,
    grievanceDeltaAssessed,
    grievanceDeltaEquity,
    grievanceSignal,
    grievanceSupportCount,
    grievanceModerateOrBetterCount,
    grievanceAverageSupportScore,
    grievanceAverageQualityScore,
    grievanceAverageConfidenceScore,
    normalizedMetricSupport,
    packageLimitations,
    suggestedRequestedAssessedValue: suggestedRequestedValue.value,
    suggestedRequestedAssessedValueMethod: suggestedRequestedValue.method,
    suggestedRequestedAssessedValueReviewManually: suggestedRequestedValue.reviewManually,
    suggestedRequestedAssessedValueNote: suggestedRequestedValue.note,
    suggestedRequestedAssessedValueEligibleCount: suggestedRequestedValue.eligibleCount,
    suggestedValueMethodA: suggestedRequestedValue.methodA,
    suggestedValueMethodB: suggestedRequestedValue.methodB,
    scarWarning: suggestedRequestedValue.scarWarning,
    overvaluationFlag,
    claimRecommendation,
    marketSaleModel,
    neighborhoodEquityModel,
    subjectSaleModel,
    grievancePackageAllSupportive: selected.length > 0 && grievanceSupportCount === selected.length,
  };
}

function buildBroadenedComparableResult({
  subject,
  parcels = [],
  existingCompIds = [],
  analyzeCandidate,
  cityStrictGeoMode = true,
  limit = 8,
  maxTier = 1,
}) {
  if (!subject || !Array.isArray(parcels) || typeof analyzeCandidate !== "function") return [];
  const existingIds = new Set((existingCompIds || []).map(normalizeParcelId).filter(Boolean));
  const subjectStreet = streetNameKeyForComp(subject?.address);
  const subjectNeighborhood = parcelNeighborhoodName(subject, null);
  const strictTierThreeMax = cityStrictGeoMode ? 2 : 4;
  const candidates = parcels.map(comp => {
    const compId = candidateParcelId(comp);
    if (!compId || compId === candidateParcelId(subject) || existingIds.has(compId)) return null;
    const analyzed = analyzeCandidate(comp);
    if (!analyzed) return null;
    const distance = candidateDistance(analyzed);
    const sameStreet = candidateStreetKey(analyzed) === subjectStreet;
    const sameNeighborhood = candidateNeighborhood(analyzed) === subjectNeighborhood;
    const sameZip = (subject?.zip || "") && (comp?.zip || "") && String(subject.zip) === String(comp.zip);
    const withinTwo = Number.isFinite(distance) && distance <= 2;
    const withinTierThree = Number.isFinite(distance) && distance <= strictTierThreeMax;
    if (!(sameNeighborhood || sameStreet || sameZip || withinTierThree)) return null;
    const tier = sameNeighborhood || sameStreet ? 0 : sameZip ? 1 : withinTwo ? 2 : 3;
    if (tier > maxTier) return null;
    analyzed._broadenTier = tier;
    analyzed._broadenTierLabel = tier === 0 ? "Same neighborhood overflow" : tier === 1 ? "Same ZIP / nearby streets" : tier === 2 ? "Within 2 miles" : `Within ${strictTierThreeMax} miles`;
    analyzed._broadenDistanceMiles = distance;
    return analyzed;
  }).filter(Boolean);
  return candidates.sort((a, b) =>
    (candidateSupportValue(b) - candidateSupportValue(a)) ||
    (candidateQualityValue(b) - candidateQualityValue(a)) ||
    ((a?._broadenTier || 0) - (b?._broadenTier || 0)) ||
    ((candidateDistance(a) ?? 999) - (candidateDistance(b) ?? 999)) ||
    ((asNumber(a?._fmvPctDiff) ?? 999) - (asNumber(b?._fmvPctDiff) ?? 999))
  ).slice(0, limit);
}

module.exports = {
  clampNumber,
  roundNumber,
  asNumber,
  safeDivide,
  comparePctDelta,
  meanValue,
  medianValue,
  percentileRankValue,
  normalizeParcelId,
  normalizeStreetKeyForCompare,
  streetNameKeyForComp,
  isResidentialPropClass,
  normalizeStyleFamily,
  residentialUnitCountForClass,
  residentialFamilyForClass,
  classCompatibilityTier,
  parseSalesDate,
  isArmLengthSale,
  getParcelSales,
  getMostRecentArmsLengthSale,
  isRecentArmsLengthSale,
  parcelDistanceMiles,
  parcelNeighborhoodName,
  comparableLocationContext,
  locationSimilarityScore,
  supportKindForScore,
  supportBadgeForKind,
  qualityLabelForScore,
  candidateQualityValue,
  candidateConfidenceValue,
  candidateSupportValue,
  candidateKindValue,
  candidateParcelId,
  candidateStreetKey,
  candidateNeighborhood,
  candidateDistance,
  candidateAssessedValue,
  candidateLivingArea,
  candidateYearBuilt,
  candidateEquityRatio,
  candidateNormalizedSummary,
  buildPackageDecisionRecord,
  buildSelectionIndicatorRecord,
  computeSelectionOutcomeCounts,
  recentCompSaleEvidence,
  computeRiskFlags,
  analyzeComparableCandidate,
  comparableDominates,
  sortVisibleComparableCandidates,
  sortGrievanceCandidatePool,
  selectGrievancePackage,
  annotateComparablePackageDecisions,
  weightedMedian,
  summarizeNormalizedMetricSupport,
  computeOvervaluationFlag,
  computeClaimRecommendation,
  computeResearchClaimRecommendation,
  computeSubjectSaleSignal,
  computeMarketSaleModel,
  computeNeighborhoodEquityModel,
  computeSuggestedRequestedValue,
  applyCompAdjustments,
  summarizeGrievancePackage,
  buildBroadenedComparableResult,
};
