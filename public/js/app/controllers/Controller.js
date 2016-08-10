define(['App', 'backbone', 'marionette', 'views/WelcomeView', 'views/HeaderView', 'views/NextBusView', 'models/BusSearch', 'models/ErrorMessage', 'views/ErrorView', 'views/SwipableLayout', 'views/LoadingView'],
    function (App, Backbone, Marionette, WelcomeView, HeaderView, NextBusView, BusSearch, ErrorMessage, ErrorView, SwipableLayout, LoadingView) {
    return Backbone.Marionette.Controller.extend({
        initialize:function (options) {
            App.headerRegion.show(new HeaderView());
            this.search = new BusSearch();
        },

        index:function () {
            if(this.search.hasParameters()) {
                this.fetchResults();
            } else {
                App.appRouter.navigate("/settings", true);
                this.settings();
            }
        },

        settings: function() {
            var welcome = new WelcomeView({model: this.search});
            App.mainRegion.show(welcome);
            document.body.className += "settings";
            welcome.on("fetchResults", function() {
                App.appRouter.navigate("", true);
            }, this);
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
        }

    });
});