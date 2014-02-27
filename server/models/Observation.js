// Observation Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var observationSchema = new Schema({
    depStop: {
        type: Schema.Types.ObjectId,
        ref: 'Stop'
    },
    arrStop: {
        type: Schema.Types.ObjectId,
        ref: 'Stop'
    },
    line: {
        type: Schema.Types.ObjectId,
        ref: 'Stop'
    },
    realDepTime: Date,
    depHour: Number,
    depMinutes: Number
});

module.exports = mongoose.model('Observation', observationSchema);