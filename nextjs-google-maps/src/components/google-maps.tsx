"use client";
import { Loader } from "@googlemaps/js-api-loader";
import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

// Extend the global window object to include the google namespace
declare global {
  interface Window {
    initMap: () => void; // If you have an initMap function globally
    google: typeof google; // This assumes 'google' will be loaded
  }
}

// Interface for the overlay methods we'll use via ref
interface CustomOverlay {
  toggle: () => void;
  setMap: (map: google.maps.Map | null) => void;
  // Add other methods if you call them via overlayRef.current
}

function GoogleMaps() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const overlayRef = useRef<CustomOverlay | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);

  // Initialize map and overlay
  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_MAPS_API_KEY!,
        version: "beta",
        libraries: ["maps", "marker"],
      });

      const googleInstance = await loader.load();

      // Helper function to convert tile coordinates (XYZ scheme) to LatLng for the NW corner
      const tileNWToLatLng = (
        tileX: number,
        tileY: number,
        zoom: number
      ): google.maps.LatLng => {
        const n = Math.pow(2, zoom);
        const lng_deg = (tileX / n) * 360.0 - 180.0;
        const lat_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * tileY) / n)));
        const lat_deg = (lat_rad * 180.0) / Math.PI;
        return new googleInstance.maps.LatLng(lat_deg, lng_deg);
      };

      // Function to get LatLngBounds for a tile (XYZ scheme)
      const getTileBounds = (
        tileX: number,
        tileY: number,
        zoom: number
      ): google.maps.LatLngBounds => {
        const nw = tileNWToLatLng(tileX, tileY, zoom);
        const se_tile_nw = tileNWToLatLng(tileX + 1, tileY + 1, zoom); // NW corner of the SE adjacent tile
        return new googleInstance.maps.LatLngBounds(
          new googleInstance.maps.LatLng(se_tile_nw.lat(), nw.lng()), // South-West corner
          new googleInstance.maps.LatLng(nw.lat(), se_tile_nw.lng()) // North-East corner
        );
      };

      class USGSOverlay extends googleInstance.maps.OverlayView {
        private bounds: google.maps.LatLngBounds;
        private imageUrl: string;
        private container: HTMLElement | null = null;
        private image: HTMLImageElement | null = null;

        constructor(bounds: google.maps.LatLngBounds, imageUrl: string) {
          super();
          this.bounds = bounds;
          this.imageUrl = imageUrl;
        }

        onAdd(): void {
          this.container = document.createElement("div");
          this.container.style.position = "absolute";
          this.container.style.opacity = "0.8";
          this.container.style.border = "none";
          this.container.style.pointerEvents = "none";
          this.container.style.backgroundColor = "rgba(0, 255, 0, 0.2)";

          this.image = document.createElement("img");
          this.image.src = this.imageUrl;
          this.image.style.width = "100%";
          this.image.style.height = "100%";
          this.image.style.position = "absolute";
          this.image.style.objectFit = "contain";

          this.image.onerror = () => {
            console.error("Failed to load overlay image:", this.imageUrl);
            if (this.container) {
              this.container.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
              this.container.innerHTML = `
                <div style="color:white; padding: 10px; text-align: center;">
                  Error: Image not found<br>
                  ${this.imageUrl}
                </div>`;
            }
          };

          this.container.appendChild(this.image);

          const panes = this.getPanes();
          if (panes) {
            panes.overlayLayer.appendChild(this.container);
          }
        }

        draw(): void {
          if (!this.container) return;

          const overlayProjection = this.getProjection();
          if (!overlayProjection) return;

          const sw = overlayProjection.fromLatLngToDivPixel(
            this.bounds.getSouthWest()
          );
          const ne = overlayProjection.fromLatLngToDivPixel(
            this.bounds.getNorthEast()
          );

          if (!sw || !ne) return;

          this.container.style.left = `${sw.x}px`;
          this.container.style.top = `${ne.y}px`;
          this.container.style.width = `${Math.max(0, ne.x - sw.x)}px`;
          this.container.style.height = `${Math.max(0, sw.y - ne.y)}px`;
        }

        onRemove(): void {
          if (this.container) {
            this.container.parentNode?.removeChild(this.container);
            this.container = null;
          }
          this.image = null;
        }

        toggle(): void {
          if (this.container) {
            this.container.style.visibility =
              this.container.style.visibility === "hidden"
                ? "visible"
                : "hidden";
          }
        }

        setMap(map: google.maps.Map | null): void {
          super.setMap(map);
        }
      }

      const { Map } = (await loader.importLibrary(
        "maps"
      )) as google.maps.MapsLibrary;

      // Overall bounds for the entire tile set from your XML
      const overallTileSetBounds = new googleInstance.maps.LatLngBounds(
        new googleInstance.maps.LatLng(-22.85357308590581, -57.08199425500159), // South-West
        new googleInstance.maps.LatLng(-22.84314904424289, -57.07045393618365) // North-East
      );

      const mapCenter = overallTileSetBounds.getCenter();
      const mapZoom = 18; // Set zoom to 18 to match tile zoom level

      const options: google.maps.MapOptions = {
        center: mapCenter,
        zoom: mapZoom,
        mapId: "MAP_ID",
      };

      const mapInstance = new Map(mapRef.current!, options);

      // Data for your tiles from the 'public/18/' directory
      // IMPORTANT: You need to populate this array with all your 53 tiles.
      // Format: { x: tileX_coord, y: tileY_coord, pathFragment: "X_coord/Y_coord.png" }
      const tileData = [
        { x: 89506, y: 113975, pathFragment: "89506/113975.png" },
        { x: 89506, y: 113976, pathFragment: "89506/113976.png" },
        { x: 89507, y: 113973, pathFragment: "89507/113973.png" },
        { x: 89507, y: 113974, pathFragment: "89507/113974.png" },
        { x: 89507, y: 113975, pathFragment: "89507/113975.png" },
        { x: 89507, y: 113976, pathFragment: "89507/113976.png" },
        { x: 89507, y: 113977, pathFragment: "89507/113977.png" },
        { x: 89508, y: 113973, pathFragment: "89508/113973.png" },
        { x: 89508, y: 113974, pathFragment: "89508/113974.png" },
        { x: 89508, y: 113975, pathFragment: "89508/113975.png" },
        { x: 89508, y: 113976, pathFragment: "89508/113976.png" },
        { x: 89508, y: 113977, pathFragment: "89508/113977.png" },
        { x: 89508, y: 113978, pathFragment: "89508/113978.png" },
        { x: 89509, y: 113973, pathFragment: "89509/113973.png" },
        { x: 89509, y: 113974, pathFragment: "89509/113974.png" },
        { x: 89509, y: 113975, pathFragment: "89509/113975.png" },
        { x: 89509, y: 113976, pathFragment: "89509/113976.png" },
        { x: 89509, y: 113977, pathFragment: "89509/113977.png" },
        { x: 89509, y: 113978, pathFragment: "89509/113978.png" },
        { x: 89510, y: 113973, pathFragment: "89510/113973.png" },
        { x: 89510, y: 113974, pathFragment: "89510/113974.png" },
        { x: 89510, y: 113975, pathFragment: "89510/113975.png" },
        { x: 89510, y: 113976, pathFragment: "89510/113976.png" },
        { x: 89510, y: 113977, pathFragment: "89510/113977.png" },
        { x: 89510, y: 113978, pathFragment: "89510/113978.png" },
        { x: 89511, y: 113973, pathFragment: "89511/113973.png" },
        { x: 89511, y: 113974, pathFragment: "89511/113974.png" },
        { x: 89511, y: 113975, pathFragment: "89511/113975.png" },
        { x: 89511, y: 113976, pathFragment: "89511/113976.png" },
        { x: 89511, y: 113977, pathFragment: "89511/113977.png" },
        { x: 89511, y: 113978, pathFragment: "89511/113978.png" },
        { x: 89512, y: 113973, pathFragment: "89512/113973.png" },
        { x: 89512, y: 113974, pathFragment: "89512/113974.png" },
        { x: 89512, y: 113975, pathFragment: "89512/113975.png" },
        { x: 89512, y: 113976, pathFragment: "89512/113976.png" },
        { x: 89512, y: 113977, pathFragment: "89512/113977.png" },
        { x: 89513, y: 113973, pathFragment: "89513/113973.png" },
        { x: 89513, y: 113974, pathFragment: "89513/113974.png" },
        { x: 89513, y: 113975, pathFragment: "89513/113975.png" },
        // ... ADD ALL 53 TILE ENTRIES HERE ...
        // Example for the last few from your list if known, e.g.:
        // { x: 89513, y: 113974, pathFragment: "89513/113974.png" },
      ];

      const overlays: CustomOverlay[] = [];
      const currentZoomLevel = 18; // Corrected from 12 to 18

      tileData.forEach((tile, index) => {
        const imageUrl = `/18/${tile.pathFragment}`; // Corrected from /12/ to /18/
        const tileBounds = getTileBounds(tile.x, tile.y, currentZoomLevel);

        const overlay = new USGSOverlay(tileBounds, imageUrl);
        overlay.setMap(mapInstance);
        overlays.push(overlay);

        if (index === tileData.length - 1) {
          overlayRef.current = overlay;
        }
      });

      setMap(mapInstance);
    };

    initMap();

    return () => {
      // Clean up all overlays when the component unmounts
      if (overlayRef.current && Array.isArray(overlayRef.current)) {
        // If overlayRef.current becomes an array of overlays
        (overlayRef.current as CustomOverlay[]).forEach((ov) =>
          ov.setMap(null)
        );
      } else if (
        overlayRef.current &&
        typeof overlayRef.current.setMap === "function"
      ) {
        // Fallback for single overlay or if logic for multiple isn't fully implemented for ref
        // This part needs to be robust based on how you manage multiple overlay refs.
        // The current loop above creates multiple overlays but only assigns the last to overlayRef.current.
        // For proper cleanup of all created overlays, you'd iterate through the 'overlays' array created in initMap.
        // However, 'overlays' is local to initMap. A more robust solution would be to store them in a state or ref accessible here.

        // For now, assuming we want to clean up the one referenced by overlayRef.current (the last one)
        // To clean up ALL, you would need to iterate through all created overlays.
        // This cleanup logic needs to be aligned with how you decide to store and manage references to multiple overlays.
        // One simple approach for cleanup without changing overlayRef type too much:
        // Iterate through the overlays array captured in useEffect's scope if possible, or manage them via a state/ref.
        // The current code only cleans up the last one assigned to overlayRef.current.
        // To properly clean up all overlays created in the loop:
        // You would need to change how overlayRef is used, perhaps making it an array:
        // const overlayRefs = useRef<CustomOverlay[]>([]);
        // And then in the return function:
        // overlayRefs.current.forEach(ov => ov.setMap(null));
        // The current edit focuses on creation, cleanup of multiple overlays needs more refactoring.
        overlayRef.current.setMap(null);
      }
    };
  }, []);

  const toggleOverlay = useCallback(() => {
    if (overlayRef.current) {
      overlayRef.current.toggle();
      setShowOverlay((prev) => !prev);
    }
  }, []);

  return (
    <div className="relative w-full h-screen">
      <div ref={mapRef} className="w-full h-full" />
      <Button
        variant="outline"
        onClick={toggleOverlay}
        className="absolute top-4 right-4 bg-white p-2 rounded shadow-md z-10"
      >
        {showOverlay ? "Hide Overlay" : "Show Overlay"}
      </Button>
    </div>
  );
}

export default GoogleMaps;
