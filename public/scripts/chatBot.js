import { config } from "../lists/config.js"

const password = config.O_AUTH;
const channels = config.channels;

// Define configuration options
const opts = {
    identity: {
        username: "Snowbottos",
        password: password
    },
    channels: channels
};

// Create a client with Twitch options
const client = new tmi.client(opts);

// Register Twitch event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

// Called every time a message comes in
function onMessageHandler(target, context, msg, self) {
    // Ignore messages from the bot
    if (self) {
        return;
    }

    // Remove whitespace from chat message
    const message = msg.trim();
    const cleanTarget = target.slice(1)
    const userName = context.username

    // How tf do I get this to DOM?
    console.log(cleanTarget + "'s chat - " + userName + ": " + message)

}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}