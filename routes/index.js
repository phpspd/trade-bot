var express = require('express');
var router = express.Router();

let mainCtrl = require('../controllers/main')
    ;

router.all('*', mainCtrl.common);

router.get('/', mainCtrl.tests);

router.get('/strategy/*', mainCtrl.strategy);

router.all('*', mainCtrl.commonEnd);

module.exports = router;
