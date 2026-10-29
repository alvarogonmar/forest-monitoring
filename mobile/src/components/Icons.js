import Svg, { Circle, Path } from 'react-native-svg';
export function ForestLogo() {
    return <Svg width={76} height={50} viewBox="0 0 90 60" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Path fill="#123F32" d="M45 1 33 23h7L29 42h12v15h8V42h12L50 23h7ZM15 20 5 38h6L3 51h10v9h5v-9h10l-8-13h5ZM76 20 66 38h6l-8 13h10v9h5v-9h10l-8-13h5Z"/>
  </Svg>;
}
export function Icon({ name, size = 24, color = '#123F32' }) {
    return <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {name === 'hand' ? <Path d="M18 26V10a3 3 0 0 1 6 0v13-17a3 3 0 0 1 6 0v17-13a3 3 0 0 1 6 0v15-9a3 3 0 0 1 6 0v15c0 9-6 15-15 15-6 0-10-3-14-7L5 29a3 3 0 0 1 5-4l8 8v-7"/> : null}
    {name === 'clock' ? <><Circle cx="24" cy="24" r="19"/><Path d="M24 12v13l10 6"/></> : null}
    {name === 'check' ? <><Circle cx="24" cy="24" r="19"/><Path strokeWidth={3.5} d="m15 24 6 6 13-14"/></> : null}
    {name === 'wifi' || name === 'wifi-off' ? <><Path d="M5 16c10-10 28-10 38 0M12 24c7-7 17-7 24 0M19 32c3-3 7-3 10 0"/><Circle cx="24" cy="39" r="1" fill={color} strokeWidth={0}/>{name === 'wifi-off' ? <Path d="m4 4 40 40" strokeWidth={4}/> : null}</> : null}
  </Svg>;
}
