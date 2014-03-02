var mongoose = require('mongoose'),
    fs = require('fs'),
    async = require('async'),
    moment = require('moment');

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
          direction: "toSophia",
          originalDirectionId: 1,
          allStops: []
        };
        allOrderedStops[2] = {
          direction: "fromSophia",
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
    callback(err, results);
  });
};

DataProvider.prototype.getStop = function(stopId, callback) {
  var id = mongoose.Types.ObjectId(stopId);
  schemas.Stop.find({_id: id}, function(err, result){
    callback(err, result.length > 0 ? result[0] : null);
  });
    
};

DataProvider.prototype.getAllOrderedStops = function(line, callback) {
    schemas.Line.findOne({name: line}).populate('directedRoutes.allStops').exec(
      function (err, result) {
        var allOrderedStops = {};
        allOrderedStops[1] = [];
        allOrderedStops[2] = [];
        if(result) {
          for(var i = 0; i < result.directedRoutes.length; i++) {
            var currLine = result.directedRoutes[i].originalDirectionId;
            allOrderedStops[currLine] = result.directedRoutes[i].allStops;
          }
        }
        callback(err, allOrderedStops);
      }
    );
};

DataProvider.prototype.getLine = function(line, callback) {
  schemas.Line.findOne({name: line}).populate('directedRoutes.allStops').exec(
      function (err, result) {
        callback(err, result);
      }
  );
};

DataProvider.prototype.getBuses = function(depId, arrId, direction, callback) {
  var date = new Date();
  var today = moment();
  today.second(0);
  today.millisecond(0);
  today.minute(today.minute() - 10);
  var tomorrow = today.add('days', 1);
  console.log(direction);

  var query = schemas.Line.find({})
    .where('directedRoutes.direction', direction)
    .all('directedRoutes.allStops', [depId, arrId])
    .where('directedRoutes.itineraries.rides.schedules').elemMatch(function (elem) {
      elem.where('stop', depId);
      elem.where('scheduleDate').gte(today.valueOf()).lte(tomorrow.valueOf());
    })
    .where('directedRoutes.itineraries.rides.schedules').elemMatch(function (elem) {
      elem.where('stop', arrId);
      elem.where('scheduleDate').gt(today.valueOf()).lte(tomorrow.valueOf());
    });

  query.exec(function(err, result) {
    console.log(result);
    callback(err, result);
  });
};

DataProvider.prototype.setLine = function(update, callback) {
  schemas.Line.findOne({_id: update._id}, function(err, line) {
    if(!err) {
        line.directedRoutes = update.directedRoutes;
        line.save(function(err) {
          callback(err);
        });
    }
  });
};


exports.DataProvider = DataProvider;