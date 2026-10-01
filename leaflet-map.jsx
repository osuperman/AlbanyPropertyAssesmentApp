
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AddressAutocompleteInput } from "./address-autocomplete.jsx";
import { googleMapsAreaUrl, googleMapsPropertyUrl, googleStreetViewUrl } from "./google-maps-links.js";

const MAP_NATIVE_CRS = "EPSG:26918";
const MAP_NATIVE_DEF = "+proj=utm +zone=18 +datum=NAD83 +units=m +no_defs";
const ALBANY_DEFAULT_CENTER = [42.6526, -73.7562];
const ALBANY_DEFAULT_ZOOM = 13;
const ALBANY_SAFE_BOUNDS = { south: 42.57, west: -73.91, north: 42.76, east: -73.67 };
const BOUNDARY_RENDER_MIN_ZOOM = 12;
const POINT_RENDER_MIN_ZOOM = 14;
const POLYGON_RENDER_MIN_ZOOM = 12;
const MAX_POLYGON_FEATURES = 1800;
const MAX_POINT_FEATURES = 1400;
const OPENSTREETMAP_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";
const OPENSTREETMAP_FIX_MAP_URL = "https://www.openstreetmap.org/fixthemap";
const OPENSTREETMAP_TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>';
const BOUNDARY_PALETTE = [
  "#1d4ed8", "#0f766e", "#b45309", "#7c3aed", "#be123c", "#166534",
  "#0891b2", "#c2410c", "#4f46e5", "#15803d", "#b91c1c", "#0369a1",
  "#a21caf", "#65a30d", "#dc2626", "#0d9488", "#7c2d12", "#4338ca",
  "#2563eb", "#0f766e", "#d97706", "#6d28d9", "#059669", "#ea580c",
];

