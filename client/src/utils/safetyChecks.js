/**
 * Lightweight red-flag detection for chat messages.
 *
 * These are the patterns behind most SIWES accommodation scams: pressure to pay
 * before viewing, moving the conversation off-platform, or asking for money via
 * untraceable channels. We only WARN — we never block a message, because plenty
 * of legitimate conversations mention money.
 */
const RULES = [
	{
		id: 'upfront-payment',
		test: /\b(pay|send|transfer|deposit)\b[^.!?]{0,40}\b(before|first|now|today|immediately|to secure|to reserve|to hold)\b/i,
		warning: 'Someone is asking you to pay before viewing. Never send money for a place you haven\'t seen in person.',
	},
	{
		id: 'money-transfer',
		test: /\b(bank transfer|account number|acct no|send me (the )?money|western union|moniepoint|opay|palmpay|gift ?card|bitcoin|crypto|usdt)\b/i,
		warning: 'This mentions transferring money directly. Pay only after you\'ve viewed the property and met the landlord.',
	},
	{
		id: 'off-platform',
		test: /\b(whats ?app me|text me on|call me on|dm me|telegram|let'?s talk outside|off ?the ?app)\b/i,
		warning: 'Moving off NestFinder means we can\'t help if something goes wrong. Keep important details in this chat.',
	},
	{
		id: 'urgency',
		test: /\b(last (one|room|chance)|going fast|many people (are )?(asking|interested)|hurry|act now|only today|expires? (today|tonight))\b/i,
		warning: 'Pressure and urgency are common scam tactics. Take your time — a genuine landlord will let you view first.',
	},
	{
		id: 'no-viewing',
		test: /\b(can'?t (show|view)|no (viewing|inspection)|i'?m (abroad|out of the country|travelling)|send (an )?agent)\b/i,
		warning: 'They\'re avoiding an in-person viewing. Always see the property, and bring someone with you.',
	},
];

/** Returns the warnings triggered by a single message (usually none). */
export function detectRedFlags(text = '') {
	if (!text || text.length < 8) return [];
	return RULES.filter((r) => r.test.test(text)).map((r) => ({ id: r.id, warning: r.warning }));
}

/** Static safety guidance shown at the top of a conversation. */
export const SAFETY_TIPS = [
	'Always view the property in person before paying anything.',
	'Never send a deposit by bank transfer, gift card or crypto.',
	'Take someone with you, and tell a friend where you\'re going.',
	'Keep money talk in this chat — it\'s your record if something goes wrong.',
];
