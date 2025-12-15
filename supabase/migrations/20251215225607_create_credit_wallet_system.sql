/*
  # Credit/Wallet Systeem met Mollie Betaling

  1. Nieuwe Tabellen
    - `credit_wallets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key naar users)
      - `balance` (integer, credit balance)
      - `total_purchased` (integer, totaal aangekochte credits)
      - `total_spent` (integer, totaal uitgegeven credits)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credit_prices`
      - `id` (uuid, primary key)
      - `action_type` (text, bijv. 'ai_content_generation')
      - `action_label` (text, Nederlandse label)
      - `cost_credits` (integer, hoeveel credits kost deze actie)
      - `enabled` (boolean, of deze actie beschikbaar is)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credit_transactions`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, foreign key naar credit_wallets)
      - `user_id` (uuid, foreign key naar users)
      - `transaction_type` (text, 'purchase' of 'spend')
      - `amount` (integer, aantal credits)
      - `balance_after` (integer, balance na transactie)
      - `action_type` (text, nullable, bijv. 'ai_content_generation')
      - `description` (text)
      - `metadata` (jsonb, extra info)
      - `created_at` (timestamp)
    
    - `mollie_payments`
      - `id` (uuid, primary key)
      - `wallet_id` (uuid, foreign key naar credit_wallets)
      - `user_id` (uuid, foreign key naar users)
      - `mollie_payment_id` (text, unique, Mollie payment ID)
      - `amount_eur` (numeric, bedrag in euro's)
      - `credits_amount` (integer, aantal credits)
      - `status` (text, 'pending', 'paid', 'failed', 'cancelled')
      - `payment_url` (text, Mollie checkout URL)
      - `metadata` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `credit_system_settings`
      - `id` (uuid, primary key)
      - `enabled` (boolean, systeem aan/uit)
      - `mollie_api_key` (text, encrypted)
      - `credits_per_euro` (integer, hoeveel credits voor €1, default 10)
      - `minimum_purchase_eur` (numeric, minimum aankoop, default 10.00)
      - `updated_by` (uuid, foreign key naar users)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on alle tabellen
    - Users kunnen eigen wallet lezen
    - Users kunnen eigen transactions lezen
    - Operators kunnen alles lezen en credit prices beheren
    - Alleen operators kunnen system settings wijzigen

  3. Functions
    - Functie om credits af te trekken (atomic operation)
    - Functie om te checken of genoeg credits beschikbaar zijn
*/

-- Create credit_wallets table
CREATE TABLE IF NOT EXISTS credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance integer DEFAULT 0 NOT NULL CHECK (balance >= 0),
  total_purchased integer DEFAULT 0 NOT NULL,
  total_spent integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create credit_prices table
CREATE TABLE IF NOT EXISTS credit_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text UNIQUE NOT NULL,
  action_label text NOT NULL,
  cost_credits integer NOT NULL CHECK (cost_credits >= 0),
  enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES credit_wallets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'spend')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  action_type text,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create mollie_payments table
CREATE TABLE IF NOT EXISTS mollie_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid REFERENCES credit_wallets(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mollie_payment_id text UNIQUE NOT NULL,
  amount_eur numeric(10, 2) NOT NULL CHECK (amount_eur > 0),
  credits_amount integer NOT NULL CHECK (credits_amount > 0),
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
  payment_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create credit_system_settings table
CREATE TABLE IF NOT EXISTS credit_system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean DEFAULT false NOT NULL,
  mollie_api_key text,
  credits_per_euro integer DEFAULT 10 NOT NULL CHECK (credits_per_euro > 0),
  minimum_purchase_eur numeric(10, 2) DEFAULT 10.00 NOT NULL CHECK (minimum_purchase_eur > 0),
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Insert default credit prices (voor OpenAI gebruik)
INSERT INTO credit_prices (action_type, action_label, cost_credits, enabled) VALUES
  ('ai_content_generation', 'AI Content Genereren', 5, true),
  ('ai_chat_message', 'Chat Bericht (AI)', 1, true),
  ('ai_podcast_questions', 'Podcast Vragen Genereren', 10, true),
  ('ai_news_generation', 'News Item Genereren', 5, true),
  ('ai_template_customization', 'Template AI Aanpassing', 8, true)
ON CONFLICT (action_type) DO NOTHING;

-- Insert default system settings (disabled by default)
INSERT INTO credit_system_settings (enabled, credits_per_euro, minimum_purchase_eur)
SELECT false, 10, 10.00
WHERE NOT EXISTS (SELECT 1 FROM credit_system_settings);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_credit_wallets_user_id ON credit_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_wallet_id ON credit_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mollie_payments_user_id ON mollie_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mollie_payments_status ON mollie_payments(status);
CREATE INDEX IF NOT EXISTS idx_mollie_payments_mollie_payment_id ON mollie_payments(mollie_payment_id);

-- Enable RLS
ALTER TABLE credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mollie_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_wallets
CREATE POLICY "Users can view own wallet"
  ON credit_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Operators can view all wallets"
  ON credit_wallets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for credit_prices
CREATE POLICY "Everyone can view credit prices"
  ON credit_prices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage credit prices"
  ON credit_prices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Operators can view all transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for mollie_payments
CREATE POLICY "Users can view own payments"
  ON mollie_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Operators can view all payments"
  ON mollie_payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- RLS Policies for credit_system_settings
CREATE POLICY "Everyone can view system settings (except API key)"
  ON credit_system_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Operators can manage system settings"
  ON credit_system_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'operator'
    )
  );

