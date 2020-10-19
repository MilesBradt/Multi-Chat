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
        console.log(token)
        if(token.type === "avatars") {
            console.log("it got here")
            postAvatarsToDOM(token)
        }
        else if (token.special === 'highlighted-message') {
            createChannelLine(token)
            postHighlightedMessageToDom(token)
        }
        else if (token.event === "message") {
            createChannelLine(token)
            postToDOM(token)
        } else if (token.event === "resub" || token.event === 'sub') {
            createChannelLine(token)
            postSubInfoToDom(token)
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
        thisToken[i].textContent = "<message deleted>"
        thisToken[i].style.color = '#979fab'
    }
}

function handleDeletedMessage(token) {
    let message = document.getElementById(token['message-id'])
    message.textContent = "<message deleted>"
    message.style.color = '#979fab'
}

function postToDOM(token, subDiv, highlightDiv) {
    const chat = document.getElementById('chat');

    let chatLine = createChatLine(token, subDiv, highlightDiv)
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

function postAvatarsToDOM(token) {
    const channelsDiv = document.getElementById("channel-row")
    console.log(token)
    for (i in token.channels) {
        console.log(token.channels[i].url)
        let channel = document.createElement("div")
        channel.className = "channel-div"
        channel.innerHTML = "<img class='channel-icon' src='" + token.channels[i].url + "'></img><a href='https://www.twitch.tv/"+ token.channels[i].channel + "' target='_blank' <span class='channel-names'>" + token.channels[i].channel + "</span></a>"
        channelsDiv.appendChild(channel)
    }
}

function postSubInfoToDom(token) {
    const subLine = document.createElement("div")
    const subDiv = document.createElement("div")
    subDiv.className = 'sub-div'
    subLine.appendChild(subDiv)
    const subSpan = document.createElement("span")
    subSpan.className = "sub-span";
    subDiv.appendChild(subSpan)
    subLine.className = token.event
    subLine.style.borderLeft = '0.3em solid ' + ca.process(token.color)
    if (token.prime) {
        subSpan.innerHTML = "<img class='sub-badges' src='../images/prime.png'></img> " + "<span class='sub-username'>" + token.display + "</span>" + " " + "<span class='sub-message'>" + token.system + "</span>"
        document.getElementById("chat").appendChild(subLine)
    } else {
        subSpan.innerHTML = "<img class='sub-badges' src='../images/sub.png'></img> " + "<span class='sub-username'>" + token.display + "</span>" + " " + "<span class='sub-message'>" + token.system + "</span>"
        document.getElementById("chat").appendChild(subLine)
    }

    if (token.message[0].text !== null) {
        postToDOM(token, subDiv, null)
    }

    if (hovering) {
        console.log("on chat")
    } else {
        console.log("out of chat")
        let xH = chat.scrollHeight
        chat.scrollTo(0, xH)
    }

}

function postHighlightedMessageToDom(token) {
    const highlightLine = document.createElement("div")
    const highlightDiv = document.createElement("div")
    highlightDiv.className = 'highlight-div'
    highlightLine.appendChild(highlightDiv)
    highlightLine.className = token.special
    const highlightEventDiv = document.createElement("div")
    highlightEventDiv.className = "highlight-event"
    highlightEventDiv.innerHTML = "<span class='redeemed'>Redeemed </span>" + "<span class='highlight-my-message'>Highlight My Message </span><img class='points-icon' src='../images/points.png'></img>"
    highlightDiv.appendChild(highlightEventDiv)

    let color = token.color + "50"
    highlightLine.style.backgroundColor = ca.process(color)
    highlightLine.style.borderLeft = '0.3em solid ' + ca.process(token.color)
    document.getElementById("chat").appendChild(highlightLine)
    postToDOM(token, null, highlightDiv)
}

function createChatLine(token, subDiv, highlightDiv) {
    const chatLine = document.createElement("div")
    chatLine.id = "chatLine"
    chatLine.className = "chatLines"

    if(token.special === 'highlighted-message') {
        highlightDiv.appendChild(chatLine)
        highlightDiv.style.paddingBottom = "0.3em";
        return chatLine
    }
    else if (token.evet === "sub" || token.event === "resub") {
        subDiv.appendChild(chatLine)
        chatLine.style.paddingBottom = "0.3em";
        return chatLine
    } else {
        chatLine.style.paddingBottom = "1em";
        document.getElementById("chat").appendChild(chatLine);
        return chatLine
    }
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
    usernameSpan.className = "user-name"
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
    console.log(messages)
    for (const i in messages) {
        if (messages[i].type === "emote") {
            console.log(messages[i])
            if(messages[i].event === "cheer") {
                messagesArray.push("<img class='cheer' src=" + messages[i].url + ">  </img>" + " " + "<span class='cheer' style='color: " + messages[i].color + "; font-weight: bold;'>" + messages[i].amount + "</span>")
            } else {
                messagesArray.push("<img class='emotes' src=" + messages[i].url + ">  </img>")
            }
        }
        
        if (messages[i].type === "text") {
            messagesArray.push(messages[i].text)
        }
    }
}

