import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { Icon } from './Icons';
import { colors, styles } from '../ui/theme';

export function Spinner() {
    const [turn] = useState(() => new Animated.Value(0));
    useEffect(() => {
        const animation = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 1150, easing: Easing.linear, useNativeDriver: true }));
        animation.start();
        return () => animation.stop();
    }, [turn]);
    return <Animated.View accessibilityLabel="Enviando solicitud" style={[styles.spinner, { transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}/>;
}
export function RequestCard({ request, title, pending = false, confirmed = false }) {
    const date = new Date(request.createdAt);
    const stamp = `${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    return <View style={[styles.card, confirmed && styles.confirmedCard, pending && styles.pendingCard]}>
    {pending ? <View style={styles.clock}><Icon name="clock" color={colors.orange} size={34}/></View> : null}
    <View style={styles.cardContent}>
      <Text style={[styles.cardTitle, pending && styles.left]}>{title}</Text>
      <Text selectable style={[styles.folio, pending && styles.left]}>Folio {request.id.slice(0, 8).toUpperCase()} · {stamp}</Text>
    </View>
  </View>;
}
