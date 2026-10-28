import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { CheckIcon, TrashIcon } from '@/components/ui/icons';
import { Card, FieldHint, Section } from '@/components/ui/layout';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { TextField } from '@/components/ui/text-field';
import { Toggle } from '@/components/ui/toggle';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import type { CarWashDetail, Service } from '@/lib/car-wash-detail';
import { VEHICLE_TYPES, type VehicleType } from '@/lib/car-washes';
import { formatDuration } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { deleteService, saveService } from '@/lib/owner';
import { colors, fontSize, fonts, radius, spacing } from '@/theme';

const PRESET_DURATIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 90, label: '1 h 30 min' },
  { minutes: 120, label: '2 h o más' },
];

const VEHICLE_NAMES: Record<VehicleType, string> = {
  car: 'Automóvil',
  suv: 'SUV',
  pickup: 'Camioneta',
  motorcycle: 'Motocicleta',
};

/** «25», «25,5» o «25.50» -> 25.5; null si no es un precio válido. */
function parsePrice(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < 0 || value > 9999.99) return null;
  return Math.round(value * 100) / 100;
}

export default function EditarServicio() {
  const { id, carWashId } = useLocalSearchParams<{ id: string; carWashId: string }>();
  const { detail } = useCarWashDetail(carWashId);
  const isNew = id === 'nuevo';

  if (detail === undefined) {
    return (
      <ScreenFrame title={isNew ? 'Nuevo servicio' : 'Editar servicio'}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </ScreenFrame>
    );
  }

  const service = isNew ? null : (detail?.services.find((s) => s.id === id) ?? null);
  if (!detail || (!isNew && !service)) {
    return (
      <ScreenFrame title="Editar servicio">
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este servicio.
        </AppText>
      </ScreenFrame>
    );
  }

  return <ServiceForm key={id} detail={detail} service={service} />;
}

function ServiceForm({ detail, service }: { detail: CarWashDetail; service: Service | null }) {
  const [name, setName] = useState(service?.name ?? '');
  const [description, setDescription] = useState(service?.description ?? '');
  const [duration, setDuration] = useState<number | null>(service?.duration_minutes ?? null);
  const [prices, setPrices] = useState<Record<VehicleType, { enabled: boolean; text: string }>>(() => {
    const start = {} as Record<VehicleType, { enabled: boolean; text: string }>;
    for (const type of VEHICLE_TYPES) {
      const existing = service?.service_prices.find((p) => p.vehicle_type === type.code);
      start[type.code] = { enabled: existing !== undefined, text: existing ? existing.price.toFixed(2) : '' };
    }
    return start;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el servicio tiene una duración fuera de las opciones habituales (por ejemplo 25 min), se conserva como opción.
  const durations =
    duration !== null && !PRESET_DURATIONS.some((option) => option.minutes === duration)
      ? [{ minutes: duration, label: formatDuration(duration) }, ...PRESET_DURATIONS]
      : PRESET_DURATIONS;

  const setPrice = (type: VehicleType, patch: Partial<{ enabled: boolean; text: string }>) =>
    setPrices((current) => ({ ...current, [type]: { ...current[type], ...patch } }));

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Escribe el nombre del servicio.');

    const parsed: Partial<Record<VehicleType, number>> = {};
    for (const type of VEHICLE_TYPES) {
      const entry = prices[type.code];
      if (!entry.enabled) continue;
      const price = parsePrice(entry.text);
      if (price === null) return setError(`Escribe un precio válido para ${VEHICLE_NAMES[type.code]}.`);
      parsed[type.code] = price;
    }
    if (Object.keys(parsed).length === 0) return setError('Ofrece el servicio para al menos un tipo de vehículo.');

    setSaving(true);
    const nextPosition = Math.max(0, ...detail.services.map((s) => s.position)) + 1;
    const failure = await saveService(
      detail.id,
      service?.id ?? null,
      { name: name.trim(), description: description.trim() || null, durationMinutes: duration, prices: parsed },
      nextPosition,
    );
    setSaving(false);
    if (failure) return setError(failure);
    goBack();
  };

  const remove = () => {
    if (!service) return;
    Alert.alert('Eliminar servicio', `Se eliminará «${service.name}» y sus precios. Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const failure = await deleteService(service.id);
          if (failure) setError(failure);
          else goBack();
        },
      },
    ]);
  };

  return (
    <ScreenFrame
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      footer={
        <>
          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {error}
            </AppText>
          ) : null}
          <Button label="Guardar servicio" loading={saving} onPress={save} />
        </>
      }>
      <Section title="Datos del servicio">
        <Card>
          <TextField label="Nombre del servicio" value={name} onChangeText={setName} autoCapitalize="sentences" maxLength={80} />
          <TextField
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={240}
            placeholder="Qué incluye este servicio"
          />
        </Card>
      </Section>

      <Section
        title="Duración aproximada"
        right={
          <View style={styles.optional}>
            <AppText weight="extrabold" size={12} color="textSecondary" style={{ lineHeight: 16 }}>
              Opcional
            </AppText>
          </View>
        }>
        <Card>
          <View style={styles.chips}>
            {durations.map((option) => (
              <Chip
                key={option.minutes}
                label={option.label}
                selected={duration === option.minutes}
                onPress={() => setDuration(option.minutes)}
                icon={duration === option.minutes ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
              />
            ))}
            <Chip label="No indicar" selected={duration === null} onPress={() => setDuration(null)} />
          </View>
          <FieldHint>Si no la indicas, no se mostrará en tu perfil.</FieldHint>
        </Card>
      </Section>

      <Section title="Precio por tipo de vehículo" subtitle="Tus clientes verán el precio del tipo de vehículo que elijan.">
        <Card padded={false}>
          {VEHICLE_TYPES.map((type, index) => {
            const entry = prices[type.code];
            return (
              <View key={type.code} style={[styles.priceRow, index > 0 && styles.divider]}>
                <AppText weight={entry.enabled ? 'extrabold' : 'semibold'} size={fontSize.body} color={entry.enabled ? 'text' : 'textMuted'} style={{ flex: 1 }}>
                  {VEHICLE_NAMES[type.code]}
                </AppText>
                <Toggle
                  value={entry.enabled}
                  onChange={(enabled) => setPrice(type.code, { enabled })}
                  label={`Ofrecer para ${VEHICLE_NAMES[type.code]}`}
                />
                {entry.enabled ? (
                  <View style={styles.priceBox}>
                    <AppText weight="bold" size={fontSize.body} color="textMuted">
                      S/
                    </AppText>
                    <TextInput
                      value={entry.text}
                      onChangeText={(text) => setPrice(type.code, { text })}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Precio para ${VEHICLE_NAMES[type.code]}`}
                      placeholder="0.00"
                      placeholderTextColor={colors.textMuted}
                      style={styles.priceInput}
                    />
                  </View>
                ) : (
                  <View style={styles.priceBoxOff}>
                    <AppText weight="semibold" size={fontSize.small} color="textMuted">
                      No lo ofreces
                    </AppText>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      </Section>

      {service ? (
        <View style={styles.remove}>
          <Pressable accessibilityRole="button" onPress={remove} style={styles.removeButton}>
            <TrashIcon size={18} />
            <AppText weight="bold" size={fontSize.body} color="danger">
              Eliminar servicio
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  optional: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 10,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceBox: {
    width: 116,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  priceInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontFamily: fonts.extrabold,
    fontSize: 16,
    color: colors.text,
  },
  priceBoxOff: {
    width: 116,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  remove: {
    alignItems: 'center',
    paddingTop: spacing.lg,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 48,
    paddingHorizontal: spacing.md,
  },
});
