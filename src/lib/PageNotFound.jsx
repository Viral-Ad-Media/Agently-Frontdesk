import { Link } from "react-router-dom";

export default function PageNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="font-spec text-[11px] uppercase text-muted-foreground">404</p>
      <h1 className="mt-2 text-3xl">That page doesn't exist.</h1>
      <p className="mt-2 max-w-sm text-[15px] text-muted-foreground">Start a new case or open the front desk.</p>
      <div className="mt-6 flex gap-2">
        <Link to="/chat" className="fd-btn-primary">Describe a roof problem</Link>
        <Link to="/frontdesk" className="fd-btn-outline">Front desk</Link>
      </div>
    </div>
  );
}
