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
    
    on_session(socket, function(cookie) {
        var data = session_get_data(cookie);
        data.ip = socket.handshake.address.address;
        if (!data.chat) {
            data.chat = new IrcServerProxy(cookie);
            data.chat.addObserver(new IrcServerController(data.chat, data.ip));
            on_destroy_session(cookie, function() {
                // TODO: Debug log
                data.chat.receiveServer({'method':'DelUser'}, null);
            });
        }
        var proxy = data.chat;
        // Use a single receiver for all messages for now.
        var messageReceiver = function(message) {
            try {
                sys.log("RECEIVE IRC EVENT: " + hashToDebug(message));
                reset_mayday_timer(cookie);
                // TODO: Get client information to the right places in a better way
                // TODO: Investigate what transports this is valid for

                proxy.receive(message, socket);
            } catch (e) {
                sys.log(e);
            }
        };
        socket.on('server message', messageReceiver);
        socket.on('client message', messageReceiver);
    });



});