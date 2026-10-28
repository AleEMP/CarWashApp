import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { LocationPicker } from '@/components/owner/location-picker';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ChevronDownIcon } from '@/components/ui/icons';
import { Card, FieldHint, Section } from '@/components/ui/layout';
import { PickerSheet } from '@/components/ui/picker-sheet';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { TextField } from '@/components/ui/text-field';
import { createCarWash } from '@/lib/admin';
import type { CarWashStatus } from '@/lib/car-wash-detail';
import { CERCADO } from '@/lib/car-washes';
import { goBack } from '@/lib/navigation';
import { fetchDistricts, type District } from '@/lib/owner';
import { colors, fontSize, radius, spacing } from '@/theme';

/** Registro de un local nuevo por el administrador; las fotos, servicios y horarios se completan después. */
export default function RegistrarLocal() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [lat, setLat] = useState<number>(CERCADO.latitude);
  const [lng, setLng] = useState<number>(CERCADO.longitude);
  const [status, setStatus] = useState<CarWashStatus>('verified');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [districtOpen, setDistrictOpen] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDistricts().then(setDistricts);
  }, []);

  const districtName = districts.find((district) => district.id === districtId)?.name ?? 'Elige un distrito';

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Escribe el nombre del local.');
    if (address.trim().length < 3) return setError('Escribe la dirección del local.');
    if (districtId === null) return setError('Elige el distrito del local.');
    const owner = ownerEmail.trim();
    if (owner !== '' && !owner.includes('@')) return setError('Escribe un correo válido para el propietario, o déjalo vacío.');

    setSaving(true);
    const result = await createCarWash({
      name: name.trim(),
      address: address.trim(),
      districtId,
      reference: reference.trim() || null,
      lat,
      lng,
      status,
      ownerEmail: owner === '' ? null : owner,
    });
    setSaving(false);

    if ('error' in result) return setError(result.error);
    if (result.warning) return setError(result.warning);
    goBack();
  };

  return (
    <ScreenFrame
      title="Registrar local"
      scrollEnabled={scrollEnabled}
      footer={
        <>
          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger" style={{ lineHeight: 18 }}>
              {error}
            </AppText>
          ) : null}
          <Button label="Registrar local" loading={saving} onPress={save} />
        </>
      }>
      <Section title="Datos generales">
        <Card>
          <TextField label="Nombre del local" value={name} onChangeText={setName} autoCapitalize="words" maxLength={80} />
          <TextField label="Dirección" value={address} onChangeText={setAddress} autoCapitalize="sentences" maxLength={160} />
          <View style={{ gap: 6 }}>
            <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
              Distrito
            </AppText>
            <Pressable accessibilityRole="button" onPress={() => setDistrictOpen(true)} style={styles.select}>
              <AppText weight="semibold" size={fontSize.body} color={districtId === null ? 'textMuted' : 'text'} style={{ flex: 1 }}>
                {districtName}
              </AppText>
              <ChevronDownIcon />
            </Pressable>
          </View>
          <TextField label="Referencia (opcional)" value={reference} onChangeText={setReference} maxLength={160} />
        </Card>
      </Section>

      <Section title="Ubicación en el mapa">
        <Card style={{ padding: spacing.md }}>
          <LocationPicker
            lat={lat}
            lng={lng}
            onChange={(nextLat, nextLng) => {
              setLat(nextLat);
              setLng(nextLng);
            }}
            onDragging={(dragging) => setScrollEnabled(!dragging)}
          />
        </Card>
      </Section>

      <Section title="Estado" subtitle="Solo los locales verificados aparecen en el mapa y en la lista.">
        <View style={styles.chips}>
          <Chip label="Verificado" selected={status === 'verified'} onPress={() => setStatus('verified')} />
          <Chip label="Por verificar" selected={status === 'pending'} onPress={() => setStatus('pending')} />
        </View>
      </Section>

      <Section title="Propietario" subtitle="Opcional. Puedes asignarlo más tarde desde la lista de locales.">
        <Card>
          <TextField
            label="Correo del propietario"
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="correo@ejemplo.com"
          />
          <FieldHint>La persona debe haber creado su cuenta con ese correo. Al asignarle el local verá «Mi negocio» en la app.</FieldHint>
        </Card>
      </Section>

      <PickerSheet
        visible={districtOpen}
        title="Distrito"
        options={districts.map((district) => ({ value: district.id, label: district.name }))}
        selected={districtId}
        onSelect={setDistrictId}
        onClose={() => setDistrictOpen(false)}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
