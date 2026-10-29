import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ForestLogo, Icon } from './src/components/Icons';
import { useHelpRequest } from './src/hooks/useHelpRequest';
const colors = { background: '#FFFEFA', forest: '#123F32', muted: '#788D8C', orange: '#BC6106', cream: '#FCF8EF', red: '#D7372E', success: '#005B41' };
function Spinner() {
    const turn = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const animation = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1150, easing: Easing.linear, useNativeDriver: true }));
        animation.start();
        return () => animation.stop();
    }, [turn]);
    return <Animated.View accessibilityLabel="Enviando solicitud" style={[styles.spinner, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}/>;
}
function RequestCard({ request, title, pending = false, confirmed = false }) {
    const date = new Date(request.createdAt);
    const stamp = `${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    return <View style={[styles.card, confirmed && styles.confirmedCard, pending && styles.pendingCard]}>
    {pending ? <View style={styles.clock}><Icon name="clock" color={colors.orange} size={34}/></View> : null}
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, pending && styles.left]}>{title}</Text>
      <Text selectable style={[styles.folio, pending && styles.left]}>Folio {request.id.slice(0, 8).toUpperCase()} · {stamp}</Text>
    </View>
  </View>;
}
function HelpScreen() {
    const { state, create, retry, reset } = useHelpRequest();
    const { height, width } = useWindowDimensions();
    const compact = height < 760;
    const request = state.request;
    const confirmed = state.phase === 'confirmed';
    const sending = state.phase === 'sending';
    const locating = state.phase === 'locating';
    const online = state.online === true;
    const buttonSize = Math.min(228, width - 96);
    return <SafeAreaView style={styles.safe}>
    <StatusBar style="dark"/>
    <ScrollView contentContainerStyle={[styles.scroll, { minHeight: height - 60 }]}>
      <View style={[styles.page, compact && styles.compactPage]}>
        <View style={styles.header}>
          <ForestLogo />
          <Text style={styles.brand}>Bosque de{'\n'}La Primavera</Text>
          <View style={styles.connection} accessibilityLiveRegion="polite">
            {state.online === null ? <ActivityIndicator size="small" color={colors.muted}/> : <Icon name={online ? 'wifi' : 'wifi-off'} size={24} color={online ? colors.success : colors.orange}/>}
            <Text style={[styles.connectionText, { color: state.online === null ? colors.muted : online ? colors.success : colors.orange }]}>
              {state.online === null ? 'Comprobando conexión' : online ? 'Conexión disponible' : 'Sin conexión'}
            </Text>
          </View>
          <View style={styles.demo}><View style={styles.demoDot}/><Text style={styles.demoText}>Modo demostración · envío simulado</Text></View>
        </View>

        <View style={[styles.main, { marginTop: compact ? 44 : 70 }]} accessibilityLiveRegion="polite">
          {!state.ready ? <>
            <ActivityIndicator size="large" color={colors.forest}/>
            <Text style={styles.body}>Recuperando tu solicitud…</Text>
          </> : !request ? <>
            <Text accessibilityRole="header" style={styles.title}>Ayuda en el{'\n'}Bosque de{'\n'}La Primavera</Text>
            <Text style={styles.body}>{online ? 'Si necesitas ayuda, comparte tu ubicación con una solicitud.' : 'Si no tienes internet, tu solicitud quedará guardada aquí.'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Solicitar ayuda y obtener mi ubicación" disabled={state.phase === 'saving'} onPress={() => void create()} style={({ pressed }) => [styles.helpButton, { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }, pressed && styles.pressed]}>
              {state.phase === 'saving' ? <ActivityIndicator size="large" color="white"/> : <><Icon name="hand" size={54} color="white"/><Text style={styles.helpLabel}>Solicitar{'\n'}ayuda</Text></>}
            </Pressable>
            <Text style={styles.footnote}>Cuando vuelvas a tener conexión,{'\n'}abre la app para enviar tu solicitud.</Text>
          </> : confirmed ? <>
            <View style={styles.successCircle}><Icon name="check" size={82} color={colors.success}/></View>
            <Text accessibilityRole="header" style={[styles.title, styles.singleTitle]}>Solicitud recibida</Text>
            <Text style={styles.body}>Tu solicitud de prueba ya fue recibida y guardada en esta demostración.</Text>
            <RequestCard request={request} title="Recepción simulada" confirmed/>
            <Text style={styles.footnote}>Esta es una confirmación de prueba. Ningún administrador ha recibido la solicitud ni hay ayuda en camino.</Text>
            <Pressable accessibilityRole="button" onPress={() => void reset()} style={styles.textButton}><Text style={styles.textButtonLabel}>Iniciar otra demostración</Text></Pressable>
          </> : sending ? <>
            <Text accessibilityRole="header" style={[styles.title, styles.singleTitle]}>Enviando solicitud</Text>
            <Text style={styles.body}>Estamos enviando tu solicitud.{'\n'}Mantén la app abierta un momento.</Text>
            <View style={styles.loading}><Spinner /><Text style={styles.waiting}>Esperando confirmación…</Text></View>
            <RequestCard request={request} title="Tu solicitud sigue guardada"/>
            <Text style={styles.footnote}>Te avisaremos aquí cuando se confirme la recepción de prueba.</Text>
          </> : <>
            <Text style={styles.eyebrow}>GUARDADA EN ESTE TELÉFONO</Text>
            <Text accessibilityRole="header" style={styles.title}>Tu solicitud está{'\n'}guardada</Text>
            <Text style={styles.body}>Todavía no ha sido recibida por el sistema.</Text>
            <RequestCard request={request} title="Pendiente de envío" pending/>
            {locating ? <View style={styles.gpsLoading}><ActivityIndicator color={colors.orange}/><Text style={styles.waiting}>Obteniendo tu ubicación…</Text></View> : null}
            <Text style={styles.footnote}>{locating ? 'Estamos buscando las coordenadas de este dispositivo.' : 'Cuando vuelvas a tener conexión, mantén la app abierta para intentar enviar tu solicitud.'}</Text>
          </>}

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
export default function App() { return <SafeAreaProvider><HelpScreen /></SafeAreaProvider>; }
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, alignItems: 'center' },
    page: { width: '100%', maxWidth: 460, paddingHorizontal: 30, paddingTop: 28, paddingBottom: 22, flexGrow: 1 },
    compactPage: { paddingTop: 18, paddingHorizontal: 24 },
    header: { alignItems: 'center' },
    brand: { textAlign: 'center', fontSize: 19, lineHeight: 21, fontWeight: '700', color: colors.forest, marginTop: 6 },
    connection: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 26 },
    connectionText: { fontSize: 14, fontWeight: '600' },
    main: { alignItems: 'center', width: '100%' },
    title: { fontSize: 36, lineHeight: 41, fontWeight: '700', color: colors.forest, textAlign: 'center', letterSpacing: -1.1 },
    singleTitle: { fontSize: 33, lineHeight: 40, letterSpacing: -1.2 },
    body: { color: colors.muted, fontSize: 18, lineHeight: 26, textAlign: 'center', marginTop: 20 },
    helpButton: { backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 26, boxShadow: '0px 12px 25px rgba(215, 55, 46, 0.15)' },
    pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
    helpLabel: { color: '#FFFFFF', fontSize: 27, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
    footnote: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 30 },
    eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, textAlign: 'center', marginBottom: 20 },
    card: { width: '100%', borderRadius: 22, backgroundColor: colors.cream, paddingHorizontal: 20, paddingVertical: 24, marginTop: 38 },
    confirmedCard: { backgroundColor: '#F3F7EE' },
    pendingCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 42 },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 18, lineHeight: 25, fontWeight: '600', textAlign: 'center', color: colors.forest },
    folio: { fontSize: 14, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: 5 },
    left: { textAlign: 'left' },
    clock: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FCF2DC', alignItems: 'center', justifyContent: 'center' },
    loading: { alignItems: 'center', gap: 18, marginTop: 38 },
    spinner: { width: 65, height: 65, borderWidth: 5, borderColor: '#F0DABB', borderTopColor: colors.orange, borderRightColor: colors.orange, borderRadius: 33 },
    waiting: { color: colors.orange, fontWeight: '600', fontSize: 14, textAlign: 'center' },
    gpsLoading: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 22 },
    successCircle: { width: 122, height: 122, borderRadius: 61, backgroundColor: '#E8F6ED', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
    demo: { flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    demoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.orange },
    demoText: { fontSize: 11, color: colors.muted },
    coordinates: { color: colors.muted, textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 22 },
    error: { backgroundColor: '#FFF2E6', borderRadius: 16, padding: 16, marginTop: 22, width: '100%' },
    errorText: { fontSize: 15, lineHeight: 22, color: '#854608', textAlign: 'center' },
    retry: { minHeight: 46, borderRadius: 12, backgroundColor: colors.forest, padding: 12, marginTop: 14, alignItems: 'center', justifyContent: 'center' },
    retryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
    textButton: { paddingHorizontal: 8, paddingVertical: 14, minHeight: 44, marginTop: 12 },
    textButtonLabel: { fontSize: 14, color: colors.forest, fontWeight: '600', textAlign: 'center', textDecorationLine: 'underline' },
});
