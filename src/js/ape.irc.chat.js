var http = require('http');
var io = require('./socket.io');
var timers = require('timers');
var uuid = require('./node-uuid/uuid');
/*var*/ sys = require('sys');
require('./config.js');
require('./irc-client-model.js');
require('./irc-server-proxy.js');
require('./irc-server-controller.js');
require('./irc-client-controller.js');
require('./irc.js'); // TODO: Rename to irc-server-connection.js
require('./fsm.js');

// Testing if a regular expression matches a string
String.prototype.test = function(regexp) {
    var reg = new RegExp(regexp);
    return reg.test(this);
};

var server = http.createServer(function(req, res){
    res.writeHead(403, {'Content-Type': 'text/html'});
    res.end('Normal http not available');
});
server.listen(webcat.port);

var socket = io.listen(server);

hashToDebug = function(h) {
    var e = [];
    for (var s in h) {
        e.push(s + ": " + h[s]);
    }
    return "{" + e.join(", ") + "}";
}

var clients = [];
var destroy_timers = [];
function new_session_cookie() {
    var cookie = uuid();
    var proxy = new IrcServerProxy(cookie);
    proxy.addObserver(new IrcServerController(proxy));
    clients[cookie] = proxy;
    return cookie;
};

function connect_client(client) {
    clients[client.cookie].addClient(client);
    if (client.cookie in destroy_timers) {
        timers.clearTimeout(destroy_timers[client.cookie]);
        delete destroy_timers[client.cookie];
    }
};

function disconnect_client(client) {
    if (('cookie' in client) && (clients[client.cookie].removeClient(client))) {
        destroy_timers[client.cookie] = timers.setTimeout(function() {
            clients[client.cookie].receiveServer({'method':'DelUser'}, null);
            delete clients[client.cookie];
            sys.log("Deleting irc");
            delete destroy_timers[client.cookie];
        }, 1000*10); // 10 seconds
    }
};

function client_get_proxy(client, message) {
    if ((!('cookie' in client)) && (!('cookie' in message))) {
        // No cookie set at all
        sys.log("no cookie");
        client.cookie = message.cookie = new_session_cookie();
        connect_client(client);
    } else if (!('cookie' in message)) {
        // Cookie set server side but not yet propagated to the browser
        sys.log("no browser cookie");
        message.cookie = client.cookie;
    } else if (!('cookie' in client)) {
        // Cookie set browser side but not yet propagated to this server side client
        sys.log("no server cookie");
        if (!(message.cookie in clients)) {
            message.cookie = new_session_cookie();
        }
        client.cookie = message.cookie;
        connect_client(client);
    } else if (client.cookie != message.cookie) {
        // Cookie missmatch, favour the browser side.
        sys.log("cookie mismatch");
        disconnect_client(client);
        client.cookie = message.cookie;
        connect_client(client);
    }
    return clients[client.cookie];
}

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
    proxy.receive(message, client);
}); 
