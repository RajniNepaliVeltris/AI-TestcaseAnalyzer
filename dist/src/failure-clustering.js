"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clusterFailures = clusterFailures;
// Simple clustering by error message similarity (can be replaced with ML)
function clusterFailures(failures) {
    const clusters = {};
    for (const fail of failures) {
        let key = 'Other';
        if (/timeout|timed out/i.test(fail.error))
            key = 'Timeout';
        else if (/locator|selector/i.test(fail.error))
            key = 'Locator Issue';
        else if (/network|connection/i.test(fail.error))
            key = 'Network Issue';
        else if (/assert|expect/i.test(fail.error))
            key = 'Assertion Failure';
        if (!clusters[key])
            clusters[key] = [];
        clusters[key].push(fail);
    }
    return clusters;
}
