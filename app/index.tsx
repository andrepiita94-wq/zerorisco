import { Feather } from '@expo/vector-icons';
  import * as Haptics from 'expo-haptics';
  import { router } from 'expo-router';
  import React from 'react';
  import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import AppMap from '@/components/AppMap';
  import { useLocation } from '@/contexts/LocationContext';
  import { useNavigation, IncidentType } from '@/contexts/NavigationContext';

  const GREEN = '#00C853';
  const BG = '#0A0A0A';
  const CARD = '#111111';
  const BORDER = '#1E2820';
  const MUTED = 'rgba(255,255,255,0.45)';

  function formatDist(m: number) {
    return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  }
  function formatTime(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m} min`;
  }
  function maneuverArrow(type: string, mod: string) {
    if (type === 'arrive') return '🏁';
    if (type === 'depart') return '⬆️';
    if (mod === 'left' || mod === 'sharp left') return '↰';
    if (mod === 'right' || mod === 'sharp right') return '↱';
    if (mod === 'slight left') return '↖️';
    if (mod === 'slight right') return '↗️';
    if (mod === 'uturn') return '↩️';
    return '⬆️';
  }

  const INCIDENTS: { type: IncidentType; emoji: string; label: string }[] = [
    { type: 'police',    emoji: '🚔', label: 'Polícia' },
    { type: 'accident',  emoji: '💥', label: 'Acidente' },
    { type: 'hazard',    emoji: '⚠️', label: 'Perigo' },
    { type: 'roadblock', emoji: '🚧', label: 'Bloqueio' },
  ];

  export default function MapScreen() {
    const insets = useSafeAreaInsets();
    const { location, speedKmh } = useLocation();
    const {
      destination, route, phase, isLoading,
      currentStep, distanceToStep,
      incidents, startNavigation, stopNavigation, clearDestination, reportIncident,
    } = useNavigation();

    const origin = location ? { lat: location.latitude, lng: location.longitude } : undefined;

    return (
      <View style={styles.container}>
        {/* ── Mapa full screen ────────────────────────────────────────── */}
        <AppMap
          origin={origin}
          destination={destination ?? undefined}
          routeCoordinates={route?.polylineCoords}
          incidents={incidents}
          isNavigating={phase === 'navigating'}
          userHeading={location?.heading ?? undefined}
        />

        {/* ── Header de navegação (turn-by-turn) ──────────────────────── */}
        {phase === 'navigating' && currentStep && (
          <View style={[styles.navHeader, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.navArrow}>
              {maneuverArrow(currentStep.maneuverType, currentStep.maneuverModifier)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.navDist}>{formatDist(distanceToStep)}</Text>
              <Text style={styles.navInstruction} numberOfLines={2}>
                {currentStep.instruction}
              </Text>
            </View>
          </View>
        )}

        {/* ── Botão de busca (idle / preview) ─────────────────────────── */}
        {phase !== 'navigating' && (
          <TouchableOpacity
            style={[styles.searchBtn, { top: insets.top + 14 }]}
            onPress={() => router.push('/search')}
            activeOpacity={0.88}
          >
            <Feather name="search" size={17} color={MUTED} />
            <Text style={styles.searchBtnText} numberOfLines={1}>
              {destination ? destination.address.split(',')[0] : 'Para onde?'}
            </Text>
            {destination && (
              <TouchableOpacity
                onPress={() => { clearDestination(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={17} color={MUTED} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}

        {/* ── Velocidade (navegando) ───────────────────────────────────── */}
        {phase === 'navigating' && (
          <View style={[styles.speedBox, { bottom: insets.bottom + 190 }]}>
            <Text style={styles.speedVal}>{speedKmh}</Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}

        {/* ── Bottom sheet ────────────────────────────────────────────── */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>

          {/* IDLE */}
          {phase === 'idle' && (
            <>
              <Text style={styles.sheetLabel}>Alertar ocorrência</Text>
              <View style={styles.incidentRow}>
                {INCIDENTS.map(inc => (
                  <TouchableOpacity
                    key={inc.type}
                    style={styles.incidentBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); reportIncident(inc.type); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.incidentEmoji}>{inc.emoji}</Text>
                    <Text style={styles.incidentLabel}>{inc.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/search')}
                activeOpacity={0.88}
              >
                <Feather name="navigation" size={18} color="#000" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Para onde?</Text>
              </TouchableOpacity>
            </>
          )}

          {/* PREVIEW */}
          {phase === 'preview' && (
            <>
              {isLoading ? (
                <Text style={[styles.sheetLabel, { textAlign: 'center', paddingVertical: 8 }]}>
                  Calculando rota...
                </Text>
              ) : route ? (
                <>
                  <View style={styles.routeRow}>
                    <View style={styles.routeItem}>
                      <Text style={styles.routeVal}>{formatTime(route.totalDuration)}</Text>
                      <Text style={styles.routeLabel}>Tempo estimado</Text>
                    </View>
                    <View style={styles.routeDivider} />
                    <View style={styles.routeItem}>
                      <Text style={styles.routeVal}>{formatDist(route.totalDistance)}</Text>
                      <Text style={styles.routeLabel}>Distância</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); startNavigation(); }}
                    activeOpacity={0.88}
                  >
                    <Feather name="play" size={18} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryBtnText}>Iniciar Navegação</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={[styles.sheetLabel, { color: '#FF5555', textAlign: 'center' }]}>
                  Rota não encontrada. Tente outro destino.
                </Text>
              )}
            </>
          )}

          {/* NAVIGATING */}
          {phase === 'navigating' && route && (
            <>
              <View style={styles.routeRow}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeVal}>{formatTime(route.totalDuration)}</Text>
                  <Text style={styles.routeLabel}>Chegada prevista</Text>
                </View>
                <View style={styles.routeDivider} />
                <View style={styles.routeItem}>
                  <Text style={styles.routeVal}>{formatDist(route.totalDistance)}</Text>
                  <Text style={styles.routeLabel}>Distância total</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#FF4444' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); stopNavigation(); }}
                activeOpacity={0.88}
              >
                <Feather name="square" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={[styles.primaryBtnText, { color: '#fff' }]}>Parar Navegação</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },

    searchBtn: {
      position: 'absolute', left: 14, right: 14,
      backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14, gap: 10,
      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 10, elevation: 8,
    },
    searchBtnText: { flex: 1, color: MUTED, fontSize: 15, fontFamily: 'Inter_400Regular' },

    navHeader: {
      position: 'absolute', top: 0, left: 0, right: 0,
      backgroundColor: GREEN,
      flexDirection: 'row', alignItems: 'center', gap: 16,
      paddingHorizontal: 18, paddingBottom: 18,
      shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
    },
    navArrow: { fontSize: 38 },
    navDist: { color: 'rgba(0,0,0,0.65)', fontSize: 13, fontFamily: 'Inter_400Regular' },
    navInstruction: { color: '#000', fontSize: 19, fontFamily: 'Inter_700Bold', lineHeight: 24 },

    speedBox: {
      position: 'absolute', left: 16,
      width: 68, height: 68, borderRadius: 14,
      backgroundColor: CARD, borderWidth: 2, borderColor: GREEN,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: GREEN, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 5,
    },
    speedVal: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold', lineHeight: 28 },
    speedUnit: { color: MUTED, fontSize: 10, fontFamily: 'Inter_400Regular' },

    sheet: {
      backgroundColor: CARD,
      borderTopLeftRadius: 22, borderTopRightRadius: 22,
      borderTopWidth: 1, borderColor: BORDER,
      padding: 20, paddingTop: 18, gap: 14,
    },
    sheetLabel: {
      color: 'rgba(255,255,255,0.5)',
      fontSize: 11, fontFamily: 'Inter_700Bold',
      textTransform: 'uppercase', letterSpacing: 1,
    },
    incidentRow: { flexDirection: 'row', gap: 10 },
    incidentBtn: {
      flex: 1, backgroundColor: '#141414', borderRadius: 12,
      borderWidth: 1, borderColor: BORDER,
      alignItems: 'center', paddingVertical: 12, gap: 5,
    },
    incidentEmoji: { fontSize: 22 },
    incidentLabel: { color: MUTED, fontSize: 10, fontFamily: 'Inter_400Regular' },

    primaryBtn: {
      backgroundColor: GREEN, borderRadius: 16,
      paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    },
    primaryBtnText: { color: '#000', fontSize: 16, fontFamily: 'Inter_700Bold' },

    routeRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 20, paddingVertical: 6,
    },
    routeItem: { alignItems: 'center', flex: 1 },
    routeVal: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
    routeLabel: { color: MUTED, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
    routeDivider: { width: 1, height: 38, backgroundColor: BORDER },
  });
  