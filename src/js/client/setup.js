$(document).ready(function() {
    var root = $('#ircchat');
    var socket = new io.Socket(webcat.host, {port:webcat.port});
    var proxy = new IrcClientProxy(socket);
    root.css('display', 'block');
    $('p.notice', root).html('Connecting to server');
    socket.on('connect', function() {
        $('p.notice', root).remove();
        $('form.login', root).css('display', 'block');
        
        proxy.addObserver(new IrcClientController(proxy, root));
        proxy.sendServer({
            'method' : 'Setup'
        });
    });
    socket.on('message', function(message) {
        proxy.receive(message);
    });
    socket.connect();
});

if (typeof console == "undefined") {
    var console = {'log':function(){}};
}
if (typeof console.log == "undefined") {
    console.log = function() {};
}