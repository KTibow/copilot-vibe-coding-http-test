import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const isDevelopment = process.env.NODE_ENV === 'development';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'umd',
      name: 'WispHttpClient',
      sourcemap: isDevelopment
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: isDevelopment
    }
  ],
  plugins: [
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    }),
    ...(!isDevelopment ? [terser({
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn']
      },
      mangle: {
        properties: {
          regex: /^_/
        }
      }
    })] : [])
  ]
};