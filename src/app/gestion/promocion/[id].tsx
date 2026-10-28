import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Card, Section } from '@/components/ui/layout';
import { PickField } from '@/components/ui/pick-field';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { TextField } from '@/components/ui/text-field';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import type { CarWashDetail, Promotion } from '@/lib/car-wash-detail';
import { formatDay, limaTodayIso } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { savePromotion } from '@/lib/owner';
import { dateToIso, isoToDate, pickDate } from '@/lib/pick-datetime';
import { colors, fontSize, spacing } from '@/theme';

function addDays(iso: string, days: number): string {
  const date = isoToDate(iso);
  date.setDate(date.getDate() + days);
  return dateToIso(date);
}

export default function EditarPromocion() {
  const { id, carWashId } = useLocalSearchParams<{ id: string; carWashId: string }>();
  const { detail } = useCarWashDetail(carWashId);
  const isNew = id === 'nueva';

  if (detail === undefined) {
    return (
      <ScreenFrame title={isNew ? 'Nueva promoción' : 'Editar promoción'}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </ScreenFrame>
    );
  }

  const promotion = isNew ? null : (detail?.promotions.find((p) => p.id === id) ?? null);
  if (!detail || (!isNew && !promotion)) {
    return (
      <ScreenFrame title="Editar promoción">
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos esta promoción.
        </AppText>
      </ScreenFrame>
    );
  }
  return <PromotionForm key={id} detail={detail} promotion={promotion} />;
}

function PromotionForm({ detail, promotion }: { detail: CarWashDetail; promotion: Promotion | null }) {
  const today = limaTodayIso();
  const [title, setTitle] = useState(promotion?.title ?? '');
  const [description, setDescription] = useState(promotion?.description ?? '');
  const [serviceId, setServiceId] = useState<string | null>(promotion?.service_id ?? null);
  const [startDate, setStartDate] = useState(promotion?.start_date ?? today);
  const [endDate, setEndDate] = useState(promotion?.end_date ?? addDays(today, 30));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseStart = async () => {
    // Una promoción nueva no puede empezar en el pasado; una existente conserva su fecha original.
    const picked = await pickDate(isoToDate(startDate), promotion ? undefined : isoToDate(today));
    if (!picked) return;
    const iso = dateToIso(picked);
    setStartDate(iso);
    if (endDate < iso) setEndDate(iso);
  };

  const chooseEnd = async () => {
    const picked = await pickDate(isoToDate(endDate), isoToDate(startDate));
    if (picked) setEndDate(dateToIso(picked));
  };

  const save = async () => {
    setError(null);
    if (title.trim().length < 2) return setError('Escribe el título de la promoción.');
    if (endDate < startDate) return setError('La fecha final no puede ser anterior a la inicial.');

    setSaving(true);
    const failure = await savePromotion(detail.id, promotion?.id ?? null, {
      title: title.trim(),
      description: description.trim() || null,
      serviceId,
      startDate,
      endDate,
    });
    setSaving(false);
    if (failure) return setError(failure);
    goBack();
  };

  return (
    <ScreenFrame
      title={promotion ? 'Editar promoción' : 'Nueva promoción'}
      footer={
        <>
          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {error}
            </AppText>
          ) : null}
          <Button label="Guardar promoción" loading={saving} onPress={save} />
        </>
      }>
      <Section title="Datos de la promoción">
        <Card>
          <TextField
            label="Título"
            value={title}
            onChangeText={setTitle}
            maxLength={80}
            autoCapitalize="sentences"
            placeholder="Ej.: 20% en lavado completo"
          />
          <TextField
            label="Detalle (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={240}
            placeholder="Días, condiciones, vehículos…"
          />
        </Card>
      </Section>

      <Section title="Aplica a" subtitle="Elige un servicio o deja todos.">
        <Card>
          <View style={styles.chips}>
            <Chip label="Todos los servicios" selected={serviceId === null} onPress={() => setServiceId(null)} />
            {detail.services.map((service) => (
              <Chip key={service.id} label={service.name} selected={serviceId === service.id} onPress={() => setServiceId(service.id)} />
            ))}
          </View>
        </Card>
      </Section>

      <Section title="Fechas" subtitle="La promoción se muestra solo entre estas fechas.">
        <Card>
          <PickField label="Empieza" value={formatDay(startDate)} onPress={chooseStart} />
          <PickField label="Termina" value={formatDay(endDate)} onPress={chooseEnd} />
        </Card>
      </Section>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
