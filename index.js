/*
  copyColorsToClipboard.jsx by https://github.com/Inventsable
  For revisions email: tom@inventsable.cc

  Illustrator script to copy selected color values in the form [TYPE]=[VALUES] to a user's clipboard,
  preferring SPOT color names over values
  Discussion: https://community.adobe.com/t5/illustrator-discussions/copy-color-values-to-clipboard/m-p/13791617

  Modification by Sergey Osokin, https://github.com/creold:
  - Added path collection within groups
  - Added gradient and grayscale color support
  - Added flags to get Spot color values and Spot tint values
  - Color values are written to the clipboard in order of object coordinates
*/

var isGetSpotVal = false; // Get Spot values and name (true) or only name (false)
var isGetTintVal = true; // Get Spot color tint values

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

function lerp(start, end, t) {
  return Math.round(start + (end - start) * t);
}

RGBColor.prototype.getString =
  CMYKColor.prototype.getString =
  SpotColor.prototype.getString =
  LabColor.prototype.getString =
  GradientColor.prototype.getString =
  GrayColor.prototype.getString =
    function (isGetSpotVal, isGetTintVal) {
      var result = this.typename.replace(/color$/i, "").toUpperCase() + "=";
      var self = this; // Prevent namespace conflicts from scoping
      if (/gradient/i.test(this)) {
        var stops = get("gradientStops", this.gradient);
        var colors = stops.map(function (stop) {
          return stop.color;
        });
        result =
          "" +
          colors
            .map(function (color) {
              return color.getString(isGetSpotVal); // Replace values with string in form [TYPE]=[VALUES]
            })
            .join("\n");
      } else if (this.spot) {
        if (!isGetSpotVal) return this.spot.name;
        result = this.spot.name + "=";
        self = self.spot.color;
      }
      if (/gradient/i.test(this)) {
        return result;
      }
      // Variables for calculating Spot tint by linear interpolation
      var white = /rgb/i.test(app.activeDocument.documentColorSpace) ? 255 : 0;
      var t = this.spot && isGetTintVal ? this.tint / 100 : 1;
      result += Object.keys(self)
        .filter(function (key) {
          return !/typename|getString/.test(key);
        })
        .map(function (key) {
          var val = lerp(white, self[key], t);
          // Color keys are always in order, so just return them rounded:
          return Math.round(val);
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

function getPaths(arr) {
  var result = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i];
    if (item.pageItems && item.pageItems.length) {
      result = [].concat(result, getPaths(item.pageItems));
    } else if (/compound/i.test(item.typename) && item.pathItems.length) {
      result.push(item.pathItems[0]);
    } else if (/pathitem/i.test(item.typename)) {
      result.push(item);
    }
  }
  return result;
}

function sortByPosition(coll) {
  var hs = [];
  var vs = [];
  for (var i = 0, len = coll.length; i < len; i++) {
    hs.push(coll[i].left);
    vs.push(coll[i].top);
  }
  if (arrMax(hs) - arrMin(hs) > arrMax(vs) - arrMin(vs)) {
    coll.sort(function (a, b) {
      return comparePosition(a.left, b.left, b.top, a.top);
    });
  } else {
    coll.sort(function (a, b) {
      return comparePosition(b.top, a.top, a.left, b.left);
    });
  }
}

function comparePosition(a1, b1, a2, b2) {
  return a1 == b1 ? a2 - b2 : a1 - b1;
}

function arrMax(arr) {
  return Math.max.apply(null, arr);
}

function arrMin(arr) {
  return Math.min.apply(null, arr);
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

function copyColorsToClipboard(isGetSpotVal, isGetTintVal) {
  try {
    // Get selection as real array instead of Array-like
    var list = getPaths(app.selection);
    sortByPosition(list);
    // Compile array of all fills and strokes
    var colors = list.map(function (item) {
      var iColors = [];
      iColors[0] = item.filled ? item.fillColor : null;
      iColors[1] = item.stroked ? item.strokeColor : null;
      return iColors;
    });
    colors = [].concat.apply([], colors);
    colors = colors
      .filter(function (color) {
        return !!color; // Remove any null values
      })
      .map(function (color) {
        return color.getString(isGetSpotVal, isGetTintVal); // Replace values with string in form [TYPE]=[VALUES]
      })
      .filter(function (colorString, index, arr) {
        return arr.indexOf(colorString) == index; // Remove duplicates
      });
    setClipboard(colors.join("\n"));
  } catch (err) {
    alert(err);
  }
}

copyColorsToClipboard(isGetSpotVal, isGetTintVal);
