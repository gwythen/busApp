define([
    'App',
    'marionette',
    'handlebars',
    'text!templates/swipableLayout.html',
    'text!templates/tabItemTemplate.html'
  ],
  function(
    App,
    Marionette,
    Handlebars,
    template,
    tabItemTemplate
  ) {

    var TabName = Backbone.Model.extend({
      defaults: {
        name: ""
      }
    });

    var ViewModel = Backbone.Model.extend({
      defaults: {
        viewToDisplay: {}
      }
    });

    var TabItem = Marionette.ItemView.extend({
      template: Handlebars.compile(tabItemTemplate),
      className: "swiper-slide",
      modelEvents: {
        "change": "render"
      },
     
    });

    var TabsList = Marionette.CollectionView.extend({
      itemView: TabItem,
      className: "swiper-wrapper",
      collectionEvents: {
        "change": "render"
      },
    });

    var ViewItem = Marionette.ItemView.extend({
      className: "swiper-slide",
      modelEvents: {
        "change": "render"
      },
      
      template: Handlebars.compile("<div class='inner'></div>"),

      onRender: function(){
        var region = new (Marionette.Region.extend({el: this.$el.find(".inner")}))();
        region.show(this.model.get("viewToDisplay"));
      }

    });

    var ViewsList = Marionette.CollectionView.extend({
      itemView: ViewItem,
      className: "swiper-wrapper",
      collectionEvents: {
        "change": "render"
      },
    });

    return Marionette.Layout.extend({
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

        // this.tabCollection = new (Backbone.Collection.extend({
        //   model: TabItem
        // }))();

        this.viewsList = new ViewsList({collection: this.viewCollection});
        // this.tabsList = new TabsList({collection: this.tabCollection});

        this.listenTo(this.viewsHolder, "show", this.initializeSwiper);
      },


      add: function(view, tabName) {
        var model = new TabName({name: tabName});
        var viewModel = new ViewModel({viewToDisplay: view});
        //this.tabCollection.add(model);
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
          // onSlideChangeStart: function(){
          //   self.updateNavPosition();
          // }
        });

        //Nav
        // this.navSwiper = $('.swiper-nav').swiper({
        //   centeredSlides: true,
        //   //Thumbnails Clicks
        //   onSlideClick: function(){
        //     self.contentSwiper.swipeTo( self.navSwiper.clickedSlideIndex );
        //   }
        // });
      },

      show: function() {
        this.viewsHolder.show(this.viewsList);
      },

      setContentSize: function() {
        $('.swiper-content').css({
          height: $(window).height() - 53
        });
      },

      //Update Nav Position
      // updateNavPosition: function() {
      //   $('.swiper-nav .active-nav').removeClass('active-nav');
      //   var activeNav = $('.swiper-nav .swiper-slide').eq(this.contentSwiper.activeIndex).addClass('active-nav');
      //   this.navSwiper.swipeTo(activeNav.index());
      //   if (!activeNav.hasClass('swiper-slide-visible')) {
      //     if (activeNav.index()>this.navSwiper.activeIndex) {
      //       //var thumbsPerNav = Math.floor(this.navSwiper.width/activeNav.width())-1;
      //       this.navSwiper.swipeTo(activeNav.index());
      //     }
      //     else {
      //       this.navSwiper.swipeTo(activeNav.index());
      //     }
      //   }
      // }

    });

  });