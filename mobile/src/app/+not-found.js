import HelpRoute from '../components/HelpRoute';
import StartScreen from '../screens/StartScreen';

export default function UnknownRoute() {
  return <HelpRoute path={null} Screen={StartScreen} />;
}
