define([ 'marionette', 'handlebars', 'moment', 'models/LocalStorage', 'text!templates/header.html'],
    function (Marionette, Handlebars, moment, LocalStorage, template) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),
            templateHelpers: function(){ 
              	var that = this;
              	return {
                	badgeCounter: function () {
                    	return that.newMessages ? that.newMessages.length : 0;
                	}
            	}
            },
            updateBadge: function(collection) {
            	if(window.location.href.indexOf("chat") == -1) {
            		var appData = LocalStorage.fetchFromLocalStorage();
	            	var lastSeen = appData.lastSeen ? moment(appData.lastSeen) : moment().subtract(1, 'years');
	            	this.newMessages = collection.where(function(model) { return (model.get("type") != "typing" && (moment(model.get('time')).isAfter(lastSeen))); });
	            	this.updateLastSeen();
	            	this.render();
            	} else {
            		this.updateLastSeen();
            	}
            },
            updateLastSeen: function() {
            	lastSeen = moment();
            	LocalStorage.setInLocalStorage({lastSeen: lastSeen});	
            }

        });
    });