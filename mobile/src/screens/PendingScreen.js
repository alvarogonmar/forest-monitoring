import { ActivityIndicator, Text, View } from 'react-native';
import { RequestCard } from '../components/RequestFeedback';
import { useHelpRequest } from '../context/HelpRequestContext';
import { colors, styles } from '../ui/theme';

export default function PendingScreen() {
  const { state } = useHelpRequest();
  const { request } = state;
  const locating = state.phase === 'locating';
  return <>
            <Text style={styles.eyebrow}>GUARDADA EN ESTE TELÉFONO</Text>
            <Text accessibilityRole="header" style={styles.title}>Tu solicitud está{'\n'}guardada</Text>
            <Text style={styles.body}>Todavía no ha sido recibida por el sistema.</Text>
            <RequestCard request={request} title="Pendiente de envío" pending/>
            {locating ? <View style={styles.gpsLoading}><ActivityIndicator color={colors.orange}/><Text style={styles.waiting}>Obteniendo tu ubicación…</Text></View> : null}
            <Text style={styles.footnote}>{locating ? 'Estamos buscando las coordenadas de este dispositivo.' : 'Cuando vuelvas a tener conexión, mantén la app abierta para intentar enviar tu solicitud.'}</Text>

  </>;
}
