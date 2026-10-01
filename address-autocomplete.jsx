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

// Street words people type in full (or misspell) mapped to the abbreviations used on the Albany roll.
const STREET_WORD_ALIASES = {
  street: "st", str: "st", stret: "st", streer: "st", stree: "st", sreet: "st", steet: "st",
  avenue: "ave", av: "ave", aven: "ave", avenu: "ave", avn: "ave",
  boulevard: "blvd", boul: "blvd", road: "rd", drive: "dr", lane: "ln", place: "pl", court: "ct",
  terrace: "ter", parkway: "pkwy", pky: "pkwy", extension: "ext", circle: "cir", square: "sq",
  highway: "hwy", trail: "trl", alley: "aly",
  north: "n", south: "s", east: "e", west: "w",
};
const STREET_SUFFIXES = new Set(["st", "ave", "blvd", "rd", "dr", "ln", "pl", "ct", "ter", "pkwy", "ext", "cir", "sq", "hwy", "trl", "aly", "way"]);

// Address form of a lookup: ignores punctuation (but keeps decimal house numbers like 335.5) and
// treats "470 Elk Street", "470 elk st." and "470 Elk St" as the same text.
export const normalizeAddressText = raw => normalizeLookupText(raw)
  .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
  .split(/\s+/)
  .filter(Boolean)
  .map(token => STREET_WORD_ALIASES[token] || token)
  .join(" ");

const extractStreetText = address => {
  const normalized = normalizeAddressText(address);
  if (!normalized) return "";
  return normalized
    .replace(/^\d+[a-z-]*(?:\.\d+)?\s+/, "")
    .replace(/\b(apt|apartment|unit|fl|floor|ste|suite|#)\b.*$/, "")
    .trim();
};

const tokenize = text => normalizeLookupText(text).split(" ").filter(Boolean);

const levenshtein = (a, b) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = next;
  }
  return prev[b.length];
};

const splitStreetName = street => {
  const tokens = (street || "").split(" ").filter(Boolean);
  if (tokens.length > 1 && STREET_SUFFIXES.has(tokens[tokens.length - 1])) {
    return { name: tokens.slice(0, -1).join(" "), suffix: tokens[tokens.length - 1] };
  }
  return { name: tokens.join(" "), suffix: "" };
};

const optionsCache = new WeakMap();

const buildAddressOptions = parcels => {
  if (Array.isArray(parcels) && optionsCache.has(parcels)) return optionsCache.get(parcels);
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
      addressNorm: normalizeAddressText(address),
      streetNorm: extractStreetText(address),
      ownerNorm: normalizeLookupText(owner),
      parcelIdNorm: normalizeLookupText(parcelId),
      houseNumberNorm: ((address || "").match(/^\s*(\d+[a-z-]*(?:\.\d+)?)/i)?.[1] || "").toLowerCase(),
    });
  }
  if (Array.isArray(parcels)) optionsCache.set(parcels, options);
  return options;
};

const scoreByMode = (option, lookupNorm, mode, addressNorm = lookupNorm) => {
  const queryNorm = mode === "street" || mode === "address" ? addressNorm : lookupNorm;
  if (!queryNorm) return Number.POSITIVE_INFINITY;
  const queryTokens = mode === "street" || mode === "address" ? queryNorm.split(" ").filter(Boolean) : tokenize(queryNorm);
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
  if (option.parcelIdNorm === lookupNorm) return 7;
  return Number.POSITIVE_INFINITY;
};

const findAddressOptions = (options, query, mode = "address", limit = 8) => {
  const raw = (query || "").toString().trim();
  const queryNorm = normalizeLookupText(raw);
  if (!queryNorm) return [];
  const minLength = mode === "parcel" || /^\d/.test(raw) ? 1 : 2;
  if (queryNorm.length < minLength) return [];
  const addressNorm = normalizeAddressText(raw);
  return options
    .map(option => ({ option, score: scoreByMode(option, queryNorm, mode, addressNorm) }))
    .filter(entry => Number.isFinite(entry.score))
    .sort((a, b) => (
      a.score - b.score ||
      a.option.address.length - b.option.address.length ||
      a.option.address.localeCompare(b.option.address)
    ))
    .slice(0, limit)
    .map(entry => entry.option);
};

