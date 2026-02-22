export default function FirmaDigital() {
  return (
    <div className="w-full h-[calc(100vh-65px)]">
      <iframe
        src="https://demo.stg.mifirmadigital.com/login"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        title="Firma Digital"
      />
    </div>
  );
}
