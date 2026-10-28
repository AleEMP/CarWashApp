import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlaceCard } from '@/components/explore/place-card';
import { PriceMarker } from '@/components/explore/price-marker';
import { VehicleChips } from '@/components/explore/vehicle-chips';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { ListIcon, LocateIcon, PinIcon, RefreshIcon } from '@/components/ui/icons';
import { CERCADO, MAP_DELTA, regionToBounds, VEHICLE_TYPES, type Bounds, type Coords } from '@/lib/car-washes';
import { plural } from '@/lib/format';
import { useExplore, type SearchFallback } from '@/providers/explore';
import { useUserLocation } from '@/providers/location';
import { colors, fontSize, spacing } from '@/theme';

/** Si la zona del usuario no tiene ningún local, el mapa pasa al Cercado, donde ya hay lavados. */
const CERCADO_FALLBACK: SearchFallback = {
  center: CERCADO,
  bounds: regionToBounds({ ...CERCADO, latitudeDelta: MAP_DELTA, longitudeDelta: MAP_DELTA }),
};

/** Alto de la franja transparente sobre el panel donde vive el botón de centrar. */
const LOCATE_ROW = 64;

/** ¿El mapa se movió o cambió de zoom lo bastante como para ofrecer una nueva búsqueda? */
function movedAway(region: Region, bounds: Bounds): boolean {
  const width = bounds.maxLng - bounds.minLng;
  const height = bounds.maxLat - bounds.minLat;
  const centerLng = (bounds.minLng + bounds.maxLng) / 2;
  const centerLat = (bounds.minLat + bounds.maxLat) / 2;
  return (
    Math.abs(region.longitude - centerLng) > width * 0.25 ||
    Math.abs(region.latitude - centerLat) > height * 0.25 ||
    Math.abs(region.longitudeDelta / width - 1) > 0.35
  );
}

function springTo(value: Animated.Value, toValue: number) {
  Animated.spring(value, { toValue, useNativeDriver: false, bounciness: 0, speed: 16 }).start();
}

