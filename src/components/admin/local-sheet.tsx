import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/admin/badge';
import { localBadge } from '@/components/admin/local-badge';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ChevronRightIcon } from '@/components/ui/icons';
import { TextField } from '@/components/ui/text-field';
import { assignOwner, setCarWashStatus, type AdminCarWash } from '@/lib/admin';
import type { CarWashStatus } from '@/lib/car-wash-detail';
import { colors, fontSize, spacing } from '@/theme';

type Destination = '/local/[id]' | '/gestion/info/[id]' | '/gestion/servicios/[id]' | '/gestion/horarios/[id]' | '/gestion/promociones/[id]';

const STATUSES: { value: CarWashStatus; label: string }[] = [
  { value: 'pending', label: 'Por verificar' },
  { value: 'verified', label: 'Verificado' },
  { value: 'hidden', label: 'Oculto' },
];

const LINKS: { label: string; pathname: Destination }[] = [
  { label: 'Ver como cliente', pathname: '/local/[id]' },
  { label: 'Información y fotos', pathname: '/gestion/info/[id]' },
  { label: 'Servicios y precios', pathname: '/gestion/servicios/[id]' },
  { label: 'Horarios y cierres', pathname: '/gestion/horarios/[id]' },
  { label: 'Promociones', pathname: '/gestion/promociones/[id]' },
];

type LocalSheetProps = {
  carWash: AdminCarWash;
  onClose: () => void;
  /** Se llama después de cada cambio guardado, para que la lista se actualice. */
  onChanged: () => void;
};

/** Hoja con lo que el administrador puede hacer sobre un local: estado, propietario y acceso a su perfil. */
export function LocalSheet({ carWash, onClose, onChanged }: LocalSheetProps) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState(carWash.owner_email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const badge = localBadge(carWash);

  const run = async (action: () => Promise<string | null>, success: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const failure = await action();
    setBusy(false);
    if (failure) return setError(failure);
    setNotice(success);
    onChanged();
  };

  const changeStatus = (status: CarWashStatus) => {
    if (status === carWash.status) return;
    void run(() => setCarWashStatus(carWash.id, status), 'Estado actualizado.');
  };

  const saveOwner = () => {
    const value = email.trim();
    if (!value.includes('@')) return setError('Escribe el correo con el que la persona creó su cuenta.');
    void run(() => assignOwner(carWash.id, value), 'Propietario asignado. Verá «Mi negocio» al volver a entrar.');
  };

  const removeOwner = () => void run(() => assignOwner(carWash.id, null), 'El local quedó sin propietario.');

  const open = (pathname: Destination) => {
    onClose();
    router.push({ pathname, params: { id: carWash.id } });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar" />
      <KeyboardAvoidingView behavior="padding" style={styles.keyboard} pointerEvents="box-none">
        <View style={[styles.sheet, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText weight="display" size={22} numberOfLines={1} style={styles.title}>
                {carWash.name}
              </AppText>
              <AppText weight="medium" size={fontSize.small} color="textMuted" numberOfLines={1}>
                {carWash.address}, {carWash.district}
              </AppText>
            </View>
            <Badge {...badge} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }} contentContainerStyle={styles.form}>
            <View style={{ gap: spacing.sm }}>
              <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
                Estado
              </AppText>
              <View style={styles.chips}>
                {STATUSES.map((status) => (
                  <Chip key={status.value} label={status.label} selected={carWash.status === status.value} onPress={() => changeStatus(status.value)} />
                ))}
              </View>
              <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ lineHeight: 18 }}>
                Solo los locales verificados aparecen en el mapa y en la lista.
              </AppText>
            </View>

            <View style={{ gap: spacing.sm }}>
              <TextField
                label="Correo del propietario"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="correo@ejemplo.com"
              />
              <View style={styles.ownerActions}>
                <View style={{ flex: 1 }}>
                  <Button label={carWash.owner_id ? 'Cambiar propietario' : 'Asignar propietario'} height={44} loading={busy} onPress={saveOwner} />
                </View>
                {carWash.owner_id ? (
                  <Pressable accessibilityRole="button" disabled={busy} onPress={removeOwner} style={styles.remove}>
                    <AppText weight="bold" size={14} color="danger">
                      Quitar
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            {error ? (
              <AppText weight="semibold" size={fontSize.small} color="danger" style={{ lineHeight: 18 }}>
                {error}
              </AppText>
            ) : null}
            {notice ? (
              <AppText weight="semibold" size={fontSize.small} color="success" style={{ lineHeight: 18 }}>
                {notice}
              </AppText>
            ) : null}

            <View style={styles.links}>
              {LINKS.map((link, index) => (
                <Pressable
                  key={link.pathname}
                  accessibilityRole="button"
                  onPress={() => open(link.pathname)}
                  style={[styles.link, index > 0 && styles.linkDivider]}>
                  <AppText weight="bold" size={fontSize.body} style={{ flex: 1 }}>
                    {link.label}
                  </AppText>
                  <ChevronRightIcon />
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Button label="Cerrar" variant="secondary" height={48} onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(19,32,46,0.52)',
  },
  keyboard: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: spacing.md,
    paddingTop: 8,
    paddingHorizontal: spacing.xl,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    letterSpacing: -0.44,
    lineHeight: 26,
  },
  form: {
    gap: spacing.lg,
    paddingBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  remove: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  links: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  linkDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
