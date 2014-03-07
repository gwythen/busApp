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
    schemas.DirectedRoute = require('./models/DirectedRoute.js');
    schemas.Stop = require('./models/Stop.js');
    schemas.Itinerary = require('./models/Itinerary.js');
    schemas.Ride = require('./models/Ride.js');
    schemas.Record = require('./models/Record.js');
    schemas.Observation = require('./models/Observation.js');
    console.log("connected");
  });
};


DataProvider.prototype.reset = function(mainCallback) {
    var allOrderedStops = {};
    var twothirty = {};

    async.waterfall([
      function(wfcallback) {
        async.parallel([
            //Reset Lines
            function(pcallback) {
              schemas.DirectedRoute.remove({}, function(err) {
                 console.log('lines removed');
                 pcallback(err);
              });
            },
            //Reset Stops
            function(pcallback) {
              schemas.Stop.remove({}, function(err) {
                 console.log('stops removed');
                 pcallback(err);
              });
            },
            //Reset Itinerary
            function(pcallback) {
              schemas.Itinerary.remove({}, function(err) {
                 console.log('itinerary removed');
                 pcallback(err);
              });
            },
            //Reset Ride
            function(pcallback) {
              schemas.Ride.remove({}, function(err) {
                 console.log('rides removed');
                 pcallback(err);
              });
            },
            //Reset Stops
            function(pcallback) {
              schemas.Stop.remove({}, function(err) {
                 console.log('stops removed');
                 pcallback(err);
              });
            },
            //Reset Records
            function(pcallback) {
              schemas.Record.remove({}, function(err) {
                 console.log('records removed');
                 pcallback(err);
              });
            }
        ], function(err) {
            wfcallback(null);
        });
      },
      //Create Stops
      function(wfcallback) {
        allOrderedStops[1] = {
          direction: "toSophia",
          directionDisplay: "Sophia",
          originalDirectionId: 1,
          lineName: "230",
          lineOriginalId: 468,
          allStops: [],
          itineraries: []
        };
        allOrderedStops[2] = {
          direction: "fromSophia",
          directionDisplay: "Nice",
          originalDirectionId: 2,
          lineName: "230",
          lineOriginalId: 468,
          allStops: [],
          itineraries: []
        };
        async.eachSeries(stopsOrders, function(stopsOrder, loopCallback) {
          var currLine = stopsOrder.directedline_id;
          var newStop = stops[stopsOrder.stop_id - 1];
          schemas.Stop.create(newStop, function (err, stop) {
              if (err) {
                console.log("error" + err);
              } else {
                allOrderedStops[currLine].allStops.push(stop._id);
                console.log("stop created " + stop.stopName);
              }
              loopCallback(err);
          });
        }, function(err) {
            wfcallback(err);
        });
      },
      //Create line to Sophia
      function(wfcallback){
        schemas.DirectedRoute.create(allOrderedStops[1], function (err) {
            if (err) {
              console.log("error" + err);
            } else {
              console.log("line created");
            }
            wfcallback(err);
        });
      },
      //Create line from Sophia
      function(wfcallback){
        schemas.DirectedRoute.create(allOrderedStops[2], function (err) {
            if (err) {
              console.log("error" + err);
            } else {
              console.log("line created");
            }
            wfcallback(err);
        });
      }
    ], function (err) {
      if(err) {
        console.log("error " + err);
      }
      mainCallback();
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
    schemas.DirectedRoute.find({lineName: line}).populate('allStops').exec(
      function (err, results) {
        var allOrderedStops = {};
        allOrderedStops[1] = [];
        allOrderedStops[2] = [];
        if(results) {
          for(var i = 0; i < results.length; i++) {
            var currLine = results[i].originalDirectionId;
            allOrderedStops[currLine] = results[i].allStops;
          }
        }
        callback(err, allOrderedStops);
      }
    );
};

DataProvider.prototype.getDirectedRoute = function(line, direction, callback) {
  schemas.DirectedRoute.findOne({lineName: line, direction: direction}).populate([{path:'allStops'},{path:'itineraries'}]).exec(
      function (err, result) {
        schemas.Itinerary.populate(result.itineraries, {path: 'rides'}, function (err, itins) {
          result.itineraries = itins;
          callback(err, result);
        });
      }
  );
};

DataProvider.prototype.getBuses = function(depId, arrId, direction, callback) {
  var results = [];
  var date = new Date();
  var today = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0,0));
  
  var MS_PER_MINUTE = 60000;

  var scheduleTime = new Date(1970, 0, 1, date.getHours(), date.getMinutes(), 0, 0);
  scheduleTime = new Date(scheduleTime.getTime() - 5 * MS_PER_MINUTE);

  async.waterfall([
      function(wfcallback) {
          schemas.DirectedRoute.findOne({direction: direction}, function(err, route) {
              wfcallback(null, route);
          });
      },
      function(route, wfcallback) {
        schemas.Record.findOne({directedRoute: route._id, date: today}).populate('rides').exec(
          function(err, record) {
            if(record) {
              wfcallback(null, route, record.rides);
            } else {
              callback(null);
              return;
            }
          });
      }
  ], function (err, route, rides) {
      for(var i = 0; i < rides.length; i++) {
        var result = {};
        result.lineName = route.lineName;
        result.direction = route.direction;
        result.directionDisplay = route.directionDisplay;
        result.schedules = [];
        var depfound = false;
        for (var j = 0; j < rides[i].schedules.length; j++) {
          var currSchedule = rides[i].schedules[j];
          if(!depfound) {
            if(currSchedule.stop.toString() == depId && currSchedule.scheduleTime.getTime() >= scheduleTime.getTime()) {
              if(results.length > 0 && currSchedule.scheduleTime.getTime() == results[results.length - 1].depHour.getTime()) {
                results[results.length - 1].doubled = true;
                break;
              } else {
                result.depHour = currSchedule.scheduleTime;
                depfound = true;
              }
              
            }
          } else {
            if(currSchedule.stop.toString() == arrId && currSchedule.scheduleTime.getTime() > scheduleTime.getTime()) {
              result.arrHour = currSchedule.scheduleTime;
              results.push(result);
              break;
            }
          } 
        }
      }

      if(results.length > 5) {
        results = results.splice(0,5);
      }
      callback(null, results);
  });
};

