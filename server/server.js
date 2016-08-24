// DEPENDENCIES
// ============
var express = require("express"),
    port = (process.env.PORT || 8080),
    
    pug = require("pug"),
    
    DataProvider = require('./dataProvider').DataProvider,
    jsdom = require('jsdom').jsdom,
    async = require('async'),
    moment = require('moment'),
    _ = require('lodash');
    

var DataProvider = new DataProvider('localhost', 27017);
var BusScraper = require('./busScraper').BusScraper;
var BusScraper = new BusScraper(DataProvider);

var numUsers = 0;

var app = express();


// SERVER CONFIGURATION
// ====================
app.configure(function () {

    app.use(express["static"](__dirname + "/../public"));

    app.use(express.errorHandler({

        dumpExceptions:true,

        showStack:true

    }));
    app.set('views', __dirname + '/views');
    app.set('view engine', 'pug');

    app.use(app.router);
});

var rootUrl = 'http://www.ceparou06.fr/';

// SERVER
// ======


var server = app.listen(port);
var io = require('socket.io').listen(server);

// var http = require("http").createServer(server).listen(port);
// var io = require('socket.io')(http);


getBuses = function(depId, arrId, lineId, direction, revert, mainCallback) {
    //First we get all the possible stops by directedroute for the line
    DataProvider.getLineStops(lineId, function(err, stops) {
        //Then we run getbuses on all possible directed route in sequence. -> direction1: results ? then stop, else search direction2 
        
        var directions = _.values(stops);
        //We already know which direction we want to take, no need to explore both
        if(revert) {
            if(direction == 1) {
                directions = [stops[2]];
            } else {
                directions = [stops[1]];
            }
        }
        var finalRes = [];
        async.eachSeries(directions, function(direction, loopCallback) {
            var dep = _.find(direction, ['logicalid', depId]);
            var arr = _.find(direction, ['logicalid', arrId]);

            var route = {};
            route.route_id = dep.route_id;
            route.directionid = dep.directionid;
            route.directiondisplay = dep.directiondisplay;
            route.linename = dep.linename.split(" - ")[0];
            console.log("stops for ids " + depId + " " + arrId);
            if(dep && arr) {
                DataProvider.getBuses(dep.id, arr.id, route, function(error, results, fetch) {
                    console.log("searched for buses");
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
            console.log("returning results");
            mainCallback(_.take(finalRes, 5));
        });
    });
};


// ROUTER
// ======

app.get('/api/reset/:id/:code', function(req, res) {
    if(req.params.id == "domenico" && req.params.code == 151086) {
        DataProvider.reset(function() {});
        return res.send("done!");
    } else {
        return res.send("Sorry, this action is forbidden");
    }
});

app.get('/', function(req, res) {+
    res.render('index');
});

app.get('/api/search', function(req, res) {
    getBuses(req.query.depStop, req.query.arrStop, req.query.line, req.query.direction, req.query.revert, function(results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

app.get('/api/searchLine/:query', function(req, res) {
    DataProvider.searchLine(req.params.query, function(err, results) {
        console.log("returning " + results.length + " results");
        return res.send(results);
    });
});

app.get('/api/getLineStops', function(req, res) {
    console.log("fetching stops for line " + req.query.lineid);
    DataProvider.getLineStops(req.query.lineid, function(err, stops) {
        return res.send(stops);
    });
});

app.get('/api/messages/:lineid/', function(req, res) {
    DataProvider.getMessages(req.params.lineid, req.query.index, req.query.qty, function(err, results) {
        console.log("returning " + results.length + " messages");
        return res.send(results);
    });
});

app.get('/api/fbinfo/:lineid', function(req, res) {
    DataProvider.getFBMessages(req.params.lineid, function(err, results) {
        console.log("returning " + results.length + " messages");
        return res.send(results);
    });
})

app.get('*', function(req, res) {
    res.render('index');
});


io.on('connection', function(socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    console.log("new message");
    console.log(data);
    //save message to db
    DataProvider.saveChatMessage(socket.room, socket.username, data.message, data.time, function(err, message) {
        // we tell the client to execute 'new message'
        socket.broadcast.to(socket.room).emit('new message', data);
    });
  });


  socket.on('add user', function(data) {
    // we store the username in the socket session for this client
    if (addedUser) return;
    socket.username = data.user;
    socket.room = data.room;

    socket.join(data.room);
    
    // echo globally (all clients) that a person has connected
    if(socket.username != "") {
      ++numUsers;
      addedUser = true;
      socket.broadcast.to(socket.room).emit('user joined', {
        username: socket.username,
        numUsers: numUsers
      });
    }
    socket.emit('login', {
      numUsers: numUsers,
      username: socket.username,
      room: data.room
    });

    console.log("you're in!");
  });

    socket.on('switch room', function(newroom){
        // leave the current room (stored in session)
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
        // sent message to OLD room
        if(socket.username != "") {
          socket.broadcast.to(socket.room).emit('user left', {
            username: socket.username,
            numUsers: numUsers
          });
        }
        socket.room = newroom;
        if(socket.username != "") {
          ++numUsers;
          addedUser = true;
          socket.broadcast.to(socket.room).emit('user joined', {
            username: socket.username,
            numUsers: numUsers,
            room: socket.room
          });
        }
        //socket.emit('updaterooms', rooms, newroom);
    });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.to(socket.room).emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.to(socket.room).emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      if(socket.username != "") {
        socket.broadcast.to(socket.room).emit('user left', {
          username: socket.username,
          numUsers: numUsers
        });
      }
    }
  });

});


console.log('Welcome to BusApp!\n\nPlease go to http://localhost:' + port + ' to start using it');