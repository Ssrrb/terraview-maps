"use client";
import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState } from "react";

function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY!,
        version: "beta",
        libraries: ["places"], // Aqui se colocan las APIs de GCP Maps que se van a usar
      });

      const { Map } = await loader.importLibrary("maps");

      const location = {
        // Ubicación de Paraguay
        lat: -23.0,
        lng: -60.0,
      };

      const options: google.maps.MapOptions = {
        center: location,
        zoom: 8,
        mapId: "MAP_ID",
      };

      const mapInstance = new Map(mapRef.current, options);
      setMap(mapInstance);
    };

    initMap();
  }, []);

  return <div ref={mapRef} className="w-full h-screen"></div>;
}

export default GoogleMaps;
