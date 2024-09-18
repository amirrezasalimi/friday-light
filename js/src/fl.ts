import OpenAI from "openai";
import helpers from "./helpers";

interface AiGenOptions {
    config_file?: string
    module: string
    dir: string
    shareDir: string
    userPrompt?: string
}
class Fl {
    async aiGenModule({
        module,
        config_file,
        dir,
        userPrompt
    }: AiGenOptions) {

        const config = await helpers.readConfig(config_file);
        if (!config) {
            throw "invalid config";
        }
        const prompt = await helpers.makeBasePrompt({
            config,
            moduleName: module,
            dir,
            userPrompt:userPrompt
        })

        const oai = new OpenAI({
            baseURL: config.openai_endpoint,
            apiKey: config.openai_key
        })
        try {
            const res = await oai.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: prompt
                    }
                ],
                model: "gpt-4o-mini",
                temperature: 0.5
            });
            if (res) {
                const content = res.choices[0].message.content;
                if (content) {
                    console.log("content: ", content);
                    const fileAndDirsPair = await helpers.extractFilesFromResponse(content);
                    console.log("fileAndDirsPair:", fileAndDirsPair);

                    const done = await helpers.makeFilesFromPair(`${dir}/${module}`, fileAndDirsPair);
                    console.log("filesAndPairs: ", done);
                }
            }
        } catch (e) {
            console.log(e);
        }
    }
}

export default Fl;
