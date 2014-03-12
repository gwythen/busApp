// DEPENDENCIES
// ============
var express = require("express"),
    http = require("http"),
    jade = require("jade"),
    port = (process.env.PORT || 8080),
    DataProvider = require('./dataProvider').DataProvider,
    server = module.exports = express(),
    request = require('request'),
    jsdom = require('jsdom').jsdom,
    async = require('async'),
    moment = require('moment');

var DataProvider = new DataProvider('localhost', 27017);


// SERVER CONFIGURATION
// ====================
server.configure(function () {

    server.use(express["static"](__dirname + "/../public"));

    server.use(express.errorHandler({

        dumpExceptions:true,

        showStack:true

    }));
    server.set('views', __dirname + '/views');
    server.set('view engine', 'jade');

    server.use(server.router);
});

var rootUrl = 'http://www.ceparou06.fr/';

// SERVER
// ======
getStops = function(callback) {
    DataProvider.getAllStops(function(error, stops){
      if(!error) {
        var stopsListData = [];
        for(var i = 0; i < stops.length; i++) {
            var newStop = {};
            newStop.name = stops[i].stopName;
            newStop.lat = stops[i].lat;
            newStop.lon = stops[i].lon;
            newStop.originalId = stops[i].originalId;
            newStop.logicalId = stops[i].logicalId;
            newStop.operatorId = stops[i].operatorId;
            newStop.id = stops[i]._id;
            stopsListData.push(newStop);
        }
        callback(stops);
      }
    });
};

getAllOrderedStops = function(line, callback) {
    DataProvider.getAllOrderedStops(line, function(error, stops){
      if(!error) {
        var stopsListData = {};
        for (var line in stops ) {
            stopsListData[line] = [];
            stopsline = stops[line];

            for(var i = 0; i < stopsline.length; i++) {
                var newStop = {};
                newStop.name = stopsline[i].stopName;
                newStop.lat = stopsline[i].latitude;
                newStop.lon = stopsline[i].longitude;
                newStop.originalId = stopsline[i].originalId;
                newStop.logicalId = stopsline[i].logicalId;
                newStop.operatorId = stopsline[i].operatorId;
                newStop.id = stopsline[i]._id;
                stopsListData[line].push(newStop);
            }
        }
        callback(stopsListData);
      }
    });
};

getWebPage = function(url, callback) {
    // use a timeout value of 10 seconds
    var timeoutInMilliseconds = 10*1000;
    var opts = {
        url: url,
        timeout: timeoutInMilliseconds,
        encoding: 'binary'
    };

    request(opts, function (err, res, body) {
        if (err) {
            console.dir(err);
            return;
        } else {
            if (res.statusCode == 200) {
                callback(body);
            }
        }
    });
};

getBuses = function(depId, arrId, line, direction, mainCallback) {
    console.log(depId + " " + arrId + " " + line + " " + direction);
    DataProvider.getBuses(depId, arrId, direction, function(error, results) {
        if(results) {
           mainCallback(results);
        } else {
            scrapeBuses(depId, arrId, line, direction, mainCallback);
        }
    });
};

