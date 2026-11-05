import { Redirect } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { useHelpRequest } from '../context/HelpRequestContext';
import { getRequestRoute } from '../navigation/requestRoute';
import { colors, styles } from '../ui/theme';
import HelpShell from './HelpShell';

export default function HelpRoute({ path, Screen }) {
  const { state } = useHelpRequest();
  const destination = getRequestRoute(state);
  // Redirect replaces the route instead of stacking stale workflow states.
  // It also corrects an old browser URL or deep link to a confirmed request.
  if (destination && destination !== path) return <Redirect href={destination} />;
  return <HelpShell>
    {state.ready ? <Screen /> : <>
      <ActivityIndicator size="large" color={colors.forest} />
      <Text style={styles.body}>Recuperando tu solicitud…</Text>
    </>}
  </HelpShell>;
}
