console.log('videoSim.js - Adam Wise 2019')

// global variables, I love them
var objPos = [0,0]; // x,y position of the feature in pixels

var lineFunc = function(){
};

var speedMultiplier = 0.5; // fudge factor for random walk speed of the feature

var video = {
 'mode' : 'Slow', // fast or slow imaging mode
 'exposureTime' : 0, // exposure time in seconds
 'wavelength' : 500, // wavelength of light incident on camera, in nm
 'featureBrightness' : 10, // peak brightness of the feature in photons / counts / whatever
 'activeDataSet' : 0, // which data set is currently active
 'featureSigma' : 30,
}


// Knuth low-lambda Poisson random sample generator
function poissonSample( lambda = 1, numSamples = 1 ){
    var output = []

    // if lambda = 0, return array of zeros
    if (lambda <= 0 || isNaN(lambda)){
        output.length = numSamples;
        output.fill(0)
        return output
    }

    var l = Math.exp(-lambda);
    var k = 0;
    var p = 1;
    for (var i = 0; i < numSamples; i++){
        k = 0;
        p = 1;
        while(p>l){
            k++;
            p = p*Math.random();
        }
        output.push( Math.max(k-1,0));
    }
    return output;
}


function generateRandomArray(m,n){
    var m = new Arr2d(m,n,0).mapData(d=>poissonSample(4));
    return m
}

// Standard Normal variate using Box-Muller transform.
function randBM() {
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
}

// helper function to make arrays of normally distributed random values
function randnSample(nSamples = 1, mu = 0, sigma = 10) {
    var output = [];
    output.length = nSamples;
    for (i = 0; i < nSamples; i++){
        output[i] = (randBM() * sigma) + mu;
    }
    return output;
}

