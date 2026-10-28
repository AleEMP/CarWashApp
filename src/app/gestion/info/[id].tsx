import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { LocationPicker } from '@/components/owner/location-picker';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { AmenityIcon, ChevronDownIcon, InfoIcon, PlusIcon } from '@/components/ui/icons';
import { Card, Section } from '@/components/ui/layout';
import { PickerSheet } from '@/components/ui/picker-sheet';
import { ScreenFrame } from '@/components/ui/screen-frame';
import { TextField } from '@/components/ui/text-field';
import type { CarWashDetail, Photo } from '@/lib/car-wash-detail';
import { photoUrl } from '@/lib/car-washes';
import { goBack } from '@/lib/navigation';
import { useCarWashDetail } from '@/hooks/use-car-wash-detail';
import {
  deletePhoto,
  fetchAmenityOptions,
  fetchDistricts,
  makeCover,
  MAX_PHOTOS,
  saveAmenities,
  saveCarWashInfo,
  uploadPhoto,
  type AmenityOption,
  type District,
} from '@/lib/owner';
import { colors, fontSize, radius, spacing } from '@/theme';

export default function InformacionDelLocal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, reload } = useCarWashDetail(id);
  const [districts, setDistricts] = useState<District[] | null>(null);
  const [amenityOptions, setAmenityOptions] = useState<AmenityOption[] | null>(null);

  useEffect(() => {
    Promise.all([fetchDistricts(), fetchAmenityOptions()]).then(([loadedDistricts, loadedAmenities]) => {
      setDistricts(loadedDistricts);
      setAmenityOptions(loadedAmenities);
    });
  }, []);

  if (detail === undefined || !districts || !amenityOptions) {
    return (
      <ScreenFrame title="Información del local">
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </ScreenFrame>
    );
  }
  if (detail === null) {
    return (
      <ScreenFrame title="Información del local">
        <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ padding: spacing.xl }}>
          No encontramos este local.
        </AppText>
      </ScreenFrame>
    );
  }

  return <InfoForm key={detail.id} detail={detail} districts={districts} amenityOptions={amenityOptions} reload={reload} />;
}

type InfoFormProps = {
  detail: CarWashDetail;
  districts: District[];
  amenityOptions: AmenityOption[];
  reload: () => void;
};

