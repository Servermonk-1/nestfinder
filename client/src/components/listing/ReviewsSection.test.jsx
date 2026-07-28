import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the network layer and auth so we can drive the UI with controlled data.
vi.mock('../../services/api', () => ({
	default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../context/AuthContext', () => ({
	useAuth: () => ({ user: { id: 'u1', role: 'student' } }),
}));

import api from '../../services/api';
import ReviewsSection from './ReviewsSection';

const base = { reviews: [], myReview: null, totalReviews: 0, averageRating: 0, canReview: false, page: 1, pages: 1 };

describe('ReviewsSection gating UI', () => {
	beforeEach(() => vi.clearAllMocks());

	it('shows a "contact the landlord first" hint when the student cannot review', async () => {
		api.get.mockResolvedValue({ data: { ...base, canReview: false } });
		render(<ReviewsSection listingId="L1" />);
		expect(await screen.findByText(/contacted this home's landlord/i)).toBeInTheDocument();
		expect(screen.queryByText(/write a review/i)).not.toBeInTheDocument();
	});

	it('shows the "Write a Review" button when the student is eligible', async () => {
		api.get.mockResolvedValue({ data: { ...base, canReview: true } });
		render(<ReviewsSection listingId="L1" />);
		expect(await screen.findByText(/write a review/i)).toBeInTheDocument();
	});

	it("shows the student's own review with edit and delete controls", async () => {
		api.get.mockResolvedValue({
			data: {
				...base, totalReviews: 1,
				myReview: { _id: 'r1', rating: 5, comment: 'nice', createdAt: new Date().toISOString(), edited: false, reviewer: 'Aisha B.', reviewerVerified: true, mine: true },
			},
		});
		render(<ReviewsSection listingId="L1" />);
		expect(await screen.findByText('Edit')).toBeInTheDocument();
		expect(screen.getByText('Delete')).toBeInTheDocument();
		expect(screen.getByText('Aisha B.')).toBeInTheDocument();
	});
});
