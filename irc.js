

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
    this.onDoClose = function(e) {
        this.connection.close();
        this.connection.onopen = null;
        this.connection.onclose = null;
        this.connection.onread = null;
    }
    this.onDoSend = function(e) {
        this.handler.sendEvent({
            'identifier' : 'DoSendRaw',
            'payload'    : e.type + " " + e.payload + this.ENDL
        });
    };

    this.onDoSendRaw = function(e) {
        this.connection.send(e.payload);
    };

    this.onDoIdent = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'USER',
            'payload':e.nickname + " " + e.modes + " :" + e.realname
        });
    };

    this.onDoPass = function(e) {
        this.handler.sendEvent({
            'identifier' : 'DoSend',
            'type' : 'PASS',
            'payload' : e.password
        });
    };

    this.onDoChangeNick = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'NICK',
            'payload':e.nickname
        });
    };
    this.onDoJoin = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'JOIN',
            'payload':e.channel
        });        
    };

    this.onDoNames = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'NAMES',
            'payload': e.channel
        });
    };
    this.onDoCTCP =  function(e) {
        var identifier = e.rep ? 'DoNotice' : 'DoPrivMsg';
        this.handler.sendEvent({
            'identifier' : identifier,
            'destination' : e.destination,
            'message': '\01'+e.command+'\01'
        });
    };
    this.onDoPart = function(e) {
        this.handler.sendEvent({
            'identifier' : 'DoSend',
            'type' : 'PART',
            'payload': e.channel + " :" + e.reason
        });
    };
    this.onDoQuit = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'QUIT',
            'payload': ":" + e.reason
        });
        this.connection.close();
    };
    this.onDoReset = function(e) {
        this.connection.reset();
    }
    this.onDoAction = function(e) {
        this.handler.sendEvent({
            'identifier':'DoPrivMsg',
            'destination':e.destination,
            'message':'\01ACTION ' + e.message + '\01'
        });
    };
    this.onDoNotice = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'NOTICE',
            'payload':e.destination + ' :' + e.message
        });
    };
    this.onDoPrivMsg = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'PRIVMSG',
            'payload':e.destination + ' :' + e.message
        });
    };
    this.onDoPong = function(e) {
        this.handler.sendEvent({
            'identifier':'DoSend',
            'type':'PONG',
            'payload':':' + e.code
        });
    };


    // Internal Functions

    this.parse_buffer = function() {
        var commands = this.buffer.split(this.ENDL);
        this.buffer = commands[commands.length-1];
        for (var i = 0, l = commands.length - 1; i < l; ++i) {
            var line = commands[i];
            if (line.length > 0)
                this.handler.sendEvent({'identifier':'Raw','payload':line});
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

    this.onRaw = function(e) {
	var command = parse_command(e.payload);
	if (!isNaN(parseInt(command.type))) {
            var error_code = parseInt(command.type)
            if (error_code > 400) {
                this.handler.sendEvent({
                    'identifier' : 'Error',
                    'args' : command.args,
                    'type' : command.type
                });
            } else {
                this.handler.sendEvent({
                    'identifier' : 'Response',
                    'type' : command.type,
                    'args' : command.args
                });
            }
        }
        this.handler.sendEvent({
            'identifier' : command.type,
            'prefix' : command.prefix,
            'args' : command.args
        });

        if (command.type == "PRIVMSG") {
            msg = command.args[1]
            if (msg.charCodeAt(0) == 1 && msg.charCodeAt(msg.length-1) == 1) {
                var args = [command.args[0]]
                var newargs = msg.slice(1, msg.length - 1).split(' ')
                if (newargs[0] == 'ACTION') {
                    command.type = newargs.shift()
                }
                else {
                    command.type = 'CTCP'
                }
                
                for (var i = 0; i < newargs.length; ++i) {
                    args.push(newargs[i])
                }
                command.args = args
            }
        }
    };

    this.onPRIVMSG = function(e) {
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
            'identifier' : 'DoIdent',
            'nickname' : nickname,
            'modes' : flags,
            'realname' : realname
        });
    };

    this.nick = function(nick) {
        this.handler.sendEvent({
            'identifier' : 'DoChangeNick',
            'nickname': nick
        });
    };

    this.ctcp = function(target, message, rep) {
        this.handler.sendEvent({
            'identifier' : 'DoCTCP',
            'destination' : target,
            'command' : command,
            'rep' : rep
        });
    };

    this.action = function(destination, message) {
        this.handler.sendEvent({
            'identifier' : 'DoAction',
            'destination' : destination,
            'message' : message
        });
    };

    this.part = function(channel, reason) {
        this.handler.sendEvent({
            'identifier' : 'DoPart',
            'channel' : channel,
            'reason' : reason            
        });
    };

    this.quit = function(reason) {
        this.handler.sendEvent({
            'identifier' : 'DoQuit',
            'reason' : reason
        });
    };

    this.join = function(channel) {
        this.handler.sendEvent({
            'identifier' : 'DoJoin',
            'channel' : channel
        });
    };
};

IRCPingClient = function(handler) {
    this.handler = handler;
    this.handler.registerEventHandler(this);
}
IRCPingClient.prototype = new Object();
IRCPingClient.prototype.onPING = function(e) {
    this.handler.sendEvent({
        'identifier':'DoPong',
        'code' :  e.args[0]
    });
};