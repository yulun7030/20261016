// 宣告存放所有題目與本次測驗題目的陣列
let allQuestions = [];
let questions = [];
let table; // 用於存放 CSV 檔案資料

let currentQuestion = 0;
let hasAnswered = false;
let currentAnswerCorrect = false;
let selectedAnswer = -1;
let score = 0;
let animationStartFrame = 0;
let canvasElement;
let lastTouchTime = -1000;
let canvasParent;

// 存放答對時的煙火/紙片粒子
let particles = [];

// 在程式開始前先載入 CSV 檔案
function preload() {
  table = loadTable('questions.csv', 'csv', 'header');
}

function setup() {
  // 將 CSV 資料轉換為物件陣列
  for (let r = 0; r < table.getRowCount(); r++) {
    let row = table.getRow(r);
    allQuestions.push({
      question: row.getString('question'),
      options: [
        row.getString('opt0'),
        row.getString('opt1'),
        row.getString('opt2'),
        row.getString('opt3')
      ],
      answer: int(row.getString('answer'))
    });
  }
  
  // 隨機打亂所有題目，並取出前 5 題
  shuffle(allQuestions, true);
  questions = allQuestions.slice(0, 5);

  document.documentElement.style.margin = "0";
  document.body.style.margin = "0";
  document.body.style.width = "100%";
  document.body.style.height = "100%";
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
  
  canvasParent = document.createElement("main");
  canvasParent.id = "p5-responsive-quiz-canvas";
  canvasParent.style.width = "100vw";
  canvasParent.style.height = "100vh";
  canvasParent.style.position = "fixed";
  canvasParent.style.left = "0";
  canvasParent.style.top = "0";
  canvasParent.style.touchAction = "none";
  document.body.appendChild(canvasParent);
  
  pixelDensity(getSafePixelDensity());
  canvasElement = createCanvas(getViewportWidth(), getViewportHeight());
  canvasElement.parent(canvasParent);
  canvasElement.elt.style.width = "100%";
  canvasElement.elt.style.height = "100%";
  canvasElement.elt.style.display = "block";
  
  textAlign(CENTER, CENTER);
  noStroke();
  getLayout();
}

function getViewportWidth() { return Math.max(1, Math.floor(window.innerWidth || windowWidth)); }
function getViewportHeight() { return Math.max(1, Math.floor(window.innerHeight || windowHeight)); }
function getSafePixelDensity() { const deviceRatio = Number(window.devicePixelRatio) || 1; return Math.min(Math.max(deviceRatio, 1), 2); }

function windowResized() {
  pixelDensity(getSafePixelDensity());
  resizeCanvas(getViewportWidth(), getViewportHeight());
  getCurrentInteractionLayout();
}

function wrapTextByWidth(sourceText, maxWidth, fontSize) {
  textSize(fontSize);
  const lines = [];
  let currentLine = "";
  for (let index = 0; index < sourceText.length; index += 1) {
    const character = sourceText.charAt(index);
    if (character === "\n") { lines.push(currentLine); currentLine = ""; continue; }
    const previewLine = currentLine + character;
    if (currentLine.length > 0 && textWidth(previewLine) > maxWidth) {
      lines.push(currentLine); currentLine = character;
    } else { currentLine = previewLine; }
  }
  if (currentLine.length > 0 || lines.length === 0) lines.push(currentLine);
  return lines;
}

function clampValue(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }

