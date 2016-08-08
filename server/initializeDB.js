/*
Data Schema, top-down

Lines:
A top-level logical representation of a bus line (ex: line 230)

Directed Routes: 
A logical representation of a bus line in a direction. (ex: 230 Nice-Sophia)
It contains the list of all possible stops for the line, as well as the possible itineraries

Itinerary:
It's a physical instance of the Directed Route (ex: 230 Nice-Sophia through Santoline)
It contains an ordered sequence of stops as well as all the Rides
This is necessary because a bus line may stop at different stops based on time of day/season etc.

Ride:
A ride is a timed itinerary (ex. 230 Nice-Sophia through Santoline departing at 17:00)
It contains an array of expected times at each stop

Stop:
A bus stop, including geographical position and Id.
It contains also a logicalId, to easily retrieve the two physical stops for two directed routes
(ex: there are 2 physical stops named Gambetta-Promenade, on the opposite sides of the street,
one for line 230 directed to Sophia, the other for the same line from Sophia)

Record:
A dated record of bus rides. (ex: rides for line 230 to Sophia on 23/04/2016)
It contains all the Rides for a a Directed Route on a specific date.
This is the information ultimately provided to the user


Lines: linename | lineoriginalid
DirectedRoutes: directiondisplay | directionid | line_id
Stops: stopname | longitude | latitude | originalid | logicalid | localitycode | operatorid | operatorname
StopsByRoute: route_id | stop_id
Itineraries: route_id | description
ItineraryStopSequence: itin_id | stop_id | seqnumber
Rides: route_id | deptime | itin_id
Schedule: ride_id | stop_id | scheduletime
Records: date | route_id | ride_id

Relationships
Lines -> DirectedRoutes: one-to-many
DirectedRoutes -> Itineraries: one-to-many
DirectedRoutes -> StopsByRoute -> Stop: many-to-many
DirectedRoutes -> Ride: one-to-many
Itineraries -> Rides: one-to-many
Itineraries -> ItineraryStopSequence -> Stop: many-to-many 
Rides -> Schedules: one-to-many

*/

