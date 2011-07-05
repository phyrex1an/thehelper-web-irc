IrcServerProxy = function(cookie) {
    this.cookie = cookie;
    this.clients = [];
    this.numClients = 0;
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
    data.cookie = this.cookie;
    delete data._infos;
    sys.log("IRC MULTI RESPONSE: " + hashToDebug(data));
    for(var i in this.clients) {
        this.clients[i].emit('multi response', data);
    }
};
IrcServerProxy.prototype.sendUser = function(data) {
    data.cookie = this.cookie;
    delete data._infos;
    sys.log("IRC SINGLE RESPONSE: " + hashToDebug(data));
    this.currentClient.emit('single response', data);
};
IrcServerProxy.prototype.addClient = function(client) {
    if (!(client.sessionId in this.clients)) {
        this.clients[client.sessionId] = client;
        this.numClients++;
    }
    sys.log(this.numClients);
};
IrcServerProxy.prototype.removeClient = function(client) {
    if (client.sessionId in this.clients) {
        delete this.clients[client.sessionId];
        this.numClients--;
    }
    sys.log(this.numClients);
    return this.numClients == 0;
};