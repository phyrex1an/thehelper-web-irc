IRCHandler = function(nickservName, socket) {
    this.handlers = [];
    this.ENDL = "\r\n";
    this.connection = socket;
    this.nickserv = nickservName;
    this.buffer = "";
    this.decoder = new IRCDecoder(this);
    var self = this;

    socket.onConnect = function() {
        self.sendEvent({'identifier':'Open'});
    };
    socket.onDisconnect = function() {
        self.sendEvent({'identifier':'Close'});
    };
    socket.onRead = function(data) {
        self.decoder.receive(data);
    };
};
IRCHandler.prototype = new Object();
IRCHandler.prototype.registerEventHandler = function(handler) {
    this.handlers.push(handler);
};
IRCHandler.prototype.sendEvent = function(e) {
    Ape.log("IRC EVENT: " + hashToDebug(e));
    var eventCallback = "on" + e.identifier;
    for (var i=this.handlers.length-1; i>=0; i--) {
        if (typeof this.handlers[i][eventCallback] == "function") {
            this.handlers[i][eventCallback](e);
        }
    }
};

IRCHandler.prototype.connect = function(hostname, port, socket) {
    // No listener found
    this.sendEvent({
        'identifier': 'SendConnect',
        'hostname' : hostname,
        'port' : port,
        'socket' : socket
    });
};

IRCHandler.prototype.close = function() {
    this.connection.close();
    // TODO: Is this needed? onDisconnect can't be null on disconnect
    /*this.connection.onConnect = null;
    this.connection.onDisconnect = null;
    this.connection.onRead = null;*/
};

IRCHandler.prototype.sendRaw = function(raw) {
    Ape.log(raw);
    this.connection.write(raw + this.ENDL);
};

IRCHandler.prototype.send = function(type, prefixes, message) {
    var rawMessage = type;
    if (typeof prefixes != "undefined") {
        rawMessage += " " + ((prefixes instanceof Array) ? prefixes.join(" ") : prefixes);
    }
    if (typeof message != "undefined") {
        rawMessage += " :" + message;
    }
    this.sendRaw(rawMessage);
};

IRCHandler.prototype.pass = function(password) {
    this.send('PASS', password);
};

IRCHandler.prototype.webirc = function(pass, host, ip) {
    this.send('WEBIRC', [pass, 'cgiirc', host, ip]);
};

IRCHandler.prototype.ident = function(nickname, hostname, servername, realname) {
    this.send('USER', [nickname, hostname, servername], realname);
};

IRCHandler.prototype.nick = function(nick) {
    this.send('NICK', nick);
};

IRCHandler.prototype.ctcp = function(target, message, isReply) {
    if (isReply) {
        this.ctcpReply(target, message);
    } else {
        this.ctcpQuestion(target, message);
    }
};
IRCHandler.prototype.ctcpReply = function(target, message) {
    this.notice(target, '\01' + message + '\01');
};
IRCHandler.prototype.ctcpQuestion = function(target, message) {
    this.privMsg(target, '\01' + message + '\01');
};

IRCHandler.prototype.mode = function(target, mode) {
    this.send('MODE', [target, mode]);
};

IRCHandler.prototype.away = function() {
    this.send('AWAY');
};

IRCHandler.prototype.action = function(destination, message) {
    this.privMsg(destination, '\01ACTION ' + message + '\01');
};

IRCHandler.prototype.part = function(channel, reason) {
    this.send('PART', channel, reason);
};

IRCHandler.prototype.quit = function(reason) {
    this.send('QUIT', '', reason);
    this.close(); // TODO: Implement close
};

IRCHandler.prototype.join = function(channel) {
    this.send('JOIN', channel);
};

IRCHandler.prototype.privMsg = function(target, message) {
    this.send('PRIVMSG', target, message);
};

IRCHandler.prototype.notice = function(target, message) {
    this.send('NOTICE', target, message);
};

IRCHandler.prototype.pong = function(code) {
    this.send('PONG', '', code);
}

IRCHandler.prototype.sendNickserv = function(action, message) {
    if (message instanceof Array) {
        message.unshift(action);
    } else {
        message = action + ' ' + message;
    }
    this.send(this.nickserv, message);
};

IRCHandler.prototype.identify = function(password) {
    this.sendNickserv('IDENTIFY', password);
};

IRCHandler.prototype.remember = function(password) {
    this.sendNickserv('REMEMBER', password);
};

IRCHandler.prototype.recognize = function(token) {
    this.sendNickserv('RECOGNIZE', token);
};


IRCHandler.prototype.registerNick = function(nick, domain) {
    this.sendNickserv('REGISTER', [domain, nick]);
};

IRCDecoder = function(handler) {
    this.buffer = "";
    this.ENDL = "\r\n";
    this.handler = handler;
};

