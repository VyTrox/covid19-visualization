const svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    hotspots = d3.map(),
    path = d3.geoPath();

let colorCases = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range(["#F2DF91", "#F9C467", "#FFA83D", "#FF8B23", "#FC6A0C", "#F04F09", "#D8382E", "#AF1B43", "#8a1739"]);

let colorDeaths = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range(["#ffcccb", "#ff8080", "#ff3333", "#ff0000", "#cc0000", "#990000", "#660000", "#330000"]);

let colorVaccinations = d3.scaleThreshold()
    .domain(d3.range(2,10)) // Creates a domain at every 10% interval from 10% to 90%
    .range([
        "#cce5ff", // Lightest blue
        "#99ccff",
        "#66b2ff",
        "#3399ff",
        "#0080ff",
        "#0066cc",
        "#004c99",
        "#003366",
        "#001933"  // Darkest blue
    ]);

    let colorHospitalized = d3.scaleThreshold()
    .domain(d3.range(2, 10))
    .range([
        "#fffacd", // Lemon chiffon (lightest yellow)
        "#fff8dc", // Cornsilk
        "#ffefd5", // Papaya whip
        "#ffebcd", // Blanched almond
        "#ffe4b5", // Moccasin
        "#ffdab9", // Peach puff
        "#ffe4c4", // Bisque
        "#ffd700", // Gold (darkest yellow)
    ]);


let color = colorCases; // Default color scale



// Attach event listeners to the images
d3.select("#cases-btn").on("click", function() { updateMap('cases'); });
d3.select("#deaths-btn").on("click", function() { updateMap('deaths'); });
d3.select("#vaccinations-btn").on("click", function() { updateMap('vaccinations'); });
d3.select("#hospitalized-btn").on("click", function() { updateMap('hospitalized'); });

let currentDataType = 'cases'; 

// Call the default map type on page load
updateMap('cases'); // Or 'deaths', depending on which you want to show first




// Function to update the map based on the data type
function updateMap(dataType) {
    // Update the global variable
    currentDataType = dataType;
    // Clear the current map
    svg.selectAll(".counties").remove();
    svg.selectAll(".states").remove();
    svg.selectAll(".state-labels").remove();

    // Change the color scale based on the data type
    if(dataType === 'cases') {
        color = colorCases;}
    else if(dataType === 'deaths') {
        color = colorDeaths;}
    else if(dataType === 'vaccinations') {
        color = colorVaccinations;}
    else if(dataType === 'hospitalized') {
        color = colorHospitalized;}




    if (dataType === 'cases') {
    d3.queue()
    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
    .defer(d3.csv, "./data/us-counties-2023.csv", function(d) {
        hotspots.set(d.fips, +d.cases / 10000);
    })
    .await(ready);}

    else if (dataType === 'deaths') {
    d3.queue()
    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
    .defer(d3.csv, "./data/us-counties-2023.csv", function(d) {
        //console.log(d.fips, "111",+d.Completeness_pct);
        hotspots.set(d.fips, +d.deaths / 100);
        //console.log(hotspots);
    })
    .await(ready);}

    else if (dataType === 'vaccinations') {
    d3.queue()
    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
    .defer(d3.csv, "./data/COVID-19_Vaccinations_in_the_United_States_County.csv", function(d) {
        //console.log(d.FIPS, "111",+d.Completeness_pct);
        hotspots.set(d.FIPS, +d.Completeness_pct/10);
        //console.log(d.Completeness_pct);
        //console.log(hotspots);
    })
    .await(ready);}

    else if (dataType === 'hospitalized') {
        d3.queue()
          .defer(d3.json, "https://d3js.org/us-10m.v1.json")
          .defer(d3.csv, "./data/COVID-19_Reported_Patient_Impact_and_Hospital_Capacity_by_State__RAW_.csv")
          .await(function(error, us, hospitalData) {
            if (error) throw error;
      
            // Create a map for state abbreviation to hospital onset covid
            const hospitalOnsetMap = new Map(hospitalData.map(d => [d.state, +d.hospital_onset_covid]));
      
            // Create a map for county FIPS to state FIPS
            const countyToStateMap = new Map();
            topojson.feature(us, us.objects.counties).features.forEach(feature => {
              const stateFips = feature.id.substring(0, 2);
              countyToStateMap.set(feature.id, stateFips);
            });
      
            // Apply the state-level hospital onset data to each county
            countyToStateMap.forEach((stateFips, countyFips) => {
              const stateAbbrev = stateFipsToName_HOSPITAL[stateFips]; // Convert FIPS to state abbrev
              const hospitalOnset = hospitalOnsetMap.get(stateAbbrev);
              console.log(countyFips,hospitalOnset);
              hotspots.set(countyFips, hospitalOnset);
            });
      
            // Now plot the counties with the new data
            plotCounties(us);
            // Rest of the plotting functions...
            plotStates(us);
            plotStateLabels(us);
            plotLegend();
            
          });
      }

}

