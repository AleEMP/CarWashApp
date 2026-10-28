import { Linking } from 'react-native';

/** Abre Google Maps con la ruta hacia el local. */
export function openDirections(place: { lat: number; lng: number }) {
  void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`);
}
