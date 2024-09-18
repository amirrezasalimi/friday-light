import fs from 'fs';
import { glob } from 'glob';
import path, { join } from 'path';
import { readFile, readFileSync, writeFile } from 'fs-extra';

interface BundleResult {
    [filePath: string]: string;
}
interface ConfigResult {
    prompt?: string;
    openai_endpoint?: string
    openai_key?: string

    [key: string]: string;
}

class FlHelpers {
    async readConfig(filename = "fl.md"): Promise<ConfigResult> {
        if (!fs.existsSync(filename)) {
            console.log(`config file (${filename}) not exists! use 'fl --init' to make one`)
            return
        }

        const filePath = join(process.cwd(), filename);
        try {
            const content = await readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim() !== '');
            const config: ConfigResult = {};

            lines.forEach((line) => {
                if (line.startsWith('#') && line.includes(":")) {
                    const [key, value] = line.slice(1).split(':');
                    const content = line.slice(line.indexOf(":") + 1, line.length).trim()
                    // @ts-check
                    config[key.trim()] = content;
                } else {
                    if (!config["prompt"]) {
                        config["prompt"] = line
                    } else {
                        config["prompt"] += `\n${line}`
                    }
                }
            });
            return config;
        } catch (error) {
            console.error(`Error reading file: ${filename}`);
            throw error;
        }
    }
    async makeConfig(filename = "fl.md") {
        const content = `
# openai_endpoint: https:/xxx.ai
# openai_key: sk-
and your prompt of what you want ...
`
        try {
            if (fs.existsSync(filename)) {
                console.log("it's already exists!")
                return
            }
            fs.writeFileSync(filename, content, { encoding: 'utf8', flag: 'w' })
            console.log("done!");

        } catch (e) {
            console.error("can't make config file");
        }
    }
    makeModule(dir: string, name: string) {
        /* 
          - components
          - hooks
          - services
          constants.ts
          index.tsx
        */
        const modulePath = path.join(dir, name);
        fs.mkdirSync(modulePath, { recursive: true });

        // Create subdirectories for components, hooks and services
        const dirPaths = [
            'components',
            'hooks',
            'services',
            'types'
        ];

        dirPaths.forEach((dir) => {
            const _path = path.join(modulePath, dir);
            fs.mkdirSync(_path, { recursive: true });
            // fs.writeFileSync(_path + '/.gitkeep', '');
        });

        // Create constants file
        const constantsFilePath = path.join(modulePath, 'constants.ts');
        fs.writeFileSync(constantsFilePath, '');

        // Create index file
        const indexPath = path.join(modulePath, 'index.tsx');
        fs.writeFileSync(indexPath, '');
    }

    async bundleModule(dir: string, name: string): Promise<BundleResult> {
        const modulePath = path.join(dir, name);
        const allPaths = glob.sync(`${modulePath}/**/*`, { dot: true });

        const bundledFiles: BundleResult = {};

        const processPath = async (filePath: string) => {
            const relativePath = path.relative(modulePath, filePath);
            const stats = await fs.promises.stat(filePath);

            if (stats.isFile()) {
                const content = await readFile(filePath, 'utf8');
                bundledFiles[relativePath] = content || "- empty file";
            } else if (stats.isDirectory()) {
                // Check if directory is empty
                const filesInDir = await fs.promises.readdir(filePath);
                if (filesInDir.length === 0) {
                    bundledFiles[relativePath] = "- is empty";
                }
                // We don't need to process non-empty directories here
                // as their contents will be handled by the main loop
            }
        };

        try {
            for (const filePath of allPaths) {
                await processPath(filePath);
            }
        } catch (error) {
            console.error(`Error bundling module ${name}:`, error);
            throw error;
        }

        return bundledFiles;
    }
    async extractFilesFromResponse(text: string) {
        const lines = text.split('\n');
        const result: Record<string, string> = {};
        let currentFilePath = '';
        let currentContent = '';

        for (const line of lines) {
            if (line.startsWith('#')) {
                if (currentFilePath && currentContent) {
                    result[currentFilePath] = currentContent.trim();
                }
                const lineSeg = line.split("#");
                currentFilePath = lineSeg[1].trim();
                currentContent = '';
            } else {
                currentContent += line + '\n';
            }
        }

        // Add the last file content
        if (currentFilePath && currentContent) {
            result[currentFilePath] = currentContent.trim();
        }

        return result;
    }

    async makeFilesFromPair(dir: string, pair: Record<string, string>) {
        for (const [filePath, content] of Object.entries(pair)) {
            const fullPath = `${dir}/${filePath}`.replaceAll(":", "")
            try {
                // Extract the file content and remove any language suffix
                const match = content.match(/^```(\w+)?\s*([\s\S]*?)```$/);
                const trimmedContent = match ? match[2].trim() : content.replace(/^```|```$/g, '').trim();

                // Ensure the directory exists
                const dir = path.dirname(fullPath);
                await fs.mkdir(dir, { recursive: true } as any, (e) => {
                    console.log(e);
                });

                // Write the file with the trimmed content
                await writeFile(fullPath, trimmedContent);
                console.log(`File created: ${fullPath}`);
            } catch (e) {
                console.error("- Error while creating file", e);

            }
        }
    }


    async makeBasePrompt({
        config,
        moduleName,
        dir,
        userPrompt
    }: {
        config: ConfigResult,
        // modules: string,
        moduleName: string,
        dir: string,
        userPrompt?: string,
    }) {
        const prompt = userPrompt || config.prompt;
        if (!prompt) {
            throw "prompt cant be empty";
        }
        const filesAndDirsBundle = await this.bundleModule(dir, moduleName)
        return `
# Elite TypeScript/React Engineer Assistant

You are a top-tier TypeScript/React developer. Your tasks:

1. Write complete modules
2. Refactor existing code
3. Fix specific bugs
4. Analyze and improve code structure

Rules:
- Write only in TypeScript/React
- Follow project structure and best practices
- Provide concise, effective solutions
- Be very careful about directories and paths
- use path aliases @ to access src , like @infrastructure or @shared/components , ...
Current task:
Analyze the directory structure for module/${moduleName}:

${Object.entries(filesAndDirsBundle).map(([key, value]) => `# ${key}:\n${value}`).join("\n\n\n")}

Based on this and the user's prompt: ${prompt}

Create or modify files as needed. Deliver efficient, high-quality code.
Important: When you're done, return all modified or new files in the exact same format as the input, preserving the directory structure and file content representation.
No Extra Chat or talk ,
Output Example (always at least 3 \n between them),
make sure path of directories and files are correct and not duplicate or wrong based on given paths:



# file-name.ts
- full content of file



# hooks/test-hook.ts
- full content of file
`
    }

}

export default new FlHelpers();