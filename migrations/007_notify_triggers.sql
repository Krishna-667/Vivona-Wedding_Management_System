-- ==============================================================================
-- Migration: 007_notify_triggers.sql
-- Realtime Change Notifications using PostgreSQL LISTEN / NOTIFY
-- Replaces Supabase Realtime Logical Replication
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.notify_table_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload JSONB;
  v_wedding_id UUID;
  v_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_id := OLD.id;
    v_wedding_id := OLD.wedding_id;
  ELSE
    v_id := NEW.id;
    -- If table is messages, wedding_id comes from message_threads
    IF TG_TABLE_NAME = 'messages' THEN
      SELECT wedding_id INTO v_wedding_id FROM public.message_threads WHERE id = NEW.thread_id;
    ELSE
      v_wedding_id := NEW.wedding_id;
    END IF;
  END IF;

  v_payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'id', v_id,
    'wedding_id', v_wedding_id,
    'op', TG_OP,
    'timestamp', CURRENT_TIMESTAMP
  );

  PERFORM pg_notify('vivona_changes', v_payload::text);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Messages trigger
DROP TRIGGER IF EXISTS trg_notify_messages ON public.messages;
CREATE TRIGGER trg_notify_messages
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_table_change();

-- Vendor checkins trigger
DROP TRIGGER IF EXISTS trg_notify_checkins ON public.vendor_checkins;
CREATE TRIGGER trg_notify_checkins
AFTER INSERT OR UPDATE ON public.vendor_checkins
FOR EACH ROW EXECUTE FUNCTION public.notify_table_change();

-- Incidents trigger
DROP TRIGGER IF EXISTS trg_notify_incidents ON public.incidents;
CREATE TRIGGER trg_notify_incidents
AFTER INSERT OR UPDATE ON public.incidents
FOR EACH ROW EXECUTE FUNCTION public.notify_table_change();

-- Schedule entries trigger
DROP TRIGGER IF EXISTS trg_notify_schedule ON public.schedule_entries;
CREATE TRIGGER trg_notify_schedule
AFTER INSERT OR UPDATE ON public.schedule_entries
FOR EACH ROW EXECUTE FUNCTION public.notify_table_change();

-- Tasks trigger
DROP TRIGGER IF EXISTS trg_notify_tasks ON public.tasks;
CREATE TRIGGER trg_notify_tasks
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_table_change();
