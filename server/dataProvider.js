var mysql = require('mysql'),
    fs = require('fs'),
    async = require('async'),
    moment = require('moment'),
    _ = require('lodash');

var DBInitializer = require('./initializeDB');

DataProvider = function(host, port) {
  // First you need to create a connection to the db
  con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "thendon",
    database: "busApp"
  });

  con.connect(function(err){
    if(err){
      console.log('Error connecting to Db');
      return;
    }
    console.log('Connection established');
  });

  // con.end(function(err) {
  //   // The connection is terminated gracefully
  //   // Ensures all previously enqueued queries are still
  //   // before sending a COM_QUIT packet to the MySQL server.
  // });
};


DataProvider.prototype.reset = function(mainCallback) {
 const tables = ["stopsbyroute", "itinerarystopsequence", "schedules", "observations", "records", "rides", "itineraries", "stops", "directedroutes", "lines"];

  tables.forEach(function(table) {
    
    con.query('DROP TABLE IF EXISTS `' + table + '`',function(err,rows){
      if(err) throw err;

      console.log('Table ' + table + ' removed');
    });

  });
  
  var BusScraper = require('./busScraper').BusScraper;
  var BusScraper = new BusScraper(this);

  DBInitializer.initializeDB(con, BusScraper, function() {
    DBInitializer.initializeLines();
  });
}; 

