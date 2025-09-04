const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
require('dotenv').config();
module.exports = {
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'zhuang1125',
          name: 'ElectronDemoApp01'
        },
        prerelease: true,
        createRelease: true,
        draft: false
      }
    }
  ],
  // 添加自定义发布配置到本地 IIS
  hooks: {
    postMake: async (forgeConfig, makeResults) => {
      const fs = require('fs');
      const path = require('path');
      
      // IIS 发布目录
      const iisPublishDir = 'C:\\inetpub\\wwwroot\\electron-updates';
      
      // 创建 IIS 发布目录（如果不存在）
      if (!fs.existsSync(iisPublishDir)) {
        fs.mkdirSync(iisPublishDir, { recursive: true });
      }
      
      // 复制构建文件到 IIS 目录
      makeResults.forEach(result => {
        const artifacts = result.artifacts;
        artifacts.forEach(artifact => {
          const destPath = path.join(iisPublishDir, path.basename(artifact));
          fs.copyFileSync(artifact, destPath);
          console.log(`复制 ${artifact} 到 ${destPath}`);
        });
      });
      
      // 生成 latest.yml 文件并复制到 IIS 目录
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
      const version = packageJson.version;
      
      // 查找 Squirrel.Windows 构建目录中的 RELEASES 文件
      const squirrelDir = path.join(__dirname, 'out', 'make', 'squirrel.windows', 'x64');
      const releasesFile = path.join(squirrelDir, 'RELEASES');
      
      if (fs.existsSync(releasesFile)) {
        // 读取RELEASES文件内容
        const releasesContent = fs.readFileSync(releasesFile, 'utf8').trim();
        const lines = releasesContent.split('\n');
        
        if (lines.length > 0) {
          const line = lines[0].trim();
          const parts = line.split(' ');
          
          if (parts.length >= 2) {
            const sha256 = parts[0];
            const filename = parts[1];
            const fileSize = parts[2] || '0';
            
            // 计算文件的实际大小
            let actualFileSize = fileSize;
            if (fileSize === '0') {
              const filePath = path.join(squirrelDir, filename);
              if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                actualFileSize = stats.size.toString();
              }
            }
            
            // 生成latest.yml内容
            const latestYml = `
version: ${version}
path: ${filename}
sha256: ${sha256}
size: ${actualFileSize}
releaseDate: '${new Date().toISOString()}'
`.trim();
            
            // 写入latest.yml文件到构建目录
            const latestYmlPath = path.join(squirrelDir, 'latest.yml');
            fs.writeFileSync(latestYmlPath, latestYml);
            
            // 复制latest.yml到IIS目录
            const iisLatestYmlPath = path.join(iisPublishDir, 'latest.yml');
            fs.copyFileSync(latestYmlPath, iisLatestYmlPath);
            
            console.log(`✅ 已生成并复制 latest.yml 到 ${iisLatestYmlPath}`);
            console.log(`📄 latest.yml 内容:`);
            console.log(latestYml);
          }
        }
      } else {
        console.warn('⚠️  未找到 RELEASES 文件:', releasesFile);
      }
      
      console.log('发布完成到 IIS 目录:', iisPublishDir);
      return makeResults;
    }
  },
  packagerConfig: {
    asar: true,
    extraResource: [
      'node_modules/electron/dist/locales/zh-CN.pak',
      'node_modules/electron/dist/locales/en-US.pak'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
