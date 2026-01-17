//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

import { fileURLToPath } from 'url';
import path from 'path';
import HtmlPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import TerserPlugin from 'terser-webpack-plugin';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @param {any} env
 * @param {any} argv
 * @returns {WebpackConfig[]}
 */
export default function (env, argv) {
    const mode = argv.mode || 'development';
    const isProduction = mode === 'production';

    return [
        getWebviewsConfig(mode, env, isProduction),
    ];
}

/**
 * @param {'development' | 'production' | 'none' | undefined} mode
 * @param {any} env
 * @returns {WebpackConfig}
 */
function getWebviewsConfig(mode, env, isProduction) {
    const basePath = path.join(__dirname, 'src', 'webviews', 'apps');
    const tsConfigPath = path.join(__dirname, 'tsconfig.json');

    /** @type WebpackConfig['plugins'] | any */
    const plugins = [
        new HtmlPlugin({
            template: path.join(basePath, 'avdSelector', 'avdSelector.html'),
            chunks: ['avdSelector'],
            filename: path.join(__dirname, 'dist', 'webviews', 'avdSelector.html'),
            inject: true,
            scriptLoading: 'module',
            minify: isProduction ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: false,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyCSS: true,
            } : false,
        }),
        new HtmlPlugin({
            template: path.join(basePath, 'onboarding', 'onboarding.html'),
            chunks: ['onboarding'],
            filename: path.join(__dirname, 'dist', 'webviews', 'onboarding.html'),
            inject: true,
            scriptLoading: 'module',
            minify: isProduction ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: false,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyCSS: true,
            } : false,
        }),
        new HtmlPlugin({
            template: path.join(basePath, 'logcat', 'logcat.html'),
            chunks: ['logcat'],
            filename: path.join(__dirname, 'dist', 'webviews', 'logcat.html'),
            inject: true,
            scriptLoading: 'module',
            minify: isProduction ? {
                removeComments: true,
                collapseWhitespace: true,
                removeRedundantAttributes: false,
                useShortDoctype: true,
                removeEmptyAttributes: true,
                removeStyleLinkTypeAttributes: true,
                keepClosingSlash: true,
                minifyCSS: true,
            } : false,
        }),
        new MiniCssExtractPlugin({ filename: '[name].css' }),
    ];

    return {
        name: 'webviews',
        context: basePath,
        entry: {
            avdSelector: './avdSelector/avdSelector.ts',
            onboarding: './onboarding/onboarding.ts',
            logcat: './logcat/logcat.ts',
        },
        mode: mode,
        target: 'web',
        devtool: isProduction ? false : 'source-map',
        output: {
            chunkFilename: '[name].js',
            filename: '[name].js',
            libraryTarget: 'module',
            path: path.join(__dirname, 'dist', 'webviews'),
            publicPath: '#{root}/dist/webviews/',
            clean: true,
        },
        experiments: {
            outputModule: true,
        },
        optimization: {
            minimizer: isProduction ? [
                new TerserPlugin({
                    minify: TerserPlugin.esbuildMinify,
                    extractComments: false,
                    parallel: true,
                    terserOptions: {
                        format: {
                            comments: false,
                        },
                    },
                }),
                new CssMinimizerPlugin({
                    minimizerOptions: {
                        preset: [
                            'cssnano-preset-advanced',
                            {
                                autoprefixer: false,
                                discardUnused: false,
                                mergeIdents: false,
                                reduceIdents: false,
                                zindex: false,
                            },
                        ],
                    },
                }),
            ] : [],
            splitChunks: {
                cacheGroups: {
                    default: false,
                    vendors: false,
                },
            },
        },
        module: {
            rules: [
                {
                    test: /\.m?js/,
                    resolve: { fullySpecified: false },
                },
                {
                    exclude: /\.d\.ts$/,
                    include: path.join(__dirname, 'src'),
                    test: /\.tsx?$/,
                    use: {
                        loader: 'esbuild-loader',
                        options: {
                            format: 'esm',
                            implementation: esbuild,
                            target: ['es2023', 'chrome124'],
                            tsconfig: tsConfigPath,
                        },
                    },
                },
                {
                    test: /\.scss$/,
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                        },
                        {
                            loader: 'css-loader',
                            options: {
                                sourceMap: !isProduction,
                                url: false,
                            },
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                sourceMap: !isProduction,
                            },
                        },
                    ],
                    exclude: /node_modules/,
                },
            ],
        },
        resolve: {
            alias: {
                '@env': path.resolve(__dirname, 'src', 'env', 'browser'),
            },
            extensionAlias: { '.js': ['.ts', '.js'], '.jsx': ['.tsx', '.jsx'] },
            fallback: {},
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            modules: [basePath, 'node_modules'],
            conditionNames: ['browser', 'import', 'module', 'default'],
        },
        plugins: plugins,
        stats: {
            preset: 'errors-warnings',
            assets: true,
            colors: true,
        },
    };
}

