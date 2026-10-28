import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AdministracionLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
