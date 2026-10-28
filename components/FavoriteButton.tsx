import { useCallback, useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFavorites, toggleFavorite } from '../lib/redesign';
import { COLORS } from '../constants/theme';
export function FavoriteButton({ name }: { name: string }) {
  const [favorite, setFavorite] = useState(false);
  useFocusEffect(useCallback(() => { setFavorite(getFavorites().includes(name)); }, [name]));
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} accessibilityState={{ selected: favorite }} onPress={() => setFavorite(toggleFavorite(name).includes(name))} style={{ padding: 12 }}><Ionicons name={favorite ? 'star' : 'star-outline'} size={24} color={favorite ? COLORS.warning : COLORS.textSecondary} /></TouchableOpacity>;
}
