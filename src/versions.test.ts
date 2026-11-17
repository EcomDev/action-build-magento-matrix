import {it} from 'vitest';
import dataFixture from './versions.fixture.json';
import { provideVersions } from './versions';
import { expect } from 'vitest';

const defaultConfiguration = {
    months: 12,
    includePrerelease: true,
    includeEol: false
};

it('should return empty result when date is far in future', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2027-11-14'));
    expect(result).toEqual([]);
});

it('should return most recent alpha supported release and it should not be latest', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2026-10-01'));
    expect(result).toContainEqual(
        expect.objectContaining({
            magentoVersion: '2.4.10-alpha1',
            isLatest: false,
            isPreRelease: true
        })
    );
});


it('should not return alpha supported release when flag is set', () => {
    const result = provideVersions(dataFixture, {...defaultConfiguration, includePrerelease: false}, new Date('2026-10-01'));
    expect(result).not.toContainEqual(
        expect.objectContaining({
            magentoVersion: '2.4.10-alpha1'
        })
    );
});

it('should coarse required software versions to major.minor format', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2026-10-01'));
    expect(result).toContainEqual(
        expect.objectContaining({
            magentoVersion: '2.4.8-p4',
            openSearchVersion: '3.0',
        })
    );
});

it('should return minimal supported software version', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2026-01-01'));
    expect(result).toContainEqual(
        expect.objectContaining({
            magentoVersion: '2.4.8',
            phpVersion: '8.3',
        })
    );
});


it('should return 2.4.9 as latest', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2026-10-01'));
    expect(result).toContainEqual(expect.objectContaining({
        magentoVersion: '2.4.9',
        isLatest: true,
    }));
});

it('should contain only supported versions', () => {
    const result = provideVersions(dataFixture, defaultConfiguration, new Date('2026-01-01'));
    expect(result).not.toContainEqual(expect.objectContaining({magentoVersion: '2.4.6-p10'}))
});

it('should allow EOL versions when flag is set', () => {
    const result = provideVersions(dataFixture, {...defaultConfiguration, includeEol: true}, new Date('2026-01-01'));
    expect(result).toContainEqual(expect.objectContaining({magentoVersion: '2.4.6-p10'}))
});
