"use strict";

/*

	Job parameters:
		{
			"test": 1
		}

*/

module.exports = function(job,shared,cb)
{
	var logger = shared.logger;
		//mongodbConnection = shared.mongodbConnection;

	if (!job || !job.test) {
		logger.warn("test1: InvalidJob",job);
		return cb(null, {
			name: "INVALIDJOB"
		});
	}

	logger.info("job started");
	setTimeout(function(){
		logger.info("job done");
		cb();
	},10000);
};