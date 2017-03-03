/**
 * Created by Scurab on 27/02/2017.
 */
"use strict";

module.exports = (app) => {
    app.use('/', require('./index'));
    app.use('/users', require('./users'));
    app.use('/chat', require('./chat'));
    app.use('/form', require('./form'));
};