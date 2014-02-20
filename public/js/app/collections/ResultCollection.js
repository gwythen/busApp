define([
	'backbone',
	'module',
	"models/SearchResult"
], function(
	Backbone,
	module,
	SearchResult
) {
  var Results = Backbone.Collection.extend({
	model: SearchResult
  });
  
  return Results;
});