function getLayout() {
  const canvasWidth = Math.max(1, width);
  const canvasHeight = Math.max(1, height);
  const outerMargin = clampValue(Math.min(canvasWidth * 0.05, canvasHeight * 0.035), 6, 48);
  const isLandscape = canvasWidth > canvasHeight;
  const contentWidth = Math.max(1, canvasWidth - outerMargin * 2);
  let fitScale = clampValue(Math.min(canvasWidth / 480, canvasHeight / 760), 0.35, 1.15);
  let finalLayout = null;
  
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const titleSize = Math.max(12, Math.min(40, canvasWidth * 0.06, canvasHeight * 0.08) * fitScale);
    const progressSize = Math.max(8, Math.min(22, canvasWidth * 0.035, canvasHeight * 0.045) * fitScale);
    const headerTop = Math.max(5, outerMargin * 0.6);
    const titleY = headerTop + titleSize * 0.6;
    const progressY = titleY + titleSize * 0.8 + progressSize * 0.5;
    const headerGap = Math.max(5, Math.min(20, canvasHeight * 0.02) * fitScale);
    const questionTextSize = Math.max(10, Math.min(32, canvasWidth * 0.05, canvasHeight * 0.065) * fitScale);
    const questionWidth = Math.min(contentWidth, 900);
    const questionPadding = Math.max(10, Math.min(30, canvasWidth * 0.04) * fitScale);
    const questionTextWidth = Math.max(1, questionWidth - questionPadding * 2);
    const questionLines = wrapTextByWidth(questions[currentQuestion].question, questionTextWidth, questionTextSize);
    const questionLineHeight = Math.max(12, questionTextSize * 1.4);
    const questionHeight = Math.max(questionLineHeight + questionPadding * 2, questionLines.length * questionLineHeight + questionPadding * 2);
    const questionY = progressY + progressSize * 0.6 + headerGap;
    
    const optionTextSize = Math.max(9, Math.min(26, canvasWidth * 0.04, canvasHeight * 0.05) * fitScale);
    const optionWidth = Math.min(contentWidth, 720);
    const optionPadding = Math.max(6, Math.min(22, canvasWidth * 0.03) * fitScale);
    const optionTextWidth = Math.max(1, optionWidth - optionPadding * 2);
    const optionLineHeight = Math.max(10, optionTextSize * 1.3);
    const optionLines = [];
    let maximumOptionLines = 1;
    
    for (let optionIndex = 0; optionIndex < questions[currentQuestion].options.length; optionIndex += 1) {
      const optionLabel = String.fromCharCode(65 + optionIndex) + ". " + questions[currentQuestion].options[optionIndex];
      const currentLines = wrapTextByWidth(optionLabel, optionTextWidth, optionTextSize);
      optionLines.push(currentLines);
      maximumOptionLines = Math.max(maximumOptionLines, currentLines.length);
    }
    
    const optionHeight = Math.max(15, Math.min(70, Math.max(canvasHeight * 0.08, maximumOptionLines * optionLineHeight + optionPadding * 2)) * fitScale);
    const optionGap = Math.max(4, Math.min(24, canvasHeight * 0.022) * fitScale);
    const questionToOptionsGap = Math.max(8, Math.min(35, canvasHeight * 0.04) * fitScale);
    const firstOptionY = questionY + questionHeight + questionToOptionsGap;
    const buttonHeight = Math.max(25, Math.min(65, canvasHeight * 0.08) * fitScale);
    const buttonWidth = Math.min(optionWidth, Math.max(120, Math.min(300, canvasWidth * 0.5)) * fitScale);
    const buttonGap = Math.max(6, Math.min(30, canvasHeight * 0.035) * fitScale);
    const bottomMargin = Math.max(5, outerMargin * 0.6);
    const optionsHeight = questions[currentQuestion].options.length * optionHeight + (questions[currentQuestion].options.length - 1) * optionGap;
    const buttonAreaHeight = hasAnswered ? buttonGap + buttonHeight : 0;
    const requiredHeight = firstOptionY + optionsHeight + buttonAreaHeight + bottomMargin;
    const availableHeight = Math.max(1, canvasHeight);
    
    finalLayout = {
      canvasWidth, canvasHeight, titleSize, titleY, progressSize, progressY,
      question: { x: (canvasWidth - questionWidth) / 2, y: questionY, width: questionWidth, height: questionHeight, textSize: questionTextSize, lineHeight: questionLineHeight, lines: questionLines },
      options: [], optionLines, optionTextSize, optionLineHeight, optionWidth, optionHeight, optionGap,
      nextButton: { x: (canvasWidth - buttonWidth) / 2, y: Math.min(canvasHeight - bottomMargin - buttonHeight, firstOptionY + optionsHeight + buttonGap), width: buttonWidth, height: buttonHeight },
      buttonTextSize: Math.max(10, Math.min(24, buttonHeight * 0.4)), bottomMargin, scale: fitScale, requiredHeight
    };
    if (requiredHeight <= availableHeight - 1) break;
    fitScale = Math.max(0.22, fitScale * Math.min(0.92, (availableHeight - bottomMargin) / Math.max(requiredHeight, 1)));
  }
  
  const finalQuestion = questions[currentQuestion];
  const elapsedFrames = frameCount - animationStartFrame;
  const verticalAmplitude = hasAnswered && !currentAnswerCorrect ? Math.min(finalLayout.optionGap * 0.35, finalLayout.optionHeight * 0.18) : 0;
  const horizontalAmplitude = hasAnswered && !currentAnswerCorrect ? Math.min(14 * finalLayout.scale, Math.max(0, (canvasWidth - finalLayout.optionWidth) / 2 - 2)) : 0;
  
  for (let optionIndex = 0; optionIndex < finalQuestion.options.length; optionIndex += 1) {
    const baseY = finalLayout.question.y + finalLayout.question.height + Math.max(8, Math.min(35, finalLayout.canvasHeight * 0.04) * finalLayout.scale) + optionIndex * (finalLayout.optionHeight + finalLayout.optionGap);
    let horizontalOffset = 0, verticalOffset = 0;
    if (hasAnswered && !currentAnswerCorrect) {
      if (optionIndex === finalQuestion.answer) verticalOffset = Math.sin(elapsedFrames * 0.18) * verticalAmplitude;
      if (optionIndex === selectedAnswer) horizontalOffset = Math.sin(elapsedFrames * 0.22) * horizontalAmplitude;
    }
    finalLayout.options.push({
      index: optionIndex, x: (canvasWidth - finalLayout.optionWidth) / 2 + horizontalOffset, y: baseY + verticalOffset, width: finalLayout.optionWidth, height: finalLayout.optionHeight,
      lines: finalLayout.optionLines[optionIndex]
    });
  }
  return finalLayout;
}

