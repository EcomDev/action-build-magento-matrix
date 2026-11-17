import {describe, expect} from "vitest";
import {exportBuildArtifacts, exportDockerImages, generateArtifacts} from "./artifacts";
import {MagentoVersion} from "./versions";
import { it } from "vitest";

function version(
    version: string,
    isLatest?: boolean,
    isPreRelease?: boolean,
    systemRequirements?: { php?: string, mariaDb?: string, mysql?: string, openSearch?: string }): MagentoVersion {
    return {
        magentoVersion: version,
        mysqlVersion: systemRequirements?.mysql ?? '8.4',
        mariaDbVersion: systemRequirements?.mariaDb ?? '10.4',
        phpVersion: systemRequirements?.php ?? '8.2',
        openSearchVersion: systemRequirements?.openSearch ?? '3.0',
        isLatest: isLatest ?? false,
        isPreRelease: isPreRelease ?? false
    }
}

describe('Generate Artifact', () => {
    it('should create only regular variation when no sample data requested', () => {
        const artifacts = generateArtifacts([version('2.4.7'), version('2.4.8')], false);
        expect(artifacts).toEqual([
            {version: version('2.4.7'), sampleData: false},
            {version: version('2.4.8'), sampleData: false}
        ]);
    });

    it('adds sample data variations', () => {
        const artifacts = generateArtifacts([version('2.4.7'), version('2.4.8')], true);
        expect(artifacts).toEqual([
            {version: version('2.4.7'), sampleData: false},
            {version: version('2.4.7'), sampleData: true},
            {version: version('2.4.8'), sampleData: false},
            {version: version('2.4.8'), sampleData: true}
        ]);
    });
})

describe('Exports Artifact', () => {
    it('exports different artifacts as build exportable JSON', () => {
        const exported = exportBuildArtifacts([
            {version: version('2.4.7'), sampleData: false},
            {version: version('2.4.7'), sampleData: true},
            {version: version('2.4.8', false, false, {php: '8.3'}), sampleData: false},
            {version: version('2.4.8', false, false, {php: '8.3'}), sampleData: true}
        ])

        expect(exported).toEqual([
            {
                name: '2.4.7',
                magentoVersion: '2.4.7',
                phpVersion: '8.2',
                openSearchVersion: '3.0',
                mariaDbVersion: '10.4',
                sampleData: false,
                stability: 'stable'
            },
            {
                name: '2.4.7-sampledata',
                magentoVersion: '2.4.7',
                phpVersion: '8.2',
                openSearchVersion: '3.0',
                mariaDbVersion: '10.4',
                sampleData: true,
                stability: 'stable'
            },
            {
                name: '2.4.8',
                magentoVersion: '2.4.8',
                phpVersion: '8.3',
                openSearchVersion: '3.0',
                mariaDbVersion: '10.4',
                sampleData: false,
                stability: 'stable'
            },
            {
                name: '2.4.8-sampledata',
                magentoVersion: '2.4.8',
                phpVersion: '8.3',
                openSearchVersion: '3.0',
                mariaDbVersion: '10.4',
                sampleData: true,
                stability: 'stable'
            },
        ]);
    });

    it('exports different artifacts as build exportable JSON', () => {
        const exported = exportBuildArtifacts([
            {version: version('2.4.10-alpha', false, true), sampleData: false}
        ])

        expect(exported).toEqual([
            {
                name: '2.4.10-alpha',
                magentoVersion: '2.4.10-alpha',
                phpVersion: '8.2',
                openSearchVersion: '3.0',
                mariaDbVersion: '10.4',
                sampleData: false,
                stability: 'alpha'
            }
        ]);
    });
});


describe('Exports Docker Images', () => {
    it('exports different artifacts as build exportable JSON', () => {
        const exported = exportDockerImages([
            {version: version('2.4.7'), sampleData: false},
            {version: version('2.4.7'), sampleData: true}
        ])

        expect(exported).toEqual([
            {
                artifact: '2.4.7',
                tag: `type=raw,value=2.4.7`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.7',
                tag: `type=raw,value=2.4.7`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.7',
                tag: `type=raw,value=2.4.7`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.7',
                tag: `type=raw,value=2.4.7`,
                containerType: 'media',
                version: 'none'
            },
            {
                artifact: '2.4.7-sampledata',
                tag: `type=raw,value=2.4.7-sampledata`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.7-sampledata',
                tag: `type=raw,value=2.4.7-sampledata`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.7-sampledata',
                tag: `type=raw,value=2.4.7-sampledata`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.7-sampledata',
                tag: `type=raw,value=2.4.7-sampledata`,
                containerType: 'media',
                version: 'none'
            }
        ]);
    });

    it('exports exports latest artifacts additionally', () => {
        const exported = exportDockerImages([
            {version: version('2.4.9', true), sampleData: false},
            {version: version('2.4.9', true), sampleData: true}
        ])

        expect(exported).toEqual([
            {
                artifact: '2.4.9',
                tag: `type=raw,value=2.4.9`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=2.4.9`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=2.4.9`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=2.4.9`,
                containerType: 'media',
                version: 'none'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=latest`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=latest`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=latest`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.9',
                tag: `type=raw,value=latest`,
                containerType: 'media',
                version: 'none'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=2.4.9-sampledata`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=2.4.9-sampledata`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=2.4.9-sampledata`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=2.4.9-sampledata`,
                containerType: 'media',
                version: 'none'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=latest-sampledata`,
                containerType: 'mysql',
                version: '8.4'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=latest-sampledata`,
                containerType: 'mariadb',
                version: '10.4'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=latest-sampledata`,
                containerType: 'opensearch',
                version: '3.0'
            },
            {
                artifact: '2.4.9-sampledata',
                tag: `type=raw,value=latest-sampledata`,
                containerType: 'media',
                version: 'none'
            }
        ]);
    });
});