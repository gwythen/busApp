// DEPENDENCIES
// ============
var express = require("express"),
    port = (process.env.PORT || 8080),
    
    pug = require("pug"),
    
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

var numUsers = 0;


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

var http = require("http").createServer(server).listen(port);
var io = require('socket.io')(http);


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

server.get('/api/reset/:id/:code', function(req, res) {
    if(req.params.id == "domenico" && req.params.code == 151086) {
        DataProvider.reset(function() {});
        return res.send("done!");
    } else {
        return res.send("Sorry, this action is forbidden");
    }
});

server.get('/', function(req, res) {+
    res.render('index');
});

server.get('/api/search', function(req, res) {
    getBuses(req.query.depStop, req.query.arrStop, req.query.line, req.query.direction, req.query.revert, function(results) {
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
        return res.send(stops);
    });
});

server.get('*', function(req, res) {
    res.render('index');
});



// io.sockets.on('connection', function (socket) {

//     // when the client emits 'adduser', this listens and executes
//     socket.on('adduser', function(username){
//         // store the username in the socket session for this client
//         socket.username = username;
//         // store the room name in the socket session for this client
//         socket.room = 'room1';
//         // add the client's username to the global list
//         usernames[username] = username;
//         // send client to room 1
//         socket.join('room1');
//         // echo to client they've connected
//         socket.emit('updatechat', 'SERVER', 'you have connected to room1');
//         // echo to room 1 that a person has connected to their room
//         socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room');
//         socket.emit('updaterooms', rooms, 'room1');
//     });

//     // when the client emits 'sendchat', this listens and executes
//     socket.on('sendchat', function (data) {
//         // we tell the client to execute 'updatechat' with 2 parameters
//         io.sockets.in(socket.room).emit('updatechat', socket.username, data);
//     });

//     socket.on('switchRoom', function(newroom){
//         // leave the current room (stored in session)
//         socket.leave(socket.room);
//         // join new room, received as function parameter
//         socket.join(newroom);
//         socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
//         // sent message to OLD room
//         socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
//         // update socket session room title
//         socket.room = newroom;
//         socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
//         socket.emit('updaterooms', rooms, newroom);
//     });

//     // when the user disconnects.. perform this
//     socket.on('disconnect', function(){
//         // remove the username from global usernames list
//         delete usernames[socket.username];
//         // update list of users in chat, client-side
//         io.sockets.emit('updateusers', usernames);
//         // echo globally that this client has left
//         socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
//         socket.leave(socket.room);
//     });
// });


io.on('connection', function(socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });


  socket.on('add user', function(data) {
    // we store the username in the socket session for this client
    if (addedUser) return;
    socket.username = data.user;
    socket.usercolor = data.color;
    ++numUsers;
    addedUser = true;
    socket.join(data.room);
    socket.emit('login', {
      numUsers: numUsers,
      username: socket.username
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });

      console.log("you're in!");
      // authenticated = true;
      // we store the username in the session for this client
      // var session = req.session;
      // session[data.room] = {};

      // session[data.room].authenticated = true;
      // session[data.room].user = data.username;
      // session[data.room].color = data.color;
  });

    socket.on('switchRoom', function(newroom){
        // leave the current room (stored in session)
        socket.leave(socket.room);
        // join new room, received as function parameter
        socket.join(newroom);
        socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom);
        // sent message to OLD room
        socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
        // update socket session room title
        socket.room = newroom;
        socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
        socket.emit('updaterooms', rooms, newroom);
    });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });

});


console.log('Welcome to BusApp!\n\nPlease go to http://localhost:' + port + ' to start using it');