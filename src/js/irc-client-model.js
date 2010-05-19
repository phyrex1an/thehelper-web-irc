var Observable = function() {
    
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
    if (!this._hasObserver(o)) {
        this.observers.push(o);
    };
};
Observable.prototype.removeObserver = function(o) {
    var i = this._findObserverIndex(o);
    if (i>=0) {
        this.observers.splice(i, 1);
    }
};
Observable.prototype.notifyObservers = function(e) {
    var l = this.observers.length;
    for (var i = 0; i < l; i++) {
        this.observers[i].update(this, e);
    };
};

var IrcChatList = function() {
    this._view = new IrcChatListView();
    this.addObserver(this._view);
    this.chats = [];
};
IrcChatList.prototype = new Observable();
IrcChatList.prototype.add = function(chat) {
    // TODO: Check if chat is in list
    this.chats.push(chat);
    this.notifyObservers(chat);
};
IrcChatList.prototype.remove = function(chat) {
    for (var i in this.chats) {
        if (this.chats[i].name() == chat.name()) {
            this.chats.splice(i,1);
            break;
        };
    };
};
IrcChatList.prototype.setCurrent = function(chat) {
    // TODO: Check if chat is in list
    if (this.current) this.current.current(false);
    this.current = chat;
    chat.current(true);
};
IrcChatList.prototype.getCurrent = function() {
    return this.current;
};
IrcChatList.prototype.getChannel = function(channelName) {
    for (var i in this.chats) {
        if (this.chats[i].name() == channelName) {
            return this.chats[i];
        };
    };
    return null;
};
IrcChatList.prototype.addMessage = function(channelName, msg, from) {
    var channel = this.getChannel(channelName);
    if (channel == null) {
        // TODO: Error? Add chat? Investigate.
    };
    channel.addMessage(msg, from);
};
IrcChatList.prototype.view = function() {
    return this._view.html;
};

var IrcMessageList = function() {
    this._view = new IrcMessageListView();
    this.addObserver(this._view);
    this.messages = [];
};
IrcMessageList.prototype = new Observable();
IrcMessageList.prototype.add = function(message) {
    this.messages.push(message);
    this.notifyObservers(message);
};
IrcMessageList.prototype.view = function() {
    return this._view.html;
};

var IrcUserList = function() {
    this._view = new IrcUserListView();
    this.addObserver(this._view);
    this.users = [];
};
IrcUserList.prototype = new Observable();
IrcUserList.prototype.add = function(user) {
    this.users.push(user);
    this.notifyObservers(user);
};
IrcUserList.prototype.remove = function(user) {
    for (var i in this.users) {
        if (this.users[i].equals(user)) {
            this.users.splice(i,i);
            break;
        };
    };
};
IrcUserList.prototype.get = function(userName) {
    for (var i in this.users) {
        if (this.users[i].name() == userName) {
            return this.users[i];
        };
    };
    return null;
};
IrcUserList.prototype.view = function() {
    return this._view.html;
};

var IrcChat = function() {
};
IrcChat.prototype = new Observable();
IrcChat.prototype.addMessage = function(message) {
    this.messages.add(message);
};
IrcChat.prototype.buildHtml = function(canClose) {
    this._view = new IrcChatView(canClose);
    this.addObserver(this._view);
};
IrcChat.prototype.view = function() {
    return this._view.html;
};
IrcChat.prototype.current = function(isCurrent) {
    this.isCurrent = isCurrent;
    this.notifyObservers({'current':isCurrent});
};
IrcChat.prototype.setTitle = function(title) {
    this.notifyObservers({'title':title});
};
IrcChat.prototype.close = function(f) {
    if (typeof f == "undefined") {
        this.onClose();
    } else {
        this.onClose = f;
    };
};
IrcChat.prototype.click = function(f) {
    if (typeof f == "undefined") {
        this.onClick();
    } else {
        this.onClick = f;
    };
};

var IrcPrivateChat = function(withUser) {
    this.messages = new IrcMessageList();
    this.user = withUser;
    this._view = new IrcPrivateChatView(this.user.name());
    this._view.addComponent(this.messages.view());
};
IrcPrivateChat.prototype = new IrcChat();
IrcPrivateChat.getUser = function(u) {
    if (this.user.equals(u))
        return this.user;
    throw new Error("Unknown user in private chat");
};
IrcPrivateChat.prototype.name = function() {
    return this.user.name();
};

var IrcChannel = function(name) {
    this.messages = new IrcMessageList();
    this._name = name;
    this._view = new IrcChannelView(this._name);
    this.users = new IrcUserList();
    this._view.addComponent(this.messages.view());
    this._view.addComponent(this.users.view());
};
IrcChannel.prototype = new IrcChat();
IrcChannel.prototype.name = function() {
    return this._name;
};
IrcChannel.prototype.join = function(user) {
    this.users.add(user);
};
IrcChannel.prototype.part = function(user) {
    this.users.remove(user);
};
IrcChannel.prototype.getUser = function(userName) {
    return this.users.get(userName);
};

var IrcVirtualChannel = function(name, messageUser) {
    this.messages = new IrcMessageList();
    this._name = name;
    this.messageUser = messageUser;
    this._view = new IrcVirtualChannelView(name);
    this._view.addComponent(this.messages.view());
};
IrcVirtualChannel.prototype = new IrcChat();
IrcVirtualChannel.prototype.name = function() {
    return this._name;
};
IrcVirtualChannel.prototype.addLogMessage = function(messageContent) {
    this.addMessage(new IrcMessage(this.messageUser, messageContent));
};

var IrcMessage = function(from, content) {
    this.from = from;
    this.content = content;
    this._view = new IrcMessageView(this.from.name(), this.content);
};
IrcMessage.prototype.view = function() {
    return this._view.html;
};

var IrcChannelUser = function(name) {
    this._name = name;
    this._view = new IrcChannelUserView(name);
};
IrcChannelUser.prototype.equals = function(user) {
    return this._name == user.name();
};
IrcChannelUser.prototype.name = function() {
    return this._name;
};
IrcChannelUser.prototype.view = function() {
    return this._view.html;
};

IrcChannelUser.fromName = function(name) {
    var special_list = ['%', '@', '+'];
    var fst = name.charAt(0);
    for (var i in special_list) {
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