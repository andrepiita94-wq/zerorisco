import * as Location from 'expo-location';
  import React, { createContext, useContext, useEffect, useState } from 'react';

  type LocationState = {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    accuracy: number | null;
  };

  type LocationContextType = {
    location: LocationState | null;
    speedKmh: number;
    heading: number;
    hasPermission: boolean;
  };

  const LocationContext = createContext<LocationContextType>({
    location: null, speedKmh: 0, heading: 0, hasPermission: false,
  });

  export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [location, setLocation] = useState<LocationState | null>(null);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
      let sub: Location.LocationSubscription | null = null;
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        setHasPermission(true);
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
          (loc) => setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed,
            heading: loc.coords.heading,
            accuracy: loc.coords.accuracy,
          })
        );
      })();
      return () => { sub?.remove(); };
    }, []);

    const speedKmh = location?.speed != null && location.speed > 0
      ? Math.round(location.speed * 3.6) : 0;

    return (
      <LocationContext.Provider value={{ location, speedKmh, heading: location?.heading ?? 0, hasPermission }}>
        {children}
      </LocationContext.Provider>
    );
  }

  export const useLocation = () => useContext(LocationContext);
  