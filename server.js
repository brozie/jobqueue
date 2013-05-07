/*
  CLUSTER SERVER SOURCE
*/

"use strict";

var config = require("config"),
	cluster = require("cluster"),
	_ = require("underscore"),
	AMQPStats = require("amqp-stats"),
	Logger = require("basic-logger"),
	log = new Logger( config.logger ),
	Syslog = require( "node-syslog" ),
	util = require("util"),
	Worker = require("./worker"),
	exiting = false,
	workers = {};


Logger.setLevel(config.logger.level, true);

// Syslog
Syslog.init(config.logger.prefix, Syslog.LOG_PID | Syslog.LOG_ODELAY, Syslog.LOG_LOCAL0);

var SyslogLevels = {
	error: Syslog.LOG_ERROR,
	warning: Syslog.LOG_WARNING,
	info: Syslog.LOG_INFO,
	debug: Syslog.LOG_DEBUG,
	trace: Syslog.LOG_TRACE
};

var SyslogLevelOrder = [ "error", "warning", "info", "debug", "trace" ];

var oldLogFunction = log.log;
log.log = function(msg, levelName) {
	var args = Array.prototype.splice.call(arguments,2);
	if ( SyslogLevelOrder.indexOf(levelName) <= SyslogLevelOrder.indexOf(config.logger.level) ) {
		Syslog.log(SyslogLevels[levelName],util.inspect([msg].concat(args),false,2,false));
	}
	oldLogFunction.call(log,msg,levelName,args);
};


if (cluster.isMaster) {
	log.info("Cluster master started with pid", process.pid );

	var workerInit = function _workerInit(workerName) {
		var clusterWorker = cluster.fork({
			worker: workerName
		}).on("message",function(msg){
			if (msg && msg.uncaughtException) {
				workerInit( msg.name );
			}
		});

		workers[clusterWorker.id] = workerName;
	};

	cluster.on("exit",function(worker,code) {
		log.info("Worker",worker.process.pid,"exited.", _.size(cluster.workers),code);
		
		
		if (exiting) {
			if (_.size(cluster.workers) === 0) {
				log.info("All worker exited. Cluster terminating.");
				process.exit();
			}
		}
		else if (workers[worker.id] && code !== 3) {
			log.warn("Restarting worker",workers[worker.id]);
			workerInit(workers[worker.id]);
		}

		
		delete workers[worker.id];
	});

	process.on("SIGTERM",function() {
		log.info("Cluster exit signal");

		exiting = true;

		if (_.size(cluster.workers).length === 0) {
			return process.exit();
		}

		for(var id in cluster.workers) {
			cluster.workers[id].send("exitWorker");
		}
	});


	Object.keys(config.workers).forEach(function(worker){
		for(var i = 0; i < (config.workers[worker].min || 1); i++) {
			workerInit( worker );
		}
	});

	
	var stats = new AMQPStats({
		username: config.rabbitmq.login,
		password: config.rabbitmq.password,
		hostname: config.rabbitmq.host + ":" + config.rabbitmq.managementPort
	});

	var loadBalancer = function _loadBalancer() {
		stats.queues(function(err, res, data){
			if (err) { throw err; }
			
			log.debug("Statcheck");

			var queues = {};
			data.forEach(function(queue){
				queues[queue.name] = queue;
			});

			Object.keys(config.workers).forEach(function(workerName){
				if (config.workers[workerName].threshold) {
					var changeNum = 0;

					Object.keys(config.workers[workerName].threshold).forEach(function(thresholdQueueName){
						if ( config.workers[workerName].threshold[thresholdQueueName].count <= queues[ config.tasks[thresholdQueueName].queue ].messages_ready ) {
							if ( _.countBy(workers)[workerName] < config.workers[workerName].max ) {
								changeNum = 1;
							}
						}
						else if (queues[ config.tasks[thresholdQueueName].queue ].messages_ready === 0) {
							if ( _.countBy(workers)[workerName] > config.workers[workerName].min ) {
								if (!changeNum) {
									changeNum = -1;
								}
							}
						}
					});

					if (changeNum > 0) {
						workerInit( workerName );
					}
					else if (changeNum < 0) {
						for(var id in cluster.workers) {
							if ( workers[id] === workerName ) {
								delete workers[id];
								cluster.workers[id].send("exitWorker");
								break;
							}
						}
					}
				}
			});

			setTimeout(loadBalancer, config.loadBalancer.timeout);
		});
	};

	setTimeout(loadBalancer, config.loadBalancer.timeout);
}
else {
	log.info( "Starting worker with pid", cluster.worker.process.pid );

	cluster.worker.on("SIGTERM",function(){
		console.log("SIGTERM");
	});

	new Worker(cluster.worker.process.env.worker);
}
