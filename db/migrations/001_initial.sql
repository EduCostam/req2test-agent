CREATE TABLE runs (
  id uuid PRIMARY KEY,
  request_id text NOT NULL,
  prompt_id text NOT NULL,
  prompt_version text NOT NULL,
  prompt_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','completed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE TABLE llm_calls (
  id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES runs(id),
  attempt integer NOT NULL CHECK (attempt BETWEEN 1 AND 3),
  model text NOT NULL,
  is_simulated boolean NOT NULL,
  prompt_version text NOT NULL,
  status text NOT NULL CHECK (status IN ('running','valid','invalid_output','timeout','provider_error')),
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cached_tokens integer CHECK (cached_tokens >= 0 AND cached_tokens <= input_tokens),
  cost_usd numeric(20,10) CHECK (cost_usd >= 0),
  latency_ms double precision CHECK (latency_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, attempt)
);
CREATE INDEX runs_request_id_idx ON runs(request_id);