scrapeBuses = function(depId, arrId, line, direction, mainCallback) {
    DataProvider.getDirectedRoute(line, direction, function(error, result) {
        DataProvider.getStop(depId, function(error, stop) {
            var directedRoute = result;
            var today = moment();
            var url = "http://www.ceparou06.fr/horaires_ligne/index.asp?rub_code=6&thm_id=0&lign_id=" + directedRoute.lineOriginalId + "&sens=" + directedRoute.originalDirectionId + "&date=" + today.format("DD") + "%2F" + today.format("MM") + "%2F" + today.format("YYYY") + "&index=";
            console.log(url);
            var currIndex = 1;
            var maxIndex = 2;
            var totalRides = [];
            var stopName = stop.stopName;
            var record = {};
            var date = new Date();
            record.date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0,0));
            record.directedRoute = directedRoute._id;
            record.rides = [];
            var MS_PER_MINUTE = 60000;
            var results = [];

            var allItineraries = [];
            for(var i = 0; i < directedRoute.itineraries.length; i++) {
                allItineraries.push(directedRoute.itineraries[i].toObject());
            }
            async.doWhilst(
                function (docallback) {
                    async.waterfall([
                        function(callback) {
                            getWebPage(url+currIndex, function(body) {
                                callback(null, body);
                            });
                        },
                        function(body, callback) {
                            parseTimetable(body, directedRoute.allStops, function(rides, curr, max) {
                                callback(null, rides, curr, max);
                            });
                        }
                    ], function (err, rides, curr, max) {
                        totalRides.push.apply(totalRides, rides);
                        if(curr == max) {
                            curr = curr + 1;
                        }
                        currIndex = curr;
                        maxIndex = max;
                        docallback();
                    });
                },
                function () { return currIndex <= maxIndex; },
                function (err) {
                    if(totalRides.length > 0) {
                        var date = new Date();

                        var currentTime = new Date(1970, 0, 1, date.getHours(), date.getMinutes(), 0, 0);
                        currentTime = new Date(currentTime.getTime() - 5 * MS_PER_MINUTE);
                        
                        async.eachSeries(totalRides, function(currRide, loopCallback) {
                            async.waterfall([
                                function(callback) {
                                    checkRideExistence(allItineraries, currRide, function(itin, ridefound){
                                        callback(null, itin, ridefound);
                                    });
                                },
                                function(itin, ridefound, callback) {
                                    populateDatabase(itin, ridefound, currRide, directedRoute, allItineraries, function() {
                                        callback();
                                    });
                                }
                            ], function (err) {
                                var result = {};
                                result.lineName = directedRoute.lineName;
                                result.depStop = stopName;
                                result.direction = directedRoute.direction;
                                result.direction = directedRoute.directionDisplay;
                                result.schedules = [];
                                var depfound = false;
                                for (var j = 0; j < currRide.schedules.length; j++) {
                                  var currSchedule = currRide.schedules[j];
                                  if(!depfound) {
                                    if(currSchedule.stop.toString() == depId && currSchedule.scheduleTime.getTime() >= currentTime.getTime()) {
                                      if(results.length > 0 && currSchedule.scheduleTime.getTime() == results[results.length - 1].depHour.getTime()) {
                                        results[results.length - 1].doubled = true;
                                        break;
                                      } else {
                                        result.depHour = currSchedule.scheduleTime;
                                        depfound = true;
                                      }
                                    }
                                  } else {
                                    if(currSchedule.stop.toString() == arrId && currSchedule.scheduleTime.getTime() > currentTime.getTime()) {
                                      result.arrHour = currSchedule.scheduleTime;
                                      results.push(result);
                                      break;
                                    }
                                  } 
                                }
                                record.rides.push(currRide._id);
                                loopCallback();
                            });
                        }, function(err) {
                            //Finally update the directed route 
                            DataProvider.setDirectedRoute(directedRoute, function(error) {
                                console.log("route saved to the database");
                            });
                            //And store a record of the rides for the day
                            DataProvider.setRecord(record, function(error) {
                                console.log("record saved to the database");
                            });
                            if(results.length > 5) {
                                results = results.splice(0,5);
                            }
                            mainCallback(results);
                        });
                    }  else {
                        mainCallback(results);
                    }
                }
            );
        });
    });
};

populateDatabase = function(itin, ridefound, currRide, directedRoute, allItineraries, callback) {
    if(itin === null || !ridefound) {
        //First create a new ride
        currRide.directedRoute = directedRoute._id;
        var itinerary = {};
        DataProvider.setRide(currRide, function(error, ride) {
            if(ride) {
                console.log("ride saved to the database");
                currRide._id = ride._id;
                //If not existing, create a new itinerary
                if(itin === null) {
                    itinerary.stopOrder = currRide.stopOrder;
                    itinerary.rides = [];
                    itinerary._id = DataProvider.getId();
                    //Then push the id to the itinerary
                    itinerary.rides.push(currRide);
                    directedRoute.itineraries.push(itinerary);
                    allItineraries.push(itinerary);
                //Otherwise add directly the ride to the corresponding itinerary
                } else {
                    directedRoute.itineraries[itin].rides.push(currRide);
                    itinerary = directedRoute.itineraries[itin];
                    allItineraries[itin].rides.push(currRide);
                }
                //Then save the itinerary
                DataProvider.setItinerary(itinerary, function(error, dbitin) {
                    if(dbitin) {
                        //Then push the id to the directedroute
                        console.log("itinerary saved to the database");
                    } else {
                       console.log("Error: itinerary not saved");
                    }
                    callback(null);
                });
            } else {
                callback(null);
            }
        });
    } else {
        callback(null);
    }
};