function plotLegend() {
    svg.select(".caption").remove(); // Add this line to remove the existing text


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

    if (currentDataType === 'cases') {
        var legendText = "AVERAGE DAILY CASES PER 10,000 PERSONS IN 2023";
    }
    else if (currentDataType === 'deaths') {
        var legendText = "AVERAGE DAILY DEATHS PER 100 PERSONS IN 2023";
    }
    else if (currentDataType === 'vaccinations') {
        var legendText = "VACCINATION COMPLETENESS PER 10,000 PERSONS IN 2023";
    }
    else if (currentDataType === 'hospitalized') {
        var legendText = "HOSPITAL ONSET COVID IN 2023";
    }
  
    g.append("text")
        .attr("font-family", "Arial")
        .attr("class", "caption")
        .attr("x", x.range()[0])
        .attr("y", -6)
        .attr("fill", "#000")
        .attr("text-anchor", "start")
        .attr("font-weight", "bold")
        .text(legendText);

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
            return value == null ? "#ECEBE3" : color(value); 
        })
        .attr("d", path)
        .append("title")
        .text(function(d) {
            var value = hotspots.get(d.id);
            //console.log(value);
            if (value != null) {
                if (currentDataType === 'cases') {
                    return value + " cases";
                }
                else if (currentDataType === 'deaths') {
                    return value + " deaths";
                }
                else if (currentDataType === 'vaccinations') {
                    return 10*value + " % vaccinations";
                }
                else if (currentDataType === 'hospitalized') {
                    return  value + " covid hospitals";
                }
            } else {
                return "No data";
            }
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


function ready(error, us, countyData) {
    if (error) throw error;

    plotCounties(us, countyData);
    plotStates(us);
    plotStateLabels(us);
    plotLegend(countyData);
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

const stateFipsToName_HOSPITAL = {
    "01": "AL", "02": "AK", "04": "AR",
    "05": "AS", "06": "CA", "08": "CO",
    "09": "CT", "10": "DE", "11": "DC",
    "12": "FL", "13": "GA", "15": "HI", "16": "ID",
    "17": "IL", "18": "IN", "19": "IA", "20": "KS",
    "21": "KY", "22": "LA", "23": "MA", "24": "MD",
    "25": "MT", "26": "MN", "27": "ME", "28": "MI",
    "29": "MS", "30": "MO", "31": "NE", "32": "NV",
    "33": "NH", "34": "NJ", "35": "NM", "36": "NY", 
    "37": "NC", "38": "ND", "39": "OH", "40": "OH", "41": "OR", "42": "PA",
    "44": "RI", "45": "SC", "46": "SD",
    "47": "TN", "48": "TX", "49": "UT", "50": "VT",
    "51": "VI", "53": "WA", "54": "WV",
    "55": "WI", "56": "WY"
};


function getStateName(fips) {
    return stateFipsToName[fips] || '';
}


// Reverse the stateFipsToName to get state abbreviation to FIPS mapping
const stateAbbrevToFips = Object.fromEntries(
    Object.entries(stateFipsToName_HOSPITAL).map(([fips, abbrev]) => [abbrev, fips])
  );

const stateFipsToALLName = {
    "01": "Alabama", "02": "Alaska", "04": "Arizona",
    "05": "Arkansas", "06": "California", "08": "Colorado",
    "09": "Connecticut", "10": "Delaware", "11": "District of Columbia",
    "12": "Florida", "13": "Georgia", "15": "Hawaii", "16": "Idaho",
    "17": "Illinois", "18": "Indiana", "19": "Iowa", "20": "Kansas",
    "21": "Kentucky", "22": "Louisiana", "23": "Maine", "24": "Maryland",
    "25": "Massachusetts", "26": "Michigan", "27": "Minnesota", "28": "Mississippi",
    "29": "Missouri", "30": "Montana", "31": "Nebraska", "32": "Nevada",
    "33": "New Hampshire", "34": "New Jersey", "35": "New Mexico", "36": "New York", 
    "37": "North Carolina", "38": "North Dakota", "39": "Ohio", "40": "Oklahoma", "41": "Oregon", "42": "Pennsylvania",
    "44": "Rhode Island", "45": "South Carolina", "46": "South Dakota",
    "47": "Tennessee", "48": "Texas", "49": "Utah", "50": "Vermont",
    "51": "Virginia", "53": "Washington", "54": "West Virginia",
    "55": "Wisconsin", "56": "Wyoming"
};