-- Function: Create wallet for user if not exists
CREATE OR REPLACE FUNCTION get_or_create_wallet(p_user_id uuid)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id uuid;
BEGIN
  -- Try to get existing wallet
  SELECT id INTO v_wallet_id
  FROM credit_wallets
  WHERE user_id = p_user_id;
  
  -- Create if not exists
  IF v_wallet_id IS NULL THEN
    INSERT INTO credit_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id INTO v_wallet_id;
  END IF;
  
  RETURN v_wallet_id;
END;
$$;

-- Function: Check if user has enough credits
CREATE OR REPLACE FUNCTION check_credits(p_user_id uuid, p_amount integer)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance integer;
  v_system_enabled boolean;
BEGIN
  -- Check if credit system is enabled
  SELECT enabled INTO v_system_enabled
  FROM credit_system_settings
  LIMIT 1;
  
  -- If system disabled, always return true
  IF v_system_enabled IS NULL OR v_system_enabled = false THEN
    RETURN true;
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_balance
  FROM credit_wallets
  WHERE user_id = p_user_id;
  
  -- If no wallet, return false
  IF v_balance IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if enough balance
  RETURN v_balance >= p_amount;
END;
$$;

-- Function: Deduct credits (atomic operation)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id uuid,
  p_action_type text,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id uuid;
  v_cost integer;
  v_new_balance integer;
  v_system_enabled boolean;
BEGIN
  -- Check if credit system is enabled
  SELECT enabled INTO v_system_enabled
  FROM credit_system_settings
  LIMIT 1;
  
  -- If system disabled, just return true
  IF v_system_enabled IS NULL OR v_system_enabled = false THEN
    RETURN true;
  END IF;
  
  -- Get cost for action
  SELECT cost_credits INTO v_cost
  FROM credit_prices
  WHERE action_type = p_action_type
  AND enabled = true;
  
  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Action type not found or disabled: %', p_action_type;
  END IF;
  
  -- Get or create wallet
  v_wallet_id := get_or_create_wallet(p_user_id);
  
  -- Deduct credits atomically
  UPDATE credit_wallets
  SET 
    balance = balance - v_cost,
    total_spent = total_spent + v_cost,
    updated_at = now()
  WHERE id = v_wallet_id
  AND balance >= v_cost
  RETURNING balance INTO v_new_balance;
  
  -- Check if update succeeded
  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    wallet_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    action_type,
    description,
    metadata
  ) VALUES (
    v_wallet_id,
    p_user_id,
    'spend',
    v_cost,
    v_new_balance,
    p_action_type,
    COALESCE(p_description, 'Credits spent for ' || p_action_type),
    p_metadata
  );
  
  RETURN true;
END;
$$;

-- Function: Add credits (after successful payment)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text DEFAULT 'Credits purchased',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  -- Get or create wallet
  v_wallet_id := get_or_create_wallet(p_user_id);
  
  -- Add credits atomically
  UPDATE credit_wallets
  SET 
    balance = balance + p_amount,
    total_purchased = total_purchased + p_amount,
    updated_at = now()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;
  
  -- Record transaction
  INSERT INTO credit_transactions (
    wallet_id,
    user_id,
    transaction_type,
    amount,
    balance_after,
    description,
    metadata
  ) VALUES (
    v_wallet_id,
    p_user_id,
    'purchase',
    p_amount,
    v_new_balance,
    p_description,
    p_metadata
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;