IRCDecoder.prototype.receive = function(data) {
    this.buffer += data;
    this.parseLines();
};

IRCDecoder.prototype.parseLines = function() {
    var commands = this.buffer.split(this.ENDL);
    this.buffer = commands[commands.length-1];
    for (var i = 0, l = commands.length - 1; i < l; ++i) {
        var line = commands[i];
        if (line.length > 0) {
            Ape.log(line);
            this.parseRaw(line);
        }
    }
};

IRCDecoder.prototype.parseRaw = function(raw) {
    // See http://tools.ietf.org/html/rfc2812#section-2.3
    
    // all the arguments are split by a single space character until
    // the first ":" character.  the ":" marks the start of the last
    // trailing argument which can contain embeded space characters.
    var i = raw.indexOf(" :");
    if (i >= 0) {
        var args = raw.slice(0, i).split(' ');
        args.push(raw.slice(i + 2));
    } else {
        var args = raw.split(' ');
    }
    
    // extract the prefix (if there is one).
    if (args[0].charAt(0) == ":") {
        var prefix = args.shift().slice(1);
    } else {
        var prefix = null;
    }
    var type = args.shift();
    this.parse(type, prefix, args);
};

IRCDecoder.prototype.parse = function(type, prefix, args) {
    if (!isNaN(parseInt(type))) {
        var error_code = parseInt(type)
        if (error_code > 400) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveError',
                'args' : args,
                'type' : type
            });
        } else {
            this.handler.sendEvent({
                'identifier' : 'ReceiveResponse',
                'type' : type,
                'args' : args
            });
        }
    }
    switch (type) {
    case 'PRIVMSG':
        this.parsePrivMsg(prefix, args[0], args[1]);
        break;
    default:
        this.handler.sendEvent({
            'identifier' : 'Receive' + type,
            'prefix' : prefix,
            'args' : args
        });
        break;
    }
};

IRCDecoder.prototype.parsePrivMsg = function(sender, receiver, message) {
    var type = null;
    var event =  {
        'sender' : sender,
        'receiver' : receiver,
        'prefix' : sender
    };
    if (message.charCodeAt(0) == 1 && message.charCodeAt(message.length-1) == 1) {
        // It's a special command.
        var newargs = message.slice(1, message.length - 1).split(' ');
        if (newargs[0] == 'ACTION') {
            type = 'ACTION';
            newargs.shift()
            event.action =  newargs.join(' ');
        }
        else {
            type = 'CTCP';
            event.args = newargs;
        }
    } else {
        type = 'PRIVMSG';
        event.message =  message;
    }
    event.identifier = 'Receive' + type;
    this.handler.sendEvent(event);
};

IRCPingClient = function(handler) {
    this.handler = handler;
    this.handler.registerEventHandler(this);
}
IRCPingClient.prototype = new Object();
IRCPingClient.prototype.onReceivePING = function(e) {
    this.handler.pong(e.args[0]);
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
var IrcNickserv = function(nickserv, handler) { // TODO: Rename to IRCNickserv
    this.nickserv = nickserv;
    this.handler = handler;
    this.nickserv = 'NickServ';
    this.handler.registerEventHandler(this);
};
IrcNickserv.prototype = new Object();
IrcNickserv.prototype.onReceiveNOTICE = function(e) {
    if (e.prefix.test("^NickServ!")) {
        if (e.args[1] == "Your nick isn't registered.") {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservNotRegistered',
                'nick' : e.args[0]
            });
        } else if (e.args[1] == "This didn't work.") {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservFail',
                'nick' : e.args[0]
            });
        } else if (e.args[1] == "Password accepted - you are now recognized." ) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservPasswordAccepted',
                'nick' : e.args[0]
            });
        } else if (e.args[1].test("registered under your account")) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservRegistrationComplete'
            });
        } else if (e.args[1].test("^TOKEN: ")) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservToken',
                'token' : e.args[1].split(": ")[1]
            });
        } else if (e.args[1].test("isn't registered")) {
            this.handler.sendEvent({
                'identifier' : 'ReceiveNickservNotRegistered',
                'nick' : e.args[1].split(" ")[1]
            });
        } else if (e.args[1].test(" is ")) {
            this.hander.sendEvent({
                'identifier' : 'ReceiveNickservRegistered',
                'nick' : e.args[1].split(" ")[1]
            });
        }
    }
};
IrcNickserv.prototype.onSendNickservDisconnectGhost = function(e) {
    this.handler.privMsg(this.nickserv, 'ghost ' + e.username + ' ' + e.password);
};

IrcNickserv.prototype.probeUsername = function(username) {
    this.handler.privMsg(this.nickserv, 'info ' + username);
};
