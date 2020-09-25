function connectToChat() {
    // Create WebSocket connection.
    const socket = new WebSocket('ws://localhost:8080');

    // Connection opened
    socket.addEventListener('open', function (event) {
        console.log('Connected to WS Server')
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        const chatLog = JSON.parse(event.data);

        const divChannel = document.createElement("div")
        divChannel.id = "channelLine"
        divChannel.className = "channelLines"
        divChannel.textContent = chatLog.channel + "'s chat"
        document.getElementById("chat").appendChild(divChannel)

        const divChat = document.createElement("div")
        divChat.id = "chatLine"
        divChat.className = "chatLines"
        document.getElementById("chat").appendChild(divChat);

        const usernameSpan = document.createElement("span");
        usernameSpan.id = chatLog.id;
        usernameSpan.textContent = chatLog.username;
        usernameSpan.style.color = chatLog.color;
        usernameSpan.style.fontWeight = "bold";
        divChat.appendChild(usernameSpan)
        console.log(usernameSpan)

        const messageSpan = document.createElement("span");
        messageSpan.className = "messages";
        messageSpan.style.color = "#979799";
        messageSpan.style.fontWeight = "normal";
        messageSpan.textContent = ": " + chatLog.message;
        divChat.appendChild(messageSpan)

        console.log('Message from server ', chatLog);
    });

    const sendMessage = () => {
        socket.send('Hello From Client1!');
    }
}