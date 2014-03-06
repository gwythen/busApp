// DEPENDENCIES
// ============
var express = require("express"),
    http = require("http"),
    jade = require("jade"),
    port = (process.env.PORT || 8001),
    DataProvider = require('./dataprovider').DataProvider,
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
            //scrapeBuses(depId, arrId, direction, mainCallback);
            scrapeBuses2(depId, arrId, line, direction, mainCallback);
        }
    });
};

scrapeBuses2 = function(depId, arrId, line, direction, mainCallback) {
    DataProvider.getDirectedRoute(line, direction, function(error, result) {
        var directedRoute = result;
        var today = moment();
        var url = "http://www.ceparou06.fr/horaires_ligne/index.asp?rub_code=6&thm_id=0&lign_id=" + directedRoute.lineOriginalId + "&sens=" + directedRoute.originalDirectionId + "&date=" + today.format("DD") + "%2F" + today.format("MM") + "%2F" + today.format("YYYY") + "&index=";
        console.log(url);
        var currIndex = 1;
        var maxIndex = 2;
        var totalRides = [];

        var record = {};
        record.date = new Date();
        record.date.setHours(0);
        record.date.setMinutes(0);
        record.date.setSeconds(0);
        record.date.setMilliseconds(0);
        record.directedRoute = directedRoute._id;
        record.rides = [];

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
                        parseTimetable2(body, directedRoute.allStops, function(rides, curr, max) {
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
                    //TODO insert for an async loop and save a record
                    async.eachSeries(totalRides, function(currRide, loopCallback) {
                        async.waterfall([
                            function(callback) {
                                checkRideExistence(allItineraries, currRide, function(itin, ridefound){
                                    callback(null, itin, ridefound);
                                });
                            },
                            function(itin, ridefound, callback) {
                                console.log("itin " + itin);
                                console.log("ridefound " + ridefound);
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
                                                itinerary._id = null;
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
                                                    itinerary._id = dbitin._id;
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
                            }
                        ], function (err) {
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
                        mainCallback(totalRides);
                    });
                }  else {
                    mainCallback(null);
                }
            }
        );
    });
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

parseTimetable2 = function(body, stops, callback) {
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
                    var scheduleTime = new Date(1970, 0, 1, time[0], time[1], 0, 0);
                    schedule.scheduleTime = scheduleTime;
                    rides[k].stopOrder.push(schedule.stop);
                    rides[k].schedules.push(schedule);
                }
            }
        }
    }
    

    callback(rides, currIndex, maxIndex);
};


