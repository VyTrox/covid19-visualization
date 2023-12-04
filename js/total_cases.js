const ctx = {
    w: 960,
    h: 500,
    marginTop: 10, 
    marginRight: 30, 
    marginBottom: 80, 
    marginLeft: 80
};

let cumulativeData = null;
let dailyNewData = null;
let showingCumulative = true;

// Event listeners
document.addEventListener("DOMContentLoaded", function () {
    // createViz();
    loadData();
});

// Event listener for the toggle button
document.getElementById("toggleButton").addEventListener("click", function () {
    showingCumulative = !showingCumulative;

    // Update the title based on the current state
    if (showingCumulative) {
        document.getElementById("total-cases-title").textContent = "Cumulative Total Reported Cases";
    } else {
        document.getElementById("total-cases-title").textContent = "Daily New Reported Cases";
    }

    createViz();
});


function createViz() {
    // Clear any existing SVG content
    d3.select("#total-cases-line-graph").selectAll("*").remove();

    let svg = d3.select("#total-cases-line-graph").append("svg")
        .attr("width", ctx.w)
        .attr("height", ctx.h)
        .append("g")
        .attr("transform", `translate(${ctx.marginLeft},${ctx.marginTop})`);
    
    // loadData(svg);
    let data = showingCumulative ? cumulativeData : dailyNewData;
    createLineGraph(data, svg);
}

function loadData(svg) {
    // Define file paths for each CSV file
    const filepaths = [
        'data/us-counties-2020.csv',
        'data/us-counties-2021.csv',
        'data/us-counties-2022.csv',
        'data/us-counties-2023.csv'
    ];
    
    // Create a promise for each file and use d3.csv to fetch it
    const promises = filepaths.map(path => d3.csv(path));
    
    // Use Promise.all to execute all promises and then process the data
    Promise.all(promises).then(files => {
        // Process and cache data
        processData(files.flat());
        createViz(); // Initial creation with cumulative data

    }).catch(error => {
        // Handle errors here
        console.error('Error loading files: ', error);
    });
}


function processData(allData) {
    const parseDate = d3.timeParse("%Y-%m-%d");

    // Process cumulative data
    cumulativeData = d3.rollups(allData, 
                                v => d3.sum(v, d => +d.cases), 
                                d => d.date)
                       .map(([date, cases]) => ({date: parseDate(date), cases}));

    // Process daily data
    dailyNewData = convertToDailyCases(cumulativeData);
}


