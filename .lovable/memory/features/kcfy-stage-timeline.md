---
name: KCFY Stage Timeline
description: Pipeline visual de 7 etapas (submitted→accepted→contacting_seller→negotiating→under_contract→buyer_secured→closed, +dead) para cada KCFY con timestamps y responsable
type: feature
---
Tabla `kcfy_status_events` (kcfy_request_id, organization_id, stage enum kcfy_stage, note, created_by, created_at) con RLS multi-tenant. Triggers: `kcfy_log_initial_event` (INSERT en kcfy_requests → evento submitted) y `kcfy_log_status_change` (UPDATE de status → mapea a stage). Hook `useKCFYStatusEvents` lee con join a profiles para nombre del responsable. `useAddKCFYStatusEvent` inserta evento manual y sincroniza el status legacy (accepted/in_progress/closed/rejected). Componente `KCFYTimeline` muestra 7 etapas con icon, duración entre etapas, nota y autor. Integrado en `RequestKCFYDialog` (vista estudiante) y `AdminKCFY` (con dialog "Avanzar etapa" + selector de stage + nota obligatoria si es dead).
