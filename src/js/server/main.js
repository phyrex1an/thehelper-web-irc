require('../config.js');
var io = require('socket.io').listen(webcat.port);
timers = require('timers');
uuid = require('node-uuid');
/*var*/ sys = require('sys');
require('./util.js');
require('../client/model.js');
require('./proxy.js');
require('./controller.js');
require('./session.js');
require('../client/controller.js');
require('./irc.js'); // TODO: Rename to irc-server-connection.js
require('./fsm.js');



io.sockets.on('connection', function(socket) {
    sys.log("IRC adduser");

    socket.on('disconnect', function() {
        try {
            disconnect_client(socket);
            sys.log("IRC deluser");
        } catch (e) {
            sys.log(e);
        }
    });
    // Use a single receiver for all messages for now.
    var messageReceiver = function(message) {
        try {
            sys.log("RECEIVE IRC EVENT: " + hashToDebug(message)); 
            var proxy = client_get_proxy(socket, message);
            message.cookie = undefined;
            // TODO: Get client information to the right places in a better way
            // TODO: Investigate what transports this is valid for
            message["_infos"] = {};
            message["_infos"].ip = socket.handshake.address.address;
            sys.log("CLIENT IP " + socket.handshake.address.address);
            proxy.receive(message, socket);
        } catch (e) {
            sys.log(e);
        }
    };
    socket.on('server message', messageReceiver);
    socket.on('client message', messageReceiver);
});