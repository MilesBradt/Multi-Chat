

function connectToChat(channel) {
    // Create WebSocket connection.
    const socket = new WebSocket('ws://localhost:8080');

    // Connection opened
    socket.addEventListener('open', function (event) {
        console.log('Connected to WS Server')
        socket.send(channel)
        ca = new Color.Adjuster;
        
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
    console.log(chatLog)
    
    
    let shouldScroll = chat.scrollTop + chat.clientHeight === chat.scrollHeight;

    createChannelLine(chatLog)
    let chatLine = createChatLine()
    createBadges(chatLog, chatLine)
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
    channelLine.innerHTML = chatLog.channel + "'s chat"
    document.getElementById("chat").appendChild(channelLine)
    return channelLine
}

function createBadges(chatLog, chatLine) {
    chatLog.badges.forEach(function(e) {
        const img = document.createElement("IMG");
        img.id = e.id
        img.className = "badges"
        img.src = e.url
        chatLine.appendChild(img)
    })
}

function createUserNameSpan(chatLog, chatLine) {
    const usernameSpan = document.createElement("span");
    usernameSpan.id = chatLog.id;
    usernameSpan.innerHTML = chatLog.username + "<span class='beforeMessage'>: </span>";
    chatLog.color = ca.process(chatLog.color)
    usernameSpan.style.color = chatLog.color;
    usernameSpan.style.fontWeight = "bold";
    chatLine.appendChild(usernameSpan)
}

function createMessageSpan(chatLog) {
    const messageSpan = document.createElement("span");
    messageSpan.className = "messages";
    messageSpan.id = chatLog.id;
    messageSpan.style.color = "#e0e0e0";
    messageSpan.style.fontWeight = "normal";
    const messagesArray = [];
    postTwitchEmotes(chatLog, messagesArray)
    messageSpan.innerHTML = messagesArray.join('')
    return messageSpan
}

function postTwitchEmotes(chatLog, messagesArray) {
    const messages = chatLog.message
    for (const i in messages) {
        if (messages[i].type === "emote") {
            messagesArray.push("<img class='emotes' src=https://static-cdn.jtvnw.net/emoticons/v1/" + messages[i].id + "/1.0></img>")
        }
        if (messages[i].type === "text") {
            messagesArray.push(messages[i].text)
        }
    }
}