function draw() {
  drawingContext.font = `24px "Changa One", "Liu Jian Mao Cao", cursive`;
  textFont('"Changa One", "Liu Jian Mao Cao", cursive');

  background("#fdfdfc");
  
  const layout = getCurrentInteractionLayout();
  if (currentQuestion >= questions.length) {
    drawResultScreen(layout);
    updateAndDrawParticles();
    return;
  }
  
  drawTitle(layout);
  drawQuestion(layout);
  drawOptions(layout);
  
  if (hasAnswered) {
    drawNextButton(layout);
  }
  
  updateAndDrawParticles();
}

function updateAndDrawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25;
    p.life -= 4;
    
    noStroke();
    let c = color(p.c);
    c.setAlpha(p.life);
    fill(c);
    circle(p.x, p.y, p.size);
    
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawTitle(layout) {
  fill("#4a4e69");
  textSize(layout.titleSize);
  textAlign(CENTER, CENTER);
  
  let floatY = sin(frameCount * 0.03) * 4;
  text("p5.js 程式設計指令練習測驗", layout.canvasWidth / 2, layout.titleY + floatY);
  
  textSize(layout.progressSize);
  fill("#9a8c98");
  text(`第 ${currentQuestion + 1} 題，共 ${questions.length} 題`, layout.canvasWidth / 2, layout.progressY);
}

