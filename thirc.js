window.addEvent('domready', function(){
    var root = $('ircchat');
    var login = root.getElement('.login');
    var password = login.getElement('input[name=password]');
    var username = login.getElement('input[name=username]');
    var header = root.getElement('.header');
    var chat = root.getElement('.chat');
    login.setStyle('display', 'block');
    var irc_client = new APE.IrcClient({'root':root});
    login.addEvent('submit', function(e) {
        irc_client.load({
            'root':root,
            'domain': APE.Config.domain,
            'server': APE.Config.server,
            'identifier':'ircdemo',
            'scripts': APE.Config.scripts,
            'complete': function(ape){
                irc_client.complete();
            }
        });
        if (irc_client.setNick(username.value))
        {
            login.dispose();
            header.setStyle('display', 'block');
            chat.setStyle('display', 'block');
        }
        e.stop();
    });
    password.focus();
});