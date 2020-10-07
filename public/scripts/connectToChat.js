function connectToChat(channel) {
    // Create WebSocket connection.
    // const socket = new WebSocket('ws://localhost:8080');

    var socket = new WebSocket(((window.location.protocol === "https:") ? "wss://" : "ws://") + window.location.host + "/ws");
    let hovering = false;

    // Connection opened
    socket.addEventListener('open', function (event) {
        console.log('Connected to WS Server')
        socket.send(channel)
        ca = new Color.Adjuster;
        notOverChat()
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        let token = JSON.parse(event.data)

        if(token.event === "message") {
            postToDOM(token)
        }
        else if (token.event === "timeout" || token.event === "ban") {
            handleTimeout(token)
        } 
        else if (token.event === "delete") {
            handleDeletedMessage(token)
        }
    });

}

function hoveringOverChat(bool) {
    hovering = bool
}

function handleTimeout(token) {
    let thisToken = document.getElementsByClassName(token.user)
    for (var i = 0; i < thisToken.length; ++i) {
        console.log(i)
        thisToken[i].textContent = "<message deleted>"
        thisToken[i].style.color = '#979fab'
    }
}

function handleDeletedMessage(token) {
    let message = document.getElementById(token[0]['message-id'])
    message.textContent = "<message deleted>"
    message.style.color = '#979fab'
}

function postToDOM(token) {
    const chat = document.getElementById('chat');
    console.log(token)

    createChannelLine(token)
    let chatLine = createChatLine()
    createBadges(token, chatLine)
    createUserNameSpan(token, chatLine)
    let messageSpan = createMessageSpan(token)

    chatLine.appendChild(messageSpan)

    if (hovering) {
        console.log("on chat")
    } else {
        console.log("out of chat")
        let xH = chat.scrollHeight
        chat.scrollTo(0, xH)
    }
}

function createChatLine() {
    const chatLine = document.createElement("div")
    chatLine.id = "chatLine"
    chatLine.className = "chatLines"
    document.getElementById("chat").appendChild(chatLine);
    return chatLine
}

function createChannelLine(token) {
    const channelLine = document.createElement("div")
    channelLine.id = "channelLine"
    channelLine.className = "channelLines"
    channelLine.innerHTML = token.channel + "'s chat"
    document.getElementById("chat").appendChild(channelLine)
    return channelLine
}

function createBadges(token, chatLine) {
    token.badges.forEach(function (e) {
        const img = document.createElement("IMG");
        img.id = e.id
        img.className = "badges"
        img.src = e.url
        chatLine.appendChild(img)
    })
}

function createUserNameSpan(token, chatLine) {
    const usernameSpan = document.createElement("span");
    if (token.display.toLowerCase() === token.username.toLowerCase()) {
        usernameSpan.innerHTML = token.username + "<span class='beforeMessage'>: </span>";
        token.color = ca.process(token.color)
        usernameSpan.style.color = token.color;
        usernameSpan.style.fontWeight = "bold";
    } else {
        usernameSpan.innerHTML = token.username;
        const displayNameSpan = document.createElement("span")
        displayNameSpan.innerHTML = " (" + token.display + ")" + "<span class='beforeMessage'>: </span>"
        let newColor = tinycolor(ca.process(token.color))
        displayNameSpan.style.color = ca.process(newColor.darken(25).toString())
        displayNameSpan.style.fontWeight = "normal"
        usernameSpan.appendChild(displayNameSpan)
        token.color = ca.process(token.color)
        usernameSpan.style.color = token.color;
        usernameSpan.style.fontWeight = "bold";
    }
    chatLine.appendChild(usernameSpan)
}

function createMessageSpan(token) {
    const messageSpan = document.createElement("span");
    messageSpan.className = "messages";
    messageSpan.className = token.id
    messageSpan.id = token['message-id'];
    messageSpan.style.color = "#fff";
    messageSpan.style.fontWeight = "normal";
    const messagesArray = [];
    postTwitchEmotes(token, messagesArray)
    messageSpan.innerHTML = messagesArray.join('')
    return messageSpan
}

function postTwitchEmotes(token, messagesArray) {
    const messages = token.message
    for (const i in messages) {
        if (messages[i].type === "emote") {
            messagesArray.push("<img class='emotes' src=" + messages[i].url + ">  </img>")
        }
        if (messages[i].type === "text") {
            messagesArray.push(messages[i].text)
        }
    }
}

