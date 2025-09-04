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
