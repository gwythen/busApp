define([
  'backbone',
  'module',
], function(
  Backbone,
  module
) {
	var ChatMessage = Backbone.Model.extend({
		defaults: {
			sender: "",
			message: "",
			time: (new Date()).getTime(),
			type: "text"
		},
		getPurified: function(){
			var cleanText = this.get("message").replace(/shit|damn|crap|fuck/, '****');
			this.set('message', cleanText);
			return cleanText;
		},
		initialize: function(model){
			this.getPurified();
		}
	});
	return ChatMessage;
});