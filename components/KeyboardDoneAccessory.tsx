import { InputAccessoryView, Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';

export function KeyboardDoneAccessory({ id }: { id: string }) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id} backgroundColor={COLORS.surface}>
      <View style={styles.bar}>
        <TouchableOpacity accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.button}>
          <Text style={styles.label}>Terminé</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.cardBorder, paddingHorizontal: 18 },
  button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  label: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
});
