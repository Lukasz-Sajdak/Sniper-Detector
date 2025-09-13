let microphones = [];
let source;
let draggingSource = false;
let shootButton, resetButton;

const totalDistanceM = 20; // full screen = 20 meters
let pixelToMeter;
const v = 343; // speed of sound in m/s

let waveStartTime;
let waveProgress = 0;
let firstMicIndex = 0;
let shotFired = false;
let animationDone = false;

// Simulated time differences between microphones
let dt = [0, 0, 0, 0, 0, 0];

// Flags for drawing reference lines
let showMicLines = true;
let showSourceLine = true;


function setup() {
  createCanvas(windowWidth, windowHeight - 50);
  pixelToMeter = totalDistanceM / width;
  initElements();

  shootButton = createButton('Start');
  shootButton.position(10, 10);
  styleButton(shootButton, '#4CAF50');
  shootButton.mousePressed(() => {
    shotFired = true;
    animationDone = false;
    waveStartTime = millis();
    waveProgress = 0;

    // Compute distances from source to each microphone
    let distances = microphones.map(mic => dist(source.x, source.y, mic.x, mic.y) * pixelToMeter);

    // Compute simulated time differences of arrival (TDOA)
    dt[0] = (distances[1] - distances[0]) / v;
    dt[1] = (distances[2] - distances[0]) / v;
    dt[2] = (distances[3] - distances[0]) / v;
    dt[3] = (distances[2] - distances[1]) / v;
    dt[4] = (distances[3] - distances[1]) / v;
    dt[5] = (distances[3] - distances[2]) / v;

    showMicLines = false;
    showSourceLine = false;
  });

  resetButton = createButton('Reset');
  resetButton.position(120, 10);
  styleButton(resetButton, '#f44336');
  resetButton.mousePressed(() => {
    initElements();
    shotFired = false;
    animationDone = false;
    showMicLines = true;
    showSourceLine = true;
  });
}

function styleButton(btn, bgColor) {
  btn.style('font-size', '16px');
  btn.style('padding', '10px 20px');
  btn.style('background-color', bgColor);
  btn.style('color', 'white');
  btn.style('border', 'none');
  btn.style('border-radius', '8px');
  btn.style('cursor', 'pointer');
}

function initElements() {
  microphones = [];
  let centerX = width * 0.7;
  let centerY = height * 0.5;
  let spacing = 100;

  microphones.push(createVector(centerX - spacing, centerY - spacing));
  microphones.push(createVector(centerX + spacing, centerY - spacing));
  microphones.push(createVector(centerX - spacing, centerY + spacing));
  microphones.push(createVector(centerX + spacing, centerY + spacing));

  // Initial source position
  source = createVector(centerX - 600, centerY);
}