const getLeafletRuntime = () => (typeof window !== "undefined" ? window.L || null : null);
const getProj4Runtime = () => {
  if (typeof window === "undefined" || !window.proj4) return null;
  try { window.proj4.defs(MAP_NATIVE_CRS, MAP_NATIVE_DEF); } catch {}
  return window.proj4;
};
const nativeBBoxIntersects = (bbox, bounds) => !!(
  Array.isArray(bbox) && bbox.length === 4 &&
  Array.isArray(bounds) && bounds.length === 4 &&
  bbox[0] <= bounds[2] && bbox[2] >= bounds[0] &&
  bbox[1] <= bounds[3] && bbox[3] >= bounds[1]
);
const expandNativeBounds = (bounds, pad = 0) => (
  Array.isArray(bounds) && bounds.length === 4
    ? [bounds[0] - pad, bounds[1] - pad, bounds[2] + pad, bounds[3] + pad]
    : null
);
const nativePointBounds = (x, y, pad = 6) => [x - pad, y - pad, x + pad, y + pad];
const projectNativePointToLatLng = (x, y) => {
  const proj4 = getProj4Runtime();
  if (!proj4 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  try {
    const [lng, lat] = proj4(MAP_NATIVE_CRS, "EPSG:4326", [x, y]);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  } catch {
    return null;
  }
};
const projectLatLngBoundsToNative = boundsLike => {
  const proj4 = getProj4Runtime();
  if (!proj4 || !boundsLike) return null;
  const south = typeof boundsLike.getSouth === "function" ? boundsLike.getSouth() : boundsLike.south;
  const west = typeof boundsLike.getWest === "function" ? boundsLike.getWest() : boundsLike.west;
  const north = typeof boundsLike.getNorth === "function" ? boundsLike.getNorth() : boundsLike.north;
  const east = typeof boundsLike.getEast === "function" ? boundsLike.getEast() : boundsLike.east;
  if (![south, west, north, east].every(Number.isFinite)) return null;
  try {
    const corners = [
      proj4("EPSG:4326", MAP_NATIVE_CRS, [west, south]),
      proj4("EPSG:4326", MAP_NATIVE_CRS, [east, south]),
      proj4("EPSG:4326", MAP_NATIVE_CRS, [west, north]),
      proj4("EPSG:4326", MAP_NATIVE_CRS, [east, north]),
    ].filter(pair => Array.isArray(pair) && pair.length === 2 && pair.every(Number.isFinite));
    if (!corners.length) return null;
    const xs = corners.map(([x]) => x);
    const ys = corners.map(([, y]) => y);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  } catch {
    return null;
  }
};
const nativeBBoxToLeafletBounds = bbox => {
  if (!Array.isArray(bbox) || bbox.length !== 4) return null;
  const sw = projectNativePointToLatLng(bbox[0], bbox[1]);
  const ne = projectNativePointToLatLng(bbox[2], bbox[3]);
  return sw && ne ? [sw, ne] : null;
};
const latLngWithinAlbany = latLng => (
  Array.isArray(latLng) &&
  Number.isFinite(latLng[0]) &&
  Number.isFinite(latLng[1]) &&
  latLng[0] >= ALBANY_SAFE_BOUNDS.south &&
  latLng[0] <= ALBANY_SAFE_BOUNDS.north &&
  latLng[1] >= ALBANY_SAFE_BOUNDS.west &&
  latLng[1] <= ALBANY_SAFE_BOUNDS.east
);
const boundaryCenterFromRings = rings => {
  let latSum = 0, lngSum = 0, count = 0;
  for (const ring of rings || []) {
    for (const latLng of ring || []) {
      if (!latLngWithinAlbany(latLng)) continue;
      latSum += latLng[0];
      lngSum += latLng[1];
      count += 1;
    }
  }
  return count ? [latSum / count, lngSum / count] : null;
};
const geoJsonBoundaryRings = geometry => {
  if (!geometry || !geometry.type || !geometry.coordinates) return [];
  const polygons = geometry.type === "MultiPolygon"
    ? geometry.coordinates
    : (geometry.type === "Polygon" ? [geometry.coordinates] : []);
  const out = [];
  for (const polygon of polygons) {
    for (const ring of polygon || []) {
      const latLngs = (ring || []).map(pt => Array.isArray(pt) && pt.length >= 2 ? [Number(pt[1]), Number(pt[0])] : null).filter(latLngWithinAlbany);
      if (latLngs.length >= 3) out.push(latLngs);
    }
  }
  return out;
};
const esriBoundaryRings = (geometry, projectPoint) => {
  const rings = Array.isArray(geometry?.rings) ? geometry.rings : [];
  const out = [];
  for (const ring of rings) {
    const latLngs = (ring || []).map(pt => Array.isArray(pt) && pt.length >= 2 ? projectPoint(Number(pt[0]), Number(pt[1])) : null).filter(latLngWithinAlbany);
    if (latLngs.length >= 3) out.push(latLngs);
  }
  return out;
};
const colorForBoundaryLabel = label => {
  const text = String(label || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return BOUNDARY_PALETTE[Math.abs(hash) % BOUNDARY_PALETTE.length];
};

// Aerial photos: New York State orthoimagery from NYS ITS Geospatial Services, served as WMS. Albany County's most
// recent flight is 2024 (the 2022, 2023, and 2025 services return blank tiles here), and the statewide "Latest"
// composite takes 20-30 seconds per tile, so the 2024 service is used directly.
const AERIAL_WMS_URL = "https://orthos.its.ny.gov/arcgis/services/wms/2024/MapServer/WMSServer";
const AERIAL_ATTRIBUTION = 'Aerial photos (2024): <a href="https://gis.ny.gov/orthoimagery" target="_blank" rel="noreferrer">NYS ITS Geospatial Services</a>';
const AERIAL_INFO_URL = "https://gis.ny.gov/orthoimagery";

// Map state kept in the page address so links, Back, and Refresh reopen the same view:
// ?tab=mapview&parcel=<parcel id>&lat=<lat>&lng=<lng>&z=<zoom>&layer=<coloring>&base=aerial
const readMapUrlState = () => {
  if (typeof window === "undefined") return {};
  try {
    const params = new URLSearchParams(window.location.search);
    if ((params.get("tab") || "") !== "mapview") return {};
    const lat = Number(params.get("lat"));
    const lng = Number(params.get("lng"));
    const zoom = Number(params.get("z"));
    const center = params.has("lat") && params.has("lng") && latLngWithinAlbany([lat, lng]) ? [lat, lng] : null;
    return {
      parcel: (params.get("parcel") || "").trim(),
      center,
      zoom: center && Number.isFinite(zoom) && zoom >= 10 && zoom <= 20 ? zoom : null,
      layer: (params.get("layer") || "").trim(),
      base: (params.get("base") || "").trim(),
    };
  } catch {
    return {};
  }
};
const writeMapUrlState = state => {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if ((url.searchParams.get("tab") || "") !== "mapview") return;
    for (const key of ["parcel", "lat", "lng", "z", "layer", "base"]) {
      const value = state[key];
      if (value === null || value === undefined || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    }
    const next = url.toString();
    if (next !== window.location.href) window.history.replaceState(window.history.state, "", next);
  } catch {}
};
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const STAR_EXEMPTION_CODES = new Set(["41854", "41834", "99999"]);
const medianOfValues = values => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const LeafletMapView = ({ parcels, parcelGeometry, neighborhoodBoundaries, neighborhoodAssociations, compareList = [], onCompare, onDrill, jumpRequest = null, advanced = true, compactMode = false, subjectParcelId = null, compactTitle = "", compactSubtitle = "", onOpenProperty = null, renderPropertyDetails = null, utils }) => {
  const {
    normalizeParcelId,
    FC,
    FL,
    eqFlagFast,
    eqRFast,
    propClassLabel,
    isAbsenteeFast,
    getAbsenteeModelFast,
    getParcelWarnings,
    $f,
    SectionTitle,
    Sub,
    Card,
    Badge,
    inventoryStyle,
    inventoryYearBuilt,
    inventorySqft,
    inventoryBedrooms,
    inventoryBathText,
    hasInventoryProfile,
    getOwnerPortfolioGroup,
    streetViewUrlForParcel,
    priorOf,
    assessedChangePct,
    describeChangeShort,
    ExemptionTerm,
    ChangePill,
  } = utils;

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
  const pointCacheRef = useRef(new Map());
  const geomCacheRef = useRef(new Map());
  const didFitInitialRef = useRef(false);
  const mountedRef = useRef(false);
  const SI = { background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", borderRadius: 8, padding: "7px 11px", fontSize: 12, cursor: "pointer" };
  // Links to Google Maps open a new tab and say so; buttons without the arrow act on this app's map.
  const GOOGLE_LINK = { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--card)", border: "1px solid var(--border2)", color: "var(--blue3)", borderRadius: 8, padding: "7px 11px", fontSize: 12, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", lineHeight: 1.2 };

  const normalizedSubjectParcelId = normalizeParcelId(subjectParcelId || "");
  const initialCompactSelectedParcelId = subjectParcelId || null;
  const initialUrlStateRef = useRef(null);
  if (initialUrlStateRef.current === null) initialUrlStateRef.current = compactMode ? {} : readMapUrlState();
  const initialUrlState = initialUrlStateRef.current;
  const [colorBy, setColorBy] = useState(() => initialUrlState.layer || "assessed");
  const [baseLayer, setBaseLayer] = useState(() => initialUrlState.base === "aerial" ? "aerial" : "street");
  const [linkCopied, setLinkCopied] = useState("");
  const [addrSearch, setAddrSearch] = useState("");
  const [selectedParcelId, setSelectedParcelId] = useState(() => compactMode ? initialCompactSelectedParcelId : null);
  const [showParcelPoints, setShowParcelPoints] = useState(false);
  const [showPropertyOverlay, setShowPropertyOverlay] = useState(true);
  const [zoomDisplay, setZoomDisplay] = useState(0);
  const [viewport, setViewport] = useState(null);
  const [mapRuntimeReady, setMapRuntimeReady] = useState(() => !!(getLeafletRuntime() && getProj4Runtime()));
  const [mapStatus, setMapStatus] = useState("");
  const [showNeighborhoodOverlay, setShowNeighborhoodOverlay] = useState(!compactMode);
  const [showAssociationOverlay, setShowAssociationOverlay] = useState(false);
  const [legendOpen, setLegendOpen] = useState({ coloring: true, boundaries: true });
  const [ownerPortfolioOpen, setOwnerPortfolioOpen] = useState(false);
  const pendingJumpRef = useRef(null);
  const handledJumpTokenRef = useRef(null);
  // A shared link's property is selected once the parcels that include it have loaded.
  const urlParcelQueuedRef = useRef(false);
  if (!urlParcelQueuedRef.current) {
    urlParcelQueuedRef.current = true;
    if (initialUrlState.parcel) pendingJumpRef.current = { parcelId: initialUrlState.parcel, keepView: !!initialUrlState.center };
  }

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setOwnerPortfolioOpen(false);
  }, [selectedParcelId]);
  const [renderStats, setRenderStats] = useState({ visible: 0, polygons: 0, points: 0, neighborhoods: 0, associations: 0, polygonCandidates: 0, pointCandidates: 0, polygonCapped: false, pointCapped: false });

  useEffect(() => {
    if (!advanced) setShowAssociationOverlay(false);
  }, [advanced]);

  useEffect(() => {
    if (!compactMode || !initialCompactSelectedParcelId) return;
    setSelectedParcelId(current => current || initialCompactSelectedParcelId);
    setShowNeighborhoodOverlay(false);
    setShowAssociationOverlay(false);
  }, [compactMode, initialCompactSelectedParcelId]);

  useEffect(() => {
    if (mapRuntimeReady) return;
    let cancelled = false;
    let tries = 0;
    const poll = () => {
      if (cancelled) return;
      if (getLeafletRuntime() && getProj4Runtime()) {
        setMapRuntimeReady(true);
        return;
      }
      tries += 1;
      if (tries < 40) window.setTimeout(poll, 150);
    };
    poll();
    return () => { cancelled = true; };
  }, [mapRuntimeReady]);

  const geomByIdRaw = parcelGeometry?.parcels && !Array.isArray(parcelGeometry.parcels) ? parcelGeometry.parcels : null;
  const geomByNorm = useMemo(() => {
    if (!geomByIdRaw) return null;
    const map = new Map();
    for (const [rawKey, geom] of Object.entries(geomByIdRaw)) {
      const key = normalizeParcelId(rawKey);
      if (key) map.set(key, geom);
    }
    return map;
  }, [geomByIdRaw, normalizeParcelId]);
  const hasParcelGeometry = !!geomByNorm;
  const residentMode = !advanced;
  const effectiveShowParcelPoints = advanced ? showParcelPoints : !hasParcelGeometry;
  const effectiveShowPropertyOverlay = advanced ? showPropertyOverlay : hasParcelGeometry;

  // Ways to color the map; assessed value is the default. The assessed-to-full-value ratio is not offered: Albany
  // assesses nearly every parcel at the same uniform percent, so it would paint the whole city one color.
  const priorYear = useMemo(() => {
    if (typeof priorOf !== "function") return null;
    const withPrior = parcels.find(p => priorOf(p));
    return withPrior ? priorOf(withPrior).assessmentYear : null;
  }, [parcels, priorOf]);
  const valuePerSqftReference = useMemo(() => {
    const groups = new Map();
    const all = [];
    for (const p of parcels) {
      if (!/^2\d\d$/.test(String(p?.propClass || ""))) continue;
      const sqft = Number(inventorySqft(p));
      const assessed = Number(p.assessedValue);
      if (!(sqft > 300) || !(assessed > 0)) continue;
      const value = assessed / sqft;
      all.push(value);
      const key = p.neighborhood || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(value);
    }
    const byNeighborhood = new Map();
    for (const [key, values] of groups) if (values.length >= 15) byNeighborhood.set(key, medianOfValues(values));
    return { byNeighborhood, citywide: medianOfValues(all) };
  }, [parcels, inventorySqft]);
  // Homes only: assessed value per square foot of living space against the typical home in the same neighborhood
  // (15 or more homes), otherwise against the city.
  const valuePerSqftComparison = useCallback(p => {
    if (!/^2\d\d$/.test(String(p?.propClass || ""))) return null;
    const sqft = Number(inventorySqft(p));
    const assessed = Number(p?.assessedValue);
    if (!(sqft > 300) || !(assessed > 0)) return null;
    const inNeighborhood = valuePerSqftReference.byNeighborhood.has(p.neighborhood || "");
    const reference = inNeighborhood ? valuePerSqftReference.byNeighborhood.get(p.neighborhood || "") : valuePerSqftReference.citywide;
    if (!(reference > 0)) return null;
    const value = assessed / sqft;
    return { value, reference, ratio: value / reference, scope: inNeighborhood ? (p.neighborhood || "the neighborhood") : "Albany" };
  }, [inventorySqft, valuePerSqftReference]);
  const colorModes = useMemo(() => [
    {
      id: "assessed",
      label: "Assessed value",
      help: "Assessed value on the current roll, the value property taxes are based on.",
      legend: [["$400,000 or more", "#f59e0b"], ["$250,000 to $399,999", "#3b82f6"], ["$150,000 to $249,999", "#0d9488"], ["Under $150,000", "#64748b"], ["No assessed value", "#cbd5e1"]],
    },
    {
      id: "sqft",
      label: "Value per sq ft vs. neighborhood",
      help: "Homes only: assessed value per square foot of living space, compared with the typical home in the same neighborhood. A starting point for comparing similar homes, not proof of over-assessment; lot size, condition, and features also matter.",
      legend: [["15% or more above the neighborhood", "#c2410c"], ["5% to 15% above", "#fb923c"], ["Within 5% of typical", "#94a3b8"], ["5% to 15% below", "#4ade80"], ["15% or more below", "#15803d"], ["Not a home, or no size on record", "#e2e8f0"]],
    },
    ...(priorYear ? [{
      id: "change",
      label: `Change since ${priorYear}`,
      help: `How each assessed value changed from the ${priorYear} roll. Most assessments did not change; the ones that did stand out.`,
      legend: [["Up 10% or more", "#b91c1c"], ["Up less than 10%", "#f87171"], ["No change", "#cbd5e1"], ["Went down", "#16a34a"], [`New or renumbered since ${priorYear}`, "#a78bfa"]],
    }] : []),
    {
      id: "exemption",
      label: "Exemptions & STAR",
      help: "Where an exemption or the STAR credit is recorded on the roll.",
      legend: [["STAR exemption or credit", "#f59e0b"], ["Other exemption (senior, veteran, disability, nonprofit...)", "#8b5cf6"], ["Fully exempt (no county taxable value)", "#0ea5e9"], ["None recorded", "#cbd5e1"]],
    },
    {
      id: "class",
      label: "Property type",
      help: "Property class on the roll.",
      legend: [["Single family", "#3b82f6"], ["Two family", "#0d9488"], ["Three family", "#06b6d4"], ["Other residential", "#93c5fd"], ["Apartments (411)", "#a78bfa"], ["Commercial", "#f97316"], ["Vacant land", "#94a3b8"], ["Public, community, industrial, and other", "#be185d"]],
    },
    {
      id: "absentee",
      label: "Owner lives elsewhere",
      help: "Properties whose owner likely lives somewhere else, estimated from mailing addresses and exemptions.",
      legend: [["Owner likely lives elsewhere", "#f97316"], ["No sign owner lives elsewhere", "#22c55e"]],
    },
  ], [priorYear]);
  const activeColorMode = colorModes.find(mode => mode.id === colorBy) || colorModes[0];
  const colorMode = activeColorMode.id;

  // Fill color for a parcel in the active view; null means the view does not apply to it (drawn faintly).
  const colorForParcel = useCallback(p => {
    if (colorMode === "assessed") {
      const v = Number(p.assessedValue);
      if (!(v > 0)) return "#cbd5e1";
      return v >= 400000 ? "#f59e0b" : v >= 250000 ? "#3b82f6" : v >= 150000 ? "#0d9488" : "#64748b";
    }
    if (colorMode === "sqft") {
      const comparison = valuePerSqftComparison(p);
      if (!comparison) return null;
      const r = comparison.ratio;
      return r >= 1.15 ? "#c2410c" : r >= 1.05 ? "#fb923c" : r > 0.95 ? "#94a3b8" : r > 0.85 ? "#4ade80" : "#15803d";
    }
    if (colorMode === "change") {
      if (typeof priorOf !== "function" || !priorOf(p)) return "#a78bfa";
      const change = typeof assessedChangePct === "function" ? assessedChangePct(p) : null;
      // No percent change exists from a $0 assessment (condo common land, for example): same value means no change.
      if (change == null) return Number(p.assessedValue) === Number(priorOf(p).assessedValue) ? "#cbd5e1" : null;
      return change >= 10 ? "#b91c1c" : change > 0 ? "#f87171" : change < 0 ? "#16a34a" : "#cbd5e1";
    }
    if (colorMode === "exemption") {
      const exemptions = Array.isArray(p.exemptions) ? p.exemptions : [];
      if (!exemptions.length) return "#cbd5e1";
      if (Number(p.assessedValue) > 0 && Number(p.countyTaxable) === 0) return "#0ea5e9";
      if (exemptions.some(ex => STAR_EXEMPTION_CODES.has(String(ex?.code || "")))) return "#f59e0b";
      return "#8b5cf6";
    }
    if (colorMode === "class") {
      const code = String(p.propClass || "");
      if (code === "210") return "#3b82f6";
      if (code === "220") return "#0d9488";
      if (code === "230") return "#06b6d4";
      if (code.startsWith("2")) return "#93c5fd";
      if (code === "411") return "#a78bfa";
      if (code.startsWith("4")) return "#f97316";
      if (code.startsWith("3")) return "#94a3b8";
      return "#be185d";
    }
    if (colorMode === "absentee") return isAbsenteeFast(p) ? "#f97316" : "#22c55e";
    return "#3b82f6";
  }, [assessedChangePct, colorMode, isAbsenteeFast, priorOf, valuePerSqftComparison]);
  const legendItems = activeColorMode.legend;

  const projectPoint = useCallback((x, y) => {
    const key = `${x}|${y}`;
    if (pointCacheRef.current.has(key)) return pointCacheRef.current.get(key);
    const latLng = projectNativePointToLatLng(x, y);
    pointCacheRef.current.set(key, latLng);
    return latLng;
  }, []);

  const geometryToLatLng = useCallback((key, geom) => {
    if (!geom || !Array.isArray(geom.g)) return null;
    const cacheKey = key || JSON.stringify(geom.b || geom.c || []);
    if (geomCacheRef.current.has(cacheKey)) return geomCacheRef.current.get(cacheKey);
    const latLngs = geom.g.map(poly => poly
      .map(ring => ring.map(([x, y]) => projectPoint(x, y)).filter(Boolean))
      .filter(ring => ring.length >= 3)
    ).filter(poly => poly.length > 0);
    geomCacheRef.current.set(cacheKey, latLngs.length ? latLngs : null);
    return latLngs.length ? latLngs : null;
  }, [projectPoint]);

  const neighborhoodFeatures = useMemo(() => {
    const features = Array.isArray(neighborhoodBoundaries?.features) ? neighborhoodBoundaries.features : [];
    return features.map((feature, index) => {
      const label = String(feature?.properties?.name || feature?.properties?.Name || feature?.properties?.label || feature?.properties?.Label || ("Neighborhood " + (index + 1))).trim();
      const rings = geoJsonBoundaryRings(feature?.geometry);
      if (!label || !rings.length) return null;
      return { id: `nbh-${index}-${label}`, label, rings, center: boundaryCenterFromRings(rings) };
    }).filter(Boolean);
  }, [neighborhoodBoundaries]);
  const associationFeatures = useMemo(() => {
    const features = Array.isArray(neighborhoodAssociations?.features) ? neighborhoodAssociations.features : [];
    return features.map((feature, index) => {
      const attrs = feature?.attributes || {};
      const label = String(attrs.Assoc_Name || attrs.Label || ("Association " + (index + 1))).trim();
      const rings = esriBoundaryRings(feature?.geometry, projectPoint);
      if (!label || !rings.length) return null;
      return { id: `assoc-${index}-${label}`, label, rings, center: boundaryCenterFromRings(rings) };
    }).filter(Boolean);
  }, [neighborhoodAssociations, projectPoint]);
  const hasNeighborhoodOverlayData = neighborhoodFeatures.length > 0;
  const hasAssociationOverlayData = associationFeatures.length > 0;
  const compareIndexById = useMemo(() => {
    const map = new Map();
    (compareList || []).forEach((parcel, index) => {
      const id = normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl);
      if (id) map.set(id, index + 1);
    });
    return map;
  }, [compareList, normalizeParcelId]);
  const compareIds = useMemo(() => new Set(compareIndexById.keys()), [compareIndexById]);
  const getParcelRole = useCallback(parcel => {
    const id = normalizeParcelId(parcel?.parcelIdNorm || parcel?.parcelId || parcel?.printKey || parcel?.pinSbl);
    if (!id) return { kind: "other", label: "Parcel", color: "#64748b", outline: "#475569" };
    if (normalizedSubjectParcelId && id === normalizedSubjectParcelId) return { kind: "subject", label: "Subject parcel", color: "#f59e0b", outline: "#b45309" };
    if (compareIndexById.has(id)) {
      const index = compareIndexById.get(id);
      return { kind: "compare", index, label: `Included comp ${index}`, color: "#2563eb", outline: "#1d4ed8" };
    }
    return { kind: "other", label: "Parcel", color: "#64748b", outline: "#475569" };
  }, [compareIndexById, normalizeParcelId, normalizedSubjectParcelId]);
  const boundaryLegendItems = useMemo(() => {
    const items = [];
    if (showNeighborhoodOverlay && hasNeighborhoodOverlayData) {
      for (const feature of neighborhoodFeatures) items.push({ label: feature.label, color: colorForBoundaryLabel(feature.label), kind: "Neighborhood" });
    }
    if (advanced && showAssociationOverlay && hasAssociationOverlayData) {
      for (const feature of associationFeatures) items.push({ label: feature.label, color: colorForBoundaryLabel(feature.label), kind: "Association" });
    }
    return items.sort((a, b) => a.label.localeCompare(b.label));
  }, [advanced, associationFeatures, hasAssociationOverlayData, hasNeighborhoodOverlayData, neighborhoodFeatures, showAssociationOverlay, showNeighborhoodOverlay]);

  const mapped = useMemo(() => {
    const out = [];
    for (const p of parcels) {
      const key = normalizeParcelId(p.parcelIdNorm || p.parcelId || p.printKey || p.pinSbl);
      const geom = hasParcelGeometry && key ? geomByNorm.get(key) : null;
      const warnings = getParcelWarnings(p);
      const suppressPointFallback = !geom && warnings.includes("missing_county_reference_join") && warnings.includes("missing_geometry_join");
      const centroid = Array.isArray(geom?.c) && Number.isFinite(geom.c[0]) && Number.isFinite(geom.c[1])
        ? geom.c
        : (!suppressPointFallback && p.eastCoord > 0 && p.nrthCoord > 0 ? [p.eastCoord, p.nrthCoord] : null);
      if (!centroid) continue;
      const latLng = projectPoint(centroid[0], centroid[1]);
      if (!latLng || !latLngWithinAlbany(latLng)) continue;
      out.push({
        p,
        key,
        geom,
        latLng,
        pointFallback: !geom,
        nativeBounds: Array.isArray(geom?.b) && geom.b.length === 4 ? geom.b : nativePointBounds(centroid[0], centroid[1]),
      });
    }
    return out;
  }, [geomByNorm, getParcelWarnings, hasParcelGeometry, normalizeParcelId, parcels, projectPoint]);

  const mappedById = useMemo(() => new Map(mapped.map(item => [item.p.parcelId, item])), [mapped]);
  const selectedItem = selectedParcelId ? mappedById.get(selectedParcelId) || null : null;
  const selectedParcel = selectedItem?.p || parcels.find(p => p.parcelId === selectedParcelId) || null;
  const polygonCount = useMemo(() => mapped.filter(item => !!item.geom).length, [mapped]);
  const pointFallbackCount = Math.max(0, mapped.length - polygonCount);
  const hiddenCount = Math.max(0, parcels.length - mapped.length);

  const datasetLatLngBounds = useMemo(() => {
    if (!mapped.length) return null;
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const item of mapped) {
      const [lat, lng] = item.latLng || [];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    return Number.isFinite(minLat) ? [[minLat, minLng], [maxLat, maxLng]] : null;
  }, [mapped]);

  const hlSet = useMemo(() => {
    const q = addrSearch.trim().toLowerCase();
    if (!q) return null;
    const s = new Set();
    for (const item of mapped) {
      const p = item.p;
      if ((p._searchBlob || "").includes(q) || (p._ownerBlob || "").includes(q)) s.add(p.parcelId);
    }
    return s.size ? s : null;
  }, [addrSearch, mapped]);

  const searchMatches = useMemo(() => {
    if (!hlSet) return [];
    const out = [];
    for (const item of mapped) {
      if (hlSet.has(item.p.parcelId)) out.push(item.p);
      if (out.length >= 8) break;
    }
    return out;
  }, [hlSet, mapped]);

  useEffect(() => {
    if (selectedParcelId && !parcels.some(p => p.parcelId === selectedParcelId)) setSelectedParcelId(null);
  }, [parcels, selectedParcelId]);

  const viewportNativeBounds = useMemo(() => {
    const projected = projectLatLngBoundsToNative(viewport);
    return projected ? expandNativeBounds(projected, 60) : null;
  }, [viewport]);

  const visibleItems = useMemo(() => {
    if (!viewportNativeBounds) return mapped;
    return mapped.filter(item => nativeBBoxIntersects(item.nativeBounds, viewportNativeBounds));
  }, [mapped, viewportNativeBounds]);

  const focusParcel = useCallback((parcelId, maxZoom) => {
    const item = mappedById.get(parcelId);
    const map = mapRef.current;
    if (!item || !map) return;
    setSelectedParcelId(parcelId);
    if (Array.isArray(item.geom?.b) && item.geom.b.length === 4) {
      const bounds = nativeBBoxToLeafletBounds(item.geom.b);
      if (bounds) {
        map.fitBounds(bounds, { padding: [32, 32], maxZoom: maxZoom || 18 });
        return;
      }
    }
    map.setView(item.latLng, maxZoom || Math.max(map.getZoom(), 17), { animate: true });
  }, [mappedById]);

  const resetView = useCallback(() => {
    setSelectedParcelId(null);
    const map = mapRef.current;
    if (map && datasetLatLngBounds) map.fitBounds(datasetLatLngBounds, { padding: [30, 30] });
  }, [datasetLatLngBounds]);

  const fitSearchMatches = useCallback(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    if (!map || !L || searchMatches.length === 0) return;
    if (searchMatches.length === 1) {
      focusParcel(searchMatches[0].parcelId, 18);
      return;
    }
    const bounds = L.latLngBounds(
      searchMatches.map(match => mappedById.get(match.parcelId)?.latLng).filter(Boolean)
    );
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });
  }, [focusParcel, mappedById, searchMatches]);

  useEffect(() => {
    if (!jumpRequest || !jumpRequest.token || handledJumpTokenRef.current === jumpRequest.token) return;
    handledJumpTokenRef.current = jumpRequest.token;
    pendingJumpRef.current = jumpRequest;
    didFitInitialRef.current = true;
    if (jumpRequest.address) setAddrSearch(jumpRequest.address);
    if (jumpRequest.parcelId) setSelectedParcelId(jumpRequest.parcelId);
  }, [jumpRequest]);

  useEffect(() => {
    const pending = pendingJumpRef.current;
    if (!pending || !mapRef.current) return;
    if (pending.parcelId && mappedById.has(pending.parcelId)) {
      if (pending.keepView) setSelectedParcelId(pending.parcelId);
      else focusParcel(pending.parcelId, 18);
      pendingJumpRef.current = null;
      return;
    }
    if (!pending.parcelId && searchMatches[0]) {
      focusParcel(searchMatches[0].parcelId, 18);
      pendingJumpRef.current = null;
    }
  }, [focusParcel, mappedById, searchMatches, viewport]);

  const stepZoom = useCallback(direction => {
    const map = mapRef.current;
    if (!map) return;
    if (direction > 0) map.zoomIn();
    else map.zoomOut();
  }, []);

  // Number of properties on the map in each legend item. Legend colors match colorForParcel exactly; a parcel the
  // current view does not apply to (null) belongs to the light "not applicable" item.
  const legendCounts = useMemo(() => {
    const counts = new Map();
    for (const item of mapped) {
      const key = colorForParcel(item.p) || "none";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [colorForParcel, mapped]);
  const legendCountFor = color => (legendCounts.get(color) || 0) + (color === "#e2e8f0" ? (legendCounts.get("none") || 0) : 0);
  const boundaryCounts = useMemo(() => {
    const neighborhoods = new Map();
    const associations = new Map();
    for (const item of mapped) {
      const neighborhood = String(item.p.neighborhoodLabel || "").trim();
      if (neighborhood) neighborhoods.set(neighborhood, (neighborhoods.get(neighborhood) || 0) + 1);
      const association = String(item.p.neighborhoodAssociation || "").trim();
      if (association) associations.set(association, (associations.get(association) || 0) + 1);
    }
    return { neighborhoods, associations };
  }, [mapped]);
  const propertyCountText = n => " (" + n.toLocaleString() + " " + (n === 1 ? "property" : "properties") + ")";

  // "Change since <prior year>": the properties on the map whose assessed value changed, plus parcels that are new or
  // renumbered since the prior roll. Few properties changed, so each gets a dot and the panel lists them.
  const [changeFilter, setChangeFilter] = useState("all");
  const inspectorBodyRef = useRef(null);
  const highlightRendererRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const changeSummary = useMemo(() => {
    if (!priorYear || typeof priorOf !== "function" || typeof assessedChangePct !== "function") return null;
    const rows = [];
    for (const item of mapped) {
      const p = item.p;
      if (!priorOf(p)) { rows.push({ item, kind: "new", change: null }); continue; }
      const change = assessedChangePct(p);
      if (change == null || change === 0) continue;
      rows.push({ item, kind: change > 0 ? "up" : "down", change });
    }
    rows.sort((a, b) => (a.kind === "new") - (b.kind === "new") || Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0));
    const up = rows.filter(row => row.kind === "up").length;
    const down = rows.filter(row => row.kind === "down").length;
    const added = rows.filter(row => row.kind === "new").length;
    return { rows, up, down, added, changed: up + down };
  }, [assessedChangePct, mapped, priorOf, priorYear]);
  const changeColor = row => row.kind === "new" ? "#7c3aed" : row.kind === "up" ? (row.change >= 10 ? "#b91c1c" : "#ef4444") : "#15803d";
  const changeLabel = row => row.kind === "new" ? `New or renumbered since ${priorYear}` : `${row.kind === "up" ? "Up" : "Down"} ${Math.abs(row.change).toFixed(1)}% since ${priorYear}`;
  const filteredChangeRows = changeSummary ? changeSummary.rows.filter(row => changeFilter === "all" || row.kind === changeFilter) : [];
  const openChangeList = useCallback(filter => {
    setSelectedParcelId(null);
    setChangeFilter(filter || "all");
    window.setTimeout(() => { inspectorBodyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }, []);
  const changePill = row => {
    if (row.kind === "new") return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#ede9fe", border: "1px solid #c4b5fd", color: "#5b21b6", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>New</span>;
    if (typeof ChangePill === "function") return <ChangePill pct={row.change}>{row.kind === "up" ? "Up" : "Down"} {Math.abs(row.change).toFixed(1)}%</ChangePill>;
    return <span style={{ fontWeight: 800, color: changeColor(row) }}>{changeLabel(row)}</span>;
  };

  // Parcel shapes stay on the map between renders, keyed by parcel id. Panning adds and removes only the parcels that
  // entered or left the view; a new selection restyles two shapes; a new coloring or search restyles in place. (The
  // map used to delete and rebuild every shape on each pan, zoom, or click.)
  const baseLayersRef = useRef(null);
  const parcelGroupsRef = useRef(null);
  const polygonLayersRef = useRef(new Map());
  const pointLayersRef = useRef(new Map());
  const boundaryLayersRef = useRef({ neighborhoods: null, associations: null });
  const labelLayerRef = useRef(null);
  const lastStyledSelectionRef = useRef(null);
  const selectedIdRef = useRef(selectedParcelId);
  selectedIdRef.current = selectedParcelId;
  const focusParcelRef = useRef(focusParcel);
  focusParcelRef.current = focusParcel;
  const aerialBase = baseLayer === "aerial";

  const computeStyle = useCallback((item, kind, selectedId) => {
    const p = item.p;
    const isSelected = selectedId === p.parcelId;
    const isHighlighted = hlSet ? hlSet.has(p.parcelId) : false;
    const isMuted = !!(hlSet && !isHighlighted && !isSelected);
    const parcelRole = compactMode ? getParcelRole(p) : null;
    const modeColor = compactMode && parcelRole ? parcelRole.color : colorForParcel(p);
    const notApplicable = !compactMode && !modeColor;
    const baseColor = modeColor || "#e2e8f0";
    const outlineColor = compactMode && parcelRole ? parcelRole.outline : (modeColor || "#94a3b8");
    if (kind === "polygon") {
      let fillOpacity = isMuted ? 0.16 : (isSelected ? 0.72 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 0.64 : 0.48) : (advanced ? 0.62 : 0.56)));
      if (notApplicable && !isSelected) fillOpacity = Math.min(fillOpacity, 0.22);
      // On aerial photos, lighter fills let the buildings show through; outlines carry the color.
      if (aerialBase && !isSelected) fillOpacity *= 0.4;
      return {
        color: isSelected ? (aerialBase ? "#facc15" : "#0f172a") : (isHighlighted ? "#ffffff" : outlineColor),
        weight: (isSelected ? 2.4 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 2.2 : 2.0) : (isHighlighted ? 1.8 : 1.1))) + (aerialBase ? 0.7 : 0),
        opacity: isMuted ? 0.28 : (isSelected ? 0.98 : 0.92),
        fillColor: isSelected ? "#ffffff" : baseColor,
        fillOpacity,
      };
    }
    return {
      radius: isSelected ? 8 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 7.2 : 6.2) : (isHighlighted ? 6.5 : (item.pointFallback ? 4 : 3.25))),
      color: isSelected ? (aerialBase ? "#facc15" : "#0f172a") : "#ffffff",
      weight: isSelected ? 2 : (compactMode && parcelRole ? 1.5 : 1.1),
      opacity: isMuted ? 0.34 : 0.96,
      fillColor: isSelected ? "#ffffff" : baseColor,
      fillOpacity: isMuted ? 0.18 : (notApplicable ? 0.35 : (compactMode && parcelRole ? 0.9 : (item.pointFallback ? 0.9 : 0.72))),
    };
  }, [advanced, aerialBase, colorForParcel, compactMode, getParcelRole, hlSet]);
  const computeStyleRef = useRef(computeStyle);
  computeStyleRef.current = computeStyle;
  const tooltipHtml = useCallback(p => {
    const parcelRole = compactMode ? getParcelRole(p) : null;
    return `${escapeHtml(p.address || p.parcelId)}<br/>${compactMode && parcelRole ? `${escapeHtml(parcelRole.label)}<br/>` : ""}${escapeHtml(p.owner1 || "Unknown owner")}`;
  }, [compactMode, getParcelRole]);
  const tooltipHtmlRef = useRef(tooltipHtml);
  tooltipHtmlRef.current = tooltipHtml;
  const applyStyle = (layer, style) => {
    layer.setStyle(style);
    if (typeof layer.setRadius === "function" && Number.isFinite(style.radius)) layer.setRadius(style.radius);
  };

  useEffect(() => {
    if (!mapRuntimeReady || !mapElRef.current || mapRef.current) return;
    const L = getLeafletRuntime();
    if (!L) {
      setMapStatus("Leaflet did not load.");
      return;
    }
    const map = L.map(mapElRef.current, { preferCanvas: true, zoomControl: false, doubleClickZoom: false, attributionControl: true });
    mapRef.current = map;
    rendererRef.current = L.canvas({ padding: 0.4 });
    L.control.zoom({ position: "topright" }).addTo(map);
    baseLayersRef.current = {
      street: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: OPENSTREETMAP_TILE_ATTRIBUTION }),
      aerial: L.tileLayer.wms(AERIAL_WMS_URL, { layers: "0", format: "image/jpeg", version: "1.3.0", transparent: false, maxZoom: 20, attribution: AERIAL_ATTRIBUTION }),
    };
    parcelGroupsRef.current = { polygons: L.layerGroup().addTo(map), points: L.layerGroup().addTo(map) };
    const highlightPane = map.createPane("changeHighlightPane");
    highlightPane.style.zIndex = 450;
    highlightPane.style.pointerEvents = "none";
    highlightRendererRef.current = L.svg({ pane: "changeHighlightPane", padding: 0.4 });
    // A shared link opens at its own view; otherwise the map fits the loaded parcels once.
    if (initialUrlState.center || initialUrlState.parcel) didFitInitialRef.current = true;
    map.setView(initialUrlState.center || ALBANY_DEFAULT_CENTER, initialUrlState.zoom || ALBANY_DEFAULT_ZOOM);
    const syncViewport = () => {
      if (!mountedRef.current || !map._loaded) return;
      const bounds = map.getBounds();
      setViewport({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
      setZoomDisplay(Number(map.getZoom().toFixed(1)));
    };
    map.on("moveend zoomend", syncViewport);
    map.on("dblclick", e => map.setView(e.latlng, Math.min(map.getZoom() + 1, 20)));
    syncViewport();
    return () => {
      map.off();
      map.remove();
      mapRef.current = null;
      rendererRef.current = null;
      baseLayersRef.current = null;
      parcelGroupsRef.current = null;
      polygonLayersRef.current = new Map();
      pointLayersRef.current = new Map();
      boundaryLayersRef.current = { neighborhoods: null, associations: null };
      labelLayerRef.current = null;
      lastStyledSelectionRef.current = null;
      highlightRendererRef.current = null;
      highlightLayerRef.current = null;
    };
  }, [mapRuntimeReady]);

  // Street map or aerial photo underneath the parcels.
  useEffect(() => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;
    const wanted = aerialBase ? layers.aerial : layers.street;
    for (const layer of [layers.street, layers.aerial]) {
      if (layer !== wanted && map.hasLayer(layer)) map.removeLayer(layer);
    }
    if (!map.hasLayer(wanted)) {
      wanted.addTo(map);
      wanted.bringToBack();
    }
  }, [aerialBase, mapRuntimeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !datasetLatLngBounds || didFitInitialRef.current || pendingJumpRef.current || selectedParcelId) return;
    map.fitBounds(datasetLatLngBounds, { padding: [30, 30], maxZoom: 16 });
    didFitInitialRef.current = true;
  }, [datasetLatLngBounds, selectedParcelId]);

  // Keep the page address in step with the map (replaceState, so moving the map does not add Back steps).
  useEffect(() => {
    if (compactMode) return;
    const map = mapRef.current;
    if (!map || !map._loaded) return;
    const center = map.getCenter();
    writeMapUrlState({
      parcel: selectedParcelId || pendingJumpRef.current?.parcelId || "",
      lat: center.lat.toFixed(5),
      lng: center.lng.toFixed(5),
      z: Math.round(map.getZoom()),
      layer: colorMode === "assessed" ? "" : colorMode,
      base: aerialBase ? "aerial" : "",
    });
  }, [aerialBase, colorMode, compactMode, selectedParcelId, viewport]);

  const copyViewLink = useCallback(async () => {
    const href = typeof window !== "undefined" ? window.location.href : "";
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(href);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = href;
        ta.setAttribute("readonly", "readonly");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {}
    }
    setLinkCopied(ok ? "copied" : "failed");
    window.setTimeout(() => { if (mountedRef.current) setLinkCopied(""); }, 2500);
  }, []);

  // Parcel boundaries: add the ones that entered the view, remove the ones that left.
  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    const groups = parcelGroupsRef.current;
    if (!map || !L || !groups || !rendererRef.current) return;
    const currentZoom = Number.isFinite(map.getZoom()) ? map.getZoom() : 0;
    const wanted = new Map();
    if (effectiveShowPropertyOverlay && currentZoom >= POLYGON_RENDER_MIN_ZOOM) {
      for (const item of visibleItems) if (item.geom) wanted.set(item.p.parcelId, item);
    }
    const layers = polygonLayersRef.current;
    for (const [id, entry] of layers) {
      if (wanted.get(id) !== entry.item) {
        groups.polygons.removeLayer(entry.layer);
        layers.delete(id);
      }
    }
    for (const [id, item] of wanted) {
      if (layers.has(id)) continue;
      const latLngs = geometryToLatLng(item.key || id, item.geom);
      if (!latLngs) continue;
      const layer = L.polygon(latLngs, { renderer: rendererRef.current, ...computeStyleRef.current(item, "polygon", selectedIdRef.current) });
      layer.on("click", evt => { L.DomEvent.stopPropagation(evt); setSelectedParcelId(id); });
      layer.on("dblclick", evt => { L.DomEvent.stopPropagation(evt); focusParcelRef.current(id, 18); });
      layer.bindTooltip(tooltipHtmlRef.current(item.p), { sticky: true, direction: "top", opacity: 0.92 });
      layer.addTo(groups.polygons);
      layers.set(id, { item, layer });
    }
    const selectedEntry = selectedIdRef.current ? layers.get(selectedIdRef.current) : null;
    if (selectedEntry) selectedEntry.layer.bringToFront();
    setRenderStats(prev => ({ ...prev, visible: visibleItems.length, polygons: layers.size, polygonCandidates: wanted.size }));
  }, [effectiveShowPropertyOverlay, geometryToLatLng, mapRuntimeReady, visibleItems, zoomDisplay]);

  // Point markers for parcels without a boundary (or when markers are turned on), capped for speed.
  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    const groups = parcelGroupsRef.current;
    if (!map || !L || !groups || !rendererRef.current) return;
    const currentZoom = Number.isFinite(map.getZoom()) ? map.getZoom() : 0;
    const pointLimit = advanced ? MAX_POINT_FEATURES : 800;
    const needsPoint = item => !item.geom || effectiveShowParcelPoints || !hasParcelGeometry;
    let candidates = currentZoom >= POINT_RENDER_MIN_ZOOM ? visibleItems.filter(needsPoint) : [];
    if (selectedItem && needsPoint(selectedItem) && !candidates.includes(selectedItem)) candidates = [...candidates, selectedItem];
    const priority = item => (selectedParcelId === item.p.parcelId ? 100 : 0) + (hlSet && hlSet.has(item.p.parcelId) ? 50 : 0) + (item.pointFallback ? 10 : 0);
    const ordered = [...candidates].sort((a, b) => priority(b) - priority(a));
    const chosen = ordered.length > pointLimit ? ordered.slice(0, pointLimit) : ordered;
    const wanted = new Map(chosen.map(item => [item.p.parcelId, item]));
    const layers = pointLayersRef.current;
    for (const [id, entry] of layers) {
      if (wanted.get(id) !== entry.item) {
        groups.points.removeLayer(entry.layer);
        layers.delete(id);
      }
    }
    for (const [id, item] of wanted) {
      if (layers.has(id)) continue;
      const style = computeStyleRef.current(item, "point", selectedIdRef.current);
      const layer = L.circleMarker(item.latLng, { renderer: rendererRef.current, ...style });
      layer.on("click", evt => { L.DomEvent.stopPropagation(evt); setSelectedParcelId(id); });
      layer.on("dblclick", evt => { L.DomEvent.stopPropagation(evt); focusParcelRef.current(id, 18); });
      layer.bindTooltip(tooltipHtmlRef.current(item.p), { sticky: true, direction: "top", opacity: 0.92 });
      layer.addTo(groups.points);
      layers.set(id, { item, layer });
    }
    setRenderStats(prev => ({ ...prev, points: layers.size, pointCandidates: ordered.length, pointCapped: ordered.length > chosen.length }));
  }, [advanced, effectiveShowParcelPoints, hasParcelGeometry, hlSet, mapRuntimeReady, selectedItem, selectedParcelId, visibleItems, zoomDisplay]);

  // New coloring, search highlight, or base map: restyle the shapes already on the map.
  useEffect(() => {
    const selectedId = selectedIdRef.current;
    for (const { item, layer } of polygonLayersRef.current.values()) applyStyle(layer, computeStyle(item, "polygon", selectedId));
    for (const { item, layer } of pointLayersRef.current.values()) applyStyle(layer, computeStyle(item, "point", selectedId));
    lastStyledSelectionRef.current = selectedId;
  }, [computeStyle]);

  // New selection: restyle only the previous and the new selected parcel.
  useEffect(() => {
    const previous = lastStyledSelectionRef.current;
    const current = selectedParcelId;
    for (const id of new Set([previous, current])) {
      if (!id) continue;
      const polygon = polygonLayersRef.current.get(id);
      if (polygon) applyStyle(polygon.layer, computeStyleRef.current(polygon.item, "polygon", current));
      const point = pointLayersRef.current.get(id);
      if (point) applyStyle(point.layer, computeStyleRef.current(point.item, "point", current));
    }
    const selectedPolygon = current ? polygonLayersRef.current.get(current) : null;
    if (selectedPolygon) selectedPolygon.layer.bringToFront();
    lastStyledSelectionRef.current = current;
  }, [selectedParcelId]);

  // Neighborhood and association outlines: rebuilt only when turned on or off, or when crossing the zoom threshold.
  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    if (!map || !L || !rendererRef.current) return;
    const store = boundaryLayersRef.current;
    const boundariesVisible = zoomDisplay >= BOUNDARY_RENDER_MIN_ZOOM;
    const build = (features, styleForFeature) => {
      const group = L.layerGroup();
      let count = 0;
      for (const feature of features) {
        const baseStyle = styleForFeature(feature);
        const hoverStyle = { ...baseStyle, weight: baseStyle.weight + 1.4, opacity: 1 };
        let drew = false;
        for (const ring of feature.rings) {
          if (!Array.isArray(ring) || ring.length < 3) continue;
          const layer = L.polyline(ring, { renderer: rendererRef.current, ...baseStyle });
          layer.on("mouseover", () => layer.setStyle(hoverStyle));
          layer.on("mouseout", () => layer.setStyle(baseStyle));
          layer.bindTooltip(escapeHtml(feature.label), { sticky: true, direction: "top", opacity: 0.9 });
          layer.addTo(group);
          drew = true;
        }
        if (drew) count += 1;
      }
      return { group, count };
    };
    const sync = (key, show, features, styleForFeature) => {
      const existing = store[key];
      if (!show) {
        if (existing) map.removeLayer(existing.group);
        store[key] = null;
        return 0;
      }
      if (existing && existing.features === features) return existing.count;
      if (existing) map.removeLayer(existing.group);
      const built = build(features, styleForFeature);
      built.group.addTo(map);
      store[key] = { ...built, features };
      return built.count;
    };
    const neighborhoods = sync("neighborhoods", boundariesVisible && showNeighborhoodOverlay && hasNeighborhoodOverlayData, neighborhoodFeatures,
      feature => ({ color: colorForBoundaryLabel(feature.label), weight: residentMode ? 4.4 : 3.6, opacity: residentMode ? 0.96 : 0.88 }));
    const associations = sync("associations", boundariesVisible && advanced && showAssociationOverlay && hasAssociationOverlayData, associationFeatures,
      feature => ({ color: colorForBoundaryLabel(feature.label), weight: 4.2, opacity: 0.88, dashArray: "10 6" }));
    setRenderStats(prev => (prev.neighborhoods === neighborhoods && prev.associations === associations ? prev : { ...prev, neighborhoods, associations }));
  }, [advanced, associationFeatures, hasAssociationOverlayData, hasNeighborhoodOverlayData, mapRuntimeReady, neighborhoodFeatures, residentMode, showAssociationOverlay, showNeighborhoodOverlay, zoomDisplay]);

  // Grievance map: "Subject" and "Comp N" labels.
  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    if (!map || !L) return;
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }
    if (!compactMode) return;
    const labelLayer = L.layerGroup();
    const labeledKeys = new Set();
    for (const item of visibleItems) {
      const parcelRole = getParcelRole(item.p);
      if (!parcelRole || (parcelRole.kind !== "subject" && parcelRole.kind !== "compare") || !item.latLng) continue;
      const labelKey = parcelRole.kind === "subject" ? "subject" : `compare-${parcelRole.index}`;
      if (labeledKeys.has(labelKey)) continue;
      labeledKeys.add(labelKey);
      const bubbleBg = parcelRole.kind === "subject" ? "rgba(245,158,11,.96)" : "rgba(37,99,235,.96)";
      const bubbleBorder = parcelRole.kind === "subject" ? "rgba(180,83,9,.88)" : "rgba(29,78,216,.9)";
      const bubbleText = parcelRole.kind === "subject" ? "#7c2d12" : "#ffffff";
      const labelText = parcelRole.kind === "subject" ? "Subject" : `Comp ${parcelRole.index}`;
      L.marker(item.latLng, {
        interactive: false,
        keyboard: false,
        zIndexOffset: parcelRole.kind === "subject" ? 1400 : 1300,
        icon: L.divIcon({
          className: "compact-map-label",
          iconSize: [parcelRole.kind === "subject" ? 74 : 60, 36],
          iconAnchor: [parcelRole.kind === "subject" ? 37 : 30, 34],
          html: `<div style="transform:translate(-50%,-120%);pointer-events:none;">
              <div style="display:inline-flex;align-items:center;justify-content:center;min-width:${parcelRole.kind === "subject" ? 62 : 48}px;height:28px;padding:0 10px;border-radius:999px;background:${bubbleBg};border:1px solid ${bubbleBorder};box-shadow:0 10px 24px rgba(15,23,42,.18);font:700 11px/1 Arial,sans-serif;color:${bubbleText};white-space:nowrap;">${labelText}</div>
            </div>`,
        }),
      }).addTo(labelLayer);
    }
    if (labeledKeys.size) {
      labelLayer.addTo(map);
      labelLayerRef.current = labelLayer;
    }
  }, [compactMode, getParcelRole, mapRuntimeReady, visibleItems]);


  // Change view: a dot on every changed or new parcel, drawn above the shapes and visible at every zoom. The dots use
  // their own click-through SVG layer so clicks still reach the parcel shapes underneath.
  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    if (!map || !L) return;
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }
    if (compactMode || colorMode !== "change" || !changeSummary || !highlightRendererRef.current) return;
    const group = L.layerGroup();
    for (const row of changeSummary.rows) {
      const id = row.item.p.parcelId;
      const marker = L.circleMarker(row.item.latLng, { renderer: highlightRendererRef.current, radius: 6.5, color: "#ffffff", weight: 2, opacity: 1, fillColor: changeColor(row), fillOpacity: 0.95 });
      marker.on("click", evt => { L.DomEvent.stopPropagation(evt); setSelectedParcelId(id); });
      marker.bindTooltip(`${escapeHtml(row.item.p.address || id)}<br/>${escapeHtml(changeLabel(row))}`, { direction: "top", opacity: 0.94 });
      marker.addTo(group);
    }
    group.addTo(map);
    highlightLayerRef.current = group;
  }, [changeSummary, colorMode, compactMode, mapRuntimeReady]);

  const mapStatusText = mapStatus || (
    zoomDisplay < BOUNDARY_RENDER_MIN_ZOOM ? "Zoom in to see property boundaries."
      : !hasParcelGeometry ? "Property boundaries are still loading, so properties show as points for now."
      : renderStats.pointCapped ? "Some markers are hidden at this zoom level to keep the map fast. Zoom in to see all of them."
      : "Click a property to see its details."
  );

  const openSelectedRecord = useCallback(() => {
    if (!selectedParcel || !onDrill) return;
    onDrill({ title: `Map selection: ${selectedParcel.address || selectedParcel.parcelId}`, parcels: [selectedParcel] });
  }, [onDrill, selectedParcel]);

  const selectedWarnings = selectedParcel ? getParcelWarnings(selectedParcel) : [];
  const selectedParcelMapsUrl = selectedParcel ? googleMapsPropertyUrl({ address: selectedParcel.address, zip: selectedParcel.zip, latLng: selectedItem?.latLng }) : null;
  const selectedStreetViewUrl = selectedParcel
    ? ((typeof streetViewUrlForParcel === "function" ? streetViewUrlForParcel(selectedParcel) : null) || googleStreetViewUrl({ latLng: selectedItem?.latLng }))
    : null;
  const visibleAreaGoogleUrl = googleMapsAreaUrl({
    center: viewport ? [(viewport.south + viewport.north) / 2, (viewport.west + viewport.east) / 2] : ALBANY_DEFAULT_CENTER,
    zoom: zoomDisplay || ALBANY_DEFAULT_ZOOM,
    satellite: baseLayer === "aerial",
  });
  const googleAreaLink = (
    <a href={visibleAreaGoogleUrl} target="_blank" rel="noopener noreferrer" title="Open the area shown on this map in Google Maps (new tab)" aria-label="Open the area shown on this map in Google Maps (opens in a new tab)" style={{ ...GOOGLE_LINK, fontSize: 11 }}>
      Open this area in Google Maps <span aria-hidden="true">↗</span>
    </a>
  );
  const selectedInventoryRows = selectedParcel && hasInventoryProfile(selectedParcel)
    ? [
        ["Building style", inventoryStyle(selectedParcel) || "Not available"],
        ["Year built", inventoryYearBuilt(selectedParcel) || "Not available"],
        ["Living area", inventorySqft(selectedParcel) ? `${inventorySqft(selectedParcel).toLocaleString()} sq ft` : "Not available"],
        ["Bedrooms / baths", [
          inventoryBedrooms(selectedParcel) != null ? `${inventoryBedrooms(selectedParcel)} bed` : null,
          inventoryBathText(selectedParcel) || null,
        ].filter(Boolean).join(" | ") || "Not available"],
      ]
    : [];
  const selectedOwnerPortfolio = useMemo(() => {
    if (!selectedParcel || typeof getOwnerPortfolioGroup !== "function") return null;
    const group = getOwnerPortfolioGroup(selectedParcel);
    return group && group.propertyCount > 1 && Array.isArray(group.parcels) ? group : null;
  }, [getOwnerPortfolioGroup, selectedParcel]);
  const selectedInCompare = selectedParcel ? compareIds.has(normalizeParcelId(selectedParcel.parcelId)) : false;
  const selectedParcelRole = selectedParcel ? getParcelRole(selectedParcel) : null;
  const compactCompareCount = compareList.length;
  const overlayNotice = useMemo(() => {
    if (compactMode) {
      if (!hasParcelGeometry) return "Parcel boundary geometry is unavailable for one or more selected parcels, so point locations are shown where needed.";
      if (renderStats.pointCapped || renderStats.polygonCapped) return "This map view is trimmed for speed. Zoom in for complete parcel detail.";
      return "Only your parcel and the grievance comps currently included in the package are shown here.";
    }
    if (zoomDisplay < BOUNDARY_RENDER_MIN_ZOOM) return "Zoom in, or search an address above, to see property boundaries.";
    if (renderStats.pointCapped) return "Some markers are hidden at this zoom level. Zoom in to see all of them.";
    if (!hasParcelGeometry) return "Point locations are active because parcel boundary geometry is not loaded.";
    return null;
  }, [compactMode, hasParcelGeometry, renderStats.pointCapped, renderStats.polygonCapped, zoomDisplay]);

  return (
    <div className="fi">
      {!compactMode ? (
        <>
          <SectionTitle>Map</SectionTitle>
          <Sub>{hasParcelGeometry
            ? "Search an address or click a property to see its details. Choose how to color properties, switch to aerial photos, and copy a link to share exactly what you see."
            : "Property boundaries are still loading, so properties are shown as points for now."}</Sub>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 700, marginRight: 4 }}>Color properties by</span>
                {colorModes.map(mode => (
                  <button key={mode.id} type="button" onClick={() => setColorBy(mode.id)} aria-pressed={colorMode === mode.id} style={{ background: colorMode === mode.id ? (advanced ? "var(--teal)" : "var(--blue)") : "var(--card2)", border: `1px solid ${colorMode === mode.id ? (advanced ? "var(--teal)" : "var(--blue)") : "var(--border)"}`, color: colorMode === mode.id ? "white" : "var(--gray)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{mode.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "var(--gray2)", lineHeight: 1.6, background: colorMode === "change" && changeSummary ? "rgba(254,243,199,.7)" : "rgba(255,255,255,.72)", border: `1px solid ${colorMode === "change" && changeSummary ? "rgba(217,119,6,.35)" : "var(--border)"}`, borderRadius: 10, padding: "8px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {colorMode === "change" && changeSummary ? (
                  <>
                    <span style={{ flex: "1 1 320px" }}><b style={{ color: "var(--white)", fontSize: 13 }}>{changeSummary.changed.toLocaleString()} properties changed since {priorYear}</b>: {changeSummary.up.toLocaleString()} went up and {changeSummary.down.toLocaleString()} went down{changeSummary.added ? `, plus ${changeSummary.added.toLocaleString()} new or renumbered parcels` : ""}. Each one has a dot on the map; everything else kept the same assessment.</span>
                    <button type="button" onClick={() => openChangeList("all")} style={{ background: "var(--blue)", color: "white", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>List them</button>
                  </>
                ) : activeColorMode.help}
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 700 }}>Base map</span>
                <div role="group" aria-label="Base map" style={{ display: "inline-flex", border: "1px solid var(--border2)", borderRadius: 8, overflow: "hidden" }}>
                  {[["street", "Street map"], ["aerial", "Aerial photo"]].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setBaseLayer(id)} aria-pressed={baseLayer === id} style={{ background: baseLayer === id ? "var(--blue)" : "var(--card)", color: baseLayer === id ? "white" : "var(--gray)", border: "none", padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>
                {advanced ? (
                  <>
                    <button onClick={() => setShowPropertyOverlay(v => !v)} disabled={!hasParcelGeometry} style={{ background: (hasParcelGeometry && showPropertyOverlay) ? "rgba(13,148,136,.16)" : "var(--card2)", border: `1px solid ${(hasParcelGeometry && showPropertyOverlay) ? "rgba(13,148,136,.35)" : "var(--border)"}`, color: hasParcelGeometry ? (showPropertyOverlay ? "var(--teal2)" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasParcelGeometry ? "pointer" : "not-allowed", opacity: hasParcelGeometry ? 1 : .72 }}>Parcel boundaries</button>
                    <button onClick={() => setShowParcelPoints(v => !v)} style={{ background: showParcelPoints ? "rgba(37,99,235,.16)" : "var(--card2)", border: `1px solid ${showParcelPoints ? "rgba(37,99,235,.35)" : "var(--border)"}`, color: showParcelPoints ? "var(--blue3)" : "var(--gray)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{hasParcelGeometry ? "Show point markers" : "Point locations"}</button>
                    <button onClick={() => setShowNeighborhoodOverlay(v => !v)} disabled={!hasNeighborhoodOverlayData} style={{ background: showNeighborhoodOverlay ? "rgba(29,78,216,.14)" : "var(--card2)", border: `1px solid ${showNeighborhoodOverlay ? "rgba(29,78,216,.28)" : "var(--border)"}`, color: hasNeighborhoodOverlayData ? (showNeighborhoodOverlay ? "#1d4ed8" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasNeighborhoodOverlayData ? "pointer" : "not-allowed", opacity: hasNeighborhoodOverlayData ? 1 : .72 }}>Neighborhood boundaries</button>
                    <button onClick={() => setShowAssociationOverlay(v => !v)} disabled={!hasAssociationOverlayData} style={{ background: showAssociationOverlay ? "rgba(124,58,237,.14)" : "var(--card2)", border: `1px solid ${showAssociationOverlay ? "rgba(124,58,237,.28)" : "var(--border)"}`, color: hasAssociationOverlayData ? (showAssociationOverlay ? "#7c3aed" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasAssociationOverlayData ? "pointer" : "not-allowed", opacity: hasAssociationOverlayData ? 1 : .72 }}>Association boundaries</button>
                  </>
                ) : (
                  <button onClick={() => setShowNeighborhoodOverlay(v => !v)} disabled={!hasNeighborhoodOverlayData} style={{ background: showNeighborhoodOverlay ? "rgba(29,78,216,.14)" : "var(--card2)", border: `1px solid ${showNeighborhoodOverlay ? "rgba(29,78,216,.28)" : "var(--border)"}`, color: hasNeighborhoodOverlayData ? (showNeighborhoodOverlay ? "#1d4ed8" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasNeighborhoodOverlayData ? "pointer" : "not-allowed", opacity: hasNeighborhoodOverlayData ? 1 : .72 }}>Neighborhood boundaries</button>
                )}
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={() => stepZoom(1)} aria-label="Zoom in" style={{ ...SI, width: 40, height: 40, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>+</button>
                  <button onClick={() => stepZoom(-1)} aria-label="Zoom out" style={{ ...SI, width: 40, height: 40, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>-</button>
                  <button onClick={resetView} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Reset view</button>
                  <button type="button" onClick={copyViewLink} title="Copy a link that reopens this map view, coloring, and selected property" style={{ ...SI, fontSize: 11, padding: "7px 11px", fontWeight: 700, color: linkCopied === "copied" ? "var(--green2)" : (linkCopied === "failed" ? "var(--red2)" : "var(--white)") }}>{linkCopied === "copied" ? "Link copied" : linkCopied === "failed" ? "Copy failed; use the address bar" : "Copy link to this view"}</button>
                  {googleAreaLink}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <AddressAutocompleteInput id="map-search" ariaLabel="Search the map by address, owner, or parcel ID" parcels={parcels} value={addrSearch} onChange={setAddrSearch} onSelectParcel={p => { setAddrSearch(p.address); focusParcel(p.parcelId, 18); }} onEnter={() => { if (searchMatches[0]) focusParcel(searchMatches[0].parcelId, 18); }} placeholder="Search address, owner, or parcel ID" inputStyle={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none" }} wrapperStyle={{ flex: 1, minWidth: 220 }} />
                {addrSearch && <button onClick={() => setAddrSearch("")} style={{ ...SI, fontSize: 11, padding: "7px 11px", background: "rgba(220,38,38,.15)", borderColor: "rgba(220,38,38,.30)" }}>Clear</button>}
                {searchMatches.length > 1 && <button onClick={fitSearchMatches} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Fit matches</button>}
                <span style={{ fontSize: 12, color: hlSet ? "var(--amber2)" : "var(--gray3)", whiteSpace: "nowrap" }}>{hlSet ? `${hlSet.size.toLocaleString()} matches` : ""}</span>
                <span style={{ fontSize: 12, color: "var(--gray2)" }}>{mapStatusText}</span>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card style={{ marginBottom: 14, background: "rgba(37,99,235,.05)", border: "1px solid rgba(37,99,235,.16)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0, flex: "1 1 320px" }}>
              <div style={{ fontSize: 11, color: "var(--blue3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 1 }}>{compactTitle || "Visual evidence map"}</div>
              <div style={{ fontSize: 12, color: "var(--gray2)", lineHeight: 1.6, marginTop: 6 }}>{compactSubtitle || `This simplified map shows your property and the ${compactCompareCount} comparable home${compactCompareCount === 1 ? "" : "s"} currently included in the grievance package.`}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge color="#f59e0b">Subject parcel</Badge>
              <Badge color="#2563eb">{compactCompareCount} grievance comp{compactCompareCount === 1 ? "" : "s"}</Badge>
              <div role="group" aria-label="Base map" style={{ display: "inline-flex", border: "1px solid var(--border2)", borderRadius: 8, overflow: "hidden" }}>
                {[["street", "Street map"], ["aerial", "Aerial photo"]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => setBaseLayer(id)} aria-pressed={baseLayer === id} style={{ background: baseLayer === id ? "var(--blue)" : "var(--card)", color: baseLayer === id ? "white" : "var(--gray)", border: "none", padding: "7px 11px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              <button onClick={resetView} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Reset view</button>
              {googleAreaLink}
            </div>
          </div>
        </Card>
      )}

      <div className="leaflet-layout">
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 11, color: compactMode ? "var(--blue3)" : "var(--teal2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{compactMode ? "Grievance comparable map (app map)" : "App map"}</div>
              <div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 4 }}>{compactMode ? "Only the subject parcel and the currently included grievance comps are shown." : (hasParcelGeometry ? "Zoom in to see property boundaries; zoom in further to see individual properties." : "Property boundaries are still loading, so properties show as points for now.")}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--gray2)" }}>{selectedParcel ? `Selected parcel ${selectedParcel.parcelId}` : (compactMode ? `${Math.max(renderStats.visible - compactCompareCount, 0)} subject + ${compactCompareCount} comp${compactCompareCount === 1 ? "" : "s"}` : `${renderStats.visible.toLocaleString()} visible parcels`)}</div>
          </div>
          <div style={{ position: "relative", borderTop: "none" }}>
            {!mapRuntimeReady ? (
              <div style={{ height: "min(620px, 70vh)", display: "grid", placeItems: "center", background: "#dbe4ee", padding: 24 }}>
                <div style={{ maxWidth: 520, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800 }}>The map could not load</div>
                  <div style={{ fontSize: 14, color: "var(--gray2)", lineHeight: 1.7, marginTop: 10 }}>The base mapping assets did not load. Check internet access for the browser session, then refresh.</div>
                </div>
              </div>
            ) : (
              <div ref={mapElRef} style={{ height: "min(620px, 70vh)", width: "100%", background: "#dbe4ee" }} />
            )}
            {overlayNotice && (
              <div style={{ position: "absolute", top: 14, left: 14, maxWidth: 360, background: "rgba(248,250,252,0.96)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 12, padding: "10px 12px", fontSize: 12, color: "#0f172a", boxShadow: "0 8px 20px rgba(15,23,42,.08)" }}>
                {overlayNotice}
              </div>
            )}
            <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", pointerEvents: "none" }}>
              <div style={{ background: "rgba(248,250,252,0.94)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10, padding: "8px 10px", fontSize: 11, color: "#0f172a" }}>{compactMode ? `1 subject parcel | ${compactCompareCount} grievance comp${compactCompareCount === 1 ? "" : "s"} | ${renderStats.polygons.toLocaleString()} parcel boundaries | ${renderStats.points.toLocaleString()} markers` : `${renderStats.visible.toLocaleString()} visible parcels | ${renderStats.polygons.toLocaleString()} parcel boundaries | ${renderStats.points.toLocaleString()} markers${renderStats.neighborhoods ? ` | ${renderStats.neighborhoods.toLocaleString()} neighborhood outlines` : ""}${renderStats.associations ? ` | ${renderStats.associations.toLocaleString()} association outlines` : ""}`}</div>
              <div style={{ background: "rgba(248,250,252,0.94)", border: "1px solid rgba(15,23,42,0.08)", borderRadius: 10, padding: "8px 10px", fontSize: 11, color: "#0f172a" }}>Scroll to zoom | Drag to pan | Click to inspect | Double-click parcel to fit</div>
            </div>
          </div>
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", background: compactMode ? "rgba(239,246,255,.78)" : "rgba(248,250,252,.9)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.55 }}>
              {aerialBase
                ? <>Aerial photos (2024): <a href={AERIAL_INFO_URL} target="_blank" rel="noreferrer" style={{ color: "var(--blue3)", fontWeight: 700, textDecoration: "underline" }}>NYS ITS Geospatial Services</a>. Property outlines come from the City's parcel file and can be off by a few feet.</>
                : <>Map tiles and attribution: <a href={OPENSTREETMAP_COPYRIGHT_URL} target="_blank" rel="noreferrer" style={{ color: "var(--blue3)", fontWeight: 700, textDecoration: "underline" }}>OpenStreetMap contributors</a></>}
            </div>
            {!aerialBase && <a href={OPENSTREETMAP_FIX_MAP_URL} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "var(--blue3)", fontWeight: 700, textDecoration: "underline", whiteSpace: "nowrap" }}>
              Report a map issue
            </a>}
          </div>
        </Card>

        <Card style={{ padding: 0, overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: compactMode ? "var(--blue3)" : (advanced ? "var(--teal2)" : "var(--blue3)"), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{selectedParcel ? "Selected parcel" : "Map inspector"}</div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, marginTop: 6, minWidth: 0, lineHeight: 1.08, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel ? (selectedParcel.address || selectedParcel.parcelId) : (addrSearch ? "Search results" : "Use the map")}</div>
            </div>
            {selectedParcel && !compactMode && <button onClick={() => setSelectedParcelId(null)} aria-label="Close selected parcel" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--gray2)", borderRadius: 999, width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>x</button>}
          </div>
          <div ref={inspectorBodyRef} style={{ padding: "14px 16px", display: "grid", gap: 14, minWidth: 0, scrollMarginTop: 16 }}>
            {selectedParcel ? <>
              {!compactMode && colorMode === "change" && changeSummary && filteredChangeRows.length > 0 && (() => {
                // Step through the changed properties (in the list's order and filter) without leaving the map.
                const index = filteredChangeRows.findIndex(row => row.item.p.parcelId === selectedParcel.parcelId);
                const total = filteredChangeRows.length;
                const goTo = position => focusParcel(filteredChangeRows[(position + total) % total].item.p.parcelId, 18);
                const current = index >= 0 ? filteredChangeRows[index] : null;
                const stepButton = { background: "var(--card)", border: "1px solid var(--border2)", color: "var(--blue3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", minHeight: 34 };
                return (
                  <div style={{ background: "rgba(254,243,199,.6)", border: "1px solid rgba(217,119,6,.35)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 8, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, color: "var(--white)", fontWeight: 700 }}>
                        {current ? `Changed property ${index + 1} of ${total.toLocaleString()}` : `Not one of the ${total.toLocaleString()} changed properties`}
                      </span>
                      {current && changePill(current)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => goTo(index >= 0 ? index - 1 : total - 1)} aria-label="Previous changed property" style={stepButton}>◀ Previous</button>
                      <button type="button" onClick={() => goTo(index >= 0 ? index + 1 : 0)} aria-label="Next changed property" style={stepButton}>Next ▶</button>
                      <button type="button" onClick={() => openChangeList(changeFilter)} style={{ ...stepButton, color: "var(--gray)" }}>Back to the list</button>
                    </div>
                  </div>
                );
              })()}
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch", minWidth: 0 }}>
                  <button onClick={() => focusParcel(selectedParcel.parcelId, 18)} style={{ background: advanced ? "var(--teal)" : "var(--blue)", color: "white", border: "none", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: "1 1 150px", minWidth: 0 }}>Zoom to property on app map</button>
                  {!compactMode && typeof onCompare === "function" && <button onClick={() => onCompare(selectedParcel)} style={{ background: selectedInCompare ? "rgba(37,99,235,.15)" : "var(--card2)", border: `1px solid ${selectedInCompare ? "rgba(37,99,235,.35)" : "var(--border)"}`, color: selectedInCompare ? "var(--blue3)" : "var(--gray)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: "1 1 150px", minWidth: 0 }}>{selectedInCompare ? "In Compare" : "+ Compare"}</button>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                  {selectedParcelMapsUrl && <a href={selectedParcelMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${selectedParcel.address || selectedParcel.parcelId} in Google Maps (opens in a new tab)`} style={{ ...GOOGLE_LINK, padding: "9px 13px", borderRadius: 9, flex: "1 1 150px", justifyContent: "center" }}>Open in Google Maps <span aria-hidden="true">↗</span></a>}
                  {selectedStreetViewUrl && <a href={selectedStreetViewUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open Google Street View near ${selectedParcel.address || selectedParcel.parcelId} (opens in a new tab)`} style={{ ...GOOGLE_LINK, padding: "9px 13px", borderRadius: 9, flex: "1 1 150px", justifyContent: "center" }}>Street View <span aria-hidden="true">↗</span></a>}
                </div>
                <div style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.5 }}>Google Maps and Street View open in a new tab.</div>
              </div>
              {!compactMode && typeof renderPropertyDetails === "function" ? (
                <>
                  {(() => {
                    const sqftComparison = valuePerSqftComparison(selectedParcel);
                    if (!sqftComparison) return null;
                    const difference = Math.round((sqftComparison.ratio - 1) * 100);
                    return (
                      <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Value per square foot</div>
                        <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6, lineHeight: 1.6 }}>
                          {$f(Math.round(sqftComparison.value))} of assessed value per sq ft of living space. The typical home in {sqftComparison.scope} is {$f(Math.round(sqftComparison.reference))}
                          {Math.abs(difference) < 5 ? ", about the same." : `, so this one is ${Math.abs(difference)}% ${difference > 0 ? "higher" : "lower"}.`}
                          {" "}Lot size, condition, and features also affect value; Check My Assessment compares similar homes.
                        </div>
                      </div>
                    );
                  })()}
                  {renderPropertyDetails(selectedParcel, parcel => focusParcel(parcel.parcelId, 18))}
                </>
              ) : (
                <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", minWidth: 0 }}>
                  {compactMode && selectedParcelRole?.kind === "subject" && <Badge color="#f59e0b">Subject parcel</Badge>}
                  {compactMode && selectedParcelRole?.kind === "compare" && <Badge color="#2563eb">{selectedParcelRole.label}</Badge>}
                  <Badge color="#6366f1">{propClassLabel(selectedParcel)}</Badge>
                  <Badge color={selectedItem?.geom ? "#0d9488" : "#f59e0b"}>{selectedItem?.geom ? "Boundary loaded" : "Point location only"}</Badge>
                  {eqFlagFast(selectedParcel) !== "fair" && eqFlagFast(selectedParcel) !== "neutral" && <Badge color={FC[eqFlagFast(selectedParcel)]}>{`Record check: ${FL[eqFlagFast(selectedParcel)].toLowerCase()}`}</Badge>}
                  {isAbsenteeFast(selectedParcel) && <Badge color="#f97316">Owner likely lives elsewhere</Badge>}
                </div>
                {!compactMode && isAbsenteeFast(selectedParcel) && <details style={{ background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.18)", borderRadius: 8, padding: "8px 10px" }}><summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, fontWeight: 700, color: "#c2410c", fontFamily: "var(--fm)" }}>Why flagged as absentee?</summary><div style={{ display: "grid", gap: 4, marginTop: 8 }}><div style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.5 }}>{getAbsenteeModelFast(selectedParcel).label} ({getAbsenteeModelFast(selectedParcel).confidence}, score {getAbsenteeModelFast(selectedParcel).score})</div>{(getAbsenteeModelFast(selectedParcel).signals?.length ? getAbsenteeModelFast(selectedParcel).signals : ["No strong off-site ownership signal."]).map((signal, idx) => <div key={`${selectedParcel.parcelId}-absentee-${idx}`} style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.45 }}>{signal}</div>)}</div></details>}
                {(() => {
                  const p = selectedParcel;
                  const prior = typeof priorOf === "function" ? priorOf(p) : null;
                  const changeText = typeof describeChangeShort === "function" ? describeChangeShort(p) : null;
                  const exemptions = Array.isArray(p.exemptions) ? p.exemptions : [];
                  const sqftComparison = valuePerSqftComparison(p);
                  const sqftDifference = sqftComparison ? Math.round((sqftComparison.ratio - 1) * 100) : null;
                  const box = { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 };
                  const label = { fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 };
                  return (
                    <div className="metric-grid-2" style={{ display: "grid", gap: 10, minWidth: 0 }}>
                      <div style={box}>
                        <div style={label}>Assessed value</div>
                        <div style={{ fontFamily: "var(--fd)", fontSize: 21, fontWeight: 800, marginTop: 5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{$f(p.assessedValue)}</div>
                        {(changeText || (priorYear && !prior)) && <div style={{ fontSize: 12, color: "var(--gray)", marginTop: 4, lineHeight: 1.5 }}>{changeText || `Not on the ${priorYear} roll`}</div>}
                        <div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 4, lineHeight: 1.5 }}>City's full-value estimate {$f(p.fullMarketValue)}</div>
                      </div>
                      <div style={box}>
                        <div style={label}>Taxable value</div>
                        <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6, lineHeight: 1.7, fontFamily: "var(--fm)" }}>
                          <div>County {$f(p.countyTaxable)}</div>
                          <div>City {$f(p.cityTaxable)}</div>
                          <div>School {$f(p.schoolTaxable)}</div>
                        </div>
                      </div>
                      <div style={box}><div style={label}>Owner</div><div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.owner1 || "Unknown owner"}</div><div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 4, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.mailAddress || "Mailing address not available"}</div><div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 6, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.neighborhood || p.neighborhoodAssociation || "Neighborhood unknown"}{p.neighborhoodAssociation && p.neighborhoodAssociation !== p.neighborhood ? ` | ${p.neighborhoodAssociation}` : ""}</div></div>
                      <div style={box}>
                        <div style={label}>Exemptions and credits</div>
                        <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6, lineHeight: 1.6, display: "grid", gap: 4 }}>
                          {exemptions.length
                            ? exemptions.map((ex, idx) => <div key={`${ex.code}-${idx}`}>{typeof ExemptionTerm === "function" ? <ExemptionTerm ex={ex} /> : ex.name}</div>)
                            : <div>None recorded</div>}
                        </div>
                      </div>
                      {sqftComparison && (
                        <div style={{ ...box, gridColumn: "1 / -1" }}>
                          <div style={label}>Value per square foot</div>
                          <div style={{ fontSize: 13, color: "var(--gray)", marginTop: 6, lineHeight: 1.6 }}>
                            {$f(Math.round(sqftComparison.value))} of assessed value per sq ft of living space. The typical home in {sqftComparison.scope} is {$f(Math.round(sqftComparison.reference))}
                            {Math.abs(sqftDifference) < 5 ? ", about the same." : `, so this one is ${Math.abs(sqftDifference)}% ${sqftDifference > 0 ? "higher" : "lower"}.`}
                            {" "}Lot size, condition, and features also affect value; Check My Assessment compares similar homes.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {selectedInventoryRows.length > 0 && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Residential profile</div>
                    <div className="metric-grid-2" style={{ display: "grid", gap: 10, marginTop: 10, minWidth: 0 }}>
                      {selectedInventoryRows.map(([label, value]) => (
                        <div key={label} style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: "var(--gray3)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: 13, color: "var(--gray)", lineHeight: 1.55, marginTop: 5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!compactMode && selectedOwnerPortfolio && (
                  <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => setOwnerPortfolioOpen(v => !v)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "transparent", border: "none", color: "inherit", padding: "12px 14px", cursor: "pointer", textAlign: "left", minWidth: 0 }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Owner portfolio</div>
                        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedOwnerPortfolio.propertyCount.toLocaleString()} parcel{selectedOwnerPortfolio.propertyCount === 1 ? "" : "s"} potentially owned by same owner</div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--blue3)", fontWeight: 700, flexShrink: 0 }}>{ownerPortfolioOpen ? "Hide list" : "Show list"}</div>
                    </button>
                    {ownerPortfolioOpen && (
                      <div style={{ display: "grid", gap: 10, padding: "0 14px 14px", marginTop: -2, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.55 }}>Grouped by normalized owner name across the loaded Albany roll. Verify manually before treating this as confirmed common ownership.</div>
                        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto", paddingRight: 2 }}>
                          {selectedOwnerPortfolio.parcels.map(p => {
                            const current = p.parcelId === selectedParcel.parcelId;
                            return (
                              <button
                                key={p.parcelId}
                                type="button"
                                onClick={() => focusParcel(p.parcelId, 18)}
                                style={{ textAlign: "left", background: current ? "rgba(37,99,235,.10)" : "var(--card)", border: `1px solid ${current ? "rgba(37,99,235,.28)" : "var(--border)"}`, borderRadius: 9, padding: "11px 12px", cursor: "pointer", minWidth: 0 }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap", minWidth: 0 }}>
                                  <div style={{ minWidth: 0, flex: "1 1 180px" }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.address || p.parcelId}</div>
                                    <div style={{ fontSize: 11, color: "var(--gray2)", marginTop: 4, lineHeight: 1.5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{p.parcelId} | {p.neighborhood || "Neighborhood unknown"}{current ? " | Current parcel" : ""}</div>
                                  </div>
                                  <div style={{ textAlign: "right", minWidth: 0, flex: "0 1 auto" }}>
                                    <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--amber)" }}>{$f(p.fullMarketValue)}</div>
                                    <div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 4 }}>{propClassLabel(p)}</div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}              {!compactMode && selectedWarnings.length > 0 && <div style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.22)", borderRadius: 10, padding: "12px 14px" }}>{selectedWarnings.slice(0, 4).map(w => <div key={w} style={{ fontSize: 12, color: "var(--gray2)" }}>{w.replace(/_/g, " ")}</div>)}</div>}
                </>
              )}
            </> : addrSearch ? <>
              <div style={{ display: "grid", gap: 8 }}>
                {searchMatches.length > 0 ? searchMatches.map(p => (
                  <button key={p.parcelId} onClick={() => focusParcel(p.parcelId, 18)} style={{ textAlign: "left", background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{p.address || "Address unavailable"}</div>
                    <div style={{ fontSize: 11, color: "var(--gray2)", marginTop: 3 }}>{p.owner1 || "Unknown owner"} | Parcel {p.parcelId}</div>
                  </button>
                )) : <div style={{ fontSize: 13, color: "var(--gray2)", lineHeight: 1.7 }}>No mapped parcels match that search.</div>}
              </div>
            </> : <>
              {!compactMode && colorMode === "change" && changeSummary && (
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "grid", gap: 10, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Changed since {priorYear}</div>
                  <div style={{ fontSize: 13, color: "var(--gray)", lineHeight: 1.6 }}>
                    <b style={{ color: "var(--white)" }}>{changeSummary.changed.toLocaleString()} properties</b> on the map have a different assessed value than in {priorYear}: {changeSummary.up.toLocaleString()} went up and {changeSummary.down.toLocaleString()} went down{changeSummary.added ? `. ${changeSummary.added.toLocaleString()} more are new or renumbered parcels` : ""}. Click one to see it on the map.
                  </div>
                  <div role="group" aria-label="Filter changed properties" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[["all", `All (${changeSummary.rows.length.toLocaleString()})`], ["up", `Went up (${changeSummary.up.toLocaleString()})`], ["down", `Went down (${changeSummary.down.toLocaleString()})`], ["new", `New (${changeSummary.added.toLocaleString()})`]]
                      .filter(([id]) => id === "all" || (id === "up" ? changeSummary.up : id === "down" ? changeSummary.down : changeSummary.added) > 0)
                      .map(([id, label]) => (
                        <button key={id} type="button" onClick={() => setChangeFilter(id)} aria-pressed={changeFilter === id} style={{ background: changeFilter === id ? "var(--blue)" : "var(--card)", color: changeFilter === id ? "white" : "var(--gray)", border: `1px solid ${changeFilter === id ? "var(--blue)" : "var(--border2)"}`, borderRadius: 999, padding: "5px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{label}</button>
                      ))}
                  </div>
                  <div style={{ display: "grid", gap: 6, maxHeight: 440, overflowY: "auto", paddingRight: 2, minWidth: 0 }}>
                    {filteredChangeRows.map(row => {
                      const p = row.item.p;
                      const prior = typeof priorOf === "function" ? priorOf(p) : null;
                      return (
                        <button key={p.parcelId} type="button" onClick={() => focusParcel(p.parcelId, 18)} style={{ textAlign: "left", background: "var(--card)", border: "1px solid var(--border)", borderLeft: `4px solid ${changeColor(row)}`, borderRadius: 8, padding: "9px 11px", cursor: "pointer", display: "grid", gap: 4, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, overflowWrap: "anywhere" }}>{p.address || p.parcelId}</span>
                            {changePill(row)}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--gray2)", fontFamily: "var(--fm)" }}>
                            {prior ? `${$f(prior.assessedValue)} → ${$f(p.assessedValue)}` : `${$f(p.assessedValue)} (not on the ${priorYear} roll)`}{p.neighborhood ? ` | ${p.neighborhood}` : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {typeof onDrill === "function" && filteredChangeRows.length > 0 && (
                    <button type="button" onClick={() => onDrill({ title: `Properties that changed since ${priorYear}${changeFilter === "all" ? "" : changeFilter === "up" ? " (went up)" : changeFilter === "down" ? " (went down)" : " (new or renumbered)"}`, parcels: filteredChangeRows.map(row => row.item.p) })} style={{ justifySelf: "start", background: "var(--card)", border: "1px solid var(--border2)", color: "var(--blue3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Open this list as a table</button>
                  )}
                </div>
              )}
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Start here</div><div style={{ fontSize: 13, color: "var(--gray2)", lineHeight: 1.7, marginTop: 6 }}>{"Search an address or owner name, or click a parcel directly."}</div></div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button onClick={() => setLegendOpen(prev => ({ ...prev, coloring: !prev.coloring }))} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "transparent", border: "none", color: "inherit", padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Current coloring: {activeColorMode.label}</span><span style={{ fontSize: 12, color: "var(--gray3)" }}>{legendOpen.coloring ? "Hide" : "Show"}</span></button>{legendOpen.coloring && <div style={{ display: "grid", gap: 7, padding: "0 14px 12px", marginTop: -2 }}>{legendItems.filter(([, color]) => legendCountFor(color) > 0).map(([label, color]) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(15,23,42,.28)", flexShrink: 0 }} /><span style={{ fontSize: 12, color: "var(--gray2)" }}>{label}<span style={{ color: "var(--gray3)", fontWeight: 600, whiteSpace: "nowrap" }}>{propertyCountText(legendCountFor(color))}</span></span></div>)}<div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 2 }}>Counts are properties shown on the map ({mapped.length.toLocaleString()} in all).</div></div>}</div>
              {boundaryLegendItems.length > 0 && <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button onClick={() => setLegendOpen(prev => ({ ...prev, boundaries: !prev.boundaries }))} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "transparent", border: "none", color: "inherit", padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Boundary legend</span><span style={{ fontSize: 12, color: "var(--gray3)" }}>{legendOpen.boundaries ? "Hide" : "Show"}</span></button>{legendOpen.boundaries && <div style={{ padding: "0 14px 12px", marginTop: -2 }}><div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 5 }}>{advanced && showAssociationOverlay ? "Neighborhood and association outlines use distinct colors." : "Each neighborhood outline uses a distinct color."}</div><div style={{ display: "grid", gap: 7, marginTop: 10, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>{boundaryLegendItems.map(item => <div key={`${item.kind}:${item.label}`} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 16, height: 0, borderTop: `4px solid ${item.color}`, flexShrink: 0 }} /><span style={{ fontSize: 12, color: "var(--gray2)" }}>{item.label}{(() => { const n = (item.kind === "Association" ? boundaryCounts.associations : boundaryCounts.neighborhoods).get(item.label) || 0; return n > 0 ? <span style={{ color: "var(--gray3)", fontWeight: 600, whiteSpace: "nowrap" }}>{propertyCountText(n)}</span> : null; })()}</span></div>)}</div></div>}</div>}
            </>}
          </div>
        </Card>
      </div>
    </div>
  );
};













