

# Plan: Prompts 2 y 3 — Onboarding con Selector de Vertical + Personalización por Vertical

Ambos prompts se implementan juntos ya que Prompt 1 (arquitectura base) ya está completo.

---

## Prompt 2: Onboarding con Selector de Vertical

### Cambio 2.1: Onboarding.tsx — Fase de selección de vertical
- Add `VerticalSelectorPanel` component before the chat phase
- Add `selectedVertical` state and `phase` state (`'vertical' | 'chat'`)
- Add `useLocation` import to detect `location.state?.vertical` from branded auth URLs
- Add `sessionStorage` check for `onboarding_vertical` on mount
- When vertical selected, send `__vertical:{id}` as internal message to trigger vertical-specific welcome
- Add "coming soon" screen for Openmedic (health) vertical
- Update progress calculation to show "Paso 1 de 7" for vertical selection

### Cambio 2.2: process-onboarding-step edge function
- Detect `__vertical:` prefix in `user_input`
- Save `industry_vertical` to `collected_data` in `onboarding_progress`
- Return vertical-specific welcome message without showing the internal command as user message
- Early return before normal step processing

### Cambio 2.3: Auth.tsx — Slug-to-vertical detection
- After successful signup, check URL path for `/auth/bitanai`, `/auth/openmedic`, `/auth/startercrm`
- Save vertical to `sessionStorage` as `onboarding_vertical`

### Cambio 2.4: useOnboarding.ts — Handle internal messages
- When `sendMessage` receives `__vertical:*`, don't add it to visible messages (or filter it out)

---

## Prompt 3: Personalización por Vertical

### Cambio 3.1: chat/index.ts — Dynamic AI context
- Add `verticalId` and `verticalContext` to `buildSystemPrompt` parameter type (line ~1690)
- Add `verticalIntro` variable before the return (line ~1740)
- Replace hardcoded first line with `${verticalIntro}` + vertical context block
- Before `buildSystemPrompt` call (line ~3985), query organization's `industry_vertical` and build context
- Pass `crmContextFinal` to `buildSystemPrompt`

### Cambio 3.2: Dashboard.tsx — Vertical banner
- Import `useVertical`, add banner at top of content showing vertical icon and name

### Cambio 3.3: Contacts.tsx — Dynamic vocabulary
- Import `useVertical`, replace hardcoded "Contactos" title, "Nuevo Contacto" button, search placeholder, and empty state with `vocabulary.contacts`/`vocabulary.contact`

### Cambio 3.4: Pipeline.tsx — Dynamic vocabulary
- Import `useVertical`, replace "Pipeline" title and "Nueva Oportunidad" button with vocabulary terms

### Cambio 3.5: Sidebar.tsx — Dynamic labels + Openmedic item
- Import `useVertical`, map nav items to use vocabulary for contacts/pipeline labels
- Add Openmedic nav item when `isHealth`

### Cambio 3.6: Create Openmedic.tsx placeholder page
- Coming soon page with features list and back button

### Cambio 3.7: App.tsx — Register `/openmedic` route

### Cambio 3.8: Settings.tsx — Vertical info card
- Import `useVertical`, show card with vertical icon, brand name, tagline, and vocabulary in Account tab

---

## Files affected

| File | Action |
|------|--------|
| `src/pages/Onboarding.tsx` | Major rewrite (vertical selector phase) |
| `src/hooks/useOnboarding.ts` | Edit (filter internal messages) |
| `src/pages/Auth.tsx` | Edit (slug-to-vertical sessionStorage) |
| `supabase/functions/process-onboarding-step/index.ts` | Edit (detect __vertical: prefix) |
| `supabase/functions/chat/index.ts` | Edit (dynamic system prompt) |
| `src/pages/Dashboard.tsx` | Edit (add banner) |
| `src/pages/Contacts.tsx` | Edit (vocabulary) |
| `src/pages/Pipeline.tsx` | Edit (vocabulary) |
| `src/components/layout/Sidebar.tsx` | Edit (vocabulary + openmedic item) |
| `src/pages/Openmedic.tsx` | **Create** |
| `src/App.tsx` | Edit (add route) |
| `src/pages/Settings.tsx` | Edit (vertical card) |

