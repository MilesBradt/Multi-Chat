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

        var div = document.createElement("div");
        document.getElementById("chat").appendChild(div);
        div.id = chatLog.id;
        div.textContent = chatLog.username
        div.style.color = chatLog.color

        console.log('Message from server ', chatLog);
    });

    const sendMessage = () => {
        socket.send('Hello From Client1!');
    }
}