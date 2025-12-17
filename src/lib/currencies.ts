export interface Country {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
}

export const COUNTRIES: Country[] = [
  { code: 'MZ', name: 'Moçambique', currency: 'MZN', currencySymbol: 'MT' },
  { code: 'BR', name: 'Brasil', currency: 'BRL', currencySymbol: 'R$' },
  { code: 'PT', name: 'Portugal', currency: 'EUR', currencySymbol: '€' },
  { code: 'AO', name: 'Angola', currency: 'AOA', currencySymbol: 'Kz' },
  { code: 'US', name: 'Estados Unidos', currency: 'USD', currencySymbol: '$' },
  { code: 'GB', name: 'Reino Unido', currency: 'GBP', currencySymbol: '£' },
  { code: 'ZA', name: 'África do Sul', currency: 'ZAR', currencySymbol: 'R' },
  { code: 'CV', name: 'Cabo Verde', currency: 'CVE', currencySymbol: '$' },
  { code: 'GW', name: 'Guiné-Bissau', currency: 'XOF', currencySymbol: 'CFA' },
  { code: 'ST', name: 'São Tomé e Príncipe', currency: 'STN', currencySymbol: 'Db' },
];

export const CURRENCIES = [
  { code: 'MZN', symbol: 'MT', name: 'Metical' },
  { code: 'BRL', symbol: 'R$', name: 'Real' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'USD', symbol: '$', name: 'Dólar' },
  { code: 'AOA', symbol: 'Kz', name: 'Kwanza' },
  { code: 'GBP', symbol: '£', name: 'Libra' },
  { code: 'ZAR', symbol: 'R', name: 'Rand' },
];

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode);
  return currency?.symbol || currencyCode;
}

export function getCountryByCurrency(currencyCode: string): Country | undefined {
  return COUNTRIES.find(c => c.currency === currencyCode);
}
