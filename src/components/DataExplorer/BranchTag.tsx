import { branchColorVar } from './colors';

export function BranchDot({ branchIndex }: { branchIndex: number }) {
  return (
    <span
      className="branch-dot"
      style={{ '--branch-color': branchColorVar(branchIndex) } as React.CSSProperties}
    />
  );
}

export function BranchTag({ label, branchIndex }: { label: string; branchIndex: number }) {
  return (
    <span className="branch-tag">
      <BranchDot branchIndex={branchIndex} />
      {label}
    </span>
  );
}
