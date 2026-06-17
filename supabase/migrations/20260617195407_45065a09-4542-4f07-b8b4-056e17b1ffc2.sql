
CREATE TABLE public.reconciliations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tax_file_name TEXT,
  eb_file_name TEXT,
  matched_count INTEGER NOT NULL DEFAULT 0,
  mismatched_count INTEGER NOT NULL DEFAULT 0,
  only_tax_count INTEGER NOT NULL DEFAULT 0,
  only_eb_count INTEGER NOT NULL DEFAULT 0,
  total_diff NUMERIC NOT NULL DEFAULT 0,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reconciliations TO authenticated;
GRANT ALL ON public.reconciliations TO service_role;

ALTER TABLE public.reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reconciliations"
  ON public.reconciliations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX reconciliations_user_created_idx
  ON public.reconciliations (user_id, created_at DESC);
