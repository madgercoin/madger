"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "DevToolsPluginCliExtensionResults", {
    enumerable: true,
    get: function() {
        return DevToolsPluginCliExtensionResults;
    }
});
function _schemautils() {
    const data = require("@expo/schema-utils");
    _schemautils = function() {
        return data;
    };
    return data;
}
function _nodebuffer() {
    const data = require("node:buffer");
    _nodebuffer = function() {
        return data;
    };
    return data;
}
const _DevToolsPluginschema = require("./DevToolsPlugin.schema");
// Cap accumulated output at V8's max single-string length to bound heap growth.
const MAX_OUTPUT_LENGTH = _nodebuffer().constants.MAX_STRING_LENGTH;
class DevToolsPluginCliExtensionResults {
    constructor(onOutput){
        this.onOutput = onOutput;
        this._output = [];
        this._totalLength = 0;
        this._truncated = false;
    }
    append(output, level = 'info') {
        if (this._truncated) return;
        if (this._totalLength + output.length > MAX_OUTPUT_LENGTH) {
            this._truncated = true;
            const message = {
                type: 'text',
                text: `Output truncated: plugin exceeded V8's max string length (${MAX_OUTPUT_LENGTH} chars). Reduce output, paginate, or write to a file.`,
                level: 'error'
            };
            this._output.push(message);
            this.onOutput == null ? void 0 : this.onOutput.call(this, [
                message
            ]);
            return;
        }
        this._totalLength += output.length;
        const results = this.parseOutputText(output, level);
        this._output.push(...results);
        this.onOutput == null ? void 0 : this.onOutput.call(this, results);
    }
    isTruncated() {
        return this._truncated;
    }
    exit(code) {
        if (code === 0) return;
        this.append(`Process exited with code ${code}`, 'error');
    }
    getOutput() {
        return this._output;
    }
    parseOutputText(txt, level = 'info') {
        let output;
        try {
            output = JSON.parse(txt);
        } catch  {
            // Not JSON, treat as plain text
            const lines = txt.split('\n');
            const results = [];
            for (const line of lines){
                if (line) {
                    results.push({
                        type: 'text',
                        text: line,
                        level
                    });
                }
            }
            return results;
        }
        try {
            (0, _schemautils().validate)(_DevToolsPluginschema.DevToolsPluginOutputSchema, output);
            return output;
        } catch (error) {
            if (!(error instanceof _schemautils().ValidationError)) throw error;
            // Conditional schemas include a parent error; report the failing field.
            const issue = error.errors[error.errors.length - 1];
            return [
                {
                    type: 'text',
                    text: `Invalid JSON: ${issue.path || 'output'}: ${issue.message}`,
                    level: 'error'
                }
            ];
        }
    }
}

//# sourceMappingURL=DevToolsPluginCliExtensionResults.js.map