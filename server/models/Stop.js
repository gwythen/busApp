// Physical Stop Model
 
var mongoose = require('mongoose')
   ,Schema = mongoose.Schema;
 
var stopSchema = new Schema({
    stopName: String,
    longitude: Number,
    latitude: Number,
    originalId: Number,
    logicalId: Number,
    localityCode: String,
    operatorId: Number,
    operatorName: String
});

module.exports = mongoose.model('Stop', stopSchema);