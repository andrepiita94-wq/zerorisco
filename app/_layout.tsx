import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
  import { Stack } from 'expo-router';
  import * as SplashScreen from 'expo-splash-screen';
  import { StatusBar } from 'expo-status-bar';
  import { useEffect } from 'react';
  import { GestureHandlerRootView } from 'react-native-gesture-handler';
  import { SafeAreaProvider } from 'react-native-safe-area-context';
  import { LocationProvider } from '@/contexts/LocationContext';
  import { NavigationProvider } from '@/contexts/NavigationContext';

  SplashScreen.preventAutoHideAsync();

  export default function RootLayout() {
    const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_700Bold });

    useEffect(() => {
      if (fontsLoaded) SplashScreen.hideAsync();
    }, [fontsLoaded]);

    if (!fontsLoaded) return null;

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <LocationProvider>
            <NavigationProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, animation: 'slide_from_bottom' }} />
            </NavigationProvider>
          </LocationProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }
  