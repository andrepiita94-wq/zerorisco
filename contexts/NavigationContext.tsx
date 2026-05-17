import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as Speech from 'expo-speech';
import { getRoute, RouteResult, RouteStep } from '@/lib/routing';
import { useLocation } from './LocationContext';
import { fetchIncidents, postIncident, hasRemoteBackend, RemoteIncident } from '@/lib/api';

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
  isRerouting: boolean;
  currentStepIndex: number;
  currentStep: RouteStep | null;
  nextStep: RouteStep | null;
  distanceToStep: number;
  remainingDuration: number;
  routeProgress: number;
  incidents: Incident[];
  isMuted: boolean;
  isConnectedToBackend: boolean;
  setDestination: (dest: Destination) => Promise<void>;
  startNavigation: () => void;
  stopNavigation: () => void;
  reportIncident: (type: IncidentType) => void;
  clearDestination: () => void;
  toggleMute: () => void;
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

function minDistToPolyline(lat: number, lng: number, coords: { latitude: number; longitude: number }[]): number {
  let min = Infinity;
  for (const c of coords) {
    const d = haversine(lat, lng, c.latitude, c.longitude);
    if (d < min) min = d;
  }
  return min;
}

function remoteToLocal(r: RemoteIncident): Incident {
  return {
    id: r.id,
    type: r.type as IncidentType,
    lat: r.lat,
    lng: r.lng,
    reportedAt: new Date(r.reported_at).getTime(),
  };
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const { location } = useLocation();
  const [destination, setDest] = useState<Destination | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [isRerouting, setIsRerouting] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceToStep, setDistanceToStep] = useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnectedToBackend, setIsConnectedToBackend] = useState(false);

  const announcedRef = useRef<Set<number>>(new Set());
  const arrivedRef = useRef(false);
  const lastRerouteRef = useRef(0);
  const alertedIncidentsRef = useRef<Set<string>>(new Set());
  const isMutedRef = useRef(false);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const currentStep = route?.steps[currentStepIndex] ?? null;
  const nextStep = route?.steps[currentStepIndex + 1] ?? null;
  const routeProgress = route ? Math.min(1, currentStepIndex / Math.max(1, route.steps.length - 1)) : 0;
  const remainingDuration = route
    ? route.steps.slice(currentStepIndex).reduce((sum, s) => sum + s.duration, 0)
    : 0;

  const speak = useCallback((text: string) => {
    if (isMutedRef.current) return;
    Speech.speak(text, { language: 'pt-BR' });
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (!prev) Speech.stop();
      return !prev;
    });
  }, []);

  // Sincronizar ocorrências com o backend Render a cada 60s
  useEffect(() => {
    if (!hasRemoteBackend) return;

    async function syncIncidents() {
      try {
        const remote = await fetchIncidents();
        setIncidents(remote.map(remoteToLocal));
        setIsConnectedToBackend(true);
      } catch {
        setIsConnectedToBackend(false);
      }
    }

    syncIncidents();
    const interval = setInterval(syncIncidents, 60_000);
    return () => clearInterval(interval);
  }, []);

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
    alertedIncidentsRef.current = new Set();
    speak('Iniciando navegação. Boa viagem!');
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
    const newIncident: Incident = {
      id: Date.now().toString(),
      type,
      lat: location.latitude,
      lng: location.longitude,
      reportedAt: Date.now(),
    };

    setIncidents(prev => [...prev, newIncident]);

    // Enviar ao backend Render de forma assíncrona
    if (hasRemoteBackend) {
      postIncident({ type, lat: location.latitude, lng: location.longitude });
    }
  }

  // Step tracking + voice guidance + incident proximity alerts
  useEffect(() => {
    if (phase !== 'navigating' || !route || !location || !currentStep) return;

    const lastStep = route.steps[route.steps.length - 1];
    const [destLng, destLat] = lastStep.startCoord;
    const distToDest = haversine(location.latitude, location.longitude, destLat, destLng);
    if (distToDest < 30 && !arrivedRef.current) {
      arrivedRef.current = true;
      speak('Você chegou ao seu destino!');
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
      speak(`${distText}, ${nextInstruction}`);
    }
    if (dist < 40 && !announcedRef.current.has(40)) {
      announcedRef.current.add(40);
      speak(nextInstruction);
    }

    // Alertas de ocorrência próxima (locais + remotas)
    for (const inc of incidents) {
      if (alertedIncidentsRef.current.has(inc.id)) continue;
      const distToInc = haversine(location.latitude, location.longitude, inc.lat, inc.lng);
      if (distToInc < 300) {
        alertedIncidentsRef.current.add(inc.id);
        const label = inc.type === 'police' ? 'Polícia à frente'
          : inc.type === 'accident' ? 'Acidente à frente'
          : inc.type === 'hazard' ? 'Perigo na via'
          : 'Bloqueio na via';
        speak(`Atenção! ${label}`);
      }
    }
  }, [location?.latitude, location?.longitude, phase]);

  // Auto-reroute quando fora da rota
  useEffect(() => {
    if (phase !== 'navigating' || !route || !location || !destination) return;
    const now = Date.now();
    if (now - lastRerouteRef.current < 15000) return;

    const distToRoute = minDistToPolyline(location.latitude, location.longitude, route.polylineCoords);
    if (distToRoute > 60) {
      lastRerouteRef.current = now;
      setIsRerouting(true);
      speak('Recalculando rota');
      getRoute(
        { lat: location.latitude, lng: location.longitude },
        { lat: destination.lat, lng: destination.lng }
      ).then(newRoute => {
        if (newRoute) {
          setRoute(newRoute);
          setCurrentStepIndex(0);
          announcedRef.current = new Set();
        }
        setIsRerouting(false);
      });
    }
  }, [location?.latitude, location?.longitude, phase]);

  return (
    <NavigationContext.Provider value={{
      destination, route, phase, isLoading, isRerouting,
      currentStepIndex, currentStep, nextStep, distanceToStep,
      remainingDuration, routeProgress,
      incidents, isMuted, isConnectedToBackend,
      setDestination, startNavigation, stopNavigation,
      reportIncident, clearDestination, toggleMute,
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export const useNavigation = () => useContext(NavigationContext);
