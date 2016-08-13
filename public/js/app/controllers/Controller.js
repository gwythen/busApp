define(['App', 'backbone', 'marionette', 'views/WelcomeView', 'views/HeaderView', 'views/NextBusView', 'models/BusSearch', 'models/ErrorMessage', 'views/ErrorView', 'views/SwipableLayout', 'views/LoadingView', 'views/ChatView', 'socketio'],
    function (App, Backbone, Marionette, WelcomeView, HeaderView, NextBusView, BusSearch, ErrorMessage, ErrorView, SwipableLayout, LoadingView, ChatView, io) {
    return Backbone.Marionette.Controller.extend({
        initialize:function (options) {
            App.headerRegion.show(new HeaderView());
            this.search = new BusSearch();
        },

        index:function () {
            if(this.search.hasParameters()) {
                this.joinChatRoom();
                this.fetchResults();
            } else {
                App.appRouter.navigate("/settings", true);
                // this.settings();
            }
        },

        settings: function() {
            var welcome = new WelcomeView({model: this.search});
            App.mainRegion.show(welcome);
            document.body.className += "settings";
            welcome.on("fetchResults", function() {
                this.joinChatRoom();
                App.appRouter.navigate("", true);
            }, this);
        },

        chat: function() {
            if(this.search.hasParameters()) {
                this.joinChatRoom(function() {
                    var chat = new ChatView();
                    App.mainRegion.show(chat);
                });
            } else {
                App.appRouter.navigate("/settings", true);
                // this.settings();
            }
            
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

        joinChatRoom: function(callback) {
            var username = "yoyo";
            var color = this.getUsernameColor(username);
            var room = "ROOM";

            App.socket = io.connect("http://localhost:8080");

            App.socket.on('connect', function(){
                App.socket.emit('add user', {user: username, color: color, room: room});
                callback();
            });            
        },

        getUsernameColor: function(username) {
            var COLORS = [
              '#e21400', '#91580f', '#f8a700', '#f78b00',
              '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
              '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
            ];
          // Compute hash code
          var hash = 7;
          for (var i = 0; i < username.length; i++) {
             hash = username.charCodeAt(i) + (hash << 5) - hash;
          }
          // Calculate color
          var index = Math.abs(hash % COLORS.length);
          return COLORS[index];
        },

    });
});