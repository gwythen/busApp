define([ 'marionette', 'handlebars', 'moment', 'models/LocalStorage', 'text!templates/header.html', 'i18next'],
    function (Marionette, Handlebars, moment, LocalStorage, template, i18next) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),
            events: {
                'click #backButton' : 'onClickBack'
            },
            initialize: function() {
        		this.appData = LocalStorage.fetchFromLocalStorage();
        	},
            templateHelpers: function(){ 
              	return {
                	badgeCounter: function () {
                    	return this.newMessages ? this.newMessages.length : 0;
                	},
                	linename: function() {
                		this.appData = LocalStorage.fetchFromLocalStorage();
                		if(this.appData.line) {
                			return i18next.t("header-view.line") + this.appData.line.linename.split("-")[0];
                		} else {
                			return "";
                		}
                		
                	}
            	}
            },
            onUpdate: function(collection) {
            	if(window.location.href.indexOf("chat") != -1) {
            		this.updateLastSeen();
            	} else {
            		this.updateBadge(collection);
            	}
            },
            onShow: function() {
            	
            },
            updateBadge: function(collection) {
	            var lastSeen = this.appData.lastSeen ? moment(this.appData.lastSeen) : moment().subtract(1, 'years');
	            if(collection) {
	            	this.newMessages = collection.where(function(model) { return (model.get("type") != "typing" && (moment(model.get('time')).isAfter(lastSeen))); });
	            } else {
	            	this.newMessages = [];
	            }
	            
	            this.render();
            },
            updateLastSeen: function() {
            	this.appData.lastSeen = moment();
            	LocalStorage.setInLocalStorage({lastSeen: this.appData.lastSeen});
            	this.updateBadge();
            }, 
            onClickBack: function() {
            	Backbone.history.history.back();
            }
        });
    });