// Handles the session of a user, collects all the open connections (most often browser tabs) for a single
// user (a single browser instance)

var clients = [];
var destroy_timers = [];

new_session_cookie = function() {
    var cookie = uuid();
    var proxy = new IrcServerProxy(cookie);
    proxy.addObserver(new IrcServerController(proxy));
    clients[cookie] = proxy;
    return cookie;
};

connect_client = function(client) {
    clients[client.cookie].addClient(client);
    if (client.cookie in destroy_timers) {
        timers.clearTimeout(destroy_timers[client.cookie]);
        delete destroy_timers[client.cookie];
    }
};

disconnect_client = function(client) {
    if (('cookie' in client) && (clients[client.cookie].removeClient(client))) {
        destroy_timers[client.cookie] = timers.setTimeout(function() {
            try {
                clients[client.cookie].receiveServer({'method':'DelUser'}, null);
                delete clients[client.cookie];
                sys.log("Deleting irc cookie " + client.cookie);
                delete destroy_timers[client.cookie];
            } catch (e) {
                sys.log(e);
            }
        }, 1000*10); // 10 seconds
    }
};

client_get_proxy = function(client, message) {
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