function InfoForm({ detail, districts, amenityOptions, reload }: InfoFormProps) {
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - 32 - 24 - 16) / 3);

  const [name, setName] = useState(detail.name);
  const [address, setAddress] = useState(detail.address);
  const [districtId, setDistrictId] = useState<number>(detail.district_id);
  const [reference, setReference] = useState(detail.reference ?? '');
  const [lat, setLat] = useState(detail.lat);
  const [lng, setLng] = useState(detail.lng);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(detail.amenities.map((a) => a.code));
  const [districtOpen, setDistrictOpen] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const districtName = districts.find((district) => district.id === districtId)?.name ?? '';

  const toggleAmenity = (code: string) =>
    setSelectedAmenities((current) => (current.includes(code) ? current.filter((c) => c !== code) : [...current, code]));

  const save = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Escribe el nombre del local.');
    if (address.trim().length < 3) return setError('Escribe la dirección del local.');

    setSaving(true);
    const infoError = await saveCarWashInfo(detail.id, {
      name: name.trim(),
      address: address.trim(),
      districtId,
      reference: reference.trim() || null,
      lat,
      lng,
    });
    const amenitiesError = infoError
      ? null
      : await saveAmenities(
          detail.id,
          detail.amenities.map((a) => a.code),
          selectedAmenities,
        );
    setSaving(false);

    const failure = infoError ?? amenitiesError;
    if (failure) {
      setError(failure);
      return;
    }
    goBack();
  };

  const addPhotos = async () => {
    setPhotoError(null);
    const remaining = MAX_PHOTOS - detail.photos.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;

    setPending(result.assets.length);
    let position = Math.max(-1, ...detail.photos.map((photo) => photo.position)) + 1;
    for (const asset of result.assets) {
      const failure = await uploadPhoto(detail.id, asset.uri, asset.width, position);
      if (failure) {
        setPhotoError(failure);
        break;
      }
      position += 1;
      setPending((count) => count - 1);
    }
    setPending(0);
    reload();
  };

  const photoActions = (photo: Photo, index: number) => {
    const remove = async () => {
      const failure = await deletePhoto(photo);
      if (failure) setPhotoError(failure);
      reload();
    };
    const cover = async () => {
      const failure = await makeCover(detail.photos, photo.id);
      if (failure) setPhotoError(failure);
      reload();
    };
    Alert.alert('Foto', index === 0 ? 'Esta es la portada de tu local.' : undefined, [
      ...(index === 0 ? [] : [{ text: 'Hacer portada', onPress: () => void cover() }]),
      { text: 'Eliminar', style: 'destructive' as const, onPress: () => void remove() },
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  };

  return (
    <ScreenFrame
      title="Información del local"
      scrollEnabled={scrollEnabled}
      right={
        <Button label="Guardar" variant="ghost" height={44} loading={saving} onPress={save} />
      }
      footer={
        <>
          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {error}
            </AppText>
          ) : null}
          <Button label="Guardar cambios" loading={saving} onPress={save} />
        </>
      }>
      <Section title="Datos generales">
        <Card>
          <TextField label="Nombre del local" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextField label="Dirección" value={address} onChangeText={setAddress} autoCapitalize="sentences" />
          <View style={{ gap: 6 }}>
            <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
              Distrito
            </AppText>
            <Pressable accessibilityRole="button" onPress={() => setDistrictOpen(true)} style={styles.select}>
              <AppText weight="semibold" size={fontSize.body} style={{ flex: 1 }}>
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

      <Section
        title="Fotos"
        right={
          <AppText weight="bold" size={fontSize.small} color="textMuted">
            {detail.photos.length} de {MAX_PHOTOS}
          </AppText>
        }>
        <Card style={{ gap: spacing.md, padding: spacing.md }}>
          <View style={styles.grid}>
            {detail.photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                accessibilityRole="button"
                accessibilityLabel={index === 0 ? 'Foto de portada' : `Foto ${index + 1}`}
                onPress={() => photoActions(photo, index)}
                style={{ width: tile, height: 100 }}>
                <Image source={{ uri: photoUrl(photo.storage_path) }} contentFit="cover" style={styles.photo} />
                {index === 0 ? (
                  <View style={styles.coverBadge}>
                    <AppText weight="extrabold" size={12} color="onPrimary" style={{ lineHeight: 16 }}>
                      Portada
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            ))}
            {Array.from({ length: pending }).map((_, index) => (
              <View key={`pending-${index}`} style={[styles.photo, styles.pendingTile, { width: tile }]}>
                <ActivityIndicator color="#FFFFFF" />
                <AppText weight="extrabold" size={12} color="onPrimary" style={{ lineHeight: 16 }}>
                  Optimizando…
                </AppText>
              </View>
            ))}
            {detail.photos.length + pending < MAX_PHOTOS ? (
              <Pressable accessibilityRole="button" onPress={addPhotos} style={[styles.addTile, { width: tile }]}>
                <PlusIcon size={22} color={colors.primary} />
                <AppText weight="extrabold" size={fontSize.small} color="primary">
                  Agregar
                </AppText>
              </Pressable>
            ) : null}
          </View>
          {photoError ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {photoError}
            </AppText>
          ) : null}
          <View style={styles.hint}>
            <InfoIcon size={16} />
            <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ flex: 1, lineHeight: 18 }}>
              La primera foto es la portada. Comprimimos cada foto antes de subirla para que cargue rápido.
            </AppText>
          </View>
        </Card>
      </Section>

      <Section title="Comodidades" subtitle="Marca las que ofreces en tu local.">
        <Card>
          <View style={styles.chips}>
            {amenityOptions.map((option) => {
              const selected = selectedAmenities.includes(option.code);
              return (
                <Chip
                  key={option.code}
                  label={option.label}
                  selected={selected}
                  onPress={() => toggleAmenity(option.code)}
                  icon={<AmenityIcon code={option.code} size={18} color={selected ? colors.primaryPressed : colors.textSecondary} />}
                />
              );
            })}
          </View>
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
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photo: {
    width: '100%',
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: '#D5E6F3',
  },
  coverBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(19,32,46,0.78)',
  },
  pendingTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(19,32,46,0.55)',
  },
  addTile: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
