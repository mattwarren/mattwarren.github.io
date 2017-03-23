var fader = function(color) { return d3.interpolateRgb(color, "#fff")(0); },
    color = d3.scaleOrdinal(d3.schemeCategory10.map(fader)),
    format = d3.format(",d");

d3.json("/datavis/data-treemap-coreclr-commits.json", function(error, data) {
  if (error) throw error;
  setupTreemap("#top-level-treemap", data);
});

d3.json("/datavis/data-treemap-coreclr-mscorlib-System-commits.json", function(error, data) {
  if (error) throw error;  
  setupTreemap("#mscorlib-treemap", data);
});

function setupTreemap(divId, data) {
  var svg = d3.select(divId).select("svg");
  var width = +svg.attr("width");
  var height = +svg.attr("height");
  
  var treemap = d3.treemap()
    .tile(d3.treemapResquarify)
    .size([width, height])
    .round(true)
    .paddingInner(1);

  //console.log(data);
  var root = d3.hierarchy(data)
      .eachBefore(function(d) { d.data.id = (d.parent ? d.parent.data.id + "." : "") + d.data.name; })
      .sum(sumByLinesOfCode)
      .sort(function(a, b) { return b.height - a.height || b.value - a.value; });
  //console.log(root);

  treemap(root);

  var cell = svg.selectAll("g")  
    .data(root.leaves())
    .enter().append("g")
      .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; });

  cell.append("rect")
      .attr("id", function(d) { return d.data.id; })
      .attr("width", function(d) { return d.x1 - d.x0; })
      .attr("height", function(d) { return d.y1 - d.y0; })
      // all items under the same parent, have the same colour!
      .attr("fill", function(d) { return color(d.parent.data.id); });

  cell.append("text")
    .selectAll("tspan")
      .data(function(d) {
        var splits = d.data.name == "IO" ? [d.data.name] : d.data.name.split(/(?=[A-Z][^A-Z])/g); 
        if (d.data.topLevel)
          splits.push("(top-level)");
        return splits;
      })
    .enter().append("tspan")
      .attr("x", 4)
      //.attr("y", function(d, i) { return 13 + i * 10; }) // 10px text
      .attr("y", function(d, i) { return 13 + i * 13; })  // 14px text
      .text(function(d) { return d; });

  cell.append("title")
      .text(function(d) { 
        var title = (d.data.topLevel ? (d.parent.data.id + " (top-level)") : d.data.id) + "\n" + 
                    format(d.data.numFiles) + " Files\n" +
                    format(d.data.loc) + " Lines of Code\n" + 
                    ('commits' in d.data ? (format(d.data.commits) + " Commits\n") : "") +
                    "Parent: " + d.parent.data.id;
        return title;
      });

  d3.select(divId).selectAll("input")
      .data([sumByNumFiles, sumByLinesOfCode, sumByNumCommits], function(d) { return d ? d.name : this.value; })
      .on("change", changed);

  function changed(sum) {
    // 'sum' is the actual function, i.e. 'function sumByNumFiles(d)' or 'sumByLinesOfCode(d)'
    treemap(root.sum(sum));
    cell.transition()
        .duration(750)
        .attr("transform", function(d) { return "translate(" + d.x0 + "," + d.y0 + ")"; })
      .select("rect")
        .attr("width", function(d) { return d.x1 - d.x0; })
        .attr("height", function(d) { return d.y1 - d.y0; });

    // Wire up Google Analytics, so we know when the GIF is played
    ga('send', {
      hitType: 'event',
      eventCategory: 'Treemap',
      eventAction: 'ModeChange',
      eventLabel: this.value
    });
  }
}

function sumByNumFiles(d) {
  return d.numFiles;
}

function sumByLinesOfCode(d) {
  return d.loc;
}

function sumByNumCommits(d) {
  // This stops 'NaN' errors (probably 'divide by zero')
  if (d.commits == 0)
    return 1;
  return d.commits;
}
