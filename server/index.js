const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ========== OCR 引擎（PP-OCRv6 ONNX）==========
let ocrService = null;
let ocrInitializing = false;

async function getOcrService() {
  if (ocrService) return ocrService;
  if (ocrInitializing) {
    // 等待初始化完成
    while (ocrInitializing) await new Promise(r => setTimeout(r, 100));
    return ocrService;
  }
  ocrInitializing = true;
  try {
    const ort = require('onnxruntime-node');
    const { PaddleOcrService } = require('paddleocr');

    const modelsDir = path.join(__dirname, 'models');
    const detModel = fs.readFileSync(path.join(modelsDir, 'PP-OCRv6_small_det_infer.onnx'));
    const recModel = fs.readFileSync(path.join(modelsDir, 'PP-OCRv6_small_rec_infer.onnx'));
    const dictContent = fs.readFileSync(path.join(modelsDir, 'ppocrv6_dict.txt'), 'utf-8');
    // CTC 字典：模型输出 18710 类 = blank + 18708 字符 + space
    const lines = dictContent.split('\n').map(l => l.replace(/\r$/, ''));
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
    const charactersDictionary = ['blank', ...lines, ' '];

    ocrService = await PaddleOcrService.createInstance({
      ort,
      modelPreset: 'PP-OCRv6_small',
      detection: { modelBuffer: detModel },
      recognition: {
        modelBuffer: recModel,
        charactersDictionary,
      },
    });
    console.log('OCR 引擎初始化成功（PP-OCRv6_small）');
    return ocrService;
  } catch (err) {
    console.error('OCR 引擎初始化失败:', err.message);
    ocrService = null;
    throw err;
  } finally {
    ocrInitializing = false;
  }
}

// 模拟 AI 配置
const AI_CONFIG = {
  // 使用通义千问 API（替换为你的 API Key）
  provider: 'qwen', // qwen, openai, ernie
  apiKey: process.env.AI_API_KEY || 'your-api-key-here',
  baseUrl: process.env.AI_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
};

// 知识点数据库（人教版三年级）
const KNOWLEDGE_DB = {
  '三年级上册': [
    '时分秒', '万以内的加法和减法', '测量', '倍的认识',
    '多位数乘一位数', '长方形和正方形', '分数的初步认识',
    '数学广角——集合'
  ],
  '三年级下册': [
    '位置与方向', '除数是一位数的除法', '复式统计表',
    '两位数乘两位数', '面积', '年月日', '小数的初步认识',
    '数学广角——搭配'
  ]
};

// AI 对话接口（支持文本 + 板书图片）
app.post('/api/ai/chat', async (req, res) => {
  const { message, context, knowledgePoint, imageData } = req.body;

  if (!message && !imageData) {
    return res.status(400).json({ error: '消息或图片不能为空' });
  }

  try {
    const systemPrompt = `你是一个名叫"小聪"的小学生，正在向"小老师"（真实学生）学习数学知识。
你的特点是：
1. 认真听讲，偶尔会提出疑问
2. 不会直接给出答案，而是引导小老师进一步讲解
3. 会用简单的语言表达听不懂的地方
4. 给予正面反馈和鼓励

当前知识点：${knowledgePoint || '未指定'}
上下文：${context || '无'}

请用简短的语言（不超过50字）回应，模拟一个正在学习的小学生的反应。`;

    // 如果有板书图片，使用视觉模型直接理解
    if (imageData) {
      const aiResponse = await callVisionAI(systemPrompt, message || '请看看老师在黑板上写的内容', imageData);
      return res.json({
        reply: aiResponse,
        confidence: 0.9,
        suggestions: generateSuggestions(message, knowledgePoint)
      });
    }

    // 纯文本对话
    const aiResponse = await callAI(systemPrompt, message);
    res.json({
      reply: aiResponse,
      confidence: Math.random() * 0.3 + 0.7,
      suggestions: generateSuggestions(message, knowledgePoint)
    });
  } catch (error) {
    console.error('AI 调用失败:', error.message);
    res.json({
      reply: getMockReply(message),
      confidence: 0.8,
      suggestions: ['继续讲解下一步', '回顾前面内容']
    });
  }
});

// 获取知识点列表
app.get('/api/knowledge-points', (req, res) => {
  res.json(KNOWLEDGE_DB);
});

// 讲课质量评估
app.post('/api/ai/evaluate', async (req, res) => {
  const { transcript, knowledgePoint } = req.body;
  
  try {
    const systemPrompt = `请评估以下数学讲课内容的质量，从三个维度打分（0-100）：
1. 清晰度：讲解是否清楚易懂
2. 逻辑性：步骤是否有条理
3. 完整性：是否涵盖所有关键点

讲课内容：${transcript}
知识点：${knowledgePoint}

返回 JSON 格式：
{"clarity": 分数, "logic": 分数, "completeness": 分数, "comment": "评语"}`;

    const evaluation = await callAI(systemPrompt, '');
    res.json(evaluation);
  } catch (error) {
    // 模拟评估结果
    res.json({
      clarity: Math.floor(Math.random() * 20 + 75),
      logic: Math.floor(Math.random() * 20 + 70),
      completeness: Math.floor(Math.random() * 20 + 75),
      comment: '讲解整体不错，注意细节可以更完善。'
    });
  }
});

