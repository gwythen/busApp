define(['App', 'backbone', 'marionette', 'moment', 'controllers/ChatController', 'views/WelcomeView', 'views/HeaderView', 'views/NextBusView', 'models/BusSearch', 'models/ErrorMessage', 'collections/ChatCollection', 'views/ErrorView', 'views/SwipableLayout', 'views/LoadingView', 'views/ChatView', 'socketio'],
    function (App, Backbone, Marionette, moment, ChatController, WelcomeView, HeaderView, NextBusView, BusSearch, ErrorMessage, ChatCollection, ErrorView, SwipableLayout, LoadingView, ChatView, io) {
    return Backbone.Marionette.Controller.extend({
        initialize:function (options) {
            this.socketBus = _.extend({}, Backbone.Events);
            this.headerView = new HeaderView();
            App.headerRegion.show(this.headerView);
            this.search = new BusSearch();
            this.chatCollection = new ChatCollection();
            this.chatCollection.comparator = function (collection) {
                return moment(collection.get('time')).valueOf();
            };
            this.listenTo(this.chatCollection, 'add', function(newmodel) {
              this.headerView.onUpdate(this.chatCollection);
            });
            this.chatController = new ChatController({bus: this.socketBus, chatCollection: this.chatCollection});
        },

        index:function () {
            if(this.search.hasParameters()) {
                this.fetchResults();
            } else {
                App.appRouter.navigate("/settings", true);
            }
        },

        settings: function() {
            var welcome = new WelcomeView({model: this.search});
            App.appRegion.show(welcome);
            document.body.className += "settings";
            welcome.on("fetchResults", function() {
                App.appRouter.navigate("", true);
            }, this);
        },

        chat: function() {
            var that = this;
            if(this.search.hasParameters()) {
                this.chatController.joinChat(function(joined) {
                    if(joined) {
                        that.showChat();
                    } else {
                        App.appRouter.navigate("", true);
                    }
                });
            } else {
                App.appRouter.navigate("/settings", true);
            }
        },

        showChat: function() {
            this.chatCollection.reset();
            this.chatCollection.meta("lineid", this.search.get("line").id);
            this.chatCollection.fetch({
               add: true,
               add: true,
               update: true
            });
            var chat = new ChatView({line: this.search.get("line"), collection: this.chatCollection, bus: this.socketBus});
            document.body.className = "chat";
            App.appRegion.show(chat);
            this.headerView.onUpdate();
        },

        fetchResults: function(params) {
            App.appRegion.show(new LoadingView());
            var self = this;
            var searchParams = params ? params : {};
            this.search.set(params);
            this.search.fetch().done(function (data) {
                var results = self.search.get('results');
                if(results.length > 0) {
                    var layout = new SwipableLayout();
                    document.body.className = "";
                    App.appRegion.show(layout);
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
                    App.appRegion.show(new ErrorView({model: error}));
                }
            });
        },

        

    });
});