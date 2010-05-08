

/* irc.js
 *  This IRC client runs in a web browser using pure JavaScript
 *  Orbited 0.5+ required
 *
 *  Methods:
 *      connect(hostname, port)
 *      ident(nickname, modes, real_name)
 *      join(channel)
 *      names(channel)
 *      part(channel)
 *      quit(reason)
 *      privmsg(destination, message)
 *
 *  Callbacks:
 *      Built-in callbacks are onconnect(), onerror(), onresponse(), and onclose()
 *      onerror and onreply are passed numerical reponse codes, see:
 *      http://www.irchelp.org/irchelp/rfc/chapter6.html for a list of IRC response
 *      codes.
 *
 *      To add callbacks for IRC actions, for instance PRIVMSG,
 *          set onPRIVMSG = function(command) {...you code here...}
 *      See the included IRC demo (/static/demos/irc) for example usage
 *
 * Frank Salim (frank.salim@gmail.com)
 * ©2008 The Orbited Project
 */


/*
  Naming conventions:
  on* : Event. Reactions on server -> client traffic
  onDo* : Event. Reactions on client actions (that might be client -> server actions)
*/

IRCHandler = function() {
    this.handlers = [];
};
IRCHandler.prototype = new Object();
IRCHandler.prototype.registerEventHandler = function(handler) {
    this.handlers.push(handler);
};
IRCHandler.prototype.sendEvent = function(e) {
    console.log("Event: %o", e);
    var eventCallback = "on" + e.identifier;
    for (var i=this.handlers.length-1; i>=0; i--) {
        if (typeof this.handlers[i][eventCallback] == "function") {
            this.handlers[i][eventCallback](e);
        }
    }
};
IRCHandler.prototype.removeEventHandler = function(handler) {

};