module.exports = {
	initializeDB: function(query, busScraper, mainCallback) {
		this.busScraper = busScraper;
		async.waterfall([
            function(callback) {
                query('CREATE TABLE lines (' +
	               "id bigserial NOT NULL," +
	               "linename text," + 
	               "lineoriginalid bigint," +
	               "PRIMARY KEY (id), " +
	               "CONSTRAINT lineidx UNIQUE (lineoriginalid)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Lines table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE directedroutes (" +
	               "id bigserial NOT NULL," +
	               "directiondisplay text," +
	               "directionid bigint," +
	               "line_id bigint," +
	               "FOREIGN KEY (line_id) REFERENCES lines (id)," + 
	               "PRIMARY KEY (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Directedroutes table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE itineraries (" +
	    	 	   "id bigserial NOT NULL," +
	    		   "route_id bigint," +
	               "FOREIGN KEY (route_id) REFERENCES directedroutes (id)," + 
	               "description text," +
	               "PRIMARY KEY (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Itineraries table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE stops (" +
	    	       "id bigserial NOT NULL," +
	    		   "stopname text," +
	    		   "longitude float," +
	    		   "latitude float," +
	    		   "originalid bigint," +
	    		   "logicalid bigint," +
	    		   "localitycode text," +
	    		   "operatorid bigint," +
	    		   "operatorname text," +
	    		   "PRIMARY KEY (id)," +
	    		   "CONSTRAINT originalidx UNIQUE (originalid)" +          
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Stops table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE stopsbyroute (" +
                   "id bigserial NOT NULL," +
	    		   "route_id bigint," +
	    		   "stop_id bigint," +
	    		   "PRIMARY KEY (id)," +
	               "FOREIGN KEY (route_id) REFERENCES directedroutes (id)," + 
	               "FOREIGN KEY (stop_id) REFERENCES stops (id)" + 
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Stopsbyroute table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE rides (" +
	    		   "id bigserial NOT NULL," +
	    		   "route_id bigint," +
	    		   "itin_id bigint," +
	    		   "deptime timestamp," +
	    		   "FOREIGN KEY (route_id) REFERENCES directedroutes (id)," +
	    		   "FOREIGN KEY (itin_id) REFERENCES itineraries (id)," +
	    		   "PRIMARY KEY (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Rides table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE schedules (" +
                   "id bigserial NOT NULL," +
	    		   "ride_id bigint," +
	    		   "stop_id bigint," +
	    		   "scheduletime timestamp," +
	    		   "PRIMARY KEY (id)," +
	    		   "FOREIGN KEY (ride_id) REFERENCES rides (id)," +
	    		   "FOREIGN KEY (stop_id) REFERENCES stops (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Schedules table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE itinerarystopsequence (" +
                   "id bigserial NOT NULL," +
	    		   "itin_id bigint," +
	    		   "stop_id bigint," +
	    		   "seqnumber bigint," +
	    		   "PRIMARY KEY (id)," +
	    		   "FOREIGN KEY (itin_id) REFERENCES itineraries (id)," +
	    		   "FOREIGN KEY (stop_id) REFERENCES stops (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Itinerarystopsequence table created');
			      callback();
			    });
            },
            function(callback) {
                query("CREATE TABLE records (" +
                   "id bigserial NOT NULL," +
	    		   "ride_id bigint," +
	    		   "route_id bigint," +
	    		   "date date," +
	    		   "PRIMARY KEY (id)," +
	    		   "FOREIGN KEY (route_id) REFERENCES directedroutes (id)," +
	    		   "FOREIGN KEY (ride_id) REFERENCES rides (id)" +
	               ")"
			      ,function(err,rows){
			      if(err) throw err;

			      console.log('Records table created');
			      callback();
			    });
            },

        ], function (err) {
        	mainCallback();
        });	    
	},

	initializeLines: function(query, mainCallback) {
		var that = this;
		this.busScraper.getAllLines(function(err, allLines) {
			console.log(allLines);
			allLines.forEach(function(line) {
				query('INSERT INTO lines (lineoriginalid, linename) values($1, $2) RETURNING id', [line.lineoriginalid, line.linename], function(err, res) {								
				  	if(err) {
				  		if (err.code == 23505) {
				  			//There already exist a record for this 
				  			query('SELECT * FROM lines WHERE lineoriginalid = $1', [line.lineoriginalid], function(err, res) {
				  				if(err) throw err;
				  				line.id = res[0].id;
				  				that.initializeStops(query, line, mainCallback);
				  			});
				  		} else {
				  			throw err;
				  		}
				  	} else {
				  		line.id = res[0].id;
				  		console.log('Line added: ', line.linename);
				  		that.initializeStops(query, line, mainCallback);
				  	}
				});
	    	});
		});
	},
	initializeStops: function(query, line, mainCallback) {
		var directedRoutes = {};

        //Adding the stops to the DB
        [1,2].forEach(function(direction) {
        	var linedir = line.directions[direction];
        	if(linedir.name) {
        		//Let's create the directed routes
	        	async.waterfall([
                    function(callback) {
                        query('INSERT INTO directedroutes (directiondisplay, directionid, line_id) values($1, $2, $3) RETURNING id', [linedir.name, direction, line.id], function(err, res) {
							if(err) throw err;

							console.log('Route added: ', linedir.name);
							callback(err, res[0].id);
						});
                    },
                    function(route, callback) {
						this.insertStopByRoute = function(route, stop, loopCallback) {
					  		//For each stop, we add a stopbyroute record
						  	query('INSERT INTO stopsbyroute (route_id, stop_id) values($1, $2)', [route, stop], function(err, res) {

								if(err) throw err;
								loopCallback();

							});
					  	}
					  	that = this;
					  	//Then we can create the stops
                        async.each(linedir.stops, function(stop, loopCallback) {
					    	console.log("looking for stop " + stop.stopname + " " + stop.originalid);
							query('INSERT INTO stops (stopname, longitude, latitude, originalid, logicalid, localitycode, operatorid, operatorname) values($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [stop.stopname, stop.longitude, stop.latitude, stop.originalid, stop.logicalid, stop.localitycode, stop.operatorid, stop.operatorname], function(err,res) {
								
							  	if(err) {
							  		if (err.code == 23505) {
							  			//There already exist a record for this 
							  			query('SELECT * FROM stops WHERE originalid = $1', [stop.originalid], function(err, res) {
							  				if(err) throw err;
							  				that.insertStopByRoute(route, res[0].id, loopCallback);
							  			});
							  		} else {
							  			throw err;
							  		}
							  	} else {
							  		console.log('Stop added: ', stop.stopname);
							  		that.insertStopByRoute(route, res[0].id, loopCallback);
							  	}
							});
						}, function(err) {
                    		callback(err);
                    	});
                   	}	  						
                ], function (err) {
                	mainCallback();
                });
        	}
        	
		});
	},
	getCG06Links: function() {
		return [
		"index.asp?rub_code=6&part_id=2&lign_id=493",
		"index.asp?rub_code=6&part_id=2&lign_id=498",
		"index.asp?rub_code=6&part_id=2&lign_id=459",
		"index.asp?rub_code=6&part_id=2&lign_id=464",
		"index.asp?rub_code=6&part_id=2&lign_id=482",
		"index.asp?rub_code=6&part_id=2&lign_id=497",
		"index.asp?rub_code=6&part_id=2&lign_id=454",
		"index.asp?rub_code=6&part_id=2&lign_id=458",
		"index.asp?rub_code=6&part_id=2&lign_id=463",
		"index.asp?rub_code=6&part_id=2&lign_id=468",
		"index.asp?rub_code=6&part_id=2&lign_id=472",
		"index.asp?rub_code=6&part_id=2&lign_id=477",
		"index.asp?rub_code=6&part_id=2&lign_id=481",
		"index.asp?rub_code=6&part_id=2&lign_id=467",
		"index.asp?rub_code=6&part_id=2&lign_id=461",
		"index.asp?rub_code=6&part_id=2&lign_id115",
		"index.asp?rub_code=6&part_id=2&lign_id=601",
		"index.asp?rub_code=6&part_id=2&lign_id=606",
		"index.asp?rub_code=6&part_id=2&lign_id=480",
		"index.asp?rub_code=6&part_id=2&lign_id=489",
		"index.asp?rub_code=6&part_id=2&lign_id=491",
		"index.asp?rub_code=6&part_id=2&lign_id=483",
		"index.asp?rub_code=6&part_id=2&lign_id=495",
		"index.asp?rub_code=6&part_id=2&lign_id=466",
		"index.asp?rub_code=6&part_id=2&lign_id=486",
		"index.asp?rub_code=6&part_id=2&lign_id=597",
		"index.asp?rub_code=6&part_id=2&lign_id=465",
		"index.asp?rub_code=6&part_id=2&lign_id=471",
		"index.asp?rub_code=6&part_id=2&lign_id=494",
		"index.asp?rub_code=6&part_id=2&lign_id=614",
		"index.asp?rub_code=6&part_id=2&lign_id=455",
		"index.asp?rub_code=6&part_id=2&lign_id=474",
		"index.asp?rub_code=6&part_id=2&lign_id=685"
		]
	}
}