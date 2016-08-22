define([
	'backbone',
	'module',
	"models/ChatMessage"
], function(
	Backbone,
	module,
	ChatMessage
) {
var ChatCollection = Backbone.Collection.extend({
	urlRoot : "api/messages",
	initialize: function() {
        this._meta = {};
    },
	url: function() {
      var url = this.urlRoot;
      var lineid = this.meta("lineid");
      var index = this.meta("index") ? this.meta("index") : 0;
      var qty = this.meta("qty") ? this.meta("qty") : 20;

      url = url + "/" + lineid + "/?index=" + index + "&qty=" + qty;
      
      return url;
    },
	model: ChatMessage,
	meta: function(prop, value) {
        if (value === undefined) {
            return this._meta[prop]
        } else {
            this._meta[prop] = value;
        }
    },
	comparator: function(message){
		return message.get("time");
	}
});
  
  return ChatCollection;
});