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
    moment = require('moment');

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

getLineStops = function(line, callback) {
    DataProvider.getLineStops(line, function(error, stops){
      if(!error) {
        var stopsListData = {};
        for (var line in stops ) {
            stopsListData[line] = [];
            stopsline = stops[line];

            for(var i = 0; i < stopsline.length; i++) {
                var newStop = {};
                newStop.name = stopsline[i].stopname;
                newStop.lat = stopsline[i].latitude;
                newStop.lon = stopsline[i].longitude;
                newStop.originalId = stopsline[i].originalid;
                newStop.logicalId = stopsline[i].logicalid;
                newStop.operatorId = stopsline[i].operatorid;
                newStop.id = stopsline[i].stop_id;
                newStop.lineid = stopsline[i].line_id;
                newStop.directionid = stopsline[i].directionid;
                stopsListData[line].push(newStop);
            }
        }

        callback(stopsListData);
      }
    });
};

getBuses = function(depId, arrId, mainCallback) {
    DataProvider.getBuses(depId, arrId, null, function(error, results, lineid, directionid, fetch) {
        if(results) {
           mainCallback(results);
        } else {
            if(fetch) {
                BusScraper.scrapeBuses(depId, arrId, lineid, directionid, mainCallback);
            } else {
                mainCallback([]);
            }
            
        }
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
    getLineStops(1, function(results){
        return res.render('index', {stops: JSON.stringify(results)});
    });
});

server.get('/api/search', function(req, res) {
    getBuses(req.query.depStop, req.query.arrStop, function(results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

server.get('*', function(req, res) {
    getLineStops(1, function(results){
        return res.render('index', {stops: JSON.stringify(results)});
    });
});


// Start Node.js Server
http.createServer(server).listen(port);

console.log('Welcome to BusApp!\n\nPlease go to http://localhost:' + port + ' to start using it');