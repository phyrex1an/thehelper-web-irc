// Handles the session of a user, collects all the open connections (most often browser tabs) for a single
// user (a single browser instance)

var sessions = [];

// sessions :: [([Client], DestroyTimer, MaydayTimer, Data)]
// length(clients) >= 0
// length(clients) > 0 || destroy timer has started
// destroy timer has not started => length(clients) > 0 

/**
 * Runs f with the session data for the client when sessions are available
 */ 
on_session = function(client, f) {
    var cookie = uuid();
    // The client gets a choice between picking the generated cookie or a previus one
    // One could as well let the client decide on the cookie. 
    // TODO: Is it a problem that the client can create arbitrary cookies? Filling up memory easy perhaps?
    client.emit('setup session', cookie, function(picked_cookie) {
        // TODO: Debug log
        if (!sessions[picked_cookie]) {
            sessions[picked_cookie] = {clients:[], destroy_timer:null, mayday_timer:null,data:{}};
        }
        var current_session = sessions[picked_cookie];
        current_session.clients.push(client);
        reset_mayday_timer(picked_cookie);
        stop_destroy_timer(picked_cookie);
        client.on('disconnect', function() {
            // TODO: Debug log
            if (!sessions[picked_cookie]) {
                // TODO: Alert log (client has maydayed)
                return;
            }
            var length = current_session.clients.length;
            for(var i = 0; i < length; i++) {
                if (current_session.clients[i] == client) {
                    current_session.clients.splice(i,1);
                }
            }
            if (length != current_session.clients.length - 1) {
                // TODO: Error log
            }
            if (length-1==0) {
                start_destroy_timer(picked_cookie);
            }
        });
        f(picked_cookie);
    });
};

on_destroy_session = function(cookie, f) {
    sessions[cookie].on_destroy = f; // There can be only one.
};

session_get_data = function(cookie) {
    return sessions[cookie].data;
};

session_get_clients = function(cookie) {
    return sessions[cookie].clients;
}

reset_mayday_timer = function(cookie) {
    var mayday_time = 1000 * 60 * 5; // 5 minutes 
    if (sessions[cookie].mayday_timer) {
        timers.clearTimeout(sessions[cookie].mayday_timer);
    }
    sessions[cookie].mayday_timer = timers.setTimeout(function() {
        // TODO: Error log
        delete_session(cookie);
    }, mayday_time);
};

stop_destroy_timer = function(cookie) {
    if (sessions[cookie].destroy_timer) {
        timers.clearTimeout(sessions[cookie].destroy_timer);
    }
};

start_destroy_timer = function(cookie) {
    var destroy_time = 1000 * 60 * 1; // 1 minut 
    sessions[cookie].destroy_timer = timers.setTimeout(function() {
        // TODO: Debug log
        if (sessions[cookie].clients.length != 0) {
            // TODO: Error log (but better destroy anyway?)
        }
        delete_session(cookie);
    }, destroy_time);
};

delete_session = function(cookie) {
    if (sessions[cookie].mayday_timer) {
        timers.clearTimeout(sessions[cookie].mayday_timer);
    }
    stop_destroy_timer(cookie);
    if (sessions[cookie].on_destroy) {
        try {
            sessions[cookie].on_destroy();
        } catch (e) {
            // TODO: Alert log
        }
    }
    // TODO: Debug log
    delete sessions[cookie];
};