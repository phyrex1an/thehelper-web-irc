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
    this.systemChannel = new IrcVirtualChannel('*system*', IrcChannelUser.fromName('***System***'))
    this.channelList.add(this.systemChannel);
    this.channelList.setCurrent(this.systemChannel);
    this.handler.registerEventHandler(this);
    this.fsm = new FSM(['start', 'onReceive001', 'onReceive433', 
                        'sendPass', 
                        'onReceiveNickservNotRegistered',
                        'onReceiveNickservPasswordAccepted'],
                       {
                           'Ident' : function(e, d, s) {
                               if (e == 'start') {
                                   s.irc.pass();
                                   s.irc.ident();
                                   s.irc.nick();
                                   s.hasGhost = false;
                                   return 'Nick';
                               }
                           },
                           'Nick' : function(e, d, s) {
                               if (e=='onReceive001') {
                                   s.irc.input.password();
                                   s.irc.input.enable();
                                   s.irc.input.focus();
                                   return 'WaitingForPass';
                               } else if (e=='onReceive433') {
                                   s.hasGhost = true;
                                   s.irc.ghostNick();
                                   return 'Nick';
                               }
                           },
                           'WaitingForPass' : function(e, d, s) {
                               if (e=='sendPass') {
                                   s.irc.input.disable();
                                   if (s.hasGhost) {
                                       s.irc.disconnectGhost();
                                       return 'DisconnectingGhost';
                                   } else {
                                       s.irc.nickservIdentify();
                                       return 'Identifying';
                                   }
                               }
                           },
                           'DisconnectingGhost' : function(e, d, s) {},
                           'Identifying' : function(e, d, s) {
                               if (e=='onReceiveNickservNotRegistered') {
                                   s.irc.registerNick();
                                   return 'WaitingForRegistration';
                               } else if (e=='onReceiveNickservPasswordAccepted') {
                                   s.irc.joinDefaultChannels();
                                   s.irc.input.text();
                                   s.irc.input.enable();
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
THIrcUI.prototype.start = function(socket,  irc) {
    this.irc = irc;
    this.connectIrc(socket);
};
THIrcUI.prototype.connectIrc = function(socket) {
    this.irc.connect('irc.thehelper.net', 6667, socket);
};
// When we have an open connection to the irc, probe user for login details
THIrcUI.prototype.onOpen = function() {
    this.fsm.start();
    this.waitingForPassword = true;
    this.addSysMessage("Please enter your forum password");
};
// When we get login details, connect to nickserv and
// do login/register procedure
THIrcUI.prototype._onSubmit = function(value) {
    if (this.waitingForPassword == true) {
        this.password = value;
        this.waitingForPassword = false;
        this.fsm.sendPass();
    } else {
        var currentChannel = this.channelList.getCurrent();
        this.handler.sendEvent({
            'identifier' : 'SendPrivMsg',
            'destination' : currentChannel.name(),
            'message' : value
        });
        currentChannel.addMessage(new IrcMessage(this.selfUser, value));
    }
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
    this.channelList.add(new IrcChannel(channel));
};
THIrcUI.prototype.onReceivePRIVMSG = function(e) {
    var channelName = e.args[0];
    var msg = e.args[1];
    var from = e.prefix;
    var fromUser = IrcChannelUser.fromHostString(from)
    channelName = this.self.name() == channelName ? fromUser.name() : channelName;
    var channel = this.channelList.getChannel(channelName);
    if (channel == null) {
        channel = new IrcPrivateChat(fromUser);
        this.channelList.add(channel);
    };
    channel.addMessage(new IrcMessage(fromUser, msg));
};
THIrcUI.prototype.onReceive353 = function(e) {
    // Channel names list
    var channelName = e.args[2];
    var users = e.args[3].trim().split(" ");
    var channel = this.channelList.getChannel(channelName);
    for (var i in users) {
        channel.join(IrcChannelUser.fromName(users[i]));
    };
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
    this.irc.ident(this.username, '8 *', this.username);
};
THIrcUI.prototype.nick = function(username) {
    this.irc.nick(this.username);
};
THIrcUI.prototype.cleanNick = function(nick){
    var ret = String(nick).replace(/[^a-zA-Z0-9\-_~]/g, '');
    ret = ret.replace(/^[0-9]+/, '');
    if(ret=='') return 'Guest'+Math.round(Math.random()*100);
        
    if(nick != ret) this.showError('Invalid nick "'+this.sanitize(nick)+'" changed to "'+ret+'".');
    return ret;
};
THIrcUI.prototype.paintChat = function() {
    this.input = new THIrcInput();
    this.input.disable();
    var self = this;
    this.input.addSendListener(function(input) {
        self._onSubmit(input);
    });
    this.root
        .append(this.channelList.view())
        .append(this.input.get());
};
THIrcUI.prototype.joinDefaultChannels = function() {
    for (var i in this.defaultChannels) {
        this.joinChannel(this.defaultChannels[i]);
    };
};
THIrcUI.prototype.joinChannel = function(channel) {
    this.irc.join(channel);
};
THIrcUI.prototype.addSysMessage = function(message) {
    this.systemChannel.addLogMessage(message);
}
// Called when we're setting up a connection to the ape server
THIrcUI.prototype.connecting = function() {
    this.addSysMessage("Connecting to irc server...");
};
THIrcUI.prototype.connectionFailed = function() {
    this.addSysMessage("Connection failed...");
};


var THIrcChannelUI = function(chanName) {
    this.messages = [];
    this.root = $('<div class="channel">').append('<dl class="history">').append('<div class="user-info">');
    this.messageCanvas = $('.history', this.root);
    this.userCanvas = $('.user-info', this.root);
    this.chanName = chanName;
};
THIrcChannelUI.prototype = new Object();
THIrcChannelUI.prototype.addMessage = function(from, message) {
    var newMessage = new THIrcMessage(from, message);
    this.messageCanvas.append(newMessage.get());
};
THIrcChannelUI.prototype.get = function() {
    return this.root;
};
THIrcChannelUI.prototype.getName = function() {
    return this.chanName;
};

// THIrcInput deals with the input field to the chat.
var THIrcInput = function() {
    this.listeners = [];
    this.root = $('<form class="input-zone" />');
    this.root.append('<input type="text" class="input" disabled="false" /><input type="submit" value="Send" disabled="false" />');
    this.input  = $('input[type=text]', this.root);
    this.button = $('input[type=submit]', this.root);
    var t = this;
    this.root.submit(function(e) {
        t.onSubmit(t.input.attr('value'));
        t.input.attr('value', '');
        return false;
    });
};
THIrcInput.prototype.get = function() {
    return this.root;
};
THIrcInput.prototype.disable = function() {

};
THIrcInput.prototype.addSendListener = function(listener) {
    this.listeners.push(listener);
};
THIrcInput.prototype.onSubmit = function(value) {
    for (var i in this.listeners) {
        (this.listeners[i])(value);
    };
};
THIrcInput.prototype.disable = function() {
    this.enabled = false;
    this.input.attr('disabled', 'true');
    this.button.attr('disabled', 'true');
};
THIrcInput.prototype.enable = function() {
    this.enabled = true;
    this.input.removeAttr('disabled');
    this.button.removeAttr('disabled');
};
THIrcInput.prototype.password = function() {
    var old = this.input.replaceWith('<input type="password" class="input"/>');
    this.input = $('input[type=password]', this.root);
    if (!this.enabled)
        this.input.attr('disabled', 'true');
};
THIrcInput.prototype.text = function() {
    var old = this.input.replaceWith('<input type="text" class="input"/>');
    this.input = $('input[type=text]', this.root);
    if (!this.enabled)
        this.input.attr('disabled', 'true');
};
THIrcInput.prototype.focus = function() {
    this.input.focus();
};