define([
    'App',
    'marionette',
    'handlebars',
    'text!templates/swipableLayout.html'
  ],
  function(
    App,
    Marionette,
    Handlebars,
    template,
    tabItemTemplate
  ) {

    var ViewModel = Backbone.Model.extend({
      defaults: {
        viewToDisplay: {}
      }
    });

    var ViewItem = Marionette.ItemView.extend({
      className: "swiper-slide",
      modelEvents: {
        "change": "render"
      },

      events: {
        'click': "test"
      },
      
      template: Handlebars.compile("<div class='inner'></div>"),

      onRender: function(){
        var region = new (Marionette.Region.extend({el: this.$el.find(".inner")}))();
        region.show(this.model.get("viewToDisplay"));
      },

      test: function(e) {
        this.model.get("viewToDisplay").trigger("eventHandler", e);
      }

    });

    var ViewsList = Marionette.CollectionView.extend({
      childView: ViewItem,
      className: "swiper-wrapper",
      collectionEvents: {
        "change": "render"
      },
    });

    return Marionette.LayoutView.extend({
      template: Handlebars.compile(template),
      regions: {
        viewsHolder: "#viewsHolder"
      },
      ui: {
        viewsHolder: "#viewsHolder"
      },

      initialize: function() {
        this.viewCollection = new (Backbone.Collection.extend({
          model: ViewItem
        }))();

        this.viewsList = new ViewsList({collection: this.viewCollection});

        this.listenTo(this.viewsHolder, "show", this.initializeSwiper);
      },


      add: function(view, tabName) {
        var viewModel = new ViewModel({viewToDisplay: view});
        this.viewCollection.add(viewModel);
      },

      initializeSwiper: function(fixedView) {
        this.setContentSize();
        var self = this;
        $(window).resize(function(){
          self.setContentSize();
        });

        //Swiper Content
        this.contentSwiper = new Swiper('.swiper-content', {
          preventLinksPropagation: false,
          preventLinks: false,
          pagination: ".pagination",
          onClick: function(swiper, event) {
            console.log("clicked");
          }
        });
      },

      show: function() {
        this.viewsHolder.show(this.viewsList);
      },

      setContentSize: function() {
        $('.swiper-content').css({
          height: $(window).height() - 100
        });
      },

    });

  });