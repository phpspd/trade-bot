let Security = require('../classes/security')
    ;

function Strategy(caption, initCb, tickCb) {
    this.caption = caption;
    this.securities = [];
    this.initCb = initCb;
    this.tickCb = tickCb;
}

Strategy.prototype.init = async function() {
    await this.initCb.call(this);
}

Strategy.prototype._tick = async function() {
    return await this.tickCb.call(this, this._onTickFinished);
}

Strategy.prototype._onTickFinished = function (data) {
    console.log(data);
    return data;
}

Strategy.prototype.addSecurity = async function(ISIN, engine, market, board) {
    if (!ISIN || !engine || !market || !board) {
        throw new Error('ISIN, engine, market, board required');
    }
    let security = new Security(ISIN, engine, market, board);
    await security.init();
    this.securities.push(security);
}

Strategy.prototype.getSecurity = function(ISIN) {
    for (let i in this.securities) {
        let security = this.securities[i];
        if (security.getISIN() == ISIN) {
            return security;
        }
    }
    return false;
}

Strategy.prototype.removeSecurity = function (ISIN) {
    for (let i in this.securities) {
        let security = this.securities[i];
        if (security.getISIN() == ISIN) {
            this.securities = [].concat(this.securities.slice(0, i), this.securities.slice(i + 1));
            return true;
        }
    }
    return false;
}

module.exports = Strategy;