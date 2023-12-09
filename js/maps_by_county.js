const svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    hotspots = d3.map(),
    path = d3.geoPath();

const color = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range(["#F2DF91", "#F9C467", "#FFA83D", "#FF8B23", "#FC6A0C", "#F04F09", "#D8382E", "#AF1B43", "#8a1739"]); // #701447, #4B0E3E
    // .range(colorRange);

loadData();

function loadData() {
d3.queue()
    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
    .defer(d3.csv, "./data/us-counties-2023.csv", function(d) {
        hotspots.set(d.fips, +d.cases / 10000);
    })
    .await(ready);
}


function plotLegend() {
    var x = d3.scaleLinear()
    .domain([1, 10])
    .rangeRound([600, 860]);

    // Position of legends
    var g = svg.append("g")
        .attr("class", "key")
        .attr("transform", "translate(-550,100)");

    g.selectAll("rect")
    .data(color.range().map(function(d) {
        d = color.invertExtent(d);
        if (d[0] == null) d[0] = x.domain()[0];
        if (d[1] == null) d[1] = x.domain()[1];
        return d;
        }))
    .enter().append("rect")
        .attr("height", 8)
        .attr("x", function(d) { return x(d[0]); })
        .attr("width", function(d) { return x(d[1]) - x(d[0]); })
        .attr("fill", function(d) { return color(d[0]); });

    g.append("text")
        .attr("font-family", "Arial")
        .attr("class", "caption")
        .attr("x", x.range()[0])
        .attr("y", -6)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text("AVERAGE DAILY CASES PER 10,000 PEOPLE IN 2023");

    g.call(d3.axisBottom(x)
        .tickSize(13)
        .tickFormat(function(x, i) { return i ? x : x; })
        .tickValues(color.domain()))
        .select(".domain")
        .remove();
}

function plotCounties(us) {
    svg.append("g")
        .attr("class", "counties")
        .attr("transform", "translate(0, 150)")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.counties).features)
        .enter().append("path")
        .attr("fill", function(d) { 
            var value = hotspots.get(d.id);
            if (value) { // If there's a value, use the color scale
                return value == null ? "#ECEBE3" : color(value); // Values below 1 are lightgrey
            } else {
                return "#ECEBE3"; // No data available
            }
        })
        .attr("d", path)
        .append("title")
        .text(function(d) { 
            var value = hotspots.get(d.id);
            return value ? value + " cases" : "No data"; 
        });
}

function plotStates(us) {
    svg.append("path")
    .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
    .attr("class", "states")
    .attr("transform", "translate(0, 150)")
    .attr("d", path);
}

function plotStateLabels(us) {
    svg.append("g")
        .attr("class", "state-labels")
        .attr("transform", "translate(0, 150)")
        .selectAll("text")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("text")
        .attr("transform", function(d) {
            return "translate(" + path.centroid(d) + ")";
        })
        .attr("dy", "0.35em")
        .attr("class", "state-name")
        .attr("font-family", "Arial")
        .attr("font-size", "10px") // Adjust font size based on your map's scale
        .attr("text-anchor", "middle")
        .attr("fill", "black") // Choose a fill color that stands out, e.g., white or black
        .style("text-shadow", "1px 1px 0px #fff, -1px -1px 0px #fff, 1px -1px 0px #fff, -1px 1px 0px #fff") // Optional: Add a text shadow for better legibility
        .text(function(d) {
            return getStateName(d.id); // Use the state abbreviation from your mapping
        });
}


function ready(error, us) {
    if (error) throw error;
    plotCounties(us);
    plotStates(us);
    plotStateLabels(us);
    plotLegend();
}

// Function to get state name from FIPS
function getStateName(fips) {
    return stateFipsToName[fips] || '';
}

const stateFipsToName = {
    "01": "Ala.", "02": "Alaska", "04": "Ariz.",
    "05": "Ark.", "06": "Calif.", "08": "Colo.",
    "09": "Conn.", "10": "Del.", "11": "D.C.",
    "12": "Fla.", "13": "Ga.", "15": "Hawaii", "16": "Idaho",
    "17": "Ill.", "18": "Ind.", "19": "Iowa", "20": "Kan.",
    "21": "Ky.", "22": "La.", "23": "Maine", "24": "Md.",
    "25": "Mass.", "26": "Mich.", "27": "Minn.", "28": "Miss.",
    "29": "Mo.", "30": "Mont.", "31": "Neb.", "32": "Nev.",
    "33": "N.H.", "34": "N.J.", "35": "N.M.", "36": "N.Y.", 
    "37": "N.C.", "38": "N.D.", "39": "Ohio", "40": "Okla.", 
    "41": "Ore.", "42": "Pa.", "44": "R.I.", "45": "S.C.", 
    "46": "S.D.","47": "Tenn.", "48": "Texas", "49": "Utah", "50": "Vt.",
    "51": "Va.", "53": "Wash.", "54": "W.Va.", "55": "Wis.", "56": "Wyo."
};


// const stateFipsToName = {
//     "01": "Alabama", "02": "Alaska", "04": "Arizona",
//     "05": "Arkansas", "06": "California", "08": "Colorado",
//     "09": "Connecticut", "10": "Delaware", "11": "District of Columbia",
//     "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho",
//     "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
//     "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
//     "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
//     "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
//     "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York", 
//     "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania",
//     "44": "Rhode Island", "45": "South Carolina", "46": "South Dakota",
//     "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont",
//     "51": "Virginia", "53": "Washington", "54": "West Virginia",
//     "55": "Wisconsin", "56": "Wyoming"
// };
