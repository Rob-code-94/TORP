/**
 * Loads Google Maps JS API with the Places library once per page (for address autocomplete).
 * Requires `VITE_GOOGLE_MAPS_API_KEY` in the Vite env.
 */

let loadPromise: Promise<void> | null = null;

export function getGoogleMapsWebApiKey(): string | undefined {
  const raw = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const k = raw?.trim();
  return k || undefined;
}

function hasPlacesLibrary(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window as unknown as { google?: { maps?: { places?: unknown } } }).google?.maps?.places,
  );
}

/**
 * Appends the Maps script if needed. Resolves when `google.maps.places` is available.
 */
export function loadGoogleMapsPlacesScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'));
  if (hasPlacesLibrary()) return Promise.resolve();

  const key = getGoogleMapsWebApiKey();
  if (!key) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));

  if (loadPromise) return loadPromise;

  const inner = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById('torp-google-maps-places');
    if (existing) {
      if (hasPlacesLibrary()) {
        resolve();
        return;
      }
      const onLoad = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onErr);
        if (hasPlacesLibrary()) resolve();
        else reject(new Error('Google Maps loaded without Places library'));
      };
      const onErr = () => {
        existing.removeEventListener('load', onLoad);
        existing.removeEventListener('error', onErr);
        reject(new Error('Google Maps script failed'));
      };
      existing.addEventListener('load', onLoad);
      existing.addEventListener('error', onErr);
      return;
    }

    const script = document.createElement('script');
    script.id = 'torp-google-maps-places';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.onload = () => {
      if (hasPlacesLibrary()) resolve();
      else reject(new Error('Google Maps loaded without Places library'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps JavaScript API'));
    document.head.appendChild(script);
  });

  loadPromise = inner.catch((err) => {
    loadPromise = null;
    throw err;
  });
  return loadPromise;
}
