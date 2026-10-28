import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Badge } from '@/components/admin/badge';
import { CoverImage } from '@/components/explore/cover-image';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CheckIcon, ClockIcon, InfoIcon } from '@/components/ui/icons';
import { Card } from '@/components/ui/layout';
import { PickField } from '@/components/ui/pick-field';
import { PickerSheet } from '@/components/ui/picker-sheet';
import { TextField } from '@/components/ui/text-field';
import { activateSponsorship, deactivateSponsorship, fetchAdminSponsorships, type AdminSponsorship } from '@/lib/admin';
import { addDays, formatShortDay, formatShortDayYear, formatShortRange, formatTimestamp, limaTodayIso } from '@/lib/format';
import { dateToIso, isoToDate, pickDate } from '@/lib/pick-datetime';
import { colors, fontSize, spacing } from '@/theme';

type Data = { requests: AdminSponsorship[]; active: AdminSponsorship[] };

/** «Mapa y lista», «Solo mapa» o «Solo lista», según dónde se muestra el anuncio. */
function placement(row: Pick<AdminSponsorship, 'show_on_map' | 'show_in_list'>): string {
  if (row.show_on_map && row.show_in_list) return 'Mapa y lista';
  return row.show_on_map ? 'Solo mapa' : 'Solo lista';
}

function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.check}>
      <View style={[styles.box, value && styles.boxChecked]}>{value ? <CheckIcon size={14} color={colors.onPrimary} /> : null}</View>
      <AppText weight="bold" size={fontSize.body}>
        {label}
      </AppText>
    </Pressable>
  );
}

type FormProps = {
  request: AdminSponsorship;
  requests: AdminSponsorship[];
  onSelect: (id: string) => void;
  onDone: (message: string) => void;
};

