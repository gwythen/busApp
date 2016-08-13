  define(['App','marionette', 'handlebars', 'underscore', 'text!templates/chat.html'],
    function (App, Marionette, Handlebars, underscore, template) {
        //ItemView provides some default rendering logic
        return Marionette.ItemView.extend({
            template:Handlebars.compile(template),

            ui: {
              'inputMessage':'.inputMessage',
              'messages':'.chat-messages',
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
                COLORS = [
                  '#e21400', '#91580f', '#f8a700', '#f78b00',
                  '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
                  '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
                ];

                // Initialize variables
                var $window = $(window);
                var $chatPage = this.el; // The chatroom page
                connected = false;
                typing = false;
                lastTypingTime = undefined;
                username = "yoyo";
                this.initializeSocketEvents();
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


            addParticipantsMessage: function(data) {
              var message = '';
              if (data.numUsers === 1) {
                message += "there's 1 participant";
              } else {
                message += "there are " + data.numUsers + " participants";
              }
              this.log(message);
            },

            // Sends a chat message
            sendMessage: function(message) {
              // Prevent markup from being injected into the message
              message = this.cleanInput(message);
              // if there is a non-empty message and a App.socket connection
              if (message && connected) {
                this.ui.inputMessage.val('');
                this.addChatMessage({
                  username: username,
                  message: message
                });
                // tell server to execute 'new message' and send along one parameter
                App.socket.emit('new message', message);
              }
            },
              // Log a message
            log: function(message, options) {
              var $el = $('<li>').addClass('log').text(message);
              this.addMessageElement($el, options);
            },

            // Adds the visual chat message to the message list
            addChatMessage: function(data, options) {
              // Don't fade the message in if there is an 'X was typing'
              var $typingMessages = this.getTypingMessages(data);
              options = options || {};
              if ($typingMessages.length !== 0) {
                options.fade = false;
                $typingMessages.remove();
              }

              var $usernameDiv = $('<span class="username"/>')
                .text(data.username)
                .css('color', this.getUsernameColor(data.username));
              var $messageBodyDiv = $('<span class="messageBody">')
                .text(data.message);

              var typingClass = data.typing ? 'typing' : '';
              var $messageDiv = $('<li class="message"/>')
                .data('username', data.username)
                .addClass(typingClass)
                .append($usernameDiv, $messageBodyDiv);

              this.addMessageElement($messageDiv, options);
            },
              // Adds the visual chat typing message
            addChatTyping: function(data) {
              data.typing = true;
              data.message = 'is typing';
              this.addChatMessage(data);
            },

            // Removes the visual chat typing message
            removeChatTyping: function(data) {
              this.getTypingMessages(data).fadeOut(function () {
                $(this).remove();
              });
            },

            // Adds a message element to the messages and scrolls to the bottom
            // el - The element to add as a message
            // options.fade - If the element should fade-in (default = true)
            // options.prepend - If the element should prepend
            //   all other messages (default = false)
            addMessageElement: function(el, options) {
              var $el = $(el);

              // Setup default options
              if (!options) {
                options = {};
              }
              if (typeof options.fade === 'undefined') {
                options.fade = true;
              }
              if (typeof options.prepend === 'undefined') {
                options.prepend = false;
              }

              // Apply options
              if (options.error) {
                $el.addClass("error");
              }
              if (options.fade) {
                $el.hide().fadeIn(FADE_TIME);
              }
              if (options.prepend) {
                this.ui.messages.prepend($el);
              } else {
                this.ui.messages.append($el);
              }

              this.ui.messages.scrollTop = this.ui.messages.scrollHeight;
              this.ui.chatView.scrollTop = this.ui.chatView.scrollHeight;
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
              return $('.typing.message').filter(function (i) {
                return $(this).data('username') === data.username;
              });
            },

            // Gets the color of a username through our hash function
            getUsernameColor: function(username) {
              // Compute hash code
              var hash = 7;
              for (var i = 0; i < username.length; i++) {
                 hash = username.charCodeAt(i) + (hash << 5) - hash;
              }
              // Calculate color
              var index = Math.abs(hash % COLORS.length);
              return COLORS[index];
            },

            initializeSocketEvents: function() {
              var that = this;
              // Whenever the server emits 'login', log the login message
              App.socket.on('login', function (data) {
                connected = true;
                // Display the welcome message
                var message = "Welcome " + data.username + "!";
                that.log(message, {
                  prepend: true
                });
                that.addParticipantsMessage(data);
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

  