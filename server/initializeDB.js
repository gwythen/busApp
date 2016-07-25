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

var stops = [];
stops[1] = require('./Stops-230-1');
stops[2] = require('./Stops-230-2');


module.exports = {
	initializeDB: function(con, callback) {
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
	    		   "PRIMARY KEY (id)" +	               
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
	    		   "deptime timestamp," +
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
	    		   "scheduletime timestamp," +
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

	initializeLine: function(linename) {
		if(linename == "230") {
			var line = {};
			line.lineoriginalid = 468;
			line.linename = linename;
			con.query('INSERT INTO `lines` SET ?', line, function(err, res) {
				if(err) throw err;

				line.id = res.insertId;

				console.log('Line added: ', line.linename);

				var directedRoutes = {};

		        //Adding the stops to the DB
		        [1, 2].forEach(function(direction) {
		        	
		        	//Let's create the directed routes
		        	console.log("line id: ", line.id);
		        	directedRoutes[direction] = {
		        		directionDisplay: stops[direction][stops[direction].length - 1].stopName,
		        		directionid: direction,
		        		line_id: line.id
		        	};

		        	con.query('INSERT INTO `directedroutes` SET ?', directedRoutes[direction], function(err, res) {
						if(err) throw err;

						directedRoutes[direction].id = res.insertId;
						console.log('Route added: ', directedRoutes[direction].directionDisplay);
					});

		        	//Then we can create the stops
		        	stops[direction].forEach(function(stop) {
		        		con.query('INSERT INTO `stops` SET ?', stop, function(err,res){
						  	if(err) throw err;

						  	console.log('Stop added: ', stop.stopName);

						 	//For each stop, we add a stopbyroute record
						 	var stopbyroute = {};
						 	stopbyroute.route_id = directedRoutes[direction].id;
						 	stopbyroute.stop_id = res.insertId;
						  	con.query('INSERT INTO `stopsbyroute` SET ?', stopbyroute, function(err, res) {
								if(err) throw err;

								console.log('StopByRoute added');
							});
						});
		        	});
				});
			});
	    };
	}
}