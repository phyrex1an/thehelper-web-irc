var http = require('http');
var io = require('../socket.io');
timers = require('timers');
uuid = require('../node-uuid/uuid');
/*var*/ sys = require('sys');
require('../config.js');
require('./util.js');
require('../client/model.js');
require('./proxy.js');
require('./controller.js');
require('./session.js');
require('../client/controller.js');
require('./irc.js'); // TODO: Rename to irc-server-connection.js
require('./fsm.js');


var server = http.createServer(function(req, res){
    res.writeHead(403, {'Content-Type': 'text/html'});
    res.end('Normal http not available');
});
server.listen(webcat.port);

var socket = io.listen(server, webcat.socketOptions);

socket.on('clientDisconnect', function(client) {
    disconnect_client(client);
    sys.log("IRC deluser");
});

socket.on('clientConnect', function(client) {
    sys.log("IRC adduser");
});

socket.on('clientMessage', function(message, client) {
    sys.log("RECEIVE IRC EVENT: " + hashToDebug(message)); 
    var proxy = client_get_proxy(client, message);
    message.cookie = undefined;
    // TODO: Get client information to the right places in a better way
    // TODO: Investigate what transports this is valid for
    message["_infos"] = {};
    message["_infos"].ip = client.connection.remoteAddress;
    sys.log("CLIENT IP " + client.connection.remoteAddress);
    proxy.receive(message, client);
}); 