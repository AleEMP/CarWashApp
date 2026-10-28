import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ChevronRightIcon, ClockIcon, PlusIcon } from '@/components/ui/icons';
import { Card, Section } from '@/components/ui/layout';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import { formatDuration, formatPrice, plural } from '@/lib/format';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function ServiciosYPrecios() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail } = useCarWashDetail(id);

  const addService = () =>
    router.push({ pathname: '/gestion/servicio/[id]', params: { id: 'nuevo', carWashId: id } });

  return (
    <ScreenFrame
      title="Servicios y precios"
      footer={<Button label="Agregar servicio" icon={<PlusIcon size={20} />} onPress={addService} />}>
      {detail === undefined ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      ) : detail === null ? (
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este local.
        </AppText>
      ) : (
        <Section
          title="Tus servicios"
          subtitle="Cada servicio tiene un precio por tipo de vehículo. Toca uno para editarlo.">
          {detail.services.length === 0 ? (
            <Card>
              <AppText weight="medium" size={fontSize.body} color="textSecondary" style={{ lineHeight: 22 }}>
                Aún no tienes servicios. Agrega el primero para que tus clientes vean qué ofreces y cuánto cuesta.
              </AppText>
            </Card>
          ) : (
            <Card padded={false}>
              {detail.services.map((service, index) => {
                const prices = service.service_prices.map((p) => p.price);
                return (
                  <Pressable
                    key={service.id}
                    accessibilityRole="button"
                    onPress={() =>
                      router.push({ pathname: '/gestion/servicio/[id]', params: { id: service.id, carWashId: id } })
                    }
                    style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && { backgroundColor: colors.background }]}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <AppText weight="extrabold" size={fontSize.body}>
                        {service.name}
                      </AppText>
                      <AppText weight="medium" size={fontSize.small} color="textMuted">
                        {prices.length === 0
                          ? 'Sin precios todavía'
                          : `Desde ${formatPrice(Math.min(...prices))} · ${plural(prices.length, 'tipo de vehículo', 'tipos de vehículo')}`}
                      </AppText>
                      {service.duration_minutes ? (
                        <View style={styles.chip}>
                          <ClockIcon size={13} color={colors.textSecondary} />
                          <AppText weight="extrabold" size={12} color="textSecondary" style={{ lineHeight: 16 }}>
                            {formatDuration(service.duration_minutes)}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    <ChevronRightIcon />
                  </Pressable>
                );
              })}
            </Card>
          )}
        </Section>
      )}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 68,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
