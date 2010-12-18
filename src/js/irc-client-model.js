var Observable = function() {
    // TODO: The array becomes shared between all children if initialized here
    // Thus, we initialize it in the child constructors instead.
    // Thankfull if someone knows a solutions that doesn't suck
    //this.observers = [];
};
Observable.prototype._findObserverIndex = function(o) {
    for(var i = this.observers.length-1; i >= 0; i--) {
        if (this.observers[i] == o) {
            return i;
        }
    }
    return -1;
};
Observable.prototype._hasObserver = function(o) {
    return this._findObserverIndex(o) != -1;
};
Observable.prototype.addObserver = function(o) {
    this.observers  = this.observers ? this.observers : [];
    if (!this._hasObserver(o)) {
        this.observers.push(o);
    };
};
Observable.prototype.removeObserver = function(o) {
    this.observers  = this.observers ? this.observers : [];
    var i = this._findObserverIndex(o);
    if (i>=0) {
        this.observers.splice(i, 1);
    }
};
Observable.prototype.notifyObservers = function(e) {
    this.observers  = this.observers ? this.observers : [];
    var l = this.observers.length;
    for (var i = 0; i < l; i++) {
        this.observers[i].update(this, e);
    };
};

// Topmost container, deals with connection info such as current
// username, password, nickserv status etc
var IrcChatGroup = function(chatList) {
    this.chatList = chatList;
    this.password = "";
    this.username = "";
    this.isLoggingIn = false;
    this.isLoggedIn = false;
    this.observers = [];
};
IrcChatGroup.prototype = new Observable();
IrcChatGroup.unhashify = function(hash) {
    var n = new IrcChatGroup();
    n.chatList = IrcChatList.unhashify(hash.chatList);
    n.password = hash.password;
    n.username = hash.username;
    n.isLoggingIn = hash.isLoggingIn;
    n.isLoggedIn = hash.isLoggedIn;
    return n;
};
IrcChatGroup.prototype.login = function(username, password) {
    this.isLogginIn = true;
    this.username = username;
    this.password = password;
    this.isLoggingIn = true;
    this.notifyObservers('IsLoggingIn');
};
IrcChatGroup.prototype.loginSuccess = function(username) {
    this.isLoggingIn = false;
    this.isLoggedIn = true;
    this.username = username;
    this.notifyObservers('IsLoggedIn');
};
IrcChatGroup.prototype.loginFail = function() {
    this.isLoggingIn = false;
    this.isLoggedIn = false;
    this.notifyObservers('FailedLogin');
};
IrcChatGroup.prototype.logout = function() {
    this.password = "";
    this.isLogginIn = false;
    this.isLoggedIn = false;
    this.chatList.empty();
    this.notifyObservers('Logout');
};
IrcChatGroup.prototype.setCurrent = function(channelName) {
    this.chatList.setCurrent(channelName);
};
IrcChatGroup.prototype.minimizeChat = function(channelName) {
    this.chatList.minimize(channelName);
};
IrcChatGroup.prototype.remove = function(channelName) {
    this.chatList.remove(channelName);
};
IrcChatGroup.prototype.addMessage = function(channelName, message) {
    this.chatList.addMessage(channelName, message);
};
IrcChatGroup.prototype.addLogMessage = function(channelName, message) {
    this.chatList.addLogMessage(channelName, message);
};
IrcChatGroup.prototype.add = function(channel) {
    this.chatList.add(channel);
};
IrcChatGroup.prototype.userJoinsChannel = function(channel, user) {
    this.chatList.userJoinsChannel(channel, user);
};
IrcChatGroup.prototype.userPartsChannel = function(channel, user, message) {
    this.chatList.userPartsChannel(channel, user, message);
};
IrcChatGroup.prototype.userQuits = function(user, message) {
    this.chatList.userQuits(user, message);
};
IrcChatGroup.prototype.existingUsersInChannel = function(channelName, userNames) {
    this.chatList.existingUsersInChannel(channelName, userNames);
};
IrcChatGroup.prototype.hashify = function() {
    return doHashify(this).result;
};

function doHashify(o) {
    var hashified = true;
    var result = undefined;
    var subReturn;
    if (typeof o == "function") {
        hashified = false;
    } else if (o instanceof Array) {
        result = [];
        var l = o.length;
        for(var i = 0; i < l; i++) {
            subReturn = doHashify(o[i]);
            if (subReturn.hashified) {
                result[i] = subReturn.result;
            }
        }
    } else if (typeof o == "object") {
        result = {};
        for (var s in o) {
            subReturn = doHashify(o[s]);
            if (subReturn.hashified) {
                result[s] = subReturn.result;
            }
        }
    } else {
        result = o;
    }
    return {"hashified":hashified,"result":result};
};

function unhashifyArray(a, t) {
    var r = [];
    var l = a.length;
    for (var i = 0; i < l; i++) {
        r[i] = t.unhashify(a[i]);
    }
    return r;
};


