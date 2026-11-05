import { Text, View } from 'react-native';
import { RequestCard, Spinner } from '../components/RequestFeedback';
import { useHelpRequest } from '../context/HelpRequestContext';
import { styles } from '../ui/theme';

export default function SendingScreen() {
  const { state: { request } } = useHelpRequest();
  return <>
            <Text accessibilityRole="header" style={[styles.title, styles.singleTitle]}>Enviando solicitud</Text>
            <Text style={styles.body}>Estamos enviando tu solicitud.{'\n'}Mantén la app abierta un momento.</Text>
            <View style={styles.loading}><Spinner /><Text style={styles.waiting}>Esperando confirmación…</Text></View>
            <RequestCard request={request} title="Tu solicitud sigue guardada"/>
            <Text style={styles.footnote}>Te avisaremos aquí cuando se confirme la recepción de prueba.</Text>

  </>;
}
