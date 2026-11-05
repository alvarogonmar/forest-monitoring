import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useHelpRequest } from '../context/HelpRequestContext';
import { colors, styles } from '../ui/theme';
import { ForestLogo, Icon } from './Icons';

export default function HelpShell({ children }) {
  const { state, retry } = useHelpRequest();
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const { request } = state;
  const online = state.online === true;
  return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={[styles.scroll, { minHeight: height - 60 }]}>
      <View style={[styles.page, compact && styles.compactPage]}>
        <View style={styles.header}>
          <ForestLogo />
          <Text style={styles.brand}>Bosque de{'\n'}La Primavera</Text>
          <View style={styles.connection} accessibilityLiveRegion="polite">
            {state.online === null ? <ActivityIndicator size="small" color={colors.muted} /> : <Icon name={online ? 'wifi' : 'wifi-off'} size={24} color={online ? colors.success : colors.orange} />}
            <Text style={[styles.connectionText, { color: state.online === null ? colors.muted : online ? colors.success : colors.orange }]}>
              {state.online === null ? 'Comprobando conexión' : online ? 'Conexión disponible' : 'Sin conexión'}
            </Text>
          </View>
          <View style={styles.demo}><View style={styles.demoDot} /><Text style={styles.demoText}>Modo demostración · envío simulado</Text></View>
        </View>
        <View style={[styles.main, { marginTop: compact ? 44 : 70 }]} accessibilityLiveRegion="polite">
          {children}
          {state.error ? <View accessibilityRole="alert" style={styles.error}>
            <Text style={styles.errorText}>{state.error}</Text>
            <Pressable accessibilityRole="button" onPress={() => void retry()} style={styles.retry}><Text style={styles.retryText}>Reintentar</Text></Pressable>
            {request && !request.coordinates ? <Pressable accessibilityRole="button" onPress={() => { void Linking.openSettings(); }} style={styles.textButton}><Text style={styles.textButtonLabel}>Abrir ajustes de ubicación</Text></Pressable> : null}
          </View> : null}
          {request?.coordinates ? <Text selectable style={styles.coordinates}>
            Ubicación registrada: {request.coordinates.latitude.toFixed(6)}, {request.coordinates.longitude.toFixed(6)}{'\n'}
            {request.coordinates.accuracy !== null ? `Precisión aproximada: ±${Math.round(request.coordinates.accuracy)} m` : 'Precisión no disponible'}
          </Text> : null}
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>;
}