function Camera(paramObj){
    
    var self = this;
    
    //default parameters
    console.log('setting parameters');
    self.name = 'Generic Camera'
    self.xPixels = 300; // number of pixels in x dimension
    self.yPixels = 300; // number of pixels in y dimension
    self.xPixelSize = 13; // x pixel size in microns
    self.yPixelSize = 13; // y pixel size in microns
    
    self.readNoise = 2; // rms read noise in electrons
    self.readNoiseSlow = 2; // rms read noise for slow readout
    self.readNoiseFast = 2; // rms read noise for slowest readout
    
    self.CIC = 0; // CIC in events / pixel / frame
    self.offset = 0; // offset in counts for the fake ADC
    self.featureSigma = 10; // FWHM of image feature
    self.QE = 0.8; // camera quantum efficiency (QE), range from 0 to 1
    
    self.frameRateHz = 1; // camera framerate in relative units
    self.frameRateHzFast = 1; // camera framerate for fast mode
    self.frameRateHzSlow = 1; // camera framerate for slow mode

    self.darkCurrent = 0.00001; // camera dark current in e/pix/sec
    self.emGain = 0; // em gain flag


    self.pixelDecimation = 1    ; // factor to reduce resolution to ease display on a monitor
    self.hasRealImage = false; // should this camera have another real image available?

    if (paramObj){
        self.div = d3.select('#' + paramObj.containerDivID).append('div').attr('class','cameraDiv');
    }
    else {
        self.div = d3.select('#video').append('div').attr('class','cameraDiv');
    }


    if (paramObj){
        Object.keys(paramObj).forEach(function(k){self[k]=paramObj[k]})
    }
    
    self.xPixels = Math.round(self.xPixels / self.pixelDecimation);
    self.yPixels = Math.round(self.yPixels / self.pixelDecimation)
    
    // add a canvas to the document to display this data
    var displayScaleFactor = self.xPixelSize/6.5;

    self.canvas  = self.div
                    .append('div')
                    .attr('class','canvasHolder')
                    .style('border','3 px solid black')
                    .style('width', self.yPixels + 'px')
                    .append('canvas')
                    .attr('width', self.xPixels + ' px')
                    .attr('height', self.yPixels + ' px')



                    
                    // so original height is yPixels, new width is yPixels * displayScaleFactor
                    // so top/bottom margin of 1/2 of the difference (ypixels*displayScaleFactor - ypixels)
                    // or 0.5 * yPixels * (displayScaleFactor - 1)

                    
    function startDrag(){
        var thisDiv = d3.select(this)
        thisDiv.style('position','fixed')       
    }

    function dragging(){
        var currentTop = Number(d3.select(this).style('top').slice(0,-2))
        var currentLeft = Number(d3.select(this).style('left').slice(0,-2))
        d3.select(this).style('left', currentLeft + d3.event.dx + 'px')
        d3.select(this).style('top',currentTop + d3.event.dy + 'px')
        console.log(currentTop)
    }

    //self.div.call(d3.drag().on("start", startDrag).on('drag',dragging));


    var labelContainer = self.div.append('div').attr('class','labelContainer')
    
    labelContainer.append('p')
        .style('margin','0')
        .html(self.displayName)
        .attr('class','windowLabel')
        .attr('class','nameLabel')
    
    var readNoiseLabel = labelContainer.append('p')
        .style('margin','0')
        .html(self.readNoise + ' e<sup>-</sup> Read Noise')
        .attr('class','windowLabel')
    
    var QElabel = labelContainer.append('p')
        .style('margin','0')
        .html(Math.round(self.QE*100) + '% QE')
        .attr('class','windowLabel')
    
    self.updateQELabel = function(n){
        QElabel.html(Math.round(self.QE*100) + '% QE')
    }

    self.updateReadNoiseLabel = function(n){
        if (self.readNoise < 1){
            readNoiseLabel.html('<1 e<sup>-</sup> Read Noise')
            return
        }
        readNoiseLabel.html(self.readNoise + ' e<sup>-</sup> Read Noise')
    }

    self.updateFPSLabel = function(n){
        FPSlabel.html(self.frameRateHz + ' FPS')
    }

    // create image data
    self.simImage = new Arr2d(self.xPixels, self.yPixels, 0)

    this.updateData = function(){


        // start with a simple background of read noise, offset by 2 counts
        self.simImage.data = randnSample(numSamples = self.xPixels * self.yPixels, mu = self.offset, sigma = self.readNoise);

        // I'd like to add a feature which efficienty adds CIC noise.  I'd rather not roll each pixel
        // separately, but rather generate a random number of points based on the self.CIC property
        var nCicPoints = Math.round( poissonSample(self.xPixels * self.yPixels * self.CIC) );

        for (var i = 0; i < nCicPoints; i++){
            var xCoord = Math.floor( Math.random() * self.xPixels );
            var yCoord = Math.floor( Math.random() * self.yPixels );
            self.simImage.set(xCoord, yCoord, self.offset + (1+5*Math.random()));
        }


        // right now, this adds a gauss feature to the random readout noise data
        if (1){

            video.roi = [];

            var offsetX = Math.floor(self.xPixels/2);
            var offsetY = Math.floor(self.yPixels/2)
            var featureBrightness = video.featureBrightness  ;
            var fSigma = video.featureSigma; //feature sigma
            var q = 0;
            for (var i = 0; i < self.xPixels; i++){
                for (var j = 0 ; j < self.yPixels; j++){
                    var r = Math.sqrt( (j - offsetY + objPos[0])**2 + (i - offsetX + objPos[1])**2 )
                    //var amplitude = Math.exp( -1 * (r**2) / fSigma );
                    var amplitude = 0;
                    if (r**2 < video.featureSigma**2){
                        amplitude = 1;
                    }

                    var cutoff = 0.01;
                    if(amplitude*video.featureBrightness >= cutoff){
                        if (self.emGain == 0){
                            q = poissonSample( self.QE * video.featureBrightness * amplitude, 1)[0];

                        }

                        /*
                        if (self.emGain == 1){
                            q = poissonSample( self.QE * video.featureBrightness * amplitude, 1)[0];
                            q = poissonSample( q , 1)[0];
                        }
                        */

                        // add dark current if in slow mode


                        if (q<0){
                            console.log(amplitude, q);
                            throw new Error("Something went badly wrong!")
                        }
                    }

                    // 
                    if(amplitude < cutoff){
                          q = self.QE * video.featureBrightness * amplitude;
                    }
                        
                    var darkCounts = 0;
                    
                    if (video.mode == 'Slow'){
                        darkCounts =  poissonSample(self.darkCurrent * video.exposureTime, 1)[0]
                    }

                    self.simImage.set(i,j, q + darkCounts + self.simImage.get(i,j) );
                    
                    if (amplitude == 1){
                        video.roi.push(self.simImage.get(i,j))
                    }
                }
            }
        }
        // -------- end add gauss

    }

    this.draw = function(){
        var arr = self.simImage;

        // if in slow imaging mode, include the dark current in the color scale calculations
        if (video.mode == 'Slow'){
            var darkCounts = self.darkCurrent * video.exposureTime;
            arrMax = self.offset + 2*self.readNoise + (self.QE * video.featureBrightness) + Math.sqrt(self.QE * video.featureBrightness);//Math.max(...arr.data);
            arrMin = self.offset - 2*self.readNoise - Math.sqrt(darkCounts) + darkCounts;
            arrRange = arrMax - arrMin;
        }

        var canvas = this.canvas._groups[0][0];
        var context = canvas.getContext("2d");
        var scale = self.xPixelSize * self.displayScale;

        if (self.drawStyle){
            context.lineWidth = 0;
            context.strokeStyle = 'none'

            for (var i = 0; i < self.xPixels; i++){
                for (var j = 0; j < self.yPixels; j++){ 
                    var v = Math.round( 255*(arr.get(i,j)-arrMin)/arrRange );
                    context.fillStyle = `rgb(${v},${v},${v})`;
                    context.fillRect(i * scale, j * scale, scale, scale);
                }
            }
        }

        if (1){
            var img = new ImageData(self.xPixels, self.yPixels);
            for (var i = 0; i<img.data.length; i+=4){
                var k = Math.floor(i/4)%self.xPixels;
                var l = Math.floor ( Math.floor(i/4) / self.xPixels);
                var v = Math.round( 255*(arr.data[i/4]-arrMin)/arrRange );
                img.data[i+0] = v;
                img.data[i+1] = v;
                img.data[i+2] = v;
                img.data[i+3] = 255;
            }
            context.putImageData(img,0,0);
        }
    }

    this.remove = function(){
        self.div.remove();
    }


}



