import { Tabs } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { ChatIcon, MapIcon, ShieldIcon, StoreIcon, UserIcon } from '@/components/ui/icons';
import { useSession } from '@/providers/session';
import { colors } from '@/theme';

function TabIcon({ focused, children }: { focused: boolean; children: (color: string) => ReactNode }) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      {children(focused ? colors.primary : colors.textMuted)}
    </View>
  );
}

function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <AppText weight={focused ? 'extrabold' : 'semibold'} size={12} color={focused ? 'text' : 'textMuted'} style={styles.label}>
      {label}
    </AppText>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { profile } = useSession();
  const isOwner = profile?.role === 'owner';
  const isAdmin = profile?.role === 'admin';

  return (
    <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.background },
          tabBarStyle: {
            height: 72 + insets.bottom,
            paddingHorizontal: 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
          },
          tabBarItemStyle: { paddingTop: 8, paddingBottom: 6 },
        }}>
        <Tabs.Screen
          name="(explorar)"
          options={{
            title: 'Explorar',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused}>{(color) => <MapIcon color={color} />}</TabIcon>,
            tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Explorar" />,
          }}
        />
        <Tabs.Screen
          name="resenas"
          options={{
            title: 'Mis reseñas',
            // El administrador solo ve Explorar, Admin y Cuenta (mockups 16 a 18).
            href: isAdmin ? null : undefined,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused}>{(color) => <ChatIcon color={color} />}</TabIcon>,
            tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Mis reseñas" />,
          }}
        />
        <Tabs.Screen
          name="negocio"
          options={{
            title: 'Mi negocio',
            // Solo los propietarios ven esta pestaña.
            href: isOwner ? undefined : null,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused}>{(color) => <StoreIcon color={color} />}</TabIcon>,
            tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Mi negocio" />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            // Solo los administradores ven esta pestaña.
            href: isAdmin ? undefined : null,
            tabBarIcon: ({ focused }) => <TabIcon focused={focused}>{(color) => <ShieldIcon color={color} />}</TabIcon>,
            tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Admin" />,
          }}
        />
        <Tabs.Screen
          name="cuenta"
          options={{
            title: 'Cuenta',
            tabBarIcon: ({ focused }) => <TabIcon focused={focused}>{(color) => <UserIcon color={color} />}</TabIcon>,
            tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Cuenta" />,
          }}
        />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 56,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    lineHeight: 15,
  },
});
