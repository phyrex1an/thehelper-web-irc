include('irc/irc-client-model.js');
include('irc/irc-server-proxy.js');
include('irc/irc-server-controller.js');
include('irc/irc-client-controller.js');
include('irc/irc.js'); // TODO: Rename to irc-server-connection.js
include('irc/fsm.js');

function hashToDebug(h) {
    var e = [];
    for (var s in h) {
        e.push(s + ": " + h[s]);
    }
    return "{" + e.join(", ") + "}";
}

Ape.addEvent("deluser", function(user) {
    if (typeof user.irc != "undefined") {
        Ape.log("Deleting irc");
        user.irc.receiveServer({'method':'DelUser'}, null);
    }
    Ape.log("IRC deluser");
});

Ape.addEvent("adduser", function(user) {
    Ape.log("IRC adduser");
    if (user.irc) {
        Ape.log("Already setup");
        return;
    }
    var proxy = new IrcServerProxy(user.pipe);
    proxy.addObserver(new IrcServerController(proxy));
    user.irc = proxy;
});

// client -> server -> clients
Ape.registerCmd("CLIENT_IRC_EVENT", true, function(params, infos) {
    Ape.log("RECEIVE IRC EVENT: " + hashToDebug(params));
    //Ape.log("INFOS: " + new Hash(infos).toQueryString());
    /*Ape.log(infos.subuser);
    Ape.log("begin");
    $each(infos, function(i,v) { Ape.log(i+'|'+v); });
    Ape.log("end");
    infos.subuser.getUser().sendRaw('SERVER_IRC_MESSAGE', 'got event');*/
    infos.user.irc.receive(params, infos);
    return 1;
});

Ape.registerCmd("CLIENT_IRC_MESSAGE", true, function(params, infos) {
    Ape.log("RECEIVE IRC MESSAGE: " + hashToDebug(params));
    //Ape.log("INFOS: " + new Hash(infos).toQueryString());
    var subuser = infos.subuser;
    /*Ape.log(subuser);
    Ape.log("begin");
    $each(subuser, function(i,v) { Ape.log(i+'|'+v); });
    Ape.log("end");
    $each(infos, function(i,v) { Ape.log(i+'|'+v); });
    subuser.sendRaw('SERVER_IRC_MESSAGE', 'got message');*/
    infos.user.irc.receiveServer(params, infos);
    return 1;
});