scrapeBuses = function(depId, arrId, direction, mainCallback) {
    DataProvider.getStop(depId, function(error, depStop) {
        if(depStop) {
            DataProvider.getStop(arrId, function(error, arrStop) {
                if(arrStop) {
                    var now = new Date();
                    var url = rootUrl + 'ri/?';
                    var month = now.getMonth();
                    
                    if(month < 10) {
                        month = "0" + month;
                    }

                    var day = now.getDate();
                    if(day < 10) {
                        day = "0" + day;
                    }
                    
                    var date = '&laDate=' + day + '%2F' + month + '%2F' + now.getFullYear() + '&lHeure=' + now.getHours() + '&laMinute=' + now.getMinutes();
                    
                    if(now.getHours() >= 21 || now.getHours() < 6) {
                        date = '&laDate=' + day + '%2F' + month + '%2F' + now.getFullYear() + '&lHeure=' + 08 + '&laMinute=' + 10;
                    }

                    var formatDepStop = depStop.stopName.replace(/ /g,"+").replace(/\//g, "%2F+");
                    var formatArrStop = arrStop.stopName.replace(/ /g,"+").replace(/\//g, "%2F+");
                    var depOptions = 'comDep=' + depStop.localityCode + '&pointDep=' + depStop.logicalId + '%24' + formatDepStop + '%242%24' + depStop.localityCode + '&numDep=';
                    var arrOptions = '&comArr=' + arrStop.localityCode + '&pointArr=' + arrStop.logicalId + '%24' + formatArrStop + '%242%24' + arrStop.localityCode + '&numArr=';
                    var otherOptions = '&leMeridien=&typeDate=68&critereRI=1&rub_code=4&laction=synthese&modeBus=1&modeTram=1&modeCar=1&modeTrain=1&modeBoat=1&showOptions=&selectOpt=0';

                    var finalUrl = url + depOptions + arrOptions + date + otherOptions;
                    console.log(finalUrl);
                    async.waterfall([
                        function(callback){
                            getWebPage(finalUrl, function(body) {
                                callback(null, body);
                            });
                        },
                        function(body, callback){
                            parseResults(body, depStop, arrStop, function(results) {
                                callback(null, results);
                            });
                        },
                    ], function (err, result) {
                       mainCallback(result);
                    });
                } else mainCallback();
            });
        } else mainCallback();
        
    });
};


parseResults = function(body, depStop, arrStop, parseCallback) {
    var window = jsdom(body).createWindow();
    var $ = require('jquery').create(window);
    var rows = $('#routesynthese tbody').children("tr");
    var results = null;

    if($('.error').length === 0) {
        results = [];
        async.each(rows, function(row, mainCallback) {
            var result = {};
            var currElem = $(row);
            var depTime = currElem.children("td[headers='depart']").text().split("h");
            var arrTime = currElem.children("td[headers='arrivee']").text().split("h");
            result.depHour =  depTime[0] + ":" + depTime[1];
            result.arrHour = arrTime[0] + ":" + arrTime[1];
            result.depStop = depStop.stopName;
            result.arrStop = arrStop.stopName;
            var durationPieces = currElem.children("td[headers='duree']").first().html().split("<br />")[0].split("<abbr");
            var dur0 = durationPieces[0];
            var durSubPieces = durationPieces[1].split("</abbr>");
            var dur1 = null;
            if(durSubPieces[1] !== "") {
                dur1 = durSubPieces[1];
                result.duration = dur0 + "h" + dur1;
            } else {
                result.duration = dur0 + "min";
            }

            depDate = new Date();
            depDate.setHours(depTime[0]);
            depDate.setMinutes(depTime[1]);
            result.depDate = depDate;
            var url = rootUrl + 'ri/';
            var detlink = url + currElem.children("td[headers='details']").children("a").first().attr('href');
            

            async.waterfall([
                //get the page containing ride info
                function(callback){
                    getWebPage(detlink, function(body) {
                        console.log("Details Page: " + detlink);
                        callback(null, body);
                    });
                },
                function(body, callback) {
                    parseDetails(body, result, function(lineTimetableLink) {
                         console.log("Timetable Page: " + lineTimetableLink);
                         callback(null, lineTimetableLink);
                    });
                },
                //get the page containing timetables related to the ride
                function(lineTimetableLink, callback) {
                    searchTimetable(lineTimetableLink, result, function(include, otherLink) {
                        if(include && otherLink) {
                             console.log("Further Timetable Page: " + otherLink);
                            searchTimetable(otherLink, result, function(include, otherLink) {
                                callback(null, include);
                            });
                        } else {
                            callback(null, include);
                        }
                    });
                },
            ], function (err, include) {
                if(include) {
                    results.push(result);
                }
                
                mainCallback();
            });

            //getWebPage(detlink, detailsParse, args);
        }, function(err) {
            if (err) return next(err);
            parseCallback(results.sort(function(a,b){
                return a.depDate > b.depDate ? 1 : a.depDate < b.depDate ? -1 : 0;
            }));
        });
        
    } else {
        parseCallback(results);
    }
};


parseTimetable = function(depStop, body, result, callback) {
    var subWindow = jsdom(body).createWindow();
    var $ = require('jquery').create(subWindow);
    var rows = $("tbody tr[class^='row']");
    var columnIndex = 0;
    var nextLink = null;
    var found = false;
    for(var i = 0; i < rows.length; i++) {
        var stopId = $(rows[i]).children("td[headers='arret']").attr("id").split("arret")[1];
        if(stopId == depStop.originalId) {

            found = true;
            var columns = $(rows[i]).children(".horaire");
            var minElem = 0;
            var maxElem = 0;
            for(var j = 0; j < columns.length; j++) {
                if($(columns[j]).text() != "|"){
                    minElem = j;
                    break;
                }
            }
            for(j = columns.length -1; j >= 0; j--) {
                if($(columns[j]).text() != "|"){
                    maxElem = j;
                    break;
                }
            }
            var minTime = Date.parse("01/01/2001 " + $(columns[minElem]).text());
            var maxTime = Date.parse("01/01/2001 " + $(columns[maxElem]).text());
            var depTime = Date.parse("01/01/2001 " + result.depHour);
            if(depTime >= minTime && depTime <= maxTime) {
                for(j = 0; j < columns.length; j++) {
                    if($(columns[j]).text() == result.depHour) {
                        columnIndex = j;
                        break;
                    }
                }
            } else {
                if(depTime < minTime) {
                    //need to navigate back to the previous timetable page
                    nextLink = rootUrl + "horaires_ligne/" + $(".hourPrev a").attr("href");
                } else {
                    //need to navigate to the next timetable page
                    nextLink = rootUrl + "horaires_ligne/" + $(".hourNext a").attr("href");
                }
            }

            break;
        }
    }
    if(!nextLink && found) {
        for(var k = 0; k < rows.length; k++) {
            var currElem = $($(rows[k]).children(".horaire")[columnIndex]);
            var dephour = currElem.text();
            if(dephour !== "|") {
                result.rideDepHour = dephour;
                result.rideInDayNumber = currElem.attr("headers").split("course")[1];
                break;
            }
        }
    }

    callback(nextLink);
};

parseDetails = function(body, result, callback) {
    var subWindow = jsdom(body).createWindow();
    var $ = require('jquery').create(subWindow);
    var lines = $(".lineRoute img");
    var linesAr = [];
    for(var i = 0; i < lines.length; i++) {
        linesAr.push($(lines[i]).attr("alt"));
    }
    result.lineName = linesAr;
    var lineTimetableLink = rootUrl + $(".lineRoute a").first().attr("href").split("../")[1];
    var lineid = lineTimetableLink.split("lign_id=")[1].split("&date")[0];
    var direction = lineTimetableLink.split("sens=")[1];
    result.lineId = lineid;
    result.direction = $(".lineRoute .important").text();
    
    callback(lineTimetableLink);
};

searchTimetable = function(lineTimetableLink, result, searchCallback) {
    async.waterfall([
        function(callback) {
            getWebPage(lineTimetableLink, function(body) {
                callback(null, body);
            });
        },
        function(body, callback) {
            if(result.lineName.length == 1) {
                parseTimetable(depStop, body, result, function(otherLink) {
                    callback(null, true, otherLink);
                });
            } else {
                callback(null, false);
            }
        },
    ], function (err, include, otherLink) {

       searchCallback(include, otherLink);
    });
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
        console.log("returning " + (results ? results.length : 0) + " results");
        //console.log(results);
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