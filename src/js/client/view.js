var IrcChatGroupView = function(chat, proxy, root, config) {
    this.proxy = proxy;
    this.chat = chat;
    this.config = config;
    this.chatList = new IrcChatListView(chat.chatList, proxy);
    this.html = this.chatList.html;
    this.root = root;
    chat.addObserver(this);

    var self = this;
    $('form', root).submit(function(e) { 
        e.preventDefault();
        self.doLogin();
    });
    $('.options .join', this.root).click(function() {
        self.proxy.joinChannel($(this).html());
    });
    $('.options .disable', this.root).click(function() {
        self.proxy.logout();
        self.proxy.disable();
        $.cookie("chatdisable", "true", {path:'/', expires:10000 /*days*/});
    });
    $('.options .logout', this.root).click(function() {
        self.proxy.logout();
    });
    if (chat.isLoggedIn) {
        this.hideForm();
    } else {
        this.displayForm();
        if (chat.isLoggingIn) {
            this.disable();
        } else {
            this.enable();
            if ($.cookie("chattoken")) {
                this.doRecognize();
            }
        }
    }
};
IrcChatGroupView.prototype.displayForm = function() {
    //$('div.menu', this.root).hide();
    this.chatList.html.hide();
    $('form.login', this.root).show();
};
IrcChatGroupView.prototype.hideForm = function() {
    //$('div.menu', this.root).show();
    this.chatList.html.show();
    $('form.login', this.root).hide();
};
IrcChatGroupView.prototype.enable = function() {
    $('#chatPassword, input[type=submit]', this.root).removeAttr('disabled');
};
IrcChatGroupView.prototype.disable = function() {
    $('#chatPassword, input[type=submit]', this.root).attr('disabled', 'disabled');
};
IrcChatGroupView.prototype.doLogin = function() {
    this.proxy.login($('#chatUsername', this.root).attr('value'), $('#chatPassword', this.root).attr('value'), $('#chatRememberMe', this.root).attr('checked'));
};
IrcChatGroupView.prototype.doRecognize = function() {
    this.proxy.recognize($('#chatUsername', this.root).attr('value'), $.cookie("chattoken"));
};
IrcChatGroupView.prototype.update = function(c, e) {
    if (e=='IsLogginIn') {
        this.disable();
    } else if (e=='IsLoggedIn') {
        this.hideForm();
    } else if (e=='FailedLogin') {
        this.enable();
        $.cookie("chattoken", null, {'path':'/'});
    } else if (e=='Logout') {
        this.displayForm();
        this.enable();
        $.cookie("chattoken", null, {'path':'/'});
    } else if (e == 'Disable') {
        this.root.remove();
    } else if (e.token) {
        $.cookie("chattoken", e.token, {'expires':30,'path':'/'});
    }
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
    this.onBottom = true;
    list.addObserver(this);
    this.html = $('<ol class="messages">');
    var l = list.messages.length;
    for(var i = 0; i<l; i++) {
        this.addMessage(list.messages[i], true);
    }
    var self = this;
    this.html.scroll(function() {
        self.onBottom = false;
    });
};
IrcMessageListView.prototype.addMessage = function(message, noscroll) {
    // Only scroll to the bottom if we are either hidden or at the bottom already
    this.onBottom = this.onBottom || (this.html.outerHeight() <= 0) || (this.html[0].scrollHeight - this.html.scrollTop() == this.html.outerHeight());
    this.html.append(message.view().html);
    this.messageNotify();
    if (!noscroll && this.onBottom) {
        this.toBottom();
    }
};
IrcMessageListView.prototype.update = function(l, event) {
    if (typeof event.message != "undefined") {
        this.addMessage(event.message, false);
    } else if (typeof event.visible != "undefined" && event.visible && this.onBottom) {
        this.toBottom();
    }
};
IrcMessageListView.prototype.toBottom = function() {
    this.html.animate({scrollTop: this.html[0].scrollHeight});
};
IrcMessageListView.prototype.messageNotify = function() {
    var chat = this.html.parent().parent();
    chat.addClass("alert");
    setTimeout(function() { chat.removeClass("alert"); }, 500);
};


