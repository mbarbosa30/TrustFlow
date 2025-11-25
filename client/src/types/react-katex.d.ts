declare module 'react-katex' {
  import { ComponentType } from 'react';

  interface MathComponentProps {
    math: string;
    errorColor?: string;
    renderError?: (error: Error) => JSX.Element;
  }

  export const InlineMath: ComponentType<MathComponentProps>;
  export const BlockMath: ComponentType<MathComponentProps>;
}
