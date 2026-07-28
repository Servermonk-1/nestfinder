import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		setupFiles: ['./tests/setup.js'],
		// First run may download the in-memory Mongo binary; give hooks room.
		hookTimeout: 120000,
		testTimeout: 20000,
		pool: 'forks', // mongoose behaves best outside worker threads
		// Each test file boots its own in-memory MongoDB. Starting several at once
		// can exceed mongod's startup window on a loaded machine, so run files
		// one at a time — slower, but deterministic.
		fileParallelism: false,
	},
});
