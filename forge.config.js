const path = require('path')

module.exports = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.virtualdatacenter.scheduler',
    appCategoryType: 'public.app-category.business',
    executableName: process.platform === 'darwin'
      ? '虚拟数据中心原位调度子系统'
      : 'virtual-data-center',
    icon: process.platform === 'win32'
      ? path.join(__dirname, 'public', 'favicon.ico')
      : undefined,
    ignore: [
      /^\/src($|\/)/,
      /^\/public($|\/)/,
      /^\/tests($|\/)/,
      /^\/mock($|\/)/,
      /^\/k8s($|\/)/,
      /^\/scripts($|\/)/,
      /^\/node_modules($|\/)/,
      /^\/.github($|\/)/,
      /^\/.git($|\/)/
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'virtual_data_center',
        setupExe: '虚拟数据中心原位调度子系统-Setup.exe'
      },
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux']
    }
  ]
}
