module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module'
  },
  extends: ['eslint:recommended'],
  env: {
    browser: true,
    commonjs: true,
    node: true
  },
  globals: {
    Buffer: true
  },
  rules: {
    'no-console': 'off'
  }
};
