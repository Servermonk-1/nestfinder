/**
 * Step definitions for the coach-mark onboarding tour.
 * `target` must match an element id present in the DOM while that tour is active.
 * `placement` controls which side of the target the tooltip renders on.
 */

export const STUDENT_TOUR_STEPS = [
	{
		target: '#tour-search-input',
		title: 'Search Homes',
		description: 'Type anything — an area, a city, or the kind of room. Example: "self contained Bodija" or "quiet room Agbowo".',
		placement: 'bottom',
	},
	{
		target: '#tour-filters',
		title: 'Filter Your Search',
		description: 'Narrow results by price range, room type, and amenities like electricity, water, and security.',
		placement: 'right',
	},
	{
		target: '#tour-compare-btn',
		title: 'Compare Listings',
		description: 'Found a place you like? Tap "+ Compare" to add it to your comparison. You can compare up to 3 listings at once.',
		placement: 'top',
	},
	{
		target: '#tour-compare-bar',
		title: 'Your Selected Listings',
		description: 'Listings you mark for comparison appear here. When you have 2 or more selected, tap "Compare Now" to see them side by side.',
		placement: 'top',
		demo: true,
	},
	{
		target: '#tour-first-card',
		title: 'View Full Listing',
		description: 'Click any listing card to see photos, full address, all amenities, and landlord contact info.',
		placement: 'left',
	},
	{
		target: '#tour-first-card',
		title: 'Stay Safe',
		description: 'If a listing looks suspicious, fake, or has wrong information — open it and click "Report this listing." Our admin team reviews reports within 24 hours.',
		placement: 'left',
	},
	{
		target: '#tour-user-profile',
		title: 'Your Account',
		description: 'Click here to access your profile, manage saved listings, and sign out. Need help anytime? Click the "?" button to restart this tour.',
		placement: 'bottom',
	},
];

export const LANDLORD_TOUR_STEPS = [
	{
		target: '#tour-add-listing',
		title: 'Post Your Property',
		description: 'Click here to add a new accommodation listing. You can upload photos, set your price, and list all amenities.',
		placement: 'bottom',
	},
	{
		target: '#tour-listings-table',
		title: 'Manage Your Listings',
		description: 'All your posted properties appear here. Edit details, update availability, or delete listings you no longer offer.',
		placement: 'top',
	},
	{
		target: '#tour-availability',
		title: 'Update Availability',
		description: 'Mark a property as available or unavailable instantly. Students only see available listings when searching.',
		placement: 'left',
	},
	{
		target: '#tour-stats',
		title: 'Your Dashboard Stats',
		description: 'See how many listings you have posted, how many are active, and how many are currently unavailable.',
		placement: 'bottom',
	},
	{
		target: '#tour-verified',
		title: 'Get Verified',
		description: 'Verified landlords appear higher in search results and get a trust badge on all their listings. Admin reviews requests within 48 hours.',
		placement: 'top',
	},
];
