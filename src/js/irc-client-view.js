var IrcChatListView = function() {
    this.html = $('<ul class="channels">'); 
};
IrcChatListView.prototype.update = function(l, chat) {
    this.html.append(m.view());
    var list = l;
    chat.click(function() {
        list.setCurrent(chat);
    });
    chat.close(function() {
        list.remove(chat);
    });
};

var IrcMessageListView = function() {
    this.html = $('<ol class="messages">');
};
IrcMessageListView.prototype.update = function(l, message) {
    this.html.append(message.view());
};


var IrcUserListView = function() {
    this.html = $('<ul class="users">');
};
IrcUserListView.prototype.update = function(l, user) {
    this.html.append(user.view());
};

var IrcChatView = function() {};
IrcChatView.prototype.makeBody = function() {
    this.html = $('<li class="channel">');
};
IrcChatView.prototype.makeClose = function() {
    var self = this;
    var close_button = $('<a class="close" alt="Close">')
        .click(function() {
            self.onClose();
        });
    this.html.append(close_button);
};
IrcChatView.prototype.makeTitle = function(text) {
    var title = $('<h2 class="title">');
    var self = this;
    this.title = $('<span>')
        .text(text)
        .click(function() {
            self.onClick();
        });
    title.append(this.title);
    this.html.append(title);
};
IrcChatView.prototype.addComponent = function(c) {
    this.html.append(c);
};
IrcChatView.prototype.onClick = function() {};
IrcChatView.prototype.onClose = function() {};
IrcChatView.prototype.update = function(c, m) {
    if (typeof m.current != "undefined") {
        if (m.current) {
            this.html.addClass('current');
        } else {
            this.html.removeClass('current');
        }
    } else if (typeof m.title != "undefined") {
        this.title.text(m.title);
    }
};

var IrcPrivateChatView = function(title) {
    this.makeBody();
    this.makeClose();
    this.makeTitle(title);
};
IrcPrivateChatView.prototype = new IrcChatView();

var IrcChannelView = function(title) {
    this.makeBody();
    this.makeClose();
    this.makeTitle(title);
};
IrcChannelView.prototype = new IrcChatView();

var IrcVirtualChannelView = function(title) {
    this.makeBody();
    this.makeTitle(title);
};
IrcVirtualChannelView.prototype = new IrcChatView();

// Probably not needed, move functionality to the message list view instead
var IrcMessageView = function(from, content) {
    this.html = $('<li class="chat-message">');
    this.html.append($('<span class="user">').text(from));
    this.html.append($('<span class="body">').text(content));
};

var IrcChannelUserView = function(name) {
    this.html = $('<li>');
    this.html.text(this._name);
};