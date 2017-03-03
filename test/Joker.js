/**
 * Created by Scurab on 01/03/2017.
 */

module.exports = new Proxy({},
    {
        get: function (target, prop) {
            return (target[prop] === undefined) ? () => 0 : target[prop];
        }
    });