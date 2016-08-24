define(['App', 'backbone', 'marionette', 'moment', 'views/WelcomeView', 'views/HeaderView', 'views/NextBusView', 'models/BusSearch', 'models/ErrorMessage', 'collections/ChatCollection', 'views/ErrorView', 'views/SwipableLayout', 'views/LoadingView', 'views/ChatView', 'socketio'],
    function (App, Backbone, Marionette, moment, WelcomeView, HeaderView, NextBusView, BusSearch, ErrorMessage, ChatCollection, ErrorView, SwipableLayout, LoadingView, ChatView, io) {
    return Backbone.Marionette.Controller.extend({
        initialize:function (options) {
            this.headerView = new HeaderView();
            App.headerRegion.show(this.headerView);
            this.search = new BusSearch();
            this.joinedChat = false;
        },

        index:function () {
            if(this.search.hasParameters()) {
                if(!this.joinedChat) {
                    this.joinChat();
                }
                
                this.fetchResults();
            } else {
                App.appRouter.navigate("/settings", true);
            }
        },

        settings: function() {
            var welcome = new WelcomeView({model: this.search});
            App.mainRegion.show(welcome);
            document.body.className += "settings";
            welcome.on("fetchResults", function() {
                if(!this.joinedChat) {
                    this.joinChat();
                }
                App.appRouter.navigate("", true);
            }, this);
        },

        chat: function() {
            var that = this;
            if(this.search.hasParameters()) {
                if(!this.joinedChat) {
                    this.joinChat(function() {
                        that.showChat();
                    });
                } else {
                    that.showChat();
                }
            } else {
                App.appRouter.navigate("/settings", true);
            }
        },

        showChat: function() {
            this.chatCollection = new ChatCollection();
            this.chatCollection.comparator = function (collection) {
                return moment(collection.get('time')).valueOf();
            };
            this.chatCollection.meta("lineid", this.search.get("line").id);
            this.chatCollection.fetch({
               add: true,
               add: true,
               update: true
            });
            var chat = new ChatView({line: this.search.get("line"), collection: this.chatCollection});
            document.body.className = "chat";

            this.listenTo(this.chatCollection, 'add remove', function() {
              this.headerView.updateBadge(this.chatCollection);
            });
            App.mainRegion.show(chat);
        },

        fetchResults: function(params) {
            App.mainRegion.show(new LoadingView());
            var self = this;
            var searchParams = params ? params : {};
            this.search.set(params);
            this.search.fetch().done(function (data) {
                var results = self.search.get('results');
                if(results.length > 0) {
                    var layout = new SwipableLayout();
                    document.body.className = "";
                    App.mainRegion.show(layout);
                    for(var i=0; i < results.length; i++) {
                        var nextBusView = new NextBusView({model: results.models[i]});
                        layout.add(nextBusView, results.models[i].get("depHour"));
                        nextBusView.on("fetchResults", function(params) {
                            this.fetchResults(params);
                        }, self);
                    }
                    layout.show();
                } else {
                    var error = new ErrorMessage();
                    error.set("message", "No results found");
                    error.set("type", "notFound");
                    document.body.className = "";
                    App.mainRegion.show(new ErrorView({model: error}));
                }
            });
        },

        joinChat: function(callback) {
            App.socket = io();
            var that = this;
            App.socket.on('connect', function(){
                that.joinedChat = true;
                callback ? callback() : null;
            });            
        },

    });
});