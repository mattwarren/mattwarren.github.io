// All this data is initially empty, but gets populated via an Ajax request (below)

// The raw data, i.e. the json we got from the ajax request
dataIssues = {}, dataPullRequests = {};

// The current sparkline data (can be 'Issues' or 'Pull Requests')
sparklineData = {};

dataIssuesUrl = window.location.href.includes("/2017/") ? "/datavis/data-issues-2017.json" : "/datavis/data-issues.json";
//dataIssuesUrl = "/datavis/data-issues.json";

//d3.json("/datavis/data-issues.json", function(error, json) {
d3.json(dataIssuesUrl, function(error, json) {
  if (error) 
    return console.warn(error);
  dataIssues = json;

  sparklineData = dataIssues;
  updateSparklines();
  setSparklineHeaderText();
  setupButtonClickHandler();

  var normalizedStackedIssueData = createNormalizedStackedBarChartData(json);
  setupNormalizedStackedBarChart(normalizedStackedIssueData, ".g-chart-issues", "-issues", normalizedStackedBarInfo);
  
  // Ensure that the PR data is loaded once the issueData has finished
  getPullRequestDataViaAjax();
});

function getPullRequestDataViaAjax() {
  dataPullRequestsUrl = window.location.href.includes("/2017/") ? "/datavis/data-pull-requests-2017.json": "/datavis/data-pull-requests.json";
  //var dataPullRequestsUrl = "/datavis/data-pull-requests.json";

  //d3.json("/datavis/data-pull-requests.json", function(error, json) {
  d3.json(dataPullRequestsUrl, function(error, json) {
    if (error) 
      return console.warn(error);
    dataPullRequests = json;

    var normalizedStackedPullRequestData = createNormalizedStackedBarChartData(json);
    setupNormalizedStackedBarChart(normalizedStackedPullRequestData, ".g-chart-pull-requests", "-pull-requests", normalizedStackedBarInfo);

    // Setup and Create the 'Stacked-to-Grouped Bar Chart')
    // Blue - http://colorbrewer2.org/#type=sequential&scheme=Blues&n=3 (2nd and 3rd hue)
    var blueColourRange = ["#9ecae1", "#3182bd"]; // issues
    // Green - http://colorbrewer2.org/#type=sequential&scheme=Greens&n=3 (2nd and 3rd hue)
    var greenColourRange = ["#a1d99b", "#31a354"]; // pull requests
  
    setupStackedGroupedPullDownMenus(json, dataIssues, "#issuesGraph", "issuesSelect", blueColourRange);
    setupStackedGroupedPullDownMenus(json, dataPullRequests, "#pullRequestsGraph", "pullRequestsSelect", greenColourRange);
  
    var selectValue = d3.select('#pullRequestsGraph').select('select').property('value');
    var issuesMax = d3.max(dataIssues[selectValue].data, function(d) { return d.total; });
    var pullRequestsMax = d3.max(dataPullRequests[selectValue].data, function(d) { return d.total; });
    var overallMax = issuesMax;
    if (pullRequestsMax > overallMax)
      overallMax = pullRequestsMax;
    changeStackedGroupedBarData(json, dataIssues, "#issuesGraph", blueColourRange, selectValue, overallMax);
    changeStackedGroupedBarData(json, dataPullRequests, "#pullRequestsGraph", greenColourRange, selectValue, overallMax);
  });
}

/***********************/
/* Code for Sparklines */
/***********************/

function updateSparklines() {
  var dataTypes = Object.keys(sparklineData).sort(function(a, b) { 
    var aMax = d3.max(sparklineData[a].data, function(d) { return d.total; }); 
    var bMax = d3.max(sparklineData[b].data, function(d) { return d.total; }); 
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
    if (dataTypes[i] != 'fake') {
      drawSparklineChart(dataTypes[i], 'https://github.com/' + sparklineData[dataTypes[i]].org + "/" + dataTypes[i]);
    }
  }
}

// Code based on http://bl.ocks.org/timelyportfolio/6456824
function drawSparklineChart(chartId, url) {
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
      // on the right allow for the printed value, on the left allow for the tool-tip!!
      .margin({top: 10, bottom: 10, left:70, right: 50}) // internal border!!
      .x(function(d) { return d[opts.x] })
      .y(function(d) { return d[opts.y] })
      .width(opts.width)
      .height(opts.height)
      .xTickFormat(function(d) {
        // 'd' is the X-value of the current point, i.e. the "index" field!!
        var current = sparklineData[opts.id].data[d-1];
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
        .attr('class', 'sparkline')
      .datum(sparklineData[opts.id].data)
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
      .attr('style', 'text-anchor: start;')
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
    currentText.attr("y", 36);
  }
  else if (parseInt(currentText.attr("y")) < 18) {    
    currentText.attr("y", 18)
  }

  // Add the 'Max' (in green) above the 'Current' value
  d3.select('#sparkLines')
    .select('svg' + divId)
    .select('g.nv-sparklineplus')
    .select('g.nv-valueWrap')
    .append("text").text(function(d, i) { return d3.max(sparklineData[id].data, function(a) { return a.total; }) })
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
  var firstItem = sparklineData[Object.keys(sparklineData)[0]];
  if (firstItem !== undefined) {
    var minDate = firstItem.data[0].month;
    var maxDate = firstItem.data[firstItem.data.length - 1].month; 
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
        sparklineData = dataIssues;
        updateSparklines();
      }
      else if ($(this).attr("id") === "btnPRs") {
        sparklineData = dataPullRequests;
        updateSparklines();
      }
    }
  });
}

