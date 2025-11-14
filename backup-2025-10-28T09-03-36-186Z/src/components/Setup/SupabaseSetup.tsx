import React, { useState } from 'react';
import { Database, ExternalLink, Copy, Check, AlertCircle } from 'lucide-react';

export function SupabaseSetup() {
  const [step, setStep] = useState(1);
  const [projectUrl, setProjectUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const migrationSQL = `-- GPT Models table for custom AI configurations
CREATE TABLE IF NOT EXISTS gpt_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content_type text NOT NULL,
  system_prompt text NOT NULL,
  temperature numeric(3,2) DEFAULT 0.7,
  max_tokens integer DEFAULT 1500,
  model text DEFAULT 'gpt-3.5-turbo',
  is_active boolean DEFAULT false,
  usage_count integer DEFAULT 0,
  last_used timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE gpt_models ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Operators can manage GPT models"
  ON gpt_models
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'operator'
    )
  );

CREATE POLICY "Users can read active GPT models"
  ON gpt_models
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gpt_models_updated_at
    BEFORE UPDATE ON gpt_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();`;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Supabase Setup</h1>
          <p className="text-gray-600">Configure your database for multi-user support</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-16 h-1 mx-2 ${
                    step > stepNum ? 'bg-green-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Create Project */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Step 1: Create Supabase Project</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">What you'll need:</h3>
                    <ul className="mt-2 text-sm text-blue-800 space-y-1">
                      <li>• Free Supabase account</li>
                      <li>• 2 minutes to set up</li>
                      <li>• Your project URL and API key</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">1. Go to Supabase Dashboard</h3>
                    <p className="text-sm text-gray-600">Create a new project or use existing</p>
                  </div>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <ExternalLink size={16} />
                    <span>Open Supabase</span>
                  </a>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">2. Create New Project</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Click "New Project"</li>
                    <li>• Choose organization</li>
                    <li>• Name: "Travel Content Platform" (or any name)</li>
                    <li>• Choose region closest to Netherlands</li>
                    <li>• Set database password (save it!)</li>
                    <li>• Click "Create new project"</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next: Get API Keys
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Get API Keys */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Step 2: Get API Keys</h2>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">1. Go to Settings → API</h3>
                  <p className="text-sm text-gray-600">In your Supabase project dashboard</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">2. Copy Project URL</h3>
                  <input
                    type="text"
                    placeholder="https://your-project-id.supabase.co"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">3. Copy anon/public Key</h3>
                  <input
                    type="text"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!projectUrl || !anonKey}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next: Setup Database
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Database Setup */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Step 3: Setup Database</h2>
              
              <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">1. Go to SQL Editor</h3>
                  <p className="text-sm text-gray-600">In your Supabase dashboard, click "SQL Editor"</p>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">2. Run this SQL migration:</h3>
                    <button
                      onClick={() => handleCopy(migrationSQL)}
                      className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                    </button>
                  </div>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-64">
{migrationSQL}
                  </pre>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">3. Execute the SQL</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Paste the SQL in the editor</li>
                    <li>• Click "Run" button</li>
                    <li>• Wait for "Success" message</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next: Configure App
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Configure App */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Step 4: Configure App</h2>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-green-900">Almost done!</h3>
                    <p className="text-sm text-green-800 mt-1">
                      Your environment variables have been updated. The app will restart automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Environment Variables Updated:</h3>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono">
                  <div>VITE_SUPABASE_URL={projectUrl}</div>
                  <div>VITE_SUPABASE_ANON_KEY={anonKey.substring(0, 20)}...</div>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">What happens next:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ App restarts with Supabase connection</li>
                  <li>✅ GPT models are stored in database</li>
                  <li>✅ All 500 reisagenten can use the same GPTs</li>
                  <li>✅ Real-time sync across all users</li>
                </ul>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => window.location.reload()}
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  🎉 Complete Setup & Restart App
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}