export default function Mapa() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { coords, permission, requestPermission } = useUserLocation();
  const {
    vehicle,
    setVehicle,
    results,
    loading,
    error,
    selectedId,
    select,
    areaCount,
    searchedBounds,
    redirect,
    markSearched,
    search,
  } = useExplore();

  const mapRef = useRef<MapView>(null);
  const [initialRegion] = useState<Region>(() => ({
    ...(coords ?? CERCADO),
    latitudeDelta: MAP_DELTA,
    longitudeDelta: MAP_DELTA,
  }));
  const [region, setRegion] = useState<Region>(initialRegion);
  const startsAtUser = useRef(coords !== null);

  // Panel inferior: se arrastra con el dedo entre abierto y plegado (solo queda el encabezado).
  const [collapsed, setCollapsed] = useState(false);
  const [wrapHeight, setWrapHeight] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [translateY] = useState(() => new Animated.Value(0));

  const sheetBody = Math.max(0, wrapHeight - LOCATE_ROW);
  const maxOffset = Math.max(0, sheetBody - headerHeight);

  // Valores que necesitan los gestos sin volver a crearse en cada render.
  const offsetRef = useRef(0);
  const maxOffsetRef = useRef(0);
  const collapsedRef = useRef(false);
  useEffect(() => {
    maxOffsetRef.current = maxOffset;
    collapsedRef.current = collapsed;
  });
  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      offsetRef.current = value;
    });
    return () => translateY.removeListener(id);
  }, [translateY]);

  // Mantiene el panel en su sitio cuando cambia el estado o su contenido (por ejemplo, al aparecer la tarjeta de un local).
  useEffect(() => {
    springTo(translateY, collapsed ? maxOffset : 0);
  }, [translateY, collapsed, maxOffset]);

  // Los gestos leen estos refs solo cuando ocurre el toque o el arrastre, nunca al dibujar la pantalla.
  // eslint-disable-next-line react-hooks/refs
  const [responders] = useState(() => {
    // `tapToggles`: el encabezado alterna con un toque; el resto del panel solo se arrastra.
    const createResponder = (tapToggles: boolean) => {
      let startOffset = 0;
      return PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          translateY.stopAnimation();
          startOffset = offsetRef.current;
        },
        // El panel sigue al dedo, sin pasar de los dos extremos.
        onPanResponderMove: (_event, gesture) => {
          translateY.setValue(Math.min(Math.max(startOffset + gesture.dy, 0), maxOffsetRef.current));
        },
        onPanResponderRelease: (_event, gesture) => {
          const max = maxOffsetRef.current;
          const offset = Math.min(Math.max(startOffset + gesture.dy, 0), max);
          const isTap = Math.abs(gesture.dx) < 6 && Math.abs(gesture.dy) < 6;
          // Un empujón rápido manda la dirección; si no, gana el extremo más cercano.
          const dragged = Math.abs(gesture.vy) > 0.4 ? gesture.vy > 0 : offset > max / 2;
          const next = isTap ? (tapToggles ? !collapsedRef.current : collapsedRef.current) : dragged;
          setCollapsed(next);
          springTo(translateY, next ? max : 0);
        },
        onPanResponderTerminate: () => springTo(translateY, collapsedRef.current ? maxOffsetRef.current : 0),
      });
    };
    return { header: createResponder(true), body: createResponder(false) };
  });

  const flyTo = (point: Coords, duration: number) => {
    const next = { ...point, latitudeDelta: MAP_DELTA, longitudeDelta: MAP_DELTA };
    mapRef.current?.animateToRegion(next, duration);
    search(regionToBounds(next));
  };

  // Si la ubicación llega después de abrir el mapa, se centra una sola vez en el usuario.
  useEffect(() => {
    if (!coords || startsAtUser.current) return;
    startsAtUser.current = true;
    const next = { ...coords, latitudeDelta: MAP_DELTA, longitudeDelta: MAP_DELTA };
    mapRef.current?.animateToRegion(next, 600);
    search(regionToBounds(next), CERCADO_FALLBACK);
  }, [coords, search]);

  // Si la zona del usuario estaba vacía y el proveedor pasó al Cercado, el mapa se encuadra a esos
  // lavados dejando libres los selectores de arriba y el panel de abajo. Se hace una sola vez.
  const fittedRedirect = useRef<Coords | null>(null);
  const fitting = useRef(false);
  useEffect(() => {
    if (!redirect || loading || !results || results.length === 0 || fittedRedirect.current === redirect) return;
    fittedRedirect.current = redirect;
    fitting.current = true;
    mapRef.current?.fitToCoordinates(
      results.map((pin) => ({ latitude: pin.lat, longitude: pin.lng })),
      {
        // El panel abierto tapa ~42 % de la pantalla (con la tarjeta del local, que aparece junto a los resultados).
        edgePadding: {
          top: insets.top + 130,
          right: 70,
          bottom: (collapsed ? headerHeight : windowHeight * 0.42) + 40,
          left: 70,
        },
        animated: true,
      },
    );
  }, [redirect, results, loading, insets.top, collapsed, headerHeight, windowHeight]);

  const locate = () => {
    if (coords) {
      flyTo(coords, 500);
    } else {
      void requestPermission();
    }
  };

  const searchHere = () => search(regionToBounds(region));

  const selected = results?.find((pin) => pin.id === selectedId) ?? null;
  const showSearchHere = loading || (searchedBounds !== null && movedAway(region, searchedBounds));
  const priceLabel = VEHICLE_TYPES.find((type) => type.code === vehicle)?.priceLabel ?? 'auto';
  const notReachedYet = results !== null && !loading && areaCount === 0;

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        showsUserLocation={permission === 'granted'}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onRegionChangeComplete={(next) => {
          setRegion(next);
          if (fitting.current) {
            // Tras encuadrar a los resultados, esa vista cuenta como la zona buscada.
            fitting.current = false;
            markSearched(regionToBounds(next));
          } else if (!searchedBounds) {
            search(regionToBounds(next), startsAtUser.current ? CERCADO_FALLBACK : undefined);
          }
        }}>
        {results?.map((pin) => (
          <PriceMarker
            key={`${pin.id}-${pin.min_price}-${pin.id === selectedId}`}
            pin={pin}
            selected={pin.id === selectedId}
            onPress={() => {
              select(pin.id);
              setCollapsed(false);
            }}
          />
        ))}
      </MapView>

      <View style={[styles.overlayTop, { top: insets.top + 12 }]} pointerEvents="box-none">
        <VehicleChips value={vehicle} onChange={setVehicle} style={styles.shadow} />
        {showSearchHere ? (
          <Pressable
            accessibilityRole="button"
            disabled={loading}
            onPress={searchHere}
            style={[styles.searchHere, styles.shadow]}>
            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <RefreshIcon size={18} color={colors.primary} />
                <AppText weight="bold" size={14} color="primary">
                  Buscar en esta zona
                </AppText>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <Animated.View
        pointerEvents="box-none"
        onLayout={(event) => setWrapHeight(event.nativeEvent.layout.height)}
        style={[styles.sheetWrap, { transform: [{ translateY }] }]}>
        <View style={styles.locateRow} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Centrar en mi ubicación"
            onPress={locate}
            style={[styles.locate, styles.shadow]}>
            <LocateIcon size={24} color={colors.primary} />
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <View
            {...responders.header.panHandlers}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel={collapsed ? 'Mostrar lavados' : 'Ocultar lavados'}
            onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}>
            <View style={styles.handleArea}>
              <View style={styles.handle} />
            </View>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <AppText weight="extrabold" size={fontSize.body}>
                  {results === null ? 'Buscando lavados…' : `${plural(results.length, 'lavado', 'lavados')} en esta zona`}
                </AppText>
                <AppText weight="medium" size={fontSize.small} color="textMuted">
                  Precios para {priceLabel}
                </AppText>
              </View>
              <Button
                label="Ver lista"
                variant="ghost"
                height={44}
                fontSize={14}
                icon={<ListIcon size={18} color={colors.primary} />}
                onPress={() => router.push('/lista')}
              />
            </View>
          </View>

          <View {...responders.body.panHandlers}>
          {redirect && !notReachedYet ? (
            <View style={styles.notice}>
              <PinIcon size={18} color={colors.primary} />
              <AppText weight="semibold" size={fontSize.small} color="textSecondary" style={{ flex: 1 }}>
                Aún no llegamos a tu zona. Te mostramos el Cercado, donde ya hay lavados.
              </AppText>
            </View>
          ) : null}

          {error ? (
            <View style={styles.message}>
              <AppText weight="medium" size={fontSize.small} color="danger" style={{ textAlign: 'center' }}>
                {error}
              </AppText>
              <Button label="Reintentar" variant="secondary" height={44} onPress={searchHere} />
            </View>
          ) : selected ? (
            <PlaceCard pin={selected} />
          ) : notReachedYet ? (
            <View style={styles.message}>
              <AppText weight="medium" size={fontSize.small} color="textSecondary">
                <AppText weight="extrabold" size={fontSize.small}>
                  Aún no llegamos a esta zona.
                </AppText>{' '}
                Por ahora estamos en Cayma, Yanahuara y Cercado.
              </AppText>
              <Button
                label="Ver lavados en el Cercado"
                variant="secondary"
                height={44}
                icon={<PinIcon size={20} color={colors.primary} />}
                onPress={() => flyTo(CERCADO, 600)}
              />
            </View>
          ) : results !== null && !loading ? (
            <AppText weight="medium" size={fontSize.small} color="textMuted" style={styles.empty}>
              Ningún lavado de esta zona atiende este tipo de vehículo. Prueba con otro o mueve el mapa.
            </AppText>
          ) : null}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  shadow: {
    elevation: 4,
    shadowColor: '#13202E',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  overlayTop: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    gap: 10,
  },
  searchHere: {
    alignSelf: 'center',
    height: 44,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  locateRow: {
    height: LOCATE_ROW,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: spacing.lg,
  },
  locate: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  sheet: {
    paddingBottom: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    elevation: 12,
    shadowColor: '#13202E',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handleArea: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: 6,
    paddingLeft: 20,
    paddingRight: spacing.sm,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  message: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  empty: {
    paddingHorizontal: 20,
    paddingBottom: spacing.sm,
  },
});
