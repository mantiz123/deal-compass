-- Phase 1: Drop wholesaling + academy + related modules
-- Order matters only if not using CASCADE; we use CASCADE for safety.

-- Interactions & lead-related
DROP TABLE IF EXISTS public.interactions CASCADE;
DROP TABLE IF EXISTS public.lead_documents CASCADE;
DROP TABLE IF EXISTS public.lead_email_drafts CASCADE;
DROP TABLE IF EXISTS public.lead_cleanup_log CASCADE;

-- KCFY
DROP TABLE IF EXISTS public.kcfy_status_events CASCADE;
DROP TABLE IF EXISTS public.kcfy_requests CASCADE;

-- Deal packages & outreach
DROP TABLE IF EXISTS public.deal_packages CASCADE;
DROP TABLE IF EXISTS public.outreach_email_log CASCADE;
DROP TABLE IF EXISTS public.sms_outreach_log CASCADE;
DROP TABLE IF EXISTS public.seller_conversations CASCADE;

-- Campaigns
DROP TABLE IF EXISTS public.campaign_message_logs CASCADE;
DROP TABLE IF EXISTS public.campaign_enrollments CASCADE;
DROP TABLE IF EXISTS public.campaign_sequences CASCADE;
DROP TABLE IF EXISTS public.drip_campaigns CASCADE;

-- Realtors
DROP TABLE IF EXISTS public.realtors CASCADE;

-- Academy
DROP TABLE IF EXISTS public.academy_certificates CASCADE;
DROP TABLE IF EXISTS public.academy_quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.academy_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.academy_lesson_progress CASCADE;
DROP TABLE IF EXISTS public.academy_lessons CASCADE;
DROP TABLE IF EXISTS public.academy_enrollments CASCADE;
DROP TABLE IF EXISTS public.academy_track_purchases CASCADE;
DROP TABLE IF EXISTS public.academy_tracks CASCADE;
DROP TABLE IF EXISTS public.academy_state_packs CASCADE;
DROP TABLE IF EXISTS public.academy_states CASCADE;
DROP TABLE IF EXISTS public.state_waitlist CASCADE;
DROP TABLE IF EXISTS public.user_state_specializations CASCADE;

-- Training & agent demos
DROP TABLE IF EXISTS public.training_sessions CASCADE;
DROP TABLE IF EXISTS public.agent_demos CASCADE;

-- Contractor agreements
DROP TABLE IF EXISTS public.contractor_agreements CASCADE;

-- Import logs
DROP TABLE IF EXISTS public.propwire_import_log CASCADE;

-- Leads (last, because many things pointed at it)
DROP TABLE IF EXISTS public.leads CASCADE;

-- Drop related enums (if unused)
DROP TYPE IF EXISTS public.kcfy_stage CASCADE;
DROP TYPE IF EXISTS public.certificate_type CASCADE;
DROP TYPE IF EXISTS public.lead_strategy CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS public.has_completed_foundations(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.has_track_access(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_state(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.generate_certificate_number(certificate_type) CASCADE;
DROP FUNCTION IF EXISTS public.kcfy_log_initial_event() CASCADE;
DROP FUNCTION IF EXISTS public.kcfy_log_status_change() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_student_org() CASCADE;
DROP FUNCTION IF EXISTS public.update_days_without_activity() CASCADE;
DROP FUNCTION IF EXISTS public.has_signed_contractor_agreement(uuid) CASCADE;