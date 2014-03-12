define(['jquery', 'backbone', 'marionette', 'underscore', 'handlebars'],
    function ($, Backbone, Marionette, _, Handlebars) {
        var App = new Backbone.Marionette.Application();

        //Organize Application into regions corresponding to DOM elements
        //Regions can contain views, Layouts, or subregions nested as necessary
        App.addRegions({
            headerRegion:"header",
            mainRegion:"#main"
        });

        function isMobile() {
            var ua = (navigator.userAgent || navigator.vendor || window.opera, window, window.document);
            return (/iPhone|iPod|iPad|Android|BlackBerry|Opera Mini|IEMobile/).test(ua);
        }

        App.mobile = isMobile();

        App.vent.on("routing:started", function() {
            Backbone.history.start({pushstate: true});
        });
        // App.addInitializer(function (options) {
        //     Backbone.history.start();
        // });
        
        // handles links
        App.addInitializer(function setupLinks () {
            handleAppLink = function (ev) {
              ev.preventDefault();
              var clicked = $(ev.currentTarget),
                route = clicked.attr('href');
              App.appRouter.navigate(route, true);
            };

          $(document).on('click', 'a[data-applink]', handleAppLink, App);
        });

        return App;
    });