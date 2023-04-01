var currentId;
var currentName;

window.onload = function() {
    bookmarks.load();

    currentId = 48460; // Life
    if(window.location.hash != "" && window.location.hash != "#") {
        currentId = parseInt(window.location.hash.substr(1)); // exclude #
    }
    getTaxon(currentId, loadTaxon);

    $("#loading").addClass("closed"); // hide
}

function getTaxon(id, then) {
    try {
        if(parseInt(id) >= 0) {
            $("#loading").removeClass("closed"); // show
            $.get("https://api.inaturalist.org/v1/taxa/" + id, function(data, status) {
                if(status == "success") {
                    console.log(data);
                    then(data);
                    $("#loading").addClass("closed"); // hide
                } else {
                    document.querySelector("main").innerHTML = "<p class='error'>Could not <code>GET</code> taxon data from iNaturalist. Please make sure you have an internet connection, and this taxon exists.</p>";
                }
            });
        }
    } catch (err) {
        document.querySelector("main").innerHTML = "<p class='error'>Could not <code>GET</code> taxon data from iNaturalist. Please make sure you have an internet connection, and this taxon exists.</p>";
    }
}

function loadTaxon(data) {
    let html = ``;
    let taxon = data.results[0];

    html += `<h1><i>${taxon.rank}</i> ${taxon.name}`; // first part of header
    if("preferred_common_name" in taxon) {
        html += ` (${taxon.preferred_common_name})`; // add common name in brackets
    }
    if("conservation_status" in taxon) {
        if(taxon.conservation_status != null) {
            html += ` <sup><small><small><small><b class="conservation_status" title="Conservation Status${taxon.conservation_status.authority != "" ? " provided by " + taxon.conservation_status.authority : ""}">${taxon.conservation_status.status}</b></small></small></small></sup>`;
        }
    }
    html += `</h1>`; // end header

    html += `<h2>Taxonomy</h2>`;

    /* Ancestors */
    if("ancestors" in taxon) {
        html += `<h3>Ancestors: </h3><p>`;
        html += `<a href="javascript:(function() {getTaxon(48460, loadTaxon);})()">Life</a> > `
        taxon.ancestors.forEach(function(item) {
            let tax = item;
            html += `<a href="javascript:(function() {getTaxon(${tax.id}, loadTaxon);})()"> ${tax.name}`; // first part of name
            if("preferred_common_name" in tax) {
                html += ` (${tax.preferred_common_name})`; // add common name in brackets
            }
            html += `</a> > `
        });
        html += `${taxon.name}</p>`;
    }

    /* Children */

    if("children" in taxon) {
        html += `<h3>Children: </h3><ul>`;
        if(taxon.children.length == 0) {
            html += `<li>[None]</li>`
        }
        taxon.children.forEach(function(item) {
            let tax = item;
            html += `<li><a href="javascript:(function() {getTaxon(${tax.id}, loadTaxon);})()">`;
            if("default_photo" in tax) {
                if(tax.default_photo != null) {
                    html += `<img src="${tax.default_photo.square_url}" title="${tax.default_photo.attribution}" alt="${tax.default_photo.attribution}"/>`;
                }
            }
            html += `${tax.name}`; // first part of name
            if("preferred_common_name" in tax) {
                html += ` (${tax.preferred_common_name})`; // add common name in brackets
            }
            html += `</a> </li>`
        });
        html += `</ul>`;
    }

    /* Statistics */

    html += `<h2>Statistics</h2><ul>`;

    if("observations_count" in taxon) {
        html += `<li><b>${taxon.observations_count}</b> observations on <a href="https://www.inaturalist.org/taxa/${taxon.id}" target="_blank">iNaturalist.org</a></li>`;
    }
    if("extinct" in taxon) {
        if(taxon.extinct) {
            html += `<li>This ${taxon.rank} is <b>extinct</b>.</li>`;
        }
    }
    if("conservation_status" in taxon) {
        if(taxon.conservation_status != null) {
            if(!taxon.extinct) {
                html += `<li>Conservation Status: <b class="conservation_status">${taxon.conservation_status.status}</b> (from <a href="${taxon.conservation_status.url}" target="_blank">${taxon.conservation_status.authority}</a>)</li>`;
            }
        }
    }

    html += `</ul>`

    /* Details */
    html += `<h2>Details</h2>`;
    if("wikipedia_summary" in taxon) {
        if(taxon.wikipedia_summary) {
            html += `<p><b>From Wikipedia:</b><br/><blockquote cite="${taxon.wikipedia_url}">${taxon.wikipedia_summary}<br/><a href="${taxon.wikipedia_url}" target="_blank">Read more on Wikipedia</a></blockquote></p>`;
        }
    }

    if("default_photo" in taxon) {
        if(taxon.default_photo != null) {
            let photo = taxon.default_photo;
            html += `<p><img src="${photo.medium_url}" alt="Photo of ${taxon.name}; ${photo.attribution}"/><br/><em>${photo.attribution}</em></p>`;
        }
    }

    $("main").html(html);

    currentId = taxon.id;
    let name = `${taxon.rank} ${taxon.name}`; // first part of name
    let short_name = taxon.name;
    if("preferred_common_name" in taxon) {
        name += ` (${taxon.preferred_common_name})`; // add common name in brackets
        short_name = taxon.preferred_common_name;
    }
    currentName = name; // save name
    window.location.hash = "#" + taxon.id;
    document.title = short_name + " - Tree of Life";

    bookmarks.refreshButton(); // Refresh button
}

