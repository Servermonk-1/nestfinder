import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AdminLogin() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [formData, setFormData] = useState({ email: '', password: '' });
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState({});

	const handleSubmit = async (e) => {
		e.preventDefault();
		const newErrors = {};
		if (!formData.email) newErrors.email = 'Email is required';
		if (!formData.password) newErrors.password = 'Password is required';
		if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
		setLoading(true);
		try {
			const { data } = await api.post('/auth/admin/login', formData);
			login(data.user, data.token);
			toast.success(`Welcome, ${data.user.fullName}`);
			navigate('/admin/dashboard');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Invalid credentials');
		} finally { setLoading(false); }
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-paper via-surface-alt to-paper flex items-center justify-center p-4">

			{/* Animated background blobs */}
			<motion.div
				animate={{ scale: [1, 1.3, 1], rotate: [0, 60, 0] }}
				transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute top-[-150px] right-[-150px] w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl"
			/>
			<motion.div
				animate={{ scale: [1.2, 1, 1.2], rotate: [40, 0, 40] }}
				transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
				className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-danger/10 rounded-full blur-3xl"
			/>

			<motion.div
				initial={{ opacity: 0, y: 30 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: 'easeOut' }}
				className="relative w-full max-w-md"
			>
				{/* Card */}
				<div className="rounded-3xl border border-line bg-surface p-10 shadow-card-lg">

					{/* Shield icon */}
					<div className="flex flex-col items-center mb-8">
						<motion.div
							animate={{ y: [0, -8, 0] }}
							transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
							className="w-16 h-16 bg-brand-gradient rounded-2xl flex items-center justify-center shadow-glow mb-4"
						>
							<Shield className="w-8 h-8 text-white" />
						</motion.div>
						<h1 className="font-serif text-2xl font-semibold text-text mb-1">Admin Portal</h1>
						<p className="text-muted text-sm text-center">
							Restricted access — authorized personnel only
						</p>
					</div>

					{/* Divider */}
					<div className="h-px bg-line mb-8" />

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-4">

						{/* Email */}
						<div>
							<label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
								Admin Email
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
								<input
									type="email"
									placeholder="admin@nestfinder.com"
									value={formData.email}
									onChange={e => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
									className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200
                    bg-surface-alt border-2 text-text placeholder-muted/50
                    ${errors.email ? 'border-danger/70 bg-danger/10' : 'border-line focus:border-primary focus:bg-surface'}`}
								/>
							</div>
							{errors.email && <p className="text-danger-ink text-xs mt-1 font-medium">{errors.email}</p>}
						</div>

						{/* Password */}
						<div>
							<label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
								Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
								<input
									type={showPassword ? 'text' : 'password'}
									placeholder="Enter admin password"
									value={formData.password}
									onChange={e => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
									className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all duration-200
                    bg-surface-alt border-2 text-text placeholder-muted/50
                    ${errors.password ? 'border-danger/70 bg-danger/10' : 'border-line focus:border-primary focus:bg-surface'}`}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary-ink transition-colors"
								>
									<AnimatePresence mode="wait">
										<motion.div
											key={showPassword ? 'hide' : 'show'}
											initial={{ opacity: 0, rotate: -90 }}
											animate={{ opacity: 1, rotate: 0 }}
											exit={{ opacity: 0, rotate: 90 }}
											transition={{ duration: 0.15 }}
										>
											{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
										</motion.div>
									</AnimatePresence>
								</button>
							</div>
							{errors.password && <p className="text-danger-ink text-xs mt-1 font-medium">{errors.password}</p>}
						</div>

						{/* Submit */}
						<motion.button
							type="submit"
							disabled={loading}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							className="w-full py-3.5 bg-brand-gradient text-white font-bold rounded-xl shadow-glow-sm hover:shadow-glow transition-all text-sm tracking-widest uppercase mt-2 disabled:opacity-70"
						>
							{loading
								? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
								: 'Access Dashboard'
							}
						</motion.button>
					</form>

					{/* Footer */}
					<div className="mt-8 pt-6 border-t border-line text-center">
						<p className="text-muted text-xs">
							NestFinder Admin Panel — Abiola Ajimobi Technical University
						</p>
					</div>
				</div>
			</motion.div>
		</div>
	);
}

