import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SEARCH_MODES = [
  { key: "address", label: "Address" },
  { key: "street", label: "Street" },
  { key: "owner", label: "Owner" },
  { key: "parcel", label: "Parcel ID" },
];

const normalizeLookupText = raw => (raw || "")
  .toString()
  .toLowerCase()
  .replace(/[^\w\s.-]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const extractStreetText = address => {
  const normalized = normalizeLookupText(address);
  if (!normalized) return "";
  return normalized
    .replace(/^\d+[a-z-]*\s+/, "")
    .replace(/\b(apt|apartment|unit|fl|floor|ste|suite|#)\b.*$/, "")
    .trim();
};

const tokenize = text => normalizeLookupText(text).split(" ").filter(Boolean);

const buildAddressOptions = parcels => {
  const options = [];
  const seen = new Set();
  for (const p of Array.isArray(parcels) ? parcels : []) {
    const address = (p?.address || "").toString().trim();
    const owner = [p?.owner1, p?.owner2].filter(Boolean).join(" | ").trim();
    const zip = (p?.zip || "").toString().trim();
    const parcelId = (p?.parcelId || "").toString().trim();
    if (!address && !owner && !parcelId) continue;
    const key = `${normalizeLookupText(address)}|${normalizeLookupText(owner)}|${zip}|${parcelId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({
      key: p?.recordKey || `${address}|${parcelId}|${zip}`,
      parcel: p,
      address,
      zip,
      parcelId,
      neighborhood: (p?.neighborhood || "").toString().trim(),
      owner,
      addressNorm: normalizeLookupText(address),
      streetNorm: extractStreetText(address),
      ownerNorm: normalizeLookupText(owner),
      parcelIdNorm: normalizeLookupText(parcelId),
      houseNumberNorm: ((address || "").match(/^\s*(\d+[a-z-]*)/i)?.[1] || "").toLowerCase(),
    });
  }
  return options;
};

const scoreByMode = (option, queryNorm, mode) => {
  if (!queryNorm) return Number.POSITIVE_INFINITY;
  const queryTokens = tokenize(queryNorm);
  const startsWithTokens = value => queryTokens.every(token => value.startsWith(token) || value.includes(` ${token}`));

  if (mode === "parcel") {
    if (option.parcelIdNorm === queryNorm) return 0;
    if (option.parcelIdNorm.startsWith(queryNorm)) return 1;
    if (option.parcelIdNorm.includes(queryNorm)) return 2;
    return Number.POSITIVE_INFINITY;
  }

  if (mode === "owner") {
    if (!option.ownerNorm) return Number.POSITIVE_INFINITY;
    if (option.ownerNorm === queryNorm) return 0;
    if (option.ownerNorm.startsWith(queryNorm)) return 1;
    if (option.ownerNorm.includes(` ${queryNorm}`)) return 2;
    if (startsWithTokens(option.ownerNorm)) return 3;
    if (option.ownerNorm.includes(queryNorm)) return 4;
    return Number.POSITIVE_INFINITY;
  }

  if (mode === "street") {
    if (!option.streetNorm) return Number.POSITIVE_INFINITY;
    if (option.streetNorm === queryNorm) return 0;
    if (option.streetNorm.startsWith(queryNorm)) return 1;
    if (option.streetNorm.includes(` ${queryNorm}`)) return 2;
    if (startsWithTokens(option.streetNorm)) return 3;
    if (option.streetNorm.includes(queryNorm)) return 4;
    return Number.POSITIVE_INFINITY;
  }

  if (option.addressNorm === queryNorm) return 0;
  if (option.addressNorm.startsWith(queryNorm)) return 1;
  if (option.streetNorm && option.streetNorm.startsWith(queryNorm)) return 2;
  if (queryTokens.length > 1 && queryTokens.every(token => option.addressNorm.includes(token))) return 3;
  if (option.houseNumberNorm && queryNorm.startsWith(option.houseNumberNorm)) {
    const streetQuery = queryNorm.slice(option.houseNumberNorm.length).trim();
    if (!streetQuery || (option.streetNorm && option.streetNorm.includes(streetQuery))) return 4;
  }
  if (option.addressNorm.includes(` ${queryNorm}`)) return 5;
  if (option.streetNorm && option.streetNorm.includes(queryNorm)) return 6;
  if (option.parcelIdNorm === queryNorm) return 7;
  return Number.POSITIVE_INFINITY;
};

const findAddressOptions = (options, query, mode = "address", limit = 8) => {
  const raw = (query || "").toString().trim();
  const queryNorm = normalizeLookupText(raw);
  if (!queryNorm) return [];
  const minLength = mode === "parcel" || /^\d/.test(raw) ? 1 : 2;
  if (queryNorm.length < minLength) return [];
  return options
    .map(option => ({ option, score: scoreByMode(option, queryNorm, mode) }))
    .filter(entry => Number.isFinite(entry.score))
    .sort((a, b) => (
      a.score - b.score ||
      a.option.address.length - b.option.address.length ||
      a.option.address.localeCompare(b.option.address)
    ))
    .slice(0, limit)
    .map(entry => entry.option);
};

export const findBestAddressMatch = (parcels, query) => {
  const options = buildAddressOptions(parcels);
  const modes = ["address", "street", "parcel", "owner"];
  for (const mode of modes) {
    const match = findAddressOptions(options, query, mode, 1)[0];
    if (match?.parcel) return match.parcel;
  }
  return null;
};

export const AddressAutocompleteInput = ({
  parcels = [],
  value,
  onChange,
  onSelectParcel,
  onEnter,
  placeholder,
  inputStyle = {},
  wrapperStyle = {},
  autoFocus = false,
  maxSuggestions = 8,
  disabled = false,
  defaultMode = "address",
}) => {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mode, setMode] = useState(defaultMode);
  const [menuRect, setMenuRect] = useState(null);

  const options = useMemo(() => buildAddressOptions(parcels), [parcels]);
  const suggestions = useMemo(
    () => findAddressOptions(options, value, mode, maxSuggestions),
    [maxSuggestions, mode, options, value]
  );

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [mode, value]);

  useEffect(() => {
    const handlePointerDown = event => {
      const inRoot = rootRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inRoot && !inMenu) {
        setIsFocused(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isFocused || disabled) return undefined;
    const updateRect = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuRect({
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
      });
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [disabled, isFocused]);

  const open = isFocused && !disabled;
  const queryNorm = normalizeLookupText(value);
  const queryTooShort = !!queryNorm && queryNorm.length < ((mode === "parcel" || /^\d/.test((value || "").trim())) ? 1 : 2);

  const selectOption = option => {
    if (!option) return;
    if (typeof onChange === "function") onChange(option.address || option.parcelId || option.owner);
    if (typeof onSelectParcel === "function") onSelectParcel(option.parcel);
    setIsFocused(false);
    setHighlightedIndex(-1);
  };

  const menu = open && menuRect && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: Math.max(12, menuRect.left),
        top: menuRect.top,
        width: Math.max(260, menuRect.width),
        zIndex: 4000,
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(15,23,42,.28)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(15,23,42,.08)", display: "grid", gap: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--gray2)" }}>Search by</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SEARCH_MODES.map(option => (
            <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gray)", cursor: "pointer" }}>
              <input
                type="radio"
                name="address-search-mode"
                checked={mode === option.key}
                onChange={() => setMode(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div style={{ maxHeight: 320, overflowY: "auto" }}>
        {!queryNorm ? (
          <div style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            Start typing to search Albany parcels. Use Street mode for inputs like <strong>Prov</strong> or <strong>Providence</strong>.
          </div>
        ) : queryTooShort ? (
          <div style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            Type at least 2 characters for {mode === "street" ? "a street name" : mode === "owner" ? "an owner name" : "an address"}.
          </div>
        ) : suggestions.length === 0 ? (
          <div style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            No Albany parcels matched that {mode === "parcel" ? "parcel ID" : mode}. Try a shorter street name or switch search mode.
          </div>
        ) : (
          suggestions.map((option, index) => {
            const active = index === highlightedIndex;
            return (
              <button
                key={option.key}
                type="button"
                onMouseDown={event => {
                  event.preventDefault();
                  selectOption(option);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: active ? "rgba(37,99,235,.10)" : "transparent",
                  border: "none",
                  borderBottom: index === suggestions.length - 1 ? "none" : "1px solid rgba(15,23,42,.06)",
                  padding: "10px 12px",
                  cursor: "pointer",
                  display: "grid",
                  gap: 3,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>{option.address || "Address unavailable"}</div>
                <div style={{ fontSize: 11, color: "var(--gray2)" }}>
                  {[option.parcelId, option.neighborhood, option.zip].filter(Boolean).join(" | ")}
                </div>
                {option.owner && <div style={{ fontSize: 11, color: "var(--gray)" }}>{option.owner}</div>}
              </button>
            );
          })
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div ref={rootRef} style={{ position: "relative", ...wrapperStyle }}>
        <input
          autoFocus={autoFocus}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={e => {
            if (typeof onChange === "function") onChange(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={e => {
            if (!open || suggestions.length === 0) {
              if (e.key === "Enter" && typeof onEnter === "function") onEnter();
              if (e.key === "Escape") {
                setIsFocused(false);
                setHighlightedIndex(-1);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlightedIndex(prev => Math.max(prev - 1, 0));
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setIsFocused(false);
              setHighlightedIndex(-1);
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
                selectOption(suggestions[highlightedIndex]);
              } else if (suggestions[0]) {
                selectOption(suggestions[0]);
              } else if (typeof onEnter === "function") {
                onEnter();
              }
            }
          }}
          style={inputStyle}
        />
      </div>
      {menu}
    </>
  );
};
