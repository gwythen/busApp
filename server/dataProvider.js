var pg = require('pg'),
    fs = require('fs'),
    async = require('async'),
    moment = require('moment'),
    _ = require('lodash');
    var query = require('pg-query');

var DBInitializer = require('./initializeDB');

DataProvider = function(host, port) {
  // First you need to create a connection to the db

  query.connectionParameters = 'postgres://@localhost:5432/busApp';
};


DataProvider.prototype.reset = function(mainCallback) {
 const tables = ["stopsbyroute", "itinerarystopsequence", "schedules", "observations", "records", "rides", "itineraries", "stops", "directedroutes", "lines"];

  async.eachSeries(tables, function(table, loopCallback) {
      query('DROP TABLE IF EXISTS ' + table,function(err,rows){
      if(err) throw err;

        console.log('Table ' + table + ' removed');
        loopCallback();
      });
  }, function(err) {
      // if any of the file processing produced an error, err would equal that error
      if( err ) {
        // One of the iterations produced an error.
        console.log('something was wrong');
      } else {
        console.log("Dropped tables");
        var BusScraper = require('./busScraper').BusScraper;
        var BusScraper = new BusScraper(this);

        DBInitializer.initializeDB(query, BusScraper, function() {
          DBInitializer.initializeLines(query, mainCallback);
        });
      }
  });
}; 

