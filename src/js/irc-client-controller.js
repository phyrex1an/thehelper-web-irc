// TODO: IrcChatEventProxy should probably be split in two classes
// one for initiating events and one for passing them on to the model
IrcChatEventProxy = function(irc, proxy) {
    this.irc = irc;
    this.proxy = proxy;
};

IrcChatEventProxy.prototype.maximizeChat = function(channelName) {
    this.sendToServer({
        'method':'MaximizeChat',
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

IrcChatEventProxy.prototype.login = function(username, password, remember) {
    this.sendToServer({'method':'Login','username':username,'password':password, 'remember':remember});
};

IrcChatEventProxy.prototype.recognize = function(username, token) {
    this.sendToServer({'method':'Login','username':username,'password':'','token':token});
};

IrcChatEventProxy.prototype.logout = function() {
    this.sendToServer({'method':'Logout'});
};

IrcChatEventProxy.prototype.receiveLogin = function(e) {
    var username = e.username;
    var password = e.password;
    this.irc.login(username, password);
};

IrcChatEventProxy.prototype.receiveLogout = function(e) {
    this.irc.logout();
};

IrcChatEventProxy.prototype.receiveLoginSuccess = function(e) {
    this.irc.loginSuccess(e.username, e.token);
};

IrcChatEventProxy.prototype.receiveLoginFail = function(e) {
    this.irc.loginFail();
};

IrcChatEventProxy.prototype.receiveMaximizeChat = function(e) {
    var channelName = e['channelName'];
    this.irc.maximizeChat(channelName);
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
    this.irc.addMessage(channelName, new IrcUserMessage(new IrcChannelUser(this.irc.username), message));
};

// TODO: Duplication between receiveOtherMessage and receiveMessageAction
IrcChatEventProxy.prototype.receiveOtherMessage = function(e) {
    var channelName = e['channelName'];
    var user = IrcChannelUser.fromHostString(e.user)
    var message = e['message'];
    // If this is a private message then the channel is equal to the sender
    if (channelName == this.irc.username) {
        channelName = user.name();
    }
    this.irc.addMessage(channelName, new IrcUserMessage(user, message));
};
IrcChatEventProxy.prototype.receiveMessageAction = function(e) {
    var channelName = e['channelName'];
    var user = IrcChannelUser.fromHostString(e.user)
    var message = e['message'];
    // If this is a private message then the channel is equal to the sender
    if (channelName == this.irc.username) {
        channelName = user.name();
    }
    this.irc.addMessage(channelName, new IrcActionMessage(user, message));
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
    var user = IrcChannelUser.fromHostString(e.user);
    if (user.name() == this.irc.username) {
        // TODO: We already do this on CloseChat, perhaps that is stupid?
    } else {
        this.irc.userPartsChannel(e.channel, user, e.message);
    }
};

IrcChatEventProxy.prototype.receiveDoQuit = function(e) {
    this.irc.userQuits(IrcChannelUser.fromHostString(e.user), e.message);
};

IrcChatEventProxy.prototype.receiveDoSaveToken = function(e) {
    this.irc.saveToken(e.token);
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
    if (e.channelName[0] != "#") { // TODO: Find a better way than name matching
        this.irc.add(new IrcChannel(e.channelName));
    }
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