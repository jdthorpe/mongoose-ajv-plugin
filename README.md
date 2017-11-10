
## The Problem

You love Mongoose for all it's convenience methods and
valiate-before-saving logic, but but you store complex objects using
`Schema.Types.Mixed` which lacks validation in Mongoose, or you just wish
you could validate objects, strings, etc. using a richer
[JSON-schema](http://json-schema.org/) vocabulary than is included with
Mongoose. 

## The Solution

The `mongoose-ajv-plugin` lets you use the awesome [AJV JSON-Schema
validation library][ajv], to validate individual attributes or entire
documents, giving you access to it's rich extensible schema vocabulary and convenience
formats like [email][formats], [Date][formats], [hostname][formats], ect.

[ajv]: https://github.com/epoberezkin/ajv  "AJV"
[formats]: https://github.com/epoberezkin/ajv#formats  "String Formats"
[validate]: http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate "Validation"

## Getting Started

Import mongoose and add in the `mongoose-ajv-plugin`:

```JavaScript
var mongoose = require("mongoose");
mongoose.plugin(require("mongoose-ajv-plugin"))
```

Now use your favorite AJV Schema, such as the `ajv_contact_schema` defined
below, to validate entire documents using the `"ajv-schema"` keyword, like
so:

```JavaScript
var Contact_schema = new mongoose.Schema({
    "name": String ,
    "email": String,
    "birthday": String,
    // let AJV validate this entire document
    "ajv-schema": ajv_contact_schema 
});
```

Or use AJV to validate one or more attributes of a document using the `"ajv-schema"` option:

```JavaScript
// use AJV to validate fields within a document
var Player_schema = new Schema({
    "user_name": String,
    "rank": Number,
    "ip_address": { 
        "type": String, 
        // let AJV validate this string attribute
        "ajv-schema": { 
            "type": 'string',
            "format": 'ipv4'  /
        } 
    },
    "contact-info": {
        "type": Schema.Types.Mixed ,
        // let AJV validate this nested object
        "ajv-schema": contact_json_schema 
    },
});
```

## Using AJV Extensions

If you wish to extend the Ajv instance used for validation with additional
[schemata](https://github.com/epoberezkin/ajv#addschemaarrayobjectobject-schema--string-key), 
[formats](https://github.com/epoberezkin/ajv#addformatstring-name-stringregexpfunctionobject-format), 
or [keywords](https://github.com/epoberezkin/ajv#api-addkeyword), you can
pass your own (extended) ajv instance to the plugin, like so: 

```JavaScript
// create an Ajv instance
var Ajv = require("ajv");
var ajv = new Ajv();

// add custom schema, keywords, or formats
ajv.addSchema(...);
// or 
ajv.addKeyword(...)
// or 
ajv.addFormat(...)
// or 
require("my-ajv-plugin")(ajv)

// use this ajv instance to compile every new validator
mongoose.plugin(require("mongoose-ajv-plugin",{"ajv":ajv})

// or use this ajv instance to compile validators for an individual
// mongoose schema
var my_schema = new mongoose.Schema({...});
my_schema.plugin(require("mongoose-ajv-plugin",{"ajv":ajv})
```

## Contact JSON schema

And finally, here's the definition of `ajv_contact_schema` used in the
above examples:

```JavaScript
var ajv_contact_schema = {
    "type":"object",
    "properties":{
        "name": {
            "type":"string"
        },
        "email": {
            "type":"string",
            "fomrat":"email"
        },
        "birthday": {
            "oneOf":[
                {"$ref":"#/definitions/date"},
                {"$ref":"#/definitions/date-time"}
            ]
        }
    },
    "required":[
        "name",
        "email"
    ],
    "definitions":{
        "date":{
            "type":"string",
            "format":"date"
        },
        "date-time":{
            "type":"string",
            "format":"date-time"
        }
    }
};
```
