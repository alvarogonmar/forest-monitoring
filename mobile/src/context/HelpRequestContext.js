import { createContext, useContext } from 'react';
import { useHelpRequest as useDeviceHelpRequest } from '../hooks/useHelpRequest';

const HelpRequestContext = createContext(null);

export function HelpRequestProvider({ children }) {
  // This instance lives above the Stack: screen transitions never restart GPS,
  // storage restoration, connection listeners, or a pending send.
  const value = useDeviceHelpRequest();
  return <HelpRequestContext.Provider value={value}>{children}</HelpRequestContext.Provider>;
}

export function useHelpRequest() {
  const value = useContext(HelpRequestContext);
  if (!value) throw new Error('La pantalla debe estar dentro de HelpRequestProvider.');
  return value;
}