IRCClient = function(handler) {
    this.handler = handler;
    this.handler.registerEventHandler(this);

    this.connection = null;
    this.buffer = "";
    this.ENDL = "\r\n";
    this.connect = function(hostname, port, socket) {
        this.connection = socket;
        var self = this;
        this.connection.onopen =  function() {
            self.handler.sendEvent({'identifier':'Open'});
        };
        this.connection.onclose = function(code) {
            self.handler.sendEvent({'identifier':'Close'});
        };
        this.connection.onread = function(data) {
            self.buffer += data;
            self.parse_buffer();
        };
        this.connection.open(hostname, port);
        // TODO set onerror.
    };
    this._createTransport = function() {
        return new TCPSocket();
    };
    this.onSendClose = function(e) {
        this.connection.close();
        this.connection.onopen = null;
        this.connection.onclose = null;
        this.connection.onread = null;
    }
    this.onSend = function(e) {
        this.handler.sendEvent({
            'identifier' : 'SendRaw',
            'payload'    : e.type + " " + e.payload + this.ENDL
        });
    };

    this.onSendRaw = function(e) {
        this.connection.send(e.payload);
    };

    this.onSendIdent = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'USER',
            'payload':e.nickname + " " + e.modes + " :" + e.realname
        });
    };

    this.onSendPass = function(e) {
        this.handler.sendEvent({
            'identifier' : 'Send',
            'type' : 'PASS',
            'payload' : e.password
        });
    };

    this.onSendChangeNick = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'NICK',
            'payload':e.nickname
        });
    };

    this.onSendNames = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'NAMES',
            'payload': e.channel
        });
    };
    this.onSendCTCP =  function(e) {
        var identifier = e.rep ? 'SendNotice' : 'SendPrivMsg';
        this.handler.sendEvent({
            'identifier' : identifier,
            'destination' : e.destination,
            'message': '\01'+e.command+'\01'
        });
    };
    this.onSendPart = function(e) {
        this.handler.sendEvent({
            'identifier' : 'Send',
            'type' : 'PART',
            'payload': e.channel + " :" + e.reason
        });
    };
    this.onSendQuit = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'QUIT',
            'payload': ":" + e.reason
        });
        this.connection.close();
    };
    this.onSendReset = function(e) {
        this.connection.reset();
    }
    this.onSendAction = function(e) {
        this.handler.sendEvent({
            'identifier':'SendPrivMsg',
            'destination':e.destination,
            'message':'\01ACTION ' + e.message + '\01'
        });
    };
    this.onSendNotice = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'NOTICE',
            'payload':e.destination + ' :' + e.message
        });
    };
    this.onSendPrivMsg = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'PRIVMSG',
            'payload':e.destination + ' :' + e.message
        });
    };
    this.onSendPong = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'PONG',
            'payload':':' + e.code
        });
    };
    this.onSendJoin = function(e) {
        this.handler.sendEvent({
            'identifier':'Send',
            'type':'JOIN',
            'payload':e.channel
        });
    };


    // Internal Functions

    this.parse_buffer = function() {
        var commands = this.buffer.split(this.ENDL);
        this.buffer = commands[commands.length-1];
        for (var i = 0, l = commands.length - 1; i < l; ++i) {
            var line = commands[i];
            if (line.length > 0)
                this.handler.sendEvent({'identifier':'ReceiveRaw','payload':line});
        }
    };
    var parse_command = function(s) {
        // See http://tools.ietf.org/html/rfc2812#section-2.3

        // all the arguments are split by a single space character until
        // the first ":" character.  the ":" marks the start of the last
        // trailing argument which can contain embeded space characters.
        var i = s.indexOf(" :");
        if (i >= 0) {
            var args = s.slice(0, i).split(' ');
            args.push(s.slice(i + 2));
        } else {
            var args = s.split(' ');
        }

        // extract the prefix (if there is one).
        if (args[0].charAt(0) == ":") {
          var prefix = args.shift().slice(1);
        } else {
          var prefix = null;
        }

        var command = {
            prefix: prefix,
            type: args.shift(),
            args: args
        };
        return command;
    };

    this.onReceiveRaw = function(e) {
	var command = parse_command(e.payload);
	if (!isNaN(parseInt(command.type))) {
            var error_code = parseInt(command.type)
            if (error_code > 400) {
                this.handler.sendEvent({
                    'identifier' : 'ReceiveError',
                    'args' : command.args,
                    'type' : command.type
                });
            } else {
                this.handler.sendEvent({
                    'identifier' : 'ReceiveResponse',
                    'type' : command.type,
                    'args' : command.args
                });
            }
        }
        this.handler.sendEvent({
            'identifier' : 'Receive' + command.type,
            'prefix' : command.prefix,
            'args' : command.args
        });
    };

    this.onReceivePRIVMSG = function(e) {
        var msg = e.args[1]
        if (msg.charCodeAt(0) == 1 && msg.charCodeAt(msg.length-1) == 1) {
            // It's a special command.
            var args = [command.args[0]]
            var newargs = msg.slice(1, msg.length - 1).split(' ')
            var type = null;
            if (newargs[0] == 'ACTION') {
                type = newargs.shift()
            }
            else {
                type = 'CTCP'
            }
            
            for (var i = 0; i < newargs.length; ++i) {
                args.push(newargs[i])
            }
            this.handler.sendEvent({
                'identifier' : type,
                'prefix' : e.prefix,
                'args' : args
            });
        }
    };

    // Helper functions
    this.ident = function(nickname, flags, realname) {
        this.handler.sendEvent({
            'identifier' : 'SendIdent',
            'nickname' : nickname,
            'modes' : flags,
            'realname' : realname
        });
    };

    this.nick = function(nick) {
        this.handler.sendEvent({
            'identifier' : 'SendChangeNick',
            'nickname': nick
        });
    };

    this.ctcp = function(target, message, rep) {
        this.handler.sendEvent({
            'identifier' : 'SendCTCP',
            'destination' : target,
            'command' : command,
            'rep' : rep
        });
    };

    this.action = function(destination, message) {
        this.handler.sendEvent({
            'identifier' : 'SendAction',
            'destination' : destination,
            'message' : message
        });
    };

    this.part = function(channel, reason) {
        this.handler.sendEvent({
            'identifier' : 'SendPart',
            'channel' : channel,
            'reason' : reason            
        });
    };

    this.quit = function(reason) {
        this.handler.sendEvent({
            'identifier' : 'SendQuit',
            'reason' : reason
        });
    };

    this.join = function(channel) {
        this.handler.sendEvent({
            'identifier' : 'SendJoin',
            'channel' : channel
        });
    };
};

