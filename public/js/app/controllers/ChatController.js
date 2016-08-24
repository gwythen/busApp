define(['App', 'backbone', 'marionette', 'models/ChatMessage', 'models/LocalStorage', 'moment', 'socketio'],
    function (App, Backbone, Marionette, ChatMessage, LocalStorage, moment, io) {
    return Backbone.Marionette.Controller.extend({
        initialize:function (options) {
            this.bus = options.bus;
            this.chatCollection = options.chatCollection;
            this.joinedChat = false;
            this.connected = false;
            this.currentRoom = "";
            var that = this;
            this.joinChat(function(joined) {
                if(joined) {
                    that.initializeSocketEvents();
                    that.initializeBusEvents();
                    var appData = LocalStorage.fetchFromLocalStorage();
                    if(appData.line) {
                        that.chatLogin("", appData.line);
                    }
                } else {
                    console.log("could not join the chat");
                }
                
            });
        },
        initializeSocketEvents: function() {
              var that = this;
              // Whenever the server emits 'login', log the login message
              App.socket.on('login', function (data) {
                that.connected = true;
                that.currentRoom = data.room;
                that.bus.trigger("login", data);
              });

              // Whenever the server emits 'new message', update the chat body
              App.socket.on('new message', function (data) {
                that.addChatMessage(data);
              });

              // Whenever the server emits 'user joined', log it in the chat body
              App.socket.on('user joined', function (data) {
                that.log(data.username + ' joined');
              });

              // Whenever the server emits 'user left', log it in the chat body
              App.socket.on('user left', function (data) {
                that.log(data.username + ' left');
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
        },
        initializeBusEvents: function() {
            this.listenTo(this.bus, 'send:add-user', function(data) {
                App.socket.emit('add user', data);
            });
            this.listenTo(this.bus, 'send:new-message', function(data) {
                this.addChatMessage(data);
                App.socket.emit('new message', data);
            });
            this.listenTo(this.bus, 'send:stop-typing', function() {
                App.socket.emit('stop typing');
            });
            this.listenTo(this.bus, 'send:typing', function() {
                App.socket.emit('typing');
            });
            this.listenTo(this.bus, 'send:switch-room', function(data) {
                App.socket.emit('switch room', data);
            });
        },
        joinChat: function(callback) {
            if(!this.joinedChat) {
                App.socket = io();
                var that = this;
                App.socket.on('connect', function(){
                    that.joinedChat = true;
                    callback ? callback(that.joinedChat) : null;
                });
            } else {
                callback(this.joinedChat);
            }          
        },
        chatLogin: function(name, line) {
            if(!this.connected || this.connected && line.id == this.currentRoom) {
                this.bus.trigger('send:add-user', {user: name, room: line.id});
            } else {
                this.bus.trigger('send:switch-room', {room: line.id});
            }
        },
        addChatMessage: function(data, options) {
          this.chatCollection.add(new ChatMessage(data));
        },
        log: function(message, options) {
          var messageModel = {
            message: message,
            type: "log",
            time: moment().format('YYYY-MM-DD HH:mm:ss')
          }

          this.chatCollection.add(new ChatMessage(messageModel));
        },
        addChatTyping: function(data) {
          data.type = "typing";
          data.message = 'is typing';
          data.time = moment().format('YYYY-MM-DD HH:mm:ss');
          this.addChatMessage(data);
        },
        // Gets the 'X is typing' messages of a user
        getTypingMessages: function(data) {
          return this.chatCollection.find(function(model) { return model.get('type') === "typing"; });
        },
        // Removes the visual chat typing message
        removeChatTyping: function(data) {
          var model = this.getTypingMessages(data);
          this.chatCollection.remove(model);
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
    });
});