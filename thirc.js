window.addEvent('domready', function(){
    var root = $('#ircchat');
    var handler = new IRCHandler();
    var irc = new IRCClient(handler);
    new IRCPingClient(handler);
    var irc_client = null; //new APE.IrcClient({'root':root,'irc':irc}); // this should eventually be moved to THIrcUI
//    handler.registerEventHandler(irc_client); 
    var client = new APE.Client();
    var ui = new THIrcUI(handler, 'irctester', root);

    var startIrc = function() {        
        ui.start(new client.core.TCPSocket(), irc_client, irc);
    };

    var startCore = function() {
        client.core.start({name:"IrcChat"+Math.round(Math.random()*1000)});
        client.addEvent('ready', startIrc);
    };

    var onDisconnect = function() {
        root.html('Connection failed...');
    };

    root.html('Connecting to irc server...');
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