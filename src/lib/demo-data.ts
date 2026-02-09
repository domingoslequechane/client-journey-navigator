import type { Client, JourneyStage, LeadSource, LeadTemperature, ServiceType } from "@/types";

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function phone(n: number) {
  // simple Moz-ish format example
  return `+258 84 ${String(n).padStart(7, "0")}`;
}

const serviceCombos: ServiceType[][] = [
  ["social_management", "content_creation"],
  ["facebook_ads", "instagram_ads"],
  ["graphic_design", "content_creation"],
  ["marketing_consulting", "facebook_ads"],
];

const notes = [
  "Quer mais leads qualificados e previsibilidade.",
  "Está insatisfeito com a agência anterior: pouca entrega.",
  "Boa verba, precisa de estratégia e execução.",
  "Objetivo: aumentar vendas no WhatsApp e visitas no Google Maps.",
];

type DemoClientSeed = {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  stage: JourneyStage;
  source: LeadSource;
  temperature: LeadTemperature;
  monthlyBudget: number;
  progress: number;
  paused?: boolean;
  createdDaysAgo: number;
  lastContactDaysAgo: number;
};

const seeds: DemoClientSeed[] = [
  {
    id: "demo-client-1",
    companyName: "Café Baobá",
    contactName: "Marta Luís",
    email: "marta@cafebaoba.co.mz",
    phone: phone(1234567),
    industry: "Restaurante / Café",
    stage: "prospecting",
    source: "google_maps",
    temperature: "warm",
    monthlyBudget: 12000,
    progress: 2,
    createdDaysAgo: 12,
    lastContactDaysAgo: 2,
  },
  {
    id: "demo-client-2",
    companyName: "Clínica Sorriso",
    contactName: "Dr. Paulo Matola",
    email: "paulo@clinicasorriso.co.mz",
    phone: phone(2345678),
    industry: "Saúde / Dentista",
    stage: "qualification",
    source: "referral",
    temperature: "hot",
    monthlyBudget: 25000,
    progress: 5,
    createdDaysAgo: 20,
    lastContactDaysAgo: 1,
  },
  {
    id: "demo-client-3",
    companyName: "Loja Nene",
    contactName: "Nené Amisse",
    email: "nené@lojanene.co.mz",
    phone: phone(3456789),
    industry: "E-commerce / Moda",
    stage: "closing",
    source: "social_media",
    temperature: "hot",
    monthlyBudget: 18000,
    progress: 7,
    createdDaysAgo: 28,
    lastContactDaysAgo: 3,
  },
  {
    id: "demo-client-4",
    companyName: "Academia Rápida",
    contactName: "Carla Mavota",
    email: "carla@academiarapida.co.mz",
    phone: phone(4567890),
    industry: "Fitness",
    stage: "production",
    source: "visit",
    temperature: "warm",
    monthlyBudget: 30000,
    progress: 6,
    createdDaysAgo: 35,
    lastContactDaysAgo: 5,
  },
  {
    id: "demo-client-5",
    companyName: "Imobiliária Maputo",
    contactName: "Rui Nhabanga",
    email: "rui@imobiliariamaputo.co.mz",
    phone: phone(5678901),
    industry: "Imobiliária",
    stage: "campaigns",
    source: "inbound",
    temperature: "warm",
    monthlyBudget: 40000,
    progress: 8,
    createdDaysAgo: 45,
    lastContactDaysAgo: 2,
  },
  {
    id: "demo-client-6",
    companyName: "Oficina N1",
    contactName: "Jorge Chissano",
    email: "jorge@oficinan1.co.mz",
    phone: phone(6789012),
    industry: "Automotivo",
    stage: "retention",
    source: "other",
    temperature: "cold",
    monthlyBudget: 15000,
    progress: 9,
    createdDaysAgo: 60,
    lastContactDaysAgo: 10,
  },
];

export function getDemoClients(): Client[] {
  return seeds.map((s, idx) => {
    const services = serviceCombos[idx % serviceCombos.length];

    return {
      id: s.id,
      companyName: s.companyName,
      contactName: s.contactName,
      email: s.email,
      phone: s.phone,
      industry: s.industry,
      stage: s.stage,
      score: 70 + idx * 4,
      createdAt: daysAgo(s.createdDaysAgo),
      lastContact: daysAgo(s.lastContactDaysAgo),
      notes: notes[idx % notes.length],
      bant: { budget: 8 - (idx % 3), authority: 7, need: 8, timeline: 6 + (idx % 3) },
      tasks: [],
      source: s.source,
      temperature: s.temperature,
      monthlyBudget: s.monthlyBudget,
      services,
      status: s.stage === "prospecting" || s.stage === "qualification" || s.stage === "closing" ? "lead" : "active",
      progress: s.progress,
      paused: Boolean(s.paused),
    } satisfies Client;
  });
}
