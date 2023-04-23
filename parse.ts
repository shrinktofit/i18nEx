const DEBUG: boolean = false;

export function parseI18n(str: string): string {
    const parseState = new ParseState(str);
    const result = parseRecurse(parseState, 0)
    if (result) {
        if (!parseState.eof) {
            parseState.reportError(`Trailing strings`);
        }
    }
    return result?.result || 'FAILED';
}

const logDepth = (depth: number) => {
    return (...args: unknown[]) => {
        console.log('  '.repeat(depth), ...args);
    };
}

function error(...args: unknown[]) {
    console.error(...args);
}

class ParseState {
    constructor(
        public readonly str: string,
    ) {
    }

    public lastIndex = 0;

    get eof() {
        return this.lastIndex === this.str.length;
    }

    get lookAhead() {
        return this.str[this.lastIndex];
    }

    public get remain() {
        return this.str.slice(this.lastIndex);
    }

    public toString() {
        return this.remain;
    }

    public exec(regex: RegExp) {
        regex.lastIndex = this.lastIndex;
        const matched = regex.exec(this.str);
        if (matched) {
            this.lastIndex = regex.lastIndex;
        }
        return matched;
    }

    public reportError(...messages: unknown[]) {
        error(`[0:${this.lastIndex}]: `, ...messages);
        error(`Current location is: '${this.eof ? '<end-of-file>' : this.remain}'`);
    }
}

function parseRecurse(parseState: ParseState, depth: number): { result: any; } | undefined {
    if (DEBUG) {
        logDepth(depth)(`Parsing 【${parseState}】`);
    }

    const matches = parseState.exec(
        /i18n:([\w0-9.]+)(\{)?/y
    );
    if (!matches) {
        const result = parseState.remain;
        parseState.lastIndex = parseState.str.length;
        return {
            result: result,
        };
    }

    const [_, key, paramsBegin] = matches;
    if (!paramsBegin) {
        // return Editor.I18n.t(key);
        return {
            result: { action: `TRANSLATE ${key}`, },
        };
    }

    const paramsParseResult = parseParams(parseState, depth + 1);
    if (!paramsParseResult) {
        return undefined;
    }
    
    if (parseState.lookAhead !== '}') {
        parseState.reportError(`Expected a terminal '}'`);
        return;
    }
    ++parseState.lastIndex;

    // const translated = Editor.I18n.t(key, params);
    // return translated;
    return { result: { action: `TRANSLATE ${key}`, params: paramsParseResult.result } };
}

function parseParams(parseState: ParseState, depth: number): { result: any; } | undefined {
    if (DEBUG) {
        logDepth(depth)(`Parsing params 【${parseState}】`);
    }
    ++depth;

    const params: Record<string, any> = {};
    for (; ;) {
        const leadingSpacesMatch = parseState.exec(
            /\s*/y,
        );
        if (!leadingSpacesMatch) {
            return;
        }

        // Terminate if eof or }
        if (parseState.eof) {
            parseState.reportError(`Expected a terminal '}'`);
            return;
        }

        if (parseState.lookAhead === '}') {
            break;
        }

        const paramParseResult = parseParam(parseState, depth + 1);
        if (!paramParseResult) {
            return;
        }
        
        const { k, v } = paramParseResult.result;
        params[k] = v;
    }
    return {
        result: params,
    };
}

function parseParam(parseState: ParseState, depth: number) {
    if (DEBUG) {
        logDepth(depth)(`Parsing param 【${parseState}】`);
    }

    const keyMatch = parseState.exec(
        /([\w_][\w_0-9]*)\s*:\s*/y,
    );
    if (!keyMatch) {
        parseState.reportError(`Expected param key`);
        return;
    }

    const paramParseResult = parseParamValue(parseState, depth + 1);
    if (!paramParseResult) {
        return;
    }

    // Skip tail white spaces or comma.
    const tailMatch = parseState.exec(
        /\s*,?/y,
    );
    if (!tailMatch) {
        return;
    }

    return { result: { k: keyMatch[1], v: paramParseResult.result } };
}

function parseParamValue(parseState: ParseState, depth: number) {
    if (parseState.lookAhead === '"') {
        return parseParamStringValue(parseState, depth + 1);
    } else {
        return parseRecurse(parseState, depth + 1);
    }
}

function parseParamStringValue(parseState: ParseState, depth: number): undefined | { result: string; } {
    const match = parseState.exec(
        /"[^"\\]*(\\[\s\S][^"\\]*)*"/y,
    );
    if (!match) {
        parseState.reportError(`Expect the string from '${parseState.remain}' starts a double-quoted string`);
        return;
    } else {
        return { result: match[0] };
    }
}