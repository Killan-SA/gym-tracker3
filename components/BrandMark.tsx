import { Image, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../constants/theme';

export function BrandMark({ size = 40, showName = true }: { size?: number; showName?: boolean }) {
  return <View accessible accessibilityLabel="GymTracker" style={s.row}>
    <Image source={require('../assets/brand-logo.png')} resizeMode="contain" style={{ width: size, height: size, borderRadius: size * 0.2 }} />
    {showName && <Text style={s.name}>GYMTRACKER</Text>}
  </View>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, name: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '900', letterSpacing: 1.6 } });
