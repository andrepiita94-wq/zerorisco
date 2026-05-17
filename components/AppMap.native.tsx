import React, { useEffect, useRef, useState } from 'react';
  import { StyleSheet, Text, View } from 'react-native';

  // require() no nível do módulo — obrigatório para New Architecture (TurboModules)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const MapLibreGL = require('@maplibre/maplibre-react-native');

  // MapLibre v11: Map (era MapView), Marker (era PointAnnotation),
  // GeoJSONSource (era ShapeSource), Layer type="line" (era LineLayer)
  const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
  const GREEN = '#00C853';

  type LatLng = { lat: number; lng: number };
  type Incident = { id: string; type: string; lat: number; lng: number };

  type Props = {
    origin?: LatLng;
    destination?: LatLng;
    routeCoordinates?: { latitude: number; longitude: number }[];
    incidents?: Incident[];
    isNavigating?: boolean;
    userHeading?: number;
  };

  const INCIDENT_EMOJI: Record<string, string> = {
    police: '🚔', accident: '💥', hazard: '⚠️', roadblock: '🚧',
  };

  function MapLibreMap({ origin, destination, routeCoordinates, incidents = [], isNavigating, userHeading }: Props) {
    const cameraRef = useRef<any>(null);

    // Centro padrão: Rio de Janeiro
    const center: [number, number] = origin
      ? [origin.lng, origin.lat]
      : destination
      ? [destination.lng, destination.lat]
      : [-43.1729, -22.9068];

    useEffect(() => {
      if (!cameraRef.current) return;
      if (origin && isNavigating) {
        cameraRef.current.flyTo({
          center: [origin.lng, origin.lat],
          zoom: 17,
          bearing: userHeading ?? 0,
          duration: 800,
        });
      } else if (routeCoordinates && routeCoordinates.length > 1) {
        const lons = routeCoordinates.map(c => c.longitude);
        const lats = routeCoordinates.map(c => c.latitude);
        cameraRef.current.fitBounds(
          { sw: [Math.min(...lons), Math.min(...lats)], ne: [Math.max(...lons), Math.max(...lats)] },
          { duration: 600 }
        );
      } else if (origin) {
        cameraRef.current.flyTo({ center: [origin.lng, origin.lat], zoom: 15, duration: 600 });
      }
    }, [origin?.lat, origin?.lng, destination?.lat, destination?.lng, routeCoordinates?.length, isNavigating, userHeading]);

    const routeGeoJSON = routeCoordinates && routeCoordinates.length > 1
      ? {
          type: 'Feature', properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]),
          },
        }
      : null;

    const MapView = MapLibreGL.Map;
    const Marker  = MapLibreGL.Marker;
    const GeoJSONSource = MapLibreGL.GeoJSONSource;
    const Layer   = MapLibreGL.Layer;
    const Camera  = MapLibreGL.Camera;

    return (
      <View style={styles.container}>
        <MapView style={styles.map} mapStyle={STYLE_URL}>
          <Camera
            ref={cameraRef}
            center={center}
            zoom={isNavigating ? 17 : 14}
          />

          {/* Localização do usuário */}
          {origin && (
            <Marker id="user" coordinate={[origin.lng, origin.lat]}>
              <View style={styles.userDot}>
                <View style={styles.userDotInner} />
              </View>
            </Marker>
          )}

          {/* Destino */}
          {destination && (
            <Marker id="destination" coordinate={[destination.lng, destination.lat]}>
              <View style={styles.destPin}>
                <Text style={{ fontSize: 30 }}>📍</Text>
              </View>
            </Marker>
          )}

          {/* Ocorrências */}
          {incidents.map(inc => (
            <Marker key={inc.id} id={inc.id} coordinate={[inc.lng, inc.lat]}>
              <View style={styles.incidentBubble}>
                <Text style={{ fontSize: 18 }}>{INCIDENT_EMOJI[inc.type] ?? '⚠️'}</Text>
              </View>
            </Marker>
          ))}

          {/* Rota */}
          {routeGeoJSON && (
            <GeoJSONSource id="route" data={routeGeoJSON}>
              {/* Sombra da rota */}
              <Layer
                id="routeShadow"
                type="line"
                paint={{ 'line-color': '#000000', 'line-width': 9, 'line-opacity': 0.25 }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
              {/* Linha principal */}
              <Layer
                id="routeLine"
                type="line"
                paint={{ 'line-color': GREEN, 'line-width': 5, 'line-opacity': 0.95 }}
                layout={{ 'line-cap': 'round', 'line-join': 'round' }}
              />
            </GeoJSONSource>
          )}
        </MapView>
      </View>
    );
  }

  class MapErrorBoundary extends React.Component<
    { children: React.ReactNode; onError: () => void },
    { hasError: boolean }
  > {
    constructor(props: { children: React.ReactNode; onError: () => void }) {
      super(props);
      this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch() { this.props.onError(); }
    render() {
      if (this.state.hasError) return null;
      return this.props.children;
    }
  }

  export default function AppMap(props: Props) {
    const [crashed, setCrashed] = useState(false);
    if (crashed) {
      return (
        <View style={[styles.container, styles.fallback]}>
          <Text style={styles.fallbackEmoji}>🗺️</Text>
          <Text style={styles.fallbackText}>Mapa não disponível</Text>
        </View>
      );
    }
    return (
      <MapErrorBoundary onError={() => setCrashed(true)}>
        <MapLibreMap {...props} />
      </MapErrorBoundary>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    map: { flex: 1 },
    fallback: { alignItems: 'center', justifyContent: 'center', gap: 10 },
    fallbackEmoji: { fontSize: 48 },
    fallbackText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
    userDot: {
      width: 26, height: 26, borderRadius: 13,
      backgroundColor: 'rgba(0,200,83,0.25)',
      borderWidth: 2.5, borderColor: GREEN,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8, elevation: 6,
    },
    userDotInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: GREEN },
    destPin: { alignItems: 'center', justifyContent: 'center' },
    incidentBubble: {
      backgroundColor: 'rgba(10,10,10,0.8)', borderRadius: 20, padding: 5,
      borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    },
  });
  