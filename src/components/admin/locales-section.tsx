import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Badge } from '@/components/admin/badge';
import { LocalSheet } from '@/components/admin/local-sheet';
import { localBadge } from '@/components/admin/local-badge';
import { CoverImage } from '@/components/explore/cover-image';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { CheckIcon, ChevronRightIcon, SearchIcon } from '@/components/ui/icons';
import { Card } from '@/components/ui/layout';
import { fetchAdminCarWashes, type AdminCarWash } from '@/lib/admin';
import { colors, fontSize, fonts, spacing } from '@/theme';

type Filter = 'all' | 'pending' | 'hidden';

/** Minúsculas y sin tildes, para que «cayma» encuentre «Cayma» y «sanchez» encuentre «Sánchez». */
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText weight="display" size={24} style={{ lineHeight: 24 }}>
        {value}
      </AppText>
      <AppText weight="bold" size={12} color="textMuted" style={{ lineHeight: 16 }}>
        {label}
      </AppText>
    </View>
  );
}

/** Lista de todos los locales (mockup 16): contadores, búsqueda, filtros y acceso a la gestión de cada uno. */
export function LocalesSection() {
  // undefined = cargando, null = no se pudo cargar
  const [items, setItems] = useState<AdminCarWash[] | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchAdminCarWashes();
      if (!cancelled) setItems(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  if (items === undefined) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />;
  }

  if (items === null) {
    return (
      <View style={styles.body}>
        <Card>
          <AppText weight="extrabold" size={fontSize.lead}>
            No pudimos cargar los locales
          </AppText>
          <AppText weight="medium" size={fontSize.body} color="textSecondary" style={{ lineHeight: 22 }}>
            Revisa tu conexión e inténtalo de nuevo.
          </AppText>
          <Button
            label="Reintentar"
            variant="outline"
            height={44}
            onPress={() => {
              setItems(undefined);
              load();
            }}
          />
        </Card>
      </View>
    );
  }

  const published = items.filter((item) => item.status === 'verified').length;
  const pending = items.filter((item) => item.status === 'pending').length;
  const sponsored = items.filter((item) => item.sponsored).length;

  const needle = normalize(query.trim());
  const visible = items.filter((item) => {
    if (filter === 'pending' && item.status !== 'pending') return false;
    if (filter === 'hidden' && item.status !== 'hidden') return false;
    return needle === '' || normalize(item.name).includes(needle) || normalize(item.district).includes(needle);
  });

  const selected = items.find((item) => item.id === selectedId) ?? null;

  return (
    <View style={styles.body}>
      <View style={styles.stats}>
        <Stat value={published} label="publicados" />
        <Stat value={pending} label="por verificar" />
        <Stat value={sponsored} label={sponsored === 1 ? 'patrocinado' : 'patrocinados'} />
      </View>

      <View style={styles.search}>
        <SearchIcon />
        <TextInput
          accessibilityLabel="Buscar local"
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o distrito"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filters}>
        <Chip
          label="Todos"
          selected={filter === 'all'}
          onPress={() => setFilter('all')}
          icon={filter === 'all' ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
        />
        <Chip
          label={`Por verificar · ${pending}`}
          selected={filter === 'pending'}
          onPress={() => setFilter('pending')}
          icon={filter === 'pending' ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
        />
        <Chip
          label="Ocultos"
          selected={filter === 'hidden'}
          onPress={() => setFilter('hidden')}
          icon={filter === 'hidden' ? <CheckIcon size={16} color={colors.primaryPressed} /> : undefined}
        />
      </View>

      {visible.length === 0 ? (
        <Card>
          <AppText weight="semibold" size={fontSize.body} color="textMuted" style={{ textAlign: 'center' }}>
            {items.length === 0 ? 'Todavía no hay locales registrados.' : 'Ningún local coincide con tu búsqueda.'}
          </AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {visible.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.district}`}
              onPress={() => setSelectedId(item.id)}
              style={({ pressed }) => [styles.row, index < visible.length - 1 && styles.rowDivider, pressed && { backgroundColor: colors.background }]}>
              <CoverImage path={item.cover_path} size={44} sponsored={item.sponsored} />
              <View style={{ flex: 1, gap: 1 }}>
                <AppText weight="extrabold" size={fontSize.body} numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText weight="medium" size={fontSize.small} color="textMuted" numberOfLines={1}>
                  {item.district} · {item.owner_name ?? 'sin dueño'}
                </AppText>
              </View>
              <Badge {...localBadge(item)} />
              <ChevronRightIcon size={18} />
            </Pressable>
          ))}
        </Card>
      )}

      {selected ? <LocalSheet key={selected.id} carWash={selected} onClose={() => setSelectedId(null)} onChanged={load} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingTop: 14,
    paddingHorizontal: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    padding: 0,
    fontFamily: fonts.medium,
    fontSize: fontSize.body,
    color: colors.text,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