/** Formulario «Activar patrocinio»: se registra el pago recibido por Yape y se fija la vigencia. */
function ActivateForm({ request, requests, onSelect, onDone }: FormProps) {
  const today = limaTodayIso();
  const [showOnMap, setShowOnMap] = useState(true);
  const [showInList, setShowInList] = useState(true);
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(addDays(today, request.plan_days - 1));
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseStart = async () => {
    const picked = await pickDate(isoToDate(startsOn));
    if (!picked) return;
    const iso = dateToIso(picked);
    setStartsOn(iso);
    // Al mover el inicio, el fin conserva la duración del plan.
    setEndsOn(addDays(iso, request.plan_days - 1));
  };

  const chooseEnd = async () => {
    const picked = await pickDate(isoToDate(endsOn), isoToDate(startsOn));
    if (picked) setEndsOn(dateToIso(picked));
  };

  const submit = async () => {
    setError(null);
    const value = Number(amount.replace(',', '.'));
    if (!showOnMap && !showInList) return setError('Elige dónde se mostrará el anuncio: en el mapa, en la lista o en ambos.');
    if (endsOn < startsOn) return setError('La fecha final no puede ser anterior a la inicial.');
    if (amount.trim() === '' || !Number.isFinite(value) || value < 0) return setError('Escribe el monto recibido, por ejemplo 25.00.');

    setBusy(true);
    const failure = await activateSponsorship(request.id, {
      startsOn,
      endsOn,
      showOnMap,
      showInList,
      amount: value,
      operationNumber: operation,
    });
    setBusy(false);
    if (failure) return setError(failure);
    onDone(`Patrocinio de ${request.car_wash_name} activado hasta el ${formatShortDay(endsOn)}.`);
  };

  return (
    <View style={styles.section}>
      <View style={{ gap: 4 }}>
        <AppText weight="display" size={19} style={styles.heading}>
          Activar patrocinio
        </AppText>
        <AppText weight="medium" size={14} color="textMuted">
          Registra el pago recibido por Yape y define la vigencia.
        </AppText>
      </View>

      <Card>
        <PickField label="Establecimiento" value={request.car_wash_name} onPress={() => setPickerOpen(true)} />

        <View>
          <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
            Dónde se muestra
          </AppText>
          <Check label="Marcador destacado en el mapa" value={showOnMap} onChange={setShowOnMap} />
          <Check label="Primeros lugares de la lista" value={showInList} onChange={setShowInList} />
        </View>

        <View style={styles.pair}>
          <PickField flex label="Desde" value={formatShortDayYear(startsOn)} onPress={chooseStart} />
          <PickField flex label="Hasta" value={formatShortDayYear(endsOn)} onPress={chooseEnd} />
        </View>

        <View style={styles.pair}>
          <PickField flex label="Pago" value="Yape" onPress={() => setPaymentOpen(true)} />
          <View style={{ flex: 1 }}>
            <TextField
              label="Monto"
              prefix="S/"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              maxLength={8}
            />
          </View>
        </View>

        <TextField
          label="N.º de operación"
          value={operation}
          onChangeText={setOperation}
          keyboardType="number-pad"
          placeholder="Ej.: 00123456"
          maxLength={20}
        />

        <View style={styles.note}>
          <InfoIcon size={16} color={colors.primaryPressed} />
          <AppText weight="semibold" size={fontSize.small} color="primaryPressed" style={{ flex: 1, lineHeight: 18 }}>
            Se mostrará con la etiqueta «Patrocinado» y dejará de verse al terminar la vigencia.
          </AppText>
        </View>

        {error ? (
          <AppText weight="semibold" size={fontSize.small} color="danger" style={{ lineHeight: 18 }}>
            {error}
          </AppText>
        ) : null}

        <Button label="Activar patrocinio" loading={busy} icon={<CheckIcon size={18} />} onPress={submit} />
      </Card>

      <PickerSheet
        visible={pickerOpen}
        title="Establecimiento"
        options={requests.map((item) => ({ value: item.id, label: item.car_wash_name }))}
        selected={request.id}
        onSelect={onSelect}
        onClose={() => setPickerOpen(false)}
      />
      <PickerSheet
        visible={paymentOpen}
        title="Medio de pago"
        options={[{ value: 'yape', label: 'Yape' }]}
        selected="yape"
        onSelect={() => undefined}
        onClose={() => setPaymentOpen(false)}
      />
    </View>
  );
}

