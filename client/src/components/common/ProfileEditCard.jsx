import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserRound, Phone, Building2, Mail, GraduationCap } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfileEditCard() {
	const { user, updateUser } = useAuth();
	const isStudent = user?.role === 'student';

	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({ fullName: '', phone: '', institution: '', department: '' });

	useEffect(() => {
		api.get('/profile/me')
			.then(({ data }) => setForm({
				fullName: data.user.fullName || '',
				phone: data.user.phone || '',
				institution: data.user.institution || '',
				department: data.user.department || '',
			}))
			.catch(() => { /* fall back to whatever the header already shows */ })
			.finally(() => setLoading(false));
	}, []);

	const save = async (e) => {
		e.preventDefault();
		if (!form.fullName.trim()) { toast.error('Name is required'); return; }
		if (!form.phone.trim()) { toast.error('Phone number is required'); return; }
		if (isStudent && !form.institution.trim()) { toast.error('Institution is required'); return; }
		setSaving(true);
		try {
			const payload = { fullName: form.fullName.trim(), phone: form.phone.trim() };
			if (isStudent) payload.institution = form.institution.trim();
			// Optional — blank means "not said yet", which is valid.
			if (isStudent) payload.department = form.department.trim();
			const { data } = await api.patch('/profile', payload);
			updateUser({ fullName: data.user.fullName }); // keep navbar/header name in sync
			toast.success('Profile updated');
			setOpen(false);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not update profile');
		} finally {
			setSaving(false);
		}
	};

	const field = (icon, label, value) => {
		const Icon = icon;
		return (
			<div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
				<Icon className="h-4 w-4 shrink-0 text-primary-ink" />
				<div className="min-w-0">
					<p className="text-[12px] font-bold uppercase tracking-wide text-muted">{label}</p>
					<p className="truncate text-sm text-text">{value || '—'}</p>
				</div>
			</div>
		);
	};

	const input = (icon, value, onChange, placeholder) => {
		const Icon = icon;
		return (
			<div className="group relative">
				<Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
				<input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full rounded-xl border border-line bg-surface-alt py-3 pl-11 pr-4 text-sm text-text outline-none transition focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20"
				/>
			</div>
		);
	};

	return (
		<div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<UserRound className="h-5 w-5 text-primary-ink" />
					</div>
					<div>
						<p className="font-serif text-base font-bold text-text">Profile details</p>
						<p className="text-xs text-muted">Your name, phone{isStudent ? ', institution and department' : ''}.</p>
					</div>
				</div>
				{!open && (
					<button
						onClick={() => setOpen(true)}
						className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm font-bold text-primary-ink transition hover:border-primary/40 hover:bg-primary/5"
					>
						Edit
					</button>
				)}
			</div>

			{open ? (
				<motion.form initial={{ opacity: 0 }} animate={{ opacity: 1 }} onSubmit={save} className="mt-5 space-y-3">
					{input(UserRound, form.fullName, (v) => setForm((f) => ({ ...f, fullName: v })), 'Full name')}
					{input(Phone, form.phone, (v) => setForm((f) => ({ ...f, phone: v })), 'Phone number')}
					{isStudent && input(Building2, form.institution, (v) => setForm((f) => ({ ...f, institution: v })), 'Institution')}
					{isStudent && input(GraduationCap, form.department, (v) => setForm((f) => ({ ...f, department: v })), 'Department (e.g. Computer Science)')}
					<p className="flex items-center gap-2 text-[13px] text-muted">
						<Mail className="h-3 w-3" /> Your email ({user?.email}) can't be changed here.
					</p>
					<div className="flex gap-2 pt-1">
						<button type="submit" disabled={saving} className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-60">
							{saving ? 'Saving…' : 'Save changes'}
						</button>
						<button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text">
							Cancel
						</button>
					</div>
				</motion.form>
			) : (
				<div className="mt-5 grid gap-3 sm:grid-cols-2">
					{field(UserRound, 'Name', loading ? '' : form.fullName)}
					{field(Phone, 'Phone', loading ? '' : form.phone)}
					{isStudent && field(Building2, 'Institution', loading ? '' : form.institution)}
					{isStudent && field(GraduationCap, 'Department', loading ? '' : (form.department || 'Not set — add it to match companies'))}
				</div>
			)}
		</div>
	);
}
