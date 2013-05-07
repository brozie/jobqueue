/* WORKER SOURCE */

"use strict";

Error.stackTraceLimit = Infinity;

var config = require("config"),
	cluster = require("cluster"),
	async = require("async"),
	Logger = require("basic-logger"),
	amqp = require("amqp"),
	//mongodb = require("mongodb"),
	//mysql = require("mysql"),
	_ = require("underscore"),
	Syslog = require( "node-syslog" ),
	util = require("util"),
	activeTasks = 0,
	exiting = false,
	exitCode = 0;

var Worker = function _Worker(name) {
	if (!name) {
		throw new Error("Can't start worker without name");
	}

	var worker = this;

	worker.name = name;
	worker.logger = new Logger( _.extend( _.clone(config.logger), { prefix: config.logger.prefix + " " + name + "(" + cluster.worker.process.pid + ")" } ));


	//setting syslog logging
	Syslog.init(config.logger.prefix, Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_LOCAL0);

	var SyslogLevels = {
		error: Syslog.LOG_ERROR,
		warning: Syslog.LOG_WARNING,
		info: Syslog.LOG_INFO,
		debug: Syslog.LOG_DEBUG,
		trace: Syslog.LOG_TRACE
	};

	var SyslogLevelOrder = [ "error", "warning", "info", "debug", "trace" ];

	var oldLogFunction = worker.logger.log;
	worker.logger.log = function(msg, levelName) {
		var args = Array.prototype.splice.call(arguments,2);
		if ( SyslogLevelOrder.indexOf(levelName) <= SyslogLevelOrder.indexOf(config.logger.level) ) {
			Syslog.log(SyslogLevels[levelName],util.inspect([msg].concat(args),false,2,false));
		}
		oldLogFunction.call(worker.logger,msg,levelName,args);
	};



	//initializing
	worker.initialize(function(err){
		if (err) {
			worker.logger.error("initialize error",err);
		}

		worker.amqpConnection.on("ready", function() {
			//start all tasks
			Object.keys(config.workers[worker.name].tasks).forEach(function(taskName) {

				var task = _.extend( _.clone( config.tasks[taskName] ), _.clone( config.workers[worker.name].tasks[taskName] ) );

				if (task.attempt) {
					worker.amqpConnection.queue(
						(task.queue || task.name) + "_rq",
						{
							autoDelete: false,
							durable: true,
							arguments: {
								"x-dead-letter-exchange": "requeue",
								"x-dead-letter-routing-key": (task.queue || task.name),
								"x-message-ttl": task.requeueTimeout || 10000
							}
						},
						function(queue) {
							queue.bind( "requeue", (task.queue || task.name) + "_rq" );
						}
					);
				}

				worker.amqpConnection.queue(
					task.queue || task.name, //queue name
					{
						autoDelete: false,
						durable: true,
						arguments: {
							"x-dead-letter-exchange": "requeue",
							"x-dead-letter-routing-key": (task.queue || task.name) + "_rq"
						}
					},
					function(queue) {
						queue.bind( "requeue", (task.queue || task.name) );

						worker.logger.info("Start listening on",queue.name,"queue via",task.parallel || 1, "threads.");

						queue.subscribe(
							{
								ack: true,
								prefetchCount: task.parallel || 1
							},
							function(job, headers, deliveryInfo, message) {
								if (exiting) {
									cluster.worker.emit("joined");
									return;
								}

								activeTasks++;
								

								//load task source
								var taskModule = require("./tasks/"+ (task.module || task.name) );

								//start worker with callback
								taskModule(job,
									{
										mysqlReadConnection: worker.mysqlReadConnection,
										mysqlWriteConnection: worker.mysqlWriteConnection,
										amqpConnection: worker.amqpConnection,
										mongodbConnection: worker.mongodbConnection,
										logger: worker.logger
									},
									function(err) {
										if (err) {
											worker.logger.error(err);
											
											worker.amqpConnection.exchange(
												( (message.headers ? message.headers.attempt : null) || 0) >= (task.attempt || 0) ? "graveyard" : "requeue",
												{
													confirm: true,
													comfirm: true,
													durable: true
												},
												function(exchange) {
													exchange.publish(
														queue.name +"_rq",
														job,
														{
															contentType: "application/json",
															mandatory: true,
															deliveryMode: 2,
															headers: {
																attempt: ((message.headers ? message.headers.attempt : null) || 0) + 1,
																originalQueue: queue.name
															}
														},
														function() {
															message.acknowledge();
															activeTasks--;
														}
													);
												}
											);
										}
										else {
											message.acknowledge();
											activeTasks--;
										}
									}
								);
							}
						);
					}
				);
			});
		});
	});
};

Worker.prototype = {
	initialize: function _initialize(cb) {
		var worker = this;

		worker.logger.debug("Initializing worker");
		
		cluster.worker.on("message",function(msg) {
			if (msg === "exitWorker") {
				worker.logger.debug("Exit signal. Currently active tasks:", activeTasks);
				exiting = true;
				cluster.worker.emit("joined");

				setTimeout(function(){
					try {
						cluster.worker.destroy();
					} catch(e) {}
				},60000);
			}
		});

		cluster.worker.on("joined",function() {
			worker.logger.debug("Task ended on worker. Currently active tasks:",activeTasks);
			if (activeTasks === 0) {
				cluster.worker.process.exit(exitCode);
			}
		});

		cluster.worker.process.on("uncaughtException",function(err){
			worker.logger.error( err, err.stack || new Error().stack );
			
			activeTasks--;
			
			if (!exiting) {
				cluster.worker.send({
					uncaughtException: true,
					name: worker.name
				});
				exitCode = 3;
				cluster.worker.emit("message","exitWorker");
			}
			
			setTimeout(function(){
				cluster.worker.process.exit(3);
			},10000);
		});


		
		_.extend(worker,{
			/*mysqlReadConnection: mysql.createConnection(config.mysqlRead),
			mysqlWriteConnection: mysql.createConnection(config.mysqlWrite),
			mongodbConnection: new mongodb.Db(
				config.mongodb.database,
				new mongodb.Server(config.mongodb.host,config.mongodb.port),
				{safe: true}
			),*/
			amqpConnection: amqp.createConnection(config.rabbitmq)
		});

		
		async.parallel(
			[
				/*
				worker.mysqlReadConnection.connect.bind( worker.mysqlReadConnection ),
				worker.mysqlReadConnection.connect.bind( worker.mysqlWriteConnection ),
				function(cb) {
					worker.mongodbConnection.open(function(err, client) {
						if (err) {
							return cb(err);
						}

						if (config.mongodb.user && config.mongodb.password) {
							return client.authenticate(config.mongodb.user, config.mongodb.password, cb);
						}
						
						return cb();
					});
				}*/
			],
			cb
		);
	},
	destroy: function _destroy() {
		var worker = this;

		worker.logger.info("Destroying worker");

		/*
		worker.mysqlReadConnection.destroy();
		worker.mysqlWriteConnection.destroy();
		worker.mongodbConnection.close();
		*/
		worker.amqpConnection.destroy();

		cluster.worker.process.exit();
	}
};

module.exports = Worker;
