var moment = require('moment'),
    request = require('request'),
    jsdom = require('jsdom').jsdom,
    async = require('async');


BusScraper = function(DataProvider) {
	return {
		getWebPage: function(url, callback) {
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
		},

		scrapeBuses: function(depId, arrId, lineid, directionid, mainCallback) {
			var that = this;
		    DataProvider.getDirectedRoute(lineid, directionid, function(error, route) {
		        DataProvider.getStop(depId, function(error, stop) {
		        	DataProvider.getRouteItineraries(route.id, function(error, itineraries) {
		        		DataProvider.getRouteStops(route.id, function(error, stops) {
		        			var directedRoute = route;
				            var today = moment();
				            var url = "http://www.ceparou06.fr/horaires_ligne/index.asp?rub_code=6&thm_id=0&lign_id=" + directedRoute.lineoriginalid + "&sens=" + directedRoute.directionid + "&date=" + today.format("DD") + "%2F" + today.format("MM") + "%2F" + today.format("YYYY") + "&index=";
				            console.log(url);
				            var currIndex = 1;
				            var maxIndex = 2;
				            var totalRides = [];
				            var stopName = stop.stopName;
				            var MS_PER_MINUTE = 60000;
				            var results = [];

				            async.doWhilst(
				                function (docallback) {
				                    async.waterfall([
				                        function(callback) {
				                            that.getWebPage(url+currIndex, function(body) {
				                                callback(null, body);
				                            });
				                        },
				                        function(body, callback) {
				                            that.parseTimetable(body, stops, function(rides, curr, max) {
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
				                        var date = new Date();

				                        var currentTime = new Date(1970, 0, 1, date.getHours(), date.getMinutes(), 0, 0);
				                        currentTime = new Date(currentTime.getTime() - 5 * MS_PER_MINUTE);

				                        async.eachSeries(totalRides, function(currRide, loopCallback) {
				                            async.waterfall([
				                                function(callback) {
				                                    DataProvider.checkRideExistence(itineraries, currRide, function(itin, ridefound){
				                                        callback(null, itin, ridefound);
				                                    });
				                                },
				                                function(itin, ridefound, callback) {
				                                    that.populateDatabase(itin, ridefound, currRide, directedRoute, itineraries, function() {
				                                        callback();
				                                    });
				                                }
				                            ], function (err) {
				                                var result = {};
				                                result.lineName = directedRoute.linename;
				                                result.depStop = stopName;
				                                result.directionDisplay = directedRoute.directiondisplay;
				                                var depfound = false;
				                                for (var j = 0; j < currRide.schedules.length; j++) {
				                                  var currSchedule = currRide.schedules[j];
				                                  if(!depfound) {
				                                    if(currSchedule.stop.toString() == depId && currSchedule.scheduletime.getTime() >= currentTime.getTime()) {
				                                      if(results.length > 0 && currSchedule.scheduletime.getTime() == results[results.length - 1].depHour.getTime()) {
				                                        results[results.length - 1].doubled = true;
				                                        break;
				                                      } else {
				                                        result.depHour = currSchedule.scheduletime;
				                                        depfound = true;
				                                      }
				                                    }
				                                  } else {
				                                    if(currSchedule.stop.toString() == arrId && currSchedule.scheduletime.getTime() > currentTime.getTime()) {
				                                      result.arrHour = currSchedule.scheduletime;
				                                      results.push(result);
				                                      break;
				                                    }
				                                  } 
				                                }

				                                loopCallback();
				                            });
				                        }, function(err) {
				                            if(results.length > 5) {
				                                results = results.splice(0,5);
				                            }
				                            mainCallback(results);
				                        });
				                    }  else {
				                        mainCallback(results);
				                    }
				                }
				            );
			        	});
		        	});
		        });
		    });
		},

		parseTimetable: function(body, stops, callback) {		
		    var subWindow = jsdom(body).defaultView;
		    subWindow.Image = function () { };
		    var $ = require('jquery')(subWindow);
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
		                if(stops[z].originalid == stopId) {
		                    currStopDbId = stops[z].id;
		                    found = true;
		                    break;
		                }
		            }
		            if(!found) {
		            	// there is a schedule at an unknown stop. This should not happen
		            }
		            var rowColumns = $(rows[i]).children(".horaire");
		            for(var k = 0; k < rowColumns.length; k++) {
		                if($(rowColumns[k]).text() != "|"){
		                    var schedule = {};
		                    schedule.stop = currStopDbId;
		                    var time = $(rowColumns[k]).text().split(":");

		                    var scheduletime = new Date(Date.UTC(1970, 0, 1));
		                    scheduletime.setHours(parseInt(time[0]));
		                    scheduletime.setMinutes(parseInt(time[1]));

		                    schedule.scheduletime = scheduletime;
		                    rides[k].stopOrder.push({stop_id: schedule.stop});
		                    rides[k].schedules.push(schedule);
		                }
		            }
		        }
		    }
		    callback(rides, currIndex, maxIndex);
		},

		populateDatabase: function(itin, ridefound, currRide, directedRoute, allItineraries, callback) {
			//If the ride was not found in the db, we add it, as well as eventual schedules, itineraries etc
			if(!ridefound) {
				if(itin === null) {
					var itinerary = {};
					itinerary.route_id = directedRoute.id;
					DataProvider.setItinerary(itinerary, function(error, itin) {
						if(itin) {
		                    console.log("itinerary saved to the database");
		                    var allItin = {};
		                    allItin.route_id = directedRoute.id;
		                    allItin.id = itin.insertId;
		                    allItin.stopOrder = [];
		                    for(var i = 0; i < currRide.stopOrder.length; i++) {
								var item = {};
								item.itin_id = itin.insertId;
								item.stop_id = currRide.stopOrder[i].stop_id;
								item.seqnumber = i;
								allItin.stopOrder.push(item);
							}

							DataProvider.setItineraryStopSequence(allItin.stopOrder, function(error, item) {
								allItineraries.push(allItin);
							});
							DataProvider.saveRide(itin.insertId, directedRoute.id, currRide, function(error, ride) {
								callback(null);
							});
							
		                } else {
		                   console.log("Error: itinerary not saved");
		                }
					});
				} else {
					DataProvider.saveRide(itin.id, directedRoute.id, currRide, function(error, ride) {
						callback(null);
					});
				}
			} else {
				//Otherwise, we just add a record
			    var record = {};
			    var date = new Date();
			    record.date = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0,0));
			    record.route_id = directedRoute.id;
			    record.ride_id = currRide.id;
			    DataProvider.setRecord(record, function(err, item){} );
			    callback();
			}
		}
	}
};

exports.BusScraper = BusScraper;