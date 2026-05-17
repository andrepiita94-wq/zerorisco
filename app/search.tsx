import { Feather } from '@expo/vector-icons';
  import * as Haptics from 'expo-haptics';
  import { router } from 'expo-router';
  import React, { useEffect, useRef, useState } from 'react';
  import {
    ActivityIndicator, FlatList, StyleSheet, Text,
    TextInput, TouchableOpacity, View,
  } from 'react-native';
  import { useSafeAreaInsets } from 'react-native-safe-area-context';
  import { searchPlaces, GeocodingResult } from '@/lib/geocoding';
  import { useNavigation } from '@/contexts/NavigationContext';

  const GREEN = '#00C853';
  const BG = '#0A0A0A';
  const CARD = '#111111';
  const BORDER = '#1E2820';
  const MUTED = 'rgba(255,255,255,0.45)';

  const QUICK_DESTINATIONS = [
    { label: 'Casa', icon: 'home' as const, emoji: '🏠' },
    { label: 'Trabalho', icon: 'briefcase' as const, emoji: '💼' },
  ];

  export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<GeocodingResult[]>([]);
    const [loading, setLoading] = useState(false);
    const { setDestination } = useNavigation();
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

    useEffect(() => {
      if (timer.current) clearTimeout(timer.current);
      if (!query.trim()) { setResults([]); return; }
      timer.current = setTimeout(async () => {
        setLoading(true);
        const res = await searchPlaces(query);
        setResults(res);
        setLoading(false);
      }, 400);
    }, [query]);

    async function handleSelect(item: GeocodingResult) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await setDestination({ address: item.address, lat: item.lat, lng: item.lng });
      router.back();
    }

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <Feather name="search" size={18} color={MUTED} />
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Para onde você quer ir?"
              placeholderTextColor={MUTED}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="x" size={18} color={MUTED} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={[styles.emptyText, { marginTop: 12 }]}>Buscando locais...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(_, i) => i.toString()}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={results.length === 0 ? { flex: 1 } : undefined}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.7}>
                <View style={styles.resultIcon}>
                  <Feather name="map-pin" size={16} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.address.split(',')[0]}
                  </Text>
                  <Text style={styles.resultSub} numberOfLines={1}>
                    {item.address.split(',').slice(1, 3).join(',')}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              query.length > 2 && !loading ? (
                <View style={styles.center}>
                  <Text style={{ fontSize: 36 }}>🔍</Text>
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>Nenhum resultado encontrado</Text>
                  <Text style={[styles.emptyText, { fontSize: 12, marginTop: 4, opacity: 0.5 }]}>
                    Tente um endereço mais completo
                  </Text>
                </View>
              ) : query.length === 0 ? (
                <View style={styles.center}>
                  <Text style={{ fontSize: 40 }}>🗺️</Text>
                  <Text style={[styles.emptyText, { marginTop: 8 }]}>Digite um destino</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    header: {
      flexDirection: 'row', alignItems: 'center',
      padding: 16, gap: 12,
      borderBottomWidth: 1, borderColor: BORDER,
    },
    backBtn: { padding: 4 },
    inputWrapper: {
      flex: 1, flexDirection: 'row', alignItems: 'center',
      backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER,
      paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    },
    input: { flex: 1, color: '#fff', fontSize: 15, fontFamily: 'Inter_400Regular' },
    resultItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
    resultIcon: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: '#0A2010', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: '#1A3820',
    },
    resultTitle: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
    resultSub: { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
    separator: { height: 1, backgroundColor: BORDER, marginLeft: 68 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { color: MUTED, fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  });
  