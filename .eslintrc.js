module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true,
        "mocha": true,
        "jquery": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "sourceType": "module"
    },
    "rules": {
        "indent": ["error", 4],
        "linebreak-style": ["error", "windows"],
        "semi": ["error", "always"],
        "no-console": ["off"],
        "no-unused-vars": ["warn", {"vars": "all", "args": "after-used", "ignoreRestSiblings": false}],
        "indent": ["off"]
    }
};