var IrcChatList = function() {
    this.chats = [];
};
IrcChatList.prototype = new Observable();
IrcChatList.unhashify = function(hash) {
    var n = new IrcChatList();
    n.chats = unhashifyArray(hash.chats, IrcChat);
    n.current = hash.current;
    return n;
};
IrcChatList.prototype.add = function(chat) {
    if (this.getChannel(chat.name()) == null) {
        this.chats.push(chat);
        this.notifyObservers({'add':chat});
        if (this.chats.length==1) {
            this.setCurrent(chat.name());
        }
    }
};
IrcChatList.prototype.remove = function(channelName) {
    var l = this.chats.length;
    for (var i=0; i<l; i++) {
        if (this.chats[i].name() == channelName) {
            if (channelName == this.current) {
                this.current = "";
            }
            this.chats.splice(i,1);
            this.notifyObservers({'remove':channelName});
            break;
        };
    };
};
IrcChatList.prototype.empty = function() {
    while(this.chats.length > 0) {
        this.remove(this.chats[0].name());
    }
};
IrcChatList.prototype.setCurrent = function(channelName) {
    var chat = this.safeGetChannel(channelName);
    if (this.current) this.safeGetChannel(this.current).current(false);
    this.current = chat.name();
    chat.current(true);
};
IrcChatList.prototype.minimize = function(channelName) {
    if (this.current == channelName) {
        this.safeGetChannel(this.current).current(false);
        this.current = "";
    }
};
IrcChatList.prototype.getCurrent = function() {
    return this.current;
};
IrcChatList.prototype.getChannel = function(channelName) {
    var l = this.chats.length;
    for (var i=0; i<l; i++) {
        if (this.chats[i].name() == channelName) {
            return this.chats[i];
        };
    };
    return null;
};
IrcChatList.prototype.safeGetChannel = function(channelName, iffail) {
    var channel = this.getChannel(channelName);
    if (channel == null) {
        if (typeof iffail == "function") {
            return iffail();
        }
        if (typeof iffail != "undefined") {
            return iffail;
        }
        throw new Error("Chat does not exist " + channelName);
    };
    return channel;
};
IrcChatList.prototype.addMessage = function(channelName, msg) {
    var self = this;
    var channel = this.safeGetChannel(channelName, function() {
        var newChannel = new IrcPrivateChat(msg.from);
        self.add(newChannel);
        return newChannel;
    });
    channel.addMessage(msg);
};
IrcChatList.prototype.addLogMessage = function(channelName, msg) {
    var channel = this.safeGetChannel(channelName);
    channel.addLogMessage(msg);
};
IrcChatList.prototype.existingUsersInChannel = function(channelName, userNames) {
    var channel = this.safeGetChannel(channelName);
    var l = userNames.length;
    for (var i=0; i<l; i++) {
        channel.join(IrcChannelUser.fromName(userNames[i]));
    }
};
IrcChatList.prototype.userJoinsChannel = function(channelName, user) {
    this.safeGetChannel(channelName).join(user);
};
IrcChatList.prototype.userPartsChannel = function(channelName, user, message) {
    this.safeGetChannel(channelName).part(user, message);
};
IrcChatList.prototype.userQuits = function(user, message) {
    var l = this.chats.length;
    for(var i = 0; i<l; i++) {
        this.chats[i].quit(user, message);
    }
};

var IrcMessageList = function() {
    this.messages = [];
};
IrcMessageList.unhashify = function(hash) {
    var n = new IrcMessageList();
    n.messages = unhashifyArray(hash.messages, IrcMessage);
    return n;
};
IrcMessageList.prototype = new Observable();
IrcMessageList.prototype.add = function(message) {
    this.messages.push(message);
    this.notifyObservers({'message':message});
};
IrcMessageList.prototype.current = function() {
    this.notifyObservers({'visible':true});
};

var IrcUserList = function() {
    this.users = [];
};
IrcUserList.unhashify = function(hash) {
    var n = new IrcUserList();
    n.users = unhashifyArray(hash.users, IrcChannelUser);
    return n;
};
IrcUserList.prototype = new Observable();
IrcUserList.prototype.add = function(user) {
    this.users.push(user);
    this.notifyObservers({'event':'add','user':user});
};
IrcUserList.prototype.remove = function(user) {
    var l = this.users.length;
    for (var i=0; i<l; i++) {
        if (this.users[i].equals(user)) {
            this.users.splice(i,i);
                this.notifyObservers({'event':'remove','user':user});
            break;
        };
    };
};
IrcUserList.prototype.get = function(userName) {
    var l = this.users.length;
    for (var i=0; i<l; i++) {
        if (this.users[i].name() == userName) {
            return this.users[i];
        };
    };
    return null;
};

