// Record Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var itinerarySchema = new Schema({
	date: Date,
    directedRoute: {
		type: Schema.Types.ObjectId,
		ref: 'DirectedRoute'
	},
	rides: [{
		type: Schema.Types.ObjectId,
		ref: 'Ride'
	}]
});

module.exports = mongoose.model('Record', itinerarySchema);