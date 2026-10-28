import type { AdminCarWash } from '@/lib/admin';
import { colors } from '@/theme';

/** Etiqueta que resume el estado de un local en la lista de administración (la más importante gana). */
export function localBadge(carWash: AdminCarWash): { label: string; background: string; color: string } {
  if (carWash.status === 'pending') return { label: 'Por verificar', background: colors.warningSoft, color: colors.warning };
  if (carWash.status === 'hidden') return { label: 'Oculto', background: colors.dangerSoft, color: colors.danger };
  if (carWash.sponsored) return { label: 'Patrocinado', background: colors.warning, color: colors.onPrimary };
  if (!carWash.owner_id) return { label: 'Sin dueño', background: colors.surfaceMuted, color: colors.textSecondary };
  return { label: 'Verificado', background: colors.successSoft, color: colors.success };
}
