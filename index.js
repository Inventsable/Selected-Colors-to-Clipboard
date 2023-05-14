Object.prototype.keys = function (obj) {
  var keys = [];
  for (var key in obj) keys.push(key);
  return keys;
};
Array.prototype.map = function (callback) {
  var mappedParam = [];
  for (var i = 0; i < this.length; i++)
    mappedParam.push(callback(this[i], i, this));
  return mappedParam;
};
Array.prototype.indexOf = function (item) {
  for (var i = 0; i < this.length; i++) if (this[i] == item) return i;
  return -1;
};
Array.prototype.filter = function (callback) {
  var filtered = [];
  for (var i = 0; i < this.length; i++)
    if (callback(this[i], i, this)) filtered.push(this[i]);
  return filtered;
};

// If the script doesn't work, put all these declarations on the same line.
// Prettier wants to format it like below but I noticed inconsistency from it
RGBColor.prototype.getString =
  CMYKColor.prototype.getString =
  SpotColor.prototype.getString =
  LabColor.prototype.getString =
    function () {
      var result = this.typename.replace(/color$/i, "").toUpperCase() + "=";
      var self = this; // Prevent namespace conflicts from scoping
      if (this.spot) return this.spot.name;
      else
        result += Object.keys(self)
          .filter(function (key) {
            return !/typename|getString/.test(key);
          })
          .map(function (key) {
            // Color keys are always in order, so just return them rounded:
            return Math.round(self[key]);
          })
          .join(",");
      return result;
    };
function get(type, parent, deep) {
  if (arguments.length == 1 || !parent) {
    parent = app.activeDocument;
    deep = true;
  }
  var result = [];
  if (!parent[type]) return [];
  for (var i = 0; i < parent[type].length; i++) {
    result.push(parent[type][i]);
    if (parent[type][i][type] && deep)
      result = [].concat(result, get(type, parent[type][i], deep));
  }
  return result;
}
function setClipboard(str) {
  var prev = get("selection");
  selection = null;
  var idoc = app.activeDocument;
  var tlayer = idoc.layers.add();
  var tframe = tlayer.textFrames.add();
  // Had faulty unicode whitespace characters showing, so strip them:
  tframe.contents = str.replace(/^\s*||\s*$/, "");
  tframe.translate(10);
  tframe.selected = true;
  app.copy();
  tlayer.remove();
  app.selection = prev;
}
function copyColorsToClipboard() {
  try {
    // Get selection as real array instead of Array-like
    var list = get("selection");
    // Compile array of all fills and strokes
    var colors = []
      .concat(
        list.map(function (item) {
          return item.filled ? item.fillColor : null;
        }),
        list.map(function (item) {
          return item.stroked ? item.strokeColor : null;
        })
      )
      .filter(function (color) {
        return !!color; // Remove any null values
      })
      .map(function (color) {
        return color.getString(); // Replace values with string in form [TYPE]=[VALUES]
      })
      .filter(function (colorString, index, arr) {
        return arr.indexOf(colorString) == index; // Remove duplicates
      });
    setClipboard(colors.join(", "));
  } catch (err) {
    alert(err);
  }
}
copyColorsToClipboard();
