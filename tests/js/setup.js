// Make jQuery and Bootstrap available as browser globals for every unit test.
global.$ = global.jQuery = require('jquery');
require('bootstrap');

// Disable Bootstrap transitions so tests do not depend on animation timing.
$.support.transition = false;
