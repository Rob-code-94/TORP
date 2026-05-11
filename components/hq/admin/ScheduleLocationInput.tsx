import React, { useEffect, useRef } from 'react';
import { getGoogleMapsWebApiKey, loadGoogleMapsPlacesScript } from '../../../lib/googleMapsPlacesLoader';

export type ScheduleLocationInputProps = {
  /** When false, Places is torn down (e.g. drawer closed). */
  enabled: boolean;
  value: string;
  onChange: (location: string) => void;
  className: string;
  placeholder?: string;
};

type AutocompleteInstance = {
  addListener: (eventName: string, handler: () => void) => void;
  getPlace: () => { formatted_address?: string; name?: string };
};

type AutocompleteConstructor = new (input: HTMLInputElement, opts?: object) => AutocompleteInstance;

/**
 * Schedule "Location/Link" field: Google Places Autocomplete when `VITE_GOOGLE_MAPS_API_KEY` is set;
 * otherwise a normal text input with sensible `autoComplete` hints.
 */
const ScheduleLocationInput: React.FC<ScheduleLocationInputProps> = ({
  enabled,
  value,
  onChange,
  className,
  placeholder = 'Location/Link',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const mapsKey = getGoogleMapsWebApiKey();
  const autocompleteRef = useRef<AutocompleteInstance | null>(null);

  useEffect(() => {
    if (!enabled || !mapsKey) return;
    let cancelled = false;

    loadGoogleMapsPlacesScript()
      .then(() => {
        if (cancelled) return;
        const input = inputRef.current;
        if (!input) return;

        const g = (window as unknown as { google?: { maps?: { places?: { Autocomplete?: AutocompleteConstructor }; event?: { clearInstanceListeners: (instance: unknown) => void } } } }).google;
        const Ctor = g?.maps?.places?.Autocomplete;
        if (typeof Ctor !== 'function') return;

        const ac = new Ctor(input, { fields: ['formatted_address', 'name'] });
        autocompleteRef.current = ac;
        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const next = place.formatted_address?.trim() || place.name?.trim() || '';
          if (next) onChangeRef.current(next);
        });
      })
      .catch(() => {
        /* Invalid key / blocked / offline — field stays a normal controlled input */
      });

    return () => {
      cancelled = true;
      const ac = autocompleteRef.current;
      autocompleteRef.current = null;
      const evt = (window as unknown as { google?: { maps?: { event?: { clearInstanceListeners: (instance: unknown) => void } } } }).google?.maps?.event;
      if (ac && evt) {
        try {
          evt.clearInstanceListeners(ac);
        } catch {
          /* noop */
        }
      }
    };
  }, [enabled, mapsKey]);

  if (!mapsKey) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        autoComplete="street-address"
        enterKeyHint="done"
      />
    );
  }

  return (
    <div className="min-w-0 relative z-[1]">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
};

export default ScheduleLocationInput;
