/**
 * How each booking state should be described and coloured.
 *
 * Centralised because the same booking appears on the student's page, the
 * landlord's page and the admin's — and a status that reads one way to a
 * student and another to a landlord would be a very expensive kind of
 * inconsistency.
 */
export const STATUS_META = {
	pending: {
		label: 'Awaiting landlord',
		tone: 'muted',
		student: 'Your application has been sent. The landlord will respond.',
		landlord: 'A student has applied. Accept or decline.',
	},
	accepted: {
		label: 'Accepted — payment due',
		tone: 'primary',
		student: 'Accepted. Pay to secure the room — your money is held safely until you move in.',
		landlord: "You accepted. Waiting for the student's payment.",
	},
	declined: {
		label: 'Declined',
		tone: 'danger',
		student: 'The landlord declined this application.',
		landlord: 'You declined this application.',
	},
	cancelled: {
		label: 'Withdrawn',
		tone: 'muted',
		student: 'You withdrew this application.',
		landlord: 'The student withdrew this application.',
	},
	paid: {
		label: 'Paid — held in escrow',
		tone: 'success',
		student: "Paid. We're holding your money until you confirm you've moved in.",
		landlord: 'The student has paid. NestFinder is holding the money until they confirm move-in.',
	},
	movedIn: {
		label: 'Moved in',
		tone: 'success',
		student: 'You confirmed your move-in and the landlord has been paid.',
		landlord: 'The student confirmed move-in — your payout has been released.',
	},
	completed: {
		label: 'Completed',
		tone: 'success',
		student: 'This tenancy has ended.',
		landlord: 'This tenancy has ended.',
	},
	refunded: {
		label: 'Refunded',
		tone: 'danger',
		student: 'This booking was refunded to you.',
		landlord: 'This booking was refunded to the student.',
	},
};

export const TONE_CLASS = {
	muted: 'bg-surface-alt text-muted',
	primary: 'bg-primary/12 text-primary-ink',
	success: 'bg-success/12 text-success-ink',
	danger: 'bg-danger/12 text-danger-ink',
};

export const statusMeta = (status) => STATUS_META[status] || { label: status, tone: 'muted' };
