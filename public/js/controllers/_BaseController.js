/**
 * Created by Scurab on 28/02/2017.
 */
"use strict";
define(() => {
    return class BaseController extends EventEmitter{
        constructor() {
            super();
        }

        onStart(el) {
            this.onBind(el);
        }

        onBind(el) {
            if (typeof this["_pageObject"] === "function") {
                const obj = this._pageObject();
                for (let key in obj) {
                    let selector = obj[key];
                    this[key] = $(el).find(selector);
                }
            }
        }
    };
});