//2d array object to hold data

function Arr2d(n,m,val){
    
    var self = this;
    self.n = n;
    self.m = m;
    self.val = val;
    self.data = [];
    self.data.length = n*m;
    self.data.fill(val);
    self.length = self.data.length;
    
    self.get = function(i,j){
        return self.data[j*n + i];
    }

    self.set = function(i,j, v){
        self.data[j*n + i] = v;
    }

    self.mapData = function(f){
        self.data = self.data.map(f);
        return self
    }

    self.randomizeData = function(){
        self.data = randnSample(numSamples = self.n*self.m, mu = 2, sigma = 2)
    }
}


// timing variables
var start = null;
var delta = 0;

// add some sample cameras to the screen
var cameras = [new Camera()];



// show different cameras
if (1){

    d3.select('#mainContainer')
        .append('div')
        .attr('id','subContainer')

    
    //cameras.push(new Camera( cameraDefs['idus420']));
    //cameras.push(new Camera( cameraDefs['newton971']));
    //cameras.push(new Camera( cameraDefs['iXon888'] ));
    //cameras.push(new Camera( cameraDefs['zyla55'] ));
    //cameras.push(new Camera( cameraDefs['sona42'] ));
    //cameras.push(new Camera( cameraDefs['iKonM934-BEX2-DD'] ));


    // ikon m 934

    
}

// set up a matrix of parameters
if (0){
    var numRows = 3;
    var numCols = 4;

    for (var i = 0; i < numRows; i++){
        d3.select('#mainContainer')
            .append('div')
            .attr('id','subContainer'+i)
            .style('display','flex')
            .attr('class','subContainer')
    }

    for (var i=0; i<numRows; i++){
        for (var j = 0; j < numCols; j++){
            cameras.push(new Camera( {'readNoise':i*1, 'QE': 1 - j * 0.2, 'containerDivID' : 'subContainer'+i} ));
        }
    }
}
 
function startAnimation(timestamp) {
  if (!start) start = timestamp;
  start = timestamp;
  window.requestAnimationFrame(animate);
}

function modRange(a, lowerLim, upperLim){
    if (a > upperLim){
        return lowerLim;
    }
    if (a < lowerLim ){
        return upperLim;
    }
    return a;
}


// animate cameras
function animate(){
    var frameRateMultiplier = Math.min(...cameras.map(x=>(1/x.frameRateHz)));
    delta++;
    if (1){
        //delta = 0;
        //objPos[0] = modRange( objPos[0] + speedMultiplier * (Math.random() - 0.5), -32, 32);
        //objPos[1] = modRange( objPos[1] + speedMultiplier * (Math.random() - 0.5), -32, 32);

        function testFrameRate(cam){
            if ( (delta %  4 == 0) || delta == 1 ){
                cam.updateData();
                cam.draw();
                lineFunc();

            }
        }

        //cameras.forEach(x=>x.updateData());
        //cameras.forEach(x=>x.draw());
        cameras.forEach(testFrameRate)
    }
    window.requestAnimationFrame(animate);
}


// generate a frame to beforehand to avoid weird moire
cameras.forEach( function(x){
    x.draw()
} )

startAnimation();