window.onload = function() {
    $("#loading").addClass("closed"); // hide
}

function search(e, query) {
    $("#loading").removeClass("closed"); // show
    e.preventDefault();
    $.get("https://api.inaturalist.org/v1/taxa?q=" + query + "&per_page=50", function(data, status) {
        if(status == "success") {
            var html = ``;
            let results = data.results.slice(0, 50);
            if(results.length == 0) {
                html += `<li>[No Results]</li>`;
            }
            results.forEach(function(item) {
                let taxon = item;
                html += `<li><a href="index.html#${taxon.id}">`;
                if("default_photo" in taxon) {
                    if(taxon.default_photo != null) {
                        html += `<img src="${taxon.default_photo.square_url}" alt="${taxon.default_photo.attribution}" title="${taxon.default_photo.attribution}"/>`; // image
                    }
                }
                html += `<i>${taxon.rank}</i> ${taxon.name}`; // first part of link
                if("preferred_common_name" in taxon) {
                    html += ` (${taxon.preferred_common_name})`; // add common name in brackets
                }
                html += "</a></li>";
            });
            $("#results").html(html);
            $("#loading").addClass("closed"); // hide
            document.title = "'" + query + "' Search (" + results.length + " results) - Tree of Life";
        }
    });
}