var bookmarks = {
    bookmarks: [],
    tempBookmarks: [],
    create: function() {
        let id = currentId;
        let name = currentName;
        if(!bookmarks.isBookmarked(id)) { // If is not already bookmarked
            bookmarks.bookmarks.push([id, name]);
            bookmarks.save(); // Save to localStorage
            bookmarks.load(); // Refresh View
            bookmarks.refreshButton(); // Refresh button
        }
    },
    remove: function() {
        let id = currentId
        for(let i = 0; i < bookmarks.bookmarks.length; i++) {
            if(bookmarks.bookmarks[i][0] == id) {
                bookmarks.bookmarks.splice(i, 1);
            }
        }
        bookmarks.save(); // Save to localStorage
        bookmarks.load(); // Refresh View
        bookmarks.refreshButton(); // Refresh button
    },
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
                console.log("l153", bookmarks.bookmarks, bookmarks.tempBookmarks, localStorage.taxon_bookmarks);
            }
        }
        bookmarks.show();
    },
    save: function() {
        if(bookmarks.bookmarks.length > 0) {
            bookmarks.tempBookmarks = bookmarks.bookmarks;
            bookmarks.tempBookmarks.forEach(function(item, index) { // encode uri component
                let encArray = [encodeURIComponent(item[0]), encodeURIComponent(item[1])];
                bookmarks.tempBookmarks[index] = encArray.join("="); // to text
            });
            localStorage.taxon_bookmarks = bookmarks.tempBookmarks.join(",");
            console.log(bookmarks.bookmarks, bookmarks.tempBookmarks);
        } else {
            if(bookmarks.bookmarks.length == 0) {
                localStorage.taxon_bookmarks = "";
                console.log("l0", bookmarks.bookmarks, bookmarks.tempBookmarks);
            }
        }
    },
    show: function() {
        if(bookmarks.bookmarks.length > 0) {
            $("#bookmarks").html(`<option value="-1">Go To Bookmark...</option>`);
            bookmarks.bookmarks.forEach(function(item) {
                $("#bookmarks").append(`<option value="${item[0]}">${item[1]}</option>`);
            });
        } else {
            $("#bookmarks").html(`<option value="-1">Go To Bookmark...</option>
            <option value="-2" disabled>Bookmark your current location</option>
            <option value="-2" disabled>using the button to the left</option>`);
        }
    },
    isBookmarked: function(id) {
        for(let i = 0; i < bookmarks.bookmarks.length; i++) {
            if(bookmarks.bookmarks[i][0] == id) return true; // bookmarked
        }
        return false; // not bookmarked
    },
    refreshButton: function() {
        if(bookmarks.isBookmarked(currentId)) {
            $("#bookmarkButton").html("Remove Bookmark");
            $("#bookmarkButton").click(function() {
                setTimeout(bookmarks.remove, 100);
            });
        } else {
            $("#bookmarkButton").html("Save Bookmark");
            $("#bookmarkButton").click(function() {
                setTimeout(bookmarks.create, 100);
            });
        }
    }
}