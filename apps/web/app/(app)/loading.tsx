export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: '#FDFBF7' }}
    >
      <div
        className="w-8 h-8 border-2 rounded-full animate-spin"
        style={{ borderColor: '#D4A547', borderTopColor: 'transparent' }}
      />
    </div>
  );
}