// 手写板书 OCR 识别（PP-OCRv6 本地推理）
app.post('/api/ocr/recognize', async (req, res) => {
  const { imageData } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: '图片数据不能为空' });
  }

  try {
    const sharp = require('sharp');
    const service = await getOcrService();

    // 解码 base64 图片为 RGBA 原始像素
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    const { data, info } = await sharp(imgBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 运行 OCR 识别
    const recognition = await service.recognize({
      width: info.width,
      height: info.height,
      data: new Uint8Array(data),
    });

    // 处理识别结果
    const result = service.processRecognition(recognition);

    res.json({
      text: result.text,
      confidence: result.confidence,
      lines: result.lines.map(line =>
        line.map(item => ({
          text: item.text,
          confidence: item.confidence,
          box: item.box,
        }))
      ),
    });
  } catch (error) {
    console.error('OCR 识别失败:', error.message);
    res.status(500).json({ error: '识别失败: ' + error.message });
  }
});

// 视觉 AI 调用（板书图片直接理解）
async function callVisionAI(systemPrompt, userMessage, imageData) {
  const apiKey = AI_CONFIG.apiKey;
  if (!apiKey || apiKey === 'your-api-key-here') {
    // 无 API Key 时降级为模拟回复
    const mockReplies = [
      '我看到黑板上写的内容了！这个算式我好像见过，能再解释一下吗？',
      '老师写的这个图我有点看不懂，能指一下哪里是重点吗？',
      '黑板上的内容我看到了，这一步是怎么算出来的呀？',
      '我看到你画的图了！这个是不是表示加法的意思？',
      '黑板上写的好多呀，你能给我讲讲最重要的那部分吗？'
    ];
    return mockReplies[Math.floor(Math.random() * mockReplies.length)];
  }

  // 调用通义千问 VL 视觉模型
  const response = await axios.post(
    `${AI_CONFIG.baseUrl}/chat/completions`,
    {
      model: 'qwen-vl-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageData } },
            { type: 'text', text: userMessage }
          ]
        }
      ],
      max_tokens: 200
    },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  return response.data.choices[0].message.content;
}

// 模拟 AI 调用
async function callAI(systemPrompt, userMessage) {
  const apiKey = AI_CONFIG.apiKey;
  if (!apiKey || apiKey === 'your-api-key-here') {
    const mockReplies = [
      '嗯...我好像有点明白了！那能不能再详细说说这一步？',
      '原来是这样！但是我还有点不太懂，为什么要先通分呢？',
      '哇，原来这么简单！那如果数字变大了怎么办？',
      '我明白了！那下一道题我们可以试试不一样的方法吗？',
      '这个我以前没学过，你能再讲一遍吗？'
    ];
    return mockReplies[Math.floor(Math.random() * mockReplies.length)];
  }

  const response = await axios.post(
    `${AI_CONFIG.baseUrl}/chat/completions`,
    {
      model: 'qwen-plus',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 200
    },
    { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
  );
  return response.data.choices[0].message.content;
}

function getMockReply(message) {
  const replies = [
    '嗯嗯，我听懂了！',
    '这一步是怎么来的呀？',
    '原来如此！那下一题呢？',
    '我觉得你说得对！',
    '等等，我还是有点不太明白...'
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function generateSuggestions(message, knowledgePoint) {
  return [
    '可以尝试用图示辅助讲解',
    '建议多举几个例子',
    '注意强调关键步骤'
  ];
}

// ========== TTS 文字转语音（Edge TTS 神经网络语音）==========
const { spawn } = require('child_process');

// 可选语音列表
const TTS_VOICES = {
  xiaoxiao: { name: 'zh-CN-XiaoxiaoNeural', rate: '+12%', pitch: '+30Hz', label: '晓晓（萝莉音）' },
  yunxi:    { name: 'zh-CN-YunxiNeural',    rate: '+5%', pitch: '+10Hz', label: '云希（小男孩）' },
};

app.post('/api/tts/synthesize', (req, res) => {
  const { text, voice } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: '文本不能为空' });
  }

  const voiceConfig = TTS_VOICES[voice] || TTS_VOICES.xiaoxiao;

  // 流式输出：edge-tts 写 stdout（--write-media -），直接 pipe 到响应，零临时文件
  const child = spawn('python', [
    '-m', 'edge_tts',
    '--voice', voiceConfig.name,
    '--rate', voiceConfig.rate,
    '--pitch', voiceConfig.pitch,
    '--text', text.trim(),
    '--write-media', '-'
  ]);

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Disposition', 'inline; filename="tts.mp3"');

  let hasData = false;
  let stderrBuf = '';

  child.stdout.on('data', () => { hasData = true; });
  child.stdout.pipe(res);

  child.stderr.on('data', (chunk) => { stderrBuf += chunk.toString(); });

  child.on('close', (code) => {
    if (code !== 0 && !hasData) {
      console.error('TTS 合成失败:', stderrBuf);
      if (!res.headersSent) {
        res.status(500).json({ error: 'TTS 合成失败: ' + stderrBuf });
      }
    }
    if (!res.writableEnded) res.end();
  });

  child.on('error', (err) => {
    console.error('TTS 进程启动失败:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'TTS 进程启动失败: ' + err.message });
    } else if (!res.writableEnded) {
      res.end();
    }
  });

  // 超时保护
  const timeout = setTimeout(() => {
    child.kill();
    if (!res.writableEnded) res.end();
  }, 15000);
  child.on('close', () => clearTimeout(timeout));
});

app.listen(PORT, () => {
  console.log(`AI 服务运行在 http://localhost:${PORT}`);
});
