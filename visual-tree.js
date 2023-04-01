var bookmarks = {
    bookmarks: [],
    load: function() {
        if("taxon_bookmarks" in localStorage) {
            if(localStorage.taxon_bookmarks == "") {
                //pass
            } else {
                bookmarks.bookmarks = localStorage.taxon_bookmarks.split(",");
                bookmarks.bookmarks.forEach(function(item, index) { // decode uri component
                    let encArray = item.split("="); // encoded array
                    bookmarks.bookmarks[index] = [decodeURIComponent(encArray[0]), decodeURIComponent(encArray[1])];
                });
            }
        }
        return bookmarks.bookmarks;
    },
}

function showBookmarkedTaxa() {
    let html = `<li><em style="cursor: pointer;" onclick="showBookmarkedTaxa();">[Refresh List]</em></li>`;
    let bookmark_list = bookmarks.load();
    for(let i = 0; i < bookmark_list.length; i++) {
        let bookmark = bookmark_list[i];
        html += `<li><a target="_blank" href="index.html#${bookmark[0]}">${bookmark[1]}</a></li>`; // Add bookmark HTML code
    }
    $("#species-list").html(html);
};

var tree; // global

window.onload = function() {
    $("#loading").addClass("closed"); // hide
    showBookmarkedTaxa(); // load bookmarks

    tree = {
        s: { // settings
            line_color: "darkgreen",
            label_color: "lightgreen",
            label_type: "photos",
            background_color: "white",
            block_w: 50,
            block_h: 50,
            line_w: 2,
        },
        v: { // variables
            width: 0,
            photos: []
        },
        c: { // canvas
            elem: document.querySelector("canvas"),
            ctx: document.querySelector("canvas").getContext("2d"),
        },
        generate: function() {
            if(bookmarks.bookmarks.length != 0) {
                $("#loading").removeClass("closed"); // show
                /* Draw loading screen*/
                tree.c.ctx.fillStyle = tree.s.background_color;
                tree.c.ctx.fillRect(0, 0, tree.c.elem.width, tree.c.elem.height);
                tree.c.ctx.fillStyle = tree.s.line_color;
                tree.c.ctx.textAlign = "center";
                tree.c.ctx.font = tree.c.elem.height / 3 + "px sans-serif";
                tree.c.ctx.fillText("Loading...", tree.c.elem.width / 2, tree.c.elem.height / 2, tree.c.elem.width)

                /* Get URL needed */

                let url = `https://api.inaturalist.org/v1/taxa/`;
                let idList = [];
                for(let i = 0; i < bookmarks.bookmarks.length; i++) {
                    idList.push(bookmarks.bookmarks[i][0]);
                }
                url += idList.join(",");

                /* Get data needed */
                $.get(url, function(data, status) {
                    if(status == "success") {

                        console.log(data);

                        /* Get ancestor paths */
                        let paths = [];
                        let names = [];
                        let indexes = [];
                        let results = data.results;

                        let max_ancestry = 0;

                        for(let i = 0; i < results.length; i++) {
                            let ancestry = results[i].ancestry.split("/");
                            if(ancestry.length > max_ancestry) {
                                max_ancestry = ancestry.length;
                            }
                            ancestry.push(results[i].id);
                            paths.push(ancestry);

                            let taxon = results[i];
                            let name = `<i>${taxon.rank}</i> ${taxon.name}`; // first part of name
                            if("preferred_common_name" in taxon) {
                                name += ` (${taxon.preferred_common_name})`; // add common name in brackets
                            }

                            name += ` <a href="index.html#${taxon.id}" target="_blank">(Link)</a>`

                            names.push(name);

                            if("default_photo" in taxon) {
                                if(taxon.default_photo != null) {
                                    tree.v.photos[i] = [taxon.default_photo.square_url, taxon.default_photo.attribution];
                                } else {
                                    tree.v.photos[i] = ["https://webcoder49.github.io/media-and-more/transparent.png", "No Photo"];
                                }
                            }

                            indexes.push(i+1);
                        }

                        /* Create Legend */

                        let legend = ``;
                        for(let i = 0; i < indexes.length; i++) {
                            legend += `<dt>${indexes[i]} <img src="${tree.v.photos[i][0]}" alt="${tree.v.photos[i][1]}" title="${tree.v.photos[i][1]}" height="50" width="50"/></dt><dd>${names[i]} <small><small><small><small><br/>[Photo: ${tree.v.photos[i][1]}]</small></small></small></small></dd><hr/>`
                        }
                        $("#tree_legend").html(legend); // sync legend

                        /* Start Styles */

                        tree.c.elem.width = 8 * bookmarks.bookmarks.length * tree.s.block_w;
                        tree.c.elem.height = (max_ancestry + 5) * tree.s.block_w;
                        
                        tree.c.ctx.fillStyle = tree.s.background_color;
                        tree.c.ctx.fillRect(0, 0, tree.c.elem.width, tree.c.elem.height);

                        tree.c.ctx.strokeStyle = tree.s.line_color;
                        tree.c.ctx.lineCap = "round";
                        tree.c.ctx.lineJoin = "round";
                        tree.c.ctx.lineWidth = tree.s.line_w;
                        tree.c.ctx.fillStyle = tree.s.label_color;
                        tree.c.ctx.font = (tree.s.block_h * 0.75) + "px 'RocknRoll One'";
                        tree.c.ctx.textAlign = "left";


                        /* Start tree */
                        tree.generate_branch(paths, indexes, tree.s.block_w, tree.s.block_h);

                        /* Correct width */
                        let width = tree.v.width + (tree.s.block_w*2) < 500 ? 500 : tree.v.width + (tree.s.block_w*2); // 500px min
                        let tree_data = tree.c.ctx.getImageData(0, 0, width, tree.c.elem.height);
                        tree.c.elem.width = width;
                        tree.c.ctx.putImageData(tree_data, 0, 0);
                    }
                });
                $("#loading").addClass("closed"); // hide
            } else {
                /* Draw loading screen*/
                tree.c.ctx.fillStyle = tree.s.background_color;
                tree.c.ctx.fillRect(0, 0, tree.c.elem.width, tree.c.elem.height);
                tree.c.ctx.fillStyle = tree.s.line_color;
                tree.c.ctx.textAlign = "center";
                tree.c.ctx.font = tree.c.elem.height / 5 + "px 'RocknRoll One'";
                tree.c.ctx.fillText("Please bookmark some taxa to get started. 🦋", tree.c.elem.width / 2, tree.c.elem.height / 2, tree.c.elem.width);
            }
        },
        generate_branch: function(paths, indexes, x, y) { // Recursive
            /* Draw down line */
            
            if(x > tree.v.width) {
                tree.v.width = x
            }

            tree.c.ctx.moveTo(x, y);
            let new_y = y + tree.s.block_h;
            tree.c.ctx.lineTo(x, new_y);
            tree.c.ctx.stroke(); // Draw branch

            for(let i = 0; i < indexes.length; i++) {
                if(paths[i].length == 0) {
                    // Species Marker, delete

                    switch(tree.s.label_type) {
                        case "photos":
                            if(tree.v.photos[indexes[i] - 1][1] == "No Photo") {
                                tree.c.ctx.fillText(indexes[i], x, new_y, tree.s.block_w * 0.75);
                            } else {
                                let marker_img = new Image();
                                marker_img.onload = function() {
                                    tree.c.ctx.drawImage(marker_img, x + (tree.s.block_w * 0.1), y + (tree.s.block_h * 0.1), tree.s.block_w * 0.8, tree.s.block_h * 0.8);
                                };
                                marker_img.src = tree.v.photos[indexes[i] - 1][0];
                            }
                            break;

                        case "numbers":
                            tree.c.ctx.fillText(indexes[i], x, new_y, tree.s.block_w * 0.75);
                            break;
                    }

                    paths.splice(i, i+1);
                    indexes.splice(i, i+1);
                }
            }

            let branches_paths = {};
            let branches_indexes = {};

            /* Save branches */
            for(let i = 0; i < indexes.length; i++) {
                let branch = paths[i][0];
                paths[i].shift(); // Remove first
                /* Add path */
                if(branches_paths["b" + branch] == undefined) {
                    branches_paths["b" + branch] = [paths[i]]; // New array
                } else {
                    branches_paths["b" + branch].push(paths[i]); // Add to existing array
                }
                /* Add index */
                if(branches_indexes["b" + branch] == undefined) {
                    branches_indexes["b" + branch] = [indexes[i]]; // New array
                } else {
                    branches_indexes["b" + branch].push(indexes[i]); // Add to existing array
                }
            }
            let new_x = x;
            if(Object.keys(branches_indexes).length == 1) {
                new_x += tree.generate_branch(branches_paths[Object.keys(branches_paths)[0]], branches_indexes[Object.keys(branches_indexes)[0]], new_x, new_y); // Move to the side when more species
            } else for(branch in branches_indexes) {
                tree.c.ctx.beginPath();
                tree.c.ctx.moveTo(x, new_y);
                tree.c.ctx.lineTo(new_x, new_y);
                tree.c.ctx.stroke();
                new_x += tree.generate_branch(branches_paths[branch], branches_indexes[branch], new_x, new_y); // Move to the side when more species
                new_x += tree.s.block_w;
            }

            return ((new_x - x)); // Horizontal space taken up
        }
    }
}