
var Map = function(parentDiv) {

    var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');

    var osmCycle = L.tileLayer('http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png');
    var osmCycleTransport = L.tileLayer('http://{s}.tile2.opencyclemap.org/transport/{z}/{x}/{y}.png');
    var toner = L.tileLayer('http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png');
    var watercolor = L.tileLayer('http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg');

    this.layerPokestops = new L.LayerGroup();
    this.layerCatches = new L.LayerGroup();
    this.layerPath = new L.LayerGroup();

    this.map = L.map(parentDiv, {
        layers: [osm, this.layerPokestops, this.layerCatches, this.layerPath]
    });

   var baseLayers = {
        "OpenStreetMap": osm,
        "OpenCycleMap": osmCycle,
        "OpenCycleMap Transport": osmCycleTransport,
        "Toner": toner,
        "Watercolor": watercolor,
    };
    var overlays = {
        "Path": this.layerPath,
        "Pokestops": this.layerPokestops,
        "Catches": this.layerCatches
    };

    L.control.layers(baseLayers, overlays).addTo(this.map);

    this.path = null;

    this.steps = [];
    this.catches = [];
    this.pokestops = [];
    this.pokemonList = [];
};

Map.prototype.saveContext = function() {
    var stops = Array.from(this.pokestops, p => {
        return {
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            visited: p.visited
        }
    });

    sessionStorage.setItem("available", true);
    sessionStorage.setItem("steps", JSON.stringify(this.steps));
    sessionStorage.setItem("catches", JSON.stringify(this.catches));
    sessionStorage.setItem("pokestops", JSON.stringify(stops));
}

Map.prototype.loadContext = function() {
    try {
        if (sessionStorage.getItem("available") == "true") {
            console.log("Load data from storage to restore session");

            this.steps = JSON.parse(sessionStorage.getItem("steps")) || [];
            this.catches = JSON.parse(sessionStorage.getItem("catches")) || [];
            this.pokestops = JSON.parse(sessionStorage.getItem("pokestops")) || [];

            if (this.steps.length > 0) this.initPath();

            this.initPokestops();
            this.initCatches();

            sessionStorage.setItem("available", false);
        }
    } catch(err) { console.log(err); }
}

Map.prototype.initPath = function() {
    if (this.path != null) return true;

    if (!this.me) {
        var last = this.steps[this.steps.length - 1];
        this.map.setView([last.lat, last.lng], 16);
        this.me = L.marker([last.lat, last.lng], { zIndexOffset: 200 }).addTo(this.map).bindPopup(`${last.lat.toFixed(4)},${last.lng.toFixed(4)}`);
        $(".loading").hide();
    }

    if (this.steps.length >= 2) {
        var pts = Array.from(this.steps, pt => L.latLng(pt.lat, pt.lng));
        this.path = L.polyline(pts, { color: 'red' }).addTo(this.layerPath);
        return true;
    }

    return false;
}

Map.prototype.initCatches = function() {
    for (var i = 0; i < this.catches.length; i++) {
        var pt = this.catches[i];
        var icon = L.icon({ iconUrl: `./assets/pokemon/${pt.id}.png`, iconSize: [50, 50], iconAnchor: [20, 20]});
        //var pkm = `${pt.name} (lvl ${pt.lvl}) <br /> Cp:${pt.cp} Iv:${pt.iv}%`;
        var pkm = `${pt.name} <br /> Cp:${pt.cp} Iv:${pt.iv}%`;
        L.marker([pt.lat, pt.lng], {icon: icon, zIndexOffset: 100}).bindPopup(pkm).addTo(this.layerCatches);
    }
}

Map.prototype.initPokestops = function() {
    for (var i = 0; i < this.pokestops.length; i++) {
        var pt = this.pokestops[i];
        var iconurl = pt.visited  ? `./assets/img/pokestop.png` : `./assets/img/pokestop_available.png`;
        var icon = L.icon({ iconUrl: iconurl, iconSize: [30, 50]});
        pt.marker = L.marker([pt.lat, pt.lng], {icon: icon, zIndexOffset: 50}).bindPopup(pt.name).addTo(this.layerPokestops);
    }
}

Map.prototype.addToPath = function(pt) {
    this.steps.push(pt);
    if (global.config.memory.limit && this.steps.length > global.config.memory.mathPath) {
        this.layerPath.clearLayers();
        this.path = null;
        var max = Math.floor(global.config.memory.mathPath * 0.7);
        this.steps = this.steps.slice(-max);
    }
    if (this.initPath()) {
        var latLng = L.latLng(pt.lat, pt.lng);
        this.path.addLatLng(latLng);
        this.me.setLatLng(latLng).getPopup().setContent(`${pt.lat.toFixed(4)},${pt.lng.toFixed(4)}`);
        if (global.config.followPlayer) {
            this.map.panTo(latLng, true);
        }
    }
}

Map.prototype.addCatch = function(pt) {
    if (!pt.lat) {
        if (this.steps.length <= 0) return;
        var last = this.steps[this.steps.length - 1];
        pt.lat = last.lat;
        pt.lng = last.lng;
    }

    //var pkm = `${pt.name} (lvl ${pt.lvl}) <br /> Cp:${pt.cp} Iv:${pt.iv}%`;
    var pkm = `${pt.name}<br /> CP:${pt.cp} IV:${pt.iv}%`;

    this.catches.push(pt);

    if (global.config.memory.limit && this.catches.length > global.config.memory.maxCaught) {
        console.log("Clean catches");
        var max = Math.floor(global.config.memory.maxCaught * 0.7);
        this.catches = this.catches.slice(-max);
        this.layerCatches.clearLayers();
        this.initCatches();
    } else {
        var icon = L.icon({ iconUrl: `./assets/pokemon/${pt.id}.png`, iconSize: [50, 50], iconAnchor: [25, 25] });
        L.marker([pt.lat, pt.lng], {icon: icon, zIndexOffset: 100 }).bindPopup(pkm).addTo(this.layerCatches);
    }
}

