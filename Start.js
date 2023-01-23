const fs = require("fs");
const colors = require("colors");
const inquirer = require("inquirer");

const GPT3Web = require("./GPT3Web.js");

(async () => {
    const gpt3Web = new GPT3Web();

    await gpt3Web.launch();
    // await gpt3Web.executePage("find 'running puppeteer on wsl' help guide for puppeteer", "https://pptr.dev/");
    await gpt3Web.executePage("order a half pepperoni pizza half cheese from pizza hut", "google");
})();