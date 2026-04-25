---
name: KCFY Admin Panel & Notifications
description: Panel /admin/kcfy para super admins (aceptar/rechazar/asignar) + notificaciones in-app vía useNotifications cuando se crea solicitud
type: feature
---

# KCFY Admin & Notifications (Phase 2.5b)

## Página /admin/kcfy
- `src/pages/AdminKCFY.tsx` — protegida con `Navigate` si `!isSuperAdmin`.
- Tabs por estado (pending / accepted / in_progress / closed / rejected / all).
- Cards de resumen con contadores por estado.
- Acciones: Aceptar (auto-asigna `klose_assignee_id = user.id`), Iniciar proceso, Cerrar deal, Rechazar (con razón).
- Usa `useKCFYRequests` + `useUpdateKCFYRequest` de `useKCFYRequests.ts`.

## Sidebar
- Sección "Klose Admin" visible solo cuando `isSuperAdmin === true`.
- Item "KCFY Requests" con badge destructivo mostrando count de pendientes.

## Notificaciones in-app (sin email)
- `useNotifications` extendido con tipo `kcfy_request`.
- Solo super admins ven solicitudes KCFY pendientes (últimos 14 días, máx 15).
- Click en notificación con `href: /admin/kcfy` navega directamente al panel.
- Refresca cada 5 min via `refetchInterval`.

## Decisiones de diseño
- NO se usa email — todo es in-app (panel + bell). Razón: el equipo Klose vive dentro de la app.
- Asignación automática al super admin que acepta (MVP). Refinar después si crece el equipo.
- Las notificaciones están ordenadas por timestamp desc en una sola lista mezclada.
