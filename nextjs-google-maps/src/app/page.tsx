import GoogleMaps from "@/components/google-maps";
import { Trees } from "lucide-react";

export default function Page() {
  return (
    <>
      <div className="flex flex-col items-center justify-center my-8">
        <div className="flex items-center gap-3">
          <Trees size={40} className="text-green-600" />
          <span className="text-3xl font-bold text-center">terraview</span>
        </div>
      </div>
      <main className="flex-1 relative">
        <GoogleMaps />
      </main>
    </>
  );
}
