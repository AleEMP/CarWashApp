import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CoverImage } from '@/components/explore/cover-image';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { CloseIcon, InfoIcon, StarIcon } from '@/components/ui/icons';
import { fetchCarWashDetail, fetchMyReview, type CarWashDetail, type Review } from '@/lib/car-wash-detail';
import { goBack } from '@/lib/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/providers/session';
import { colors, fontSize, fonts, radius, spacing } from '@/theme';

const MAX_COMMENT = 500;
const LABELS = ['Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'];
const EMPTY_STAR = '#D9D2C4';

export default function EscribirResena() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const [detail, setDetail] = useState<CarWashDetail | null>(null);
  const [existing, setExisting] = useState<Review | null>(null);
  const [ready, setReady] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedDetail, mine] = await Promise.all([
        fetchCarWashDetail(id),
        userId ? fetchMyReview(id, userId) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setDetail(loadedDetail);
      setExisting(mine);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment ?? '');
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, userId]);

  const submit = async () => {
    if (!userId) return;
    if (rating < 1) {
      setError('Elige cuántas estrellas le das al local.');
      return;
    }

    setBusy(true);
    setError(null);
    const text = comment.trim() || null;
    const { error: failed } = existing
      ? await supabase.from('reviews').update({ rating, comment: text }).eq('id', existing.id)
      : await supabase.from('reviews').insert({ car_wash_id: id, user_id: userId, rating, comment: text });
    setBusy(false);

    if (failed) {
      if (failed.code === '23505') setError('Ya publicaste una reseña en este local. Vuelve atrás para editarla.');
      else if (failed.message.includes('Owners cannot review')) setError('No puedes reseñar tu propio local.');
      else setError('No pudimos guardar tu reseña. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }
    goBack();
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior="padding" style={styles.screen}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={goBack} style={styles.close}>
            <CloseIcon />
          </Pressable>
          <AppText weight="display" size={20}>
            {existing ? 'Editar reseña' : 'Escribir reseña'}
          </AppText>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {detail ? (
            <View style={styles.place}>
              <CoverImage path={detail.photos[0]?.storage_path ?? null} size={48} />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText weight="extrabold" size={fontSize.body}>
                  {detail.name}
                </AppText>
                <AppText weight="medium" size={fontSize.small} color="textMuted">
                  {detail.address}, {detail.district}
                </AppText>
              </View>
            </View>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <AppText weight="display" size={20} style={{ letterSpacing: -0.4 }}>
              ¿Cómo fue tu experiencia?
            </AppText>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={`Calificar con ${value} ${value === 1 ? 'estrella' : 'estrellas'}`}
                  onPress={() => setRating(value)}
                  style={styles.starButton}>
                  <StarIcon size={36} color={value <= rating ? colors.star : EMPTY_STAR} />
                </Pressable>
              ))}
            </View>
            <AppText weight="extrabold" size={fontSize.body} color={rating > 0 ? 'text' : 'textMuted'}>
              {rating > 0 ? LABELS[rating - 1] : 'Toca una estrella'}
            </AppText>
          </View>

          <View style={{ gap: 6 }}>
            <AppText weight="extrabold" size={fontSize.small} color="textSecondary">
              Comentario (opcional)
            </AppText>
            <TextInput
              value={comment}
              onChangeText={setComment}
              multiline
              maxLength={MAX_COMMENT}
              placeholder="Cuenta cómo te atendieron, el resultado, los tiempos…"
              placeholderTextColor={colors.textMuted}
              style={styles.textarea}
            />
            <AppText weight="semibold" size={12} color="textMuted" style={{ textAlign: 'right' }}>
              {comment.length} / {MAX_COMMENT}
            </AppText>
          </View>

          <View style={styles.infoBox}>
            <InfoIcon size={18} color={colors.primaryPressed} />
            <AppText weight="semibold" size={fontSize.small} color="primaryPressed" style={{ flex: 1, lineHeight: 18 }}>
              Solo puedes publicar una reseña por local. Podrás editarla cuando quieras.
            </AppText>
          </View>
          <AppText weight="medium" size={12} color="textMuted" style={{ lineHeight: 17 }}>
            Evita insultos y datos personales. Las reseñas reportadas pueden ser revisadas y ocultadas por un administrador.
          </AppText>

          {error ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              {error}
            </AppText>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button label={existing ? 'Guardar cambios' : 'Publicar reseña'} loading={busy} disabled={!ready} onPress={submit} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 64,
    paddingHorizontal: spacing.sm,
  },
  close: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  content: {
    gap: 20,
    paddingTop: spacing.sm,
    paddingHorizontal: 20,
    paddingBottom: spacing.xl,
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  stars: {
    flexDirection: 'row',
    marginLeft: -6,
  },
  starButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textarea: {
    height: 132,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: fontSize.body,
    lineHeight: 22,
    color: colors.text,
    textAlignVertical: 'top',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
  },
  footer: {
    paddingTop: spacing.md,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
