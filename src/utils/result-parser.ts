import { FailureArtifact } from "../types/shared";

export function parsePlaywrightTestResults(data: any): FailureArtifact[] {
    const failures: FailureArtifact[] = [];

    // Traverse through suites and specs to find failures
    for (const suite of data.suites || []) {
        for (const spec of suite.specs || []) {
            if (!spec.ok) {
                for (const test of spec.tests || []) {
                    for (const result of test.results || []) {
                        if (result.status === "failed" || result.status === "timedOut") {
                            const errorObj = result.error || (result.errors && result.errors[0]) || {};
                            const error = errorObj.message || "Unknown error";
                            const stack = errorObj.stack || "";

                            let screenshotPath, tracePath;
                            if (result.attachments) {
                                for (const att of result.attachments) {
                                    if (att.contentType === "image/png") {
                                        screenshotPath = att.path;
                                    } else if (att.name === "trace") {
                                        tracePath = att.path;
                                    }
                                }
                            }

                            failures.push({
                                testName: spec.title,
                                error,
                                stack,
                                screenshotPath,
                                tracePath,
                                retry: result.retry,
                            });
                        }
                    }
                }
            }
        }
    }

    return failures;
}