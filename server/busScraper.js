var moment = require('moment'),
    request = require('request'),
    jsdom = require('jsdom').jsdom,
    parseString = require('xml2js').parseString;
    async = require('async');
var DBInitializer = require('./initializeDB');

BusScraper = function(DataProvider) {
	return {
		getWebPage: function(url, callback) {
			console.log("fetching page " + url);
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
				            var stopName = stop.stopname;
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

				                        var currentTime = moment().year(1970).month(0).date(1).seconds(0).subtract(5, 'minutes');
				         
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
				                                result.lineName = directedRoute.linename.split(" - ")[0];
				                                result.depStop = stopName;
				                                result.directionDisplay = directedRoute.directiondisplay;
				                                result.directionid = directedRoute.directionid;
				                                var depfound = false;
				                                for (var j = 0; j < currRide.schedules.length; j++) {
				                                  var currSchedule = currRide.schedules[j];
				                                  if(!depfound) {
				                                    if(currSchedule.stop.toString() == depId && currentTime.isBefore(currSchedule)) {
				                                      if(results.length > 0 && currSchedule.scheduletime.isSame(results[results.length - 1].depHour)) {
				                                        results[results.length - 1].doubled = true;
				                                        break;
				                                      } else {
				                                        result.depHour = currSchedule.scheduletime;
				                                        depfound = true;
				                                      }
				                                    }
				                                  } else {
				                                    if(currSchedule.stop.toString() == arrId && currentTime.isBefore(currSchedule.scheduletime)) {
				                                      result.arrHour = currSchedule.scheduletime;
				                                      results.push(result);
				                                      break;
				                                    }
				                                  } 
				                                }

				                                loopCallback();
				                            });
				                        }, function(err) {
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

		                    var scheduletime = moment().year(1970).month(0).date(1).hours(parseInt(time[0])).minutes(parseInt(time[1])).seconds(0);

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
					DataProvider.setItinerary(itinerary, function(error, itinid) {
						if(itinid != undefined) {
		                    console.log("itinerary saved to the database");
		                    var allItin = {};
		                    allItin.route_id = directedRoute.id;
		                    allItin.id = itinid;
		                    allItin.stopOrder = [];
		                    for(var i = 0; i < currRide.stopOrder.length; i++) {
								var item = {};
								item.itin_id = itinid;
								item.stop_id = currRide.stopOrder[i].stop_id;
								item.seqnumber = i;
								allItin.stopOrder.push(item);
							}

							DataProvider.setItineraryStopSequence(allItin.stopOrder, function(error) {
								allItineraries.push(allItin);
								DataProvider.saveRide(itinid, directedRoute.id, currRide, function(error, rideid) {
									callback(null);
								});
							});
		                } else {
		                   console.log("Error: itinerary not saved");
		                }
					});
				} else {
					DataProvider.saveRide(itin.id, directedRoute.id, currRide, function(error, rideid) {
						callback(null);
					});
				}
			} else {
				//Otherwise, we just add a record
			    var record = {};
			    var date = new Date();

			    record.date = moment().format('YYYY-MM-DD');
			    record.route_id = directedRoute.id;
			    record.ride_id = currRide.id;
			    DataProvider.setRecord(record, function(err, item){
			    	callback();
			    });
			}
		},
		getAllLines: function(topCallback) {
			var that = this;
			var url = "http://www.ceparou06.fr/horaires_ligne/?rub_code=6&part_id=";
			//Networks have part_id starting from 2 to 7
			var currIndex = 2;
			var maxIndex = 7;
			//var maxIndex = 2;
			var allLines = [];
			async.doWhilst(
                function (docallback) {
                    async.waterfall([
                        function(callback) {
                            that.getWebPage(url+currIndex, function(body) {
                                callback(null, body);
                            });
                        },
                        function(body, callback) {
                            that.parseNetwork(body, function(linesLinks) {
                                callback(null, linesLinks);
                            });
                        },
                        function(linesLinks, callback) {
                            that.parseLines(linesLinks, function(err, lines) {
                                callback(null, lines);
                            });
                        }
  						
                    ], function (err, lines) {
                    	allLines = allLines.concat(lines);
                    	currIndex++;
                        docallback();
                    });
                },
                function () { return currIndex <= maxIndex; },
                function (err) {
                	//We still need to process the CG06 lines, that are not listed on the ceparou06 site
                	var linesLinks = DBInitializer.getCG06Links();
                	that.parseLines(linesLinks, function(err, lines) {
                		allLines = allLines.concat(lines);
                        topCallback(err, allLines);
                    });	
                 //topCallback(err, allLines);
                }
            )
		},
		parseNetwork: function(body, callback) {
			var subWindow = jsdom(body).defaultView;
		    subWindow.Image = function () { };
		    var $ = require('jquery')(subWindow);

		    var lines = [];
		    $('#lineList .lig').find('a').each(function() {
		    	var link = $(this).attr('href');
		    	if (lines.indexOf(link) == -1) {
			        lines.push(link);
			    } 
			});
			console.log(lines);
			callback(lines);
		},
		parseLines: function(linesLinks, callback) {
			var that = this;
			var currIndex = 0;
			var maxIndex = linesLinks.length - 1;
			//var maxIndex = 1;
			var allLines = [];
			async.doWhilst(
                function (docallback) {
                    async.waterfall([
                        function(callback) {
                            that.getWebPage("http://www.ceparou06.fr/horaires_ligne/" + linesLinks[currIndex], function(body) {
                                callback(null, body);
                            });
                        },
                        function(body, callback) {
                        	console.log("parsing page " + linesLinks[currIndex]);
                            that.parseLine(body, linesLinks[currIndex], function(err, line) {
                                callback(null, line);
                            });
                        }  						
                    ], function (err, line) {
                    	allLines.push(line);
                    	
                    	currIndex++;
                        docallback();
                    });
                },
                function () { return currIndex <= maxIndex; },
                function (err) {
                	console.log(allLines);
                	callback(err, allLines);
                }
            )
		},
		parseLine: function(body, link, docallback) {
			var that = this;
			var line = {};
			var subWindow = jsdom(body).defaultView;
		    subWindow.Image = function () { };
		    var $ = require('jquery')(subWindow);

		    line.lineoriginalid = link.split("lign_id=")[1];
		    line.linename = $($("#navigation span")[2]).text();
		    line.directions = {};
		    async.each([1,2], function(direction, callback) {
		    	line.directions[direction] = {};
			    line.directions[direction].name = $('label[for="sens' + direction + '"]').html();
			    that.getLineStops(line.lineoriginalid, direction, function(stops) {
			    	line.directions[direction].stops = stops;
			    	callback();
			    });
			}, function(err) {
			    // if any of the file processing produced an error, err would equal that error
			    if( err ) {
			      // One of the iterations produced an error.
			      console.log('something was wrong');
			    } else {
			   		console.log('Got a line!');
			      console.log(line);
			      docallback(err, line);
			    }
			});
		},

		getLineStops: function(lineid, directionid, docallback) {
			var that = this;
			console.log("getting stops for line: " + lineid + " direction: " + directionid);
			var mOptions = {
			    url: "http://www.ceparou06.fr/WebServices/JsonService/JSONService.asmx/getStopPointsBylineDirection",
			    json: {UID: "TSI006", idLine: lineid, direction: directionid},
			    processData: false,
			    contentType: "application/json",
			    type: "POST"
			  }
			  request.post(mOptions, function(error, response, body) {
			      that.parseStops(response, docallback);
			  });
		},
		parseStops: function(response, callback) {
			var stops = JSON.parse(JSON.stringify(response)).body;
			if(stops.length > 0) {
				stops.forEach(function(stop) {
					delete stop['__type'];
					delete stop['description'];
					delete stop['categorie'];
					delete stop['LocalityName'];
					delete stop['listLines'];
					delete stop['type'];
					delete stop['idNetwork'];
					delete stop['networkName'];
					delete stop['returnCode'];
					delete stop['idLink'];
					objRename(stop, "title", "stopname");
					objRename(stop, "id", "originalid");
					objRename(stop, "LocalityCode", "localitycode");
					objRename(stop, "idOperator", "operatorid");
					objRename(stop, "operatorName", "operatorname");
					objRename(stop, "logicalId", "logicalid");
				});
			}
			callback(stops);
		}
	}
};

var objRename = function (obj, oldName, newName) {
     // Do nothing if the names are the same
     if (oldName == newName) {
         return obj;
     }
    // Check for the old property name to avoid a ReferenceError in strict mode.
    if (obj.hasOwnProperty(oldName)) {
        obj[newName] = obj[oldName];
        delete obj[oldName];
    }
    return obj;
};

exports.BusScraper = BusScraper;