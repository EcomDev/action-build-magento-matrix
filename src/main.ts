import {getInput, setFailed, setOutput} from "@actions/core";
import {provideVersions} from "./versions";
import {generateArtifacts, exportDockerImages, exportBuildArtifacts} from "./artifacts";


export async function run(): Promise<void> {
    try {
        const apiUrl = getInput("version-api-url", {required: true, trimWhitespace: true});
        const response = await fetch(apiUrl);
        const versions = provideVersions(
            await response.json(),
            {
                months: parseInt(getInput("months", {required: true, trimWhitespace: true})),
                includePrerelease: getInput("include-prerelease", {required: false, trimWhitespace: true}) === "true",
                includeEol: getInput("include-eol", {required: false, trimWhitespace: true}) === "true"
            },
            new Date()
        );

        const artifacts = generateArtifacts(
            versions,
            getInput("sample-data", {required: false, trimWhitespace: true}) === "true"
        );

        setOutput("builds", JSON.stringify(exportBuildArtifacts(artifacts)));
        setOutput("images", JSON.stringify(exportDockerImages(artifacts)));
    } catch (error) {
        setFailed(error.message);
    }
}