  define(['App','marionette', 'handlebars', 'underscore', 'moment', 'collections/ChatCollection', 'models/ChatMessage', 'text!templates/chat.html', 'text!templates/chatMessage.html'],
    function (App, Marionette, Handlebars, underscore, moment, ChatCollection, ChatMessage, template, messageTemplate) {
        
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
                  return that.model.get("username") == that.options.username;
                },
                getUsernameColor: function() {
                  COLORS = [
                    '#e21400', '#91580f', '#f8a700', '#f78b00',
                    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
                    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
                  ];
                  // Compute hash code
                  var hash = 7;
                  for (var i = 0; i < that.options.username.length; i++) {
                     hash = that.options.username.charCodeAt(i) + (hash << 5) - hash;
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

          childViewOptions: function(){
              return{
                  username: this.options.username
              }
          },
          onChange: function() {
            this.render();
            this.el.scrollTop = this.el.scrollHeight;
          }
        });

        return Marionette.LayoutView.extend({
            template: Handlebars.compile(template),
            regions: {
              'messages': ".chat-messages"
            },
            ui: {
              'inputMessage': ".inputMessage",
              'chatView': 'chatView-container'
            },

            events: {
                'input :input' : 'onInput',
                'click :input': 'onClickInput',
                'keyup :input': 'onKeyDownInput',
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

                this.chatCollection = new ChatCollection();
                this.chatCollection.meta("lineid", this.options.line.id);
                this.chatCollection.fetch({
                   add: true,
                   add: true,
                   remove: false,
                   update: true
                });
                var savedUsername = "";
                this.chatMessagesView = new ChatMessagesView({collection: this.chatCollection, username: savedUsername});
                // Display the welcome message
                var message = "Welcome! This is the chat of the line " + this.options.line.linename;
                this.log(message, {
                  prepend: true
                });

                this.initializeSocketEvents();
            },

            onShow: function() {
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
                this.sendMessage(this.ui.inputMessage.val());
                App.socket.emit('stop typing');
                typing = false;
              }
            },


            // Sends a chat message
            sendMessage: function(message) {
              if (connected) {
                // Prevent markup from being injected into the message
                message = this.cleanInput(message);
                // if there is a non-empty message and a App.socket connection
                if (message && connected) {
                  this.ui.inputMessage.val('');
                  var mes = {
                    username: this.username,
                    message: message,
                    type: "text"
                  };
                  this.addChatMessage(mes);
                  // tell server to execute 'new message' and send along one parameter
                  App.socket.emit('new message', mes);
                }
              } else {
                var that = this;
                App.socket.on('login', function (data) {
                  that.sendMessage(message);
                });
                this.chatLogin();

              }
            },

            chatLogin: function() {
              this.username = "yoyo";
              var color = this.getUsernameColor(this.username);
              var room = this.options.line.id;
              
              App.socket.emit('add user', {user: this.username, color: color, room: room});
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

              // Adds the visual chat typing message
            addChatTyping: function(data) {
              data.type = "typing";
              data.message = 'is typing';
              this.addChatMessage(data);
            },

            // Removes the visual chat typing message
            removeChatTyping: function(data) {
              var model = this.getTypingMessages(data);
              this.chatCollection.remove(model);
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
                  App.socket.emit('typing');
                }
                lastTypingTime = (new Date()).getTime();

                setTimeout(function () {
                  var typingTimer = (new Date()).getTime();
                  var timeDiff = typingTimer - lastTypingTime;
                  if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    App.socket.emit('stop typing');
                    typing = false;
                  }
                }, TYPING_TIMER_LENGTH);
              }
            },

            // Gets the 'X is typing' messages of a user
            getTypingMessages: function(data) {
              return this.chatCollection.find(function(model) { return model.get('username') === data.username; });
            },

            addParticipantsMessage: function(data) {
              var message = '';
              if (data.numUsers === 1) {
                message += "there's 1 participant";
              } else {
                message += "there are " + data.numUsers + " participants";
              }

              this.log(message);
            },

            log: function(message, options) {
              var messageModel = {
                message: message,
                type: "log",
                time: new Date().getTime()
              }

              this.chatCollection.add(new ChatMessage(messageModel));
            },

            addChatMessage: function(data, options) {
              this.chatCollection.add(new ChatMessage(data));
            },

            initializeSocketEvents: function() {
              var that = this;
              // Whenever the server emits 'login', log the login message
              App.socket.on('login', function (data) {
                connected = true;
              });

              // Whenever the server emits 'new message', update the chat body
              App.socket.on('new message', function (data) {
                that.addChatMessage(data);
              });

              // Whenever the server emits 'user joined', log it in the chat body
              App.socket.on('user joined', function (data) {
                that.log(data.username + ' joined');
                that.addParticipantsMessage(data);
              });

              // Whenever the server emits 'user left', log it in the chat body
              App.socket.on('user left', function (data) {
                that.log(data.username + ' left');
                that.addParticipantsMessage(data);
                that.removeChatTyping(data);
              });

              // Whenever the server emits 'typing', show the typing message
              App.socket.on('typing', function (data) {
                that.addChatTyping(data);
              });

              // Whenever the server emits 'stop typing', kill the typing message
              App.socket.on('stop typing', function (data) {
                that.removeChatTyping(data);
              });

              App.socket.on('loading:end', function() {
                console.log("loading:end");
              });
            }

        });
  });

  