declare module 'react-katex' {
  import { ComponentType, HTMLAttributes } from 'react';

  interface KaTeXOptions {
    displayMode?: boolean;
    output?: 'html' | 'mathml' | 'htmlAndMathml';
    leqno?: boolean;
    fleqn?: boolean;
    throwOnError?: boolean;
    errorColor?: string;
    minRuleThickness?: number;
    colorIsTextColor?: boolean;
    maxSize?: number;
    maxExpand?: number;
    strict?: boolean | 'ignore' | 'warn' | 'error' | ((errorCode: string, errorMsg: string, token: unknown) => string);
    trust?: boolean | ((context: { command: string; url: string; protocol: string }) => boolean);
    globalGroup?: boolean;
  }

  interface MathComponentProps extends KaTeXOptions {
    math: string;
    renderError?: (error: Error) => JSX.Element;
    className?: string;
    style?: React.CSSProperties;
  }

  export const InlineMath: ComponentType<MathComponentProps & HTMLAttributes<HTMLSpanElement>>;
  export const BlockMath: ComponentType<MathComponentProps & HTMLAttributes<HTMLDivElement>>;
}