/******************************************/
/* Code for Normalized Stacked Bar Charts */
/******************************************/

var normalizedStackedBarInfo = new function() {
  //Margin conventions
  //var margin = {top: 10, right: 50, bottom: 20, left: 227};
  this.margin = {top: 10, right: 10, bottom: 20, left: 150};

  //var widther = window.outerWidth;
  this.widther = 0;

  //var barHeight = 34;
  this.barHeight = 25;

  // 4 bars, overall = 170, bar height = 33, gap = 9.5 (stride = 42.5)
  // 5 bars, overall = 205, bar height = 33, gap = 8   (stride = 41)

  this.width = 0; // widther - margin.left - margin.right,
  //height = 200 - margin.top - margin.bottom; // 4 bars
  //height = 235 - margin.top - margin.bottom; // 5 bars
  //height = 700 - margin.top - margin.bottom; // 16 bars
  this.height = 550 - this.margin.top - this.margin.bottom; // 16 bars
}

function createNormalizedStackedBarChartData(json) {
  var dataKeys = Object.keys(json);
  var tempData = [];
  dataKeys.forEach(function(element) {
    var itemData = json[element].data;
    var communitySum = d3.sum(itemData, function(a) { return a.community });
    var microsoftSum = d3.sum(itemData, function(a) { return a.microsoft });
    var totalSum = d3.sum(itemData, function(a) { return a.total });
    if (element !== "fake") {
      //console.log(element + " - Sum: Community=" + communitySum + ", Microsoft=" + microsoftSum + ", Total=" + totalSum);
      tempData.push({
        "category": element, 
        "num": Math.round((microsoftSum / totalSum) * 100), 
        "num2": 100,
        "community": communitySum,
        "microsoft": microsoftSum,
        "total": communitySum + microsoftSum,
      });
    }
  });
  return tempData;
}

