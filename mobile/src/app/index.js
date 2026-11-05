import HelpRoute from '../components/HelpRoute';
import StartScreen from '../screens/StartScreen';

export default function IndexRoute() {
  return <HelpRoute path="/" Screen={StartScreen} />;
}
