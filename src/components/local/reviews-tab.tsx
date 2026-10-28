import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { ReportSheet } from '@/components/local/report-sheet';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EditIcon, MoreIcon, ReviewIcon } from '@/components/ui/icons';
import { Stars } from '@/components/ui/stars';
import { useRequireAccount } from '@/hooks/use-require-account';
import {
  fetchMyReview,
  fetchRatingDistribution,
  fetchReviews,
  REVIEWS_PAGE_SIZE,
  type CarWashDetail,
  type Review,
} from '@/lib/car-wash-detail';
import { isToday, plural, relativeTime } from '@/lib/format';
import { useSession } from '@/providers/session';
import { colors, fontSize, radius, spacing } from '@/theme';

type Distribution = { stars: number; total: number }[];

export function ReviewsTab({ detail }: { detail: CarWashDetail }) {
  const { session } = useSession();
  const requireAccount = useRequireAccount();
  const userId = session?.user.id ?? null;
  const isOwner = userId !== null && detail.owner_id === userId;

  const [loaded, setLoaded] = useState(false);
  const [distribution, setDistribution] = useState<Distribution>([]);
  const [mine, setMine] = useState<Review | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reporting, setReporting] = useState<Review | null>(null);

  // Se recarga cada vez que la pantalla vuelve a estar en primer plano (por ejemplo, tras escribir una reseña).
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const [dist, own, page] = await Promise.all([
          fetchRatingDistribution(detail.id),
          userId ? fetchMyReview(detail.id, userId) : Promise.resolve(null),
          fetchReviews(detail.id, userId, 0),
        ]);
        if (cancelled) return;
        setDistribution(dist);
        setMine(own);
        setReviews(page);
        setHasMore(page.length === REVIEWS_PAGE_SIZE);
        setLoaded(true);
      })();
      return () => {
        cancelled = true;
      };
    }, [detail.id, userId]),
  );

  const loadMore = async () => {
    setLoadingMore(true);
    const page = await fetchReviews(detail.id, userId, reviews.length);
    setReviews((current) => [...current, ...page]);
    setHasMore(page.length === REVIEWS_PAGE_SIZE);
    setLoadingMore(false);
  };

  const writeReview = () => requireAccount(() => router.push({ pathname: '/resena/[id]', params: { id: detail.id } }));

  const total = distribution.reduce((sum, row) => sum + row.total, 0);

  if (!loaded) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <View style={styles.summary}>
          <View style={{ gap: 6 }}>
            <AppText weight="display" size={44} style={styles.average}>
              {detail.rating_count > 0 ? detail.rating_avg.toFixed(1) : '–'}
            </AppText>
            <Stars value={detail.rating_avg} size={16} />
            <AppText weight="semibold" size={fontSize.small} color="textMuted">
              {detail.rating_count > 0 ? plural(detail.rating_count, 'calificación', 'calificaciones') : 'Aún sin calificaciones'}
            </AppText>
          </View>
          <View style={styles.bars}>
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution.find((row) => row.stars === stars)?.total ?? 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <View key={stars} style={styles.barRow}>
                  <AppText weight="extrabold" size={12} color="textMuted" style={styles.barLabel}>
                    {stars}
                  </AppText>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${percent}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {mine ? (
        <View style={[styles.card, styles.mine]}>
          <View style={styles.mineHead}>
            <View style={styles.mineLabel}>
              <ReviewIcon size={18} />
              <AppText weight="extrabold" size={fontSize.small} color="primary">
                Tu reseña
              </AppText>
            </View>
            <AppText weight="semibold" size={12} color="textMuted">
              {isToday(mine.created_at) ? 'Publicada hoy' : relativeTime(mine.created_at)}
            </AppText>
          </View>
          <Stars value={mine.rating} size={18} />
          {mine.comment ? (
            <AppText weight="regular" size={fontSize.body} color="textSecondary" style={{ lineHeight: 22 }}>
              {mine.comment}
            </AppText>
          ) : null}
          {mine.status === 'hidden' ? (
            <AppText weight="semibold" size={fontSize.small} color="danger">
              Un administrador ocultó esta reseña. Solo tú puedes verla.
            </AppText>
          ) : null}
          <View style={{ flexDirection: 'row' }}>
            <Pressable
              accessibilityRole="button"
              onPress={writeReview}
              style={({ pressed }) => [styles.editButton, pressed && { opacity: 0.8 }]}>
              <EditIcon size={18} />
              <AppText weight="bold" size={14} color="primaryPressed">
                Editar mi reseña
              </AppText>
            </Pressable>
          </View>
          <AppText weight="medium" size={12} color="textMuted">
            Solo puedes tener una reseña por local.
          </AppText>
        </View>
      ) : isOwner ? (
        <View style={styles.card}>
          <View style={{ padding: spacing.lg }}>
            <AppText weight="medium" size={fontSize.small} color="textMuted">
              Eres el propietario de este local, por eso no puedes reseñarlo.
            </AppText>
          </View>
        </View>
      ) : (
        <View style={[styles.card, styles.mine]}>
          <AppText weight="extrabold" size={fontSize.body}>
            ¿Ya visitaste este local?
          </AppText>
          <AppText weight="medium" size={fontSize.small} color="textMuted">
            Cuéntales a otros conductores cómo te fue.
          </AppText>
          <Button label="Escribir reseña" icon={<ReviewIcon size={18} color={colors.onPrimary} />} height={48} onPress={writeReview} />
        </View>
      )}

      <AppText weight="display" size={19} style={styles.heading}>
        Todas las reseñas
      </AppText>

      {reviews.length === 0 ? (
        <AppText weight="medium" size={fontSize.body} color="textMuted">
          {mine ? 'Todavía no hay reseñas de otras personas.' : 'Todavía no hay reseñas. ¡Sé la primera persona en opinar!'}
        </AppText>
      ) : (
        <View style={[styles.card, { overflow: 'hidden' }]}>
          {reviews.map((review, index) => (
            <View key={review.id} style={[styles.review, index > 0 && styles.divider]}>
              <View style={styles.reviewHead}>
                <Avatar name={review.author_name} />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText weight="extrabold" size={fontSize.body}>
                    {review.author_name}
                  </AppText>
                  <View style={styles.reviewMeta}>
                    <Stars value={review.rating} size={14} />
                    <AppText weight="medium" size={fontSize.small} color="textMuted">
                      {relativeTime(review.created_at)}
                    </AppText>
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Opciones de la reseña de ${review.author_name}`}
                  hitSlop={6}
                  onPress={() => requireAccount(() => setReporting(review))}
                  style={styles.more}>
                  <MoreIcon size={20} />
                </Pressable>
              </View>
              {review.comment ? (
                <AppText weight="regular" size={fontSize.body} color="textSecondary" style={{ lineHeight: 22 }}>
                  {review.comment}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {hasMore ? (
        <Button label="Ver más reseñas" variant="secondary" height={48} loading={loadingMore} onPress={loadMore} />
      ) : null}

      <ReportSheet
        review={reporting}
        onClose={() => setReporting(null)}
        onReported={() => Alert.alert('Gracias por avisarnos', 'Un administrador revisará este comentario.')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    padding: spacing.lg,
  },
  average: {
    lineHeight: 44,
    letterSpacing: -1.3,
  },
  bars: {
    flex: 1,
    gap: 6,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  barLabel: {
    width: 10,
    lineHeight: 14,
  },
  barTrack: {
    flex: 1,
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: '#ECE6DB',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.star,
  },
  mine: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: '#C4D8EE',
  },
  mineHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mineLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 44,
    paddingHorizontal: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  heading: {
    marginTop: spacing.sm,
    letterSpacing: -0.38,
    lineHeight: 22,
  },
  review: {
    gap: 10,
    padding: spacing.lg,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  reviewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  more: {
    width: 44,
    height: 44,
    marginTop: -6,
    marginRight: -8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
});
