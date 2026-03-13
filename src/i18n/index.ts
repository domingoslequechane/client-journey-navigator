import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';


// pt-BR translations
import ptBRCommon from './locales/pt-BR/common.json';
import ptBRAuth from './locales/pt-BR/auth.json';
import ptBRDashboard from './locales/pt-BR/dashboard.json';
import ptBRClients from './locales/pt-BR/clients.json';
import ptBRSettings from './locales/pt-BR/settings.json';
import ptBRPipeline from './locales/pt-BR/pipeline.json';
import ptBRAi from './locales/pt-BR/ai.json';
import ptBRLanding from './locales/pt-BR/landing.json';
import ptBRTeam from './locales/pt-BR/team.json';
import ptBRNotifications from './locales/pt-BR/notifications.json';
import ptBRSupport from './locales/pt-BR/support.json';
import ptBRFinance from './locales/pt-BR/finance.json';
import ptBRAcademia from './locales/pt-BR/academia.json';

// en-US translations
import enUSCommon from './locales/en-US/common.json';
import enUSAuth from './locales/en-US/auth.json';
import enUSDashboard from './locales/en-US/dashboard.json';
import enUSClients from './locales/en-US/clients.json';
import enUSSettings from './locales/en-US/settings.json';
import enUSPipeline from './locales/en-US/pipeline.json';
import enUSAi from './locales/en-US/ai.json';
import enUSLanding from './locales/en-US/landing.json';
import enUSTeam from './locales/en-US/team.json';
import enUSNotifications from './locales/en-US/notifications.json';
import enUSSupport from './locales/en-US/support.json';
import enUSFinance from './locales/en-US/finance.json';
import enUSAcademia from './locales/en-US/academia.json';

const resources = {
  'pt-BR': {
    common: ptBRCommon,
    auth: ptBRAuth,
    dashboard: ptBRDashboard,
    clients: ptBRClients,
    settings: ptBRSettings,
    pipeline: ptBRPipeline,
    ai: ptBRAi,
    landing: ptBRLanding,
    team: ptBRTeam,
    notifications: ptBRNotifications,
    support: ptBRSupport,
    finance: ptBRFinance,
    academia: ptBRAcademia,
  },
  'en-US': {
    common: enUSCommon,
    auth: enUSAuth,
    dashboard: enUSDashboard,
    clients: enUSClients,
    settings: enUSSettings,
    pipeline: enUSPipeline,
    ai: enUSAi,
    landing: enUSLanding,
    team: enUSTeam,
    notifications: enUSNotifications,
    support: enUSSupport,
    finance: enUSFinance,
    academia: enUSAcademia,
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    defaultNS: 'common',
    ns: ['common', 'auth', 'dashboard', 'clients', 'settings', 'pipeline', 'ai', 'landing', 'team', 'notifications', 'support', 'finance', 'academia'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
