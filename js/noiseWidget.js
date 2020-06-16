console.log('noiseWidget.js, Adam Wise 2019')

var noiseWidget = {
    'boxWidth' : 200,
    'boxHeight' : 200,
    'boxMargin' : 10,
}

// a really minimal widgetty app / article that shows the practicle view of signal / noise

function createSVG(paramObj){
    params = {
        'height' : noiseWidget.boxHeight + 'px',
        'width' : noiseWidget.boxWidth + 'px',
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
                    .attr('height', noiseWidget.boxHeight)
                    .attr('width', noiseWidget.boxWidth)
                    //.style('border', '1px solid #999')

    return svg
    
}

var svg1 = createSVG({'target':'#gui'})

// create fake s/n data
var snData = [];
var snDataIdeal = [];
var numDataPoints = 100;

function sn(x){
    return cameras[0].QE * x / Math.sqrt(cameras[0].QE * x + cameras[0].readNoise**2) 
}

function snIdeal(x){
    return Math.sqrt(x) 
}

for (var i = 0; i < numDataPoints; i++){
    var tempObj = {};
    tempObj['x'] = i+1;
    tempObj['y'] = sn(i+1);
    snData[i] = tempObj;

    var tempObjIdeal = {};
    tempObjIdeal['x'] = i+1;
    tempObjIdeal['y'] = snIdeal(i+1);
    snDataIdeal[i] = tempObjIdeal;

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

svg1.append('path')
        .attr('d', dataLine(snDataIdeal))
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray",4)

// append shot noise limit text
svg1.append('g')
    .attr("transform","translate(60,100) rotate(-34)")
    .append('text')
    .style('font-size','12px')
    .text('Shot Noise Limit')
    .style('font-family',"sans-serif")

svg1.append('g')
    .attr("transform", "translate(0," + (Number(svg1.attr('height')) - margin) + ")")
    .call(d3.axisBottom(x).tickValues([0.1,1,10,100]).tickFormat(d=>d))

svg1.append('g')
    .attr("transform", "translate(" + margin + ")")
    .call(d3.axisLeft(y).tickValues([0.5,1,2,5]).tickFormat(d=>d))

// add text labels
svg1.append('g')
    .attr('transform',`translate(${noiseWidget.boxWidth/2-40}, ${noiseWidget.boxHeight - 10})`)
    .append('text')
    .text('Photons / Pixel')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')

    svg1.append('g')
    .attr('transform',`translate(15, ${noiseWidget.boxHeight - 40}), rotate(-90)`)
    .append('text')
    .text('Signal to Noise Ratio')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')

var knob = svg1.append('circle')
    .attr('cx', x(video.featureBrightness))
    .attr('cy', y(sn(video.featureBrightness)))
    .attr('r', 10)

knob.style('stroke','black')
knob.attr('stroke-width','2px')
knob.style('fill','#ddd ')

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


// show the simulated line profile =========================

var crossSection = d3.select('#crossSection')
                    .append('svg')
                    .attr('width',noiseWidget.boxWidth)
                    .attr('height',noiseWidget.boxHeight)
                    //.style('border','1px solid gray')

var cx = d3.scaleLinear()
    .domain([0, noiseWidget.boxWidth])
    .range([margin,noiseWidget.boxWidth - margin])
    .clamp(true)

var cy = d3.scaleLinear()
    .domain([-10, 120])//video.featureBrightness + nSTDS * noiseLevel])
    .range([Number(svg1.attr('height')) - margin, 0 + margin])
    .clamp(true) // x graph scale

var crossLineGenerator = d3.line().x(d=>cx(d.x)).y(d=>cy(d.y))

crossSection.append('g')
    .attr("transform", "translate(0," + (Number(crossSection.attr('height')) - margin) + ")")
    .call(d3.axisBottom(cx).tickValues([noiseWidget.boxWidth/2, noiseWidget.boxWidth ]).tickFormat(d=>d))

crossSection.append('g')
    .attr("transform", "translate(" + margin + ")")
    .call(d3.axisLeft(cy).tickValues([0, 100]))

// add text labels
crossSection.append('g')
    .attr('transform',`translate(${noiseWidget.boxWidth/2-20}, ${noiseWidget.boxHeight - 10})`)
    .append('text')
    .text('Pixel #')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')

crossSection.append('g')
    .attr('transform',`translate(15, ${noiseWidget.boxHeight - 60}), rotate(-90)`)
    .append('text')
    .text('Counts, a.u.')
    .attr('fill','black')
    .attr("font-family", "sans-serif")
    .attr('font-size','10pt')


var crossLine = crossSection.append('g').append('path')
                .attr("fill", "none")
                .attr("stroke", "black")
                .attr("stroke-width", 2)

var barBuffer = 10;
var barOp = 0.7;



var meanIndicator = crossSection.append('rect')
                    .attr('width', cx(video.featureSigma))
                    .attr('height',2)
                    .attr('x', noiseWidget.boxWidth * (120/300) )
                    .attr('opacity', barOp)

var meanLabel = crossSection.append('text')
                    .text('Signal Mean')
                    .attr('fill','red')
                    .attr('x', noiseWidget.boxWidth/2 + 50)
                    .attr('text-anchor','middle')
                    .style('font-size','12px')
                    .attr('dominant-baseline','middle')
                    .style('text-shadow','2px 2px 20px #FFF')

var upperLim =  crossSection.append('rect')
                    .attr('width', cx(video.featureSigma)/1.5)
                    .attr('height',2)
                    .attr('x', noiseWidget.boxWidth * (120/300))
                    .attr('opacity', barOp)

var lowerLim =  crossSection.append('rect')
                    .attr('width', cx(video.featureSigma)/1.5)
                    .attr('height',2)
                    .attr('x', noiseWidget.boxWidth * (120/300))
                    .attr('opacity', barOp)

var bug = svg1.append('rect')
    .attr('width', 10)
    .attr('height',2)
    .attr('x',x(1)-5)
    .attr('opacity', barOp)

function animateLine(){
    var lineProfile = [];
    var nSTDS = 2.5;
    var noiseLevel = Math.sqrt( cameras[0].readNoise**2 + video.featureBrightness)

    cameras[0].simImage.data.slice(cameras[0].xPixels/2 * noiseWidget.boxWidth, (cameras[0].xPixels/2 +1) * noiseWidget.boxHeight).forEach(function(d,i){
        
        
        if(d){
            lineProfile.push({'x':i,'y':d})
        }
    });

    var roiSubset = video.roi;//cameras[0].simImage.data.slice(149*300 + 122 ,150*300 - 120);
    var mean = roiSubset.reduceRight(function(x,y){return x+y}) / roiSubset.length
    var variance = roiSubset.map(x => (x-mean)**2 ).reduceRight(function(x,y){return x+y}) / roiSubset.length
    var sd = Math.sqrt(variance)

    crossLine.attr('d', crossLineGenerator(lineProfile))
    meanIndicator.attr('fill','red').attr('y', cy(mean))
    meanLabel.attr('fill','red').attr('y', Math.min(cy(mean) - 10, noiseWidget.boxHeight * (225/300) ))
    upperLim.attr('fill','green').attr('y', cy(mean+sd))
    lowerLim.attr('fill','green').attr('y', cy(mean-sd))
    bug.attr('fill','black').attr('y', y(mean/sd))
    //console.log(mean, sd, mean/sd)
    //console.log(roiSubset)
}

lineFunc = animateLine