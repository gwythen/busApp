  define(['App','marionette', 'handlebars', 'underscore', 'moment', 'models/LocalStorage', 'models/ChatMessage', 'text!templates/chat.html', 'text!templates/chatMessage.html'],
    function (App, Marionette, Handlebars, underscore, moment, LocalStorage, ChatMessage, template, messageTemplate) {
        
        var MessageItem = Marionette.ItemView.extend({
          className: "message-container",
          modelEvents: {
            "change": "render"
          },
          
          template: Handlebars.compile(messageTemplate),
          templateHelpers: function(){ 
              var that = this;
              return {
                isTyping: function () {
                    return that.model.get("type") == "typing";
                },
                isText: function () {
                    return that.model.get("type") == "text";
                },
                isLog: function () {
                    return that.model.get("type") == "log";
                },
                isFB: function () {
                    return that.model.get("type") == "fb";
                },
                isMine: function() {
                  if(that.options.username() == "") {
                    return false;
                  } else {
                    return that.model.get("username") == that.options.username();
                  }
                  
                },
                getUsernameColor: function() {
                  COLORS = [
                    '#e21400', '#91580f', '#f8a700', '#f78b00',
                    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
                    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
                  ];
                  // Compute hash code
                  var hash = 7;
                  for (var i = 0; i < that.options.username().length; i++) {
                     hash = that.options.username().charCodeAt(i) + (hash << 5) - hash;
                  }
                  // Calculate color
                  var index = Math.abs(hash % COLORS.length);
                  return COLORS[index];
                },
                getMsgTime: function() {
                  return moment(that.model.get("time")).fromNow();
                }
              }
          }
        });

        var ChatMessagesView = Marionette.CollectionView.extend({
          childView: MessageItem,

          initialize: function() {
            this.listenTo(this.collection, 'add', function() {
              $('.chatView-container').css({overflow: "hidden"});
              window.setTimeout(function() {
                  $('.chatView-container').scrollTop(1E10);
              }, 0);       
              $('.chatView-container').css({overflow: "auto"});
            });
          },

          childViewOptions: function(){
              return{
                  username: this.options.username
              }
          },
          onClose: function(){
            this.collection.unbind("add", this.render);
          }
        });

        return Marionette.LayoutView.extend({
            template: Handlebars.compile(template),
            className: "chatPage-container",
            regions: {
              'messages': ".chat__messages"
            },
            ui: {
              'inputMessage': "#chatInput",
              'nameInput': "#nameInput"
            },

            events: {
                'input #chatInput' : 'onInput',
                'click #chatInput': 'onClickInput',
                'keyup #chatInput': 'onKeyDownInput',
                'click #loginButton': "onClickLogin",
                'click .send-button': 'onEnter'
            },

            initialize: function () {
                FADE_TIME = 150; // ms
                TYPING_TIMER_LENGTH = 400; // ms

                // Initialize variables
                var $window = $(window);
                var $chatPage = this.el; // The chatroom page
                connected = false;
                typing = false;
                lastTypingTime = undefined;
                this.chatCollection = this.options.collection;
                this.socketEventBus = this.options.bus;
                this.busAppData = LocalStorage.fetchFromLocalStorage();
                this.username = this.busAppData.username ? this.busAppData.username : "";

                this.chatMessagesView = new ChatMessagesView({collection: this.chatCollection, username: _.bind(function() {
                  return this.username;
                }, this)});
                // Display the welcome message
                // var message = "Welcome! This is the chat of the line " + this.options.line.linename;
                // this.log(message, {
                //   prepend: true
                // });

                if(this.username != "") {
                  this.chatLogin(this.username);
                }

            },

            onShow: function() {
              this.el.style.height = window.innerHeight - $(".navbar").height() + "px";
              this.messages.show(this.chatMessagesView);
            },

            onRender: function() {
              this.ui.inputMessage.focus();
            },

            onInput: function() {
              this.updateTyping();
            },

            onClickInput: function() {
              this.ui.inputMessage.focus();
            },

            onKeyDownInput: function (event) {
              // Auto-focus the current input when a key is typed
              if (!(event.ctrlKey || event.metaKey || event.altKey)) {
                this.ui.inputMessage.focus();
              }
              // When the client hits ENTER on their keyboard
              if (event.which === 13) {
                this.onEnter();
              }
            },

            onEnter: function() {
              this.socketEventBus.trigger('send:stop-typing');
              
              typing = false;
              var msg = this.ui.inputMessage.val();
              if (connected) {
                this.sendMessage(msg);
              } else {
                this.tempmessage = msg;
                $(this.el).addClass("username-form-open");
              }
            },


            // Sends a chat message
            sendMessage: function(message) {
                // Prevent markup from being injected into the message
                message = this.cleanInput(message);
                // if there is a non-empty message and a App.socket connection
                if (message && connected) {
                  this.ui.inputMessage.val('');
                  var mes = {
                    username: this.username,
                    message: message,
                    type: "text",
                    time: moment().format('YYYY-MM-DD HH:mm:ss')
                  };

                  this.socketEventBus.trigger('send:new-message', mes);
                }
            },

            onClickLogin: function() {
              var that = this;
              this.socketEventBus.on('login', function (data) {
                  $(that.el).removeClass("username-form-open");
                 that.sendMessage(that.tempmessage);
                 that.tempmessage = undefined;
                 that.currentRoom = data.room;
              });
              this.chatLogin(this.ui.nameInput.val());
              
            },

            chatLogin: function(name) {
              if(!this.connected || this.connected && line.id == this.currentRoom) {
                 this.username = name;
                 LocalStorage.setInLocalStorage({username: this.username});
                 connected = true;
                 this.socketEventBus.trigger('send:add-user', {user: name, room: this.options.line.id});
              } else {
                 this.socketEventBus.trigger('send:switch-room', {room: this.options.line.id});
              }
            },

            getUsernameColor: function(username) {
              COLORS = [
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

            // Prevents input from having injected markup
            cleanInput: function(input) {
              return $('<div/>').text(input).text();
            },

            // Updates the typing event
            updateTyping: function() {
              if (connected) {
                if (!typing) {
                  typing = true;
                  this.socketEventBus.trigger('send:typing');
                  
                }
                lastTypingTime = (new Date()).getTime();
                var that = this;
                setTimeout(function () {
                  var typingTimer = (new Date()).getTime();
                  var timeDiff = typingTimer - lastTypingTime;
                  if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    that.socketEventBus.trigger('send:stop-typing');
                    typing = false;
                  }
                }, TYPING_TIMER_LENGTH);
              }
            },

            onClose: function(){
              this.chatMessagesView.close();
              this.undelegateEvents();

              this.$el.removeData().unbind(); 

              // Remove view from DOM
              this.remove();  
              Backbone.View.prototype.remove.call(this);
            }
        });
  });

  