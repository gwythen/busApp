var mongoose = require('mongoose')
  , fs = require('fs')
  , async = require('async');

var stops = require('./Stops');
var stopsOrders = require('./StopOrders');
var schemas = {};


DataProvider = function(host, port) {
  mongoose.connect('mongodb://localhost/busApp');
  this.db = mongoose.connection;
  this.db.on('error', console.error.bind(console, 'connection error:'));
  this.db.once('open', function callback () {
    schemas.Line = require('./models/Line.js');
    schemas.Stop = require('./models/Stop.js');
    schemas.Observation = require('./models/Observation.js');
    console.log("connected");
  });
};


DataProvider.prototype.reset = function(mainCallback) {
    var allOrderedStops = {};
    var twothirty = {};

    async.waterfall([
      //Reset Lines
      function(wfcallback) {
        schemas.Line.remove({}, function(err) { 
           console.log('lines removed');
           wfcallback(err);
        });
      },
      //Reset Stops
      function(wfcallback) {
        schemas.Stop.remove({}, function(err) { 
           console.log('stops removed');
           wfcallback(err);
        });
      },
      //Create Stops
      function(wfcallback) {
        allOrderedStops[1] = {
          direction: "Sophia",
          originalDirectionId: 1,
          allStops: []
        };
        allOrderedStops[2] = {
          direction: "Nice",
          originalDirectionId: 2,
          allStops: []
        };
        async.each(stopsOrders, function(stopsOrder, loopCallback) {
          var currLine = stopsOrder.directedline_id;
          var newStop = stops[stopsOrder.stop_id - 1];
          console.log(newStop);
          schemas.Stop.create(newStop, function (err, stop) {
              if (err) {
                console.log("error" + err);
              } else {
                allOrderedStops[currLine].allStops.push(stop);
                console.log("stop created");
              }
              loopCallback(err);
          });
        }, function(err) {
            wfcallback(err);
        });
      },
      //Create lines
      function(wfcallback){
        twothirty = new schemas.Line({
          lineOriginalId: 468,
          name: "230",
          directedRoutes:[allOrderedStops[1], allOrderedStops[2]]
        });
        schemas.Line.create(twothirty, function (err) {
            if (err) {
              console.log("error" + err);
            } else {
              console.log("line created");
            }
            wfcallback(err);
        });
    }], function (err) {
      if(err) {
        console.log("error " + err);
      } else {
        mainCallback();
      }
    });
};

DataProvider.prototype.getAllStops = function(callback) {
  schemas.Stop.find({}, function(err, results){
    callback(null, results);
  });
    
};

DataProvider.prototype.getStop = function(stopId, callback) {
  var id = mongoose.Types.ObjectId(stopId);
  schemas.Stop.find({_id: id}, function(err, result){
    callback(null, result.length > 0 ? result[0] : null);
  });
    
};

DataProvider.prototype.getAllOrderedStops = function(line, callback) {
    schemas.Line.findOne({name: line}).populate('directedRoutes.allStops').exec(
      function (err, result) {   
        var allOrderedStops = {};
        allOrderedStops[1] = [];
        allOrderedStops[2] = [];
        for(var i = 0; i < result.directedRoutes.length; i++) {
          var currLine = result.directedRoutes[i].originalDirectionId;
          allOrderedStops[currLine] = result.directedRoutes[i].allStops;
        }
        callback(null, allOrderedStops);
      }
    );
};


exports.DataProvider = DataProvider;