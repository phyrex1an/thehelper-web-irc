$(document).ready(function() {
    var root = $('#ircchat');
    var socket = new io.connect(webcat.host, webcat);
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
    var messageReceiver = function(message) {
        proxy.receive(message);
    };
    socket.on('single response', messageReceiver);
    socket.on('multi response', messageReceiver);
});

if (typeof console == "undefined") {
    var console = {'log':function(){}};
}
if (typeof console.log == "undefined") {
    console.log = function() {};
}