function setupNormalizedStackedBarChart(data, className, classSuffix, info) {
  info.widther = d3.select(className).node().clientWidth;
  info.width = info.widther - info.margin.left - info.margin.right;

  //Appends the svg to the chart-container div
  var svg = d3.select(className).append("svg")
    .attr("width", info.width + info.margin.left + info.margin.right)
    .attr("height", info.height + info.margin.top + info.margin.bottom)
    .attr("class", "normalizedStackedBar")
    .append("g")
    .attr("transform", "translate(" + info.margin.left + "," + info.margin.top + ")");

  var sortedCategories = data.sort(function(a, b) { 
      return b.num - a.num; // ascending
      //return a.num - b.num; // descending
    }).map(function(obj){
      return obj.category;
    });

  //Creates the xScale 
  var xScale = d3.scale.linear()
   .range([0, info.width]);

  //Creates the yScale
  var y0 = d3.scale.ordinal()
    .rangeBands([info.height, 0], 0)
    .domain(sortedCategories);

  //Defines the y axis styles
  var yAxis = d3.svg.axis()
    .scale(y0)
    .orient("left");

  //Defines the y axis styles
  var xAxis = d3.svg.axis()
    .scale(xScale)
    .orient("bottom")
    .tickFormat(function(d) {return d + "%"; })
    .tickSize(info.height); 

  //FORMAT data
  data.forEach(function(d) {
    d.num = +d.num;
    d.num2 = +d.num2;
  });

  //Get the min/max value for the xScale
  var maxX = d3.max(data, function(d) { return d.num2; });
  var minX = d3.min(data, function(d) { return d.num; });

  //Defines the xScale max
  xScale.domain([0, maxX]);

  //Appends the y axis
  var yAxisGroup = svg.append("g")
    .attr("class", "y axis")
    .call(yAxis);

  //Appends the x axis
  var xAxisGroup = svg.append("g")
    .attr("class", "x axis")
    .call(xAxis); 

  //Binds the data to the bars
  var categoryGroup = svg.selectAll(".g-category-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "g-category-group")
    .attr("transform", function(d) {
      return "translate(0," + y0(d.category) + ")";
    });

  //Appends background bar
  var bars2 = categoryGroup.append("rect")
    .attr("width", function(d) { return xScale(d.num2); })
    .attr("height", info.barHeight - 1 )
    .attr("class", "g-num2" + classSuffix)
    .attr("transform", "translate(0,4)");

  //Appends main bar
  var bars = categoryGroup.append("rect")
    .attr("width", function(d) { return xScale(d.num); })
    .attr("height", info.barHeight - 1 )
    .attr("class", "g-num" + classSuffix)
    .attr("transform", "translate(0,4)"); 

  //Binds data to labels
  var labelGroup = svg.selectAll("g-num")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "g-label-group")
    .attr("transform", function(d) {
      return "translate(0," + y0(d.category) + ")";
    });

  //Appends main bar labels
  var barLabels = labelGroup.append("text") 
    .text(function(d) { return  d.num + "%"; })
    .attr("x", function(d) { 
      return xScale(d.num) - 37;})
    .style("fill", function(d){
      return "#696969";})
    .attr("y", y0.rangeBand()/1.6 )
    .attr("class", "g-labels")

  var barLabelsOther = labelGroup.append("text") 
    .text(function(d) { return (d.num2 - d.num) + "%"; })
    .attr("x", function(d) { return xScale(d.num) + 6;})
    .style("fill", function(d){ return "white";})
    .attr("y", y0.rangeBand()/1.6 )
    .attr("class", "g-labels") // + classSuffix);
    
  // Define the div for the tooltip
  var div = d3.select(className).append("div")
    .attr("class", "tooltipOverall")
    .style("opacity", 0);

  var rect = categoryGroup
    .on("mousemove", function(d, i) { tooltipMouseMoveNormalizedStackedBarChart(div, d); })
    .on("mouseout", function(d) {
      div.transition()
        .duration(500)
        .style("opacity", 0);
    });
}

function tooltipMouseMoveNormalizedStackedBarChart(div, currentData) {
  div.transition()
    .duration(200)
    .style("opacity", .9);
  var htmlText = 
    "<b>" + "Total: " + currentData.total + "</b><br/>" +    
    "M/S: " + currentData.microsoft + "<br/>" +
    "Com'ty: " + currentData.community + "<br/>";
  div.html(htmlText)
    .style("left", (d3.event.pageX - 100) + "px")
    .style("top", (d3.event.pageY - 60) + "px");
}

/***************************************/
/* Code for Stacked/Grouped Bar Charts */
/***************************************/

var stackedGroupedBarInfo = new function() {
  this.margin = {top: 10, right: 10, bottom: 50, left: 35};
  // calculated in changeStackedGroupedBarData(), based on the width of the parent div
  this.width = 0;
  this.height = 400 - this.margin.top - this.margin.bottom;
  
  // Shared by changeData(), setup(), transitionGrouped() & transitionStacked()
  this.y = [];
  this.yGroupMax = 0;
  this.yStackMax = 0;
  this.rect = {};
}

function setupStackedGroupedPullDownMenus(json, dataToUse, divId, selectId, colourRange) {
  // create the pull-down menus that allows us to change the repo
  var select = d3.select(divId)
    .append('select')
      .attr('class', 'select')
      .attr('id', selectId)
      .attr('style', 'font-size:large;margin-left:10px;')
    .on('change', function(d) { 
      var selectValue = d3.select(divId).select('select').property('value');
      var issuesMax = d3.max(dataIssues[selectValue].data, function(d) { return d.total; });
      var pullRequestsMax = d3.max(dataPullRequests[selectValue].data, function(d) { return d.total; });
      var overallMax = issuesMax;
      if (pullRequestsMax > overallMax)
        overallMax = pullRequestsMax;
      changeStackedGroupedBarData(json, dataToUse, divId, colourRange, selectValue, overallMax); 
      if (dataToUse === dataIssues) {
        d3.select("#pullRequestsSelect").property('value', selectValue);
        changeStackedGroupedBarData(json, dataPullRequests, "#pullRequestsGraph", ["#a1d99b", "#31a354"], selectValue, overallMax);         
      }
      else {
        d3.select("#issuesSelect").property('value', selectValue);
        changeStackedGroupedBarData(json, dataIssues, "#issuesGraph", ["#9ecae1", "#3182bd"], selectValue, overallMax); 
      }
    });

  var options = select.selectAll('option')
      .data(Object.keys(json).filter(function(i) { return i != 'fake' })).enter()
    .append('option')
      .attr("value", function(d) { return d; })
      .text(function (d) { return d; })
      
  //d3.selectAll("input").on("change", change);
}

