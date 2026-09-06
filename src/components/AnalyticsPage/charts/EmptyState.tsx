export function EmptyState({ message = 'No data for the selected filters.' }: { message?: string }) {
  return (
    <div className="analytics-empty">
      <p>{message}</p>
    </div>
  );
}
