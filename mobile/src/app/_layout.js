import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HelpRequestProvider } from '../context/HelpRequestContext';
import { colors } from '../ui/theme';

export default function RootLayout() {
  return <SafeAreaProvider>
    <HelpRequestProvider>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ title: 'Solicitar ayuda' }} />
        <Stack.Screen name="pendiente" options={{ title: 'Solicitud guardada' }} />
        <Stack.Screen name="enviando" options={{ title: 'Enviando solicitud' }} />
        <Stack.Screen name="confirmada" options={{ title: 'Solicitud recibida' }} />
      </Stack>
    </HelpRequestProvider>
  </SafeAreaProvider>;
}