function changeStackedGroupedBarData(allData, dataToUse, divId, colourRange, selectValue, overallMax) {
  var data = dataToUse[selectValue].data;

  var layers = [
    data.map(function(d, i) { return {x: i, y: d.microsoft, y0: 0}; }),
    data.map(function(d, i) { return {x: i, y: d.community, y0: d.microsoft}; })
  ]
  
  var info = stackedGroupedBarInfo;
  info.width = d3.select(divId).node().clientWidth - info.margin.left - info.margin.right;

  info.yGroupMax = d3.max(layers, function(layer) { return d3.max(layer, function(d) { return d.y; }); }),
  info.yStackMax = overallMax;

  d3.select(divId)
    .selectAll('svg')
    .remove();
 
  setupStackedGroupedBar(divId, data, layers, colourRange, info);
}

function setupStackedGroupedBar(divToUse, data, layers, colourRange, info) {
  var n = layers.length,    // number of layers
      m = layers[0].length; // number of samples per layer

  var x = d3.scale.ordinal()
    .domain(d3.range(m))
    .rangeRoundBands([0, info.width], .08);

  info.y = d3.scale.linear()
    .domain([0, info.yStackMax])
    .range([info.height, 0]);

  var xAxis = d3.svg.axis()
    .scale(x)
    .tickSize(0)
    .tickPadding(6)
    .orient("bottom")
    .tickFormat(function(d) {
      // 'd' is the X-value of the current point, i.e. the "index" field!!
      var current = data[d];
      return current === undefined ? d + " - Unknown" : current.month;
    })

  var yAxis = d3.svg.axis()
    .scale(info.y)
    .tickSize(0)
    .tickPadding(6)
    .orient("left");

  var svg = d3.select(divToUse)
    .append("svg")
      .attr("width", info.width + info.margin.left + info.margin.right)
      .attr("height", info.height + info.margin.top + info.margin.bottom)
    .append("g")
      .attr("transform", "translate(" + info.margin.left + "," + info.margin.top + ")");

  var color = d3.scale.linear()
    .domain([0, n - 1])
    .range(colourRange);

  var layer = svg.selectAll(".layer")
      .data(layers)
    .enter().append("g")
      .attr("class", "layer")
      .style("fill", function(d, i) { return color(i); });

  // Define the div for the tooltip
  var div = d3.select(divToUse).append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  info.rect = layer.selectAll("rect")
      .data(function(d) { return d; })
    .enter().append("rect")
      .attr("x", function(d) { return x(d.x); })
      .attr("y", info.height)
      .attr("width", x.rangeBand())
      .attr("height", 0)
    .on("mousemove", function(d, i) { tooltipMouseMove(div, data[d.x]); })
    .on("mouseout", function(d) {
      div.transition()
        .duration(500)
        .style("opacity", 0);
    });

  info.rect.transition()
    .delay(function(d, i) { return i * 10; })
    .attr("y", function(d) { return info.y(d.y0 + d.y); })
    .attr("height", function(d) { return info.y(d.y0) - info.y(d.y0 + d.y); });

  svg.append("g")
    .attr("class", "xaxis axis")
    .attr("transform", "translate(0," + info.height + ")")
    .call(xAxis)

  // rotate the text on the x-axis, so it's legible
  svg.selectAll(".xaxis text")  // select all the text elements for the xaxis
    .attr("transform", function(d) {
      return "translate(" + this.getBBox().height*-2 + "," + (this.getBBox().height+3) + ")rotate(-45)";
    });

  svg.append("g")
    .attr("class", "yaxis axis")
    .call(yAxis)
}

function tooltipMouseMove(div, currentData) {
  div.transition()
    .duration(200)
    .style("opacity", .9);
  var htmlText = 
    "<b>" + currentData.month + "</b><br/>"  + 
    "<b>" + "Total: " + currentData.total + "</b><br/>" +
    "Com'ty: " + currentData.community + "<br/>" +
    "M/S: " + currentData.microsoft + "<br/>";
  div.html(htmlText)
    .style("left", (d3.event.pageX - 80) + "px")
    .style("top", (d3.event.pageY - 58) + "px");
}