checkRideExistence = function(allItineraries, currRide, callback){
    var ridefound = false;
    var itin = null;
    console.log("length " + allItineraries.length);
    for(var j = 0; j < allItineraries.length; j++) {
        var currItin = allItineraries[j];
        if(currItin.stopOrder.length == currRide.stopOrder.length) {
            var allstop = true;
            for(var k = 0; k < currItin.stopOrder.length; k++) {
                if(currItin.stopOrder[k].toString() != currRide.stopOrder[k].toString()) {
                    console.log("different stop");
                    allstop = false;
                    break;
                }
            }
            if(allstop) {
                itin = j;
                break;
            }
        } else {
            itin = null;
        }
    }
    if(itin !== null) {
        console.log("itinerary found");

        //check if the itinerary already has this ride
        var currsched = currRide.schedules;
        for(var z = 0; z < allItineraries[itin].rides.length; z++) {
            var ridesched = allItineraries[itin].rides[z].schedules;
            if(currsched.length == ridesched.length) {
                var allsched = true;
                for(var x = 0; x < ridesched.length; x++) {
                    if(ridesched[x].scheduleTime.getTime() != currsched[x].scheduleTime.getTime()) {
                        allsched = false;
                        break;
                    }
                }
                if(allsched) {
                    ridefound = true;
                    currRide._id = allItineraries[itin].rides[z]._id;
                    break;
                }
            } else {
                console.log("different schedule length");
            }
        }
    }
    callback(itin, ridefound);
};

parseTimetable = function(body, stops, callback) {
    var subWindow = jsdom(body).createWindow();
    var $ = require('jquery').create(subWindow);
    var rows = $("tbody tr[class^='row']");
    var columns = $(rows[0]).children(".horaire");
    var columnIndex = 0;
    var rides = [];
    var currIndex = 0;
    var maxIndex = 0;
    if(rows.length > 0) {
        currIndex = parseInt($(".hourCourses").text().split("à ")[1].split(" sur")[0], 10);
        maxIndex = parseInt($(".hourCourses").text().split("sur ")[1], 10);
        

        for(var j = 0; j < columns.length; j++) {
            var ride = {};
            var currElem = $(columns[j]);
            //ride.originalRideId = currElem.attr("headers").split("course")[1];
            ride.schedules = [];
            ride.stopOrder = [];
            rides.push(ride);
        }
        
        for(var i = 0; i < rows.length; i++) {
            var stopId = $(rows[i]).children("td[headers='arret']").attr("id").split("arret")[1];
            var currStopDbId = "";
            var found = false;

            for(var z = 0; z < stops.length; z++) {
                if(stops[z].originalId == stopId) {
                    currStopDbId = stops[z]._id;
                    found = true;
                    break;
                }
            }
            if(!found) {
               //TODO: what happens in this case?
            }
            var rowColumns = $(rows[i]).children(".horaire");
            for(var k = 0; k < rowColumns.length; k++) {
                if($(rowColumns[k]).text() != "|"){
                    var schedule = {};
                    schedule.stop = currStopDbId;
                    var time = $(rowColumns[k]).text().split(":");

                    var scheduleTime = new Date(Date.UTC(1970, 0, 1));
                    scheduleTime.setHours(parseInt(time[0]));
                    scheduleTime.setMinutes(parseInt(time[1]));

                    schedule.scheduleTime = scheduleTime;
                    rides[k].stopOrder.push(schedule.stop);
                    rides[k].schedules.push(schedule);
                }
            }
        }
    }
    

    callback(rides, currIndex, maxIndex);
};


// ROUTER
// ======

server.get('/api/reset/:id/:code', function(req, res) {
    if(req.params.id == "domenico" && req.params.code == 151086) {
        DataProvider.reset(function() {
            return res.send("done!");
        });
    } else {
        return res.send("Sorry, this action is forbidden");
    }
});

server.get('/', function(req, res) {
    getAllOrderedStops("230", function(results){
        return res.render('index', {stops: JSON.stringify(results)});
    });
});

server.get('/api/stops', function(req, res) {
    server.getStops(function(results) {
        return res.send(results);
    });
});

server.get('/api/search', function(req, res) {
    getBuses(req.query.depStop, req.query.arrStop, req.query.line, req.query.direction, function(results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

server.get('/api/print', function(req, res) {
    DataProvider.printData(function(results){
        return res.send(results);
    });
});

server.get('*', function(req, res) {
    getAllOrderedStops("230", function(results){
        return res.render('index', {stops: JSON.stringify(results)});
    });
});


// Start Node.js Server
http.createServer(server).listen(port);

console.log('Welcome to BusApp!\n\nPlease go to http://localhost:' + port + ' to start using it');