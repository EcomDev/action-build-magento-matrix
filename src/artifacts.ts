import {MagentoVersion} from "./versions";

export interface MagentoArtifact {
    sampleData: boolean;
    version: MagentoVersion;
}

export function generateArtifacts(versions: MagentoVersion[], includeSampleData: boolean): MagentoArtifact[] {
    const result: MagentoArtifact[] = [];
    for (const version of versions) {
        result.push({
            version,
            sampleData: false,
        });

        if (includeSampleData) {
            result.push({
                version,
                sampleData: true,
            });
        }
    }
    return result;
}

export interface BuildArtifactExport {
    name: string;
    magentoVersion: string;
    phpVersion: string;
    mariaDbVersion: string;
    openSearchVersion: string;
    sampleData: boolean;
    stability: string;
}

function artifactName(artifact: MagentoArtifact): string {
    return artifact.sampleData ? `${artifact.version.magentoVersion}-sampledata` : artifact.version.magentoVersion;
}

export function exportBuildArtifacts(artifact: MagentoArtifact[]): BuildArtifactExport[]  {
    return artifact.map((artifact) => ({
        name: artifactName(artifact),
        magentoVersion: artifact.version.magentoVersion,
        phpVersion: artifact.version.phpVersion,
        mariaDbVersion: artifact.version.mariaDbVersion,
        openSearchVersion: artifact.version.openSearchVersion,
        sampleData: artifact.sampleData,
        stability: artifact.version.isPreRelease ? 'alpha' : 'stable',
    }));
}

export interface DockerImage {
    artifact: string;
    tag: string;
    containerType: string;
    version: string;
}

export function exportDockerImages(artifacts: MagentoArtifact[]): DockerImage[]  {
    const result: DockerImage[] = [];

    for (const artifact of artifacts) {
        result.push(...generateImages(artifactName(artifact), artifact))
        if (artifact.version.isLatest) {
            result.push(...generateImages(artifact.sampleData ? 'latest-sampledata' : 'latest', artifact));
        }
    }

    return result;
}

function generateImages(tagName: string, artifact: MagentoArtifact): DockerImage[]
{
    tagName = 'type=raw,value=' + tagName;
    return [
        {
            artifact: artifactName(artifact),
            tag: tagName,
            containerType: 'mysql',
            version: artifact.version.mysqlVersion,
        },
        {
            artifact: artifactName(artifact),
            tag: tagName,
            containerType: 'mariadb',
            version: artifact.version.mariaDbVersion,
        },
        {
            artifact: artifactName(artifact),
            tag: tagName,
            containerType: 'opensearch',
            version: artifact.version.openSearchVersion,
        },
        {
            artifact: artifactName(artifact),
            tag: tagName,
            containerType: 'media',
            version: 'none',
        }
    ];
}