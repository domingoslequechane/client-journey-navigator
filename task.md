# Carousel Studio Feature - Tasks

- [x] 1. Supabase Backend
  - [x] Create Database migration `create_studio_carousels`.
  - [x] Implement Edge Function `carousel-squad-orchestrator`.
- [x] 2. Studio Definitions
  - [x] Update `src/types/studio.ts`.
- [x] 3. UI Components (Carousel Squad)
  - [x] **DB:** Inserir linha `trial` em `plan_limits` com limites idênticos ao `free`
  - [x] **Hook:** Atualizar `PlanType` e lógica de Studio em `usePlanLimits.ts`
  - [x] **Hook:** Atualizar `PlanType` em `useSubscription.ts`
  - [x] **Page:** Revisar `Upgrade.tsx` para garantir compatibilidade de tipos
  - [ ] **Verificação:** Validar no browser os bloqueios com `plan_type = 'trial'`
- [x] 4. Verification and UI Polish
  - [x] Ensure downloads works for N images.
  - [x] Verify Edge Function outputs align with UI states.
