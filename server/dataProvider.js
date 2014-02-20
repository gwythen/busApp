//var Db = require('mongodb').Db;
// var Connection = require('mongodb').Connection;
// var Server = require('mongodb').Server;
// var BSON = require('mongodb').BSON;
// var ObjectID = require('mongodb').ObjectID;
var stops = require('./Stops');
var stopsOrders = require('./StopOrders');

// DataProvider = function(host, port) {
//   // this.db= new Db('busdb', new Server(host, port, {safe: false}, {auto_reconnect: true}, {}));
//   // this.db.open(function(){});
// };

DataProvider = {};

// DataProvider.prototype.getStopsCollection = function(callback) {
//   this.db.collection('stops', function(error, stops_collection) {
//     if( error ) callback(error);
//     else callback(null, stops_collection);
//   });
// };

// //find all stops in db 
// DataProvider.prototype.findAllStops = function(callback) {
//     this.getPlacesCollection(function(error, stops_collection) {
//       if( error ) callback(error)
//       else {
//         stops_collection.find().toArray(function(error, results) {
//           if( error ) callback(error)
//           elsAe callback(null, results)
//         });
//       }
//     });
// };

DataProvider.getAllStops = function(callback) {
    callback(null, stops);
};

DataProvider.getStop = function(stopId, callback) {
  var found = null;
  for(var i = 0; i < stops.length; i++) {
    if(stops[i].originalId == stopId) {
       found = stops[i];
       break;
    }
  }
  if(found){
    callback(null, found);
  }
    
};

DataProvider.getAllStopOrders = function(callback) {
    callback(null, stopsOrders);
};

DataProvider.getAllOrderedStops = function(callback) {
    var allOrderedStops = {};
    allOrderedStops[1] = [];
    allOrderedStops[2] = [];
    for(var i = 0; i < stopsOrders.length; i++) {
      var currLine = stopsOrders[i].directedline_id;
      var newStop = stops[stopsOrders[i].stop_id - 1];
      allOrderedStops[currLine].push(newStop);
    }
    callback(null, allOrderedStops);
};


exports.DataProvider = DataProvider;