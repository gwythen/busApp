// DEPENDENCIES
// ============
var express = require("express"),
    http = require("http"),
    pug = require("pug"),
    port = (process.env.PORT || 8080),
    DataProvider = require('./dataProvider').DataProvider,
    server = module.exports = express(),
    request = require('request'),
    jsdom = require('jsdom').jsdom,
    async = require('async'),
    moment = require('moment'),
    _ = require('lodash');

var DataProvider = new DataProvider('localhost', 27017);
var BusScraper = require('./busScraper').BusScraper;
var BusScraper = new BusScraper(DataProvider);


// SERVER CONFIGURATION
// ====================
server.configure(function () {

    server.use(express["static"](__dirname + "/../public"));

    server.use(express.errorHandler({

        dumpExceptions:true,

        showStack:true

    }));
    server.set('views', __dirname + '/views');
    server.set('view engine', 'pug');

    server.use(server.router);
});

var rootUrl = 'http://www.ceparou06.fr/';

// SERVER
// ======


getBuses = function(depId, arrId, lineId, mainCallback) {
    //First we get all the possible stops by directedroute for the line
    DataProvider.getLineStops(lineId, function(err, stops) {
        //Then we run getbuses on all possible directed route in sequence. -> direction1: results ? then stop, else search direction2 
        
        var directions = _.values(stops);
        var finalRes = [];
        async.eachSeries(directions, function(direction, loopCallback) {
            var dep = _.find(direction, ['logicalid', parseInt(depId)]);
            var arr = _.find(direction, ['logicalid', parseInt(arrId)]);
            var route = {};
            route.route_id = dep.route_id;
            route.directionid = dep.directionid;
            route.directiondisplay = dep.directiondisplay;
            route.linename = dep.linename.split(" - ")[0];
            console.log("stops for ids " + depId + " " + arrId);
            console.log(dep);
            console.log(arr);
            if(dep && arr) {
                DataProvider.getBuses(dep.id, arr.id, route, function(error, results, fetch) {
                    console.log("searched for buses");
                    console.log(results);
                    if(results) {
                        finalRes = results;
                        var fakeErr = new Error();
                        fakeErr.break = true;
                        return loopCallback(fakeErr);
                    } else {
                        //we only fetch if it makes sense: if we have no record for today or if we have no itinerary at all in the db
                        if(fetch) {
                            console.log("going to fetch itineraries");
                            //We fetch itineraries and rides for this direction of the line
                            BusScraper.scrapeBuses(dep.id, arr.id, lineId, dep.directionid, function(results) {
                                if(results.length > 0) {
                                    finalRes = results;
                                    var fakeErr = new Error();
                                    fakeErr.break = true;
                                    return loopCallback(fakeErr);
                                } else {
                                    loopCallback();
                                }
                            });
                        } else {
                            loopCallback();
                        }
                    }
                });
            } else {
                loopCallback();
            }
        }, function(err) {
            // if (err && err.break)
            //     mainCallback(finalRes);
            // else

            console.log("returning results");
            console.log(finalRes);
            mainCallback(_.take(finalRes, 5));
        });
    });
};


// ROUTER
// ======

server.get('/api/reset/:id/:code', function(req, res) {
    if(req.params.id == "domenico" && req.params.code == 151086) {
        DataProvider.reset(function() {});
        return res.send("done!");
    } else {
        return res.send("Sorry, this action is forbidden");
    }
});

server.get('/', function(req, res) {
    DataProvider.getLineStops(1, function(err, stops) {
        return res.render('index', {stops: JSON.stringify(stops)});
    });
});

server.get('/api/search', function(req, res) {
    getBuses(req.query.depStop, req.query.arrStop, req.query.line, function(results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

server.get('/api/searchLine/:query', function(req, res) {
    DataProvider.searchLine(req.params.query, function(err, results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

server.get('/api/getLineStops', function(req, res) {
    console.log("fetching stops for line " + req.query.lineid);
    DataProvider.getLineStops(req.query.lineid, function(err, stops) {
        console.log(stops);
        return res.send(stops);
    });
});

server.get('*', function(req, res) {
    DataProvider.getLineStops(1, function(err, stops) {
        return res.render('index', {stops: JSON.stringify(stops)});
    });
});


// Start Node.js Server
http.createServer(server).listen(port);

console.log('Welcome to BusApp!\n\nPlease go to http://localhost:' + port + ' to start using it');