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
    function moreOrLess(pos) {
        pos = [
            pos[0] + Math.random()*0.002 - 0.002/2,
            pos[1] + Math.random()*0.002 - 0.002/2
        ];
        return pos;
    }

    var io = require('socket.io')(httpserver);
    var pos = [48.856297, 2.297987];
    io.of("/event").on('connection', function (socket) {
        socket.emit('bot_initialized', { 
            username: "user",
            player: { level: 1, experience: 600, prev_level_xp: 0, next_level_xp: 1000 },
            storage: { max_pokemon_storage: 250, max_item_storage: 350 },
            coordinates: pos
        });

        setInterval(() => {
            var ppos = moreOrLess(pos);
            socket.emit("pokemon_caught", {
                pokemon: {
                    pokemon_id: Math.floor(Math.random() * 150),
                    combat_power: 1000,
                    potential: 0.8,
                    combat_power_multiplier: 0.5,
                    additional_cp_multiplier: 0.3
                },
                position: { latitude: ppos[0], longitude: ppos[1] }
            });
        }, 10*1000);

        socket.on('pokemon_list', () => {
            socket.emit("pokemon_list", {
                candy: { 10: 50 },
                pokemon: [
                    { 
                        unique_id: "1234", pokemon_id: 10, combat_power: 1000, potential: 0.5,
                        combat_power_multiplier: 0.5, additional_cp_multiplier: 0.3,
                        attack: 10, defense: 10, hp: 50, max_hp: 50, stamina: 10
                    }
                ]
            });
        });

        socket.on('inventory_list', () => {
            socket.emit("inventory_list", {
                inventory: { 1: 100, 401: 10, 701: 100, 901: 1 }
            });
        });

        socket.on('transfer_pokemon', (data) => { console.log("transfer: " + data.id); });
        socket.on('evolve_pokemon', (data) => { console.log("evolve: " + data.id); });
        socket.on('drop_items', (data) => { console.log("drop: " + data.id + " - " + data.count); });
    });
}