function createLineGraph(data, svg) {
    // Clear previous graph elements but keep the SVG container
    svg.selectAll("*").remove();

    width = ctx.w - ctx.marginLeft - ctx.marginRight;
    height = ctx.h - ctx.marginTop - ctx.marginBottom;

    const aggregatedData = aggregateCases(data);

    // Create scales
    const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, width]);
    const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.cases)])
    .range([height, 0]);

    // Define the x-axis with a custom tick format
    const xAxis = d3.axisBottom(x)
    .tickFormat(d3.timeFormat("%b %Y")) // Format like "Feb 2020"
    .ticks(d3.timeMonth.every(1)); // Ensure we get a tick every month

    // Add X axis
    svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(xAxis)
    .selectAll("text") // select all the text elements for the xaxis
    .style("text-anchor", "end")
    .attr("dx", "-.8em")
    .attr("dy", ".15em")
    .attr("transform", "rotate(-65)"); // rotate the text

    // Add Y axis
    const yAxis = svg.append("g")
       .call(d3.axisLeft(y));

    // Add horizontal dotted lines for each y-axis tick
    yAxis.selectAll(".tick")
         .append("line")
         .classed("grid-line", true) // Add a class for styling, if needed
         .attr("x1", 0)
         .attr("x2", width)
         .attr("y1", 0)
         .attr("y2", 0)
         .attr("stroke", "lightgrey")
         .attr("stroke-dasharray", "3,3"); // Style for dotted line
    
    // Add Y axis label
    svg.append("text")
       .attr("transform", "rotate(-90)")
       .attr("y", 0 - ctx.marginLeft)
       .attr("x", 0 - (height / 2))
       .attr("dy", "1em")
       .style("text-anchor", "middle")
       .text("Number of Cases");

    // Define the line
    const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.cases))
    .curve(d3.curveMonotoneX); // This will make the line smooth

    // // Add the line path using aggregatedData
    // svg.append("path")
    // .datum(aggregatedData) // Use the aggregated data here
    // .attr("fill", "none")
    // .attr("stroke", "steelblue")
    // .attr("stroke-width", 2)
    // .attr("d", line);

    // Update the line path
    const linePath = svg.selectAll(".line-path")
        .data([aggregatedData]);

    linePath.enter()
        .append("path")
        .attr("class", "line-path")
        .merge(linePath)
        .transition()
        .duration(750)
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2);

    // Optionally, add an area beneath the line
    const area = d3.area()
    .x(d => x(d.date))
    .y0(height)
    .y1(d => y(d.cases))
    .curve(d3.curveMonotoneX);

    svg.append("path")
    .datum(data)
    .attr("fill", "steelblue")
    .attr("opacity", 0.3)
    .attr("d", area);

    // Update the area path
    const areaPath = svg.selectAll(".area-path")
        .data([aggregatedData]);

    areaPath.enter()
        .append("path")
        .attr("class", "area-path")
        .merge(areaPath)
        .transition()
        .duration(750)
        .attr("d", area)
        .attr("fill", "steelblue")
        .attr("opacity", 0.3);

    // Create a tooltip as a div
    const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("pointer-events", "none")
    .style("background-color", "white")
    .style("border", "solid 1px black")
    .style("padding", "10px")
    .style("border-radius", "5px")
    .style("font-size", "14px")
    .style("color", "black");

    // Create transparent rectangle
    svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .style("fill", "none")
    .style("pointer-events", "all")
    .on("mousemove", mousemove)
    .on("mouseout", function() {
        focusLine.style("opacity", 0);
        focusCircle.style("opacity", 0);
        tooltip.style("opacity", 0);
    });


    const focusLine = svg.append("line")
        .style("stroke", "lightgrey")
        .style("stroke-dasharray", "3,3")
        .style("opacity", 0)
        .attr("y1", 0)
        .attr("y2", height);

    const focusCircle = svg.append("circle")
        .style("fill", "steelblue")
        .style("stroke", "none")
        .attr("r", 4)
        .style("opacity", 0);



    const bisectDate = d3.bisector(function(d) { return d.date; }).left;

    function mousemove(event) {
        const x0 = x.invert(d3.pointer(event, this)[0]),
            i = bisectDate(data, x0, 1),
            d0 = data[i - 1],
            d1 = data[i],
            d = x0 - d0.date > d1.date - x0 ? d1 : d0;

        focusCircle
            .attr("cx", x(d.date))
            .attr("cy", y(d.cases))
            .style("opacity", 1);

        focusLine
            .attr("x1", x(d.date))
            .attr("x2", x(d.date))
            .style("opacity", 1);

        tooltip
            .html("Date: " + d3.timeFormat("%b %d, %Y")(d.date) + "<br/>Cases: " + d3.format(",")(d.cases))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px")
            .style("opacity", 1);
    }

}


// Function to convert cumulative data to daily new cases
function convertToDailyCases(data) {
    let daily = [];
    for (let i = 1; i < data.length; i++) {
        let dailyCases = data[i].cases - data[i - 1].cases;
        daily.push({ date: data[i].date, cases: dailyCases });
    }
    return daily;
}


// Aggregate cases by date
function aggregateCases(data) {
    // Use d3.rollup to sum cases by date
    const casesByDate = d3.rollups(data, v => d3.sum(v, leaf => leaf.cases), d => d.date);
    // Sort by date
    casesByDate.sort((a, b) => d3.ascending(a[0], b[0]));
    return casesByDate.map(([date, cases]) => ({ date, cases }));
}