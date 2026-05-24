import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns'
import { fr } from 'date-fns/locale'

/**
 * Formate une date de manière contextuelle :
 * - Aujourd'hui → "Aujourd'hui · HH:mm"
 * - Hier → "Hier · HH:mm"
 * - < 7 jours → "Il y a X jours"
 * - Sinon → "d MMM yyyy"
 */
export function formatDateContextuel(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  
  if (isToday(date)) {
    return `Aujourd'hui · ${format(date, 'HH:mm')}`
  }
  
  if (isYesterday(date)) {
    return `Hier · ${format(date, 'HH:mm')}`
  }
  
  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000)
  if (diffDays < 7 && diffDays > 0) {
    return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  }
  
  return format(date, 'd MMM yyyy', { locale: fr })
}