DataProvider.prototype.getStop = function(stopId, callback) {
  query('SELECT * FROM stops WHERE id = $1', [stopId], function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.getLine = function(lineName, callback) {
  query('SELECT * FROM lines WHERE linename = $1', [lineName], function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.searchLine = function(queryname, callback) {
  query("SELECT * FROM lines WHERE linename LIKE $1", ['%' + queryname + '%'], function(err,rows){
    if(err) throw err;

    callback(err, rows);
  });
};

DataProvider.prototype.getDirectedRoute = function(lineid, directionid, callback) {
  query('SELECT directedroutes.id as id, directiondisplay, directionid, line_id, linename, lineoriginalid ' + 
            'FROM directedroutes JOIN lines ON directedroutes.line_id = lines.id ' + 
            'WHERE line_id = $1 AND directionid = $2', [lineid, directionid], function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.getLineRoutes = function(lineid, callback) {
  console.log("line " + lineid);
  query('SELECT * FROM directedroutes ' + 
            'WHERE line_id = $1', [lineid], function(err,rows) {
    if(err) throw err;

    callback(err, rows);
  });
};

DataProvider.prototype.getLineStops = function(lineid, callback) {
    query('SELECT stops.id as id, directiondisplay, directionid, latitude, line_id, localitycode, logicalid, longitude, operatorid, operatorname, originalid, route_id, stopname, linename ' +
      'FROM stopsbyroute ' +
      'JOIN stops ON stops.id = stopsbyroute.stop_id ' +
      'JOIN directedroutes ON stopsbyroute.route_id = directedroutes.id ' +
      'JOIN lines ON directedroutes.line_id = lines.id ' + 
      'WHERE line_id = $1', [lineid], function(err, rows) {
      if(err) throw err;
      var stops = _.groupBy(rows, "directionid");
      
      callback(err, stops);
    });
};

DataProvider.prototype.getRouteStops = function(routeid, callback) {
    query('SELECT * FROM stopsbyroute ' +
      'JOIN stops ON stops.id = stopsbyroute.stop_id ' +
      'WHERE route_id = $1', [routeid], function(err, rows) {
      if(err) throw err;

      callback(err, rows);
    });
};


DataProvider.prototype.getRouteItineraries = function(routeId, callback) {
    query('SELECT * FROM itinerarystopsequence ' + 
      'JOIN stops ON itinerarystopsequence.stop_id = stops.id ' + 
      'JOIN itineraries ON itinerarystopsequence.itin_id = itineraries.id ' + 
      'WHERE itineraries.route_id = $1', [routeId], function(err, rows) {
      if(err) throw err;


      var addItin = function(i, row) {
        allItineraries[i] = {};
        allItineraries[i].id = row.itin_id;
        allItineraries[i].stopOrder = [];
      }

      var addStop = function(i, row) {
        var stop = {};
        stop.stop_id = row.stop_id;
        stop.seqnumber = row.seqnumber;
        allItineraries[i].stopOrder.push(stop);
      }

      var allItineraries = [];
      var i = 0;
      rows.forEach(function(row) {
          if(!allItineraries[i]) {
            addItin(i, row);
          } 
          if(row.itin_id != allItineraries[i].id) {
            i++;
            addItin(i, row);
          }
          addStop(i, row);            
      });

      

      allItineraries.forEach(function(itin) {
        _.sortBy(itin.stopOrder, "seqnumber");
      });

      console.log("fetched " + allItineraries.length + " itineraries");

      callback(err, allItineraries);
    });
};

DataProvider.prototype.getItineraryRides = function(itinId, callback) {
    query('SELECT * FROM schedules JOIN rides ON schedules.ride_id = rides.id ' +
      'WHERE rides.itin_id = $1', [itinId], function(err, rows) {
      if(err) throw err;

      var allRides = _.groupBy(rows, "ride_id");

      var addRide = function(i, row) {
        allRides[i] = {};
        allRides[i].id = row.ride_id;
        allRides[i].schedules = [];
      }

      var addSchedule = function(i, row) {
        var schedule = {};
        schedule.stop_id = row.stop_id;
        schedule.scheduletime = row.scheduletime;
        allRides[i].schedules.push(schedule);
      }

      var allRides = [];
      var i = 0;
      rows.forEach(function(row) {
          if(!allRides[i]) {
            addRide(i, row);
          } 
          if(row.ride_id != allRides[i].id) {
            i++;
            addRide(i, row);
          }
          addSchedule(i, row);            
      });

      allRides.forEach(function(ride) {
        _.sortBy(ride.schedules, "scheduletime");
      });

      console.log("fetched " + allRides.length + " rides");
      callback(err, allRides);
    });
};


DataProvider.prototype.checkRideExistence = function(allItineraries, currRide, callback) {
    var ridefound = false;
    var itin = null;
    
    for(var j = 0; j < allItineraries.length; j++) {
        var currItin = allItineraries[j];
        if(currItin.stopOrder.length == currRide.stopOrder.length) {
            var allstop = true;
            for(var k = 0; k < currItin.stopOrder.length; k++) {
                if(currItin.stopOrder[k].stop_id != currRide.stopOrder[k].stop_id) {
                    console.log("different stop");
                    allstop = false;
                    break;
                }
            }
            if(allstop) {
                itin = allItineraries[j];
                break;
            }
        } else {
            itin = null;
        }
    }
    if(itin !== null) {
        console.log("matching itinerary found");
        DataProvider.prototype.getItineraryRides(itin.id, function(err, rides) {
          //check if the itinerary already has this ride
          var currsched = _.sortBy(currRide.schedules, 'scheduletime');
          for(var z = 0; z < rides.length; z++) {
              var ridesched = rides[z].schedules;
              if(currsched.length == ridesched.length) {
                  var allsched = true;
                  for(var x = 0; x < ridesched.length; x++) {
                      if(!moment(ridesched[x].scheduletime).isSame(currsched[x].scheduletime)) {
                          allsched = false;
                          break;
                      }
                  }
                  if(allsched) {
                      console.log("ride found");
                      ridefound = true;
                      currRide.id = rides[z].id;
                      break;
                  }
              } else {
                  console.log("different schedule length");
              }
          }
          callback(itin, ridefound);
        });   
    } else {
      callback(itin, ridefound);
    };   
}


DataProvider.prototype.setRecord = function(record, callback) {
  var date = moment(record.date).format('YYYY-MM-DD');  
  query('SELECT * FROM records ' +
      'WHERE ride_id = $1 AND route_id = $2 AND date = $3', [record.ride_id, record.route_id, date], function(err, rows) {
      if(err) throw err;

      if(rows.length == 0) {
        query('INSERT INTO records (ride_id, route_id, date) VALUES ($1, $2, $3)', [record.ride_id, record.route_id, date], function(err,res) {
          if(err) throw err;

          console.log('Created a new record');
          callback(err);
        });
      } else {
        callback(err);
      }
  });
};

DataProvider.prototype.setRide = function(ride, callback) {
  query('INSERT INTO rides (route_id, itin_id, deptime) VALUES ($1, $2, $3) RETURNING id', [ride.route_id, ride.itin_id, ride.deptime], function(err,res){
    if(err) throw err;

    console.log('Created a new ride with ID:', res[0].id);
    callback(err, res[0].id);
  });
};

DataProvider.prototype.saveRide = function(itin_id, route_id, currRide, callback) {
  console.log("saving ride");
  console.log(currRide);
  var ride = {};
  ride.route_id = route_id;
  ride.itin_id = itin_id;
  ride.deptime = currRide.schedules[0].scheduletime.format("YYYY-MM-DD HH:mm:ss");
  DataProvider.prototype.setRide(ride, function(err, rid) {
    if(err) throw err;

    var record = {};
    record.date = moment().format("YYYY-MM-DD");
    record.route_id = route_id;
    record.ride_id = rid;
    DataProvider.prototype.setRecord(record, function(err, item){} );

    for(var i = 0; i < currRide.stopOrder.length; i++) {
      var sched = {};
      sched.ride_id = rid;
      sched.stop_id = currRide.stopOrder[i].stop_id;
      sched.scheduletime = currRide.schedules[i].scheduletime.format("YYYY-MM-DD HH:mm:ss");
      DataProvider.prototype.setSchedule(sched, function(error, item) {});
    }
    callback(err, rid);
  });
};


DataProvider.prototype.setItinerary = function(itinerary, callback) {
  query('INSERT INTO itineraries (route_id, description) VALUES ($1, $2) RETURNING id', [itinerary.route_id, itinerary.description], function(err,res){
    if(err) throw err;

    console.log('Created a new itinerary with ID:', res[0].id);
    callback(err, res[0].id);
  });
};

DataProvider.prototype.setSchedule = function(schedule, callback) {
  query('INSERT INTO schedules (ride_id, stop_id, scheduletime) VALUES ($1, $2, $3)', [schedule.ride_id, schedule.stop_id, schedule.scheduletime], function(err,res){
    if(err) throw err;

    console.log('Created a new schedule');
    callback(err);
  });
};

DataProvider.prototype.setItineraryStopSequence = function(items, callback) {
  async.each(items, function(item, loopCallback) {
    query('INSERT INTO itinerarystopsequence (itin_id, stop_id, seqnumber) VALUES ($1, $2, $3)', [item.itin_id, item.stop_id, item.seqnumber], function(err,res){
      if(err) throw err;

      console.log('Created a new itinerarystopsequence');
      loopCallback(err, res);
    });
  }, function(err) {
    callback(err);
  });
  
};


DataProvider.prototype.getBuses = function(depId, arrId, route, callback) {
  var results = [];

  var fetch = false;
  console.log(route);
  //We get all the itineraries for this route
  query('SELECT id FROM itineraries ' +
            'WHERE route_id = $1', [route.route_id], function(err, rows) {
              if(err) throw err;
              //then find all those that have a sequence depstop/arrstop
              if(rows.length > 0) {
                  var iti = _.map(rows, 'id');
                  console.log(iti);

                  var allParams = iti.concat([depId, arrId]);
                  var params = _.map(iti, function(itin, idx) {
                    return '$' + (idx + 1);
                  });
                
                  query('SELECT DISTINCT a.itin_id ' + 
                    'FROM itinerarystopsequence AS a ' +
                    'JOIN itinerarystopsequence AS b ON a.itin_id=b.itin_id ' +
                    'WHERE a.itin_id IN (' + params.join(',') + ') AND a.stop_id = $' + (iti.length + 1) + ' ' +
                    'AND b.stop_id =$' + (iti.length + 2) + ' ' +
                    'AND b.seqnumber > a.seqnumber', allParams, function(err, rows) {
        
                    if(err) throw err;

                    if(rows.length > 0) {
                      console.log("Found " + rows.length + " compatible itineraries");

                      var itins = _.map(rows, 'itin_id');

                      //Then we want all recorded schedules for rides on the target itineraries for today, 
                      //filter those departing earlier than our deptime
                      DataProvider.prototype.getItinerarySchedules(itins, depId, arrId, route, function(err, res, fetch) {
                        callback(err, res, fetch);
                      });
                    } else {
                      console.log("Didnt' find any itinerary with given stop sequence");
                      //It means that the good sequence must be in the other direction
                      fetch = false;
                      callback(err, null, fetch);
                    }
                  });
              } else {
                console.log("No itinerary found");
                //It probably means the databse is not populated for this route, we go fetch it
                fetch = true;
                callback(err, null, fetch);
              }
    });
  }

DataProvider.prototype.getItinerarySchedules = function(itins, depId, arrId, route, callback) {
  var scheduleTime = moment().year(1970).month(0).date(1).seconds(0).subtract(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');
  console.log(scheduleTime);
  var today = moment().format('YYYY-MM-DD');
  
  var allParams = itins.concat([today, depId, arrId, scheduleTime]);
  var params = _.map(itins, function(itin, idx) {
    return '$' + (idx + 1);
  });

  query('SELECT * FROM records JOIN rides ON records.ride_id = rides.id ' +
            'JOIN schedules ON schedules.ride_id = rides.id ' +
            'WHERE itin_id IN (' + params.join(',') + ') AND date = $' + (itins.length + 1) + ' ' +
            'AND stop_id IN ($' + (itins.length + 2) + ", $" + (itins.length + 3) + ') ' +
            'AND scheduletime >= $' + (itins.length + 4), allParams, function(err,records) {
      if(err) throw err;

      console.log("Found " + records.length + " schedules");

      if(records.length > 0) {
        //Send results
        fetch = false;
        query('SELECT * FROM stops WHERE id = $1', [depId], function(err, stops) {
          
          //Group records by ride and take only those having 2 schedules (departure and arrival)
          var rides = _(records)
                       .groupBy("ride_id")
                       .filter(r => r.length == 2)
                       .sortBy("scheduletime")
                       .value();
          

          var results = [];
          for (var res in rides ) {
              var result = {};
              result.lineName = route.linename;
              result.direction = route.directionid;
              result.directionDisplay = route.directiondisplay;
              result.depStop = stops[0].stopname;
              result.depHour = moment(rides[res][0].scheduletime);
              result.arrHour = moment(rides[res][1].scheduletime);
              if(results.length > 0 && (moment(result.depHour).isSame(results[results.length - 1].depHour))) {
                results[results.length - 1].doubled = true;
              } else {
                results.push(result);
              }
          }
          callback(err, results, fetch);
        });
      } else {
        //No results. So what do we fetch?
        
        var allParams = itins.concat([today]);
        var params = _.map(itins, function(itin, idx) {
          return '$' + (idx + 1);
        });

        query('SELECT * FROM records JOIN rides ON records.ride_id = rides.id ' +
            'WHERE itin_id IN (' + params.join(',') + ') AND date = $' + (itins.length + 1), allParams, function(err,rows) {
            
            if(err) throw err;

            if(rows.length > 0) {
              console.log("found some records " + rows.length);
              //It means that there is a record for today for the given itineraries, but no matching results.
              //It means that we don't need to scrape
              fetch = false;
            } else {
              //It means that there is no record for today, so let's go fetch them
              fetch = true;
            }
            callback(err, null, fetch);
        })
      }
  });
};

DataProvider.prototype.saveChatMessage = function(lineid, username, message, callback) {
  //First, we check if the room for the bus line exists
  console.log("line " + lineid);
  console.log("user " + username);
  console.log("message " + message );

  query('SELECT EXISTS ( ' +
      'SELECT 1 ' +
      'FROM   pg_catalog.pg_class c ' +
      'JOIN   pg_catalog.pg_namespace n ON n.oid = c.relnamespace ' +
      'AND    c.relname = $1 ' +
      'AND    c.relkind = \'r\'' +
    ');', ["room_" + lineid], function(err,res) {
    if(err) throw err;
    console.log(res);
    if(res[0].exists == true) {
      console.log("the table exists");
      insertMessage();
    } else {
      console.log("The table does not exits, creating it");
      query("CREATE TABLE room_" + lineid + "(" +
             "id bigserial NOT NULL," +
             "message text," +
             "username text," +
             "time timestamp," +
             "type text," +
             "PRIMARY KEY (id)" +
             ")" , function(err,rows){
        if(err) throw err;

        console.log("room_" + lineid + ' table created');
        insertMessage();
      });
    }
  });

  var insertMessage = function() {
    var time = moment().format('YYYY-MM-DD HH:mm:ss');
    query('INSERT INTO room_' + lineid + ' (message, username, time, type) VALUES ($1, $2, $3, $4)', [message, username, time, "text"], function(err,res){
      if(err) throw err;

      console.log('Message saved!');
      console.log(res);
      callback(err, res);
    });
  } 
};

DataProvider.prototype.getMessages = function(lineid, index, qty, callback) {
    query('SELECT * FROM room_' + lineid + ' ' +
      'ORDER BY id DESC LIMIT $1', [index + qty], function(err, rows) {
      if(err) throw err;

      var filteredRows = rows.splice(index, qty);
      callback(err, filteredRows);
    });
};

exports.DataProvider = DataProvider;