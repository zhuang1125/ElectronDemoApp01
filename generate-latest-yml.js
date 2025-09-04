const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 读取package.json获取版本信息
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = packageJson.version;
const appName = packageJson.productName || packageJson.name;

// 构建输出路径
const outputDir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');
const releasesFile = path.join(outputDir, 'RELEASES');

if (!fs.existsSync(releasesFile)) {
  console.error('RELEASES文件不存在:', releasesFile);
  process.exit(1);
}

// 读取RELEASES文件内容
const releasesContent = fs.readFileSync(releasesFile, 'utf8').trim();
const lines = releasesContent.split('\n');

if (lines.length === 0) {
  console.error('RELEASES文件为空');
  process.exit(1);
}

// 解析RELEASES文件（通常只有一行）
const line = lines[0].trim();
const parts = line.split(' ');
if (parts.length < 2) {
  console.error('RELEASES文件格式不正确');
  process.exit(1);
}

const sha256 = parts[0];
const filename = parts[1];
const fileSize = parts[2] || '0';

// 计算文件的实际大小（如果不存在于RELEASES中）
let actualFileSize = fileSize;
if (fileSize === '0') {
  const filePath = path.join(outputDir, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    actualFileSize = stats.size.toString();
  }
}

// 生成文件的sha512校验和
const filePath = path.join(outputDir, filename);
let sha512 = '';
if (fs.existsSync(filePath)) {
  const fileBuffer = fs.readFileSync(filePath);
  sha512 = crypto.createHash('sha512').update(fileBuffer).digest('hex');
}

// 生成latest.yml内容（electron-updater需要的格式）
const latestYml = `
version: ${version}
files:
  - url: ${filename}
    sha512: ${sha512}
    size: ${actualFileSize}
path: ${filename}
sha256: ${sha256}
sha512: ${sha512}
size: ${actualFileSize}
releaseDate: '${new Date().toISOString()}'
`.trim();

// 写入latest.yml文件
const latestYmlPath = path.join(outputDir, 'latest.yml');
fs.writeFileSync(latestYmlPath, latestYml);

console.log(`✅ 已生成 latest.yml 文件: ${latestYmlPath}`);
console.log(`📄 内容:`);
console.log(latestYml);