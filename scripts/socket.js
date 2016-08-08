var inventory = window.inventoryService;

function setUserName(user) {
    if (!global.user) {
        global.user = user;
        document.title = `[${user}] ${document.title}`;
    }
}

//localStorage.debug = 'socket.io-client:socket';
function startListenToSocket() {
    inventory.init(global.config.locale);
    console.log("Connecting to " + global.config.websocket);

    var pkmSettings = localStorage.getItem("pokemonSettings");
    if (pkmSettings) {
        global.pokemonSettings = JSON.parse(pkmSettings);
    } else {
        global.pokemonSettings = {};
    }

    var socket = io.connect(global.config.websocket + "/event");
    global.ws = socket;
    socket.on('connect', () => {
        console.log("Connected to Bot");
        global.connected = true;
        $(".loading").text("Waiting to get GPS coordinates from Bot..."); 
    });
    socket.on("bot_initialized", msg => {
        if (Array.isArray(msg)) msg = msg.length > 0 ? msg[0] : {};
        if (msg.username) {
            console.log("Bot Ready.");
            setUserName(msg.username);
            global.map.addToPath({ 
                lat: msg.coordinates[0], 
                lng: msg.coordinates[1] 
            });
        }
    });
    socket.on('position', msg => {
        if (!global.snipping) {
            global.map.addToPath({ 
                lat: msg.coordinates[0], 
                lng: msg.coordinates[1] 
            });
        }
    });
    socket.on('pokestops', msg => {
        var forts = Array.from(msg.pokestops.filter(f => f.fort_type == 1), f => {
            return {
                id: f.fort_id,
                lat: f.latitude,
                lng: f.longitude,
                cooldown_timestamp_ms: f.cooldown_timestamp_ms
            }
        });
        global.map.addPokestops(forts);
    });
    socket.on('pokemon_caught', msg => {
        var pokemon = JSON.parse(msg.pokemon);
        var pkm = {
            id: pokemon.pokemon_id,
            name: inventory.getPokemonName(pokemon.pokemon_id),
            cp: pokemon.combat_power,
            iv: pokemon.potential * 100,
            lvl: "?",
            lat: 0,
            lng: 0
        };
        global.map.addCatch(pkm);
        pokemonToast(pkm, { ball: pokemon.pokeball });
    });
    socket.on("inventory_list", msg => {
        var items = Array.from(Object.keys(msg.inventory).filter(k => k != "count"), item => {
            var itemid = parseInt(item);
            return {
                item_id: itemid,
                name: inventory.getItemName(itemid),
                count: msg.inventory[item]
            }
        });
        global.map.displayInventory(items);
    });
    socket.on("pokemon_list", msg => {
        console.log(msg);
    });
    socket.on("eggs_list", msg => {
        var incubators = msg.egg_incubators.filter(i => i.target_km_walked != 0 || i.start_km_walked != 0);
         incubators = Array.from(incubators, i => { 
            msg.km_walked = msg.km_walked || 0;
            return {
                type: i.item_id == 901 ? "incubator-unlimited" : "incubator",
                totalDist: i.target_km_walked - i.start_km_walked,
                doneDist: msg.km_walked - i.start_km_walked
            }
        });
        var eggs = Array.from(msg.eggs, i => {
            return {
                type: "egg",
                totalDist: i.total_distance,
                doneDist: i.walked_distance
            }
        });
        global.map.displayEggsList(incubators.concat(eggs));
    });
    socket.on('pokemon_found', msg => {
        console.log(msg);
    });
    socket.on('player_update', msg => {
        console.log(msg);
    });
}

