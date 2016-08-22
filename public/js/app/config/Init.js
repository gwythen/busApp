require.config({
    baseUrl:"./js/app",
    // 3rd party script alias names (Easier to type "jquery" than "libs/jquery, etc")
    // probably a good idea to keep version numbers in the file names for updates checking
    paths:{
        // Core Libraries
        "jquery":"../libs/jquery",
        "underscore":"../libs/underscore",
        "backbone":"../libs/backbone",
        "marionette":"../libs/backbone.marionette",
        "handlebars":"../libs/handlebars",
        "socketio": "../libs/socketio",
        "moment": "../libs/moment",

        // Plugins
        "backbone.validateAll":"../libs/plugins/Backbone.validateAll",
        "backbone.babysitter":"../libs/plugins/Backbone.babysitter",
        "backbone.wreqr":"../libs/plugins/Backbone.wreqr",
        "typeahead":"../libs/plugins/typeahead.jquery",
        "bloodhound":"../libs/plugins/bloodhound",
        "text":"../libs/plugins/text",
        "swiper": "../libs/idangerous.swiper",
    },
    // Sets the configuration for your third party scripts that are not AMD compatible
    shim:{
        "bootstrap":["jquery"],
        "typeahead":["jquery"],
        "bloodhound": {
           "deps": ['jquery'],
           "exports": 'Bloodhound'
        },
        "backbone":{
            "deps":["underscore"],
            // Exports the global window.Backbone object
            "exports":"Backbone"
        },
        "marionette":{
            "deps":["underscore", "backbone", "jquery"],
            // Exports the global window.Marionette object
            "exports":"Marionette"
        },
        "handlebars":{
            "exports":"Handlebars"
        },
        "swiper": {
          "exports": "Swiper"
        },
        // Backbone.validateAll plugin (https://github.com/gfranko/Backbone.validateAll)
        "backbone.validateAll":["backbone"],
        "backbone.babysitter":["backbone"],
        "backbone.wreqr":["backbone"]

    }
});

// Includes Desktop Specific JavaScript files here (or inside of your Desktop router)
require(["App", "routers/AppRouter", "controllers/Controller",  "jquery", "typeahead", "bloodhound", "swiper", "backbone.validateAll", "backbone.wreqr", "backbone.babysitter", "socketio", "moment"],
    function (App, AppRouter, Controller) {
        App.appRouter = new AppRouter({
            controller:new Controller()
        });
        App.start();
    });