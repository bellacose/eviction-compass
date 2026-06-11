let loaderPromise: Promise<typeof google> | null = null;

declare global {
  interface Window {
    google: typeof google;
    __lovableInitMap?: () => void;
  }
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loaderPromise) return loaderPromise;

  const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
  if (!key) return Promise.reject(new Error("Google Maps browser key not configured"));

  loaderPromise = new Promise((resolve, reject) => {
    window.__lovableInitMap = () => resolve(window.google);
    const script = document.createElement("script");
    const params = new URLSearchParams({
      key,
      v: "weekly",
      libraries: "places",
      loading: "async",
      callback: "__lovableInitMap",
    });
    if (channel) params.set("channel", channel);
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loaderPromise;
}

export interface ParsedAddress {
  address_line1: string;
  city: string;
  county: string;
  state: string;
  zip: string;
  formatted: string;
}

export function parsePlace(place: any): ParsedAddress {
  const get = (type: string, short = false) => {
    const comp = place.addressComponents?.find((c: any) => c.types?.includes(type));
    if (!comp) return "";
    return short ? (comp.shortText || comp.short_name || "") : (comp.longText || comp.long_name || "");
  };
  const street = [get("street_number"), get("route")].filter(Boolean).join(" ");
  return {
    address_line1: street || place.formattedAddress?.split(",")[0] || "",
    city: get("locality") || get("sublocality") || get("postal_town") || "",
    county: get("administrative_area_level_2").replace(/ County$/i, ""),
    state: get("administrative_area_level_1", true),
    zip: get("postal_code"),
    formatted: place.formattedAddress || "",
  };
}