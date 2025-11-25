import { InlineMath, BlockMath } from 'react-katex';

interface MathProps {
  children: string;
  block?: boolean;
  className?: string;
  "data-testid"?: string;
  throwOnError?: boolean;
  errorColor?: string;
}

function renderError(error: Error) {
  return <span className="text-destructive text-sm">[Math Error: {error.message}]</span>;
}

export function Math({ children, block = false, className = "", "data-testid": testId, throwOnError = false, errorColor = "#cc0000" }: MathProps) {
  if (block) {
    return (
      <div className={`my-4 ${className}`} data-testid={testId}>
        <BlockMath math={children} throwOnError={throwOnError} errorColor={errorColor} renderError={renderError} />
      </div>
    );
  }
  return (
    <span className={className} data-testid={testId}>
      <InlineMath math={children} throwOnError={throwOnError} errorColor={errorColor} renderError={renderError} />
    </span>
  );
}

interface FormulaProps {
  children: string;
  className?: string;
  "data-testid"?: string;
  throwOnError?: boolean;
  errorColor?: string;
}

export function InlineFormula({ children, className = "", "data-testid": testId, throwOnError = false, errorColor = "#cc0000" }: FormulaProps) {
  return (
    <span className={className} data-testid={testId}>
      <InlineMath math={children} throwOnError={throwOnError} errorColor={errorColor} renderError={renderError} />
    </span>
  );
}

export function BlockFormula({ children, className = "", "data-testid": testId, throwOnError = false, errorColor = "#cc0000" }: FormulaProps) {
  return (
    <div className={`my-4 ${className}`} data-testid={testId}>
      <BlockMath math={children} throwOnError={throwOnError} errorColor={errorColor} renderError={renderError} />
    </div>
  );
}
