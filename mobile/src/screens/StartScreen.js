import { ActivityIndicator, Pressable, Text, useWindowDimensions } from 'react-native';
import { Icon } from '../components/Icons';
import { useHelpRequest } from '../context/HelpRequestContext';
import { styles } from '../ui/theme';

export default function StartScreen() {
  const { state, create } = useHelpRequest();
  const { width } = useWindowDimensions();
  const online = state.online === true;
  const buttonSize = Math.min(228, width - 96);
  return <>
            <Text accessibilityRole="header" style={styles.title}>Ayuda en el{'\n'}Bosque de{'\n'}La Primavera</Text>
            <Text style={styles.body}>{online ? 'Si necesitas ayuda, comparte tu ubicación con una solicitud.' : 'Si no tienes internet, tu solicitud quedará guardada aquí.'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Solicitar ayuda y obtener mi ubicación" disabled={state.phase === 'saving'} onPress={() => void create()} style={({ pressed }) => [styles.helpButton, { width: buttonSize, height: buttonSize, borderRadius: buttonSize / 2 }, pressed && styles.pressed]}>
              {state.phase === 'saving' ? <ActivityIndicator size="large" color="white"/> : <><Icon name="hand" size={54} color="white"/><Text style={styles.helpLabel}>Solicitar{'\n'}ayuda</Text></>}
            </Pressable>
            <Text style={styles.footnote}>Cuando vuelvas a tener conexión,{'\n'}abre la app para enviar tu solicitud.</Text>

  </>;
}
