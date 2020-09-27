function connectToChat(channel) {
    // Create WebSocket connection.
    const socket = new WebSocket('ws://localhost:8080');

    // Connection opened
    socket.addEventListener('open', function (event) {
        console.log('Connected to WS Server')
        socket.send(channel)
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        postToDOM(event)
    });

}

function scrollToBottom(chat) {
    chat.scrollTop = chat.scrollHeight;
}

function postToDOM(event) {
    const chatLog = JSON.parse(event.data);
    const chat = document.getElementById('chat');

    let shouldScroll = chat.scrollTop + chat.clientHeight === chat.scrollHeight;

    createChannelLine(chatLog)
    let chatLine = createChatLine()
    createUserNameSpan(chatLog, chatLine)
    let messageSpan = createMessageSpan(chatLog)
    
    chatLine.appendChild(messageSpan)

    if (!shouldScroll) {
        scrollToBottom(chat);
    }
}

function createChatLine() {
    const chatLine = document.createElement("div")
    chatLine.id = "chatLine"
    chatLine.className = "chatLines"
    document.getElementById("chat").appendChild(chatLine);
    return chatLine
}

function createChannelLine(chatLog) {
    const channelLine = document.createElement("div")
    channelLine.id = "channelLine"
    channelLine.className = "channelLines"
    channelLine.textContent = chatLog.channel + "'s chat"
    document.getElementById("chat").appendChild(channelLine)
    return channelLine
}

function createUserNameSpan(chatLog, chatLine) {
    const usernameSpan = document.createElement("span");
    usernameSpan.id = chatLog.id;
    usernameSpan.textContent = chatLog.username;
    usernameSpan.style.color = chatLog.color;
    usernameSpan.style.fontWeight = "bold";
    chatLine.appendChild(usernameSpan)
    console.log(usernameSpan)
}

function createMessageSpan(chatLog) {
    const messageSpan = document.createElement("span");
    messageSpan.className = "messages";
    messageSpan.style.color = "#979799";
    messageSpan.style.fontWeight = "normal";
    const messagesArray = [];
    postTwitchEmotes(chatLog, messagesArray)
    messageSpan.innerHTML = ": " + messagesArray.join('')
    console.log(chatLog.message)
    return messageSpan
}

function postTwitchEmotes(chatLog, messagesArray) {
    const messages = chatLog.message
    for (const i in messages) {
        console.log("each message: " + messages[i])
        if (messages[i].type === "emote") {
            messagesArray.push("<img src=https://static-cdn.jtvnw.net/emoticons/v1/" + messages[i].id + "/1.0></img>")
        }
        if (messages[i].type === "text") {
            messagesArray.push(messages[i].text)
        }
    }
}
