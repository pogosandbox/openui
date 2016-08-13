require('dotenv').config({silent: true});

var express = require('express');
var app = express();
var http = require('http');
app.use(express.static(__dirname + "/src"));

httpserver = http.createServer(app);

httpserver.listen(8080, "0.0.0.0", function() {
    var addr = httpserver.address();
    console.log("Server listening at ", addr.address + ":" + addr.port);
});

// fake bot 
if (process.env.FAKE_BOT_ENABLED == "true") {
    var io = require('socket.io')(httpserver);

    io.of("/event").on('connection', function (socket) {
        socket.emit('bot_initialized', { 
            username: "user",
            player: {
                level: 1
            },
            storage: {
                max_pokemon_storage: 250,
                max_item_storage: 350
            },
            coordinates: [48.856297, 2.297987, 4]
        });
        socket.emit('position', { 
            coordinates: [48.856297, 2.297987, 4]
        });

        setTimeout(() => {
            socket.emit("pokemon_caught", {
                pokemon: {
                    pokemon_id: 10,
                    combat_power: 1000,
                    potential: 0.8,
                    combat_power_multiplier: 0.5,
                    additional_cp_multiplier: 0.3
                },
                position: {
                    latitude: 48.857,
                    longitude: 2.30
                }
            });
        }, 5000);

        socket.on('my other event', function (data) {
            console.log(data);
        });
    });
}