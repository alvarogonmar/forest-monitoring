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
            <Text style={styles.body}>El sistema recibió y guardó tu solicitud de ayuda.</Text>
            <RequestCard request={request} title="Recepción confirmada" confirmed/>
            <Text style={styles.footnote}>Esta confirmación acredita el guardado. No significa que un administrador haya leído la solicitud ni que haya ayuda en camino.</Text>
            <Pressable accessibilityRole="button" onPress={() => void reset()} style={styles.textButton}><Text style={styles.textButtonLabel}>Crear otra solicitud</Text></Pressable>

  </>;
}