IRCPingClient = function(handler) {
    this.handler = handler;
    this.handler.registerEventHandler(this);
}
IRCPingClient.prototype = new Object();
IRCPingClient.prototype.onReceivePING = function(e) {
    this.handler.sendEvent({
        'identifier':'SendPong',
        'code' :  e.args[0]
    });
};


// Nickserv handler.
// Listens for:
//    SendNickservIdentify -- 
//    SendNickservRegister
//    ReceiveNOTICE
//    
// Generates:
//    SendPrivMsg
//    ReceiveNickservNotRegistered
//    ReceiveNickservPasswordAccepted
var IrcNickserv = function(handler) {
    this.handler = handler;
    this.nickserv = 'NickServ';
    this.handler.registerEventHandler(this);
};
IrcNickserv.prototype = new Object();
IrcNickserv.prototype.onSendNickservIdentify = function(e) {
    this.handler.sendEvent({
        'identifier' : 'SendPrivMsg',
        'destination' : this.nickserv,
        'message' : 'identify ' + e.password
    });
};
IrcNickserv.prototype.onReceiveNOTICE = function(e) {
    if (e.prefix == "NickServ!services@services.thehelper.net") {

        if (e.args[1] == "Your nick isn't registered.") {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservNotRegistered',
                'nick' : e.args[0]
            });
        } else if (e.args[1] == "This didn't work.") {
            // TODO: This might happen on a failed login too
            this.handler.sendEvent({
                'identifier' : 'NickservUnableToRegister',
                'nick' : e.args[0]
            });
        } else if (e.args[1] == "Password accepted - you are now recognized." ) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservPasswordAccepted',
                'nick' : e.args[0]
            });
        }
        
    }
};
IrcNickserv.prototype.onSendNickservRegister = function(e) {
    this.handler.sendEvent({
        'identifier' : 'SendPrivMsg',
        'destination' : this.nickserv,
        'message' : 'register ' + e.domain + ' ' + e.nickname
    });
};
IrcNickserv.prototype.onSendNickservDisconnectGhost = function(e) {
    this.handler.sendEvent({
        'identifier' : 'SendPrivMsg',
        'destination' : this.nickserv,
        'message' : 'ghost ' + e.username + ' ' + e.password
    });
};

var IrcChatList = function() {
    this.html = $('<ul class="channels">'); 
    this.chats = [];
};
IrcChatList.prototype.add = function(chat) {
    // TODO: Check if chat is in list
    this.chats.push(chat);
    this.html.append(chat.view());
    var self = this;
    chat.click(function() {
        self.setCurrent(chat);
    });
    chat.close(function() {
        self.remove(chat);
    });
};
IrcChatList.prototype.remove = function(chat) {
    for (var i in this.chats) {
        if (this.chats[i].name() == chat.name()) {
            this.chats.splice(i,i);
            break;
        };
    };
};
IrcChatList.prototype.setCurrent = function(chat) {
    // TODO: Check if chat is in list
    if (this.current) this.current.removeCurrent();
    this.current = chat;
    chat.addCurrent();
};
IrcChatList.prototype.getCurrent = function() {
    return this.current;
};
IrcChatList.prototype.getChannel = function(channelName) {
    for (var i in this.chats) {
        if (this.chats[i].name() == channelName) {
            return this.chats[i];
        };
    };
    return null;
};
IrcChatList.prototype.addMessage = function(channelName, msg, from) {
    var channel = this.getChannel(channelName);
    if (channel == null) {
        // TODO: Error? Add chat? Investigate.
    };
    channel.addMessage(msg, from);
};
IrcChatList.prototype.view = function() {
    return this.html;
};

var IrcMessageList = function() {
    this.html = $('<ol class="messages">');
    this.messages = [];
};
IrcMessageList.prototype.add = function(message) {
    this.messages.push(message);
    this.html.append(message.view());
};
IrcMessageList.prototype.view = function() {
    return this.html;
};

var IrcUserList = function() {
    this.html = $('<ul class="users">');
    this.users = [];
};
IrcUserList.prototype.add = function(user) {
    this.users.push(user);
    this.html.append(user.view());
};
IrcUserList.prototype.remove = function(user) {
    for (var i in this.users) {
        if (this.users[i].equals(user)) {
            this.users.splice(i,i);
            break;
        };
    };
};
IrcUserList.prototype.get = function(userName) {
    for (var i in this.users) {
        if (this.users[i].name() == userName) {
            return this.users[i];
        };
    };
    return null;
};
IrcUserList.prototype.view = function() {
    return this.html;
};