DataProvider.prototype.getStop = function(stopId, callback) {
  con.query('SELECT * FROM stops WHERE id = ?', stopId ,function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.getLine = function(lineName, callback) {
  con.query('SELECT * FROM lines WHERE linename = ?', lineName ,function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.searchLine = function(query, callback) {
  con.query("SELECT * FROM `lines` WHERE linename LIKE " + con.escape('%'+query+'%'), function(err,rows){
    if(err) throw err;

    callback(err, rows);
  });
};

DataProvider.prototype.getDirectedRoute = function(lineid, directionid, callback) {
  con.query('SELECT directedroutes.id as id, directiondisplay, directionid, line_id, linename, lineoriginalid ' + 
            'FROM directedroutes JOIN `lines` ON directedroutes.line_id = lines.id ' + 
            'WHERE line_id = ? AND directionid = ?', [lineid, directionid], function(err,rows){
    if(err) throw err;

    callback(err, rows.length > 0 ? rows[0] : null);
  });
};

DataProvider.prototype.getLineRoutes = function(lineid, callback) {
  console.log("line " + lineid);
  con.query('SELECT * FROM directedroutes ' + 
            'WHERE line_id = ?', lineid, function(err,rows) {
    if(err) throw err;

    callback(err, rows);
  });
};

DataProvider.prototype.getLineStops = function(lineid, callback) {
    con.query('SELECT stops.id as id, directiondisplay, directionid, latitude, line_id, localitycode, logicalid, longitude, operatorid, operatorname, originalid, route_id, stopname, linename ' +
      'FROM stopsbyroute ' +
      'JOIN stops ON stops.id = stopsbyroute.stop_id ' +
      'JOIN directedroutes ON stopsbyroute.route_id = directedroutes.id ' +
      'JOIN `lines` ON directedroutes.line_id = lines.id ' + 
      'WHERE line_id = ?', lineid, function(err, rows) {
      if(err) throw err;
      var stops = _.groupBy(rows, "directionid");
      
      callback(err, stops);
    });
};

DataProvider.prototype.getRouteStops = function(routeid, callback) {
    con.query('SELECT * FROM stopsbyroute ' +
      'JOIN stops ON stops.id = stopsbyroute.stop_id ' +
      'WHERE route_id = ?', routeid, function(err, rows) {
      if(err) throw err;

      callback(err, rows);
    });
};


DataProvider.prototype.getRouteItineraries = function(routeId, callback) {
    con.query('SELECT * FROM itinerarystopsequence ' + 
      'JOIN stops ON itinerarystopsequence.stop_id = stops.id ' + 
      'JOIN itineraries ON itinerarystopsequence.itin_id = itineraries.id ' + 
      'WHERE itineraries.route_id = ?', routeId, function(err, rows) {
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
    con.query('SELECT * FROM schedules JOIN rides ON schedules.ride_id = rides.id ' +
      'WHERE rides.itin_id = ?', itinId, function(err, rows) {
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
  con.query('SELECT * FROM records ' +
      'WHERE ride_id = ? AND route_id = ? AND date = ?', [record.ride_id, record.route_id, date], function(err, rows) {
      if(err) throw err;

      if(rows.length == 0) {
        con.query('INSERT INTO records SET ?', record, function(err,res) {
          if(err) throw err;

          console.log('Created a new record with ID:', res.insertId);
          callback(err, res);
        });
      } else {
        callback(err, rows[0]);
      }
  });
};

DataProvider.prototype.setRide = function(ride, callback) {
  con.query('INSERT INTO rides SET ?', ride, function(err,res){
    if(err) throw err;

    console.log('Created a new ride with ID:', res.insertId);
    callback(err, res);
  });
};

DataProvider.prototype.saveRide = function(itin_id, route_id, currRide, callback) {
  console.log("saving ride");
  console.log(currRide);
  var ride = {};
  ride.route_id = route_id;
  ride.itin_id = itin_id;
  ride.deptime = currRide.schedules[0].scheduletime.format("YYYY-MM-DD HH:mm:ss");
  DataProvider.prototype.setRide(ride, function(err, r) {
    if(err) throw err;

    var record = {};
    record.date = moment().format("YYYY-MM-DD");
    record.route_id = route_id;
    record.ride_id = r.insertId;
    DataProvider.prototype.setRecord(record, function(err, item){} );

    for(var i = 0; i < currRide.stopOrder.length; i++) {
      var sched = {};
      sched.ride_id = r.insertId;
      sched.stop_id = currRide.stopOrder[i].stop_id;
      sched.scheduletime = currRide.schedules[i].scheduletime.format("YYYY-MM-DD HH:mm:ss");
      DataProvider.prototype.setSchedule(sched, function(error, item) {});
    }
    callback(err, r);
  });
};


DataProvider.prototype.setItinerary = function(itinerary, callback) {
  con.query('INSERT INTO itineraries SET ?', itinerary, function(err,res){
    if(err) throw err;

    console.log('Created a new itinerary with ID:', res.insertId);
    callback(err, res);
  });
};

DataProvider.prototype.setSchedule = function(schedule, callback) {
  con.query('INSERT INTO schedules SET ?', schedule, function(err,res){
    if(err) throw err;

    console.log('Created a new schedule with ID:', res.insertId);
    callback(err, res);
  });
};

DataProvider.prototype.setItineraryStopSequence = function(items, callback) {
  var postData = [items.length];
  for( var i = 0; i < items.length; i++){
     postData[i] = [ items[i].itin_id, items[i].stop_id, items[i].seqnumber ];
  };
  con.query('INSERT INTO itinerarystopsequence (itin_id, stop_id, seqnumber) VALUES ?', [postData], function(err,res){
    if(err) throw err;

    console.log('Created a new itinerarystopsequence with ID:', res.insertId);
    callback(err, res);
  });
};


DataProvider.prototype.getBuses = function(depId, arrId, route, callback) {
  var results = [];

  var fetch = false;
  console.log(route);
  //We get all the itineraries for this route
  con.query('SELECT id FROM itineraries ' +
            'WHERE route_id = ?', route.route_id, function(err, rows) {
              if(err) throw err;
              //then find all those that have a sequence depstop/arrstop
              if(rows.length > 0) {
                  var iti = _.map(rows, 'id');
                  console.log(iti);
                  con.query('SELECT DISTINCT a.itin_id ' + 
                    'FROM itinerarystopsequence AS a ' +
                    'JOIN itinerarystopsequence AS b ON a.itin_id=b.itin_id ' +
                    'WHERE a.itin_id IN (?) AND a.stop_id = ? ' + 
                    'AND b.stop_id = ? ' +
                    'AND b.seqnumber > a.seqnumber', [iti, depId, arrId], function(err, rows) {
        
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
  
  con.query('SELECT * FROM records JOIN rides ON records.ride_id = rides.id ' +
            'JOIN schedules ON schedules.ride_id = rides.id ' +
            'WHERE itin_id IN (?) AND date = ? ' +
            'AND stop_id IN (?) ' +
            'AND scheduletime >= ?', [itins, today, [depId, arrId], scheduleTime], function(err,records) {
      if(err) throw err;

      console.log("Found " + records.length + " schedules");

      if(records.length > 0) {
        //Send results
        fetch = false;
        con.query('SELECT * FROM stops WHERE id = ?', depId, function(err, stops) {
          
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
          console.log(results);
          callback(err, results, fetch);
        });
      } else {
        //No results. So what do we fetch?
        
        con.query('SELECT * FROM records JOIN rides ON records.ride_id = rides.id ' +
            'WHERE itin_id IN (?) AND date = ? ', [itins, today], function(err,rows) {
            
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
}
exports.DataProvider = DataProvider;