DataProvider.prototype.setDirectedRoute = function(update, callback) {
  var stops = [];
  var itins = [];

  for(var i = 0; i < update.allStops.length; i++) {
    stops.push(update.allStops[i]._id);
  }
  for(var i = 0; i < update.itineraries.length; i++) {
    itins.push(update.itineraries[i]._id);
  }

  schemas.DirectedRoute.findOne({_id: update._id}, function(err, line) {
    if(!err) {
        line.direction = update.direction;
        line.directionDisplay = update.directionDisplay;
        line.originalDirectionId = update.originalDirectionId;
        line.lineName = update.lineName;
        line.lineOriginalId = update.lineOriginalId;
        line.allStops = stops;
        line.itineraries = itins;
        line.save(function(err) {
          callback(err);
        });
    }
  });
};

DataProvider.prototype.setRecord = function(record, callback) {
  schemas.Record.findOne({date: record.date, directedRoute: record.directedRoute}, function(err, rec) {
    if(!err && !rec) {
      schemas.Record.create(record, function (err, newrec) {
          if (err) {
            console.log("error" + err);
          } else {
            console.log("record created");
          }
          callback(err);
      });
    }
  });
};

DataProvider.prototype.setRide = function(ride, callback) {
  schemas.Ride.create(ride, function (err, dbride) {
      if (err) {
        console.log("error" + err);
      } else {
        console.log("ride created");
      }
      callback(err, dbride);
  });
};

DataProvider.prototype.setItinerary = function(itinerary, callback) {
  schemas.Itinerary.findOne({_id: itinerary._id}, function(err, itin) {
    if(!err) {
      if(itin) {
        console.log("itinerary found");
        itin.stopOrder = itinerary.stopOrder;
        itin.rides = itinerary.rides;
        itin.save(function(err, dbitin) {
          callback(err, dbitin);
        });
      } else {
        var ridesIds = [];
        for(var i = 0; i < itinerary.rides.length; i++) {
          ridesIds.push(itinerary.rides[i]._id);
        }
        var newitin = {};
        newitin.rides = ridesIds;
        newitin.stopOrder = itinerary.stopOrder;
        newitin._id = itinerary._id;
        schemas.Itinerary.create(itinerary, function (err, dbitin) {
              if (err) {
                console.log("error" + err);
              } else {
                console.log("itinerary created");
              }
              callback(err, dbitin);
        });
      }
    }
  });
};

DataProvider.prototype.printData = function(callback) {
  schemas.DirectedRoute.findOne({lineName: "230", direction:"fromSophia"}).populate('itineraries').exec(
    function (err, result) {
        var options = {
          path: 'rides'
        };
        schemas.Itinerary.populate(result.itineraries, {path: 'rides'}, function (err, docs) {
          callback(docs);
        })
    }
  ) 
}

DataProvider.prototype.getId = function() {
  return mongoose.Types.ObjectId();
}

exports.DataProvider = DataProvider;