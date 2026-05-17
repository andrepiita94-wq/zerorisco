import React from 'react';
  import { StyleSheet, Text, View } from 'react-native';

  type Props = {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    routeCoordinates?: { latitude: number; longitude: number }[];
    incidents?: any[];
    isNavigating?: boolean;
    userHeading?: number;
  };

  export default function AppMap(_props: Props) {
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🗺️</Text>
        <Text style={styles.text}>Mapa disponível apenas no app</Text>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1, backgroundColor: '#0A0A0A',
      alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    emoji: { fontSize: 48 },
    text: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  });
  