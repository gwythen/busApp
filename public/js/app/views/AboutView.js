define([ 'marionette', 'handlebars', 'text!templates/about.html', 'models/LocalStorage'],
    function (Marionette, Handlebars, template, LocalStorage) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),
            onShow: function() {
            	LocalStorage.setInLocalStorage({"flag-seen-about": true});
            }
        });
    });