var IrcServerProxy = function(pipe) {
    this.pipe = pipe;
    this.observers = [];
};
IrcServerProxy.prototype = new Observable();
IrcServerProxy.prototype.receive = function(params, infos) {
    params["_infos"] = infos;
    this.sendAll(params);
};
IrcServerProxy.prototype.receiveServer = function(params, infos) {
    params["_infos"] = infos;
    this.notifyObservers(params);
};
IrcServerProxy.prototype.sendAll = function(data) {
    this.notifyObservers(data);
    delete data["_infos"]; // TODO: Find a better way to handle server to client responses during a MESSAGE than storing the _infos. Perhaps only do server -> client unicast as a direct response to a MESSAGE (eg, use the return value from the custom command).
    Ape.log("IRC MULTI RESPONSE: " + new Hash(data).toQueryString());
    this.pipe.sendRaw("SERVER_IRC_EVENT", data);
};
IrcServerProxy.prototype.sendUser = function(data, infos) {
    Ape.log("IRC SINGLE RESPONSE: " + new Hash(data).toQueryString());
    //infos.subuser.sendRaw("SERVER_IRC_MESSAGE", data); TODO: Figure out why this doesn't work
    this.pipe.sendRaw("SERVER_IRC_MESSAGE", data);
};