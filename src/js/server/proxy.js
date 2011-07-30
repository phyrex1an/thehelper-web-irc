IrcServerProxy = function(cookie) {
    this.cookie = cookie;
    this.currentClient = null;
    this.observers = [];
};
IrcServerProxy.prototype = new Observable();
IrcServerProxy.prototype.receive = function(data, client) {
    this.currentClient = client;
    this.sendAll(data);
};
IrcServerProxy.prototype.receiveServer = function(data, client) {
    this.currentClient = client;
    this.notifyObservers(data);
};
IrcServerProxy.prototype.sendAll = function(data) {
    this.notifyObservers(data);
    sys.log("IRC MULTI RESPONSE: " + hashToDebug(data));
    var clients = session_get_clients(this.cookie); 
    for(var i in clients) {
        clients[i].emit('multi response', data);
    }
};
IrcServerProxy.prototype.sendUser = function(data) {
    sys.log("IRC SINGLE RESPONSE: " + hashToDebug(data));
    this.currentClient.emit('single response', data);
};