// "Did you mean" suggestions for a typed address with no exact match (e.g. "470 Elk Stret" -> 470 Elk St).
const findSimilarAddressOptions = (options, query, limit = 3) => {
  const normalized = normalizeAddressText(query);
  const houseMatch = normalized.match(/^(\d+[a-z-]*(?:\.\d+)?)\s+(.+)$/);
  const houseNumber = houseMatch ? houseMatch[1] : "";
  const streetQuery = (houseMatch ? houseMatch[2] : normalized).trim();
  if (streetQuery.length < 3) return [];
  const queryParts = splitStreetName(streetQuery);
  const maxNameDistance = queryParts.name.length <= 4 ? 1 : 2;
  const streetScores = new Map();
  for (const option of options) {
    if (!option.streetNorm || streetScores.has(option.streetNorm)) continue;
    const optionParts = splitStreetName(option.streetNorm);
    const nameDistance = levenshtein(queryParts.name, optionParts.name);
    if (nameDistance > maxNameDistance) {
      streetScores.set(option.streetNorm, null);
      continue;
    }
    const suffixPenalty = queryParts.suffix && optionParts.suffix && queryParts.suffix !== optionParts.suffix ? 1 : 0;
    streetScores.set(option.streetNorm, nameDistance * 2 + suffixPenalty);
  }
  const rankedStreets = [...streetScores.entries()]
    .filter(([, score]) => score != null)
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([street]) => street);
  const results = [];
  for (const street of rankedStreets) {
    const onStreet = options.filter(option => option.streetNorm === street);
    const exactHouse = houseNumber ? onStreet.find(option => option.houseNumberNorm === houseNumber) : null;
    const pick = exactHouse || onStreet.sort((a, b) => a.address.length - b.address.length || a.address.localeCompare(b.address))[0];
    if (pick && !results.includes(pick)) results.push(pick);
  }
  return results;
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

export const suggestSimilarAddresses = (parcels, query, limit = 3) => (
  findSimilarAddressOptions(buildAddressOptions(parcels), query, limit).map(option => option.parcel)
);

