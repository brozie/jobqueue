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
		host: "",
		port: 5672,
		managementPort: 55672,
		login: "",
		password: ""
	},
	mongodb: {
		host: "",
		port: 27017,
		database: "",
		user: "",
		password: ""
	},
	workers: {
		worker1: {
			tasks: {
				task1: {
					parallel: 2
				}
			}
		},
		worker2: {
			tasks: {
				task2: {
					parallel: 5
				}
			},
			min: 2
		}
	}
};