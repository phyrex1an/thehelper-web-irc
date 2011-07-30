webcat_setup = function(settings) {
    if ($.cookie("chatdisable") == "true") {
        return;
    }
    var root = $(settings.on);
    var socket = new io.connect(webcat.host, webcat);
    socket.on('connect', function() {
        socket.on('setup session', function(cookie, fn) {
            var used_cookie = $.cookie("chatcookie");
            if (!used_cookie) {
                $.cookie("chatcookie", cookie, {'path':'/'});
                used_cookie = cookie;
            }
            fn(used_cookie);
            var proxy = new IrcClientProxy(socket);
            var messageReceiver = function(message) {
                proxy.receive(message);
            };
            socket.on('single response', messageReceiver);
            socket.on('multi response', messageReceiver);
            root.css('display', 'block');
            $('form.login', root).css('display', 'block');
            proxy.addObserver(new IrcClientController(proxy, root));
            proxy.sendServer({
                'method' : 'Setup',
                'config' : settings
            });
        });
    });
};


if (typeof console == "undefined") {
    var console = {'log':function(){}};
}
if (typeof console.log == "undefined") {
    console.log = function() {};
}