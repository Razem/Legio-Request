'use strict';
var
expect = require("expect.js"),
Request = require("../index"),
urls = require("./urls");

describe("AJAX", function () {
  describe(".loadText()", function () {
    it("loads the content of a web page in a form of plain text", function (done) {
      Request.loadText(urls.text)
        .then(function (val) {
          expect(val).to.be("test");

          done();
        });
    });

    it("also provides GET and POST functionality", function (done) {
      Request.loadText(urls.gp, { a: 1, b: 2 }, { a: 3, b: 4 })
        .then(function (val) {
          expect(val).to.be("GET:a3b4|POST:a1b2");

          done();
        });
    });

    it("rejects the promise if the HTTP status isn't 200", function (done) {
      Request.loadText(urls.error)
        .failed(function (err) {
          expect(err.status).not.to.be(200);

          done();
        });
    });
  });

  describe(".loadTextSync()", function () {
    it("loads the content of a web page synchronously", function () {
      expect(Request.loadTextSync(urls.text)).to.be("test");
    });

    it("also provides GET and POST functionality", function () {
      expect(Request.loadTextSync(urls.gp, { a: 1, b: 2 }, { a: 3, b: 4 })).to.be("GET:a3b4|POST:a1b2");
    });

    it("throws an error if the HTTP status isn't 200", function () {
      expect(function () {
        Request.loadTextSync(urls.error)
      }).to.throwError();
    });
  });

  describe(".loadJSON() & .loadJSONSync()", function () {
    it("loads JSON data", function (done) {
      Request.loadJSON(urls.json)
        .then(function (data) {
          expect(data).to.eql({ test: 42 });

          done();
        });
    });

    it("loads JSON data synchronously", function () {
      expect(Request.loadJSONSync(urls.json)).to.eql({ test: 42 });
    });
  });
});
