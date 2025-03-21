'use strict';
var _ = require('underscore');
var fs = require('fs');

function parseCMU(str) {
  var pronunciations = [];
  _.each(str.split("\n"), function(line) {
    if (/^;/.test(line)) { return; }
    if (line.length == 0) { return; }
    var parts = line.split("  ");
    var word = parts[0];
    var phones = parts[1];
    word = word.replace(/\(\d\)$/, '').toLowerCase();
    pronunciations.push([word, phones]);
  });
  return pronunciations;
}

var pronunciations = parseCMU(
    fs.readFileSync(__dirname + "/cmudict-0.7b", {encoding: 'utf8'}));

/**
 * Count the number of syllables in a string of phones.
 * To find the number of syllables in a word, call phonesForWord() first to get the CMUdict phones for that word.
 *
 * @param {string} phones - A string containing space-separated CMUdict phones
 * @returns {number} Integer count of syllables in list of phones
 */
function syllableCount(phones) {
  return _.reduce(
      _.map(phones, function(i) { return (i.match(/[012]/g)||[]).length; }),
      function (a, b) { return a+b; })
}

/**
 * Get the CMUdict phones for a given word. The current phoneme set contains 39 phonemes, vowels carry a lexical stress marker:
 *     0 — No stress
 *     1 — Primary stress
 *     2 — Secondary stress
 * Because a given word might have more than one pronunciation in the dictionary, this function returns a list of all possible pronunciations.
 *
 * @param {string} find - A word to find in CMUdict.
 * @returns {Array} A list of phone strings that correspond to that word.
 */
function phonesForWord(find) {
  var matches = [];
  _.each(pronunciations, function(item) {
    var word = item[0];
    var phones = item[1];
    if (word == find) {
      matches.push(phones);
    }
  });
  return matches;
}

/**
 * Get the “rhyming part” of a string with CMUdict phones.
 * “Rhyming part” here means everything from the vowel in the stressed syllable nearest the end of the word up to the end of the word.
 *
 * @param {string} phones - a string containing space-separated CMUdict phones.
 * @returns {string} The string with just the “rhyming part” of those phones.
 */
function rhymingPart(phones) {
  var idx = 0;
  var phonesList = phones.split(" ");
  for (var i = phonesList.length-1; i >= 0; i--) {
    if (phonesList[i].slice(-1).match(/[12]$/)) {
      idx = i;
      break;
    }
  }
  return phonesList.slice(idx).join(' ');
}

/**
 * Get words whose pronunciation matches a regular expression.
 * This function searches the CMU dictionary for pronunciations matching a given regular expression. (Word boundary anchors are automatically added before and after the pattern.)
 *
 * @param {string|RegExp} pattern - The pattern to search for. If you give this function a string, it turns it into a RegExp object with added word boundary anchors at beginning and end. You can also pass a RegExp object, but in that case you need to add the word boundary anchors yourself!
 * @returns {Array} An array of words that match the pattern.
 */
function search(pattern) {
  var matches = [];
  var re;
  if (pattern instanceof RegExp) {
    re = pattern;
  }
  else {
    re = new RegExp("\\b" + pattern + "\\b");
  }
  _.each(pronunciations, function(item) {
    var word = item[0];
    var phones = item[1];
    if (phones.match(re)) {
      matches.push(word);
    }
  });
  return matches;
}

/**
 * Get words whose stress pattern matches a regular expression.
 * This function is a special case of search() that searches only the stress patterns of each pronunciation in the dictionary. You can get stress patterns for a word using the stressesForWord() function.
 *
 * @param {string} pattern - The string containing a regular expression
 * @returns {Array} An array of matching words.
 */
function searchStresses(pattern) {
    var matches = [];
    var re = new RegExp("\\b" + pattern + "\\b");
    _.each(pronunciations, function(item) {
        var word = item[0];
        var phones = item[1];
        if (stresses(phones).match(re)) {
            matches.push(word);
        }
    });
    return matches;
}

/**
 * Get words rhyming with a given word.
 * This function may return an empty list if no rhyming words are found in the dictionary, or if the word you pass to the function is itself not found in the dictionary.
 *
 * @param {string} word - A word.
 * @returns {Array} An array of rhyming words.
 */
function rhymes(word) {
  var allRhymes = [];
  var allPhones = phonesForWord(word);
  _.each(allPhones, function(phonesStr) {
    var part = rhymingPart(phonesStr);
    var rhymes = search(part + "$");
    allRhymes.push.apply(allRhymes, rhymes);
  });
  return _.filter(allRhymes, function(r) { return r != word; });
}

/**
 * Get the vowel stresses for a given string of CMUdict phones.
 * Returns only the vowel stresses (i.e., digits) for a given phone string.
 *
 * @param {string} s - A string of CMUdict phones.
 * @returns {string} The string of just the stresses.
 */
function stresses(s) {
  return s.replace(/[^012]/g, "");
}

/**
 * Get a list of possible stress patterns for a given word.
 *
 * @param {string} find - A word to find
 * @returns {Array} A list of possible stress patterns for the given word.
 */
function stressesForWord(find) {
  var phones = phonesForWord(find);
  return _.map(phones, stresses);
}

module.exports = {
  parseCMU: parseCMU,
  syllableCount: syllableCount,
  phonesForWord: phonesForWord,
  rhymingPart: rhymingPart,
  search: search,
  rhymes: rhymes,
  stresses: stresses,
  stressesForWord: stressesForWord,
  searchStresses: searchStresses
};
