var net = require('net');

IrcServerController = function(proxy, ip) {
    this.proxy = proxy;
    this.isInitialized = false;
    this.irc = undefined;
    this.ip = ip;
};
IrcServerController.prototype.update = function(proxy, event) {
    if (typeof this['on' + event['method']] == 'function') {
        this['on' + event['method']](event);
    }
};
IrcServerController.prototype.onSetup = function(event) {
    var doLogin = false;
    if (!this.isInitialized) {
        this.irc = new IrcChatGroup(new IrcChatList(), event.config.username);
        this.proxy.addObserver(new IrcChatEventProxy(this.irc));
        this.isInitialized = true;
        this.config = event.config;
        doLogin = event.config.username;
    }
    this.proxy.sendUser({"method":"Setup","irc":this.irc.hashify(),"config":this.config});
    if (doLogin) {
        this.proxy.sendAll({'method':'Login','username':event.config.username,'password':'', 'remember':false});
    }
};
IrcServerController.prototype.onLogout = function(event) {
    this.handler.quit("Logging out");
    delete this.handler;
};
IrcServerController.prototype.onDelUser = function(event) {
    if (this.handler) {
        this.handler.quit("Closed all tabs");
    }
};
IrcServerController.prototype.onSelfMessage = function(event) {
    this.handler.privMsg(event.channelName, event.message);
};
IrcServerController.prototype.onJoinChannel = function(event) {
    if (event.channelName.test("^#")) { // TODO: Find a better way to join channels than channel name matching
        this.handler.join(event.channelName);
    }
};
IrcServerController.prototype.onCloseChat = function(event) {
    if (event.channelName.test("^#")) { // TODO: Find a better way to send part messages than by channel name matching.
        this.handler.part(event.channelName, "");
    }
};
IrcServerController.prototype.cleanUsername = function(username) {
    var newName = username.trim().replace(/\s+/g, "_");
    newName = newName.replace(/^[^\x41-\x7D]*/, "");
    newName = newName.replace(/[^-\d\x41-\x7D]*/g, "");
    if (!newName.test(/^[\x41-\x7D][-\d\x41-\x7D]*$/)) {
        newName = "Guest";
    }
    return newName;
};

