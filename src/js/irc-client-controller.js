// TODO: IrcChatEventProxy should probably be split in two classes
// one for initiating events and one for passing them on to the model
var IrcChatEventProxy = function(irc, proxy) {
    this.irc = irc;
    this.proxy = proxy;
};

IrcChatEventProxy.prototype.switchChat = function(channelName) {
    this.sendToServer({
        'method':'SwitchChat',
        'channelName' : channelName
    });
};

IrcChatEventProxy.prototype.minimizeChat = function(channelName) {
    this.sendToServer({
        'method':'MinimizeChat',
        'channelName' : channelName
    });
};

IrcChatEventProxy.prototype.closeChat = function(channelName) {
    this.sendToServer({
        'method':'CloseChat',
        'channelName' : channelName
    });
};

IrcChatEventProxy.prototype.selfMessage = function(channelName, message) {
    this.sendToServer({
        'method' : 'SelfMessage',
        'channelName' : channelName,
        'message' : message
    });
};

IrcChatEventProxy.prototype.otherMessage = function(channelName, user, message) {
    this.sendToServer({
        'method' : 'OtherMessage',
        'channelName' : channelName,
        'user' : user,
        'message' : message
    });
};

IrcChatEventProxy.prototype.joinChannel = function(channelName) {
    this.sendToServer({'method':'JoinChannel','channelName':channelName});
};

IrcChatEventProxy.prototype.login = function(username, password) {
    this.sendToServer({'method':'Login','username':username,'password':password});
};

IrcChatEventProxy.prototype.receiveLogin = function(e) {
    var username = e.username;
    var password = e.password;
    this.irc.login(username, password);
};

IrcChatEventProxy.prototype.receiveLoginSuccess = function(e) {
    this.irc.loginSuccess();
};

IrcChatEventProxy.prototype.receiveSwitchChat = function(e) {
    var channelName = e['channelName'];
    this.irc.setCurrent(channelName);
};

IrcChatEventProxy.prototype.receiveMinimizeChat = function(e) {
    this.irc.minimizeChat(e.channelName);
};

IrcChatEventProxy.prototype.receiveCloseChat = function(e) {
    var channelName = e['channelName'];
    this.irc.remove(channelName);
};

IrcChatEventProxy.prototype.receiveSelfMessage = function(e) {
    var channelName = e['channelName'];
    var message = e['message'];
    this.irc.addMessage(channelName, new IrcMessage(new IrcChannelUser(this.irc.username), message)); // TODO: Use this user name
};

IrcChatEventProxy.prototype.receiveOtherMessage = function(e) {
    var channelName = e['channelName'];
    var user = e['user'];
    var message = e['message'];
    // TODO: Handle the first message in private chat case, somewhere.
    this.irc.addMessage(channelName, new IrcMessage(IrcChannelUser.fromHostString(user), message));
};


IrcChatEventProxy.prototype.receiveAddLogMessage = function(e) {
    var channelName = e['channelName'];
    var message = e['message'];
    this.irc.addLogMessage(channelName, message);
};


IrcChatEventProxy.prototype.receiveDoJoinChannel = function(e) {
    var channelName = e.channel;
    var user = IrcChannelUser.fromHostString(e.user);
    if (user.name() == this.irc.username) {
        this.irc.add(new IrcChannel(channelName));
    } else {
        this.irc.userJoinsChannel(channelName, user);
    }
};

IrcChatEventProxy.prototype.receiveDoPartChannel = function(e) {
    this.irc.userPartsChannel(e.channel, IrcChannelUser.fromHostString(e.user), e.message);
};

IrcChatEventProxy.prototype.receiveDoQuit = function(e) {
    this.irc.userQuits(ChannelUser.fromHostString(e.user), e.message);
};

// This is a receive only event
IrcChatEventProxy.prototype.receiveUsersInChannel = function(e) {
    var channelName = e['channelName'];
    var userNames = e['userNames'];
    this.irc.existingUsersInChannel(channelName, userNames);
};

IrcChatEventProxy.prototype.receiveUserLeftChannel = function(e) {
    var channelName = e['channelName'];
    var userName = e['userName'];
};

IrcChatEventProxy.prototype.receiveUserJoinedChannel = function(e) {
    var channelName = e['channelName'];
    var userName = e['userName'];
};

IrcChatEventProxy.prototype.receiveUserChangedNick = function(e) {
    var oldNick = e['oldNick'];
    var newNick = e['newNick'];
};

IrcChatEventProxy.prototype.receiveJoinChannel = function(e) {
    // Empty on purpose. No client side resonse.
};

IrcChatEventProxy.prototype.sendToServer = function(event) {
    this.proxy.sendAll(event);
};

IrcChatEventProxy.prototype.getFromServer = function(event) {
    var method = 'receive' + event['method'];
    if (typeof this[method] == 'function') {
        this[method](event);
    }
};

IrcChatEventProxy.prototype.update = function(proxy, event) {
    this.getFromServer(event);
};


var IrcClientController = function(proxy, root) {
    this.proxy = proxy;
    this.root = root;
};
IrcClientController.prototype.update = function(proxy, event) {
    // TODO: Copy from IrcServerController
    if (typeof this['on' + event['method']] == 'function') {
        this['on' + event['method']](event);
    }
};
IrcClientController.prototype.onSetup = function(event) {
    if (typeof this.irc == "undefined") {
        this.irc = IrcChatGroup.unhashify(event.irc);
        var chatProxy = new IrcChatEventProxy(this.irc, this.proxy);
        this.proxy.addObserver(chatProxy);
        this.view = new IrcChatGroupView(this.irc, chatProxy, this.root);
        this.root.html(this.view.html);
    }
};
IrcClientController.prototype.onLogin = function(event) {
    this.view.disable();
};