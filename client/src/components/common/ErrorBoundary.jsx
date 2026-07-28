import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Catches render-time errors anywhere below it and shows a friendly fallback
 * instead of a blank white screen. Must be a class component — React only
 * supports error boundaries via getDerivedStateFromError / componentDidCatch.
 */
export default class ErrorBoundary extends Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError() {
		return { hasError: true };
	}

	componentDidCatch(error, info) {
		// Surface for debugging; a production deployment would ship this to a logger.
		console.error('Uncaught render error:', error, info?.componentStack);
	}

	render() {
		if (!this.state.hasError) return this.props.children;

		return (
			<div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 text-center text-text">
				<div className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-card-lg">
					<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
						<AlertTriangle className="h-8 w-8 text-danger-ink" />
					</div>
					<h1 className="font-serif text-2xl font-extrabold">Something went wrong</h1>
					<p className="mt-2 text-sm text-muted">
						An unexpected error interrupted this page. Reloading usually sorts it out.
					</p>
					<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
						<button
							onClick={() => window.location.reload()}
							className="rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
						>
							Reload page
						</button>
						<button
							onClick={() => window.location.assign('/')}
							className="rounded-xl border border-line px-5 py-3 text-sm font-bold text-muted transition hover:border-primary/40 hover:text-text"
						>
							Go to homepage
						</button>
					</div>
				</div>
			</div>
		);
	}
}
