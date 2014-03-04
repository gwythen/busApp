// Itinerary Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var itinerarySchema = new Schema({
    stopOrder: [{
		type: Schema.Types.ObjectId,
		ref: 'Stop'
	}],
	rides: [{
		type: Schema.Types.ObjectId,
		ref: 'Ride'
	}]
});

module.exports = mongoose.model('Itinerary', itinerarySchema);