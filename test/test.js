"use strict";
// --------------------------------------------------------------------------------
// Programmer: Jason Thorpe
// Language:   typescript
// Purpose:    mocha testing 
// Comments:   
// --------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/mocha/mocha.d.ts" />
var chai = require("chai");
var expect = chai.expect;
var mongoose = require('mongoose');
mongoose.Promise = require('bluebird');
var Schema = mongoose.Schema;
var ajv_plugin = require('../index');
mongoose.plugin(ajv_plugin);
var AJV = require('ajv'), ajv = new AJV();
ajv.validate({ "type": "string", "format": "ipv4" }, "123.4.5.789");
//------------------------------
// define an AJV JSONschema: 
//------------------------------
var contact_json_schema = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string"
        },
        "email": {
            "type": "string",
            "fomrat": "email"
        },
        "birthday": {
            "oneOf": [
                { "$ref": "#/definitions/date" },
                { "$ref": "#/definitions/date-time" }
            ]
        }
    },
    "required": [
        "name",
        "email"
    ],
    "definitions": {
        "date": {
            "type": "string",
            "format": "date"
        },
        "date-time": {
            "type": "string",
            "format": "date-time"
        }
    }
};
var team_json_schema = {
    "type": "object",
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
describe("Schemas", function () {
    it("should be valid", function () {
        expect(ajv.validateSchema(contact_json_schema)).to.be.true;
        expect(ajv.validateSchema(team_json_schema)).to.be.true;
    });
});
// ----------------------------------------
// build the models
// ----------------------------------------
// use AJV to validate fields within a document
var Player_schema = new Schema({
    "user_name": String,
    "rank": Number,
    "ip_address": {
        "type": String,
        "ajv-schema": {
            "type": 'string',
            "format": 'ipv4' // AJV convenience String Format
        }
    },
    "contact": {
        "type": Schema.Types.Mixed,
        "ajv-schema": contact_json_schema // use AJV to validate this object
    },
});
// add the AJV plugin to the schema
//-- Player_schema.plugin(ajv_plugin);
// Create a model from the schema
var Player = mongoose.model('Player', Player_schema);
var Team_schema = new Schema({
    "team_name": String,
    "players": [String],
    "ajv-schema": team_json_schema,
});
//-- Team_schema.plugin(ajv_plugin);
var Team = mongoose.model('Team', Team_schema);
// ----------------------------------------
// build the model instances
// ----------------------------------------
var valid_attrs = new Player({
    "user_name": "Felix",
    "rank": 5,
    "ip_address": "123.45.67.89",
    "contact": {
        "name": "Jack",
        "email": "plaza626@email.com",
        "birthday": "1925-02-08"
    }
});
var invalid_string_attribute = new Player({
    "user_name": "Oscar",
    "rank": 7,
    "ip_address": "123.4.5.678",
    "contact": {
        "name": "Walter",
        "email": "RedWingsFan@poker.com",
        "birthday": "1920-10-01" // invalid date format format
    },
});
var invalid_object_attribute = new Player({
    "user_name": "Oscar",
    "rank": 7,
    "ip_address": "123.45.67.89",
    "contact": {
        "name": "Walter",
        "email": "RedWingsFan@poker.com",
        "birthday": "October 1, 1920" // invalid date format format
    },
});
var invalid_doc = new Team({
    "team_name": "Just Me",
    "players": ["Bridget"] // too few players
});
var valid_doc = new Team({
    "team_name": "ThursdayNightPoker",
    "players": ["Oscar", "Felix", "Speed", "Vinnie", "Roy", "Murray"]
});
// ----------------------------------------
// testing
// ----------------------------------------
describe("Invalid nested object", function () {
    it("should not validate", function (done) {
        invalid_object_attribute.validate(function (err, doc) {
            if (err) {
                done();
            }
            else {
                done(new Error("Failed to throw an error"));
            }
        });
    });
});
describe("Invalid string attribute", function () {
    it("should not validate", function (done) {
        invalid_string_attribute.validate(function (err, doc) {
            if (err) {
                done();
            }
            else {
                done(new Error("Failed to throw an error"));
            }
        });
    });
});
describe("Valid attributes", function () {
    it("should not throw", function (done) {
        valid_attrs.validate(function (err, doc) {
            if (err) {
                done(err);
            }
            else {
                done();
            }
        });
    });
});
describe("Invalid document", function () {
    it("should not validate", function (done) {
        invalid_doc.validate(function (err, doc) {
            if (err) {
                done();
            }
            else {
                done(new Error("Failed to throw an error"));
            }
        });
    });
});
describe("Valid document", function () {
    it("should not throw", function (done) {
        valid_doc.validate(function (err, doc) {
            if (err) {
                done(err);
            }
            else {
                done();
            }
        });
    });
});
