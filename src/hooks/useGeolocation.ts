import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '@/store/useStore';

interface GeolocationCoords {
  latitude: number;
  longitude: number;
}

const COORDS_MAX_AGE = 10 * 60 * 1000;

export const useGeolocation = () => {
  const { userCoords, coordsUpdatedAt, setUserCoords, locationPermission, setLocationPermission, showToast } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const freshRequested = useRef(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationPermission('unavailable');
      setError('Geolocation not supported');
    }
  }, [setLocationPermission]);

  useEffect(() => {
    if (locationPermission !== 'granted' || freshRequested.current) return;
    const stale = !userCoords || !coordsUpdatedAt || (Date.now() - coordsUpdatedAt > COORDS_MAX_AGE);
    if (!stale) return;
    freshRequested.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  }, [locationPermission, userCoords, coordsUpdatedAt, setUserCoords]);

  const requestLocation = useCallback(async (): Promise<GeolocationCoords | null> => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000,
        });
      });
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setUserCoords(coords);
      setLocationPermission('granted');
      setLoading(false);
      return coords;
    } catch (err) {
      const msg = err instanceof GeolocationPositionError && err.code === err.PERMISSION_DENIED
        ? 'Location permission denied'
        : 'Could not get location';
      setError(msg);
      setLocationPermission('denied');
      setLoading(false);
      return null;
    }
  }, [setUserCoords, setLocationPermission]);

  const clearLocation = useCallback(() => {
    setUserCoords(null);
    setLocationPermission('prompt');
  }, [setUserCoords, setLocationPermission]);

  return {
    coords: userCoords,
    loading,
    error,
    permission: locationPermission,
    requestLocation,
    clearLocation,
  };
};