function riendutout() {
    ws = new WebSocket(global.config.websocket);
    global.ws = ws;
    global.connected = false;
    ws.onclose = (evt) => {
        $(".loading").text("Connecting to the bot...");
        setTimeout(listenToWebSocket, 1000);
        if (global.connected) {
            errorToast("Connection lost.");
            global.connected = false;
        }
    };
    // ws.onopen = () => { 
    //     console.log("Connected to Bot");
    //     global.connected = true;
    //     $(".loading").text("Waiting to get GPS coordinates from Bot..."); 
    // };
    ws.onmessage = function (evt) {
        var msg = JSON.parse(evt.data);
        var command = msg.Command || msg.$type;
        if (command.indexOf("PokemonSettings") >= 0) {
            var settings = msg.Data.$values;
            global.pokemonSettings = Array.from(msg.Data.$values, elt => {
                elt.EvolutionIds = elt.EvolutionIds.$values;
                return elt;
            })
            localStorage.setItem("pokemonSettings", JSON.stringify(global.pokemonSettings));
        } else if (command.indexOf("ProfileEvent") >= 0) {
            // once connected, ask for pokemon settings
            var username = msg.Profile.PlayerData.Username;
            global.username = username;
            global.storage = {
                pokemon: msg.Profile.PlayerData.MaxPokemonStorage,
                items: msg.Profile.PlayerData.MaxItemStorage
            }
            document.title = `[${username}] ${document.title}`;
            ws.send(JSON.stringify({ Command: "GetPokemonSettings" }));
        } else if (command.indexOf("UpdatePositionEvent") >= 0) {
            if (!global.snipping) {
                global.map.addToPath({ 
                    lat: msg.Latitude, 
                    lng: msg.Longitude 
                });
            }
        } else if (command.indexOf("PokemonCaptureEvent") >= 0) {
            if (msg.Status = 1 && msg.Exp > 0) {
                var pkm = {
                    id: msg.Id,
                    name: inventory.getPokemonName(msg.Id),
                    cp: msg.Cp,
                    iv: msg.Perfection,
                    lvl: msg.Level,
                    lat: msg.Latitude,
                    lng: msg.Longitude
                };
                global.map.addCatch(pkm);
                pokemonToast(pkm, { ball: msg.Pokeball });
            }
        } else if (command.indexOf("FortUsedEvent") >= 0) {
            //console.log(msg);
            if (msg.Latitude && msg.Longitude) {
                global.map.addVisitedPokestop({
                    id: msg.Id,
                    name: msg.Name,
                    lat: msg.Latitude,
                    lng: msg.Longitude
                });
            }
        // } else if (command.indexOf("PokeStopListEvent") >= 0) {
        //     var forts = Array.from(msg.Forts.$values.filter(f => f.Type == 1), f => {
        //         return {
        //             id: f.Id,
        //             lat: f.Latitude,
        //             lng: f.Longitude
        //         }
        //     });
        //     global.map.addPokestops(forts);
        } else if (command.indexOf("SnipeModeEvent") >= 0) {
            if (msg.Active) console.log("Sniper Mode");
            global.snipping = msg.Active;
        } else if (command.indexOf("PokemonListEvent") >= 0) {
            var pkm = Array.from(msg.PokemonList.$values, p => {
                var pkmInfo = global.pokemonSettings[p.Item1.PokemonId - 1];
                return {
                    id: p.Item1.Id,
                    pokemonId: p.Item1.PokemonId,
                    inGym: p.Item1.DeployedFortId != "",
                    canEvolve: pkmInfo && pkmInfo.EvolutionIds.length > 0,
                    cp: p.Item1.Cp,
                    iv: p.Item2.toFixed(1),
                    name: p.Item1.Nickname || inventory.getPokemonName(p.Item1.PokemonId),
                    realname: inventory.getPokemonName(p.Item1.PokemonId, "en"),
                    candy: p.Item3,
                    candyToEvolve: pkmInfo ? pkmInfo.CandyToEvolve : 0,
                    favorite: p.Item1.Favorite != 0
                }
            });
            global.map.displayPokemonList(pkm);
        // } else if (command.indexOf("EggsListEvent") >= 0) {
        //     var incubators = Array.from(msg.Incubators.$values, i => {
        //         if (i.TargetKmWalked != 0 || i.StartKmWalked != 0) {
        //             msg.PlayerKmWalked = msg.PlayerKmWalked || 0;
        //             return {
        //                 type: i.ItemId == 901 ? "incubator-unlimited" : "incubator",
        //                 totalDist: i.TargetKmWalked - i.StartKmWalked,
        //                 doneDist: msg.PlayerKmWalked - i.StartKmWalked
        //             }
        //         }
        //     });
        //     var eggs = Array.from(msg.UnusedEggs.$values, i => {
        //         return {
        //             type: "egg",
        //             totalDist: i.EggKmWalkedTarget,
        //             doneDist: i.EggKmWalkedStart
        //         }
        //     });
        //     global.map.displayEggsList(incubators.concat(eggs));
        // } else if (command.indexOf("InventoryListEvent") >= 0) {
        //     console.log(msg);
        //     var items = Array.from(msg.Items.$values, item => {
        //         return {
        //             name: inventory.getItemName(item.ItemId),
        //             itemId: item.ItemId,
        //             count: item.Count,
        //             unseen: item.Unseen
        //         }
        //     });
        //     global.map.displayInventory(items);
        } else if (command.indexOf("PokemonEvolveEvent") >= 0) {
            var pkm = {
                id: msg.Id,
                name: inventory.getPokemonName(msg.Id)
            };
            pokemonToast(pkm, { title: "A Pokemon Evolved" });
        } else if (command.indexOf("TransferPokemonEvent") >= 0) {
            // nothing
        } else if (command.indexOf("FortTargetEvent") >= 0) {
            // nothing
        } else if (command.indexOf("NoticeEvent") >= 0) {
            // nothing
        } else if (command.indexOf("WarnEvent") >= 0) {
            // nothing
        } else if (command.indexOf("SnipeScanEvent") >= 0) {
            // nothing
        } else if (command.indexOf("ItemRecycledEvent") >= 0) {
            // nothing
        } else if (command.indexOf("EvolveCountEvent") >= 0) {
            // nothing
        } else if (command.indexOf("DebugEvent") >= 0) {
            // nothing
        } else if (command.indexOf("SnipeEvent") >= 0) {
            // nothing
        } else if (command.indexOf("EggIncubatorStatusEvent") >= 0) {
            // nothing
        } else if (command.indexOf("iconAnchor") >= 0) {
            // nothing
        } else if (command.indexOf("ErrorEvent") >= 0) {
            console.log(msg.Message);
        } else {
            console.log(msg);
        }
    };
}

function errorToast(message) {
    toastr.error(message, "Error", {
        "progressBar": true,
        "positionClass": "toast-top-left",
        "timeOut": "5000",
        "closeButton": true
    });
}

function pokemonToast(pkm, options) {
    if (global.config.noPopup) return;

    options = options || {};
    var title = options.title || ( global.snipping ? "Snipe success" : "Catch success" );
    var toast = global.snipping ? toastr.success : toastr.info;
    var pkminfo = pkm.name;
    if (pkm.lvl) pkminfo += ` (lvl ${pkm.lvl})`;

    var content = `<div>${pkminfo}</div><div>`;
    content += `<img src='./assets/pokemon/${pkm.id}.png' height='50' />`;
    if (options.ball) content += `<img src='./assets/inventory/${options.ball}.png' height='30' />`;
    content += `</div>`;
    toast(content, title, {
        "progressBar": true,
        "positionClass": "toast-bottom-left",
        "timeOut": "5000",
        "closeButton": true
    })
}