var IrcChat = function() {
};
IrcChat.prototype = new Observable();
IrcChat.unhashify = function(hash) {
    var subType = undefined;
    switch (hash.hashType) {
    case "IrcPrivateChat":
        subType = IrcPrivateChat;
        break;
    case "IrcVirtualChannel":
        subType = IrcVirtualChannel;
        break;
    case "IrcChannel":
        subType = IrcChannel;
        break;
    default:
        throw new Error("Unrecognized case " + hash.hashType);
    }
    var result = subType.unhashify(hash);
    result.isCurrent = hash.isCurrent;
    return result;
};
IrcChat.prototype.addMessage = function(message) {
    this.messages.add(message);
};
IrcChat.prototype.current = function(isCurrent) {
    this.isCurrent = isCurrent;
    this.notifyObservers({'current':isCurrent});
    this.messages.current();
};
IrcChat.prototype.setTitle = function(title) {
    this.notifyObservers({'title':title});
};

var IrcPrivateChat = function(withUser) {
    this.messages = new IrcMessageList();
    this.user = withUser;
    this.hashType = "IrcPrivateChat";
};
IrcPrivateChat.prototype = new IrcChat();
IrcPrivateChat.unhashify = function(hash) {
    var n = new IrcPrivateChat(IrcChannelUser.unhashify(hash.user));
    n.messages = IrcMessageList.unhashify(hash.messages);
    return n;
};
IrcPrivateChat.getUser = function(u) {
    if (this.user.equals(u))
        return this.user;
    throw new Error("Unknown user in private chat");
};
IrcPrivateChat.prototype.name = function() {
    return this.user.name();
};
IrcPrivateChat.prototype.view = function(proxy) {
    return new IrcPrivateChatView(this, proxy);
};

var IrcChannel = function(name) {
    this._name = name;
    this.messages = new IrcMessageList();
    this.users = new IrcUserList();
    this.hashType = "IrcChannel";
};
IrcChannel.prototype = new IrcChat();
IrcChannel.unhashify = function(hash) {
    var n = new IrcChannel(hash._name);
    n.messages = IrcMessageList.unhashify(hash.messages);
    n.users = IrcUserList.unhashify(hash.users);
    return n;
};
IrcChannel.prototype.name = function() {
    return this._name;
};
IrcChannel.prototype.join = function(user) {
    this.users.add(user);
};
IrcChannel.prototype.part = function(user, message) {
    this.users.remove(user);
};
IrcChannel.prototype.quit = function(user, message) {
    this.users.remove(user);
};
IrcChannel.prototype.getUser = function(userName) {
    return this.users.get(userName);
};
IrcChannel.prototype.view = function(proxy) {
    return new IrcChannelView(this, proxy);
};

var IrcVirtualChannel = function(name, messageUser) {
    this._name = name;
    this.messageUser = messageUser;
    this.messages = new IrcMessageList();
    this.hashType = "IrcVirtualChannel";
};
IrcVirtualChannel.prototype = new IrcChat();
IrcVirtualChannel.unhashify = function(hash) {
    var n = new IrcVirtualChannel(hash._name, IrcChannelUser.unhashify(hash.messageUser));
    n.messages = IrcMessageList.unhashify(hash.messages);
    return n;
};
IrcVirtualChannel.prototype.name = function() {
    return this._name;
};
IrcVirtualChannel.prototype.addLogMessage = function(messageContent) {
    this.addMessage(new IrcUserMessage(this.messageUser, messageContent));
};
IrcVirtualChannel.prototype.view = function(proxy) {
    return new IrcVirtualChannelView(this, proxy);
};

var IrcMessage = function() {}
IrcMessage.unhashify = function(hash) {
    var subType;
    switch (hash.hashType) {
    case 'IrcUserMessage':
        subType = IrcUserMessage;
        break;
    case 'IrcActionMessage':
        subType = IrcActionMessage;
        break;
    default:
        throw new Error("Unrecognized case " + hash.hashType);
    }
    var result = subType.unhashify(hash);
    result.from = IrcChannelUser.unhashify(hash.from);
    result.content = hash.content;
    return result;
};

var IrcUserMessage = function(from, content) {
    this.hashType = 'IrcUserMessage';
    this.from = from;
    this.content = content;
};
IrcUserMessage.unhashify = function(hash) {
    return new IrcUserMessage();
};
IrcUserMessage.prototype.view = function() {
    return new IrcMessageView(this);
};

// TODO: Duplication from IrcMessage
var IrcActionMessage = function(from, content) {
    this.hashType = 'IrcActionMessage';
    this.from = from;
    this.content = content;
};
IrcActionMessage.unhashify = function(hash) {
    return new IrcActionMessage();
};
IrcActionMessage.prototype.view = function() {
    return new IrcActionMessageView(this);
};

var IrcChannelUser = function(name) {
    this._name = name;
};
IrcChannelUser.unhashify = function(hash) {
    return new IrcChannelUser(hash._name);
};
IrcChannelUser.prototype.equals = function(user) {
    return this._name == user.name();
};
IrcChannelUser.prototype.name = function() {
    return this._name;
};

IrcChannelUser.fromName = function(name) {
    var special_list = ['%', '@', '+', '&']; // TODO: The server can provide this list
    var fst = name.charAt(0);
    var l = special_list.length;
    for (var i=0; i<l; i++) {
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