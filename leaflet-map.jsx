
import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { AddressAutocompleteInput } from "./address-autocomplete.jsx";

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

export const LeafletMapView = ({ parcels, parcelGeometry, neighborhoodBoundaries, neighborhoodAssociations, compareList = [], onCompare, onDrill, jumpRequest = null, advanced = true, compactMode = false, subjectParcelId = null, compactTitle = "", compactSubtitle = "", utils }) => {
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
  } = utils;

  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const rendererRef = useRef(null);
  const dynamicLayersRef = useRef([]);
  const pointCacheRef = useRef(new Map());
  const geomCacheRef = useRef(new Map());
  const didFitInitialRef = useRef(false);
  const mountedRef = useRef(false);
  const residentPresetMap = { fairness: "equity", tax_relief: "exemption", ownership: "absentee", market: "fmv" };
  const LEGEND = {
    fmv: [[">$500k", "#f59e0b"], ["$300-500k", "#3b82f6"], ["$150-300k", "#0d9488"], ["<$150k", "#64748b"]],
    equity: [["Under (<80%)", "#f59e0b"], ["Fair (80-120%)", "#22c55e"], ["Over (>120%)", "#dc2626"], ["No data", "#64748b"]],
    class: [["210 Single Family", "#3b82f6"], ["220 Two Family", "#0d9488"], ["230 Three Family", "#06b6d4"], ["411 Apartment", "#a78bfa"], ["400 Commercial", "#f97316"], ["300/330 Vacant", "#64748b"]],
    exemption: [["Has Exemption", "#f59e0b"], ["No Exemption", "#475569"]],
    absentee: [["Owner-Occupied", "#22c55e"], ["Absentee Owner", "#f97316"]],
  };
  const SI = { background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", borderRadius: 8, padding: "7px 11px", fontSize: 12, cursor: "pointer" };

  const normalizedSubjectParcelId = normalizeParcelId(subjectParcelId || "");
  const initialCompactSelectedParcelId = subjectParcelId || null;
  const [colorBy, setColorBy] = useState(advanced ? "fmv" : "equity");
  const [viewPreset, setViewPreset] = useState("fairness");
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

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    setOwnerPortfolioOpen(false);
  }, [selectedParcelId]);
  const [renderStats, setRenderStats] = useState({ visible: 0, polygons: 0, points: 0, neighborhoods: 0, associations: 0, polygonCandidates: 0, pointCandidates: 0, polygonCapped: false, pointCapped: false });

  useEffect(() => {
    if (advanced) return;
    setColorBy(residentPresetMap[viewPreset] || "equity");
    setShowAssociationOverlay(false);
  }, [advanced, viewPreset]);

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

  const colorForParcel = useCallback(p => {
    if (colorBy === "fmv") {
      const v = p.fullMarketValue;
      return v > 500000 ? "#f59e0b" : v > 300000 ? "#3b82f6" : v > 150000 ? "#0d9488" : "#64748b";
    }
    if (colorBy === "equity") return FC[eqFlagFast(p)];
    if (colorBy === "class") return ({ "210": "#3b82f6", "220": "#0d9488", "230": "#06b6d4", "411": "#a78bfa", "400": "#f97316", "300": "#64748b", "330": "#94a3b8" })[p.propClass] || "#94a3b8";
    if (colorBy === "exemption") return p.exemptions?.length > 0 ? "#f59e0b" : "#475569";
    if (colorBy === "absentee") return isAbsenteeFast(p) ? "#f97316" : "#22c55e";
    return "#3b82f6";
  }, [FC, colorBy, eqFlagFast, isAbsenteeFast]);

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
      focusParcel(pending.parcelId, 18);
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
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 20, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    map.setView(ALBANY_DEFAULT_CENTER, ALBANY_DEFAULT_ZOOM);
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
      dynamicLayersRef.current = [];
    };
  }, [mapRuntimeReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !datasetLatLngBounds || didFitInitialRef.current || pendingJumpRef.current || selectedParcelId) return;
    map.fitBounds(datasetLatLngBounds, { padding: [30, 30], maxZoom: 16 });
    didFitInitialRef.current = true;
  }, [datasetLatLngBounds, selectedParcelId]);

  useEffect(() => {
    const map = mapRef.current;
    const L = getLeafletRuntime();
    if (!map || !L || !rendererRef.current) return;

    for (const layer of dynamicLayersRef.current) {
      try { map.removeLayer(layer); } catch {}
    }
    dynamicLayersRef.current = [];

    const neighborhoodLayer = L.layerGroup();
    const associationLayer = L.layerGroup();
    const polygonLayer = L.layerGroup();
    const pointLayer = L.layerGroup();
    const drawBoundaryFeatures = (features, layerGroup, styleForFeature, hoverStyleForFeature) => {
      let featureCount = 0;
      for (const feature of features) {
        let drewFeature = false;
        const baseStyle = styleForFeature(feature);
        const hoverStyle = hoverStyleForFeature(feature, baseStyle);
        for (const ring of feature.rings) {
          if (!Array.isArray(ring) || ring.length < 3) continue;
          const layer = L.polyline(ring, { renderer: rendererRef.current, ...baseStyle });
          layer.on("mouseover", () => layer.setStyle(hoverStyle));
          layer.on("mouseout", () => layer.setStyle(baseStyle));
          layer.bindTooltip(feature.label, { sticky: true, direction: "top", opacity: 0.9 });
          layer.addTo(layerGroup);
          drewFeature = true;
        }
        if (drewFeature) featureCount += 1;
      }
      return featureCount;
    };
    const currentZoom = Number.isFinite(map.getZoom()) ? map.getZoom() : 0;
    const polygonLimit = advanced ? MAX_POLYGON_FEATURES : 1200;
    const pointLimit = advanced ? MAX_POINT_FEATURES : 800;
    const shouldRenderBoundaryOverlays = currentZoom >= BOUNDARY_RENDER_MIN_ZOOM;
    const shouldRenderPolygons = effectiveShowPropertyOverlay && currentZoom >= POLYGON_RENDER_MIN_ZOOM;
    const shouldRenderPoints = currentZoom >= POINT_RENDER_MIN_ZOOM;
    const polygonCandidates = shouldRenderPolygons ? visibleItems.filter(item => item.geom) : [];
    const neighborhoodVisibleCount = shouldRenderBoundaryOverlays && showNeighborhoodOverlay && hasNeighborhoodOverlayData
      ? drawBoundaryFeatures(
          neighborhoodFeatures,
          neighborhoodLayer,
          feature => {
            const color = colorForBoundaryLabel(feature.label);
            return { color, weight: residentMode ? 4.4 : 3.6, opacity: residentMode ? 0.96 : 0.88 };
          },
          (feature, baseStyle) => ({ ...baseStyle, weight: baseStyle.weight + 1.4, opacity: 1 })
        )
      : 0;
    if (neighborhoodVisibleCount) {
      neighborhoodLayer.addTo(map);
      dynamicLayersRef.current.push(neighborhoodLayer);
    }
    const associationVisibleCount = shouldRenderBoundaryOverlays && advanced && showAssociationOverlay && hasAssociationOverlayData
      ? drawBoundaryFeatures(
          associationFeatures,
          associationLayer,
          feature => {
            const color = colorForBoundaryLabel(feature.label);
            return { color, weight: 4.2, opacity: 0.88, dashArray: "10 6" };
          },
          (feature, baseStyle) => ({ ...baseStyle, weight: baseStyle.weight + 1.4, opacity: 1 })
        )
      : 0;
    if (associationVisibleCount) {
      associationLayer.addTo(map);
      dynamicLayersRef.current.push(associationLayer);
    }
    const orderedPolygonItems = selectedItem
      ? [...polygonCandidates.filter(item => item.p.parcelId !== selectedItem.p.parcelId), ...polygonCandidates.filter(item => item.p.parcelId === selectedItem.p.parcelId)]
      : polygonCandidates;
    const polygonItems = orderedPolygonItems.length > polygonLimit
      ? orderedPolygonItems.slice(Math.max(0, orderedPolygonItems.length - polygonLimit))
      : orderedPolygonItems;
    const polygonCapped = orderedPolygonItems.length > polygonItems.length;

    let polygonVisibleCount = 0;
    for (const item of orderedPolygonItems) {
      const latLngs = geometryToLatLng(item.key || item.p.parcelId, item.geom);
      if (!latLngs) continue;
      const isSelected = selectedParcelId === item.p.parcelId;
      const isHighlighted = hlSet ? hlSet.has(item.p.parcelId) : false;
      const isMuted = !!(hlSet && !isHighlighted && !isSelected);
      const parcelRole = compactMode ? getParcelRole(item.p) : null;
      const baseColor = compactMode && parcelRole ? parcelRole.color : colorForParcel(item.p);
      const outlineColor = compactMode && parcelRole ? parcelRole.outline : colorForParcel(item.p);
      const layer = L.polygon(latLngs, {
        renderer: rendererRef.current,
        color: isSelected ? "#0f172a" : (isHighlighted ? "#ffffff" : outlineColor),
        weight: isSelected ? 2.4 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 2.2 : 2.0) : (isHighlighted ? 1.8 : 1.1)),
        opacity: isMuted ? 0.28 : (isSelected ? 0.98 : 0.92),
        fillColor: isSelected ? "#ffffff" : baseColor,
        fillOpacity: isMuted ? 0.16 : (isSelected ? 0.72 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 0.64 : 0.48) : (advanced ? 0.62 : 0.56))),
      });
      layer.on("click", evt => {
        L.DomEvent.stopPropagation(evt);
        setSelectedParcelId(item.p.parcelId);
      });
      layer.on("dblclick", evt => {
        L.DomEvent.stopPropagation(evt);
        focusParcel(item.p.parcelId, 18);
      });
      layer.bindTooltip(`${item.p.address || item.p.parcelId}<br/>${compactMode && parcelRole ? `${parcelRole.label}<br/>` : ""}${item.p.owner1 || "Unknown owner"}`, { sticky: true, direction: "top", opacity: 0.92 });
      layer.addTo(polygonLayer);
      polygonVisibleCount += 1;
    }
    if (polygonVisibleCount) {
      polygonLayer.addTo(map);
      dynamicLayersRef.current.push(polygonLayer);
    }

    let rawPointItems = shouldRenderPoints
      ? visibleItems.filter(item => !item.geom || effectiveShowParcelPoints || !hasParcelGeometry)
      : [];
    if (selectedItem && !rawPointItems.some(item => item.p.parcelId === selectedItem.p.parcelId) && (!selectedItem.geom || effectiveShowParcelPoints || !hasParcelGeometry)) rawPointItems = [...rawPointItems, selectedItem];
    const scorePointPriority = item => (
      (selectedParcelId === item.p.parcelId ? 100 : 0) +
      (hlSet && hlSet.has(item.p.parcelId) ? 50 : 0) +
      (item.pointFallback ? 10 : 0)
    );
    const orderedPointItems = [...rawPointItems].sort((a, b) => scorePointPriority(b) - scorePointPriority(a));
    const pointItems = orderedPointItems.length > pointLimit ? orderedPointItems.slice(0, pointLimit) : orderedPointItems;
    const pointCapped = orderedPointItems.length > pointItems.length;
    let pointVisibleCount = 0;
    for (const item of pointItems) {
      if (item.geom && effectiveShowPropertyOverlay && !effectiveShowParcelPoints && hasParcelGeometry) continue;
      const isSelected = selectedParcelId === item.p.parcelId;
      const isHighlighted = hlSet ? hlSet.has(item.p.parcelId) : false;
      const isMuted = !!(hlSet && !isHighlighted && !isSelected);
      const parcelRole = compactMode ? getParcelRole(item.p) : null;
      const baseColor = compactMode && parcelRole ? parcelRole.color : colorForParcel(item.p);
      const layer = L.circleMarker(item.latLng, {
        renderer: rendererRef.current,
        radius: isSelected ? 8 : (compactMode && parcelRole ? (parcelRole.kind === "subject" ? 7.2 : 6.2) : (isHighlighted ? 6.5 : (item.pointFallback ? 4 : 3.25))),
        color: isSelected ? "#0f172a" : "#ffffff",
        weight: isSelected ? 2 : (compactMode && parcelRole ? 1.5 : 1.1),
        opacity: isMuted ? 0.34 : 0.96,
        fillColor: isSelected ? "#ffffff" : baseColor,
        fillOpacity: isMuted ? 0.18 : (compactMode && parcelRole ? 0.9 : (item.pointFallback ? 0.9 : 0.72)),
      });
      layer.on("click", evt => {
        L.DomEvent.stopPropagation(evt);
        setSelectedParcelId(item.p.parcelId);
      });
      layer.on("dblclick", evt => {
        L.DomEvent.stopPropagation(evt);
        focusParcel(item.p.parcelId, 18);
      });
      layer.bindTooltip(`${item.p.address || item.p.parcelId}<br/>${compactMode && parcelRole ? `${parcelRole.label}<br/>` : ""}${item.p.owner1 || "Unknown owner"}`, { sticky: true, direction: "top", opacity: 0.92 });
      layer.addTo(pointLayer);
      pointVisibleCount += 1;
    }
    if (pointVisibleCount) {
      pointLayer.addTo(map);
      dynamicLayersRef.current.push(pointLayer);
    }
    if (compactMode) {
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
        const marker = L.marker(item.latLng, {
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
        });
        marker.addTo(labelLayer);
      }
      if (labeledKeys.size) {
        labelLayer.addTo(map);
        dynamicLayersRef.current.push(labelLayer);
      }
    }

    setRenderStats({
      visible: visibleItems.length,
      polygons: polygonVisibleCount,
      points: pointVisibleCount,
      neighborhoods: neighborhoodVisibleCount,
      associations: associationVisibleCount,
      polygonCandidates: orderedPolygonItems.length,
      pointCandidates: orderedPointItems.length,
      polygonCapped,
      pointCapped,
    });
    const overlayNames = [
      neighborhoodVisibleCount ? "Neighborhood boundaries" : null,
      associationVisibleCount ? "Association boundaries" : null,
    ].filter(Boolean);
    if (currentZoom < BOUNDARY_RENDER_MIN_ZOOM) {
      setMapStatus(`Zoom to z${BOUNDARY_RENDER_MIN_ZOOM}+ to load neighborhood and parcel boundaries, then z${POINT_RENDER_MIN_ZOOM}+ for parcel locations.`);
    } else if (currentZoom < POINT_RENDER_MIN_ZOOM) {
      setMapStatus(`Neighborhood and parcel boundaries are active. Zoom to z${POINT_RENDER_MIN_ZOOM}+ to load parcel locations.`);
    } else if (polygonCapped || pointCapped) {
      const cappedKinds = [polygonCapped ? "boundaries" : null, pointCapped ? "markers" : null].filter(Boolean).join(" and ");
      setMapStatus(`This view is limiting ${cappedKinds} for performance. Zoom in for full parcel detail.`);
    } else if (!hasParcelGeometry) {
      setMapStatus(overlayNames.length
        ? `Only trusted point locations are shown for parcels. ${overlayNames.join(" and ")} remain active.`
        : "Parcel boundary geometry is not active yet. Only trusted point locations are shown.");
    } else if (effectiveShowPropertyOverlay && currentZoom < POLYGON_RENDER_MIN_ZOOM) {
      setMapStatus(`Zoom to z${POLYGON_RENDER_MIN_ZOOM}+ to load parcel boundaries.${overlayNames.length ? ` ${overlayNames.join(" and ")} remain active.` : ""}`);
    } else {
      setMapStatus(overlayNames.length
        ? `Parcel inspection is active with ${overlayNames.join(" and ")}.`
        : "Parcel boundaries are active on the Leaflet map.");
    }
  }, [advanced, associationFeatures, colorForParcel, effectiveShowParcelPoints, effectiveShowPropertyOverlay, focusParcel, geometryToLatLng, hasAssociationOverlayData, hasNeighborhoodOverlayData, hasParcelGeometry, hlSet, neighborhoodFeatures, residentMode, selectedItem, selectedParcelId, showAssociationOverlay, showNeighborhoodOverlay, visibleItems]);

  const openSelectedRecord = useCallback(() => {
    if (!selectedParcel || !onDrill) return;
    onDrill({ title: `Map selection: ${selectedParcel.address || selectedParcel.parcelId}`, parcels: [selectedParcel] });
  }, [onDrill, selectedParcel]);

  const selectedWarnings = selectedParcel ? getParcelWarnings(selectedParcel) : [];
  const selectedParcelMapsUrl = selectedParcel ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedParcel.address || selectedParcel.parcelId}, Albany, NY ${selectedParcel.zip || ""}`.trim())}` : "#";
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
  const legendItems = LEGEND[colorBy] || [];
  const overlayNotice = useMemo(() => {
    if (compactMode) {
      if (!hasParcelGeometry) return "Parcel boundary geometry is unavailable for one or more selected parcels, so point locations are shown where needed.";
      if (renderStats.pointCapped || renderStats.polygonCapped) return "This map view is trimmed for speed. Zoom in for complete parcel detail.";
      return "Only your parcel and the grievance comps currently included in the package are shown here.";
    }
    if (zoomDisplay < BOUNDARY_RENDER_MIN_ZOOM) return `Zoom in to z${BOUNDARY_RENDER_MIN_ZOOM}+ to load neighborhood and parcel boundaries.`;
    if (zoomDisplay < POINT_RENDER_MIN_ZOOM) return `Parcel boundaries are active. Zoom in to z${POINT_RENDER_MIN_ZOOM}+ to load parcel locations.`;
    if (renderStats.polygonCapped || renderStats.pointCapped) return "This view is trimmed for speed. Zoom in for complete parcel detail.";
    if (!hasParcelGeometry) return "Point locations are active because parcel boundary geometry is not loaded.";
    return null;
  }, [compactMode, hasParcelGeometry, renderStats.pointCapped, renderStats.polygonCapped, zoomDisplay]);

  return (
    <div className="fi">
      {!compactMode ? (
        <>
          <SectionTitle>Application Map</SectionTitle>
          <Sub>{hasParcelGeometry
            ? "Leaflet parcel map with Albany parcel boundaries, ownership overlays, and thematic layers in one unified mapping workspace."
            : "Leaflet parcel map is active, but parcel boundary geometry is still missing so the map is using trusted point fallback where available."}</Sub>
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--gray)", fontWeight: 700 }}>{advanced ? "Color by" : "Resident view"}</span>
                {advanced
                  ? [["fmv", "Market value"], ["equity", "Equity"], ["class", "Class"], ["exemption", "Exemptions"], ["absentee", "Absentee"]].map(([k, l]) => (
                      <button key={k} onClick={() => setColorBy(k)} style={{ background: colorBy === k ? "var(--teal)" : "var(--card2)", border: `1px solid ${colorBy === k ? "var(--teal)" : "var(--border)"}`, color: colorBy === k ? "white" : "var(--gray)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
                    ))
                  : [["fairness", "Assessment Fairness"], ["tax_relief", "Tax Relief"], ["ownership", "Ownership"], ["market", "Market Value"]].map(([k, l]) => (
                      <button key={k} onClick={() => setViewPreset(k)} style={{ background: viewPreset === k ? "var(--blue)" : "var(--card2)", border: `1px solid ${viewPreset === k ? "var(--blue)" : "var(--border)"}`, color: viewPreset === k ? "white" : "var(--gray)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{l}</button>
                    ))}
                {advanced ? (
                  <>
                    <button onClick={() => setShowPropertyOverlay(v => !v)} disabled={!hasParcelGeometry} style={{ background: (hasParcelGeometry && showPropertyOverlay) ? "rgba(13,148,136,.16)" : "var(--card2)", border: `1px solid ${(hasParcelGeometry && showPropertyOverlay) ? "rgba(13,148,136,.35)" : "var(--border)"}`, color: hasParcelGeometry ? (showPropertyOverlay ? "var(--teal2)" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasParcelGeometry ? "pointer" : "not-allowed", opacity: hasParcelGeometry ? 1 : .72 }}>Parcel boundaries</button>
                    <button onClick={() => setShowParcelPoints(v => !v)} style={{ background: showParcelPoints ? "rgba(37,99,235,.16)" : "var(--card2)", border: `1px solid ${showParcelPoints ? "rgba(37,99,235,.35)" : "var(--border)"}`, color: showParcelPoints ? "var(--blue3)" : "var(--gray)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{hasParcelGeometry ? "Show point markers" : "Point locations"}</button>
                    <button onClick={() => setShowNeighborhoodOverlay(v => !v)} disabled={!hasNeighborhoodOverlayData} style={{ background: showNeighborhoodOverlay ? "rgba(29,78,216,.14)" : "var(--card2)", border: `1px solid ${showNeighborhoodOverlay ? "rgba(29,78,216,.28)" : "var(--border)"}`, color: hasNeighborhoodOverlayData ? (showNeighborhoodOverlay ? "#1d4ed8" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasNeighborhoodOverlayData ? "pointer" : "not-allowed", opacity: hasNeighborhoodOverlayData ? 1 : .72 }}>Neighborhood boundaries</button>
                    <button onClick={() => setShowAssociationOverlay(v => !v)} disabled={!hasAssociationOverlayData} style={{ background: showAssociationOverlay ? "rgba(124,58,237,.14)" : "var(--card2)", border: `1px solid ${showAssociationOverlay ? "rgba(124,58,237,.28)" : "var(--border)"}`, color: hasAssociationOverlayData ? (showAssociationOverlay ? "#7c3aed" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasAssociationOverlayData ? "pointer" : "not-allowed", opacity: hasAssociationOverlayData ? 1 : .72 }}>Association boundaries</button>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", flex: 1 }}>
                    <div style={{ fontSize: 12, color: "var(--gray2)", lineHeight: 1.6, background: "rgba(255,255,255,.72)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", flex: "1 1 280px" }}>
                      {({ fairness: "Compare assessment fairness across nearby parcels.", tax_relief: "See where exemptions are already on record.", ownership: "Highlight likely absentee ownership across the neighborhood.", market: "View parcel values without opening research controls." })[viewPreset]}
                    </div>
                    <button onClick={() => setShowNeighborhoodOverlay(v => !v)} disabled={!hasNeighborhoodOverlayData} style={{ background: showNeighborhoodOverlay ? "rgba(29,78,216,.14)" : "var(--card2)", border: `1px solid ${showNeighborhoodOverlay ? "rgba(29,78,216,.28)" : "var(--border)"}`, color: hasNeighborhoodOverlayData ? (showNeighborhoodOverlay ? "#1d4ed8" : "var(--gray)") : "var(--gray3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: hasNeighborhoodOverlayData ? "pointer" : "not-allowed", opacity: hasNeighborhoodOverlayData ? 1 : .72 }}>Neighborhood boundaries</button>
                  </div>
                )}
                <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
                  <button onClick={() => stepZoom(1)} style={{ ...SI, width: 34, height: 34, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>+</button>
                  <button onClick={() => stepZoom(-1)} style={{ ...SI, width: 34, height: 34, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>-</button>
                  <button onClick={resetView} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Reset view</button>
                  <span style={{ fontSize: 11, color: "var(--gray2)", fontFamily: "var(--fm)", minWidth: 54, textAlign: "right" }}>{zoomDisplay ? `z${zoomDisplay}` : "..."}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <AddressAutocompleteInput parcels={parcels} value={addrSearch} onChange={setAddrSearch} onSelectParcel={p => { setAddrSearch(p.address); focusParcel(p.parcelId, 18); }} onEnter={() => { if (searchMatches[0]) focusParcel(searchMatches[0].parcelId, 18); }} placeholder="Search address, owner, or parcel ID" inputStyle={{ width: "100%", background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--white)", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none" }} wrapperStyle={{ flex: 1, minWidth: 220 }} />
                {addrSearch && <button onClick={() => setAddrSearch("")} style={{ ...SI, fontSize: 11, padding: "7px 11px", background: "rgba(220,38,38,.15)", borderColor: "rgba(220,38,38,.30)" }}>Clear</button>}
                {searchMatches.length > 1 && <button onClick={fitSearchMatches} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Fit matches</button>}
                <span style={{ fontSize: 12, color: hlSet ? "var(--amber2)" : "var(--gray3)", whiteSpace: "nowrap" }}>{hlSet ? `${hlSet.size.toLocaleString()} matches` : "No active search"}</span>
                <span style={{ fontSize: 12, color: "var(--gray2)" }}>{mapStatus}</span>
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
              <button onClick={resetView} style={{ ...SI, fontSize: 11, padding: "7px 11px" }}>Reset view</button>
            </div>
          </div>
        </Card>
      )}

      <div className="leaflet-layout">
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: 11, color: compactMode ? "var(--blue3)" : "var(--teal2)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{compactMode ? "Grievance comparable map" : "Application map workspace"}</div>
              <div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 4 }}>{compactMode ? "Only the subject parcel and the currently included grievance comps are shown." : (hasParcelGeometry ? `Neighborhood and parcel boundaries load at z${BOUNDARY_RENDER_MIN_ZOOM}+, and parcel locations load at z${POINT_RENDER_MIN_ZOOM}+.` : `Neighborhood boundaries load at z${BOUNDARY_RENDER_MIN_ZOOM}+ and trusted point locations load at z${POINT_RENDER_MIN_ZOOM}+ until the parcel boundary file is active.`)}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--gray2)" }}>{selectedParcel ? `Selected parcel ${selectedParcel.parcelId}` : (compactMode ? `${Math.max(renderStats.visible - compactCompareCount, 0)} subject + ${compactCompareCount} comp${compactCompareCount === 1 ? "" : "s"}` : `${renderStats.visible.toLocaleString()} visible parcels`)}</div>
          </div>
          <div style={{ position: "relative", borderTop: "none" }}>
            {!mapRuntimeReady ? (
              <div style={{ height: "min(620px, 70vh)", display: "grid", placeItems: "center", background: "#dbe4ee", padding: 24 }}>
                <div style={{ maxWidth: 520, textAlign: "center" }}>
                  <div style={{ fontFamily: "var(--fd)", fontSize: 28, fontWeight: 800 }}>Leaflet is not ready</div>
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
        </Card>

        <Card style={{ padding: 0, overflow: "hidden", minWidth: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 11, color: compactMode ? "var(--blue3)" : (advanced ? "var(--teal2)" : "var(--blue3)"), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{selectedParcel ? "Selected parcel" : "Map inspector"}</div>
              <div style={{ fontFamily: "var(--fd)", fontSize: 20, fontWeight: 800, marginTop: 6, minWidth: 0, lineHeight: 1.08, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel ? <a href={selectedParcelMapsUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", textUnderlineOffset: 3, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel.address || selectedParcel.parcelId}</a> : (addrSearch ? "Search results" : "Use the map")}</div>
            </div>
            {selectedParcel && !compactMode && <button onClick={() => setSelectedParcelId(null)} aria-label="Close selected parcel" style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--gray2)", borderRadius: 999, width: 32, height: 32, fontSize: 18, lineHeight: 1, cursor: "pointer", flexShrink: 0 }}>x</button>}
          </div>
          <div style={{ padding: "14px 16px", display: "grid", gap: 14, minWidth: 0 }}>
            {selectedParcel ? <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", minWidth: 0 }}>
                {compactMode && selectedParcelRole?.kind === "subject" && <Badge color="#f59e0b">Subject parcel</Badge>}
                {compactMode && selectedParcelRole?.kind === "compare" && <Badge color="#2563eb">{selectedParcelRole.label}</Badge>}
                <Badge color="#6366f1">{propClassLabel(selectedParcel)}</Badge>
                <Badge color={selectedItem?.geom ? "#0d9488" : "#f59e0b"}>{selectedItem?.geom ? "Boundary loaded" : "Point location only"}</Badge>
                <Badge color={FC[eqFlagFast(selectedParcel)]}>{FL[eqFlagFast(selectedParcel)]}</Badge>
                {isAbsenteeFast(selectedParcel) && <Badge color="#f97316">Absentee</Badge>}
              </div>
              {!compactMode && isAbsenteeFast(selectedParcel) && <details style={{ background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.18)", borderRadius: 8, padding: "8px 10px" }}><summary style={{ cursor: "pointer", listStyle: "none", fontSize: 11, fontWeight: 700, color: "#c2410c", fontFamily: "var(--fm)" }}>Why flagged as absentee?</summary><div style={{ display: "grid", gap: 4, marginTop: 8 }}><div style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.5 }}>{getAbsenteeModelFast(selectedParcel).label} ({getAbsenteeModelFast(selectedParcel).confidence}, score {getAbsenteeModelFast(selectedParcel).score})</div>{(getAbsenteeModelFast(selectedParcel).signals?.length ? getAbsenteeModelFast(selectedParcel).signals : ["No strong off-site ownership signal."]).map((signal, idx) => <div key={`${selectedParcel.parcelId}-absentee-${idx}`} style={{ fontSize: 11, color: "var(--gray2)", lineHeight: 1.45 }}>{signal}</div>)}</div></details>}
              <div className="metric-grid-2" style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Full market value</div><div style={{ fontFamily: "var(--fd)", fontSize: 21, fontWeight: 800, marginTop: 5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{$f(selectedParcel.fullMarketValue)}</div></div>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Assessed value</div><div style={{ fontFamily: "var(--fd)", fontSize: 21, fontWeight: 800, marginTop: 5, overflowWrap: "anywhere", wordBreak: "break-word" }}>{$f(selectedParcel.assessedValue)}</div></div>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Owner</div><div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel.owner1 || "Unknown owner"}</div><div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 4, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel.mailAddress || "Mailing address not available"}</div><div style={{ fontSize: 12, color: "var(--gray2)", marginTop: 6, lineHeight: 1.6, overflowWrap: "anywhere", wordBreak: "break-word" }}>{selectedParcel.neighborhood || selectedParcel.neighborhoodAssociation || "Neighborhood unknown"}{selectedParcel.neighborhoodAssociation && selectedParcel.neighborhoodAssociation !== selectedParcel.neighborhood ? ` | ${selectedParcel.neighborhoodAssociation}` : ""}</div></div>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Equity ratio</div><div style={{ fontFamily: "var(--fd)", fontSize: 21, fontWeight: 800, marginTop: 5, color: FC[eqFlagFast(selectedParcel)], overflowWrap: "anywhere", wordBreak: "break-word" }}>{eqRFast(selectedParcel)}%</div></div>
              </div>
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "stretch", minWidth: 0 }}>
                <button onClick={() => focusParcel(selectedParcel.parcelId, 18)} style={{ background: advanced ? "var(--teal)" : "var(--blue)", color: "white", border: "none", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: "1 1 150px", minWidth: 0 }}>Center on parcel</button>
                {!compactMode && typeof onCompare === "function" && <button onClick={() => onCompare(selectedParcel)} style={{ background: selectedInCompare ? "rgba(37,99,235,.15)" : "var(--card2)", border: `1px solid ${selectedInCompare ? "rgba(37,99,235,.35)" : "var(--border)"}`, color: selectedInCompare ? "var(--blue3)" : "var(--gray)", borderRadius: 9, padding: "9px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: "1 1 150px", minWidth: 0 }}>{selectedInCompare ? "In Compare" : "+ Compare"}</button>}
              </div>
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
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}><div style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{residentMode ? "Current resident view" : "Start here"}</div><div style={{ fontSize: 13, color: "var(--gray2)", lineHeight: 1.7, marginTop: 6 }}>{residentMode ? ({ fairness: "Compare assessment fairness across nearby parcels.", tax_relief: "See where exemptions are already on record.", ownership: "Highlight likely absentee ownership across the neighborhood.", market: "View parcel values without opening research controls." })[viewPreset] : "Search an address or owner name, or click a parcel directly."}</div></div>
              <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button onClick={() => setLegendOpen(prev => ({ ...prev, coloring: !prev.coloring }))} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "transparent", border: "none", color: "inherit", padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Current coloring</span><span style={{ fontSize: 12, color: "var(--gray3)" }}>{legendOpen.coloring ? "Hide" : "Show"}</span></button>{legendOpen.coloring && <div style={{ display: "grid", gap: 7, padding: "0 14px 12px", marginTop: -2 }}>{legendItems.map(([label, color]) => <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: color, border: "1px solid rgba(255,255,255,.18)", flexShrink: 0 }} /><span style={{ fontSize: 12, color: "var(--gray2)" }}>{label}</span></div>)}</div>}</div>
              {boundaryLegendItems.length > 0 && <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><button onClick={() => setLegendOpen(prev => ({ ...prev, boundaries: !prev.boundaries }))} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "transparent", border: "none", color: "inherit", padding: "12px 14px", cursor: "pointer" }}><span style={{ fontSize: 11, color: "var(--gray2)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>Boundary legend</span><span style={{ fontSize: 12, color: "var(--gray3)" }}>{legendOpen.boundaries ? "Hide" : "Show"}</span></button>{legendOpen.boundaries && <div style={{ padding: "0 14px 12px", marginTop: -2 }}><div style={{ fontSize: 11, color: "var(--gray3)", marginTop: 5 }}>{advanced && showAssociationOverlay ? "Neighborhood and association outlines use distinct colors." : "Each neighborhood outline uses a distinct color."}</div><div style={{ display: "grid", gap: 7, marginTop: 10, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>{boundaryLegendItems.map(item => <div key={`${item.kind}:${item.label}`} style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 16, height: 0, borderTop: `4px solid ${item.color}`, flexShrink: 0 }} /><span style={{ fontSize: 12, color: "var(--gray2)" }}>{item.label}</span></div>)}</div></div>}</div>}
            </>}
          </div>
        </Card>
      </div>
    </div>
  );
};













