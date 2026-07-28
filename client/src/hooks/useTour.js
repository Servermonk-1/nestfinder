import { useState, useCallback } from 'react';
import api from '../services/api';

// The "already toured" flag is scoped PER USER, so a new account still gets the
// tour even if a different account already finished it in this same browser.
const tourKey = (user) => `nestfinder_tour_done_${user?.id || 'anon'}`;

/**
 * A first-login-ever, non-dismissible coach-mark tour has three phases:
 * welcome (intro card) -> active (spotlight walkthrough) -> completing (celebration screen).
 */
export function useTour(steps, user) {
	const [phase, setPhase] = useState('idle');
	const [stepIndex, setStepIndex] = useState(0);

	const start = useCallback(() => {
		setStepIndex(0);
		setPhase('welcome');
	}, []);

	const begin = useCallback(() => {
		setPhase('active');
	}, []);

	const next = useCallback(() => {
		setStepIndex((i) => {
			if (i + 1 >= steps.length) {
				setPhase('completing');
				return i;
			}
			return i + 1;
		});
	}, [steps.length]);

	const prev = useCallback(() => {
		setStepIndex((i) => Math.max(0, i - 1));
	}, []);

	const finish = useCallback(() => {
		setPhase('idle');
		localStorage.setItem(tourKey(user), 'true');
		api.patch('/auth/tour-complete').catch(() => {
			/* localStorage flag is authoritative on this device even if the sync fails */
		});
	}, [user]);

	const skip = useCallback(() => {
		finish();
	}, [finish]);

	return {
		phase,
		stepIndex,
		totalSteps: steps.length,
		currentStep: steps[stepIndex],
		start,
		begin,
		next,
		prev,
		finish,
		skip,
	};
}

/** Should the tour auto-start for this user? Checks the fast local flag first, then the account. */
export function shouldStartTour(user) {
	// Wait until we actually know who the user is before deciding.
	if (!user?.id) return false;

	if (localStorage.getItem(tourKey(user)) === 'true') return false;

	if (user.tourCompleted) {
		localStorage.setItem(tourKey(user), 'true');
		return false;
	}

	return true;
}
