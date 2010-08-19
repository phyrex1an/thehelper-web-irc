$(document).ready(function(){
    return;
    var root = $('#ircchat');
    var password = "";
    var handler = new IRCHandler();
    var irc = new IRCClient(handler);
    new IRCPingClient(handler);
    var client = new APE.Client();

    var startIrc = function() {
        root.html("");
        var ui = new THIrcUI(handler, 'irctester', root);
        ui.start(new client.core.TCPSocket(), password);
    };

    var startCore = function() {
        client.core.start({name:"IrcChat"+Math.round(Math.random()*1000)});
    };

    var startApe = function() {
        client.load({
            'root':this.root,
            'domain': APE.Config.domain,
            'server': APE.Config.server,
            'identifier':'ircdemo',
            'scripts': APE.Config.scripts
        });
        password = $('#chat-password input[type=password]', root).attr('value');
        root.html("Login in...");
        return false;
    };

    var onDisconnect = function() {
        root.html('Connection failed...');
    };

    root.html((<>
               <form id="chat-password">
                   <input type="password"/>
                   <input type="submit" value="Login"/>
               </form>
               </>).toString());
    $('#chat-password', root).submit(startApe);
    
    client.addEvent('load', startCore);
    client.addEvent('ready', startIrc);
    client.addEvent('apeDisconnect', onDisconnect);
});