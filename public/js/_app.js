/**
 * Created by Scurab on 28/02/2017.
 */
"use strict";
$(() => {
    requirejs.config({
        baseUrl: 'js',
        paths: {
            app: '../'
        }
    });

    let ctrls = $("[data-controller]").toArray();
    _.each(ctrls, (el) => {
        var controller = $(el).attr("data-controller");
        if(controller) {
            requirejs([`controllers/${controller}`], (Controller) => {
                var ctrl = new Controller();
                ctrl.onStart(el);
            });
        }
    });
});