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

function inventoryValue(parcel, key) {
  return parcel?.inventory && Object.prototype.hasOwnProperty.call(parcel.inventory, key)
    ? parcel.inventory[key]
    : null;
}

function flagIsYes(value) {
  return (value || "").toString().trim().toUpperCase() === "Y";
}

function conditionFlagIsActive(value) {
  const normalized = (value || "").toString().trim().toUpperCase();
  return normalized === "1" || normalized === "Y";
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
  return asNumber(comp?.livingAreaSqft ?? comp?._compProfile?.livingArea ?? inventoryValue(comp, "sqftLivingArea"));
}

function candidateYearBuilt(comp) {
  return asNumber(comp?.yearBuilt ?? comp?._compProfile?.yearBuilt ?? inventoryValue(comp, "yearBuilt"));
}

function candidateBedrooms(comp) {
  return asNumber(comp?.bedrooms ?? comp?._compProfile?.bedrooms ?? inventoryValue(comp, "bedrooms"));
}

function candidateFullBaths(comp) {
  return asNumber(comp?.fullBaths ?? comp?._compProfile?.fullBaths ?? inventoryValue(comp, "fullBaths"));
}

function candidateHalfBaths(comp) {
  return asNumber(comp?.halfBaths ?? comp?._compProfile?.halfBaths ?? inventoryValue(comp, "halfBaths"));
}

function candidateBathCount(comp) {
  const direct = asNumber(comp?.bathCount ?? comp?.baths ?? comp?._compProfile?.bathCount);
  if (Number.isFinite(direct)) return direct;
  const fullBaths = candidateFullBaths(comp);
  const halfBaths = candidateHalfBaths(comp);
  if (fullBaths == null && halfBaths == null) return null;
  return Number(fullBaths || 0) + (Number(halfBaths || 0) * 0.5);
}

function candidateZipCode(comp) {
  return (comp?.zip || comp?._compProfile?.zipCode || "").toString().trim();
}

function candidateNeighborhoodAssociation(comp) {
  return (comp?.neighborhoodAssociation || comp?._compProfile?.neighborhoodAssociation || "").toString().trim();
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

function summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, ratioStudyModel) {
  const reasons = [];
  if (overvaluationFlag?.active && Number.isFinite(asNumber(overvaluationFlag?.overvaluationExcess)) && asNumber(overvaluationFlag.overvaluationExcess) > 0) {
    reasons.push("the roll-context benchmark still points to overvaluation");
  }
  if (Number.isFinite(asNumber(marketSaleModel?.impliedDifference)) && asNumber(marketSaleModel?.impliedDifference) > 0) {
    reasons.push("recent arm's-length sales imply a lower market value than the current assessment");
  }
  if (Number.isFinite(asNumber(ratioStudyModel?.cod)) && asNumber(ratioStudyModel?.cod) > 15) {
    reasons.push("the local sale-ratio study also shows uneven assessment uniformity");
  }
  if (!reasons.length) return "";
  if (reasons.length === 1) return reasons[0];
  return `${reasons.slice(0, -1).join(", ")}, and ${reasons[reasons.length - 1]}`;
}

function buildExcessivePivotSentence(visibleComps = [], overvaluationFlag = null, marketSaleModel = null, ratioStudyModel = null) {
  const variance = visibleEquityVariance(visibleComps);
  const signalSummary = summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, ratioStudyModel);
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

