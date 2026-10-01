/**
 * Links that open Google Maps in a new tab (or the Google Maps app on phones).
 *
 * Built with Google's Maps URLs, which need no API key:
 * https://developers.google.com/maps/documentation/urls/get-started
 * Every URL carries api=1, and values are URL-encoded (commas become %2C).
 */

const GOOGLE_MAPS = "https://www.google.com/maps";
const CITY = "Albany, NY";

const validLatLng = latLng => Array.isArray(latLng) && Number.isFinite(Number(latLng[0])) && Number.isFinite(Number(latLng[1]));
const formatLatLng = latLng => validLatLng(latLng) ? `${Number(latLng[0]).toFixed(6)},${Number(latLng[1]).toFixed(6)}` : null;

// A street address Google can find on its own: it starts with a house number ("470 Elk St", "292-296 Delaware Ave",
// "3A Enterprise Dr"). Records like "Rear 12 Railroad Ave", "Broadway", or "No street address" fall back to the
// parcel's coordinates.
const isStreetAddress = address => /^\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?\s+[A-Za-z]/.test(String(address || "").trim());

// Pin for one property. The ZIP on the roll is estimated for non-owner-occupied parcels, but Google matches the
// street address in Albany either way. Returns null when there is nothing to locate (no street address, no
// coordinates, and no street name), so callers can hide the link instead of opening a search for the whole city.
export function googleMapsPropertyUrl({ address = "", zip = "", latLng = null } = {}) {
  const street = String(address || "").trim();
  const point = formatLatLng(latLng);
  let query = null;
  if (isStreetAddress(street)) query = `${street}, ${CITY}${zip ? ` ${zip}` : ""}`;
  else if (point) query = point;
  else if (/[A-Za-z]{2,}/.test(street) && !/^no street address$/i.test(street)) query = `${street.replace(/^rear\s+/i, "")}, ${CITY}`;
  return query ? `${GOOGLE_MAPS}/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

// The area currently shown on the app map. Leaflet and Google Maps share the same zoom scale.
export function googleMapsAreaUrl({ center = null, zoom = 15, satellite = false } = {}) {
  const point = formatLatLng(center);
  if (!point) return `${GOOGLE_MAPS}/search/?api=1&query=${encodeURIComponent(CITY)}`;
  const level = Math.max(3, Math.min(21, Math.round(Number(zoom) || 15)));
  return `${GOOGLE_MAPS}/@?api=1&map_action=map&center=${encodeURIComponent(point)}&zoom=${level}${satellite ? "&basemap=satellite" : ""}`;
}

// Street View from the panorama closest to latLng, facing heading (degrees clockwise from north). Google's viewer
// opens to a black screen when the link has no heading, so one is always sent. Returns null without coordinates.
export function googleStreetViewUrl({ latLng = null, heading = null } = {}) {
  const point = formatLatLng(latLng);
  if (!point) return null;
  const facing = Number.isFinite(Number(heading)) && heading !== null ? ((Math.round(Number(heading)) % 360) + 360) % 360 : 0;
  return `${GOOGLE_MAPS}/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(point)}&heading=${facing}&pitch=0&fov=80`;
}
