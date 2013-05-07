module.exports = {
	mysqlWrite: {
		host: "",
		user: "",
		password: "",
		database: "",
		debug: false
	},
	mysqlRead: {
		host: "",
		user: "",
		password: "",
		database: "",
		debug: false
	},
	rabbitmq: {
		host: "localhost",
		port: 5672,
		managementPort: 55672,
		login: "guest",
		password: "guest"
	},
	mongodb: {
		host: "",
		port: 27017,
		database: ""
	},
	workers: {
		worker1: {
			tasks: {
				task1: {
					parallel: 1
				}
			}
		},
		worker2: {
			tasks: {
				task2: {
					parallel: 2
				}
			},
			min: 1,
			max: 5,
			threshold: {
				task2: {
					count: 10
				}
			}
		}
	}
};

