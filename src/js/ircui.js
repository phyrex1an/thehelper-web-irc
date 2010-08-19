var THIrcUI = function(handler, username, root) {
    this.handler = handler;
    this.self = IrcChannelUser.fromName(username);

    this.ghostId = 0;
    this.realName = username;
    this.username = this.cleanNick(this.realName);
    this.root = root;
    this.selfUser = IrcChannelUser.fromName(this.username);

    this.waitingForPassword = false;

    this.defaultChannels = ['#thehelper'];
    this.channelList = new IrcChatList();
    this.ircProxy = new IrcChatEventProxy(this.channelList, handler);
    this.chatView = new IrcChatListView(this.channelList, this.ircProxy);
    this.systemChannelName = '*system*'
    this.systemChannel = new IrcVirtualChannel(this.systemChannelName, IrcChannelUser.fromName('***System***'))
    this.channelList.add(this.systemChannel);
    this.channelList.setCurrent(this.systemChannel.name());
    this.handler.registerEventHandler(this);
    this.fsm = new FSM(
        ['onOpen', 'onReceive001', 'onReceive433', 
         'sendPass', 
         'onReceiveNickservNotRegistered',
         'onReceiveNickservPasswordAccepted'],
        {
            'Ident' : function(e, d, s) {
                if (e == 'onOpen') {
                    s.irc.pass();
                    s.irc.ident();
                    s.irc.nick();
                    return 'Nick';
                }
            },
            'Nick' : function(e, d, s) {
                if (e=='onReceive001') {
                    s.irc.nickservIdentify();                    
                    return 'Identifying';
                } else if (e=='onReceive433') {
                    s.irc.ghostNick();
                    s.irc.disconnectGhost();
                    return 'DisconnectingGhost';
                }
            },
            'DisconnectingGhost' : function(e, d, s) {
                // TODO
            },
            'Identifying' : function(e, d, s) {
                if (e=='onReceiveNickservNotRegistered') {
                    s.irc.registerNick();
                    return 'WaitingForRegistration';
                } else if (e=='onReceiveNickservPasswordAccepted') {
                    s.irc.joinDefaultChannels();
                    return 'JoinedChannel';
                }
            },
            'WaitingForRegistration' : function(e, d, s) {
                // TODO: identify
            },
            'JoinedChannel' : function(e, d, s) {
                // TODO: ...
            }
        }, 'Ident',
        {'irc':this});
    new IrcNickserv(this.handler);
    this.handler.registerEventHandler(this.fsm);
    this.paintChat();
};
THIrcUI.prototype = new Object();
THIrcUI.prototype.start = function(socket, password) {
    this.password = password;
    this.connectIrc(socket);
};
THIrcUI.prototype.connectIrc = function(socket) {
    this.handler.connect('irc.thehelper.net', 6667, socket);
}; 
// When we have an open connection to the irc, probe user for login details
THIrcUI.prototype.onOpen = function() {
    this.fsm.start();
    this.waitingForPassword = true;
    this.addSysMessage("Please enter your forum password");
};
THIrcUI.prototype.registerNick = function() {
    this.handler.sendEvent({
        'identifier' : 'SendNickservRegister',
        'nickname' : this.nickname,
        'domain'    : 'www.thehelper.net'
    });
};
THIrcUI.prototype.onReceiveNOTICE = function(e) {
    this.addSysMessage(e.args[1]);
};
THIrcUI.prototype.onReceiveError = function(e) {
    this.addSysMessage(e.args[2]);
};
THIrcUI.prototype.onReceiveResponse = function(e) {
    this.addSysMessage(e.args[1]);
};
THIrcUI.prototype.onReceiveJOIN = function(e) {
    var channel = e.args[0];
    this.ircProxy.getFromServer({
        'method' : 'DoJoinChannel',
        'channelName' : channel
    });
};
THIrcUI.prototype.onReceivePRIVMSG = function(e) {
    var channelName = e.args[0];
    var msg = e.args[1];
    var from = e.prefix;
    var fromUser = IrcChannelUser.fromHostString(from)
    channelName = this.self.name() == channelName ? fromUser.name() : channelName;
    this.ircProxy.getFromServer({
        'method' : 'OtherMessage',
        'channelName' : channelName,
        'user' : fromUser.name(),
        'message' : msg
    });
};
THIrcUI.prototype.onReceive353 = function(e) {
    // Channel names list
    var channelName = e.args[2];
    var users = e.args[3].trim().split(" ");
    this.ircProxy.getFromServer({
        'method' : 'UsersInChannel',
        'channelName' : channelName,
        'userNames' : users
    });
};
THIrcUI.prototype.ghostNick = function() {
    // Nickname already in use (disconnect ghost)
    this.username = this.cleanNick(this.realName + this.ghostId++);
    this.nick();
};
THIrcUI.prototype.disconnectGhost = function() {
    this.handler.sendEvent({
        'identifier' : 'SendNickservDisconnectGhost',
        'username'   : this.cleanNick(this.realName),
        'password'   : this.password
    });
};
THIrcUI.prototype.nickservIdentify = function() {
    this.handler.sendEvent({
        'identifier' : 'SendNickservIdentify',
        'password' : this.password
    });
};
THIrcUI.prototype.pass = function() {
    this.handler.sendEvent({
        'identifier' : 'SendPass',
        'password'   : 'webchat'
    });
};
THIrcUI.prototype.ident = function() {
    this.handler.ident(this.username, '8 *', this.username);
};
THIrcUI.prototype.nick = function(username) {
    this.handler.nick(this.username);
};
THIrcUI.prototype.cleanNick = function(nick){
    var ret = String(nick).replace(/[^a-zA-Z0-9\-_~]/g, '');
    ret = ret.replace(/^[0-9]+/, '');
    if(ret=='') return 'Guest'+Math.round(Math.random()*100);
        
    if(nick != ret) this.showError('Invalid nick "'+this.sanitize(nick)+'" changed to "'+ret+'".');
    return ret;
};
THIrcUI.prototype.paintChat = function() {
    this.root.append(this.chatView.html)
};
THIrcUI.prototype.joinDefaultChannels = function() {
    for (var i in this.defaultChannels) {
        this.handler.join(this.defaultChannels[i]);
    };
};
THIrcUI.prototype.addSysMessage = function(message) {
    this.ircProxy.getFromServer({
        'method' : 'AddLogMessage',
        'channelName' : this.systemChannelName,
        'message' : message
    });
};
// Called when we're setting up a connection to the ape server
THIrcUI.prototype.connecting = function() {
    this.addSysMessage("Connecting to irc server...");
};
THIrcUI.prototype.connectionFailed = function() {
    this.addSysMessage("Connection failed...");
};