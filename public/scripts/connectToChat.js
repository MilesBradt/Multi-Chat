function connectToChat(channel) {

    // Create WebSocket connection.
    const socket = new WebSocket('ws://localhost:8080');

    // Connection opened
    socket.addEventListener('open', function (event) {
        console.log('Connected to WS Server')
        socket.send(channel)
    });

    const chat = document.getElementById('chat');

    // Listen for messages
    socket.addEventListener('message', function (event) {
        const chatLog = JSON.parse(event.data);

        shouldScroll = chat.scrollTop + chat.clientHeight === chat.scrollHeight;

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

        if (!shouldScroll) {
            scrollToBottom();
        }

        console.log('Message from server ', chatLog);
    });

    // const sendMessage = () => {
    //     socket.send('Hello From Client1!');
    // }


}

function scrollToBottom(divChat) {
    chat.scrollTop = chat.scrollHeight;
}