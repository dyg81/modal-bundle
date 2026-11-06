module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/tests/js'],
    testMatch: ['**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/js/setup.js'],
    moduleNameMapper: {
        '^jquery$': '<rootDir>/node_modules/jquery/dist/jquery.js'
    }
};
