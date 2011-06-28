var IrcClientProxy = function(socket) {
    this.socket = socket;
    this.observers = [];
};
IrcClientProxy.prototype = new Observable();
IrcClientProxy.prototype.receive = function(data) {
    console.log('RECEIVE %o', data);
    if (data.cookie) {
        $.cookie("chatcookie", data.cookie, {'path':'/'});
    }
    this.notifyObservers(data);
};
// A message that is to be forwarded to all sub users
IrcClientProxy.prototype.sendAll = function(data) {
    if ($.cookie("chatcookie")) {
        data.cookie = $.cookie("chatcookie");
    }
    console.log('CLIENT_IRC_EVENT %o', data);
    this.socket.send(data);
};
// A message that is only to be sent to the server
IrcClientProxy.prototype.sendServer = function(data) {
    if ($.cookie("chatcookie")) {
        data.cookie = $.cookie("chatcookie");
    }
    console.log('CLIENT_IRC_MESSAGE %o', data);
    this.socket.send(data);
};