import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { artworkFor } from '../assets/exercises/artwork';
import { getExerciseCategory } from '../constants/exercises';
import { COLORS } from '../constants/theme';
import { EXERCISE_IMAGES } from '../assets/exercises/images';
export function ExerciseVisual({ name, large = false }: { name: string; large?: boolean }) {
  const source = EXERCISE_IMAGES[name];
  if (source) return <Image source={source} accessibilityLabel={`Illustration : ${name}`} style={[s.box, large && s.large]} resizeMode={large ? 'contain' : 'cover'} />;
  const art = artworkFor(name, getExerciseCategory(name));
  return <View accessible accessibilityLabel={`Illustration : ${name}`} style={[s.box, large && s.large]}><Svg width="100%" height="100%" viewBox="0 0 240 160"><Circle cx="120" cy="83" r="68" fill={COLORS.primaryGlow} /><Line x1="20" y1="146" x2="220" y2="146" stroke={COLORS.cardBorder} /><Path d={art.equipment} stroke="#64727A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" /><Path d={art.body} stroke={COLORS.primary} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" /><Circle cx={art.head[0]} cy={art.head[1]} r="10" fill={COLORS.primary} /></Svg></View>;
}
const s = StyleSheet.create({ box: { width: 72, height: 66, borderRadius: 16, backgroundColor: COLORS.surface, overflow: 'hidden' }, large: { width: '100%', height: 185, borderRadius: 18, marginBottom: 16 } });
