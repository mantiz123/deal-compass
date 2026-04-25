---
name: ICA Bloqueo Escalonado + Disclaimer en Outreach
description: Hook useICAGuard que bloquea creación de leads, outreach a sellers, KCFY y página /earnings sin ICA firmado. Disclaimer legal de contratista independiente inyectado obligatoriamente en todos los emails de outreach generados por AI.
type: feature
---

# Fase 3 — Bloqueo escalonado sin ICA

## Hook `useICAGuard` (`src/hooks/useICAGuard.ts`)
Devuelve `{ hasSigned, isLoading, isBlocked, requireICA(label?) }`. El método `requireICA` muestra toast destructivo + redirige a `/onboarding/contractor-agreement` cuando el usuario no ha firmado.

## Acciones BLOQUEADAS sin ICA firmado
1. **Crear lead** (`NewLeadDialog.handleSubmit`) — verifica `requireICA("crear leads")` antes de `createLead.mutateAsync`.
2. **Generar outreach email** (`OutreachEmailGenerator.handleGenerate`) — verifica `requireICA("enviar outreach a sellers")`.
3. **Solicitar KCFY** (`RequestKCFYDialog.handleSubmit`) — verifica `requireICA("solicitar KCFY")` y cierra el dialog.
4. **Página `/earnings`** — render condicional: si `isBlocked`, muestra Card amber con CTA "Firmar Independent Contractor Agreement" y NO ejecuta el query de ganancias.

## Acciones PERMITIDAS sin ICA (read-only)
- Academy, Dashboard, Settings, ver leads existentes, ver pipeline, ver propiedades, importar (read-only del UI).
- El banner global `ContractorAgreementBanner` ya estaba antes y permanece visible en todas las páginas excepto `/onboarding/contractor-agreement`, `/pending-approval`, `/auth`.

## Justificación legal del bloqueo
Sin ICA firmado:
- IRS no puede emitir 1099-NEC al final de año → no hay forma legal de pagar.
- KLOSE LLC queda expuesta a reclasificación como employer (W-2) si el "contratista" actúa sin contrato 1099 firmado.
- En caso de queja TCPA/UPL, no hay defensa de "independent contractor relationship".

# Fase 4 — Disclaimer automático en outreach

## Edge function `generate-outreach-email`
Modificado el `systemPrompt` de ambos templates (`initial_outreach` y `foreclosure_offer`) para REQUERIR un bloque de disclaimer legal al final del email bajo el header `LEGAL DISCLAIMER`:

> "I am an Independent Contractor of KLOSE LLC, a Wyoming registered real estate investment firm (EIN 41-4409334). I am NOT a licensed real estate agent and do not represent you in any real estate transaction. KLOSE LLC purchases properties as a principal buyer or assigns purchase contracts to end buyers."

## Safety net post-AI
Después de recibir la respuesta del modelo (Gemini 2.5 Flash), si el string `"Independent Contractor of KLOSE LLC"` NO está presente, se inyecta a fuerza el bloque canónico al final con `\n\nLEGAL DISCLAIMER\n{disclaimer}`. Esto garantiza 100% de presencia incluso si el modelo lo omite o lo parafrasea.

## Cobertura legal
- **TCPA**: el disclaimer aclara que el contacto es de un investment firm, no de un broker no licenciado solicitando representación.
- **UPL (Unauthorized Practice of Real Estate)**: dice explícitamente "I am NOT a licensed real estate agent and do not represent you" — bloquea reclamos de práctica no autorizada en AL/TX/FL.
- **Joint liability del estudiante**: posiciona al sender como "Independent Contractor of KLOSE LLC", trasladando la responsabilidad del mensaje al ICA firmado por el contratista.

## Pendiente próximas fases
- Fase 5: extender disclaimer a SMS outbound cuando se implementen llamadas Twilio.
- Fase 5: añadir disclaimer a `generate-deal-package` (PDFs enviados a buyers).
- Fase 6: tracking de versión del disclaimer enviado (auditoría: qué email contenía qué disclaimer en qué fecha).
