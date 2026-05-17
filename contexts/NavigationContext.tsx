import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
  import * as Speech from 'expo-speech';
  import { getRoute, RouteResult, RouteStep } from '@/lib/routing';
  import { useLocation } from './LocationContext';

  export type IncidentType = 'police' | 'accident' | 'hazard' | 'roadblock';

  export type Incident = {
    id: string;
    type: IncidentType;
    lat: number;
    lng: number;
    reportedAt: number;
  };

  export type Destination = { address: string; lat: number; lng: number };
  export type Phase = 'idle' | 'preview' | 'navigating';

  type Ctx = {
    destination: Destination | null;
    route: RouteResult | null;
    phase: Phase;
    isLoading: boolean;
    currentStepIndex: number;
    currentStep: RouteStep | null;
    nextStep: RouteStep | null;
    distanceToStep: number;
    incidents: Incident[];
    setDestination: (dest: Destination) => Promise<void>;
    startNavigation: () => void;
    stopNavigation: () => void;
    reportIncident: (type: IncidentType) => void;
    clearDestination: () => void;
  };

  const NavigationContext = createContext<Ctx>({} as Ctx);

  function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const { location } = useLocation();
    const [destination, setDest] = useState<Destination | null>(null);
    const [route, setRoute] = useState<RouteResult | null>(null);
    const [phase, setPhase] = useState<Phase>('idle');
    const [isLoading, setIsLoading] = useState(false);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [distanceToStep, setDistanceToStep] = useState(0);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const announcedRef = useRef<Set<number>>(new Set());
    const arrivedRef = useRef(false);

    const currentStep = route?.steps[currentStepIndex] ?? null;
    const nextStep = route?.steps[currentStepIndex + 1] ?? null;

    async function setDestination(dest: Destination) {
      setDest(dest);
      setPhase('preview');
      setIsLoading(true);
      if (location) {
        const result = await getRoute(
          { lat: location.latitude, lng: location.longitude },
          { lat: dest.lat, lng: dest.lng }
        );
        setRoute(result);
      }
      setIsLoading(false);
    }

    function startNavigation() {
      if (!route) return;
      setCurrentStepIndex(0);
      setPhase('navigating');
      arrivedRef.current = false;
      announcedRef.current = new Set();
      Speech.speak('Iniciando navegação. Boa viagem!', { language: 'pt-BR' });
    }

    function stopNavigation() {
      Speech.stop();
      setPhase('idle');
      setDest(null);
      setRoute(null);
      setCurrentStepIndex(0);
      arrivedRef.current = false;
    }

    function clearDestination() {
      setDest(null);
      setRoute(null);
      setPhase('idle');
      setCurrentStepIndex(0);
    }

    function reportIncident(type: IncidentType) {
      if (!location) return;
      setIncidents(prev => [...prev, {
        id: Date.now().toString(), type,
        lat: location.latitude, lng: location.longitude,
        reportedAt: Date.now(),
      }]);
    }

    useEffect(() => {
      if (phase !== 'navigating' || !route || !location || !currentStep) return;
      const lastStep = route.steps[route.steps.length - 1];
      const [destLng, destLat] = lastStep.startCoord;
      const distToDest = haversine(location.latitude, location.longitude, destLat, destLng);
      if (distToDest < 30 && !arrivedRef.current) {
        arrivedRef.current = true;
        Speech.speak('Você chegou ao seu destino!', { language: 'pt-BR' });
        setTimeout(() => stopNavigation(), 4000);
        return;
      }
      const targetCoord = nextStep?.startCoord ?? currentStep.startCoord;
      const dist = haversine(location.latitude, location.longitude, targetCoord[1], targetCoord[0]);
      setDistanceToStep(Math.round(dist));
      if (dist < 25 && nextStep && currentStepIndex < route.steps.length - 1) {
        setCurrentStepIndex(i => i + 1);
        announcedRef.current = new Set();
        return;
      }
      const nextInstruction = nextStep?.instruction ?? currentStep.instruction;
      if (dist < 200 && !announcedRef.current.has(200)) {
        announcedRef.current.add(200);
        const distText = dist > 150 ? 'em 200 metros' : dist > 80 ? 'em 100 metros' : 'em breve';
        Speech.speak(`${distText}, ${nextInstruction}`, { language: 'pt-BR' });
      }
      if (dist < 40 && !announcedRef.current.has(40)) {
        announcedRef.current.add(40);
        Speech.speak(nextInstruction, { language: 'pt-BR' });
      }
    }, [location?.latitude, location?.longitude, phase]);

    return (
      <NavigationContext.Provider value={{
        destination, route, phase, isLoading,
        currentStepIndex, currentStep, nextStep, distanceToStep,
        incidents, setDestination, startNavigation, stopNavigation,
        reportIncident, clearDestination,
      }}>
        {children}
      </NavigationContext.Provider>
    );
  }

  export const useNavigation = () => useContext(NavigationContext);
  