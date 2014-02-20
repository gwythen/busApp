define(["jquery","backbone","models/Stop", 'module'],
  function($, Backbone, Stop, module) {
    // Creates a new Backbone Collection class object
    var Stops = Backbone.Collection.extend({
      // Tells the Backbone Collection that all of it's models will be of type Model (listed up top as a dependency)
      model: Stop,
      parse: function(response) {
        return response.stops;
      }
    });

    Stops.out = new Stops(module.config().bootstrap[2]);
    Stops.in = new Stops(module.config().bootstrap[1]);
    return Stops;
  });