function draw() {
  background(240);

  fill(0);
  noStroke();
  textSize(16);
  text("You can drag microphones (blue) and the sound source (red)", 10, 70);
  text("Click 'Start' to simulate a shot", 10, 90);

  drawScale();

  // Draw microphones
  fill(0, 0, 255);
  for (let mic of microphones) ellipse(mic.x, mic.y, 20, 20);

  // Draw microphone indices
  let centerMic = createVector(
    microphones.reduce((sum, m) => sum + m.x, 0) / microphones.length,
    microphones.reduce((sum, m) => sum + m.y, 0) / microphones.length
  );
  fill(0, 0, 255);
  textSize(14);
  for (let i = 0; i < microphones.length; i++) {
    let mic = microphones[i];
    ellipse(mic.x, mic.y, 20, 20);
    fill(0);
    text(i, mic.x + 12, mic.y + 5);
    fill(0, 0, 255);
  }

  // Draw microphone connection lines
  if (showMicLines) {
    for (let i = 0; i < microphones.length; i++) {
      for (let j = i + 1; j < microphones.length; j++) {
        let micA = microphones[i];
        let micB = microphones[j];
        push();
        stroke(0, 150, 0);
        strokeWeight(3);
        line(micA.x, micA.y, micB.x, micB.y);
        pop();

        push();
        noStroke();
        fill(0);
        textSize(14);
        let d = dist(micA.x, micA.y, micB.x, micB.y) * pixelToMeter;
        text(d.toFixed(2) + " m", (micA.x + micB.x) / 2, (micA.y + micB.y) / 2 - 10);
        pop();
      }
    }
  }

  // Draw sound source
  fill(255, 0, 0);
  ellipse(source.x, source.y, 30, 30);

  // Line between source and array center
  if (showSourceLine) {
    stroke(0, 0, 0, 150);
    strokeWeight(2);
    line(source.x, source.y, centerMic.x, centerMic.y);

    noStroke();
    fill(0);
    let distSourceCenter = dist(source.x, source.y, centerMic.x, centerMic.y) * pixelToMeter;
    text(distSourceCenter.toFixed(2) + " m", (source.x + centerMic.x) / 2 + 5, (source.y + centerMic.y) / 2 - 5);
  }

  let centerHyper = null;

  if (shotFired) {
    let distances = microphones.map(mic => dist(source.x, source.y, mic.x, mic.y));
    firstMicIndex = distances.indexOf(min(distances));

    // Progress of the expanding wave
    waveProgress = ((millis() - waveStartTime) / 1000) * v / pixelToMeter * 0.02;
    let maxDistance = max(distances);
    if (waveProgress >= maxDistance) {
      waveProgress = maxDistance;
      animationDone = true;
    }

    // Draw propagation lines
    for (let i = 0; i < microphones.length; i++) {
      let mic = microphones[i];
      let d = distances[i];
      let ratio = constrain(waveProgress / d, 0, 1);

      push();
      stroke(0);
      strokeWeight(1);
      drawingContext.setLineDash([5, 5]);
      line(source.x, source.y, source.x + (mic.x - source.x) * ratio, source.y + (mic.y - source.y) * ratio);
      drawingContext.setLineDash([]);
      pop();

      if (ratio >= 1) {
        fill(0);
        noStroke();
        textSize(14);
        if (i === firstMicIndex) text("Received", mic.x + 10, mic.y - 10);
        else {
          let dtText = ((d - distances[firstMicIndex]) * pixelToMeter / v).toFixed(3);
          text("Δt =" + dtText + " s", mic.x + 10, mic.y - 10);
        }
      }
    }

    // After propagation is finished → draw hyperbolas and estimate source
    if (animationDone) {
      let colArr = [
        color(255, 0, 0, 100), color(0, 255, 0, 100), color(0, 0, 255, 100),
        color(255, 165, 0, 100), color(255, 0, 255, 100), color(0, 255, 255, 100)
      ];

      let k = 0;
      for (let i = 0; i < microphones.length; i++) {
        for (let j = i + 1; j < microphones.length; j++) {
          drawHyperbola(microphones[i], microphones[j], dt[k] * v, colArr[k]);
          k++;
        }
      }

      // Brute-force hyperbola intersection search
      let intersectionPoints = [];
      let tolerance = 0.2;
      for (let x = 0; x < width; x += 5) {
        for (let y = 0; y < height; y += 5) {
          let valid = true;
          let idx = 0;
          for (let i = 0; i < microphones.length; i++) {
            for (let j = i + 1; j < microphones.length; j++) {
              let dA = dist(x, y, microphones[i].x, microphones[i].y) * pixelToMeter;
              let dB = dist(x, y, microphones[j].x, microphones[j].y) * pixelToMeter;
              if (abs((dB - dA) - dt[idx] * v) > tolerance) valid = false;
              idx++;
            }
          }
          if (valid) intersectionPoints.push(createVector(x, y));
        }
      }

      if (intersectionPoints.length > 0) {
        fill(0, 255, 0, 150);
        noStroke();
        for (let p of intersectionPoints) ellipse(p.x, p.y, 6, 6);

        let sumX = 0, sumY = 0;
        for (let p of intersectionPoints) {
          sumX += p.x;
          sumY += p.y;
        }
        centerHyper = createVector(sumX / intersectionPoints.length, sumY / intersectionPoints.length);

        // Draw estimated direction arrow
        let arrowLength = 50;
        let dir = p5.Vector.sub(centerHyper, centerMic).normalize().mult(arrowLength);
        let tip = p5.Vector.add(centerMic, dir);
        drawArrow(centerMic, tip);
      }
    }
  }

  if (centerHyper) drawOperatorConsole(centerMic, centerHyper);
}

