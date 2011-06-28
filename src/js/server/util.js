// Testing if a regular expression matches a string
String.prototype.test = function(regexp) {
    var reg = new RegExp(regexp);
    return reg.test(this);
};

hashToDebug = function(h) {
    var e = [];
    for (var s in h) {
        e.push(s + ": " + h[s]);
    }
    return "{" + e.join(", ") + "}";
}