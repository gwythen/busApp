// Line Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var lineSchema = new Schema({
    lineOriginalId: Number,
    name: String,
    directedRoutes:[{
    	direction: String,
    	originalDirectionId: Number,
    	allStops: [{
    		type: Schema.Types.ObjectId,
        	ref: 'Stop'
    	}],
    	itineraries: [{
    		stopOrder: [{
	    		type: Schema.Types.ObjectId,
	        	ref: 'Stop'
	    	}],
	    	rides: [{
			    originalRideDailyNumber: Number,
			    schedules: [{
			        depHour: Number,
				    depMinutes: Number,
				    stop: {
				    	type: Schema.Types.ObjectId,
	        			ref: 'Stop'
				    }
			    }],
	    	}]
    	}]

    }]
});

module.exports = mongoose.model('Line', lineSchema);