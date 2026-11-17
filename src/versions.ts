import {coerce} from 'semver';

export interface MagentoVersion {
    magentoVersion: string;
    phpVersion: string;
    openSearchVersion: string;
    mariaDbVersion: string;
    mysqlVersion: string;
    isLatest: boolean;
    isPreRelease: boolean;
}

interface MagentoWatchVersion {
    version: string;
    releaseDate: string;
    eolDate: string|null;
    systemRequirements: {
        php: string[],
        mysql: string[],
        mariadb: string[],
        opensearch: string[]
    };
    isFutureVersion: boolean;
    isLatestVersion: boolean;
    isEOLVersion: boolean;
    statusLabel: string;
}

interface MagentoWatchResponse {
    data: {
        [key: string]: MagentoWatchVersion;
    }
}

interface Configuration {
    months: number;
    includePrerelease: boolean;
    includeEol: boolean;
}

const monthsInMilliseconds = 30*24*60*60*1000;

export function provideVersions(
    input: MagentoWatchResponse,
    configuration: Configuration,
    currentDate: Date
): MagentoVersion[] {
    const result: MagentoVersion[] = [];
    const startDate = currentDate.getTime() - (monthsInMilliseconds * configuration.months);
    const compareVersions = (a,b) =>
        coerce(a.version, {loose: true})!.compare(coerce(b.version, {loose: true})!);
    for (const release of Object.values(input.data).sort(compareVersions)) {
        const releaseDate = new Date(release.releaseDate);
        if (releaseDate.getTime() < startDate) {
            continue;
        }

        if (release.isEOLVersion && !configuration.includeEol) {
            continue;
        }

        if (release.isFutureVersion && !configuration.includePrerelease) {
            continue;
        }

        if (!release.systemRequirements.mysql) {
            continue;
        }

        const version: MagentoVersion = {
            magentoVersion: release.version,
            phpVersion: normalizeVersion(release.systemRequirements.php),
            openSearchVersion: normalizeVersion(release.systemRequirements.opensearch),
            mariaDbVersion: normalizeVersion(release.systemRequirements.mariadb),
            mysqlVersion: normalizeVersion(release.systemRequirements.mysql),
            isLatest: release.isLatestVersion,
            isPreRelease: release.isFutureVersion
        };

        result.push(version);
    }
    return result;
}

function normalizeVersion(versions: string[]): string {
    const semanticVersions = versions.map(v => coerce(v, {loose: true}))
        .filter(v => v !== null)
        .sort((a, b) => a.compare(b));

    return `${semanticVersions[0].major}.${semanticVersions[0].minor}`;
}