function buildNoPackageReasonText(reasonCode, visibleComps = [], overvaluationFlag = null, marketSaleModel = null, ratioStudyModel = null) {
  const excessivePivot = buildExcessivePivotSentence(visibleComps, overvaluationFlag, marketSaleModel, ratioStudyModel);
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
  const expectedAssessedValue = Math.round(fmv * rate);
  const overvaluationExcess = Math.max(Math.round(av - expectedAssessedValue), 0);
  const active = overvaluationExcess > 0;
  return {
    active,
    equalizationRate: rate,
    expectedAssessedValue,
    overvaluationExcess,
    message: active
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

function computeResearchClaimRecommendation(visibleComps, overvaluationFlag, marketSaleModel, ratioStudyModel) {
  const variance = visibleEquityVariance(visibleComps);
  const signalSummary = summarizeExcessiveSignals(overvaluationFlag, marketSaleModel, ratioStudyModel);
  if (Number.isFinite(variance) && variance < 1.0 && signalSummary) {
    return {
      code: "EXCESSIVE",
      label: "Excessive Assessment",
      selectionLabel: 'Check "Excessive assessment"',
      reason: `Visible comps look physically similar, but their equity ratios are tightly clustered (variance ${variance.toFixed(1)} points), so unequal assessment is weak here. The remaining support leans more toward excessive assessment because ${signalSummary}.`,
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

function computeRatioStudyDirectComparison({ subject, subjectSaleModel = null, ratioStudyModel = null, rollContext = null, currentDate = new Date() }) {
  const valuationDate = valuationDateFromContext(buildRollContext(subject, rollContext, null), currentDate);
  const sale = subjectSaleModel?.sale || null;
  const saleDate = parseSalesDate(sale?.sale_dte) || parseSalesDate(sale?.deed_dte);
  const salePrice = asNumber(sale?.sale_price);
  const assessedAtSale = asNumber(sale?.total_av) ?? asNumber(subject?.assessedValue);
  const monthsFromValuation = saleDate ? monthsBetweenDates(valuationDate, saleDate) : null;
  const subjectVerifiedSaleRatio = Number.isFinite(assessedAtSale) && Number.isFinite(salePrice) && salePrice > 0
    ? assessedAtSale / salePrice
    : null;
  const withinAcceptedWindow = Number.isFinite(monthsFromValuation) && Number.isFinite(asNumber(ratioStudyModel?.windowMonths))
    ? monthsFromValuation <= asNumber(ratioStudyModel.windowMonths)
    : false;
  const canCompareDirectly = !!(
    ratioStudyModel?.available &&
    sale &&
    flagIsYes(sale?.arms_length_flag) &&
    withinAcceptedWindow &&
    Number.isFinite(subjectVerifiedSaleRatio)
  );
  const ratioGap = canCompareDirectly && Number.isFinite(asNumber(ratioStudyModel?.medianRatio))
    ? subjectVerifiedSaleRatio - asNumber(ratioStudyModel.medianRatio)
    : null;
  if (canCompareDirectly) {
    return {
      canCompareSubjectToRatioStudyDirectly: true,
      subjectVerifiedSaleRatio,
      monthsFromValuation,
      ratioGap,
      note: Number.isFinite(ratioGap) && ratioGap >= 0.05
        ? "The subject's verified sale ratio is materially above the neighborhood verified-sale median, indicating the subject may be assessed at a higher share of market value than comparable sold properties."
        : "The subject has a directly comparable verified sale ratio in the accepted valuation window, so the ratio study may be discussed as a like-to-like comparison rather than neighborhood context alone.",
    };
  }
  return {
    canCompareSubjectToRatioStudyDirectly: false,
    subjectVerifiedSaleRatio,
    monthsFromValuation,
    ratioGap: null,
    note: "The neighborhood verified sale-ratio study provides context on local assessment uniformity, but the subject does not have a directly comparable verified sale ratio in this packet. The ratio study is therefore presented as supporting context rather than direct proof.",
  };
}

function percentileValue(values, percentile) {
  const nums = (Array.isArray(values) ? values : []).map(asNumber).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  if (nums.length === 1) return nums[0];
  const clamped = clampNumber(percentile, 0, 1);
  const index = (nums.length - 1) * clamped;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return nums[lower];
  return nums[lower] + ((nums[upper] - nums[lower]) * (index - lower));
}

function buildRollContext(subject, rollContext = null, equalizationRate = null) {
  const context = rollContext || {};
  const uniformPercentOfValue = Number.isFinite(asNumber(context?.uniformPercentOfValue))
    ? asNumber(context.uniformPercentOfValue)
    : Number.isFinite(asNumber(equalizationRate))
      ? asNumber(equalizationRate) * 100
      : Number.isFinite(asNumber(subject?.uniformPercentOfValue))
        ? asNumber(subject.uniformPercentOfValue)
        : null;
  return {
    assessmentYear: parseInt(context?.assessmentYear, 10) || parseInt(subject?.assessmentYear, 10) || null,
    rollType: context?.rollType || subject?.rollType || null,
    valuationDate: context?.valuationDate || subject?.valuationDate || null,
    taxableStatusDate: context?.taxableStatusDate || subject?.taxableStatusDate || null,
    uniformPercentOfValue,
    loaRatio: Number.isFinite(uniformPercentOfValue) ? uniformPercentOfValue / 100 : asNumber(equalizationRate),
  };
}

function valuationDateFromContext(rollContext, currentDate) {
  const parsed = parseSalesDate(rollContext?.valuationDate);
  return parsed || currentDate;
}

function monthsBetweenDates(laterDate, earlierDate) {
  if (!(laterDate instanceof Date) || !(earlierDate instanceof Date)) return null;
  const diffMs = laterDate.getTime() - earlierDate.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return diffMs / (1000 * 60 * 60 * 24 * 30.4375);
}

function formatWindowMonthsLabel(months) {
  if (months === 24) return "24 months";
  if (months === 36) return "36 months";
  if (months === 60) return "60 months";
  return `${months} months`;
}

function conditionFlagsForSale(sale = {}) {
  return Object.keys(sale).filter(key => /^cond_/.test(key) && key !== "cond_none" && key !== "cond_memo" && conditionFlagIsActive(sale[key]));
}

function usableOrptsSale(sale = {}) {
  const hasCod = Object.prototype.hasOwnProperty.call(sale, "cod_usable");
  const hasRar = Object.prototype.hasOwnProperty.call(sale, "rar_usable");
  if (!hasCod && !hasRar) return flagIsYes(sale?.arms_length_flag);
  return flagIsYes(sale?.cod_usable) || flagIsYes(sale?.rar_usable);
}

function candidateFamily(comp) {
  return residentialFamilyForClass(comp?.propClass, comp?.propClassDesc || "");
}

function evidenceMatchDiagnostics(subject, subjectProfile, parcel) {
  const subjectSqft = asNumber(subjectProfile?.livingArea ?? subject?.livingAreaSqft ?? inventoryValue(subject, "sqftLivingArea"));
  const subjectYear = asNumber(subjectProfile?.yearBuilt ?? subject?.yearBuilt ?? inventoryValue(subject, "yearBuilt"));
  const subjectBeds = asNumber(subjectProfile?.bedrooms ?? subject?.bedrooms ?? inventoryValue(subject, "bedrooms"));
  const subjectBaths = asNumber(subjectProfile?.bathCount);
  const compSqft = candidateLivingArea(parcel);
  const compYear = candidateYearBuilt(parcel);
  const compBeds = candidateBedrooms(parcel);
  const compBaths = candidateBathCount(parcel);
  const diagnostics = { matches: true, reasons: [] };
  if (Number.isFinite(subjectSqft) && Number.isFinite(compSqft) && subjectSqft > 0 && (Math.abs(compSqft - subjectSqft) / subjectSqft) > 0.15) {
    diagnostics.matches = false;
    diagnostics.reasons.push("living area exceeds the evidence-pool threshold");
  }
  if (Number.isFinite(subjectYear) && Number.isFinite(compYear) && Math.abs(compYear - subjectYear) > 20) {
    diagnostics.matches = false;
    diagnostics.reasons.push("year built exceeds the evidence-pool threshold");
  }
  if (Number.isFinite(subjectBeds) && Number.isFinite(compBeds) && Math.abs(compBeds - subjectBeds) > 1) {
    diagnostics.matches = false;
    diagnostics.reasons.push("bedroom count exceeds the evidence-pool threshold");
  }
  if (Number.isFinite(subjectBaths) && Number.isFinite(compBaths) && Math.abs(compBaths - subjectBaths) > 1.0) {
    diagnostics.matches = false;
    diagnostics.reasons.push("bath count exceeds the evidence-pool threshold");
  }
  return diagnostics;
}

function comparableTierContext(subject, subjectProfile, parcel) {
  const distanceMiles = parcelDistanceMiles(subject, parcel);
  const subjectNeighborhood = parcelNeighborhoodName(subject, subjectProfile);
  const subjectAssoc = candidateNeighborhoodAssociation(subject);
  const subjectZip = candidateZipCode(subject) || (subjectProfile?.zipCode || "").toString().trim();
  const parcelNeighborhood = candidateNeighborhood(parcel);
  const parcelAssoc = candidateNeighborhoodAssociation(parcel);
  const parcelZip = candidateZipCode(parcel);
  if (subjectNeighborhood && parcelNeighborhood && subjectNeighborhood === parcelNeighborhood) {
    return { tier: 1, label: "Tier 1 same neighborhood", reason: "same neighborhood", distanceMiles };
  }
  if (subjectAssoc && parcelAssoc && subjectAssoc === parcelAssoc) {
    return { tier: 2, label: "Tier 2 same neighborhood association", reason: "same neighborhood association", distanceMiles };
  }
  if (!subjectAssoc && subjectZip && parcelZip && subjectZip === parcelZip && Number.isFinite(distanceMiles) && distanceMiles <= 1) {
    return { tier: 2, label: "Tier 2 same ZIP within 1 mile", reason: "same ZIP within 1 mile", distanceMiles };
  }
  if (Number.isFinite(distanceMiles) && distanceMiles <= 2) {
    return { tier: 3, label: "Tier 3 citywide within 2 miles", reason: "within 2 miles", distanceMiles };
  }
  if (Number.isFinite(distanceMiles) && distanceMiles <= 4) {
    return { tier: 4, label: "Tier 4 research-only within 4 miles", reason: "within 4 miles research-only", distanceMiles };
  }
  return { tier: 99, label: "Outside search area", reason: "outside 4 miles", distanceMiles };
}

function buildSaleAppendixEntry(record, extra = {}) {
  const ratio = Number.isFinite(asNumber(record.assessedValueAtSale)) && Number.isFinite(asNumber(record.salePrice)) && asNumber(record.salePrice) > 0
    ? asNumber(record.assessedValueAtSale) / asNumber(record.salePrice)
    : null;
  return {
    parcelId: record.parcelId,
    address: record.address,
    saleDate: record.saleDate,
    salePrice: record.salePrice,
    assessedValueAtSale: record.assessedValueAtSale,
    ratio,
    salePricePerSqft: record.salePricePerSqft,
    adjustedSalePricePerSqft: record.adjustedSalePricePerSqft ?? null,
    adjustedSalePrice: record.adjustedSalePrice ?? null,
    distanceMiles: record.distanceMiles,
    tier: record.tier,
    tierLabel: record.tierLabel,
    monthsFromValuation: record.monthsFromValuation,
    orptsFlags: {
      armsLength: record.armsLength,
      codUsable: record.codUsable,
      rarUsable: record.rarUsable,
    },
    reasons: record.reasons || [],
    conditionMemo: record.conditionMemo || "",
    ...extra,
  };
}

function collectCandidateSales({ subject, subjectProfile, parcels = [], salesByParcelId = null, valuationDate, maxWindowMonths = 60 }) {
  const subjectId = candidateParcelId(subject);
  const subjectFamily = candidateFamily(subject);
  const records = [];
  for (const parcel of parcels || []) {
    if (!parcel || candidateParcelId(parcel) === subjectId || candidateFamily(parcel) !== subjectFamily) continue;
    const tierContext = comparableTierContext(subject, subjectProfile, parcel);
    if (tierContext.tier > 4) continue;
    const matchDiagnostics = evidenceMatchDiagnostics(subject, subjectProfile, parcel);
    const livingArea = candidateLivingArea(parcel);
    for (const sale of getParcelSales(parcel, salesByParcelId)) {
      const saleDate = parseSalesDate(sale?.sale_dte) || parseSalesDate(sale?.deed_dte);
      const salePrice = asNumber(sale?.sale_price);
      const monthsFromValuation = saleDate ? monthsBetweenDates(valuationDate, saleDate) : null;
      const reasons = [];
      const usableForStudy = usableOrptsSale(sale);
      if (!flagIsYes(sale?.arms_length_flag)) reasons.push("not marked arm's-length by ORPTS");
      if (!Number.isFinite(salePrice) || salePrice <= 0) reasons.push("sale price is missing or zero");
      if (!(saleDate instanceof Date)) reasons.push("sale date is missing");
      if (Number.isFinite(monthsFromValuation) && monthsFromValuation > maxWindowMonths) reasons.push(`sale is older than ${formatWindowMonthsLabel(maxWindowMonths)}`);
      if (tierContext.tier === 4) reasons.push("sale falls in Tier 4 research-only geography");
      if (!matchDiagnostics.matches) reasons.push(...matchDiagnostics.reasons);
      if (!usableForStudy) reasons.push("ORPTS did not mark the sale usable for COD/RAR work");
      const activeFlags = conditionFlagsForSale(sale);
      if (activeFlags.length) reasons.push("ORPTS condition flags suggest a non-standard transfer");
      records.push({
        parcelId: candidateParcelId(parcel),
        address: parcel?.address || parcel?.parcelId || "",
        saleDate: saleDate ? saleDate.toISOString().slice(0, 10) : null,
        saleDateObj: saleDate,
        salePrice,
        assessedValueAtSale: asNumber(sale?.total_av) ?? asNumber(parcel?.assessedValue),
        salePricePerSqft: Number.isFinite(livingArea) && livingArea > 0 && Number.isFinite(salePrice) ? salePrice / livingArea : null,
        distanceMiles: tierContext.distanceMiles,
        tier: tierContext.tier,
        tierLabel: tierContext.label,
        tierReason: tierContext.reason,
        monthsFromValuation,
        armsLength: flagIsYes(sale?.arms_length_flag),
        usableForStudy,
        codUsable: flagIsYes(sale?.cod_usable),
        rarUsable: flagIsYes(sale?.rar_usable),
        conditionMemo: sale?.cond_memo || "",
        conditionFlags: activeFlags,
        matchDiagnostics,
        reasons,
      });
    }
  }
  return records;
}

function computeTrendModel(records = []) {
  const usable = (Array.isArray(records) ? records : []).filter(record =>
    record.armsLength &&
    record.usableForStudy &&
    !record.conditionFlags?.length &&
    Number.isFinite(record.salePricePerSqft) &&
    Number.isFinite(record.monthsFromValuation)
  );
  for (const maxTier of [1, 2, 3, 4]) {
    const scoped = usable.filter(record => record.tier <= maxTier && record.monthsFromValuation <= 60);
    const recent = scoped.filter(record => record.monthsFromValuation <= 24);
    const older = scoped.filter(record => record.monthsFromValuation > 24 && record.monthsFromValuation <= 60);
    if (recent.length < 3 || older.length < 3) continue;
    const recentMedian = medianValue(recent.map(record => record.salePricePerSqft));
    const olderMedian = medianValue(older.map(record => record.salePricePerSqft));
    const recentMonths = meanValue(recent.map(record => record.monthsFromValuation));
    const olderMonths = meanValue(older.map(record => record.monthsFromValuation));
    if (!Number.isFinite(recentMedian) || !Number.isFinite(olderMedian) || recentMedian <= 0 || olderMedian <= 0 || !Number.isFinite(recentMonths) || !Number.isFinite(olderMonths) || olderMonths <= recentMonths) continue;
    const monthlyRate = Math.pow(recentMedian / olderMedian, 1 / (olderMonths - recentMonths)) - 1;
    if (!Number.isFinite(monthlyRate)) continue;
    return {
      available: true,
      tierUsed: maxTier,
      monthlyRate,
      annualRatePct: (Math.pow(1 + monthlyRate, 12) - 1) * 100,
      note: `Older sales were time-adjusted using a local $/sq ft trend model through ${maxTier === 1 ? "same-neighborhood" : maxTier === 2 ? "Tier 2" : maxTier === 3 ? "Tier 3" : "Tier 4"} sales.`,
    };
  }
  return {
    available: false,
    tierUsed: null,
    monthlyRate: null,
    annualRatePct: null,
    note: "A local time-adjustment trend model could not be built from the available usable sales.",
  };
}

function computeAdjustedSaleMeasures(record, trendModel) {
  if (!Number.isFinite(record?.salePricePerSqft) || !Number.isFinite(record?.salePrice) || !Number.isFinite(record?.monthsFromValuation)) {
    return { adjustedSalePricePerSqft: null, adjustedSalePrice: null };
  }
  if (record.monthsFromValuation <= 24) {
    return {
      adjustedSalePricePerSqft: record.salePricePerSqft,
      adjustedSalePrice: record.salePrice,
    };
  }
  if (!trendModel?.available || !Number.isFinite(trendModel?.monthlyRate)) {
    return { adjustedSalePricePerSqft: null, adjustedSalePrice: null };
  }
  const factor = Math.pow(1 + trendModel.monthlyRate, record.monthsFromValuation);
  return {
    adjustedSalePricePerSqft: record.salePricePerSqft * factor,
    adjustedSalePrice: record.salePrice * factor,
  };
}

function computePriceRelatedBias(trimmedEntries = []) {
  if (!Array.isArray(trimmedEntries) || trimmedEntries.length < 20) return null;
  const usable = trimmedEntries
    .filter(entry => Number.isFinite(asNumber(entry.salePrice)) && asNumber(entry.salePrice) > 0 && Number.isFinite(asNumber(entry.ratio)))
    .map(entry => ({
      x: Math.log(asNumber(entry.salePrice)),
      y: asNumber(entry.ratio),
    }));
  if (usable.length < 20) return null;
  const meanX = meanValue(usable.map(entry => entry.x));
  const meanY = meanValue(usable.map(entry => entry.y));
  const numerator = usable.reduce((sum, entry) => sum + ((entry.x - meanX) * (entry.y - meanY)), 0);
  const denominator = usable.reduce((sum, entry) => sum + ((entry.x - meanX) ** 2), 0);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return (numerator / denominator) * 100;
}

function computeEvidenceSufficiency({ analysisState, selectedComps = [], marketSaleModel = null }) {
  if (marketSaleModel?.available && marketSaleModel?.sufficientForClaim) {
    return {
      status: "sale_backed_sufficient",
      label: "Sale-backed evidence is sufficient",
      canRecommendClaim: true,
      canRecommendValue: true,
      reason: `The package has ${marketSaleModel.saleCount} usable sale-backed evidence records in the ${marketSaleModel.windowLabel} ${marketSaleModel.tierLabel.toLowerCase()} pool.`,
    };
  }
  if ((Array.isArray(selectedComps) && selectedComps.length) || analysisState === "research_only") {
    return {
      status: "sale_backed_insufficient",
      label: "Sale-backed evidence is insufficient",
      canRecommendClaim: false,
      canRecommendValue: false,
      reason: marketSaleModel?.insufficiencyReason || "Comparable homes were found, but the sale-backed evidence pool is not strong enough for an automatic claim recommendation or requested value.",
    };
  }
  return {
    status: "needs_homeowner_evidence",
    label: "Additional homeowner evidence is needed",
    canRecommendClaim: false,
    canRecommendValue: false,
    reason: "No grievance package could be built from the current comparable evidence. Additional homeowner-supplied evidence would be needed before recommending a claim or value.",
  };
}

function computeClaimGuidance({ subject, marketSaleModel, ratioStudyModel, evidenceSufficiency, ratioStudyDirectComparison = null }) {
  if (!evidenceSufficiency?.canRecommendClaim) {
    return {
      allowRecommendation: false,
      recommendationCode: null,
      recommendedReason: null,
      selectionLabel: "Review RP-524 Part Three manually before choosing a complaint reason",
      reason: evidenceSufficiency?.reason || "Sale-backed evidence is not sufficient for an automatic claim recommendation.",
    };
  }
  const directComparisonGap = asNumber(ratioStudyDirectComparison?.ratioGap);
  if (
    ratioStudyDirectComparison?.canCompareSubjectToRatioStudyDirectly &&
    Number.isFinite(directComparisonGap) &&
    directComparisonGap >= 0.05 &&
    ratioStudyModel?.reliabilityLabel !== "low"
  ) {
    return {
      allowRecommendation: true,
      recommendationCode: "UNEQUAL",
      recommendedReason: "Unequal Assessment",
      selectionLabel: 'Check "Unequal assessment"',
      reason: `The subject's verified sale ratio is materially above the local verified-sale median ratio (${(directComparisonGap * 100).toFixed(1)} points above the trimmed median).`,
    };
  }
  if (Number.isFinite(asNumber(marketSaleModel?.impliedDifferencePct)) && asNumber(marketSaleModel.impliedDifferencePct) > 0.03) {
    return {
      allowRecommendation: true,
      recommendationCode: "EXCESSIVE",
      recommendedReason: "Excessive Assessment",
      selectionLabel: 'Check "Excessive assessment"',
      reason: `The sale-backed market model implies a lower market value than the current assessment by ${((marketSaleModel.impliedDifferencePct || 0) * 100).toFixed(1)}%.`,
    };
  }
  return {
    allowRecommendation: false,
    recommendationCode: null,
    recommendedReason: null,
    selectionLabel: "Review RP-524 Part Three manually before choosing a complaint reason",
    reason: "The sale-backed models are directionally useful, but they do not separate unequal from excessive assessment strongly enough for an automatic claim recommendation.",
  };
}

function computeMarketSaleModel({ subject, subjectProfile, parcels = [], salesByParcelId = null, currentDate = new Date(), rollContext = null }) {
  if (!(salesByParcelId instanceof Map) || !subject) return null;
  const roll = buildRollContext(subject, rollContext, null);
  const valuationDate = valuationDateFromContext(roll, currentDate);
  const subjectSqft = asNumber(subjectProfile?.livingArea ?? subject?.livingAreaSqft ?? inventoryValue(subject, "sqftLivingArea"));
  const fallbackPricePerSqft = Number.isFinite(asNumber(subject?.fullMarketValue)) && Number.isFinite(subjectSqft) && subjectSqft > 0
    ? asNumber(subject.fullMarketValue) / subjectSqft
    : null;
  const candidateSales = collectCandidateSales({ subject, subjectProfile, parcels, salesByParcelId, valuationDate, maxWindowMonths: 60 });
  const trendModel = computeTrendModel(candidateSales);
  const attempts = [];
  let chosen = null;
  for (const windowMonths of [24, 36, 60]) {
    for (const tier of [1, 2, 3, 4]) {
      const included = candidateSales
        .filter(record =>
          record.tier <= tier &&
          record.tier < 99 &&
          record.armsLength &&
          record.usableForStudy &&
          !record.conditionFlags?.length &&
          record.matchDiagnostics?.matches &&
          Number.isFinite(record.salePricePerSqft) &&
          Number.isFinite(record.monthsFromValuation) &&
          record.monthsFromValuation <= windowMonths
        )
        .map(record => ({ ...record, ...computeAdjustedSaleMeasures(record, trendModel) }))
        .filter(record => record.monthsFromValuation <= 24 || Number.isFinite(record.adjustedSalePricePerSqft));
      attempts.push({ windowMonths, tier, count: included.length });
      if (!chosen && Number.isFinite(subjectSqft) && subjectSqft > 0 && included.length >= 3) {
        chosen = { windowMonths, tier, included };
      }
      if (chosen) break;
    }
    if (chosen) break;
  }
  if (!chosen) {
    const bestAttempt = attempts.sort((a, b) => b.count - a.count)[0] || { count: 0, windowMonths: 24, tier: 1 };
    return {
      available: false,
      saleCount: bestAttempt.count,
      expandedRadius: bestAttempt.tier > 1,
      sufficientForClaim: false,
      reliabilityLabel: "insufficient",
      valuationDate: valuationDate.toISOString().slice(0, 10),
      windowMonths: bestAttempt.windowMonths,
      windowLabel: formatWindowMonthsLabel(bestAttempt.windowMonths),
      tierUsed: bestAttempt.tier,
      tierLabel: bestAttempt.tier === 1 ? "Tier 1 same neighborhood" : bestAttempt.tier === 2 ? "Tier 2" : bestAttempt.tier === 3 ? "Tier 3" : "Tier 4",
      timeAdjustmentMethod: trendModel.available ? trendModel.note : "No local time adjustment could be applied.",
      includedSales: [],
      excludedSales: candidateSales.map(record => buildSaleAppendixEntry(record, { included: false })),
      estimatedSubjectFmv: null,
      estimatedValueLow: null,
      estimatedValueHigh: null,
      impliedDifference: null,
      impliedDifferencePct: null,
      insufficiencyReason: !Number.isFinite(subjectSqft) || subjectSqft <= 0
        ? "Living area is unavailable for the subject parcel, so the sale-backed market model cannot be calculated."
        : `Only ${bestAttempt.count} usable sale${bestAttempt.count === 1 ? "" : "s"} were found within the current evidence pool.`,
      note: !Number.isFinite(subjectSqft) || subjectSqft <= 0
        ? "Living area is unavailable for the subject parcel, so the sale-backed market model cannot be calculated."
        : "Insufficient usable sale-backed evidence for a defensible market estimate.",
      fallbackPricePerSqft,
    };
  }
  const adjustedPpsfValues = chosen.included.map(record => record.adjustedSalePricePerSqft).filter(Number.isFinite);
  const neighborhoodMedianPpsf = roundNumber(medianValue(adjustedPpsfValues) || 0, 2);
  const estimatedSubjectFmv = Math.round((medianValue(adjustedPpsfValues) || 0) * subjectSqft);
  const estimatedValueLow = Math.round((percentileValue(adjustedPpsfValues, 0.25) || medianValue(adjustedPpsfValues) || 0) * subjectSqft);
  const estimatedValueHigh = Math.round((percentileValue(adjustedPpsfValues, 0.75) || medianValue(adjustedPpsfValues) || 0) * subjectSqft);
  const impliedDifference = Number.isFinite(asNumber(subject?.assessedValue)) && Number.isFinite(estimatedSubjectFmv)
    ? Math.round(asNumber(subject.assessedValue) - estimatedSubjectFmv)
    : null;
  const impliedDifferencePct = Number.isFinite(impliedDifference) && Number.isFinite(estimatedSubjectFmv) && estimatedSubjectFmv > 0
    ? impliedDifference / estimatedSubjectFmv
    : null;
  const tierLabel = chosen.tier === 1
    ? "Tier 1 same neighborhood"
    : chosen.tier === 2
      ? "Tier 2 same neighborhood association / ZIP fallback"
      : chosen.tier === 3
        ? "Tier 3 citywide within 2 miles"
        : "Tier 4 research-only within 4 miles";
  const sufficientForClaim = chosen.included.length >= 3 && chosen.tier <= 3 && chosen.windowMonths <= 36;
  return {
    available: true,
    saleCount: chosen.included.length,
    expandedRadius: chosen.tier > 1 || chosen.included.some(record => Number.isFinite(record.distanceMiles) && record.distanceMiles > 1),
    sufficientForClaim,
    reliabilityLabel: sufficientForClaim ? "sufficient" : chosen.windowMonths === 60 || chosen.tier === 4 ? "strong_caveat" : "caution",
    valuationDate: valuationDate.toISOString().slice(0, 10),
    windowMonths: chosen.windowMonths,
    windowLabel: formatWindowMonthsLabel(chosen.windowMonths),
    tierUsed: chosen.tier,
    tierLabel,
    neighborhoodMedianPpsf,
    estimatedSubjectFmv,
    estimatedValueLow,
    estimatedValueHigh,
    impliedDifference,
    impliedDifferencePct,
    eligibleSales: chosen.included,
    includedSales: chosen.included.map(record => buildSaleAppendixEntry(record, { included: true })),
    excludedSales: candidateSales
      .filter(record => !(chosen.included.some(included => included.parcelId === record.parcelId && included.saleDate === record.saleDate && included.salePrice === record.salePrice)))
      .map(record => buildSaleAppendixEntry(record, { included: false })),
    timeAdjustmentMethod: chosen.windowMonths > 24
      ? trendModel.note
      : "No time adjustment was needed because the evidence comes from the primary 24-month window.",
    insufficiencyReason: sufficientForClaim ? null : "The sale-backed value estimate exists, but it relies on a broader fallback window or research-only geography and should not drive an automatic claim recommendation.",
    note: chosen.windowMonths > 24 || chosen.tier > 1
      ? `The market estimate uses a ${formatWindowMonthsLabel(chosen.windowMonths)} window and ${tierLabel.toLowerCase()} to reach a usable sample.`
      : "The market estimate uses the primary 24-month sale window in the subject neighborhood.",
    fallbackPricePerSqft,
  };
}

function computeNeighborhoodEquityModel({ subject, subjectProfile, parcels = [], salesByParcelId = null, currentDate = new Date(), rollContext = null }) {
  if (!(salesByParcelId instanceof Map) || !subject) return null;
  const roll = buildRollContext(subject, rollContext, null);
  const valuationDate = valuationDateFromContext(roll, currentDate);
  const candidateSales = collectCandidateSales({ subject, subjectProfile, parcels, salesByParcelId, valuationDate, maxWindowMonths: 60 });
  let chosen = null;
  for (const windowMonths of [24, 36, 60]) {
    for (const tier of [1, 2, 3]) {
      const included = candidateSales.filter(record =>
        record.tier <= tier &&
        record.armsLength &&
        record.usableForStudy &&
        !record.conditionFlags?.length &&
        Number.isFinite(record.assessedValueAtSale) &&
        Number.isFinite(record.salePrice) &&
        record.salePrice > 0 &&
        Number.isFinite(record.monthsFromValuation) &&
        record.monthsFromValuation <= windowMonths
      );
      if (included.length >= 5) {
        chosen = { windowMonths, tier, included };
        break;
      }
    }
    if (chosen) break;
  }
  if (!chosen) {
    return {
      available: false,
      sampleSize: 0,
      rawSampleSize: 0,
      trimmedSampleSize: 0,
      scope: "insufficient",
      note: "Insufficient verified sale-ratio evidence for the ratio study.",
      includedSales: [],
      excludedSales: candidateSales.map(record => buildSaleAppendixEntry(record, { included: false })),
      cod: null,
      prd: null,
      prb: null,
      reliabilityLabel: "low",
      iaaoStandard: 15,
      medianRatio: null,
      subjectRatio: null,
      subjectPercentile: null,
    };
  }
  const ratios = chosen.included.map(record => ({
    ...record,
    ratio: record.assessedValueAtSale / record.salePrice,
  })).sort((a, b) => a.ratio - b.ratio);
  const trimCount = ratios.length >= 20 ? Math.floor(ratios.length * 0.05) : 0;
  const trimmed = ratios.slice(trimCount, ratios.length - trimCount);
  const trimmedRatios = trimmed.map(entry => entry.ratio);
  const medianRatio = medianValue(trimmedRatios);
  const absoluteDeviations = trimmedRatios.map(value => Math.abs(value - medianRatio));
  const cod = Number.isFinite(medianRatio) && medianRatio !== 0 ? (medianValue(absoluteDeviations) / medianRatio) * 100 : null;
  const meanRatio = meanValue(trimmedRatios);
  const weightedMeanRatio = safeDivide(
    trimmed.reduce((sum, entry) => sum + entry.assessedValueAtSale, 0),
    trimmed.reduce((sum, entry) => sum + entry.salePrice, 0)
  );
  const prd = trimmed.length >= 20 && Number.isFinite(meanRatio) && Number.isFinite(weightedMeanRatio) && weightedMeanRatio > 0
    ? meanRatio / weightedMeanRatio
    : null;
  const prb = trimmed.length >= 20 ? computePriceRelatedBias(trimmed) : null;
  return {
    available: true,
    sampleSize: trimmed.length,
    rawSampleSize: ratios.length,
    trimmedSampleSize: trimmed.length,
    trimRule: trimCount > 0 ? "top and bottom 5% trimmed" : "no trim applied because the sample is smaller than 20",
    scope: chosen.tier === 1 ? "neighborhood" : chosen.tier === 2 ? ((candidateNeighborhoodAssociation(subject) || "") ? "tier_2" : "zip") : "tier_3",
    windowMonths: chosen.windowMonths,
    windowLabel: formatWindowMonthsLabel(chosen.windowMonths),
    tierUsed: chosen.tier,
    medianRatio,
    cod,
    prd,
    prb,
    reliabilityLabel: trimmed.length >= 20 ? "standard" : "low",
    iaaoStandard: 15,
    codWarning: Number.isFinite(cod) && cod > 15 ? `The trimmed COD is ${cod.toFixed(1)}, which is above the IAAO single-family guideline of 15.0.` : "",
    note: trimmed.length >= 20
      ? "The ratio study uses verified sale ratios after trimming the top and bottom 5% of ratios."
      : "The ratio study is low reliability because the trimmed sample is under 20 sales, so PRD and PRB are suppressed.",
    includedSales: trimmed.map(entry => buildSaleAppendixEntry(entry, { included: true, ratio: entry.ratio })),
    excludedSales: candidateSales
      .filter(record => !trimmed.some(included => included.parcelId === record.parcelId && included.saleDate === record.saleDate && included.salePrice === record.salePrice))
      .map(record => buildSaleAppendixEntry(record, { included: false })),
    subjectRatio: null,
    subjectPercentile: null,
  };
}

function computeSuggestedRequestedValue({ subject, selectedComps = [], marketSaleModel = null, equalizationRate = null, evidenceSufficiency = null }) {
  if (!marketSaleModel && !evidenceSufficiency) {
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
    const methodA = eligible.length === 2
      ? Math.round(Math.min(
        safeDivide(weightedEntries.reduce((sum, entry) => sum + (entry.value * entry.weight), 0), weightedEntries.reduce((sum, entry) => sum + entry.weight, 0)) || meanValue(weightedEntries.map(entry => entry.value)),
        (weightedEntries[0].value + weightedEntries[1].value) / 2
      ))
      : weightedMedian(weightedEntries);
    const subjectFmv = asNumber(subject?.fullMarketValue);
    const medianCompEquityRatio = medianValue(eligible.map(candidateEquityRatio).filter(Number.isFinite));
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
  const loaRatio = asNumber(equalizationRate);
  if (!evidenceSufficiency?.canRecommendValue || !marketSaleModel?.available || !Number.isFinite(asNumber(marketSaleModel?.estimatedSubjectFmv)) || !Number.isFinite(loaRatio) || loaRatio <= 0) {
    return {
      value: null,
      method: "manual_review",
      reviewManually: true,
      note: evidenceSufficiency?.reason || "Sale-backed evidence is not strong enough for an automatic requested assessed value.",
      eligibleCount: marketSaleModel?.saleCount || 0,
      methodA: null,
      methodB: null,
      scarWarning: null,
    };
  }
  const value = Math.round(asNumber(marketSaleModel.estimatedSubjectFmv) * loaRatio);
  const subjectAv = asNumber(subject?.assessedValue);
  if (Number.isFinite(subjectAv) && Number.isFinite(value) && value >= subjectAv) {
    return {
      value: null,
      method: "manual_review",
      reviewManually: true,
      note: "The LOA-converted requested value is not below the current assessed value, so the app will not auto-fill a filing value.",
      eligibleCount: marketSaleModel.saleCount || 0,
      methodA: null,
      methodB: null,
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
    value,
    method: "uniform_percent_of_value",
    reviewManually: false,
    note: "The requested assessed value is the sale-backed market estimate converted by the loaded uniform percent of value / LOA ratio.",
    eligibleCount: marketSaleModel.saleCount || 0,
    methodA: Math.round(asNumber(marketSaleModel.estimatedSubjectFmv)),
    methodB: value,
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
  rollContext = null,
  currentDate = new Date(),
}) {
  const selected = (Array.isArray(selectedComps) ? selectedComps : []).filter(Boolean);
  const visible = (Array.isArray(visibleComps) ? visibleComps : []).filter(Boolean);
  const normalizedRollContext = buildRollContext(subject, rollContext, equalizationRate);
  const marketSaleModel = computeMarketSaleModel({ subject, subjectProfile, parcels, salesByParcelId, currentDate, rollContext: normalizedRollContext });
  const ratioStudyModel = computeNeighborhoodEquityModel({ subject, subjectProfile, parcels, salesByParcelId, currentDate, rollContext: normalizedRollContext });
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
  const overvaluationFlag = computeOvervaluationFlag(subject, equalizationRate);
  const selectionOutcomeCounts = computeSelectionOutcomeCounts(visible, selected);
  const analysisState = selected.length > 0 ? "grievance_package" : visible.length > 0 ? "research_only" : "no_matches";
  const evidenceSufficiency = computeEvidenceSufficiency({ analysisState, selectedComps: selected, marketSaleModel });
  const subjectSaleModel = computeSubjectSaleSignal(subject, salesByParcelId, currentDate);
  const ratioStudyDirectComparison = computeRatioStudyDirectComparison({ subject, subjectSaleModel, ratioStudyModel, rollContext: normalizedRollContext, currentDate });
  const claimGuidance = computeClaimGuidance({ subject, marketSaleModel, ratioStudyModel, evidenceSufficiency, ratioStudyDirectComparison });
  const suggestedRequestedValue = computeSuggestedRequestedValue({ subject, marketSaleModel, equalizationRate, evidenceSufficiency });
  if (evidenceSufficiency?.status !== "sale_backed_sufficient") packageLimitations.push("sale-backed evidence is insufficient for an automatic claim recommendation or requested value");
  if (marketSaleModel?.windowMonths > 24) packageLimitations.push(`market estimate uses a ${marketSaleModel.windowLabel} fallback window`);
  if (marketSaleModel?.tierUsed > 1) packageLimitations.push(`market estimate broadened to ${marketSaleModel.tierLabel.toLowerCase()}`);
  if (ratioStudyModel?.reliabilityLabel === "low") packageLimitations.push("sale-ratio diagnostics are low reliability because the trimmed ratio-study sample is under 20 sales");
  const noPackageReasonCode = analysisState === "grievance_package" ? null : deriveNoPackageReasonCode(selectionOutcomeCounts);
  const noPackageReasonText = analysisState === "grievance_package"
    ? ""
    : buildNoPackageReasonText(noPackageReasonCode, visible, overvaluationFlag, marketSaleModel, ratioStudyModel);
  const caseStatusLabel = analysisState === "research_only"
    ? "Research only"
    : evidenceSufficiency?.status === "sale_backed_sufficient" && grievanceModerateOrBetterCount >= 3 && grievanceAverageSupportScore >= 18 && grievanceAverageQualityScore >= 60 && grievanceAverageConfidenceScore >= 65
      ? "Strong evidence"
      : evidenceSufficiency?.status === "sale_backed_sufficient" && grievanceModerateOrBetterCount >= 2 && grievanceAverageSupportScore >= 10 && grievanceAverageQualityScore >= 50 && grievanceAverageConfidenceScore >= 60
        ? "Moderate evidence"
        : evidenceSufficiency?.status === "sale_backed_insufficient"
          ? "Insufficient sale-backed evidence"
        : "Weak evidence";
  const claimRecommendation = claimGuidance?.allowRecommendation
    ? {
      code: claimGuidance.recommendationCode,
      label: claimGuidance.recommendedReason,
      selectionLabel: claimGuidance.selectionLabel,
      reason: claimGuidance.reason,
      variance: selected.length ? visibleEquityVariance(selected) : visibleEquityVariance(visible),
    }
    : null;
  const salesAppendix = {
    marketIncludedSales: marketSaleModel?.includedSales || [],
    marketExcludedSales: marketSaleModel?.excludedSales || [],
    ratioIncludedSales: ratioStudyModel?.includedSales || [],
    ratioExcludedSales: ratioStudyModel?.excludedSales || [],
  };
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
    rollContext: normalizedRollContext,
    evidenceSufficiency,
    claimGuidance,
    claimRecommendation,
    marketEvidenceModel: marketSaleModel,
    marketSaleModel,
    ratioStudyModel,
    ratioStudyDirectComparison,
    neighborhoodEquityModel: ratioStudyModel,
    salesAppendix,
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
