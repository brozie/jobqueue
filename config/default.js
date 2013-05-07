module.exports = {
	logger: {
		showMillis: true,
		showTimestamp: true,
		prefix: "jobqueue",
		level: "debug"
	},
	tasks: {
		task1: {
			queue: "task1",
			module: "task1",
			attempt: 3,
			requeueTimeout: 10000
		},
		task2: {
			queue: "task2",
			module: "task2",
			attempt: 10,
			requeueTimeout: 12000
		}
	}
};