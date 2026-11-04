import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    js.configs.recommended,
    ...tseslint.configs['flat/recommended'],
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.jest,
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
];