let autocompleteInstanceCount = 0;

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
  ariaLabel = "",
  inputRef = null,
  id = "",
}) => {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const instanceIdRef = useRef(null);
  if (instanceIdRef.current == null) {
    autocompleteInstanceCount += 1;
    instanceIdRef.current = `address-search-${autocompleteInstanceCount}`;
  }
  const inputId = id || instanceIdRef.current;
  const listboxId = `${inputId}-listbox`;
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [mode, setMode] = useState(defaultMode);
  const [menuRect, setMenuRect] = useState(null);

  const options = useMemo(() => buildAddressOptions(parcels), [parcels]);
  const suggestions = useMemo(
    () => findAddressOptions(options, value, mode, maxSuggestions),
    [maxSuggestions, mode, options, value]
  );
  const similarSuggestions = useMemo(() => {
    if (suggestions.length || (mode !== "address" && mode !== "street")) return [];
    return findSimilarAddressOptions(options, value, 3);
  }, [mode, options, suggestions.length, value]);
  const showingSimilar = suggestions.length === 0 && similarSuggestions.length > 0;
  const listOptions = showingSimilar ? similarSuggestions : suggestions;

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
  const modeNoun = mode === "parcel" ? "parcel ID" : mode === "owner" ? "owner name" : mode === "street" ? "street" : "address";

  const selectOption = option => {
    if (!option) return;
    if (typeof onChange === "function") onChange(option.address || option.parcelId || option.owner);
    if (typeof onSelectParcel === "function") onSelectParcel(option.parcel);
    setIsFocused(false);
    setHighlightedIndex(-1);
  };

  const renderOption = (option, index) => {
    const active = index === highlightedIndex;
    return (
      <button
        key={option.key}
        id={`${listboxId}-option-${index}`}
        type="button"
        role="option"
        aria-selected={active}
        tabIndex={-1}
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
          borderBottom: index === listOptions.length - 1 ? "none" : "1px solid rgba(15,23,42,.06)",
          padding: "10px 12px",
          cursor: "pointer",
          display: "grid",
          gap: 3,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--white)" }}>{option.address || "Address unavailable"}</div>
        <div style={{ fontSize: 11, color: "var(--gray2)" }}>
          {[option.neighborhood, option.zip, option.parcelId ? `Parcel ${option.parcelId}` : ""].filter(Boolean).join(" | ")}
        </div>
        {option.owner && <div style={{ fontSize: 11, color: "var(--gray)" }}>Owner on record: {option.owner}</div>}
      </button>
    );
  };

  const menu = open && menuRect && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        left: Math.max(12, menuRect.left),
        top: menuRect.top,
        width: Math.min(Math.max(260, menuRect.width), (typeof window !== "undefined" ? window.innerWidth : 1200) - 24),
        zIndex: 4000,
        background: "var(--card)",
        border: "1px solid var(--border2)",
        borderRadius: 12,
        boxShadow: "0 18px 40px rgba(15,23,42,.28)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(15,23,42,.08)", display: "grid", gap: 8 }}>
        <div id={`${inputId}-mode-label`} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--gray2)" }}>Search by</div>
        <div role="radiogroup" aria-labelledby={`${inputId}-mode-label`} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {SEARCH_MODES.map(option => (
            <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--gray)", cursor: "pointer", minHeight: 28 }}>
              <input
                type="radio"
                name={`${inputId}-search-mode`}
                checked={mode === option.key}
                onChange={() => setMode(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div id={listboxId} role="listbox" aria-label="Matching properties" style={{ maxHeight: 320, overflowY: "auto" }}>
        {!queryNorm ? (
          <div style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            Start typing a house number and street, like <strong>470 Elk St</strong>. Spelling out "Street" or "Avenue" works too.
          </div>
        ) : queryTooShort ? (
          <div style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            Type at least 2 characters for {mode === "street" ? "a street name" : mode === "owner" ? "an owner name" : "an address"}.
          </div>
        ) : showingSimilar ? (
          <>
            <div role="status" style={{ padding: "10px 12px 6px", fontSize: 12, color: "var(--gray)", lineHeight: 1.6 }}>
              No exact match for "{(value || "").trim()}". Did you mean:
            </div>
            {similarSuggestions.map(renderOption)}
          </>
        ) : suggestions.length === 0 ? (
          <div role="status" style={{ padding: "12px", fontSize: 12, color: "var(--gray2)", lineHeight: 1.6 }}>
            No Albany property matched that {modeNoun}. Check the spelling, try just the street name, or switch to {mode === "address" ? "Street" : "Address"} search above.
          </div>
        ) : (
          suggestions.map(renderOption)
        )}
      </div>
    </div>,
    document.body
  ) : null;

  const assignInputRef = node => {
    if (!inputRef) return;
    if (typeof inputRef === "function") inputRef(node);
    else inputRef.current = node;
  };

  return (
    <>
      <div ref={rootRef} style={{ position: "relative", ...wrapperStyle }}>
        <input
          id={inputId}
          ref={assignInputRef}
          autoFocus={autoFocus}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder || "Search for an Albany property"}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && listOptions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={open && highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          value={value}
          onChange={e => {
            if (typeof onChange === "function") onChange(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={e => {
            if (!open || listOptions.length === 0) {
              if (e.key === "Enter" && typeof onEnter === "function") onEnter();
              if (e.key === "Escape") {
                setIsFocused(false);
                setHighlightedIndex(-1);
              }
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlightedIndex(prev => Math.min(prev + 1, listOptions.length - 1));
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
              if (highlightedIndex >= 0 && listOptions[highlightedIndex]) {
                selectOption(listOptions[highlightedIndex]);
              } else if (!showingSimilar && suggestions[0]) {
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
