var width = 1200, height = 1200, xOffset = width / 2, yOffset = height / 3;


var fill = d3.scale.category20();
// Create a cluster "canvas"
var cluster = d3.layout.cluster()
    .size([height-100, width-100]);



var chart = d3.select(".chart").append("svg")
        .attr("width", width)
        .attr("height", height);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .html(function(d) {
        if(d.value == 'keyword') {
            return '<p>Keyword</p>';
        } else {
            return '<p>Clinical trial acronym: '+d.value.value+'</p><p>Year to be completed: '+d.value.date+'</p><p>'+d.value.description+'</p>'; 
        }
        
    });

chart.call(tip);

d3.json('parsedData.json', function(error, data) {
    var words = keywords(cluster.nodes(data));
    var fontSize = d3.scale.log().range([10, 100]);
    var years = [];
    

    for (obj in words) {
        years.push({year: obj});
    }

    var pagination = d3.select('.pagination');
    pagination.selectAll('li').data(years).enter()
        .append('li')
        .append('a')
        .attr('href', '#')
        .attr('class', 'pages')
        .text(function(d) {
            return d.year;
        })
        .on('click', function(d) {
            loadYear(d.year, words);
        });

    
});

function loadYear(year, words) {
    clearChart();
    var layout = d3.layout.cloud()
        .size([width, height])
        .timeInterval(Infinity)
        .words(words[year])
        .padding(5)
        .rotate(0)
        .font("Roboto Slab")
        .fontSize(function(d) { return d.size; })
        .on("end", draw)
        .start();
}

function draw(words) {
    var numTrials = words.length;
    var averageDegree = 0;

    for (var i = 0; i < numTrials; i++) {
        averageDegree += words[i].value.keywords.length;
    }
    averageDegree = Math.round(averageDegree / numTrials);
    

    chart.append("g")
        .attr("transform", "translate("+xOffset+","+yOffset+")")
        .selectAll("text")
        .data(words)
        .enter().append("text")
        .attr('class', 'word')
        .on('click', function(d){
            focusOnKeyword(this, d);
        })
        .attr("text-anchor", "middle")
        .attr("transform", function(d) {
            return "translate(" + [d.x+75, d.y+200] + ")";
        })
        .text(function(d) { return d.text; })
        .transition().duration(250)
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Roboto Slab")
        .style("fill", function(d, i) { return fill(i); });

    d3.select('p#metrics')
        .text(function() {
            return 'Number of trials: '+numTrials+'\nAverage keywords per trial: '+averageDegree;
        });
}       

function generateDetailForceVector(nodes, links) {
    var force = d3.layout.force()
        .nodes(nodes)
        .links([])
        .gravity(0.5)
        .charge(-2000)
        .size([xOffset+250, yOffset+150]);

    var link = chart.selectAll('line')
        .data(links).enter().append('line')
        .attr('class', 'link');

    var node = chart.selectAll('circle')
        .data(nodes).enter().append('g')
        .call(force.drag);

    node.append('circle')
        .attr('cx', function(d){ return d.x; })
        .attr('cy', function(d){ return d.y; })
        .attr('r', 3)
        .attr('class', 'node');

    node.append('text')
        .on('dblclick', function(d){
            restore();
            force.stop();   
        })
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .text(function(d){ return d.text; })
        .attr('class', function(d){
            if (d.value == 'keyword') {
                return 'key-label';
            } else {
                return 'trial-label';
            }
        });

    force.on('tick', function(e) {
        // attach movement behavior over ticks
        node.attr('transform', function(d, i) {
            return 'translate('+d.x+','+d.y+')';
        })

        // draws and animates the link lines
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });
    });

    force.start();
}

function keywords(data) {
    mapKeys = {};

    data.forEach(function(d) {
        if (d.keywords) {
            d.keywords.forEach(function(key) {
                if (!mapKeys[d.date]) {
                    mapKeys[d.date] = [];
                }
                mapKeys[d.date].push({text: key.value, size: 22, value: d});
            });
        }
    });

    return mapKeys;
}

function focusOnKeyword(node, data) {

    var wordsToAdd = [], spline = 35;
    var nodes = [], links = [];

    nodes.push({text: data.value.value,
            size: 58,
            value: data.value});
    for (var i = 0; i < data.value.keywords.length; i++) {
        nodes.push({text: data.value.keywords[i].value, value: 'keyword' });
        links.push({
            source: nodes[i+1],
            target: nodes[0],
        });

    }

    d3.selectAll('.word').transition().duration(500).style('opacity', 0);
    generateDetailForceVector(nodes, links);
}

function restore() {
    d3.selectAll('.word').transition().duration(500).style('opacity', .85).style('font-size', 22);
    d3.selectAll('.node').transition().duration(250).style('opacity', 0);
    d3.selectAll('.link').transition().duration(250).style('opacity', 0);
    d3.selectAll('.trial-label').transition().duration(250).style('opacity', 0);
    d3.selectAll('.key-label').transition().duration(250).style('opacity', 0);
    d3.selectAll('.node').transition().delay(400).remove();
    d3.selectAll('.link').transition().delay(400).remove();
    d3.selectAll('.trial-label').transition().delay(400).remove();
    d3.selectAll('.key-label').transition().delay(400).remove();
}

function clearChart() {
    d3.selectAll('.word').transition().duration(250).style('opacity', 0);
    d3.selectAll('.node').transition().duration(250).style('opacity', 0);
    d3.selectAll('.link').transition().duration(250).style('opacity', 0);
    d3.selectAll('.trial-label').transition().duration(250).style('opacity', 0);
    d3.selectAll('.key-label').transition().duration(250).style('opacity', 0);

    d3.selectAll('.node').transition().delay(400).remove();
    d3.selectAll('.link').transition().delay(400).remove();
    d3.selectAll('.word').transition().delay(400).remove();
    d3.selectAll('.trial-label').transition().delay(400).remove();
    d3.selectAll('.key-label').transition().delay(400).remove();
}
