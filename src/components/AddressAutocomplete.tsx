import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { loadGoogleMaps, parsePlace, type ParsedAddress } from "@/lib/googleMaps";
import { Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSelect: (parsed: ParsedAddress) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder, required, className }: Props) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);
  const debounceRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadGoogleMaps()
      .then(async (g) => {
        const lib = await g.maps.importLibrary("places");
        placesLibRef.current = lib;
        sessionRef.current = new lib.AutocompleteSessionToken();
      })
      .catch((e) => console.warn("Google Maps load failed", e));
  }, []);

  const fetchSuggestions = (input: string) => {
    if (!placesLibRef.current || !input.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    placesLibRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input,
      sessionToken: sessionRef.current,
      includedRegionCodes: ["us"],
    })
      .then((res: any) => setSuggestions(res.suggestions || []))
      .catch((e: any) => console.warn("autocomplete error", e))
      .finally(() => setLoading(false));
  };

  const handleChange = (v: string) => {
    onChange(v);
    setOpen(true);
    window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => fetchSuggestions(v), 200);
  };

  const handlePick = async (sugg: any) => {
    try {
      const place = sugg.placePrediction.toPlace();
      await place.fetchFields({
        fields: ["addressComponents", "formattedAddress"],
      });
      const parsed = parsePlace(place);
      onSelect(parsed);
      onChange(parsed.address_line1);
      setOpen(false);
      setSuggestions([]);
      sessionRef.current = new placesLibRef.current.AutocompleteSessionToken();
    } catch (e) {
      console.warn("place details failed", e);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => value && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder || "Start typing an address…"}
        required={required}
        autoComplete="off"
      />
      {loading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-72 overflow-auto">
          {suggestions.map((s, i) => {
            const pred = s.placePrediction;
            const main = pred?.mainText?.text || pred?.text?.text || "";
            const secondary = pred?.secondaryText?.text || "";
            return (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(s)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <div className="font-medium">{main}</div>
                  {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}