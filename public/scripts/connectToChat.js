Chat = {
    load: function () {
        
        var socket = new ReconnectingWebSocket('wss://irc-ws.chat.twitch.tv', 'irc', { reconnectInterval: 3000 });

        socket.onopen = function (data) {
            socket.send('PASS blah\r\n');
            socket.send('NICK justinfan12345\r\n');
            socket.send('CAP REQ :twitch.tv/commands twitch.tv/tags\r\n');
            socket.send('JOIN #' + "snowman" + '\r\n');
        };

        socket.onclose = function () {
            
        };

        socket.onmessage = function (data) {
            console.log(data)
        };

    }

};

document.addEventListener("DOMContentLoaded", function (event) {
    Chat.load();
});
