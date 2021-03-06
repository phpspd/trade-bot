'use strict';

let datesHelper = require('../../utils/dates-helper')
    ;


const MS_IN_DAY = 24 * 60 * 60 * 1000
    ;

/**
 * 
 * @param {Security} security - object of Security class
 * @param {number} n - days in history before last line
 */
function SimpleMovingAverage (security, n) {
    this.security = security;
    this.n = n;
}

SimpleMovingAverage.prototype._calc = function(daysBeforeNow) {
    daysBeforeNow = daysBeforeNow || 0;

    let n = this.n;
    let history = this.security.history.filter((item) => { return item.CLOSE > 0 });
    let length = history.length;
    history = history.slice(length - n - daysBeforeNow, length - daysBeforeNow);

    if (history.length != n) {
        n = history.length;
    }

    let sum = history.reduce((sum, item) => {
        return sum + item.CLOSE;
    }, 0);

    let val = sum / n;

    return val;
}

SimpleMovingAverage.prototype.getValue = function(daysBeforeNow) {
    return this._calc(daysBeforeNow);
}

module.exports = SimpleMovingAverage;