function drawQuestion(layout) {
  drawingContext.shadowOffsetX = 0;
  drawingContext.shadowOffsetY = 6;
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.15)';
  
  let gradient = drawingContext.createLinearGradient(
    layout.question.x, layout.question.y, 
    layout.question.x + layout.question.width, layout.question.y + layout.question.height
  );
  
  gradient.addColorStop(0, "#ffb3c6");
  gradient.addColorStop(0.33, "#e4c1f9");
  gradient.addColorStop(0.66, "#a9def9");
  gradient.addColorStop(1, "#c8e6c9");
  
  drawingContext.fillStyle = gradient;
  rect(layout.question.x, layout.question.y, layout.question.width, layout.question.height, 16);
  
  drawingContext.shadowBlur = 0;
  drawingContext.shadowOffsetY = 0;

  fill("#4a4e69"); 
  textSize(layout.question.textSize);
  textAlign(CENTER, CENTER);
  
  const centerX = layout.question.x + layout.question.width / 2;
  const centerY = layout.question.y + layout.question.height / 2;
  
  for (let i = 0; i < layout.question.lines.length; i += 1) {
    const lineY = centerY + (i - (layout.question.lines.length - 1) / 2) * layout.question.lineHeight;
    text(layout.question.lines[i], centerX, lineY);
  }
}

function drawOptions(layout) {
  textSize(layout.optionTextSize);
  textAlign(CENTER, CENTER);
  
  for (let i = 0; i < layout.options.length; i += 1) {
    const option = layout.options[i];
    let isHovered = !hasAnswered && isPointInsideRectangle(mouseX, mouseY, option);
    let drawWidth = option.width;
    let drawHeight = option.height;
    let drawX = option.x;
    let drawY = option.y;

    if (isHovered) {
      drawWidth += 8; drawHeight += 4; drawX -= 4; drawY -= 2;
      drawingContext.shadowOffsetX = 0; drawingContext.shadowOffsetY = 6;
      drawingContext.shadowBlur = 12; drawingContext.shadowColor = 'rgba(0,0,0,0.1)';
      cursor('pointer');
    } else {
      drawingContext.shadowBlur = 0; drawingContext.shadowOffsetY = 0;
    }

    setOptionColor(i, isHovered);
    rect(drawX, drawY, drawWidth, drawHeight, 14);
    
    drawingContext.shadowBlur = 0; drawingContext.shadowOffsetY = 0;

    fill("#4a4e69");
    const lines = option.lines || [String.fromCharCode(65 + i) + ". " + questions[currentQuestion].options[i]];
    const textCenterY = drawY + drawHeight / 2;
    for (let j = 0; j < lines.length; j += 1) {
      const lineY = textCenterY + (j - (lines.length - 1) / 2) * layout.optionLineHeight;
      text(lines[j], drawX + drawWidth / 2, lineY);
    }
  }
  
  if (hasAnswered) cursor('default');
}

function setOptionColor(optionIndex, isHovered) {
  if (!hasAnswered) { fill(isHovered ? "#f2e9e4" : "#ffffff"); return; }
  const question = questions[currentQuestion];
  if (currentAnswerCorrect) {
    if (optionIndex === question.answer) fill("#c8e6c9"); else fill("#ffffff"); return;
  }
  if (optionIndex === question.answer) { fill("#fdffb6"); return; }
  if (optionIndex === selectedAnswer) { fill("#ffadad"); return; }
  fill("#ffffff");
}

function drawNextButton(layout) {
  drawingContext.shadowOffsetX = 0; drawingContext.shadowOffsetY = 4;
  drawingContext.shadowBlur = 10; drawingContext.shadowColor = 'rgba(77, 150, 255, 0.3)';

  let btnHover = isPointInsideRectangle(mouseX, mouseY, layout.nextButton);
  fill(btnHover ? "#3b7de8" : "#4d96ff"); 
  
  rect(layout.nextButton.x, layout.nextButton.y, layout.nextButton.width, layout.nextButton.height, 14);
  
  drawingContext.shadowBlur = 0; drawingContext.shadowOffsetY = 0;

  fill("#ffffff");
  textSize(layout.buttonTextSize);
  textAlign(CENTER, CENTER);
  const buttonLabel = currentQuestion === questions.length - 1 ? "查看結果" : "下一題";
  text(buttonLabel, layout.nextButton.x + layout.nextButton.width / 2, layout.nextButton.y + layout.nextButton.height / 2);
}

