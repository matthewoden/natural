/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var PorterStemmer = require('../stemmers/porter_stemmer'),
util = require('util'),
events = require('events');

var Classifier = function(classifier, stemmer) {
    this.classifier = classifier;
    this.docs = [];
    this.features = {};
    this.stemmer = stemmer || PorterStemmer;
    this.lastAdded = 0;
    this.events = new events.EventEmitter();
};

function addDocument(text, classification) {
    if(typeof text === 'string')
    text = this.stemmer.tokenizeAndStem(text);

    if(text.length === 0) {
        // ignore empty documents
        return;
    }

    this.docs.push({
    label: classification,
    text: text
    });

    for(var i = 0; i < text.length; i++) {
    this.features[text[i]] = 1;
    }
}

function removeDocument(text, classification) {
  var docs = this.docs
    , doc
    , pos;

  if (typeof text === 'string') {
    text = this.stemmer.tokenizeAndStem(text);
  }

  for (var i = 0, ii = docs.length; i < ii; i++) {
    doc = docs[i];
    if (doc.text.join(' ') == text.join(' ') &&
        doc.label == classification) {
      pos = i;
    }
  }

  // Remove if there's a match

  if (!isNaN(pos)) {
    this.docs.splice(pos, 1);

    for (var i = 0, ii = text.length; i < ii; i++) {
      delete this.features[text[i]];
    }
  }

  // var features = this.textToFeatures(text);
  this.removeExample(text, classification);
  this.lastAdded--;
  this.classifier.train();
}

function textToFeatures(observation) {
    var features = [];

    if(typeof observation === 'string')
    observation = this.stemmer.tokenizeAndStem(observation);

    for(var feature in this.features) {
        if(observation.indexOf(feature) > -1)
            features.push(1);
        else
            features.push(0);
    }

    return features;
}

function train() {
    var totalDocs = this.docs.length;
    for(var i = this.lastAdded; i < totalDocs; i++) {
        var features = this.textToFeatures(this.docs[i].text);
        this.classifier.addExample(features, this.docs[i].label);
        this.events.emit('trainedWithDocument', {index: i, total: totalDocs, doc: this.docs[i]});
        this.lastAdded++;
    }
    this.events.emit('doneTraining', true);

    this.classifier.train();
}

function retrain() {
  this.classifier = new (this.classifier.constructor)();
  this.lastAdded = 0;
  this.train();
}

function getClassifications(observation) {
    return this.classifier.getClassifications(this.textToFeatures(observation));
}

function classify(observation) {
    return this.classifier.classify(this.textToFeatures(observation));
}

function restore(classifier, stemmer) {
    classifier.stemmer = stemmer || PorterStemmer;
    classifier.events = new events.EventEmitter();
    return classifier;
}

function save(filename, callback) {
    var data = JSON.stringify(this);
    var fs = require('fs');
    var classifier = this;
    fs.writeFile(filename, data, 'utf8', function(err) {
        if(callback) {
            callback(err, err ? null : classifier);
        }
    });
}

function load(filename, callback) {
    var fs = require('fs');

    fs.readFile(filename, 'utf8', function(err, data) {
        var classifier;

        if(!err) {
            classifier = JSON.parse(data);
        }

        if(callback)
            callback(err, classifier);
    });
}


function removeExample(observation, label) {
    var smoothingBonus = this.classifier.smoothing + 1
    if(observation instanceof Array) {
        var i = observation.length;
        if(this.classifier.totalExamples > smoothingBonus) {
          this.classifier.totalExamples--;
        } else {
          this.classifier.totalExamples = 0;
        }

        if(this.classifier.classTotals[label] > smoothingBonus) {
          this.classifier.classTotals[label]--;
        } else {
          this.classifier.classTotals[label] = 0;
        }

        while(i--) {
            if(observation[i]) {
                if(this.classifier.classFeatures[label][i] > smoothingBonus) {
                  this.classifier.classFeatures[label][i]--;
                } else {
                    // give an extra for smoothing
                  this.classifier.classFeatures[label] = 0;
                }
            }
        }
    } else {
        // sparse observation
        for(var key in observation){
            var value = observation[key];

            if(this.classifier.classFeatures[label][value] > smoothingBonus) {
               this.classifier.classFeatures[label][value]--;
            } else {
              this.classifier.classFeatures[label] = 0
            }
        }
    }
}

Classifier.prototype.removeExample = removeExample;
Classifier.prototype.addDocument = addDocument;
Classifier.prototype.removeDocument = removeDocument;
Classifier.prototype.train = train;
Classifier.prototype.retrain = retrain;
Classifier.prototype.classify = classify;
Classifier.prototype.textToFeatures = textToFeatures;
Classifier.prototype.save = save;
Classifier.prototype.getClassifications = getClassifications;
Classifier.restore = restore;
Classifier.load = load;

module.exports = Classifier;
