const sharp = require('sharp');
const http = require('http');

const svg = [
  '<svg width="400" height="100">',
  '<rect width="400" height="100" fill="white"/>',
  '<text x="20" y="60" font-size="36" fill="black">Hello 123</text>',
  '</svg>'
].join('');

sharp(Buffer.from(svg)).png().toBuffer().then(buf => {
  const b64 = buf.toString('base64');
  const body = JSON.stringify({ imageData: 'data:image/png;base64,' + b64 });

  const req = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/ocr/recognize',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Response:', d);
    });
  });

  req.on('error', e => console.error('Request error:', e.message));
  req.write(body);
  req.end();
}).catch(err => console.error('Sharp error:', err.message));