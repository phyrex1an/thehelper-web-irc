$(document).ready(function() {
    var root = $('#ircchat');
    var ape = new APE.Client();
    root.css('display', 'block');
    $('p.notice', root).html('Connecting to server');
    $('form.login', root).css('display', 'block');

    ape.addEvent('ready', function() {
        $('p.notice', root).remove();
        var proxy = new IrcClientProxy(ape.core);
        proxy.addObserver(new IrcClientController(proxy, root));
        var listener = function(raw, pipe) {
            proxy.receive(raw.data);
        };
        ape.core.onRaw('SERVER_IRC_MESSAGE', listener);
        ape.core.onRaw('SERVER_IRC_EVENT', listener);
        proxy.sendServer({
            'method' : 'Setup'
        });
    });
    ape.addEvent('apeDisconnect', function() {});

    ape.load({
        'domain': APE.Config.domain,
        'server': APE.Config.server,
        'identifier':'ircdemo',
        'scripts': APE.Config.scripts,
        'connectOptions': {'name': 'IrcChat'+Math.round(Math.random()*1000)}
    }); 
});

if (typeof console == "undefined") {
    var console = {'log':function(){}};
}
if (typeof console.log == "undefined") {
    console.log = function() {};
}