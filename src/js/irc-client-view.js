var IrcChatGroupView = function(chat, proxy, root) {
    this.proxy = proxy;
    this.chat = chat;
    this.chatList = new IrcChatListView(chat.chatList, proxy);
    this.root = root;
    chat.addObserver(this);
    if (chat.isLoggedIn) {
        this.loggedIn();
    } else {
        if (chat.isLoggingIn) {
            this.disable();
        } else {
            this.enable();
        }
        var self = this;
        $('form', root).submit(function(e) { 
            e.preventDefault();
            self.doLogin();
        });
    }
};
IrcChatGroupView.prototype.enable = function() {
    $('#chatPassword, input[type=submit]', this.root).removeAttr('disabled');
};
IrcChatGroupView.prototype.disable = function() {
    $('#chatPassword, input[type=submit]', this.root).attr('disabled', 'disabled');
};
IrcChatGroupView.prototype.doLogin = function() {
    this.proxy.login($('#chatUsername', this.root).attr('value'), $('#chatPassword', this.root).attr('value'));
};
IrcChatGroupView.prototype.loggedIn = function() {
    this.root.html(this.chatList.html);
};
IrcChatGroupView.prototype.update = function(c, e) {
    if (e=='IsLogginIn') {
        this.disable();
    } else if (e=='IsLoggedIn') {
        this.loggedIn();
    };
};

var IrcChatListView = function(list, proxy) {
    this.html = $('<ul class="channels">');
    this.proxy = proxy;
    list.addObserver(this);
    var l = list.chats.length;
    for(var i = 0; i<l; i++) {
        this.addChat(list.chats[i]);
    }
};
IrcChatListView.prototype.addChat = function(chat) {
    var view = chat.view(this.proxy);
    this.html.append(view.html);
};
IrcChatListView.prototype.removeChat = function(chatName) {
    $('.channel', this.html).filter(function(index) {
        return $('.title span', this).html().trim() == chatName;
    }).remove();
};
IrcChatListView.prototype.update = function(l, e) {
    if (e.add) {
        this.addChat(e.add);
    } else if (e.remove) {
        this.removeChat(e.remove);
    }
};

var IrcMessageListView = function(list) {
    list.addObserver(this);
    this.html = $('<ol class="messages">');
    var l = list.messages.length;
    for(var i = 0; i<l; i++) {
        this.addMessage(list.messages[i]);
    }
};
IrcMessageListView.prototype.addMessage = function(message) {
    this.html.append((new IrcMessageView(message)).html);
};
IrcMessageListView.prototype.update = function(l, message) {
    this.addMessage(message);
};


var IrcUserListView = function(list) {
    list.addObserver(this);
    this.html = $('<ul class="users">');
    var l = list.users.length;
    for (var i = 0; i<l; i++) {
        this.addUser(list.users[i]);
    }
};
IrcUserListView.prototype.addUser = function(user) {
    this.html.append((new IrcChannelUserView(user)).html);    
};
IrcUserListView.prototype.removeUser = function(user) {
    $('li', this.html).filter(function(index) {
        return $(this).html().trim() == user.name();
    }).remove();
};
IrcUserListView.prototype.update = function(l, e) {
    if (e.event == 'add') {
        this.addUser(e.user);
    } else if (e.event == 'remove') {
        this.removeUser(e.user);
    }
};

var IrcChatView = function() {};
IrcChatView.prototype.makeBody = function() {
    this.html = $('<li class="channel"><h2 class="title"></h2><div class="chat-area"></div></li>');
    if (this.chat.isCurrent) {
        this.html.addClass('current');
    }
};
IrcChatView.prototype.makeClose = function() {
    var self = this;
    var close_button = $('<a class="close" alt="Close">')
        .click(function() {
            self.close();
        });
    $('.title', this.html).append(close_button);
};
IrcChatView.prototype.makeTitle = function(text) {
    var title = $('.title', this.html);
    var self = this;
    this.title = $('<span>')
        .text(text)
        .click(function() {
            self.click();
        });
    title.append(this.title);
};
IrcChatView.prototype.onSubmit = function(input) {
    this.proxy.selfMessage(this.chat.name(), input);
};
IrcChatView.prototype.addComponent = function(c) {
    $('.chat-area', this.html).append(c.html);
};
IrcChatView.prototype.makeForm = function() {
    var form = $('<form class="input-zone" />');
    form.append('<input type="text" class="input"/><input type="submit" value="Send" />');
    var input  = $('input[type=text]', form);
    var button = $('input[type=submit]', form);
    var t = this;
    form.submit(function(e) {
        e.preventDefault();
        var input = $('input[type=text]',form);
        t.onSubmit(input.attr('value'));
        input.attr('value', '');
    });
    $('.chat-area', this.html).append(form);
};
IrcChatView.prototype.close = function(f) {
    this.proxy.closeChat(this.chat.name());
};
IrcChatView.prototype.click = function(f) {
    if (this.chat.isCurrent) {
        this.proxy.minimizeChat(this.chat.name());
    } else {
        this.proxy.switchChat(this.chat.name());
    }
};
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

var IrcPrivateChatView = function(chat, proxy) {
    chat.addObserver(this);
    this.chat = chat;
    this.proxy = proxy;
    this.makeBody();
    this.makeClose();
    this.makeTitle(chat.name());
    this.addComponent(new IrcMessageListView(chat.messages));
    this.makeForm();
};
IrcPrivateChatView.prototype = new IrcChatView();

var IrcChannelView = function(chat, proxy) {
    chat.addObserver(this);
    this.chat = chat;
    this.proxy = proxy;
    this.makeBody();
    this.makeClose();
    this.makeTitle(chat.name());
    this.addComponent(new IrcMessageListView(chat.messages));
    this.addComponent(new IrcUserListView(chat.users));
    this.makeForm();
};
IrcChannelView.prototype = new IrcChatView();

var IrcVirtualChannelView = function(chat, proxy) {
    chat.addObserver(this);
    this.chat = chat;
    this.proxy = proxy;
    this.makeBody();
    this.makeTitle(chat.name());
    this.addComponent(new IrcMessageListView(chat.messages));
    this.makeForm();
};
IrcVirtualChannelView.prototype = new IrcChatView();

// Probably not needed, move functionality to the message list view instead
var IrcMessageView = function(message) {
    this.html = $('<li class="chat-message">');
    this.html.append($('<span class="user">').text(message.from.name()));
    this.html.append($('<span class="body">').text(message.content));
};

var IrcChannelUserView = function(user) {
    this.html = $('<li>');
    this.html.text(user.name());
};