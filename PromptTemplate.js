const fs = require("fs");
const request = require("request");
const { encode, decode } = require("gpt-3-encoder");
const { exec } = require("child_process");

const cleanString = (str) => {
    // remove any \t, \n, \r
    return str.trim();
}


const executionQueue = [];

const EXECUTIONS_PER_MINUTE = 60;
let thisMinutesExecutions = 0;

setInterval(() => {
    thisMinutesExecutions = 0;
}, 60 * 1000);


setInterval(async () => {
    const canExecute = () => {
        if(thisMinutesExecutions >= EXECUTIONS_PER_MINUTE) return false;
        return true;
    }

    if(canExecute() && executionQueue.length > 0) {
        const execution = executionQueue.shift();
        thisMinutesExecutions++;
        
        const resolve = execution[0];
        const prompt = execution[1];
        const params = execution[2];

        resolve(await prompt._execute(params));
    }
}, 250);


const parseParam = (line, paramName, promptTemplate) => {
    if(line && line.startsWith(paramName + ":")) {
        let str = cleanString(line.split(":")[1]);
        // if str could be parsed as a number
        if(!isNaN(str)) {
            str = Number(str);
        }
        promptTemplate[paramName] = str;
        return true;
    }
    return false;
}

class PromptTemplate {
    constructor () {
        
    }

    _replaceParams (params) {
        let readyPrompt = this.prompt;
        for (let [key, value] of Object.entries(params)) {
            readyPrompt = readyPrompt.replace(`{{${key}}}`, value);
        }

        // search regex for {{ + text + }}
        // if exists throw error
        if(readyPrompt.match(/{{.*}}/)) {
            const whichRemain = readyPrompt.match(/{{.*}}/g);
            throw new Error("Missing params in prompt template " + whichRemain);
        }

        return readyPrompt;
    }

    _execute (params) {
        console.log(`    asking openai`.blue);
        const promptReplaced = this._replaceParams(params);

        let stopStrsArray = null;
        if(this.stop_strs) {
            stopStrsArray = this.stop_strs.split("~").map(s => s.replace("\\n", "\n"));
        }

        let requestParams = {
            prompt: promptReplaced,
            temperature: this.temperature,
            stop: stopStrsArray,
            top_p: this.top_p,
            n: this.n,
            stream: false,
            presence_penalty: this.presence_penalty,
            frequency_penalty: this.frequency_penalty,
            max_tokens: this.max_tokens,
        }
        
        // open 

        const encodedPrompt = encode(requestParams.prompt);
        const tokens = encodedPrompt.length;

        const totalMaxTokens = PromptTemplate.MAX_TOKENS[this.engine];
        const maxPromptTokens = totalMaxTokens - this.max_tokens;

        if(tokens > maxPromptTokens) {
            throw new Error("Prompt is too long! Max tokens for engine " + this.engine + " is " + maxPromptTokens + ", but prompt is " + tokens + " tokens long.");
        }
        

        
        return new Promise(r => {
            request({
                uri: `https://api.openai.com/v1/engines/${this.engine}/completions`,
                method: "POST",
                headers: {
                    "Authorization": `Bearer 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`,
                    "Content-Type": "application/json"
                },
                json: true,
                body: requestParams,
                timeout: 60000
            }, (err, resp, body) => {
                if(err) throw err;
                if(resp.statusCode !== 200) throw new Error("OpenAI API Error " + (resp && resp.statusCode && resp.statusCode || "???") + ": " + JSON.stringify(body));
                if(!body.choices || !body.choices[0] || !body.choices[0].text) throw new Error("OpenAI API Error: No response, " + JSON.stringify(body));
                r(body.choices[0].text);
            })
        });
    }

    execute (params) {
        return new Promise(r => executionQueue.push([r, this, params]));
    }
}
PromptTemplate.MAX_TOKENS = {
    "text-davinci-003": 4000,
    "code-davinci-002": 8001,
}
PromptTemplate.load = (promptName) => {
    if(!promptName) throw new Error("No promptName provided")
    if(!fs.existsSync(`./prompts/${promptName}.txt`)) throw new Error("Prompt not found")
    let text = fs.readFileSync(`./prompts/${promptName}.txt`, "utf8");
    let lines = text.split("\n");
    // trim each line
    lines = lines.map(l => l.trim());


    let promptTemplate = new PromptTemplate();

    for(let i = 0; i < lines.length; i++) {
        let line = lines[i];
        parseParam(line, "name", promptTemplate);
        parseParam(line, "token", promptTemplate);
        parseParam(line, "max_tokens", promptTemplate);
        parseParam(line, "description", promptTemplate);
        parseParam(line, "temperature", promptTemplate);
        parseParam(line, "engine", promptTemplate);
        parseParam(line, "n", promptTemplate);
        parseParam(line, "top_p", promptTemplate);
        parseParam(line, "frequency_penalty", promptTemplate);
        parseParam(line, "presence_penalty", promptTemplate);
        parseParam(line, "stop_strs", promptTemplate);
    }

    // everything after first blank line
    let bodyText = lines.slice(lines.indexOf("")).join("\n");
    promptTemplate.prompt = bodyText;

    return promptTemplate;
}
module.exports = PromptTemplate;

// TODO: 12/21/2022 NEED A WAY TO DEFINE PROMPT FLOWS, AND DEFINES HOW PAGE INTERACTION HAPPENS
// i.e.

// (async () => {

//     const browser;
//     const prompt;

//     let _strToCommands;
    

//     browser.onPage((url, links, buttons, inputs, text) => {






//     });

// })();