/** Solicitudes de patrocinio, formulario para activarlas y anuncios activos (mockup 17). */
export function SponsorshipsSection() {
  // undefined = cargando, null = no se pudo cargar
  const [data, setData] = useState<Data | null | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const loaded = await fetchAdminSponsorships();
      if (!cancelled) setData(loaded);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  if (data === undefined) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />;
  }

  if (data === null) {
    return (
      <View style={styles.section}>
        <Card>
          <AppText weight="extrabold" size={fontSize.lead}>
            No pudimos cargar los patrocinios
          </AppText>
          <Button
            label="Reintentar"
            variant="outline"
            height={44}
            onPress={() => {
              setData(undefined);
              load();
            }}
          />
        </Card>
      </View>
    );
  }

  const selected = data.requests.find((item) => item.id === selectedId) ?? data.requests[0] ?? null;

  const deactivate = (row: AdminSponsorship) => {
    Alert.alert('Desactivar patrocinio', `${row.car_wash_name} dejará de aparecer como patrocinado desde ya.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desactivar',
        style: 'destructive',
        onPress: async () => {
          setBusyId(row.id);
          setError(null);
          setMessage(null);
          const failure = await deactivateSponsorship(row.id);
          setBusyId(null);
          if (failure) setError(failure);
          else setMessage(`Patrocinio de ${row.car_wash_name} desactivado.`);
          load();
        },
      },
    ]);
  };

  return (
    <View>
      {message ? (
        <View style={[styles.banner, { backgroundColor: colors.successSoft }]}>
          <CheckIcon size={18} color={colors.success} />
          <AppText weight="extrabold" size={14} color="success" style={{ flex: 1, lineHeight: 20 }}>
            {message}
          </AppText>
        </View>
      ) : null}
      {error ? (
        <View style={[styles.banner, { backgroundColor: colors.dangerSoft }]}>
          <AppText weight="extrabold" size={14} color="danger" style={{ flex: 1, lineHeight: 20 }}>
            {error}
          </AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText weight="display" size={19} style={styles.heading}>
          Solicitudes pendientes · {data.requests.length}
        </AppText>
        {data.requests.length === 0 ? (
          <Card>
            <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ lineHeight: 22 }}>
              No hay solicitudes en espera de pago.
            </AppText>
          </Card>
        ) : (
          data.requests.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              accessibilityState={{ selected: selected?.id === row.id }}
              onPress={() => setSelectedId(row.id)}
              style={[styles.request, data.requests.length > 1 && selected?.id === row.id && styles.requestSelected]}>
              <View style={styles.requestTop}>
                <CoverImage path={row.cover_path} size={48} />
                <View style={{ flex: 1, gap: 1 }}>
                  <AppText weight="extrabold" size={fontSize.body} numberOfLines={1}>
                    {row.car_wash_name}
                  </AppText>
                  <AppText weight="medium" size={fontSize.small} color="textMuted">
                    Plan {row.plan_label} · solicitado {formatTimestamp(row.requested_at)}
                  </AppText>
                </View>
              </View>
              <View style={styles.requestBottom}>
                <Badge
                  label="Esperando pago"
                  background={colors.warningSoft}
                  color={colors.warning}
                  icon={<ClockIcon size={14} color={colors.warning} />}
                />
                {row.owner_name ? (
                  <AppText weight="bold" size={fontSize.small} color="textSecondary">
                    {row.owner_name}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </View>

      {selected ? (
        <ActivateForm
          key={selected.id}
          request={selected}
          requests={data.requests}
          onSelect={setSelectedId}
          onDone={(text) => {
            setMessage(text);
            setError(null);
            setSelectedId(null);
            load();
          }}
        />
      ) : null}

      <View style={styles.section}>
        <AppText weight="display" size={19} style={styles.heading}>
          Activos · {data.active.length}
        </AppText>
        {data.active.length === 0 ? (
          <Card>
            <AppText weight="medium" size={fontSize.body} color="textMuted" style={{ lineHeight: 22 }}>
              No hay anuncios activos.
            </AppText>
          </Card>
        ) : (
          <Card padded={false}>
            {data.active.map((row, index) => {
              const started = row.starts_on !== null && row.starts_on <= limaTodayIso();
              return (
                <View key={row.id} style={[styles.activeRow, index > 0 && styles.activeDivider]}>
                  <CoverImage path={row.cover_path} size={44} sponsored />
                  <View style={{ flex: 1, gap: 1 }}>
                    <AppText weight="extrabold" size={fontSize.body} numberOfLines={1}>
                      {row.car_wash_name}
                    </AppText>
                    <AppText weight="medium" size={fontSize.small} color="textMuted">
                      {placement(row)} ·{' '}
                      {started ? `hasta el ${formatShortDay(row.ends_on!)}` : formatShortRange(row.starts_on!, row.ends_on!)}
                    </AppText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desactivar patrocinio de ${row.car_wash_name}`}
                    disabled={busyId === row.id}
                    onPress={() => deactivate(row)}
                    style={styles.deactivate}>
                    {busyId === row.id ? (
                      <ActivityIndicator color={colors.danger} />
                    ) : (
                      <AppText weight="bold" size={14} color="danger">
                        Desactivar
                      </AppText>
                    )}
                  </Pressable>
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  heading: {
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
  },
  request: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#EFCB8B',
    backgroundColor: colors.surface,
  },
  requestSelected: {
    borderColor: colors.warning,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  requestBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
  },
  box: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  boxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: spacing.sm,
  },
  activeDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deactivate: {
    minWidth: 76,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
});
