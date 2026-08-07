import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';

export default function PaymentSettingsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');
    const [settings, setSettings] = useState({
        accountName: '', bankName: '', accountNumber: '', instructions: '',
        enableCrypto: false, usdtAddress: '', usdtNetwork: 'TRC20', usdtWalletLabel: '',
        exchangeRateSource: '', manualOverrideRate: '',
    });

    useEffect(() => {
        let live = true;
        (async () => {
            try {
                const { data } = await api.get('/payments-settings/admin/all');
                if (!live) return;
                const latest = (data.settings && data.settings.length) ? data.settings[0] : null;
                if (latest) {
                    // Clear any previous load-error marker so subsequent fetches show errors again
                    if (window && window.__paymentSettingsLoadError) window.__paymentSettingsLoadError = false;
                    setSettings({
                    accountName: latest.accountName || '', bankName: latest.bankName || '', accountNumber: latest.accountNumber || '', instructions: latest.instructions || '',
                    enableCrypto: !!latest.enableCrypto, usdtAddress: latest.usdtAddress || '', usdtNetwork: latest.usdtNetwork || 'TRC20', usdtWalletLabel: latest.usdtWalletLabel || '',
                    exchangeRateSource: latest.exchangeRateSource || '', manualOverrideRate: latest.manualOverrideRate || '',
                });
                }
            } catch (err) {
                // Avoid showing duplicate error toasts when React StrictMode mounts twice in dev
                if (window && window.__paymentSettingsLoadError) return;
                if (window) window.__paymentSettingsLoadError = true;
                toast.error(err.response?.data?.message || 'Could not load settings');
            } finally {
                if (live) setLoading(false);
            }
        })();
        return () => { live = false; };
    }, []);

    const save = async (e) => {
        e?.preventDefault();
        setFormError('');
        // client-side validation to avoid server 400s
        if (!settings.accountName || !settings.bankName || !settings.accountNumber) {
            setFormError('Account name, bank name and account number are required');
            return;
        }
        setSaving(true);
        try {
            const payload = { ...settings };
            if (payload.manualOverrideRate === '') delete payload.manualOverrideRate;
            await api.post('/payments-settings/admin', payload);
            toast.success('Payment settings saved');
            navigate('/admin/dashboard');
        } catch (err) {
            const msg = err.response?.data?.message || 'Could not save settings';
            setFormError(msg);
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <AdminNavbar>
            <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
                <h1 className="font-serif text-2xl font-extrabold mb-4">Payment Settings</h1>
                <p className="text-sm text-muted mb-6">Configure bank transfer details and optional USDT (TRC20) payment options and exchange rate.</p>
                <form onSubmit={save} className="space-y-4">
                    {formError && <div className="text-sm text-danger-ink">{formError}</div>}
                    <div>
                        <label className="label-meta">Account name</label>
                        <input className="w-full border px-3 py-2" value={settings.accountName} onChange={(e) => setSettings(s => ({ ...s, accountName: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label-meta">Bank name</label>
                        <input className="w-full border px-3 py-2" value={settings.bankName} onChange={(e) => setSettings(s => ({ ...s, bankName: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label-meta">Account number</label>
                        <input className="w-full border px-3 py-2" value={settings.accountNumber} onChange={(e) => setSettings(s => ({ ...s, accountNumber: e.target.value }))} />
                    </div>
                    <div>
                        <label className="label-meta">Instructions (shown to students)</label>
                        <textarea className="w-full border px-3 py-2" value={settings.instructions} onChange={(e) => setSettings(s => ({ ...s, instructions: e.target.value }))} />
                    </div>

                    <hr />
                    <div>
                        <label className="inline-flex items-center gap-2">
                            <input type="checkbox" checked={settings.enableCrypto} onChange={(e) => setSettings(s => ({ ...s, enableCrypto: e.target.checked }))} />
                            <span className="ml-2">Enable USDT (TRC20) payments</span>
                        </label>
                    </div>
                    {settings.enableCrypto && (
                        <>
                            <div>
                                <label className="label-meta">USDT Wallet address</label>
                                <input className="w-full border px-3 py-2" value={settings.usdtAddress} onChange={(e) => setSettings(s => ({ ...s, usdtAddress: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-meta">Network</label>
                                <input className="w-full border px-3 py-2" value={settings.usdtNetwork} onChange={(e) => setSettings(s => ({ ...s, usdtNetwork: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-meta">Wallet label (optional)</label>
                                <input className="w-full border px-3 py-2" value={settings.usdtWalletLabel} onChange={(e) => setSettings(s => ({ ...s, usdtWalletLabel: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-meta">Exchange rate source</label>
                                <input className="w-full border px-3 py-2" placeholder="coingecko or a URL returning rate" value={settings.exchangeRateSource} onChange={(e) => setSettings(s => ({ ...s, exchangeRateSource: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label-meta">Manual override rate (NGN per USDT)</label>
                                <input type="number" step="0.01" className="w-full border px-3 py-2" value={settings.manualOverrideRate} onChange={(e) => setSettings(s => ({ ...s, manualOverrideRate: e.target.value }))} />
                            </div>
                        </>
                    )}

                    <div className="pt-4">
                        <button type="submit" disabled={saving} className="bg-primary px-4 py-2 text-white font-bold">
                            {saving ? 'Saving…' : 'Save settings'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminNavbar>
    );
}