IrcServerController.prototype.onLogin = function(event) {
    var socket = new net.Socket();
    socket.connect(6667, 'irc.thehelper.net');
    var handler = new IRCHandler('NickServ', socket);
    this.handler = handler;
    new IRCPingClient(handler);
    var username = this.cleanUsername(event.username);
    var password = event.password;
    var nickserv = new IrcNickserv("NickServ", handler);
    var self = this;
    var ip = this.ip;
     var host = this.ip;

    handler.registerEventHandler(new EventToProxy(this.proxy));

    handler.registerEventHandler(new FSM(
        ['onReceiveNOTICE', 'onReceive433', 
         'sendPass',  'onReceiveMODE',
         'onReceiveNickservNotRegistered',
         'onReceiveNickservRegistered',
         'onReceiveNickservPasswordAccepted',
         'onReceiveNickservFail',
         'onReceiveNickservRegistrationComplete'],
        {
            'Ident' : function(e, d, s) {
                if (e == 'onReceiveNOTICE' && d.args[0] == 'AUTH') {
                    s.auths++;
                    if (s.auths <= 1) {
                        return 'Ident';
                    }
                    // handler.pass('webchat'); // This is the SERVER password, not the user one
                    handler.webirc('thWebIrc2', host, ip);
                    handler.ident(username, 'webchat', 'irc.thehelper.net', 'webchat');
                    handler.nick(username);
                    return 'Mode';
                }
                return 'Ident';
            },
            'Mode' : function(e, d, s) {
                if (e == 'onReceiveMODE') {
                    handler.mode(username, "+i");
                    //nickserv.probeUsername(username);
                    //return 'Nick';
                    s.proxy.sendAll({'method':'LoginSuccess', 'username':username});
                    handler.join('#thehelper');
                    return 'JoinedChannel';
                } else if (e=='onReceive433') {
                    s.proxy.sendAll({'method':'LoginFail'});
                    handler.quit("Failed nickserv");
                    return null;
                }
                return 'Mode';
            },
            'Nick' : function(e, d, s) {
                if (e=='onReceiveNickservRegistered') {
                    if (event.token) {
                        s.irc.recognize(event.token);
                    } else if (event.remember) {
                        s.irc.remember(password);
                    } else {
                        s.irc.identify(password);
                    }
                    s.irc.away();
                    return 'Identifying';
                } else if (e=='onReceiveNickservNotRegistered') {
                    s.irc.registerNick(username, 'www.thehelper.net');
                    return 'WaitingForRegistration';
                } else if (e=='onReceive433') {
                    s.proxy.sendAll({'method':'LoginFail'});
                    handler.quit("Failed nickserv");
                    return null;
                }
                return 'Nick';
            },
            'Identifying' : function(e, d, s) {
                if (e=='onReceiveNickservNotRegistered') {
                    s.irc.registerNick(username, 'www.thehelper.net');
                    return 'WaitingForRegistration';
                } else if (e=='onReceiveNickservPasswordAccepted') {
                    s.proxy.sendAll({'method':'LoginSuccess', 'username':username});
                    handler.join('#thehelper');
                    return 'JoinedChannel';
                } else if(e=='onReceiveNickservFail') {
                    s.proxy.sendAll({'method':'LoginFail'});
                    handler.quit("Failed nickserv");
                    return null;
                }
                return 'Identifying';
            },
            'WaitingForRegistration' : function(e, d, s) {
                if (e=='onReceiveNickservRegistrationComplete') {
                    if (event.token) {
                        s.irc.recognize(event.token);
                    } else if (event.remember) {
                        s.irc.remember(password);
                    } else {
                        s.irc.identify(password);
                    }
                    s.irc.away();

                    return 'Identifying';
                }
                return 'WaitingForRegistration';
            },
            'JoinedChannel' : function(e, d, s) {
                // TODO: ...
            }
        }, 'Ident',
        {'irc':handler,'proxy':this.proxy, 'auths': 0}));
};

EventToProxy = function(proxy) {
    this.proxy = proxy;
};
EventToProxy.prototype.onReceiveJOIN = function(e) {
    this.proxy.sendAll({'method':'DoJoinChannel','user':e.prefix,'channel':e.args[0]});
};
EventToProxy.prototype.onReceive353 = function(e) {
    this.proxy.sendAll({'method':'UsersInChannel','channelName':e.args[2],'userNames':e.args[3].trim().split(' ')});
};
EventToProxy.prototype.onReceivePRIVMSG = function(e) {
    this.proxy.sendAll({'method':'OtherMessage','channelName':e.receiver,'user':e.prefix, 'message':e.message});
};
EventToProxy.prototype.onReceiveACTION = function(e) {
    this.proxy.sendAll({'method':'MessageAction','channelName':e.receiver,'user':e.prefix, 'message':e.action});
};
EventToProxy.prototype.onReceivePART = function(e) {
    this.proxy.sendAll({'method':'DoPartChannel', 'user':e.prefix, 'channel':e.args[0], 'message':e.args[1]});
};
EventToProxy.prototype.onReceiveQUIT = function(e) {
    this.proxy.sendAll({'method':'DoQuit', 'user':e.prefix, 'message':e.args[0]});
};
EventToProxy.prototype.onReceiveNickservToken = function(e) {
    this.proxy.sendAll({'method':'DoSaveToken', 'token':e.token});
};
EventToProxy.prototype.onReceiveNICK = function(e) {
    this.proxy.sendAll({'method':'DoChangeNick', 'from':e.prefix.split('!')[0], 'to': e.args[0]});
};
EventToProxy.prototype.onReceiveKICK = function(e) {    
    this.proxy.sendAll({'method':'DoKickUser', 'by':e.prefix.split('!')[0], 'channel':e.args[0], 'user':e.args[1],'message':e.args[2]});
};