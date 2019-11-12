console.log('noiseWidget.js, Adam Wise 2019')

var noiseWidget = {
    'boxWidth' : 300,
    'boxHeight' : 300,
    'boxMargin' : 10,
}

// a really minimal widgetty app / article that shows the practicle view of signal / noise

function createSVG(paramObj){
    params = {
        'height' : '300px',
        'width' : '300px',
        'id' : 'defaultId',
        'margin' : 30, // margin in pixels
        'target' : 'body'
    };

    if (paramObj){
        var keys = Object.keys(paramObj);
        for (var i = 0; i<keys.length; i++){
            params[keys[i]] = paramObj[keys[i]]
        }
    }

    var svg = d3.select(params['target'])
                    .append('svg')
                    .attr('id', params['id'])
                    .attr('height', 300)
                    .attr('width', 300)
                    .style('border', '1px solid #999')

    return svg
    
}

var svg1 = createSVG({'target':'#gui'})

// create fake s/n data
var snData = [];
var numDataPoints = 100;

function sn(x){
    return x / Math.sqrt(x + cameras[0].readNoise**2) 
}

for (var i = 0; i < numDataPoints; i++){
    var tempObj = {};
    tempObj['x'] = i+1;
    tempObj['y'] = sn(i+1);
    snData[i] = tempObj;
}

// create line obj and draw line to SVG
var margin = 45;

var x = d3.scaleLog()
            .domain([1,snData.slice(-1)[0].x])
            .range([0 + margin, Number(svg1.attr('width'))-margin])

        
var y = d3.scaleLog()
            .domain([0.3, snData.slice(-1)[0].y])
            .range([Number(svg1.attr('height')) - margin, 0 + margin]) // x graph scale

var dataLine = d3.line().x(d=>x(d.x)).y(d=>y(d.y))

svg1.append('path')
        .attr('d', dataLine(snData))
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)

svg1.append('g')
    .attr("transform", "translate(0," + (Number(svg1.attr('height')) - margin) + ")")
    .call(d3.axisBottom(x).tickValues([0.1,1,10,100]).tickFormat(d=>d))

svg1.append('g')
    .attr("transform", "translate(" + margin + ")")
    .call(d3.axisLeft(y).tickValues([0.5,1,2,5]).tickFormat(d=>d))

// add text labels
svg1.append('g')
    .attr('transform','translate(100,290)')
    .append('text')
    .text('Photons / Pixel')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')
svg1.append('g')
    .attr('transform','translate(15,220), rotate(-90)')
    .append('text')
    .text('Signal to Noise Ratio')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')



var knob = svg1.append('circle').attr('cx', x(10)).attr('cy', y(sn(10))).attr('r', 10)
knob.style('stroke','black')
knob.style('fill','#555 ')

var localScale = d3.scaleLinear()
        .domain([margin,Number(svg1.attr('height')) - margin])
        .range([margin,Number(svg1.attr('height')) - margin])
        .clamp(true)

function dragging(){
    video.photonCount = x.invert(localScale(Number(d3.select(this).attr('cx')) + d3.event.dx));
    video.SN = sn(video.photonCount)
    d3.select(this).attr('cx', x(video.photonCount))
    d3.select(this).attr('cy', y( video.SN ) )
    //console.log(video.photonCount, video.SN)
    video.featureBrightness = video.photonCount
}

knob.call(d3.drag().on('drag', dragging))


var crossSection = d3.select('#crossSection')
                    .append('svg')
                    .attr('width',noiseWidget.boxWidth)
                    .attr('height',noiseWidget.boxHeight)
                    .style('border','1px solid gray')

var crossLineGenerator = d3.line().x(d=>d.x).y(d=>d.y)
var cx = d3.scaleLinear().domain([0,300]).range([0,noiseWidget.boxWidth]).clamp(true)


var crossLine = crossSection.append('g').append('path')
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 2)
function animateLine(){
    var lineProfile = [];
    var nSTDS = 2.5;
    var noiseLevel = Math.sqrt( cameras[0].readNoise**2 + video.featureBrightness)
    var cy = d3.scaleLinear()
        .domain([0 - nSTDS * noiseLevel, video.featureBrightness + nSTDS * noiseLevel])
        .range([noiseWidget.boxHeight - noiseWidget.boxMargin + 20 , noiseWidget.boxMargin + 30]).clamp(true)
    cameras[0].simImage.data.slice(150*300,151*300).forEach(function(d,i){
        
        
        if(d){
            lineProfile.push({'x':i,'y':cy(d)})
        }
    });

    crossLine.attr('d', crossLineGenerator(lineProfile))

}

lineFunc = animateLine