var IrcUserListView = function(list, proxy) {
    this.proxy = proxy;
    list.addObserver(this);
    this.html = $('<ul class="users">');
    var l = list.users.length;
    for (var i = 0; i<l; i++) {
        this.addUser(list.users[i]);
    }
};
IrcUserListView.prototype.addUser = function(user) {
    this.html.append((new IrcChannelUserView(user, this.proxy)).html);    
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
IrcChatView.prototype.makeTitle = function(text, userlist) {
    var title = $('.title', this.html);
    var self = this;
    this.title = $('<span>')
        .text(text)
        .click(function() {
            self.click();
        });
    title.append(this.title);
    if (userlist === true) {
        var button = $('<a class="userlist-switch" alt="Toggle userlist">');
        button.click(function(e) {
            e.preventDefault();
            self.toggleUserlist();
        });
        title.append(button);
    }
};
IrcChatView.prototype.onSubmit = function(input) {
    this.proxy.selfMessage(this.chat.name(), input);
};
IrcChatView.prototype.addComponent = function(c) {
    $('.chat-area', this.html).append(c.html);
};
IrcChatView.prototype.makeForm = function() {
    var form = $('<form class="input-zone" />');
    form.append('<input type="text" class="input"/>');
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
IrcChatView.prototype.toggleUserlist = function() {
    this.proxy.toggleUserlist(this.chat.name());
};
IrcChatView.prototype.close = function(f) {
    this.proxy.closeChat(this.chat.name());
};
IrcChatView.prototype.click = function(f) {
    if (this.chat.isCurrent) {
        this.proxy.minimizeChat(this.chat.name());
    } else {
        this.proxy.maximizeChat(this.chat.name());
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
    else if (typeof m.toggleUserlist != "undefined") {
        if (m.toggleUserlist) {
            this.html.addClass('userlist');
        } else {
            this.html.removeClass('userlist');
        }
    }
};

var IrcPrivateChatView = function(chat, proxy) {
    chat.addObserver(this);
    this.chat = chat;
    this.proxy = proxy;
    this.makeBody();
    this.makeClose();
    this.makeTitle(chat.name(), false);
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
    this.makeTitle(chat.name(), true);
    this.addComponent(new IrcMessageListView(chat.messages));
    this.addComponent(new IrcUserListView(chat.users, this.proxy));
    this.makeForm();
    if (chat.activeUserlist) {
        this.html.addClass('userlist');3
    }
};
IrcChannelView.prototype = new IrcChatView();

var IrcVirtualChannelView = function(chat, proxy) {
    chat.addObserver(this);
    this.chat = chat;
    this.proxy = proxy;
    this.makeBody();
    this.makeTitle(chat.name(), false);
    this.addComponent(new IrcMessageListView(chat.messages));
    this.makeForm();
};
IrcVirtualChannelView.prototype = new IrcChatView();


function createMessageView(cssClass) {
    return function(message) {
        this.html = $('<li class="' + cssClass + '">');
        this.html.append($('<span class="user">').text(message.from.name()));
        var content = $('<div/>').text(message.content).html();
        content = content.replace(/\b(([\w-]+:\/\/?|www[.])[^\s]+)/g, '<a href="$1">$1</a>');
        this.html.append($('<span class="body">').html(content));
    };
};

var IrcMessageView = createMessageView('chat-message');
var IrcActionMessageView = createMessageView('action-message');

var IrcSystemMessageView = function(message) {
    this.html = $('<li class="system-message">');
    this.html.text(message.message);
};


var IrcChannelUserView = function(user, proxy) {
    this.proxy = proxy;
    this.html = $('<li>');
    this.html.text(user.name());
    var self = this;
    this.html.click(function() {
        self.click();
    });
    user.addObserver(this);
};
IrcChannelUserView.prototype.update = function(l, e) {
    this.html.text(e.newNick);
};
IrcChannelUserView.prototype.click = function() {
    this.proxy.joinChannel(this.html.html());
};