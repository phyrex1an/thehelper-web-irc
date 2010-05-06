var THIrcUI = function(handler, username, root) {
    this.handler = handler;
    this.username = username;
    this.root = root;
    this.waitingForPassword = false;
    this.sysName = '*system*';
    this.sysUser = '***System***';
    this.currentChannel = this.sysName;
    this.defaultChannels = ['#thehelper'];
    this.channelList = new THIrcChannelList();
    this.channelList.add(new THIrcChannelUI(this.sysName));
    this.channelList.setCurrent(this.sysName);
    this.handler.registerEventHandler(this);
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
    this.handler.sendEvent({
        'identifier' : 'SendPass',
        'password'   : 'webchat'
    });
    if (!this.setNick(this.username)) {
        // TODO: unable to set nick
    }
    this.focusInput();
    this.waitingForPassword = true;
    this.input.password();
    this.input.enable();
    this.addSysMessage("Please enter your forum password");
};
THIrcUI.prototype.focusInput = function() {
    $('.input-zone input', this.root).focus();
};
// When we get login details, connect to nickserv and
// do login/register procedure
THIrcUI.prototype._onSubmit = function(value) {
    if (this.waitingForPassword == true) {
        this.password = value;
        new IrcNickserv(this.handler);
        this.handler.sendEvent({
            'identifier' : 'SendNickservIdentify',
            'password' : this.password
        });
        this.waitingForPassword = false;
        this.input.text();
        this.input.disable();
    } else {
        
    }
};
THIrcUI.prototype.onReceiveNickservNotRegistered = function(e) {
    if (e.nick == this.nickname) {
        this.handler.sendEvent({
            'identifier' : 'SendNickservRegister',
            'nickname' : this.nickname,
            'domain'    : 'www.thehelper.net'
        });
    };
};
THIrcUI.prototype.onReceiveNickservPasswordAccepted = function(e) {
    this.joinDefaultChannels();
    this.input.enable();
    this.input.text();
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
THIrcUI.prototype.setNick = function (nickname) {
    nickname = this.cleanNick(nickname);
    this.nickname = nickname;
    this.irc.ident(this.nickname, '8 *', this.nickname);
    this.irc.nick(this.nickname);
    $('.show-nick', this.root).html(nickname);
    return true;  
};
THIrcUI.prototype.cleanNick = function(nick){
    var ret = String(nick).replace(/[^a-zA-Z0-9\-_~]/g, '');
    ret = ret.replace(/^[0-9]+/, '');
    if(ret=='') return 'Guest'+Math.round(Math.random()*100);
        
    if(nick != ret) this.showError('Invalid nick "'+this.sanitize(nick)+'" changed to "'+ret+'".');
    return ret;
};
THIrcUI.prototype.paintChat = function() {
    var html = (<><![CDATA[
            <div class="header">
                <div class="server">IRC @ thehelper</div>
            </div>
            <div class="chat">
            </div>
            <div class="show-nick"></div>
            </div>]]></>).toString();
    this.root.html(html);
    this.header = $('.header', this.root);
    this.chat = $('.chat', this.root);
    $('.header', this.root).append(this.channelList.get());
    this.input = new THIrcInput();
    this.input.disable();
    var self = this;
    this.input.addSendListener(function(input) {
        self._onSubmit(input);
    });

    $('.chat', this.root)
        .append(this.channelList.getCurrent().get())
        .append(this.input.get());
};
THIrcUI.prototype.joinDefaultChannels = function() {
    for (var i in this.defaultChannels) {
        this.joinChannel(this.defaultChannels[i]);
    };
};
THIrcUI.prototype.joinChannel = function(channel) {
    this.irc.join(channel);
    this.channelList.add(new THIrcChannelUI(channel));
};
THIrcUI.prototype.addSysMessage = function(message) {
    this.channelList.getCurrent().addMessage(this.sysUser, message);
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
    this.input = $('input[type=password]', this.root);
    if (!this.enabled)
        this.input.attr('disabled', 'true');
};

// A message from somebody
var THIrcMessage = function(from, message) {
    this.from = from;
    this.message = message;
    this.root = $('<li>').append($('<span class="user">').text(this.from)).append($('<span class="message">').text(this.message));
};
THIrcMessage.prototype = new Object();
THIrcMessage.prototype.get = function() {
    return this.root;
};

var THIrcChannelList = function() {
    this.list = [];
    this.tabId = 0;
    this.classLookup = [];
    this.current = "";
    this.root = $('<ul class="tabs">');
};
THIrcChannelList.prototype.setCurrent = function(current) {
    $('.' + this.classLookup[this.current], this.root).removeClass('current');
    this.current = current;
    $('.' + this.classLookup[this.current], this.root).addClass('current');
};
THIrcChannelList.prototype.getCurrent = function(current) {
    return this.list[this.current];
};
THIrcChannelList.prototype.get = function() {
    return this.root;
}
THIrcChannelList.prototype.add = function(channel) {
    var name = channel.getName(); 
    this.classLookup[name] = 'tabid_' + this.tabId++;
    this.list[name] = channel;
    this.root.append($('<li>')
                     .addClass(this.classLookup[name])
                     .append('<a class="close">')
                     .append($('<a class="link">').text(channel.getName()))
                    );
};

// A channel user and related info
var THIrcUser = function() {
    
};
THIrcUser.prototype = new Object();



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