import express from 'express';
import authRoutes from '../../routes/auth.js';
import reviewRoutes from '../../routes/reviews.js';

// A minimal Express app that mounts just the routes under test — avoids booting
// server.js (which starts Socket.IO and connects to the real Atlas DB).
export function makeApp() {
	const app = express();
	app.use(express.json());
	app.set('io', null);
	app.use('/api/auth', authRoutes);
	app.use('/api/reviews', reviewRoutes);
	return app;
}
