'use strict';

let ctrlName = 'main'
    , views = require('../utils/views')(ctrlName)
    ;

/**
 * Method: ALL
 * URI: *
 * */
module.exports.common = function (req, res, next) {
    res.viewData = {};
    
    res.viewData.errors = [];

    next();
}

module.exports.strategy = async function (req, res, next) {
    try {
        let strategyName = req._parsedUrl.pathname.split('/').pop()
            , view = 'strategy'
            , viewData = {}
            ;

        res.viewData.layout = 'layout';

        let Strategy = require('../classes/strategy')
            , strategyClass = require('../strategies/' + strategyName)
            ;

        let strategy = new Strategy(strategyName, strategyClass.init, strategyClass.tick);
        await strategy.init();

        let tickData = await strategy._tick();
        let graphics = {
            data: JSON.stringify(tickData)
        };
        graphics.isins = Object.keys(tickData.items);
        viewData.graphics = graphics;

        res.viewData.content = views.render(view, viewData);
        if (!res.viewData.content) {
            res.viewData.content = 'Not found';
        }

        return next();
    } catch (err) {
        console.log(err);
    }
}

module.exports.tests = async function (req, res, next) {
    let Micex = require('micex.api')
        , view = 'tests'
        , viewData = {}
        ;

    res.viewData.layout = 'layout';

    let security = await Micex.securityMarketdata('AFLT');
    console.log(security);

    res.viewData.content = views.render(view, viewData);
    if (!res.viewData.content) {
        return next(new HttpError(404, 'Not found'));
    }

    return next();
}

/**
 * Method: ALL
 * URI: *
 * */
exports.commonEnd = function (req, res, next) {
    if (!res.viewData || !res.viewData.layout) {
        return next();
    }

    return res.render(res.viewData.layout, res.viewData, res.viewData.partials || null);
}