// --------------------------------------------------------------------------------
// Programmer: Jason Thorpe
// Language:   typescript
// Purpose:    
// Comments:   
// --------------------------------------------------------------------------------
"use strict";
/// <reference path="./typings/node/node.d.ts" />
var mongoose = require('mongoose');
var AJV = require('ajv');
var ValidationError = mongoose.Error.ValidationError;
var ValidatorError = mongoose.Error.ValidatorError;
function ajv_plugin(schema, options) {
    // GET THE AJV INSTANCE
    var ajv = (options && options.ajv) || new AJV();
    // COMPILE THE OVERALL DOCUMENT SCHEMA
    var SCHEMA = options && options.schema && ajv.compile(options.schema);
    // COMPILE THE ATTRIBUTE SCHEMA
    var schemata = {};
    schema.eachPath(function (key) {
        if (!schema.paths[key].options.schema) {
            return;
        }
        try {
            var $schema = ajv.compile(schema.paths[key].options.schema);
        }
        catch (err) {
            throw new Error("Failed to compile schema for path \"" + key + "\" error message: " + err.message + " ");
        }
        schemata[key] = $schema;
    });
    schema.post('validate', function (data, next) {
        try {
            // APPLY THE OVERALL DOCUMENT SCHEMA
            if (SCHEMA && !SCHEMA(data)) {
                var error = new ValidationError(data);
                error.message += "; instance data does not match the JSON-schema";
                error.errors.record = new ValidatorError('record', 'Overall object does not match JSON-schema', 'notvalid', data);
                error.errors.record.errors = SCHEMA.errors;
                return next(error);
            }
            // APPLY THE ATTRIBUTE SCHEMA
            for (var key in schemata) {
                if (data[key] === undefined) {
                    // use the existing `required` validator for validating the presence of the attribute
                    return;
                }
                if (!schemata[key](data[key])) {
                    var error = new ValidationError(data);
                    error.message += "; '" + key + "' attribute does not match it's JSON-schema";
                    error.errors[key] = new ValidatorError(key, key + ' does not match JSON-schema', 'notvalid', data);
                    error.errors[key].errors = schemata[key].errors;
                    return next(error);
                }
            }
            next();
        }
        catch (err) {
            next(err);
        }
    });
}
module.exports = ajv_plugin;
