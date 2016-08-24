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
                this.busAppData = LocalStorage.fetchFromLocalStorage();
                this.username = this.busAppData.username ? this.busAppData.username : "";

                this.chatMessagesView = new ChatMessagesView({collection: this.chatCollection, username: _.bind(function() {
                  return this.username;
                }, this)});
                // Display the welcome message
                var message = "Welcome! This is the chat of the line " + this.options.line.linename;
                this.log(message, {
                  prepend: true
                });

                this.initializeSocketEvents();
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
              App.socket.emit('stop typing');
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
                  this.addChatMessage(mes);
                  // tell server to execute 'new message' and send along one parameter
                  App.socket.emit('new message', mes);
                }
            },

            onClickLogin: function() {
              var that = this;
              App.socket.on('login', function (data) {
                 that.sendMessage(that.tempmessage);
                 that.tempmessage = undefined;
              });
              this.chatLogin(this.ui.nameInput.val());
              $(this.el).removeClass("username-form-open");
            },

            chatLogin: function(name) {
              this.username = name;
              LocalStorage.setInLocalStorage({username: this.username});
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
              data.time = moment().format('YYYY-MM-DD HH:mm:ss');
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
              return this.chatCollection.find(function(model) { return model.get('type') === "typing"; });
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
                time: moment().format('YYYY-MM-DD HH:mm:ss')
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
                //that.addParticipantsMessage(data);
              });

              // Whenever the server emits 'user left', log it in the chat body
              App.socket.on('user left', function (data) {
                that.log(data.username + ' left');
                //that.addParticipantsMessage(data);
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

  