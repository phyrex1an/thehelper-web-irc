var IrcServerController = function(proxy) {
    this.proxy = proxy;
    this.isInitialized = false;
    this.irc = undefined;
};
IrcServerController.prototype.update = function(proxy, event) {
    if (typeof this['on' + event['method']] == 'function') {
        this['on' + event['method']](event);
    }
};
IrcServerController.prototype.onSetup = function(event) {
    if (!this.isInitialized) {
        this.irc = new IrcChatGroup(new IrcChatList());
        this.proxy.addObserver(new IrcChatEventProxy(this.irc));
        this.isInitialized = true;
    }
    this.proxy.sendUser({"method":"Setup","irc":this.irc.hashify()}, event["_infos"]);
};
IrcServerController.prototype.onLogout = function(event) {
    this.handler.quit();
};
IrcServerController.prototype.onDelUser = function(event) {
    if (this.isInitialized) {
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
    var socket = new Ape.sockClient(6667, 'irc.thehelper.net', false);
    var handler = new IRCHandler('NickServ', socket);
    this.handler = handler;
    new IRCPingClient(handler);
    new IrcNickserv(handler);
    var username = this.cleanUsername(event.username);
    var password = event.password;
    var self = this;
    handler.registerEventHandler(new EventToProxy(this.proxy));

    handler.registerEventHandler(new FSM(
        ['onReceiveNOTICE', 'onReceive433', 
         'sendPass',  'onReceiveMODE',
         'onReceiveNickservNotRegistered',
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
                    handler.ident(username, 'webchat', 'irc.thehelper.net', 'webchat');
                    handler.nick(username);
                    return 'Mode';
                }
                return 'Ident';
            },
            'Mode' : function(e, d, s) {
                if (e == 'onReceiveMODE') {
                    handler.mode(username, "+i");
                    return 'Nick';
                }
                return 'Mode';
            },
            'Nick' : function(e, d, s) {
                if (e=='onReceiveNOTICE' && d.prefix.test("^NickServ!") && d.args[1].test("^please choose a different nick.")) {
                    // TODO: Sometimes nickserv seems to ignore this message.
                    // I have no idea why.
                    s.irc.identify(password);
                    s.irc.away();
                    return 'Identifying';
                } else if (e=='onReceive433') {
                    //s.irc.ghostNick();
                    //s.irc.disconnectGhost();
                    return 'DisconnectingGhost';
                }
                return 'Nick';
            },
            'DisconnectingGhost' : function(e, d, s) {
                // TODO
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
                    handler.quit();
                    return null;
                }
                return 'Identifying';
            },
            'WaitingForRegistration' : function(e, d, s) {
                if (e=='onReceiveNickservRegistrationComplete') {
                    s.irc.identify(password);
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

var EventToProxy = function(proxy) {
    this.proxy = proxy;
};
EventToProxy.prototype.onReceiveJOIN = function(e) {
    this.proxy.sendAll({'method':'DoJoinChannel','user':e.prefix,'channel':e.args[0]});
};
EventToProxy.prototype.onReceive353 = function(e) {
    this.proxy.sendAll({'method':'UsersInChannel','channelName':e.args[2],'userNames':e.args[3].trim().split(' ')});
};
EventToProxy.prototype.onReceiveONLYPRIVMSG = function(e) {
    this.proxy.sendAll({'method':'OtherMessage','channelName':e.args[0],'user':e.prefix, 'message':e.args[1]});
};
EventToProxy.prototype.onReceiveACTION = function(e) {
    this.proxy.sendAll({'method':'MessageAction','channelName':e.args[0],'user':e.prefix, 'message':e.args[1]});
};
EventToProxy.prototype.onReceivePART = function(e) {
    this.proxy.sendAll({'method':'DoPartChannel', 'user':e.prefix, 'channel':e.args[0], 'message':e.args[1]});
};
EventToProxy.prototype.onReceiveQUIT = function(e) {
    this.proxy.sendAll({'method':'DoQuit', 'user':e.prefix, 'message':e.args[0]});
};