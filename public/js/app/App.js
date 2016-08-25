define(['jquery', 'backbone', 'marionette', 'underscore', 'handlebars', 'i18next', 'i18next-browser-languagedetector', 'text!locales/en/translation.json', 'text!locales/fr/translation.json'],
    function ($, Backbone, Marionette, _, Handlebars, i18next, LngDetector, enLocale, frLocale) {
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

        App.addInitializer(function(){
          var resources = {
            en : { translation : JSON.parse(enLocale) },
            fr : { translation : JSON.parse(frLocale) }
          };
          i18next
          .use(LngDetector)
          .init({
            resources: resources,

            fallbackLng: "en"
          });

          Handlebars.registerHelper('i18n',
            function(str){
              return (i18next != undefined ? i18next.t(str) : str);
            }
          );
        });

        App.appRegion = {

           show: function(view) {
                if (this.currentView){
                  this.currentView.close();
                }

                this.currentView = view;
                //this.currentView.render();

                //$("#main").html(this.currentView.el);
                App.mainRegion.show(this.currentView);
              }
        };
        
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

        App.addInitializer(function (options) {
            Backbone.View.prototype.close = function(){
              this.remove();
              this.unbind();
              if (this.onClose){
                this.onClose();
              }
            }
            Backbone.history.start();
        });

        return App;
    });