// Ride Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var rideSchema = new Schema({
    directedRoute: {
            type: Schema.Types.ObjectId,
            ref: 'DirectedRoute'
    },
    schedules: [{
        scheduleTime: Date,
        stop: {
            type: Schema.Types.ObjectId,
            ref: 'Stop'
        }
    }]
});

module.exports = mongoose.model('Ride', rideSchema);