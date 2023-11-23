const ctx = {
    w: 960,
    h: 500,
    marginTop: 10, 
    marginRight: 30, 
    marginBottom: 80, 
    marginLeft: 80
};

function createViz() {
    let svg = d3.select("#total-cases-line-graph").append("svg")
        .attr("width", ctx.w)
        .attr("height", ctx.h)
        .append("g")
        .attr("transform", `translate(${ctx.marginLeft},${ctx.marginTop})`);
    
    loadData(svg);
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
        const parseDate = d3.timeParse("%Y-%m-%d");
    
        // Combine all files into a single dataset
        const allData = files.flat();

        // Aggregate cases by date
        const aggregatedData = d3.rollups(allData, 
                                        v => d3.sum(v, d => d.cases), 
                                        d => d.date)
                                .map(([date, cases]) => ({date: parseDate(date), cases}));

        // Now you can create the line graph using aggregatedData
        createLineGraph(aggregatedData, svg);

    }).catch(error => {
        // Handle errors here
        console.error('Error loading files: ', error);
    });
}

function createLineGraph(data, svg) {
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

    // Add the line path using aggregatedData
    svg.append("path")
    .datum(aggregatedData) // Use the aggregated data here
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

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

// Aggregate cases by date
function aggregateCases(data) {
    // Use d3.rollup to sum cases by date
    const casesByDate = d3.rollups(data, v => d3.sum(v, leaf => leaf.cases), d => d.date);
    // Sort by date
    casesByDate.sort((a, b) => d3.ascending(a[0], b[0]));
    return casesByDate.map(([date, cases]) => ({ date, cases }));
  }

document.addEventListener("DOMContentLoaded", function () {
    createViz()
  });