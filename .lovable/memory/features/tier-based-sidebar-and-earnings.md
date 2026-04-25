---
name: Tier-based Sidebar + Mis Ganancias (Fase 2.6)
description: Sidebar dinámico por tier de org (free vs pro/elite/internal) + página /earnings para que estudiantes Modelo A vean su 60% acumulado de KCFY. Rename Approve→Activar Closer.
type: feature
---

# Fase 2.6 — Gated Access + Sidebar Inteligente

## Sidebar dinámico (`src/components/layout/Sidebar.tsx`)
Estructura: `coreItems` (todos) + `proItems` filtrados por `currentOrg.tier` + `settingsItem`.

- **Estudiante free (Modelo A)** ve solo: Dashboard, Guía, Importar, Leads, Pipeline, Properties, Entrenamiento AI, **Mis Ganancias**, Settings.
- **Pro/Elite/Internal** ven además: Buyers, Realtors, Tracking, Campaigns, Deals, Contratos, Payments, Cobros.
- **Super admin Klose** mantiene sección "Klose Admin" → KCFY Requests.

Razón Modelo A: estudiante NO firma contratos (Klose LLC lo hace), NO accede a buyers (activo de Klose), NO factura (no tiene LLC). Solo pide KCFY y cobra su 60%.

## Página `/earnings` (`src/pages/Earnings.tsx`)
Vista personal del estudiante con:
- 3 KPIs: Ya ganado (closed × 60%), En proceso (pending+accepted+in_progress × 60%), Total solicitudes
- Lista de sus KCFY requests con address, status badge, prioridad, fechas, motivo de rechazo si aplica, y su corte calculado en vivo.
- Query filtrada por `requested_by = user.id` AND `organization_id = orgId`.

## Narrativa premium
- `AdminUsersPanel` renombrado: "User Management" → **"Klose Closers Program"**
- Botón "Approve" → **"Activar Closer"**
- "Pending" → "Aplicación pendiente"
- "Approved" → "Closers activos"
- Toasts en español

## Decisiones confirmadas con el usuario
1. **Acceso**: Premium gated (aprobación obligatoria, narrativa exclusiva)
2. **Contratos**: NO visibles para estudiantes (protección legal Modelo A)
3. **Pricing Pro**: Buyers + Tracking + Campaigns + Importación ilimitada justifican $47/mes
4. **Mis Ganancias**: prioridad 8/10 → implementado en Fase 2.6

## Dashboard tier-aware (`src/pages/Index.tsx`)
Flag `showInternalWidgets = isSuperAdmin || is_klose_internal || tier in ('internal','elite')`.

- **Estudiante free/pro** ve solo: Stats (Total Leads, En Pipeline, Deals Activos, K-Score), StaleLeadsAlert, HotLeads, CriticalActions, LeadsDelDia, PipelinePreview, ActivityFeed.
- Stat "Buyers Activos" reemplazado por "En Pipeline" (suma contacto+bajo_contrato+cesion) para no exponer red de buyers.
- Widgets ocultos a estudiantes: PayoutSchedule (Stripe→Mercury de Klose LLC), PipelineHygiene (operacional admin), BuyerLiquidity (IP Klose), DeadLeadsAnalytics (org-wide noise).
- Cuando no hay columna derecha, el grid colapsa a `lg:grid-cols-1` para evitar hueco visual.

## Pendiente para próximas fases
- Fase 4: Stripe pricing tiers (free/pro/elite) + paywall en Pro items
- Fase 4: Landing `/apply` con form de calificación + auto-scoring IA
- Fase 6: Pago automático del 60% al cerrar deal KCFY (registro en `payments`)
