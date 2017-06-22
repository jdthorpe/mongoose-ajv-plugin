// --------------------------------------------------------------------------------
// Programmer: Jason Thorpe
// Language:   typescript
// Purpose:    
// Comments:   
// --------------------------------------------------------------------------------

/// <reference path="./typings/node/node.d.ts" />

var semver = require('semver');
var mongoose = require('mongoose');
var AJV = require('ajv');
var ValidationError = mongoose.Error.ValidationError;
var ValidatorError  = mongoose.Error.ValidatorError;

export = function (schema, options) {

    // GET THE AJV INSTANCE
    var ajv = (options && options.ajv) || new AJV();
    if(options && options.plugins){
        for(let key in options.plugins){
            if(!options.plugins.hasOwnProperty(key))
                continue;
            if(options.plugins[key].version){
                var version = require(key+"/package.json").version;
                if(!semver.satisfies(version, options.plugins[key].version))
                    throw new Error(`Installed version "${version}" of plugin "${key}" does not satisify "${options.plugins[key].version}"`);
            }
            if(options.plugins[key].options){
                require(key)(ajv,options.plugins[key].options)
            }else{
                require(key)(ajv)
            }
        }
    }

    // COMPILE THE ATTRIBUTE SCHEMA
    var schemata = {},SCHEMA;
    // COMPILE THE OVERALL DOCUMENT SCHEMA
    if(schema.path("ajv-schema")){
        try{
            var data = schema.paths["ajv-schema"].options;
            SCHEMA =  ajv.compile(data)
            schema.remove("ajv-schema");
        }catch(err){
            throw new Error(`Failed to compile document schema with error message: ${err.message} `);
        }
    }

    schema.eachPath((key) => {
        if(! schema.path(key).options["ajv-schema"]){
            return ;
        }
        try{
            console.log(`creating schema for path: "${key}" ... `)
            var $schema = ajv.compile(schema.path(key).options["ajv-schema"])
            console.log(`SUCCESS!\n`)
        }catch(err){
            console.log(`FAILED.\n`)
            throw new Error(`Failed to compile schema for path "${key}" with error message: ${err.message} `);
        }
        schemata[key] = $schema;
    });

    schema.post('validate', function (data,next) {
        // APPLY THE OVERALL DOCUMENT SCHEMA
        if(SCHEMA && !SCHEMA(data)){
            var error = new ValidationError(data);
            error.message += "; ";
            console.log("SCHEMA.errors.length: ",SCHEMA.errors.length)
            error.message += JSON.stringify(SCHEMA.errors.map((x) => `'${x.schemaPath}' ${x.message}`));
            error.errors.record = new ValidatorError('record', 'Overall object does not match JSON-schema', 'notvalid', data);
            error.errors.record.errors = SCHEMA.errors;
            return next(error);
        }
        try{
            // APPLY THE ATTRIBUTE SCHEMA
            var $schema;
            for(var key in schemata){
                if(data[key] === undefined){
                    // use the Mongoose `required` validator for validating the presence of the attribute
                    continue
                }
                console.log("validating schema path", key);
                $schema = schemata[key];
                if(!$schema(data[key])){
                    var error = new ValidationError(data);
                    error.message += `; '${key}' attribute does not match it's JSON-schema: `;
                    error.message += JSON.stringify($schema.errors.map((x) => `'${x.schemaPath}' ${x.message}`));
                    error.errors[key] = new ValidatorError(key, key+' does not match JSON-schema', 'notvalid', data);
                    error.errors[key].errors = schemata[key].errors;
                    return next(error);
                }
            }
            return next();
        }catch(err){
            return next(err);
        }
    })

}