function drawHyperbola(micA, micB, deltaD, col) {
  stroke(col);
  noFill();
  strokeWeight(1);
  for (let x = 0; x < width; x += 2) {
    for (let y = 0; y < height; y += 2) {
      let dA = dist(x, y, micA.x, micA.y) * pixelToMeter;
      let dB = dist(x, y, micB.x, micB.y) * pixelToMeter;
      if (abs((dB - dA) - deltaD) < 0.2) point(x, y);
    }
  }
}

function drawArrow(base, tip) {
  push();
  stroke(255, 0, 0);
  strokeWeight(4);
  fill(255, 0, 0);
  line(base.x, base.y, tip.x, tip.y);

  let angle = atan2(tip.y - base.y, tip.x - base.x);
  let arrowSize = 15;
  translate(tip.x, tip.y);
  rotate(angle);
  triangle(0, 0, -arrowSize, arrowSize / 2, -arrowSize, -arrowSize / 2);
  pop();
}

function mouseDragged() {
  if (shotFired && animationDone) return;
  for (let mic of microphones) if (dist(mouseX, mouseY, mic.x, mic.y) < 15) mic.set(mouseX, mouseY);
  if (draggingSource) source.set(mouseX, mouseY);
}

function mousePressed() {
  if (dist(mouseX, mouseY, source.x, source.y) < 15) draggingSource = true;
}

function mouseReleased() {
  draggingSource = false;
}

function drawScale() {
  stroke(0);
  fill(0);
  let scaleX = 50;
  let scaleY = height - 40;
  let scaleLength = width * (2 / totalDistanceM);

  line(scaleX, scaleY, scaleX + scaleLength, scaleY);
  for (let i = 0; i <= 2; i++) {
    let x = scaleX + i * (scaleLength / 2);
    line(x, scaleY - 5, x, scaleY + 5);
    text(i + " m", x - 10, scaleY + 20);
  }
  text("Scale", scaleX, scaleY - 10);
}

function drawOperatorConsole(centerMic, centerHyper) {
  let x = width - 250;
  let y = 20;

  fill(230);
  stroke(0);
  strokeWeight(1);
  rect(x, y, 240, 220, 10); // increased height for more info

  fill(0);
  noStroke();
  textSize(14);
  text("Operator Console", x + 10, y + 20);

  // Ground truth values
  let trueDistance = dist(centerMic.x, centerMic.y, source.x, source.y) * pixelToMeter;
  let trueAngle = degrees(atan2(source.y - centerMic.y, source.x - centerMic.x));
  text("True Distance: " + trueDistance.toFixed(2) + " m", x + 10, y + 45);
  text("True Angle: " + trueAngle.toFixed(1) + "°", x + 10, y + 65);

  // Estimated values
  let estimatedDistance = dist(centerMic.x, centerMic.y, centerHyper.x, centerHyper.y) * pixelToMeter;
  let estimatedAngle = degrees(atan2(centerHyper.y - centerMic.y, centerHyper.x - centerMic.x));
  text("Estimated Distance: " + estimatedDistance.toFixed(2) + " m", x + 10, y + 90);
  text("Estimated Angle: " + estimatedAngle.toFixed(1) + "°", x + 10, y + 110);

  // Color legend
  let colArr = [
    "Red (0-1)", "Green (0-2)", "Blue (0-3)",
    "Orange (1-2)", "Magenta (1-3)", "Cyan (2-3)"
  ];
  for (let i = 0; i < colArr.length; i++) {
    fill([
      color(255,0,0), color(0,255,0), color(0,0,255),
      color(255,165,0), color(255,0,255), color(0,255,255)
    ][i]);
    rect(x + 10, y + 125 + i * 15, 10, 10);
    fill(0);
    text(colArr[i], x + 25, y + 135 + i * 15);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight - 50);
  pixelToMeter = totalDistanceM / width;
}
