import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Wallet, CreditCard, TrendingUp, TrendingDown, Plus, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';

interface WalletData {
  id: string;
  balance: number;
  total_purchased: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  transaction_type: 'purchase' | 'spend';
  amount: number;
  balance_after: number;
  action_type: string | null;
  description: string;
  created_at: string;
}

interface CreditPrice {
  action_type: string;
  action_label: string;
  cost_credits: number;
}

interface SystemSettings {
  enabled: boolean;
  credits_per_euro: number;
  minimum_purchase_eur: number;
}

interface PendingPayment {
  id: string;
  mollie_payment_id: string;
  status: string;
  amount_eur: string;
  credits_amount: number;
  created_at: string;
}

export default function CreditWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [prices, setPrices] = useState<CreditPrice[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState(10);
  const [showTransactions, setShowTransactions] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'error' | null>(null);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [checkingPayment, setCheckingPayment] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Check for hash-based payment status (modern redirect from Mollie)
    const hash = window.location.hash;

    if (hash === '#payment-success') {
      setPaymentStatus('success');
      setTimeout(() => {
        loadData();
        window.history.replaceState({}, '', window.location.pathname);
      }, 2000);
    } else if (hash === '#payment-error') {
      setPaymentStatus('error');
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 3000);
    }

    // Legacy: Check for query-based payment status
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');

    if (payment === 'success') {
      setPaymentStatus('success');
      setTimeout(() => {
        loadData();
        window.history.replaceState({}, '', window.location.pathname);
      }, 2000);
    } else if (payment === 'error') {
      setPaymentStatus('error');
      setTimeout(() => {
        window.history.replaceState({}, '', window.location.pathname);
      }, 3000);
    }
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const [walletRes, transactionsRes, pricesRes, settingsRes, paymentsRes] = await Promise.all([
        supabase.from('credit_wallets').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('credit_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('credit_prices').select('action_type, action_label, cost_credits').eq('enabled', true),
        supabase.from('credit_system_settings').select('enabled, credits_per_euro, minimum_purchase_eur').single(),
        supabase.from('mollie_payments').select('id, mollie_payment_id, status, amount_eur, credits_amount, created_at').eq('user_id', user.id).in('status', ['pending', 'open']).order('created_at', { ascending: false })
      ]);

      if (walletRes.error && walletRes.error.code !== 'PGRST116') throw walletRes.error;
      if (transactionsRes.error) throw transactionsRes.error;
      if (pricesRes.error) throw pricesRes.error;
      if (settingsRes.error) throw settingsRes.error;

      setWallet(walletRes.data);
      setTransactions(transactionsRes.data || []);
      setPrices(pricesRes.data || []);
      setSettings(settingsRes.data);
      setPendingPayments(paymentsRes.data || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseCredits = async () => {
    if (!settings) return;

    if (purchaseAmount < settings.minimum_purchase_eur) {
      alert(`Minimum aankoop is €${settings.minimum_purchase_eur}`);
      return;
    }

    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-mollie-payment`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount_eur: purchaseAmount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      window.location.href = data.payment_url;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      alert('Fout bij aanmaken betaling. Probeer het opnieuw.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleCheckPaymentStatus = async (molliePaymentId: string) => {
    setCheckingPayment(molliePaymentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mollie_payment_id: molliePaymentId,
          }),
        }
      );

      const data = await response.json();

      if (data.success && data.status === 'paid') {
        // Payment is paid - show success and reload
        setPaymentStatus('success');
        if (data.credits_added) {
          // Credits just added
          await loadData();
        } else {
          // Credits already added before
          await loadData();
        }
        // Clear success message after 5 seconds
        setTimeout(() => setPaymentStatus(null), 5000);
      } else if (data.success) {
        alert(data.message);
        await loadData();
      } else {
        alert(data.message || 'Betaling nog niet voltooid');
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      alert('Fout bij checken betaling status');
    } finally {
      setCheckingPayment(null);
    }
  };

  if (!settings?.enabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin text-gray-400" size={24} />
        </div>
      </div>
    );
  }

  const creditsForAmount = Math.floor(purchaseAmount * settings.credits_per_euro);

  return (
    <div className="space-y-6">
      {paymentStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-green-900">Betaling Geslaagd!</h3>
            <p className="text-sm text-green-700 mt-1">
              Je credits zijn toegevoegd aan je wallet. Het kan enkele seconden duren voordat ze zichtbaar zijn.
            </p>
          </div>
        </div>
      )}

      {paymentStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Betaling Mislukt</h3>
            <p className="text-sm text-red-700 mt-1">
              Er is iets misgegaan met je betaling. Probeer het opnieuw of neem contact op met support.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Wallet className="text-gray-700" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Mijn Credits</h2>
            </div>
            <button
              onClick={loadData}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Ververs"
            >
              <RefreshCw className="text-gray-600" size={18} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Beschikbaar Saldo</div>
              <div className="text-4xl font-bold text-gray-900">{wallet?.balance || 0}</div>
              <div className="text-sm text-gray-500 mt-1">
                credits (≈ €{((wallet?.balance || 0) / settings.credits_per_euro).toFixed(2)})
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <TrendingUp size={16} />
                  Gekocht
                </div>
                <div className="text-2xl font-semibold text-gray-900">{wallet?.total_purchased || 0}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                  <TrendingDown size={16} />
                  Gebruikt
                </div>
                <div className="text-2xl font-semibold text-gray-900">{wallet?.total_spent || 0}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <CreditCard className="text-gray-700" size={20} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Credits Kopen</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bedrag (minimum €{settings.minimum_purchase_eur})
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  <input
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(parseFloat(e.target.value))}
                    min={settings.minimum_purchase_eur}
                    step="1"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent"
                  />
                </div>
                <div className="text-sm text-gray-600 whitespace-nowrap">
                  = {creditsForAmount} credits
                </div>
              </div>
            </div>

            <button
              onClick={handlePurchaseCredits}
              disabled={purchasing || purchaseAmount < settings.minimum_purchase_eur}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {purchasing ? (
                <>
                  <RefreshCw className="animate-spin" size={20} />
                  Betaling voorbereiden...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Koop Credits via Mollie
                </>
              )}
            </button>

            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="text-gray-600 mt-0.5 flex-shrink-0" size={18} />
              <p className="text-sm text-gray-700">
                Je wordt doorgestuurd naar Mollie voor een veilige betaling. Na betaling worden je credits direct toegevoegd.
              </p>
            </div>
          </div>
        </div>
      </div>

      {pendingPayments.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-orange-600" size={24} />
            <h3 className="text-lg font-semibold text-orange-900">Openstaande Betalingen</h3>
          </div>

          <p className="text-sm text-orange-800 mb-4">
            Je hebt nog openstaande betalingen. Klik op "Check Status" om te controleren of de betaling is afgerond en credits toe te voegen.
          </p>

          <div className="space-y-3">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900">€{payment.amount_eur}</span>
                      <span className="text-sm text-gray-500">→ {payment.credits_amount} credits</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      Aangemaakt: {new Date(payment.created_at).toLocaleString('nl-NL')}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {payment.status}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCheckPaymentStatus(payment.mollie_payment_id)}
                    disabled={checkingPayment === payment.mollie_payment_id}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium whitespace-nowrap"
                  >
                    {checkingPayment === payment.mollie_payment_id ? (
                      <>
                        <RefreshCw className="animate-spin" size={16} />
                        Checken...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Check Status
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {prices.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Prijzen</h3>
          <div className="space-y-2">
            {prices.map((price) => (
              <div key={price.action_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">{price.action_label}</span>
                <span className="font-medium text-gray-900">
                  {price.cost_credits} credits
                  <span className="text-sm text-gray-500 ml-2">
                    (≈ €{(price.cost_credits / settings.credits_per_euro).toFixed(2)})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="w-full flex items-center justify-between text-lg font-semibold text-gray-900 mb-4"
        >
          <span>Transactie Geschiedenis</span>
          <span className={`transform transition-transform ${showTransactions ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {showTransactions && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Geen transacties</p>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {transaction.transaction_type === 'purchase' ? (
                      <TrendingUp className="text-green-600" size={20} />
                    ) : (
                      <TrendingDown className="text-red-600" size={20} />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(transaction.created_at).toLocaleString('nl-NL')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${
                      transaction.transaction_type === 'purchase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.transaction_type === 'purchase' ? '+' : '-'}{transaction.amount}
                    </div>
                    <div className="text-sm text-gray-500">
                      Saldo: {transaction.balance_after}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
