var IrcClientProxy = function(ape) {
    this.ape = ape;
    this.observers = [];
};
IrcClientProxy.prototype = new Observable();
IrcClientProxy.prototype.receive = function(data) {
    console.log('RECEIVE %o', data);
    this.notifyObservers(data);
};
// A message that is to be forwarded to all sub users
IrcClientProxy.prototype.sendAll = function(data) {
    console.log('CLIENT_IRC_EVENT %o', data);
    this.ape.request.send("CLIENT_IRC_EVENT", data);
};
// A message that is only to be sent to the server
IrcClientProxy.prototype.sendServer = function(data) {
    console.log('CLIENT_IRC_MESSAGE %o', data);
    this.ape.request.send("CLIENT_IRC_MESSAGE", data);
};