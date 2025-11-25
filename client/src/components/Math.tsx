import { InlineMath, BlockMath } from 'react-katex';

interface MathProps {
  children: string;
  block?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function Math({ children, block = false, className = "", "data-testid": testId }: MathProps) {
  if (block) {
    return (
      <div className={`my-4 ${className}`} data-testid={testId}>
        <BlockMath math={children} />
      </div>
    );
  }
  return (
    <span className={className} data-testid={testId}>
      <InlineMath math={children} />
    </span>
  );
}

export function InlineFormula({ children, className = "", "data-testid": testId }: Omit<MathProps, 'block'>) {
  return (
    <span className={`${className}`} data-testid={testId}>
      <InlineMath math={children} />
    </span>
  );
}

export function BlockFormula({ children, className = "", "data-testid": testId }: Omit<MathProps, 'block'>) {
  return (
    <div className={`my-4 ${className}`} data-testid={testId}>
      <BlockMath math={children} />
    </div>
  );
}
