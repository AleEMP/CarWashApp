import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaceRow } from '@/components/explore/place-row';
import { VehicleChips } from '@/components/explore/vehicle-chips';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { MapIcon } from '@/components/ui/icons';
import { plural } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import { useExplore } from '@/providers/explore';
import { colors, fontSize, spacing } from '@/theme';

export default function Lista() {
  const { vehicle, setVehicle, results, loading, error, areaCount } = useExplore();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <AppText weight="display" size={22} style={styles.title}>
          Lavados en esta zona
        </AppText>
        <AppText weight="medium" size={fontSize.small} color="textMuted">
          {results === null ? 'Buscando…' : `${plural(results.length, 'resultado', 'resultados')} en el área del mapa`}
        </AppText>
        <VehicleChips value={vehicle} onChange={setVehicle} style={styles.chips} />
      </View>

      <FlatList
        data={results ?? []}
        keyExtractor={(pin) => pin.id}
        renderItem={({ item }) => <PlaceRow pin={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading || results === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : (
            <AppText weight="medium" size={fontSize.body} color="textMuted" style={styles.empty}>
              {error ??
                (areaCount === 0
                  ? 'Aún no llegamos a esta zona. Por ahora estamos en Cayma, Yanahuara y Cercado.'
                  : 'Ningún lavado de esta zona atiende este tipo de vehículo.')}
            </AppText>
          )
        }
      />

      <View style={styles.floating} pointerEvents="box-none">
        <Button
          label="Ver mapa"
          icon={<MapIcon size={20} color={colors.onPrimary} />}
          height={48}
          onPress={goBack}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    gap: 2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    letterSpacing: -0.44,
    lineHeight: 26,
  },
  chips: {
    marginTop: 10,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 96,
  },
  empty: {
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  floating: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
  },
});
