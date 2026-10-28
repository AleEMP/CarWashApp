import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { CarGlyph } from '@/components/ui/icons';
import { photoUrl } from '@/lib/car-washes';
import { colors } from '@/theme';

type CoverImageProps = {
  path: string | null;
  size: number;
  sponsored?: boolean;
};

/** Foto de portada del local; si todavía no tiene fotos, un auto sobre fondo de color. */
export function CoverImage({ path, size, sponsored = false }: CoverImageProps) {
  if (path) {
    return <Image source={{ uri: photoUrl(path) }} contentFit="cover" style={[styles.box, { width: size, height: size }]} />;
  }
  return (
    <View
      style={[
        styles.box,
        styles.placeholder,
        { width: size, height: size, backgroundColor: sponsored ? '#FAE8CC' : '#D5E6F3' },
      ]}>
      <CarGlyph size={size * 0.6} color={sponsored ? '#B97A12' : colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
