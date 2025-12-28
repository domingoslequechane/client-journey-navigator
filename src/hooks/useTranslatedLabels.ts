import { useTranslation } from 'react-i18next';
import type { LeadSource, LeadTemperature, ServiceType, DocumentType } from '@/types';

// Hook for dynamic translation of labels
export function useTranslatedLabels() {
  const { t } = useTranslation('clients');
  const { t: tTeam } = useTranslation('team');
  const { t: tPipeline } = useTranslation('pipeline');

  // Qualification labels (cold, warm, hot, qualified)
  const getQualificationLabel = (qualification: string): string => {
    return t(`qualification.${qualification}`, qualification);
  };

  const qualificationLabels: Record<string, string> = {
    cold: t('qualification.cold'),
    warm: t('qualification.warm'),
    hot: t('qualification.hot'),
    qualified: t('qualification.qualified'),
  };

  // Source labels
  const getSourceLabel = (source: LeadSource | string): string => {
    const sourceMap: Record<string, string> = {
      google_maps: t('sources.google_maps', 'Google Maps'),
      social_media: t('sources.social_media', 'Social Media'),
      referral: t('sources.referral', 'Referral'),
      visit: t('sources.visit', 'Visit'),
      inbound: t('sources.inbound', 'Inbound'),
      other: t('sources.other', 'Other'),
    };
    return sourceMap[source] || source;
  };

  const sourceLabels: Record<LeadSource, string> = {
    google_maps: t('sources.google_maps', 'Google Maps'),
    social_media: t('sources.social_media', 'Social Media'),
    referral: t('sources.referral', 'Referral'),
    visit: t('sources.visit', 'Visit'),
    inbound: t('sources.inbound', 'Inbound'),
    other: t('sources.other', 'Other'),
  };

  // Temperature labels
  const getTemperatureLabel = (temperature: LeadTemperature | string): string => {
    return tPipeline(`filters.${temperature}`, temperature);
  };

  const temperatureLabels: Record<LeadTemperature, string> = {
    cold: tPipeline('filters.cold'),
    warm: tPipeline('filters.warm'),
    hot: tPipeline('filters.hot'),
  };

  // Stage labels - use the stages object structure
  const getStageLabel = (stage: string): string => {
    // Map UI stage IDs to DB stage IDs
    const stageDbMap: Record<string, string> = {
      prospecting: 'prospeccao',
      qualification: 'reuniao',
      closing: 'contratacao',
      production: 'producao',
      campaigns: 'trafego',
      retention: 'retencao',
      loyalty: 'fidelizacao',
    };
    const dbStage = stageDbMap[stage] || stage;
    return t(`stages.${dbStage}`, tPipeline(`stages.${dbStage}.name`, stage));
  };

  const stageLabels: Record<string, string> = {
    prospeccao: t('stages.prospeccao', tPipeline('stages.prospeccao.name', 'Prospecting')),
    reuniao: t('stages.reuniao', tPipeline('stages.reuniao.name', 'Meeting')),
    contratacao: t('stages.contratacao', tPipeline('stages.contratacao.name', 'Contracting')),
    producao: t('stages.producao', tPipeline('stages.producao.name', 'Production')),
    trafego: t('stages.trafego', tPipeline('stages.trafego.name', 'Traffic')),
    retencao: t('stages.retencao', tPipeline('stages.retencao.name', 'Retention')),
    fidelizacao: t('stages.fidelizacao', tPipeline('stages.fidelizacao.name', 'Loyalty')),
  };

  // Role labels
  const getRoleLabel = (role: string): string => {
    return tTeam(`roles.${role}.name`, role);
  };

  const roleLabels: Record<string, string> = {
    admin: tTeam('roles.admin.name'),
    sales: tTeam('roles.sales.name'),
    operations: tTeam('roles.operations.name'),
    campaign_management: tTeam('roles.campaign_management.name'),
  };

  // Service labels
  const getServiceLabel = (service: ServiceType | string): string => {
    const serviceMap: Record<string, string> = {
      social_management: t('services.social_management', 'Social Media Management'),
      content_creation: t('services.content_creation', 'Content Creation'),
      video_production: t('services.video_production', 'Video Production'),
      facebook_ads: t('services.facebook_ads', 'Facebook Ads'),
      instagram_ads: t('services.instagram_ads', 'Instagram Ads'),
      tiktok_ads: t('services.tiktok_ads', 'TikTok Ads'),
      graphic_design: t('services.graphic_design', 'Graphic Design'),
      marketing_consulting: t('services.marketing_consulting', 'Marketing Consulting'),
    };
    return serviceMap[service] || service;
  };

  const serviceLabels: Record<ServiceType, string> = {
    social_management: t('services.social_management', 'Social Media Management'),
    content_creation: t('services.content_creation', 'Content Creation'),
    video_production: t('services.video_production', 'Video Production'),
    facebook_ads: t('services.facebook_ads', 'Facebook Ads'),
    instagram_ads: t('services.instagram_ads', 'Instagram Ads'),
    tiktok_ads: t('services.tiktok_ads', 'TikTok Ads'),
    graphic_design: t('services.graphic_design', 'Graphic Design'),
    marketing_consulting: t('services.marketing_consulting', 'Marketing Consulting'),
  };

  // Document type labels
  const getDocumentTypeLabel = (docType: DocumentType | string): string => {
    const docMap: Record<string, string> = {
      contract: t('documents.contract', 'Contract'),
      proforma_invoice: t('documents.proforma_invoice', 'Proforma Invoice'),
      budget: t('documents.budget', 'Budget'),
      commercial_proposal: t('documents.commercial_proposal', 'Commercial Proposal'),
    };
    return docMap[docType] || docType;
  };

  const documentTypeLabels: Record<DocumentType, string> = {
    contract: t('documents.contract', 'Contract'),
    proforma_invoice: t('documents.proforma_invoice', 'Proforma Invoice'),
    budget: t('documents.budget', 'Budget'),
    commercial_proposal: t('documents.commercial_proposal', 'Commercial Proposal'),
  };

  return {
    // Getters
    getQualificationLabel,
    getSourceLabel,
    getTemperatureLabel,
    getStageLabel,
    getRoleLabel,
    getServiceLabel,
    getDocumentTypeLabel,
    // Label objects
    qualificationLabels,
    sourceLabels,
    temperatureLabels,
    stageLabels,
    roleLabels,
    serviceLabels,
    documentTypeLabels,
  };
}
