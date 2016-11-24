
## The Problem

You love Mongoose for all it's convenience methods and
valiate-before-saving logic, but but you store complex objects using
`Schema.Types.Mixed` which lacks validation in Mongoose, or you just wish
you could validate objects using a richer
[JSON-schema](http://json-schema.org/) vocabulary than is included with
Mongoose. 

## The Solution

The `mongoose-ajv-plugin` lets you use the awesome [AJV JSON-Schema
validation library][ajv], to validate individual attributes or entire
documents, giving you access to it's rich schema vocabulary and convenience
formats like [email][formats], [Date][formats], [hostname][formats], ect.

[ajv]: https://github.com/epoberezkin/ajv  "AJV"
[formats]: https://github.com/epoberezkin/ajv#formats  "String Formats"
[validate]: http://mongoosejs.com/docs/api.html#schematype_SchemaType-validate "Validation"

## Getting Started


### Attribute validation

Import Mongoose as usual: 

```JavaScript
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// optional; used by the `validate_promise()` convenience function, below.
mongoose.Promise = require('bluebird');
```

When validating individual attributes, it is sufficient to load the plugin globally:


```JavaScript
mongoose.plugin(require('mongoose-ajv-plugin'));
```


Define a JSON-schema for your favorite attribute:

```JavaScript
var contact_json_schema = {
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

Define a Mongoose schema that includes a `schema` attribute, or two:

```JavaScript
// use AJV to validate fields within a document
var Player_schema = new Schema({
	user_name: String,
	rank: Number,
	ip_address: { 
		type: String,  // the mongoose type
		schema: { // use AJV to validtae this string
			type: 'string',  // the JSON schema Type
			format: 'ipv4'  // AJV convenience String Format
		} 
	},
	contact: {
		type: Schema.Types.Mixed ,
		schema: contact_json_schema // use AJV to validate this object
	},
});
```
If you didn't load the mongoose-ajv-plugin globally , you'll need to add it to your schema now:

```JavaScript
// add the AJV plugin to the schema
var ajv_plugin = require('mongoose-ajv-plugin')
Player_schema.plugin(ajv_plugin);
```

Next, create a model and some instances, and validate the instances. 

```JavaScript
// Create a model from the schema
var Player = mongoose.model('Player', Player_schema);

var felix = new Player({
	user_name: "Felix",
	rank: 5,
	ip_address: "123.45.67.89",
	contact: {
		name:"Jack" ,
		email:"plaza626@email.com",
		birthday: "1925-02-08"
	}
});

var oscar = new Player({
	user_name: "Oscar",
	rank: 7,
	ip_address: "123.4.5.678", // invalid IP address
	contact: {
		name:"Walter" ,
		email:"RedWingsFan@poker.com",
		birthday: "October 1, 1920" // invalid date format format
	},
})

felix.validate(validate_callback_factory("Felix")) // callback based validation * 
validate_promise(felix,"Felix") // promise based validation * 
>> Felix passed validation!

oscar.validate(validate_callback_factory("Oscar")) // callback based validation * 
validate_promise(oscar,"Oscar") // promise based validation *
>> Oscar failed validation with message:  Player validation failed; 'contact' attribute does not match it's JSON-schema 
```
\* see `convenience functions`  section below.

Calling [my_model_instance.save()][validate] will cause the validation to occur as well.

### Document validation

Create a schema for your document

```JavaScript
var team_json_schema = {
	"type":"object",
	"properties": {
		"team_name": {
			"type": "string",
			// team names must be between 5 and 30 characters
			"minLength": 5,
			"maxLength": 30
		},
		"players": {
			"type": "array",
			"minItems": 2,
			"maxItems": 10,
			"items": {
				"type": "string"
			}
		}
	}
};
```

Then create an Mongoose schema and add the plugin, passing the schema in the
options parameter of [Schema.plugin()][schema-plugin]; 

[schema-plugin]: http://mongoosejs.com/docs/api.html#schema_Schema-plugin "Schema Plugin"

```JavaScript
var Team_schema = new Schema({
	team_name: String,
	players: [String],
});
Team_schema.plugin(ajv_plugin,{schema:team_json_schema});
var Team = mongoose.model('Team', Team_schema);
```

Now Create and validate some instances:

```JavaScript
var just_me = new Team({ 
	"team_name": "Just Me",
	"players": ["Bridget"]  // too few players
})

var thursday_night_poker = new Team({ 
	"team_name": "ThursdayNightPoker",
	"players": ["Oscar","Felix","Speed","Vinnie","Roy","Murray"] 
})

just_me.validate(validate_callback_factory("Just Me")) // callback based validation * 
validate_promise(just_me,"Just Me") // promise based validation * 
>> Just Me failed validation with message:  Team validation failed; instance data does not match the JSON-schema

thursday_night_poker.validate(validate_callback_factory("Thursday Night Poker")) // callback based validation * 
validate_promise(thursday_night_poker,"Thursday Night Poker") // promise based validation * 
>> Thursday Night Poker passed validation!
```
\* see `convenience functions`  section below.

## Miscellaneous notes

* Validation with the mongoose-ajv-plugin is invoked when calling
  `my_instance.save()` or `my_instance.validate()`.  The `mongoose-ajv-plugin`,
  is implemented as a `model.pre('validate',...)` method, which, at the time of
  this writing, is not invoked by `my_instance.validateSync()`.

* Like internal Mongoose validators, the AJV-Mongoose plugin does
  not validate undefined values.  To require values to be defined, use the
  built in [`required`](validate-undefined-value) schema attribute.

[validate-undefined-value]: http://mongoosejs.com/docs/api.html#schematype_SchemaType-required


## Advanced options

If you want to use multiple schema, you can load up your own ajv instance and
pass it in the options parameter of [Schema.plugin()][schema-plugin]:

```JavaScript
var AJV = require('ajv'),
    ajv = new AJV();
ajv.addSchema(schema, 'mySchema');
Team_schema.plugin(ajv_plugin,{schema: team_json_schema,ajv: ajv});
```

## Convenience Functions

```JavaScript
function validate_callback_factory(name){
    return function (err,doc){
        if(err){
            console.log(name +" passed validation!");
        }else{
            console.log(name +" failed validation with message:  " + err.message);
        }
    };
}

function validate_promise (data,name){
	data.validate().then(function(x){
			console.log(name +" passed validation!");
		}) .catch(function(err){
			console.log(name +" failed validation with message:  " + err.message);
		})
}
```


