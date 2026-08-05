import { useEffect, useState } from 'react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function PaymentsPage() {
    const [loading, setLoading] = useState(true);
    const [payments, setPayments] = useState([]);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({ status: '', method: '', q: '' });
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const fetchList = async () => {
        setLoading(true);
        try {
            const params = {};
            if (filters.status) params.status = filters.status;
            if (filters.method) params.method = filters.method;
            if (filters.q) params.q = filters.q;
            const { data } = await api.get('/payments/admin/all', { params });
            setPayments(data.payments || []);
            setTotal(data.total || 0);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load payments');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchList(); }, []);

    const openDetail = async (id) => {
        setDetailLoading(true);
        try {
            const { data } = await api.get(`/payments/${id}`);
            setSelected(data.payment);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not load payment');
        } finally {
            setDetailLoading(false);
        }
    };

    const approve = async (id) => {
        try {
            await api.patch(`/payments/${id}/approve`);
            toast.success('Payment approved');
            setSelected(null);
            fetchList();
        } catch (err) { toast.error(err.response?.data?.message || 'Could not approve'); }
    };

    const reject = async (id, reason) => {
        try {
            await api.patch(`/payments/${id}/reject`, { reason });
            toast.success('Payment rejected');
            setSelected(null);
            fetchList();
        } catch (err) { toast.error(err.response?.data?.message || 'Could not reject'); }
    };

    return (
        <AdminNavbar>
            <div className="mx-auto max-w-6xl px-6 py-12">
                <h1 className="font-serif text-2xl font-extrabold mb-4">Payments</h1>

                <div className="flex items-center gap-3 mb-4">
                    <select value={filters.status} onChange={(e) => setFilters(s => ({ ...s, status: e.target.value }))} className="border px-3 py-2">
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select value={filters.method} onChange={(e) => setFilters(s => ({ ...s, method: e.target.value }))} className="border px-3 py-2">
                        <option value="">All methods</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="usdt">USDT</option>
                    </select>
                    <input placeholder="Search by student, booking id, tx ref/txid" value={filters.q} onChange={(e) => setFilters(s => ({ ...s, q: e.target.value }))} className="border px-3 py-2 flex-1" />
                    <button onClick={fetchList} className="bg-primary px-3 py-2 text-white">Search</button>
                </div>

                <div className="border bg-surface p-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted">
                                    <th className="p-2">Student</th>
                                    <th className="p-2">Accommodation</th>
                                    <th className="p-2">Booking</th>
                                    <th className="p-2">Method</th>
                                    <th className="p-2">Amount (NGN)</th>
                                    <th className="p-2">Expected USDT</th>
                                    <th className="p-2">Status</th>
                                    <th className="p-2">Submitted</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={9} className="p-4 text-center">Loading…</td></tr>
                                ) : payments.length === 0 ? (
                                    <tr><td colSpan={9} className="p-4 text-center">No payments</td></tr>
                                ) : payments.map(p => (
                                    <tr key={p._id} className="border-t">
                                        <td className="p-2">{p.student?.fullName}</td>
                                        <td className="p-2">{p.booking?.listing?.title}</td>
                                        <td className="p-2">{p.booking?._id}</td>
                                        <td className="p-2">{p.paymentMethod}</td>
                                        <td className="p-2">{p.amount ? `₦${Number(p.amount).toLocaleString()}` : '—'}</td>
                                        <td className="p-2">{p.expectedUsdtAmount ? `${p.expectedUsdtAmount} USDT` : '—'}</td>
                                        <td className="p-2">{p.status}</td>
                                        <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                                        <td className="p-2"><button onClick={() => openDetail(p._id)} className="text-sm text-primary">View</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {selected && (
                    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                        <div className="bg-white max-w-2xl w-full p-6">
                            <div className="flex justify-between items-start">
                                <h2 className="font-bold">Payment details</h2>
                                <button onClick={() => setSelected(null)} className="text-muted">Close</button>
                            </div>
                            <div className="mt-4 space-y-3">
                                <div><strong>Student:</strong> {selected.student?.fullName} &lt;{selected.student?.email}&gt;</div>
                                <div><strong>Accommodation:</strong> {selected.booking?.listing?.title}</div>
                                <div><strong>Booking:</strong> {selected.booking?._id}</div>
                                <div><strong>Method:</strong> {selected.paymentMethod}</div>
                                <div><strong>Amount (NGN):</strong> {selected.amount ? `₦${Number(selected.amount).toLocaleString()}` : '—'}</div>
                                {selected.paymentMethod === 'bank_transfer' && (
                                    <div>
                                        <div><strong>Sender name:</strong> {selected.senderName}</div>
                                        <div><strong>Transaction reference:</strong> {selected.transactionReference}</div>
                                        <div><strong>Payment date:</strong> {selected.paymentDate ? new Date(selected.paymentDate).toLocaleDateString() : '—'}</div>
                                        {selected.receipt && (<div><a href={`/uploads/${selected.receipt}`} target="_blank">View receipt</a></div>)}
                                    </div>
                                )}
                                {selected.paymentMethod === 'usdt' && (
                                    <div>
                                        <div><strong>Wallet used:</strong> {selected.walletAddress || selected.walletAddress}</div>
                                        <div><strong>Recipient wallet:</strong> {selected.booking?.listing ? selected.booking.listing : '—'}</div>
                                        <div><strong>Network:</strong> {selected.network}</div>
                                        <div><strong>Transaction hash:</strong> {selected.transactionHash}</div>
                                        <div><strong>Expected USDT:</strong> {selected.expectedUsdtAmount ? `${selected.expectedUsdtAmount} USDT` : '—'}</div>
                                        {selected.blockchainScreenshot && (<div><a href={`/uploads/${selected.blockchainScreenshot}`} target="_blank">View screenshot</a></div>)}
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex items-center gap-3">
                                {selected.status !== 'approved' && (
                                    <button onClick={() => approve(selected._id)} className="bg-success px-3 py-2 text-white">Approve</button>
                                )}
                                {selected.status !== 'rejected' && (
                                    <button onClick={() => {
                                        const reason = prompt('Enter rejection reason (optional)');
                                        if (reason !== null) reject(selected._id, reason);
                                    }} className="bg-danger px-3 py-2 text-white">Reject</button>
                                )}
                                <button onClick={() => setSelected(null)} className="px-3 py-2 border">Close</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminNavbar>
    );
}
