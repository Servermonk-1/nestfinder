import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Activity, AlertTriangle, RefreshCw, CheckCircle2, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';

const uptime = (s) => {
	if (!s) return '—';
	const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
	return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};

/**
 * What has actually gone wrong lately.
 *
 * The server records every 5xx with the route, method and user that hit it.
 * Without a screen those records sit in a file nobody opens — which is the same
 * as not recording them at all.
 */
export default function SystemHealth() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);

	const load = useCallback((quiet = false) => {
		if (!quiet) setLoading(true);
		api.get('/admin/health')
			.then(({ data }) => setData(data))
			.catch(() => toast.error('Could not load system health'))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
		// Refresh quietly so an admin watching the page sees a fault appear.
		const t = setInterval(() => load(true), 30000);
		return () => clearInterval(t);
	}, [load]);

	const stats = data?.stats || {};
	const healthy = (stats.lastHour || 0) === 0;

	return (
		<AdminNavbar>
			<div className="mx-auto max-w-5xl px-4 pb-16 pt-10 sm:px-6">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-serif text-3xl font-extrabold">System health</h1>
						<p className="mt-1 text-sm text-muted">
							Server errors from this process. Secrets are stripped before anything is recorded.
						</p>
					</div>
					<button
						onClick={() => load()}
						className="inline-flex items-center gap-2 border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary-ink"
					>
						<RefreshCw className="h-4 w-4" strokeWidth={1.75} /> Refresh
					</button>
				</div>

				{loading && !data ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : (
					<>
						<div className="mb-6 grid gap-3 sm:grid-cols-4">
							<Stat
								label="Last hour"
								value={stats.lastHour ?? 0}
								tone={healthy ? 'good' : 'bad'}
								icon={healthy ? CheckCircle2 : AlertTriangle}
							/>
							<Stat label="Last 24 hours" value={stats.last24h ?? 0} />
							<Stat label="Uptime" value={uptime(data?.uptimeSeconds)} />
							<Stat label="Environment" value={data?.env || '—'} />
						</div>

						{!stats.sentry && (
							<p className="mb-6 flex items-start gap-2 border border-line bg-surface-alt/60 p-4 text-xs text-muted">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
								Errors are recorded here and to <span className="font-mono">server/logs/errors.jsonl</span>.
								Adding <span className="font-mono">SENTRY_DSN</span> also forwards them off the box, which
								matters once the process restarts — this list lives in memory.
							</p>
						)}

						<h2 className="label-meta mb-3">Recent errors</h2>

						{!data?.errors?.length ? (
							<div className="border border-line bg-surface p-10 text-center">
								<Activity className="mx-auto mb-3 h-8 w-8 text-success-ink" />
								<p className="font-serif text-xl font-bold">Nothing has failed</p>
								<p className="mt-1 text-sm text-muted">No server errors recorded since this process started.</p>
							</div>
						) : (
							<div className="space-y-2">
								{data.errors.map((e, i) => (
									<motion.div
										key={`${e.at}-${i}`}
										initial={{ opacity: 0, y: 6 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ delay: Math.min(i * 0.02, 0.2) }}
										className="border border-line bg-surface p-4"
									>
										<div className="flex flex-wrap items-baseline justify-between gap-2">
											<span className="font-semibold text-danger-ink">{e.message}</span>
											<span className="font-mono text-xs text-muted">
												{formatDistanceToNow(new Date(e.at), { addSuffix: true })}
											</span>
										</div>
										<p className="mt-1 flex flex-wrap gap-3 font-mono text-xs text-muted">
											{e.method && <span>{e.method} {e.route}</span>}
											{e.role && <span>{e.role}</span>}
											{e.kind && <span>{e.kind}</span>}
										</p>
										{e.stack && (
											<details className="mt-2">
												<summary className="cursor-pointer text-xs font-semibold text-muted hover:text-text">
													Stack trace
												</summary>
												<pre className="mt-2 overflow-x-auto bg-surface-alt p-3 font-mono text-[13px] leading-relaxed text-muted">
													{e.stack}
												</pre>
											</details>
										)}
									</motion.div>
								))}
							</div>
						)}
					</>
				)}
			</div>
		</AdminNavbar>
	);
}

function Stat({ label, value, tone, icon: Icon }) {
	const toneClass = tone === 'bad' ? 'text-danger-ink' : tone === 'good' ? 'text-success-ink' : 'text-ink';
	return (
		<div className="border border-line bg-surface p-4">
			<p className="label-meta flex items-center gap-1.5">
				{Icon && <Icon className={`h-3.5 w-3.5 ${toneClass}`} strokeWidth={1.75} />} {label}
			</p>
			<p className={`mt-1 font-serif text-2xl font-bold capitalize tabular-nums font-mono ${toneClass}`}>{value}</p>
		</div>
	);
}
