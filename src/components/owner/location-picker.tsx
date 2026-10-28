import { StyleSheet, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { AppText } from '@/components/ui/app-text';
import { BigPinIcon, InfoIcon } from '@/components/ui/icons';
import { fontSize, spacing } from '@/theme';

const coordinate = (value: number) => value.toFixed(4).replace('-', '−');

type LocationPickerProps = {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  /** Avisa cuando el mapa empieza o termina de arrastrarse, para que la pantalla no se desplace a la vez. */
  onDragging: (dragging: boolean) => void;
};

/** Mapa con un pin fijo al centro: se mueve el mapa hasta que el pin queda en la entrada del local. */
export function LocationPicker({ lat, lng, onChange, onDragging }: LocationPickerProps) {
  return (
    <View style={{ gap: spacing.sm + 2 }}>
      <View style={styles.mapBox}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          toolbarEnabled={false}
          initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
          onPanDrag={() => onDragging(true)}
          onRegionChangeComplete={(region) => {
            onChange(Math.round(region.latitude * 1e6) / 1e6, Math.round(region.longitude * 1e6) / 1e6);
            onDragging(false);
          }}
        />
        <View pointerEvents="none" style={styles.pin}>
          <BigPinIcon size={40} />
        </View>
      </View>
      <View style={styles.hint}>
        <InfoIcon size={16} />
        <AppText weight="medium" size={fontSize.small} color="textMuted" style={{ flex: 1, lineHeight: 18 }}>
          Mueve el mapa hasta que el pin quede en la entrada del local.
        </AppText>
      </View>
      <AppText weight="bold" size={12} color="textSecondary" style={{ fontFamily: 'monospace' }}>
        Lat. {coordinate(lat)} · Long. {coordinate(lng)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    height: 160,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#ECE5D8',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -38,
    marginLeft: -20,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
});
