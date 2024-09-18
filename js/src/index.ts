#!/usr/bin/env node

import helpers from "./helpers";

import { extractDirAndModuleName } from "./utils";
import Fl from "./fl";
import { Command } from "commander";
const program = new Command();

program
    .command("ai")
    .argument("<string>", "module name")
    .description("give your module name and ai will handle the rest of it")
    .requiredOption('-c, --config <string>', "config file name", "fl.md")
    .option('-i, --init', "makes a fl.md config file")
    .option('-p,--prompt <string>', "inline ai prompt")
    .action((str, options) => {
        const { dir, moduleName } = extractDirAndModuleName(str);
        const configFile = options.config;

        const userPrompt = options.prompt;
        const fl = new Fl();
        if (userPrompt) {
            console.log("trying with inline prompt:\n", userPrompt);

        }
        fl.aiGenModule({ dir, module: moduleName, config_file: configFile, userPrompt, shareDir: "" });
    });

program
    .command("m")
    .argument("<string>", "module name")
    .description("give your module name and I will make an empty module for you")
    .action((str, options) => {
        const { dir, moduleName } = extractDirAndModuleName(str);

        // Call the helper function with the extracted values
        helpers.makeModule(dir, moduleName);
    });


program.parse();