function drawResultScreen(layout) {
  fill("#4a4e69");
  textSize(layout.resultTitleSize);
  textAlign(CENTER, CENTER);
  
  let floatY = sin(frameCount * 0.05) * 6;
  text("測驗結束！", layout.canvasWidth / 2, layout.resultTitleY + floatY);
  
  textSize(layout.resultScoreSize);
  text(`你答對了 ${score} / ${questions.length} 題`, layout.canvasWidth / 2, layout.resultScoreY);
  
  let btnHover = isPointInsideRectangle(mouseX, mouseY, layout.restartButton);
  fill(btnHover ? "#3b7de8" : "#4d96ff");
  
  rect(layout.restartButton.x, layout.restartButton.y, layout.restartButton.width, layout.restartButton.height, 14);
  
  fill("#ffffff");
  textSize(layout.resultButtonTextSize);
  text("重新開始", layout.restartButton.x + layout.restartButton.width / 2, layout.restartButton.y + layout.restartButton.height / 2);
}

function getResultLayout() {
  const canvasWidth = Math.max(1, width);
  const canvasHeight = Math.max(1, height);
  const buttonWidth = Math.min(Math.max(120, canvasWidth * 0.46), 280);
  const buttonHeight = clampValue(Math.min(canvasHeight * 0.09, 60), 24, 60);
  return {
    canvasWidth, canvasHeight,
    resultTitleSize: clampValue(Math.min(canvasWidth * 0.08, canvasHeight * 0.12), 12, 48),
    resultTitleY: canvasHeight * 0.29,
    resultScoreSize: clampValue(Math.min(canvasWidth * 0.06, canvasHeight * 0.08), 10, 36),
    resultScoreY: canvasHeight * 0.43,
    restartButton: { x: (canvasWidth - buttonWidth) / 2, y: Math.min(canvasHeight * 0.62, canvasHeight - buttonHeight - 8), width: buttonWidth, height: buttonHeight },
    resultButtonTextSize: clampValue(buttonHeight * 0.38, 9, 22)
  };
}

function getCurrentInteractionLayout() {
  if (currentQuestion >= questions.length) return getResultLayout();
  return getLayout();
}

function mousePressed() {
  if (millis() - lastTouchTime < 500) return false;
  handleInput(mouseX, mouseY);
  return false;
}

function touchStarted() {
  lastTouchTime = millis();
  handleInput(mouseX, mouseY);
  return false;
}

function isPointInsideRectangle(inputX, inputY, rectangle) {
  return inputX >= rectangle.x && inputX <= rectangle.x + rectangle.width && inputY >= rectangle.y && inputY <= rectangle.y + rectangle.height;
}

function handleInput(inputX, inputY) {
  const layout = getCurrentInteractionLayout();
  
  if (currentQuestion >= questions.length) {
    if (isPointInsideRectangle(inputX, inputY, layout.restartButton)) {
      // 重新抽 5 題
      shuffle(allQuestions, true);
      questions = allQuestions.slice(0, 5);
      
      currentQuestion = 0; score = 0; hasAnswered = false; currentAnswerCorrect = false; selectedAnswer = -1; animationStartFrame = frameCount; particles = [];
    }
    return;
  }
  
  if (hasAnswered) {
    if (isPointInsideRectangle(inputX, inputY, layout.nextButton)) {
      currentQuestion += 1; hasAnswered = false; currentAnswerCorrect = false; selectedAnswer = -1; animationStartFrame = frameCount;
    }
    return;
  }
  
  for (let i = 0; i < layout.options.length; i += 1) {
    const option = layout.options[i];
    if (isPointInsideRectangle(inputX, inputY, option)) {
      selectedAnswer = i;
      hasAnswered = true;
      animationStartFrame = frameCount;
      currentAnswerCorrect = i === questions[currentQuestion].answer;
      
      if (currentAnswerCorrect) {
        score += 1;
        let macaronColors = ['#ffb3c6', '#a9def9', '#e4c1f9', '#fcf6bd', '#c8e6c9'];
        for (let p = 0; p < 40; p++) {
          particles.push({
            x: inputX, y: inputY,
            vx: random(-8, 8), vy: random(-10, -3),
            size: random(6, 12),
            c: random(macaronColors),
            life: 255
          });
        }
      }
      break;
    }
  }
}