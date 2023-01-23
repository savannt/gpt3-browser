const PromptTemplate = require("./PromptTemplate.js");
const fs = require("fs");
const ChromesEdge = require("./chromesedge/index.js");

class GPT3Web {
    constructor () {
        this.prompts = {};

        console.log(`Loading OpenAI prompts...`.cyan);
        // load all files in ./prompts dir, put them into PromptTemplate
        const files = fs.readdirSync("./prompts");
        files.forEach(file => {
            const fileName = file.replace(".txt", "");
            let prompt = PromptTemplate.load(file.replace(".txt", ""));
            console.log(`\u2713 ${fileName}.txt loaded...`.green);
            this.prompts[prompt.name] = prompt;
            // loop each attribute of prompt and print it
            // for(let key in prompt) {
            //     let value = prompt[key];
            //     if(value.length > 50) value = (value.slice(0, 50) + "...").trim();
            //     // print indentation + right arrow emoji + key + colon + value
            //     console.log(`\t${"➡".gray}ㅤ${(key + ": ").gray}${value.toString().italic}`)
            // }
        });
        console.log("\n");
    }

    async launch () {
        this.browser = await ChromesEdge.launch({
            executablePath: ChromesEdge.EXECUTABLES.CANARY
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    async executeCommand (command) {
        if(command.includes(":")) {
            let action = command.split(":")[0].trim();
            let args = command.slice(command.indexOf(":") + 1).trim();
            // args = args.split(" ");
            // split args by spaces, but keep quoted strings together
            args = args.match(/(?:[^\s"]+|"[^"]*")+/g);
            // loop each arg and remove quotes
            for(let i = 0; i < args.length; i++) {
                args[i] = args[i].replace(/"/g, "");
            }

            if(action === "click") {
                if(!args[0]) throw new Error("No element name provided for click action");
                const clickResult = await this.browser.click(args[0]);
                if(clickResult) return "Clicked " + args[0];
                else return "Could not click " + args[0];
            } else if(action === "go") {
                if(!args[0]) throw new Error("No URL provided for go action");
                await this.browser.goto(args[0]);
                return "Opened " + args[0];
            } else if(action === "type") {
                if(!args[0]) throw new Error("No element name provided for type action");
                if(!args[1]) throw new Error("No text provided for type action");
                const typeResult = await this.browser.type(args[0], args[1]);
                if(typeResult) return "Typed " + args[1] + " in " + args[0];
                else return "Could not type " + args[1] + " in " + args[0];
            } else if(action === "go_back") {
                let result = await this.browser.goback();
                if(result) return "Went back";
                else return "Could not go back";
            } else {
                return "Unknown action: " + action;
            }
        } else {
            return "Unknown command: " + command;
        }
    }

    async executeCommands (commandList) {
        // log commands
        
        let i = 0;
        for(let command of commandList) {
            console.log(`\n${(i + 1).toString().yellow} ${command.italic}`);

            let result = await this.executeCommand(command);
            
            console.log(`    ${'result'.yellow} ${result.italic}`);
            i++;
        }
    }


    // this function figures out what to do next on the page
    async executePage (goal, startUrl) {
        this.browser.on("pageLoaded", async (page) => {
            let prompt = `
            Goal:
            ${goal}

            URL:
            ${page.url}

            Links:
            ${Object.keys(page.links)}

            Buttons:
            ${JSON.stringify(page.buttons, null, 4)}

            Inputs:
            ${JSON.stringify(page.inputs, null, 4)}
            `;

            // TODO:  12/20/2022
            // * Add OpenAI Rate limit queue
            // * Fix OpenAI implementation
            // * Fix the issue of new page stopping previous executions...? add red log message

            // if(page.links.length > 50) {
            //     console.log("PREPROCESSING LINKS:");
            //     const preLinks = await this.prompts["Preprocess Links"].execute({ input: `Links: \n${page.links.join("\n")}`});
            //     console.log("PRE LINKS!");
            //     console.log(preLinks);
            // }

            const instructions = await this.prompts["Instructions to Commands 2"].execute({ input: prompt });
            const commandList = instructions.trim().split("\n");
            console.log(`\nReceived ${commandList.length} commands from OpenAI:`.cyan);
            for(let i = 0; i < commandList.length; i++) {
                console.log(`${commandList[i]}`.gray);
            }
    
            await this.executeCommands(commandList);
        });
        await this.browser.goto(startUrl);
    }
}
module.exports = GPT3Web;