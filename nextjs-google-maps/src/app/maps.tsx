/// <reference types="google.maps" />
import { useJsApiLoader } from "@react-google-maps/api";

const { isLoaded } = useJsApiLoader({
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
});
if (!isLoaded) return <>Loading…</>;

function initMap(): void {
  const maps = window.google.maps;

  const map = new maps.Map(document.getElementById("map") as HTMLElement, {
    zoom: 11,
    center: { lat: 62.323907, lng: -150.109291 },
    mapTypeId: "satellite",
  });

  const bounds = new maps.LatLngBounds(
    new maps.LatLng(62.281819, -150.287132),
    new maps.LatLng(62.400471, -150.005608)
  );

  const image =
    "https://developers.google.com/maps/documentation/javascript/examples/full/images/talkeetna.png";

  class USGSOverlay extends maps.OverlayView {
    private bounds: maps.LatLngBounds;
    private image: string;
    private div?: HTMLElement;

    constructor(bounds: maps.LatLngBounds, image: string) {
      super();
      this.bounds = bounds;
      this.image = image;
    }

    onAdd() {
      this.div = document.createElement("div");
      this.div.style.position = "absolute";

      const img = document.createElement("img");
      img.src = this.image;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.position = "absolute";
      this.div.appendChild(img);

      const panes = this.getPanes()!;
      panes.overlayLayer.appendChild(this.div);
    }

    draw() {
      const proj = this.getProjection()!;
      const sw = proj.fromLatLngToDivPixel(this.bounds.getSouthWest())!;
      const ne = proj.fromLatLngToDivPixel(this.bounds.getNorthEast())!;
      if (this.div) {
        this.div.style.left = sw.x + "px";
        this.div.style.top = ne.y + "px";
        this.div.style.width = ne.x - sw.x + "px";
        this.div.style.height = sw.y - ne.y + "px";
      }
    }

    onRemove() {
      if (this.div) this.div.remove();
    }

    hide() {
      this.div!.style.visibility = "hidden";
    }
    show() {
      this.div!.style.visibility = "visible";
    }
    toggle() {
      if (!this.div) return;
      this.div.style.visibility =
        this.div.style.visibility === "hidden" ? "visible" : "hidden";
    }

    toggleDOM(map: maps.Map) {
      this.getMap() ? this.setMap(null) : this.setMap(map);
    }
  }

  const overlay = new USGSOverlay(bounds, image);
  overlay.setMap(map);

  const makeButton = (text: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = "custom-map-control-button";
    btn.addEventListener("click", onClick);
    return btn;
  };

  map.controls[maps.ControlPosition.TOP_RIGHT].push(
    makeButton("Toggle", () => overlay.toggle())
  );
  map.controls[maps.ControlPosition.TOP_RIGHT].push(
    makeButton("Toggle DOM Attachment", () => overlay.toggleDOM(map))
  );
}

declare global {
  interface Window {
    initMap: () => void;
  }
}
window.initMap = initMap;
