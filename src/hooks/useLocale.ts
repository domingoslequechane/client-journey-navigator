import { useTranslation } from 'react-i18next';
import { ptBR, enUS, Locale } from 'date-fns/locale';

const localeMap: Record<string, Locale> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

export function useLocale() {
  const { i18n } = useTranslation();

  const dateLocale = localeMap[i18n.language] || ptBR;

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString(i18n.language, options);
  };

  const formatDateTime = (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString(i18n.language, options);
  };

  const formatCurrency = (value: number, currency = 'BRL') => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
    }).format(value);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) => {
    return new Intl.NumberFormat(i18n.language, options).format(value);
  };

  const formatRelativeTime = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' });

    if (diffDays > 0) return rtf.format(-diffDays, 'day');
    if (diffHours > 0) return rtf.format(-diffHours, 'hour');
    if (diffMins > 0) return rtf.format(-diffMins, 'minute');
    return rtf.format(-diffSecs, 'second');
  };

  return {
    dateLocale,
    formatDate,
    formatDateTime,
    formatCurrency,
    formatNumber,
    formatRelativeTime,
    currentLanguage: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
}
