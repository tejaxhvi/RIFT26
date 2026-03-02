import { Activity } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 p-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-4">
        <Activity className="h-8 w-8 text-primary" />
          Omniscient Agent
          </h1>
      </div>
    </header>
  );
}

