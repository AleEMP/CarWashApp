import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { CarGlyph, PhotosIcon } from '@/components/ui/icons';
import { photoUrl } from '@/lib/car-washes';
import type { Photo } from '@/lib/car-wash-detail';
import { colors } from '@/theme';

const HEIGHT = 248;

/** Fotos del local a todo el ancho; la primera es la portada. Sin fotos, un auto sobre fondo azul. */
export function PhotoCarousel({ photos }: { photos: Photo[] }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <View style={[styles.placeholder, { width, height: HEIGHT }]}>
        <CarGlyph size={160} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ width, height: HEIGHT }}>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={{ uri: photoUrl(item.storage_path) }} contentFit="cover" style={{ width, height: HEIGHT }} />
        )}
      />
      <View style={styles.counter}>
        <PhotosIcon size={14} color="#FFFFFF" />
        <AppText weight="bold" size={12} color="onPrimary" style={{ lineHeight: 16 }}>
          {index + 1} / {photos.length}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D5E6F3',
  },
  counter: {
    position: 'absolute',
    right: 16,
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(19,32,46,0.72)',
  },
});