var IrcChat = function() {
};
IrcChat.prototype.addMessage = function(message) {
    this.messages.add(message);
};
IrcChat.prototype.buildHtml = function(canClose) {
    this.html = $('<li class="channel">');
    var title = $('<h2 class="title">');
    var self = this;
    this.onClick = function() {};
    this.onClose = function() {};
    if (canClose) {
        var close_button = $('<a class="close" alt="Close">')
            .click(function() {
                self.close();
            });
        title.append(close_button);
    };
    this.title = $('<span>')
        .text(this.name())
        .click(function() {
            self.click();
        });
    title.append(this.title);
    this.html.append(title);
};
IrcChat.prototype.view = function() {
    return this.html;
};
IrcChat.prototype.addCurrent = function() {
    this.html.addClass('current');
};
IrcChat.prototype.removeCurrent = function() {
    this.html.removeClass('current');
};
IrcChat.prototype.setTitle = function(title) {
    this.title.text(title);
};
IrcChat.prototype.close = function(f) {
    if (typeof f == "undefined") {
        this.onClose();
    } else {
        this.onClose = f;
    };
};
IrcChat.prototype.click = function(f) {
    if (typeof f == "undefined") {
        this.onClick();
    } else {
        this.onClick = f;
    };
};

var IrcPrivateChat = function(withUser) {
    this.messages = new IrcMessageList();
    this.user = withUser;
    this.buildHtml(true);
    this.html.append(this.messages.view());
};
IrcPrivateChat.prototype = new IrcChat();
IrcPrivateChat.getUser = function(u) {
    if (this.user.equals(u))
        return this.user;
    throw new Error("Unknown user in private chat");
};
IrcPrivateChat.prototype.name = function() {
    return this.user.name();
};

var IrcChannel = function(name) {
    this.messages = new IrcMessageList();
    this._name = name;
    this.users = new IrcUserList();
    this.buildHtml(true);
    this.html.append(this.messages.view());
    this.html.append(this.users.view());
};
IrcChannel.prototype = new IrcChat();
IrcChannel.prototype.name = function() {
    return this._name;
};
IrcChannel.prototype.join = function(user) {
    this.users.add(user);
};
IrcChannel.prototype.part = function(user) {
    this.users.remove(user);
};
IrcChannel.prototype.getUser = function(userName) {
    return this.users.get(userName);
};

var IrcVirtualChannel = function(name, messageUser, closable) {
    this.messages = new IrcMessageList();
    this._name = name;
    this.messageUser = messageUser;
    this.buildHtml();
    this.html.append(this.messages.view());
};
IrcVirtualChannel.prototype = new IrcChat();
IrcVirtualChannel.prototype.name = function() {
    return this._name;
};
IrcVirtualChannel.prototype.addLogMessage = function(messageContent) {
    this.addMessage(new IrcMessage(this.messageUser, messageContent));
};


var IrcMessage = function(from, content) {
    this.html = $('<li class="chat-message">');
    this.from = from;
    this.content = content;
    this.html.append($('<span class="user">').text(this.from.name()));
    this.html.append($('<span class="body">').text(this.content));
};
IrcMessage.prototype.view = function() {
    return this.html;
};

var IrcChannelUser = function(name) {
    this.html = $('<li>');
    this._name = name;
    this.html.text(this._name);
};
IrcChannelUser.prototype.equals = function(user) {
    return this._name == user.name();
};
IrcChannelUser.prototype.name = function() {
    return this._name;
};
IrcChannelUser.prototype.view = function() {
    return this.html;
};

IrcChannelUser.fromName = function(name) {
    var special_list = ['%', '@', '+'];
    var fst = name.charAt(0);
    for (var i in special_list) {
        if (fst == special_list[i]) {
            name = name.substring(1);
            break;
        };
    };
    return new IrcChannelUser(name);
};
IrcChannelUser.fromHostString = function(name) {
    var host_split = name.split("!");
    return new IrcChannelUser(host_split[0]);
};