Map.prototype.addVisitedPokestop = function(pt) {
    if (!pt.lat) return;

    this.pokestops.push(pt);

    var ps = this.pokestops.find(ps => ps.id == pt.id);
    if (ps) pt = ps;

    if (pt.marker) {
        pt.marker.setIcon(L.icon({ iconUrl: `./assets/img/pokestop.png`, iconSize: [30, 50]}));
        if (pt.name) pt.marker.bindPopup(pt.name);
    } else {
        var icon = L.icon({ iconUrl: `./assets/img/pokestop.png`, iconSize: [30, 50]});
        pt.marker = L.marker([pt.lat, pt.lng], {icon: icon, zIndexOffset: 50});
        if (pt.name) marker.bindPopup(pt.name);
        pt.marker.addTo(this.layerPokestops);
    }
}

Map.prototype.addPokestops = function(forts) {
    for(var i = 0; i < forts.length; i++) {
        var pt = forts[i];
        var ps = this.pokestops.find(ps => ps.id == pt.id);
        if (ps) pt = ps;
        if (!pt.marker) {
            var iconurl = pt.visited  ? `./assets/img/pokestop.png` : `./assets/img/pokestop_available.png`;
            var icon = L.icon({ iconUrl: iconurl, iconSize: [30, 50]});
            pt.marker = L.marker([pt.lat, pt.lng], {icon: icon, zIndexOffset: 50}).addTo(this.layerPokestops);
            this.pokestops.push(pt);
        } else if (pt.visited) {
            pt.marker.setIcon(L.icon({ iconUrl: `./assets/img/pokestop.png`, iconSize: [30, 50]}));
        }
    }

    if (global.config.memory.limit && this.pokestops.length > global.config.memory.maxPokestops) {
        // to much pokestops, remove some starting with unvisited ones
    }
}

Map.prototype.displayPokemonList = function(all, sortBy, eggs) {
    console.log("Pokemon list");
    global.active = "pokemon";
    this.pokemonList = all || this.pokemonList;
    this.eggsCount = (eggs || this.eggsCount) || 0;
    if (!sortBy) {
        sortBy = localStorage.getItem("sortPokemonBy") || "cp";
    } else {
        localStorage.setItem("sortPokemonBy", sortBy);
    }

    if (sortBy == "pokemonId") {
        this.pokemonList = this.pokemonList.sort((p1, p2) => p1[sortBy] - p2[sortBy]);
    } else {
        this.pokemonList = this.pokemonList.sort((p1, p2) => p2[sortBy] - p1[sortBy]);
    }

    var total = this.eggsCount + this.pokemonList.length;
    $(".inventory .numberinfo").text(`${total}/${global.storage.pokemon}`);
    var div = $(".inventory .data");
    div.html(``);
    this.pokemonList.forEach(function(elt) {
        var canEvolve = elt.canEvolve && !elt.inGym && elt.candy >= elt.candyToEvolve;
        var evolveStyle = canEvolve ? "" : "style='display:none'";
        var evolveClass = canEvolve ? "canEvolve" : "";
        var transferStyle = elt.favorite ? "style='display:none'" : "";
        div.append(`
            <div class="pokemon">
                <div class="transfer" id='${elt.id}'>
                    <a title='Transfer' href="#" class="transferAction ${transferStyle}"><img src="./assets/img/recyclebin.png" /></a>
                    <a title='Evolve' href="#" class="evolveAction" ${evolveStyle}><img src="./assets/img/evolve.png" /></a>
                </div>
                <span class="info">CP: <strong>${elt.cp}</strong> IV: <strong>${elt.iv}%</strong></span>
                <span class="info">Candy: ${elt.candy}<span ${evolveStyle}>/${elt.candyToEvolve}</span></span>
                <span class="imgspan ${evolveClass}"><img src="./assets/pokemon/${elt.pokemonId}.png" /></span>
                <span class="name">${elt.name}</span>
            </div>
        `);
    });
    $(".pokemonsort").show();
    $(".inventory").show().addClass("active");
}

Map.prototype.displayEggsList = function(eggs) {
    console.log("Eggs list");
    global.active = "eggs";
    $(".inventory .sort").hide();
    $(".inventory .numberinfo").text(eggs.length + "/9");
    var div = $(".inventory .data");
    div.html("");
    eggs.forEach(function(elt) {
        if (elt) {
            div.append(`
                <div class="eggs">
                    <span class="imgspan"><img src="./assets/inventory/${elt.type}.png" /></span>
                    <span>${elt.doneDist.toFixed(1)} / ${elt.totalDist.toFixed(1)} km</span>
                </div>
            `);
        }
    });
    $(".inventory").show().addClass("active");
};

Map.prototype.displayInventory = function(items) {
    console.log("Inventory list");
    global.active = "inventory";
    $(".inventory .sort").hide();
    var count = items.filter(i => i.item_id != 901).reduce((prev, cur) => prev + cur.count, 0);
    $(".inventory .numberinfo").text(`${count}/${global.storage.items}`);
    var div = $(".inventory .data");
    div.html(``);
    items.forEach(function(elt) {
        div.append(`
            <div class="items">
                <span>x${elt.count}</span>
                <span class="imgspan"><img src="./assets/inventory/${elt.item_id}.png" /></span>
                <span class="info">${elt.name}</span>
            </div>
        `);
    });
    $(".inventory").show().addClass("active");
};