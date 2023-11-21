async function updatechart(timeframe) {
  // First, remove the existing chart if it exists
  const chart = d3.select("#chart svg");
  if (!chart.empty()) {
    chart.remove();
  }
  const tooltip_test = d3.select(".tooltip");
  if (!tooltip_test.empty()) {
    tooltip_test.remove();
  }
  const dataPath = `data/${timeframe}_data.csv`;

  const data = await d3.csv(dataPath);

  // Parse the date and convert numeric values
  data.forEach(d => {
    d.date = d3.timeParse("%Y-%m-%d")(d.date);
    d.under_18 = +d.under_18;
    d["18_29"] = +d["18_29"];
    d["30_49"] = +d["30_49"];
    d["50_59"] = +d["50_59"];
    d["60_69"] = +d["60_69"];
    d["70_79"] = +d["70_79"];
    d["80_plus"] = +d["80_plus"];
  });

  // Define dimensions, margins and tooltip
  const margin = { top: 20, right: 30, bottom: 30, left: 50 },
    width = 800 - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;
  const tooltip = d3.select("body").append("div").attr("class", "tooltip");

  // Create SVG element
  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define scales
  const x = d3.scaleTime().domain(d3.extent(data, d => d.date)).range([0, width]);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => Math.max(d.under_18, d["18_29"], d["30_49"], d["50_59"], d["60_69"], d["70_79"], d["80_plus"]))]).range([height, 0]);

  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("path.domain, g.tick line") // Select the domain and tick lines
    .attr("stroke", "gray") // Set the color to gray
  // .remove(); // Remove the end lines

  // Add Y axis and style it
  svg.append("g")
    .call(d3.axisLeft(y))
    .selectAll("path.domain, g.tick line") // Select the domain and tick lines
    .attr("stroke", "gray") // Set the color to gray
  // .remove(); // Remove the end lines

  // Style the text (ticks) on the axes
  svg.selectAll(".tick text")
    .attr("fill", "gray"); // Set the color of tick texts to gray
  // Define line generator
  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  // Define the labels for the age groups as you want them to appear
  const ageGroupLabels = {
    "under_18": "<18",
    "18_29": "18-29",
    "30_49": "30-49",
    "50_59": "50-59",
    "60_69": "60-69",
    "70_79": "70-79",
    "80_plus": "80+"
  };
  // Colors for each age group
  const color = d3.scaleOrdinal()
    .domain(Object.keys(ageGroupLabels))
    .range(d3.schemePaired);

  // Process data for line generation using the new age group labels
  const ageGroups = color.domain();
  const linesData = ageGroups.map(group => {
    return {
      name: group,
      values: data.map(d => ({ date: d.date, value: d[group] }))
    };
  });

  // Add lines
  linesData.forEach(group => {
    svg.append("path")
      .datum(group.values)
      .attr("fill", "none")
      .attr("stroke", color(group.name))
      .attr("stroke-width", 1.5)
      .attr("d", line);
  });
  // Add a vertical line that will follow the mouse
  const verticalLine = svg.append("line")
    .attr("opacity", 0)
    .attr("stroke", "black")
    .attr("stroke-width", 1)
    .attr("pointer-events", "none");

  // Add circles at intersections for each age group line
  const intersectingCircles = svg.selectAll(".circle")
    .data(color.domain())
    .enter().append("circle")
    .attr("fill", d => color(d))
    .attr("r", 4)
    .attr("opacity", 0)
    .attr("pointer-events", "none");

  // Mousemove event to update the vertical line and circles
  svg.append("rect")
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", (event) => {
      const mouseDate = x.invert(d3.pointer(event)[0]);
      const index = d3.bisector(d => d.date).left(data, mouseDate, 1);
      const date = data[index - 1].date;
      const xPos = x(date);

      // Calculate min and max data values for the hovered date
      let valuesOnDate = color.domain().map(group => data[index - 1][group]);
      let minY = y(d3.min(valuesOnDate));
      let maxY = y(d3.max(valuesOnDate));

      // Update vertical line to span min to max data points
      verticalLine.attr("x1", xPos)
        .attr("x2", xPos)
        .attr("y1", maxY)
        .attr("y2", minY)
        .attr("opacity", 0.3);

      // Update intersecting circles
      intersectingCircles.attr("cx", xPos)
        .attr("cy", d => y(data[index - 1][d]))
        .attr("opacity", 1);

      // Update tooltip
      tooltip.transition().duration(100).style("opacity", 1);
      // Calculate tooltip position with a fixed size in mind
      let tooltipX = event.pageX + 10;
      let tooltipY = event.pageY + 10;
      // Ensure tooltip does not go off the right edge of the screen
      if (tooltipX + 200 > window.innerWidth) {
        tooltipX = event.pageX - 210; // Adjust the tooltip position to the left of the cursor
      }

      // Ensure tooltip does not go off the bottom edge of the screen
      if (tooltipY + 200 > window.innerHeight) {
        tooltipY = event.pageY - 210; // Adjust the tooltip position above the cursor
      }

      const tooltipHtml = `
  <div class="tooltip-date">${d3.timeFormat("%B %d, %Y")(date)}</div>
  ${ageGroups.map(group => {
        return `
      <div class="tooltip-content">
        <span class="tooltip-swatch" style="background-color: ${color(group)};"></span>
        <span class="tooltip-text">${ageGroupLabels[group]}</span>
        <span class="tooltip-value">${data[index - 1][group]}</span>
      </div>
    `;
      }).join('')}
`;
      tooltip.html(tooltipHtml)
        .style("left", tooltipX + "px")
        .style("top", tooltipY + "px");
    });

  // Legend and other components...

  // Add legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width}, 0)`); // Adjust to move to the right side

  color.domain().forEach((group, i) => {
    const legendItem = legend.append("g")
      .attr("class", "legend-item")
      .attr("transform", `translate(-${(color.domain().length - i) * 80}, 0)`); // Adjust for proper positioning

    legendItem.append("rect")
      .attr("class", "legend-rect")
      .attr("width", 20)
      .attr("height", 10)
      .attr("fill", color(group));

    legendItem.append("text")
      .attr("x", 25)
      .attr("y", 9)
      .text(ageGroupLabels[group]);
  });
  // Define the admissions values for the reference lines
  let level1, level2, level3;
  if (timeframe === "monthly") {
    level1 = 800000;
    level2 = 100000;
    level3 = 200000;
  } else if (timeframe === "weekly") {
    level1 = 50000;
    level2 = 30000;
    level3 = 10000;
  } else {
    level1 = 20000;
    level2 = 10000;
    level3 = 5000;
  }
  // Add level1 weekly admissions reference line
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(level1))
    .attr("x2", width)
    .attr("y2", y(level1))
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5"); // Makes the line dashed

  // Add text label for 3000 weekly admissions line
  svg.append("text")
    .attr("x", width)
    .attr("y", y(level1) - 5)
    .attr("fill", "gray")
    .attr("text-anchor", "end")
    .text(`${level1.toLocaleString()} ${timeframe} admissions`);

  // Add 1000 weekly admissions reference line
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(level2))
    .attr("x2", width)
    .attr("y2", y(level2))
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5"); // Makes the line dashed

  // Add text label for 1000 weekly admissions line
  svg.append("text")
    .attr("x", width)
    .attr("y", y(level2) - 5)
    .attr("fill", "gray")
    .attr("text-anchor", "end")
    .text(`${level2.toLocaleString()} ${timeframe} admissions`);
  svg.append("line")
    .attr("x1", 0)
    .attr("y1", y(level3))
    .attr("x2", width)
    .attr("y2", y(level3))
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "5,5"); // Makes the line dashed

  // Add text label for 1000 weekly admissions line
  svg.append("text")
    .attr("x", width)
    .attr("y", y(level3) - 5)
    .attr("fill", "gray")
    .attr("text-anchor", "end")
    .text(`${level3.toLocaleString()} ${timeframe} admissions`);
}
function updateActiveButton(selectedTimeframe) {
  // Remove 'active' class from all buttons
  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Add 'active' class to the selected button
  document.getElementById(selectedTimeframe).classList.add('active');

  // Load the data for the selected timeframe
  updatechart(selectedTimeframe);
}
updatechart("weekly");
// Event listeners for buttons
document.getElementById('daily').addEventListener('click', () => updateActiveButton('daily'));
document.getElementById('weekly').addEventListener('click', () => updateActiveButton('weekly'));
document.getElementById('monthly').addEventListener('click', () => updateActiveButton('monthly'));
