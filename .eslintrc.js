module.exports = {
  extends: 'airbnb-base',
  rules: {
    'prefer-arrow-callback': 'off',
    'space-before-function-paren': 'off',
    'func-names': 'off',
    'global-require': 'off',
    'no-underscore-dangle': 'off',
    'guard-for-in': 'off',
    'no-param-reassign': 'off',

    'max-len': ["error", 160],
    'array-bracket-spacing': [ 'error', 'always' ],

    'no-restricted-syntax': [
      'error',
      'LabeledStatement',
      'WithStatement',
    ], 
  },
  env: {
    node: true,
  }
};