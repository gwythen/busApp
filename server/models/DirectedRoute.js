// Directed Route Model
 
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
 
var directedRouteSchema = new Schema({
	direction: String,
	directionDisplay: String,
	originalDirectionId: Number,
	lineName: String,
	lineOriginalId: Number,
	allStops: [{
		type: Schema.Types.ObjectId,
		ref: 'Stop'
	}],
	itineraries: [{
		type: Schema.Types.ObjectId,
		ref: 'Itinerary'
	}]
});

module.exports = mongoose.model('DirectedRoute', directedRouteSchema);