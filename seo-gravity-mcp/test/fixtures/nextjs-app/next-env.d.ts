declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    alternates?: {
      canonical?: string;
    };
    [key: string]: any;
  }
}

declare module 'react' {
  const React: any;
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
