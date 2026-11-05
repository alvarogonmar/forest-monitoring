import { Pressable, Text, View } from 'react-native';
import { Icon } from '../components/Icons';
import { RequestCard } from '../components/RequestFeedback';
import { useHelpRequest } from '../context/HelpRequestContext';
import { colors, styles } from '../ui/theme';

export default function ConfirmedScreen() {
  const { state: { request }, reset } = useHelpRequest();
  return <>
            <View style={styles.successCircle}><Icon name="check" size={82} color={colors.success}/></View>
            <Text accessibilityRole="header" style={[styles.title, styles.singleTitle]}>Solicitud recibida</Text>
            <Text style={styles.body}>Tu solicitud de prueba ya fue recibida y guardada en esta demostración.</Text>
            <RequestCard request={request} title="Recepción simulada" confirmed/>
            <Text style={styles.footnote}>Esta es una confirmación de prueba. Ningún administrador ha recibido la solicitud ni hay ayuda en camino.</Text>
            <Pressable accessibilityRole="button" onPress={() => void reset()} style={styles.textButton}><Text style={styles.textButtonLabel}>Iniciar otra demostración</Text></Pressable>

  </>;
}
