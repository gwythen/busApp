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
	initializeDB: function(con, busScraper, callback) {
		this.busScraper = busScraper;
		con.query('CREATE TABLE `lines` (' +
	               "id int(11) NOT NULL AUTO_INCREMENT," +
	               "linename varchar(255)," + 
	               "lineoriginalid int(11)," +
	               "PRIMARY KEY (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Lines table created');
	    });

	    con.query("CREATE TABLE `directedroutes` (" +
	               "id int(11) NOT NULL AUTO_INCREMENT," +
	               "directiondisplay varchar(255)," +
	               "directionid int(11)," +
	               "line_id int(11)," +
	               "FOREIGN KEY (line_id) REFERENCES `lines` (id)," + 
	               "PRIMARY KEY (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Directedroutes table created');
	    });

	    con.query("CREATE TABLE `itineraries` (" +
	    	 	   "id int(11) NOT NULL AUTO_INCREMENT," +
	    		   "route_id int(11)," +
	               "FOREIGN KEY (route_id) REFERENCES `directedroutes` (id)," + 
	               "description varchar(255)," +
	               "PRIMARY KEY (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Itineraries table created');
	    });

	    con.query("CREATE TABLE `stops` (" +
	    	       "id int(11) NOT NULL AUTO_INCREMENT," +
	    		   "stopname varchar(255)," +
	    		   "longitude float," +
	    		   "latitude float," +
	    		   "originalid int(11)," +
	    		   "logicalid int(11)," +
	    		   "localitycode varchar(255)," +
	    		   "operatorid int(11)," +
	    		   "operatorname varchar(255)," +
	    		   "PRIMARY KEY (id)," +
	    		   "UNIQUE KEY `ix_original` (`originalid`)" +          
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Stops table created');
	    });

	    con.query("CREATE TABLE `stopsbyroute` (" +
	    		   "route_id int(11)," +
	    		   "stop_id int(11)," +
	               "FOREIGN KEY (route_id) REFERENCES `directedroutes` (id)," + 
	               "FOREIGN KEY (stop_id) REFERENCES `stops` (id)" + 
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Stopsbyroute table created');
	    });

	    con.query("CREATE TABLE `rides` (" +
	    		   "id int(11) NOT NULL AUTO_INCREMENT," +
	    		   "route_id int(11)," +
	    		   "itin_id int(11)," +
	    		   "deptime datetime," +
	    		   "FOREIGN KEY (route_id) REFERENCES `directedroutes` (id)," +
	    		   "FOREIGN KEY (itin_id) REFERENCES `itineraries` (id)," +
	    		   "PRIMARY KEY (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Rides table created');
	    });

	    con.query("CREATE TABLE `schedules` (" +
	    		   "ride_id int(11)," +
	    		   "stop_id int(11)," +
	    		   "scheduletime datetime," +
	    		   "FOREIGN KEY (ride_id) REFERENCES `rides` (id)," +
	    		   "FOREIGN KEY (stop_id) REFERENCES `stops` (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Schedules table created');
	    });

	    con.query("CREATE TABLE `itinerarystopsequence` (" +
	    		   "itin_id int(11)," +
	    		   "stop_id int(11)," +
	    		   "seqnumber int(11)," +
	    		   "FOREIGN KEY (itin_id) REFERENCES `itineraries` (id)," +
	    		   "FOREIGN KEY (stop_id) REFERENCES `stops` (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Itinerarystopsequence table created');
	    });

	    con.query("CREATE TABLE `records` (" +
	    		   "ride_id int(11)," +
	    		   "route_id int(11)," +
	    		   "date date," +
	    		   "FOREIGN KEY (route_id) REFERENCES `directedroutes` (id)," +
	    		   "FOREIGN KEY (ride_id) REFERENCES `rides` (id)" +
	               ") ENGINE=InnoDB  DEFAULT CHARSET=utf8 AUTO_INCREMENT=1"
	      ,function(err,rows){
	      if(err) throw err;

	      console.log('Records table created');
	      callback();
	    });
	},

	initializeLines: function() {

		this.busScraper.getAllLines(function(err, allLines) {
			console.log(allLines);
			allLines.forEach(function(line) {
				var linerec = {};
				linerec.lineoriginalid = line.lineoriginalid;
				linerec. linename = line.linename;
				con.query('INSERT INTO `lines` SET ?', linerec, function(err, res) {
					if(err) throw err;

					line.id = res.insertId;

					console.log('Line added: ', line.linename);

					var directedRoutes = {};

			        //Adding the stops to the DB
			        [1,2].forEach(function(direction) {
			        	var linedir = line.directions[direction];
			        	if(linedir.name) {
			        		//Let's create the directed routes

				        	directedRoutes[direction] = {
				        		directionDisplay: linedir.name,
				        		directionid: direction,
				        		line_id: line.id
				        	};

				        	con.query('INSERT INTO `directedroutes` SET ?', directedRoutes[direction], function(err, res) {
								if(err) throw err;

								directedRoutes[direction].id = res.insertId;
								console.log('Route added: ', directedRoutes[direction].directionDisplay);
							});

				        	//Then we can create the stops
				        	linedir.stops.forEach(function(stop) {
								console.log("looking for stop " + stop.stopname + " " + stop.originalid);
								con.query('INSERT INTO `stops` SET ? ' +
										  'ON DUPLICATE KEY UPDATE id= LAST_INSERT_ID(id)', stop, function(err,res) {
								  	if(err) throw err;
								  	console.log('Stop added: ', stop.stopname);
								  	addStopByRoute(res.insertId);
								});

				        		var addStopByRoute = function(stopid) {
				        			
								 	//For each stop, we add a stopbyroute record
								 	var stopbyroute = {};
								 	stopbyroute.route_id = directedRoutes[direction].id;
								 	stopbyroute.stop_id = stopid;
								  	con.query('INSERT INTO `stopsbyroute` SET ?', stopbyroute, function(err, res) {
										if(err) throw err;

									});
				        		} 
							});
			        	}
			        	
					});
				});
	    	});
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
		"index.asp?rub_code=6&part_id=2&lign_id=1115",
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