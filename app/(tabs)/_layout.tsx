import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { useAppTheme } from '../../lib/themes';
import { BrandMark } from '../../components/BrandMark';
export default function TabLayout() {
  const theme = useAppTheme();
  const tabs = [['index', 'Accueil', 'home-outline', 'home'], ['exercises', 'Exercices', 'barbell-outline', 'barbell'], ['history', 'Historique', 'time-outline', 'time'], ['stats', 'Stats', 'stats-chart-outline', 'stats-chart'], ['settings', 'Profil', 'person-outline', 'person']] as const;
  return <Tabs screenOptions={{ tabBarActiveTintColor: theme.primary, tabBarInactiveTintColor: COLORS.textMuted, tabBarStyle: { backgroundColor: COLORS.surface, borderTopColor: COLORS.cardBorder, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }, headerStyle: { backgroundColor: COLORS.background }, headerTintColor: COLORS.textPrimary, headerShadowVisible: false, headerTitleAlign: 'left', headerTitleStyle: { fontWeight: '800', fontSize: 22 } }}>{tabs.map(([name, title, icon, active]) => <Tabs.Screen key={name} name={name} options={{ title: name === 'index' ? 'GYMTRACKER' : title, headerTitle: name === 'index' ? () => <BrandMark size={34} /> : undefined, tabBarLabel: title, tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? active : icon} size={23} color={color as string} /> }} />)}</Tabs>;
}
