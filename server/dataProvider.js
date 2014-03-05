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
          originalDirectionId: 1,
          lineName: "230",
          lineOriginalId: 468,
          allStops: [],
          itineraries: []
        };
        allOrderedStops[2] = {
          direction: "fromSophia",
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
        var options = {
          path: 'itineraries.rides',
          model: 'Ride'
        };
        schemas.DirectedRoute.populate(result, options, function (err, routes) {
          callback(err, result);
        });
      }
  );
};

DataProvider.prototype.getBuses = function(depId, arrId, direction, callback) {
  var results = {};
  var today = new Date();
  var safeMinutes = today.getMinutes() - 10;
  if(safeMinutes < 0) {
    safeMinutes = 0;
  }
  today.setHours(0);
  today.setMinutes(0);
  today.setSeconds(0);
  today.setMilliseconds(0);
  var scheduleTime = new Date(1970, 0, 1, today.getHours(), safeMinutes, 0, 0);
  console.log(direction);
  
  async.waterfall([
      function(wfcallback) {
          schemas.DirectedRoute.find({direction: direction}, function(err, route) {
              wfcallback(null, route);
          });
      },
      function(route, wfcallback) {
        schemas.Record.find({direction: direction, date: today}).populate('rides').exec(
          function(err, record) {
            results.line = route.lineName;
            results.direction = route.direction;
            results.schedules = [];
            if(record) {
              wfcallback(null, record.rides);
            } else {
              var query = schemas.Ride.find({directedRoute: route._id})
                  .where('schedules').elemMatch(function (elem) {
                    elem.where('stop', depId);
                    elem.where('scheduleTime').gte(scheduleTime);
                  })
                  .where('schedules').elemMatch(function (elem) {
                    elem.where('stop', arrId);
                    elem.where('scheduleTime').gt(scheduleTime);
                  });

              query.exec(function(err, result) {
                  // console.log(result);
                  // console.log(route);
                  wfcallback(err, results);
              });
            }
          }
        );
      }
  ], function (err, rides) {
      for(var i = 0; i < rides; i++) {
        var result = {};
        var depfound = false;
        for (var j = 0; j < ride[i].schedules.length; j++) {
          var currSchedule = ride[i].schedules[j];
          if(!depfound) {
            if(currSchedule.stop == depId && currSchedule.scheduleTime >= scheduleTime) {
              result.dep = currSchedule.scheduleTime;
              depfound = true;
            }
          } else {
            if(currSchedule.stop == arrId && currSchedule.scheduleTime > scheduleTime) {
              result.arr = currSchedule.scheduleTime;
              results.schedules.push(result);
              break;
            }
          }
          
        }
      }
      callback(results);
  });

  // var query = schemas.Line.find({})
  //   .where('directedRoutes.direction', direction)
  //   .all('directedRoutes.allStops', [depId, arrId])
  //   .where('directedRoutes.itineraries.rides.schedules').elemMatch(function (elem) {
  //     elem.where('stop', depId);
  //     elem.where('scheduleDate').gte(today.valueOf()).lte(tomorrow.valueOf());
  //   })
  //   .where('directedRoutes.itineraries.rides.schedules').elemMatch(function (elem) {
  //     elem.where('stop', arrId);
  //     elem.where('scheduleDate').gt(today.valueOf()).lte(tomorrow.valueOf());
  //   });
};

DataProvider.prototype.setDirectedRoute = function(update, callback) {
  schemas.DirectedRoute.findOne({_id: update._id}, function(err, line) {
    if(!err) {
        line = update;
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
  schemas.Itinerary.create(itinerary, function (err, dbitin) {
      if (err) {
        console.log("error" + err);
      } else {
        console.log("itinerary created");
      }
      callback(err, dbitin);
  });
};

exports.DataProvider = DataProvider;