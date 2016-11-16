// Initially empty, but gets populated via an Ajax request (below)
data = {}
dataIssues = {}
dataPullRequests = {}

d3.json("/dataVis/data-issues.json", function(error, json) {
  if (error) 
    return console.warn(error);
  dataIssues = json;
  data = dataIssues;
  updateSparklines();
  setSparklineHeaderText();
  setupButtonClickHandler();
});

d3.json("/dataVis/data-pull-requests.json", function(error, json) {
  if (error) 
    return console.warn(error);
  dataPullRequests = json;
});

function updateSparklines() {
  var dataTypes = Object.keys(data).sort(function(a, b) { 
    var aMax = d3.max(data[a].data, function(d) { return d.total; }); 
    var bMax = d3.max(data[b].data, function(d) { return d.total; }); 
    //return aMax - bMax; // descending
    return bMax - aMax; // ascending
  });

  // Remove *all* existing svg elements  
  d3.select('#sparkLines')
    .selectAll('svg')
    .remove()
  d3.select('#sparkLines')
    .selectAll('text')
    .remove()

  for (i = 0; i < dataTypes.length; i++) {  
    if (dataTypes[i] != 'fsharp' && dataTypes[i] != 'fake') {
      drawChart(dataTypes[i], 'https://github.com/' + data[dataTypes[i]].org + "/" + dataTypes[i]);
    }
  }
}

// Code based on http://bl.ocks.org/timelyportfolio/6456824
function drawChart(chartId, url) {
  var opts = {
    "id": chartId,
    "dom": "chart-" + chartId,
    "url": url,
    // By default the svg seems to size to the div (based on the css width/height above!?
    //"width": 650, //500,
    "height": 70, //100, // This IS used!!
    "x": "index",
    "y": "total",
    "type": "sparklinePlus",
  };

  nv.addGraph(function() {
    var chart = nv.models.sparklinePlus()
      // default margin = {top: 15, right: 100, bottom: 10, left: 50}
      // on the right allow for the printed value, on the left allow for the tooltip!!
      .margin({left:70, right: 50}) // internal border!!
      .x(function(d) { return d[opts.x] })
      .y(function(d) { return d[opts.y] })
      .width(opts.width)
      .height(opts.height)
      .xTickFormat(function(d) {
        // 'd' is the X-value of the current point, i.e. the "index" field!!
        var current = data[opts.id].data[d-1];
        if (current === undefined)
          return d + " - Unknown";
        else
          return current.month;
      })
      // if we don't do this the values end up with decimal places, i.e. 40.0, 27.0, etc
      .yTickFormat(function(d) { return d; });

    // Sleep a bit, to make the repainting more obvious
    // Until I properly learn about D3 selections/transitions, seems to be the best way to do it!!
    var e = new Date().getTime() + (25);
    while (new Date().getTime() <= e) {}

    d3.select('#sparkLines')
      .append('div') // put in a div, so we can fix the svg size
        .attr('id', opts.id)
        .attr('height', opts.height)
      .append('svg')
        .attr('id', opts.dom)
      .datum(data[opts.id].data)
      //.transition().duration(1000)
      .call(chart)

    // Due to a bug, d3 doesn't seem to let us set the namespace via attr(..), see https://github.com/d3/d3/issues/1935
    var svg = d3.select('#sparkLines')
      .select('svg#' + opts.dom)
      .node().setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");       

    updateExistingSvg(opts.id, "#" + opts.dom, opts.height, opts.url);

    // A function to execute each time the window is resized.
    //nv.utils.windowResize(chart.update);

    return chart;
  });
};

// This is all really hacky, we're re-writing the existing svg to make it look how we want it to look
// At some point it maybe easier to include our own modified version of the NV D3 code and do it in there
function updateExistingSvg(id, divId, height, url) {

  // Add the project name to the sparkline
  d3.select('#sparkLines')
    .select('svg' + divId)
      .attr('height', height)
    .select('g.nv-sparklineplus')
    .append("a")
      .attr('href', url)
    .append("text").text(function(d, i) { return id; })
      .attr('style', 'text-anchor: start;') // fill: #ac4142;')
      .attr('x', '-20')
      .attr('y', '25') // if height = 100 use 35, if height = 70 use 25
      .attr('class', 'projectName');

  // Move the existing 'current' value if it's too high or too low!!
  var currentText = d3.select('#sparkLines')
    .select('svg' + divId)
    .select('g.nv-sparklineplus')
    .select('g.nv-valueWrap')
    .select('text')

  // Change the class of the existing 'currentValue' text, so we can apply our own styles
  currentText.attr('class', 'displayValue');

  if (parseInt(currentText.attr("y")) > 36) {
    //console.log("Moving as " + parseInt(currentText.attr("y")) + " is > than 36");
    //console.log(currentText[0][0]);
    currentText.attr("y", 36);
  }
  else if (parseInt(currentText.attr("y")) < 18) {
    //console.log("Moving as " + parseInt(currentText.attr("y")) + " is < than 18");
    //console.log(currentText[0][0])
    currentText.attr("y", 18)
  }

  // Add the 'Max' (in green) above the 'Current' value
  d3.select('#sparkLines')
    .select('svg' + divId)
    .select('g.nv-sparklineplus')
    .select('g.nv-valueWrap')
    .append("text").text(function(d, i) { return d3.max(data[id].data, function(a) { return a.total; }) })
      .attr('style', 'text-anchor: start; fill: #2ca02c;')
      .attr('x', parseInt(currentText.attr("x")))
      .attr('y', parseInt(currentText.attr("y")) - 18)
      .attr('dx', '8')
      .attr('dy', '.9em')
      .attr('class', 'displayValue');

  // Make the min/max/current points/circles a bit larger
  d3.select('#sparkLines')
    .select('svg' + divId)
    .selectAll('circle.nv-point')
    .attr('r', 3)
}

function setSparklineHeaderText() {
  var firstItem = data[Object.keys(data)[0]];
  if (firstItem !== undefined) {
    var minDate = firstItem.data[firstItem.data.length - 1].month; 
    var maxDate = firstItem.data[0].month; 
    if (minDate !== undefined && maxDate !== undefined) {
      d3.select('#dataStartDate')
        .text(minDate);
      d3.select('#dataEndDate')
        .text(maxDate);
    }
  }
}

function setupButtonClickHandler() {
  $(":button").click(function() {
    if ($(this).attr("class") !== "active") {
      $("#btnIssues, #btnPRs").toggleClass("active");
      if ($(this).attr("id") === "btnIssues") {
        data = dataIssues;
        updateSparklines();
      }
      else if ($(this).attr("id") === "btnPRs") {
        data = dataPullRequests;
        updateSparklines();
      }
    }
  });
}