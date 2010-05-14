$(document).ready(function(){
    var root = $('#ircchat');
    root.html('');
    var handler = new IRCHandler();
    var irc = new IRCClient(handler);
    new IRCPingClient(handler); 
    var client = new APE.Client();
    var ui = new THIrcUI(handler, 'irctester', root);

    var startIrc = function() {        
        ui.start(new client.core.TCPSocket(), irc);
    };

    var startCore = function() {
        client.core.start({name:"IrcChat"+Math.round(Math.random()*1000)});
        client.addEvent('ready', startIrc);
    };

    var onDisconnect = function() {
        root.html('Connection failed...');
    };
    
    ui.connecting();
    client.addEvent('load', startCore);
    client.addEvent('apeDisconnect', onDisconnect);

    client.load({
        'root':this.root,
        'domain': APE.Config.domain,
        'server': APE.Config.server,
        'identifier':'ircdemo',
        'scripts': APE.Config.scripts
    });
});