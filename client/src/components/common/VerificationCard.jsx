import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BadgeCheck, ShieldAlert, Clock, UploadCloud, Loader2, X, IdCard, Camera } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DOC_TYPES = {
	student: ['NIN', 'Student ID', 'Voters Card', 'Drivers Licence', 'Passport'],
	landlord: ['NIN', 'Voters Card', 'Drivers Licence', 'Passport'],
};

const COPY = {
	student: {
		verifiedTitle: 'Verified Student',
		verifiedSub: 'Your identity has been confirmed. Landlords can see your verified badge.',
	},
	landlord: {
		verifiedTitle: 'Verified Landlord',
		verifiedSub: 'Your identity is confirmed. Students see a "Verified" badge on your listings.',
	},
};

export default function VerificationCard({ role = 'student' }) {
	const { user, updateUser } = useAuth();
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const [docType, setDocType] = useState(DOC_TYPES[role][0]);
	const [front, setFront] = useState(null);
	const [back, setBack] = useState(null);
	const frontRef = useRef(null);
	const backRef = useRef(null);

	const load = () => {
		setLoading(true);
		api.get(`/kyc/${role}/verification`)
			.then(({ data }) => {
				setData(data);
				updateUser({ verified: data.verified, profilePicture: data.profilePicture });
			})
			.catch(() => setData({ verified: false, idDocument: { status: 'none' } }))
			.finally(() => setLoading(false));
	};

	useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [role]);

	const handleSubmit = async () => {
		if (!user?.profilePicture) { toast.error('Add a profile photo first'); return; }
		if (!front) { toast.error('Upload the front of your ID'); return; }
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('documentType', docType);
			fd.append('idFront', front);
			if (back) fd.append('idBack', back);
			await api.post(`/kyc/${role}/submit-id`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success('ID submitted for review');
			setFront(null); setBack(null);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Upload failed');
		} finally {
			setSubmitting(false);
		}
	};

	const status = data?.idDocument?.status || 'none';

	if (loading) {
		return <div className="h-40 animate-pulse rounded-2xl border border-primary/10 bg-surface" />;
	}

	// ── APPROVED ──
	if (data?.verified && status === 'approved') {
		return (
			<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-success/30 bg-success/5 p-6">
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15">
						<BadgeCheck className="h-6 w-6 text-success" />
					</div>
					<div>
						<p className="font-serif text-lg font-bold text-text">{COPY[role].verifiedTitle}</p>
						<p className="text-xs text-muted">{COPY[role].verifiedSub}</p>
					</div>
				</div>
			</motion.div>
		);
	}

	// ── PENDING ──
	if (status === 'pending') {
		return (
			<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-highlight/30 bg-highlight/5 p-6">
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-highlight/15">
						<Clock className="h-6 w-6 text-highlight" />
					</div>
					<div>
						<p className="font-serif text-lg font-bold text-text">Verification under review</p>
						<p className="text-xs text-muted">We're checking your {data.idDocument.documentType}. This usually takes 24–48 hours.</p>
					</div>
				</div>
			</motion.div>
		);
	}

	// ── NONE / REJECTED → upload form ──
	const rejected = status === 'rejected';
	return (
		<motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-primary/10 bg-surface p-6">
			<div className="flex items-center gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
					<IdCard className="h-6 w-6 text-primary-ink" />
				</div>
				<div>
					<p className="font-serif text-lg font-bold text-text">Get verified</p>
					<p className="text-xs text-muted">
						Upload a {role === 'landlord' ? 'government' : 'government or student'} ID to earn your verified badge.
					</p>
				</div>
			</div>

			{!user?.profilePicture && (
				<div className="mt-4 flex items-start gap-2 rounded-xl border border-highlight/40 bg-highlight/10 p-3">
					<Camera className="mt-0.5 h-4 w-4 shrink-0 text-highlight" />
					<div>
						<p className="text-xs font-bold text-highlight">Add a profile photo first</p>
						<p className="text-xs text-muted">Tap your avatar at the top of the page. We compare it with your ID to confirm it's really you.</p>
					</div>
				</div>
			)}

			{rejected && (
				<div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3">
					<ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
					<div>
						<p className="text-xs font-bold text-danger-ink">Your last submission was rejected</p>
						<p className="text-xs text-muted">{data.idDocument.rejectionReason || 'Please upload a clearer document.'}</p>
					</div>
				</div>
			)}

			<div className="mt-5">
				<label className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted">Document type</label>
				<div className="flex flex-wrap gap-2">
					{DOC_TYPES[role].map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => setDocType(t)}
							className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
								docType === t ? 'border-primary bg-primary/15 text-primary-ink' : 'border-muted/15 text-muted hover:border-primary/40'
							}`}
						>
							{t}
						</button>
					))}
				</div>
			</div>

			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<FilePick label="Front of ID *" file={front} onPick={() => frontRef.current?.click()} onClear={() => setFront(null)} inputRef={frontRef} onChange={setFront} />
				<FilePick label="Back (optional)" file={back} onPick={() => backRef.current?.click()} onClear={() => setBack(null)} inputRef={backRef} onChange={setBack} />
			</div>

			<button
				onClick={handleSubmit}
				disabled={submitting || !user?.profilePicture}
				className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-base shadow-lg shadow-primary/20 transition hover:shadow-xl disabled:opacity-60"
			>
				{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
				{rejected ? 'Re-submit for review' : 'Submit for verification'}
			</button>
			<p className="mt-2 text-center text-[11px] text-muted">Your ID is only used to confirm your identity and is reviewed by an admin.</p>
		</motion.div>
	);
}

function FilePick({ label, file, onPick, onClear, inputRef, onChange }) {
	return (
		<div>
			<p className="mb-1.5 text-xs font-semibold text-muted">{label}</p>
			<input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
			{file ? (
				<div className="flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5">
					<span className="truncate text-xs text-text">{file.name}</span>
					<button onClick={onClear} className="text-muted hover:text-danger-ink"><X className="h-4 w-4" /></button>
				</div>
			) : (
				<button type="button" onClick={onPick} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-muted/30 py-2.5 text-xs text-muted transition hover:border-primary/50 hover:text-primary-ink">
					<UploadCloud className="h-4 w-4" /> Choose image
				</button>
			)}
		</div>
	);
}
